import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import type { Profile } from "../types";

interface AuthState {
  cargando: boolean;
  profile: Profile | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// En modo demo (sin Supabase conectado) no se pide login: se entra con un
// perfil de administracion para poder probar toda la app.
const PERFIL_DEMO: Profile = {
  id: "demo",
  nombre: "Modo demo",
  rol: "administracion",
  villasAsignadas: [],
  inventarioExtra: false,
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setProfile(PERFIL_DEMO);
      setCargando(false);
      return;
    }

    const cargarPerfil = async (userId: string) => {
      if (!supabase) return;
      const { data, error: err } = await supabase
        .from("profiles")
        .select("id, nombre, rol, villas_asignadas, inventario_extra")
        .eq("id", userId)
        .maybeSingle();
      if (err) {
        setError(err.message);
        setProfile(null);
        return;
      }
      if (!data) {
        setError("Tu cuenta no tiene un perfil asignado todavía. Pide a un administrador que lo cree.");
        setProfile(null);
        return;
      }
      setError(null);
      setProfile({
        id: data.id,
        nombre: data.nombre,
        rol: data.rol,
        villasAsignadas: data.villas_asignadas ?? [],
        inventarioExtra: data.inventario_extra ?? false,
      });
    };

    let activo = true;

    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user.id;
      if (!activo) return;
      if (userId) {
        cargarPerfil(userId).finally(() => activo && setCargando(false));
      } else {
        setCargando(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!activo) return;
      if (session?.user.id) {
        setCargando(true);
        cargarPerfil(session.user.id).finally(() => activo && setCargando(false));
      } else {
        setProfile(null);
        setCargando(false);
      }
    });

    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return;
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      throw err;
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ cargando, profile, error, signIn, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
