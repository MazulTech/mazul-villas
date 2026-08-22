import { useEffect, useState } from "react";
import { listarVillas, type VillaBasica } from "../lib/data";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import { supabaseAuxiliar } from "../lib/supabaseAdminAuxClient";
import { mensajeError } from "../lib/errores";
import { etiquetaVilla } from "../lib/villas";
import { useAuth } from "../contexts/AuthContext";
import { esAdmin, LABEL_ROL } from "../lib/permissions";
import type { Rol } from "../types";

const ROLES: Rol[] = ["housekeeping", "mantenimiento", "administracion", "supervisor", "dueno"];

function generarPasswordTemporal(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let resultado = "";
  for (let i = 0; i < 10; i++) {
    resultado += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return resultado;
}

// Crea el acceso (auth) de un usuario nuevo (limpieza, mantenimiento,
// administracion, supervisor o dueno) y su perfil con el rol elegido. Las
// villas asignadas solo aplican a rol "dueno" — el resto de roles ya ve
// todas las villas por default (ver villasVisibles en permissions.ts).
// Solo administración/supervisión puede crear cuentas — ver esAdmin en
// permissions.ts (y la RLS "profiles_admin_insert" en schema.sql, que lo
// exige también del lado del servidor).
export default function NuevoDueno() {
  const { profile } = useAuth();
  const autorizado = esAdmin(profile);

  const [villas, setVillas] = useState<VillaBasica[]>([]);
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<Rol>("housekeeping");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generarPasswordTemporal());
  const [villasSeleccionadas, setVillasSeleccionadas] = useState<string[]>([]);
  const [inventarioExtra, setInventarioExtra] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<{ email: string; password: string; rol: Rol } | null>(null);

  useEffect(() => {
    if (!autorizado) return;
    listarVillas(profile)
      .then(setVillas)
      .catch((e) => setError(mensajeError(e, "No se pudieron cargar las villas.")));
  }, [profile, autorizado]);

  const toggleVilla = (id: string) => {
    setVillasSeleccionadas((actual) => (actual.includes(id) ? actual.filter((v) => v !== id) : [...actual, id]));
  };

  const esDueno = rol === "dueno";
  const esLimpieza = rol === "housekeeping";
  const puedeGuardar =
    nombre.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    (!esDueno || villasSeleccionadas.length > 0);

  const crear = async () => {
    if (!supabaseConfigured || !supabase || !supabaseAuxiliar) {
      setError("Esto solo funciona con Supabase conectado.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const { data, error: errAuth } = await supabaseAuxiliar.auth.signUp({ email: email.trim(), password });
      if (errAuth) throw errAuth;
      const userId = data.user?.id;
      if (!userId) throw new Error("No se pudo crear la cuenta, intenta de nuevo.");

      const { error: errPerfil } = await supabase.from("profiles").insert({
        id: userId,
        nombre: nombre.trim(),
        rol,
        villas_asignadas: esDueno ? villasSeleccionadas : [],
        inventario_extra: esLimpieza ? inventarioExtra : false,
        email: email.trim(),
      });
      if (errPerfil) {
        throw new Error(
          `La cuenta se creó pero no se pudo guardar su perfil (${mensajeError(errPerfil, "error desconocido")}). No la vuelvas a crear — dile a soporte para revisarla con este correo: ${email.trim()}.`
        );
      }

      setCreado({ email: email.trim(), password, rol });
      setNombre("");
      setEmail("");
      setPassword(generarPasswordTemporal());
      setVillasSeleccionadas([]);
      setInventarioExtra(false);
    } catch (e) {
      setError(mensajeError(e, "No se pudo crear la cuenta."));
    } finally {
      setGuardando(false);
    }
  };

  if (!autorizado) {
    return (
      <div>
        <h1 className="page-title">Nuevo usuario</h1>
        <div className="card card-dashed">Tu rol no tiene permiso para crear cuentas.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Nuevo usuario</h1>
      <p className="page-sub">Crea su acceso y asígnale su rol</p>

      {creado && (
        <div className="card" style={{ background: "var(--ok-bg)", border: "none", marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 6px", color: "var(--ok)" }}>
            Cuenta creada ({LABEL_ROL[creado.rol]}). Comparte esto con la persona:
          </p>
          <p style={{ fontSize: 12, margin: "0 0 2px" }}>Correo: {creado.email}</p>
          <p style={{ fontSize: 12, margin: 0 }}>Contraseña temporal: {creado.password}</p>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "8px 0 0" }}>
            Si tu proyecto de Supabase pide confirmar el correo, debe revisar su bandeja de entrada (y spam) antes de
            poder entrar.
          </p>
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Nombre</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Rol</label>
        <select value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {LABEL_ROL[r]}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          autoComplete="off"
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Contraseña temporal</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flexShrink: 0, width: "auto", padding: "0 14px" }}
            onClick={() => setPassword(generarPasswordTemporal())}
          >
            Generar
          </button>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "4px 0 0" }}>
          Se la compartes tú directamente (WhatsApp, en persona); la puede cambiar después.
        </p>
      </div>

      {esDueno && (
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Villa(s) que puede ver</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
            {villas.map((v) => (
              <label
                key={v.id}
                className="choice-row"
                style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={villasSeleccionadas.includes(v.id)}
                  onChange={() => toggleVilla(v.id)}
                  style={{ width: 18 }}
                />
                {etiquetaVilla(v)}
              </label>
            ))}
          </div>
        </div>
      )}
      {!esDueno && (
        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 14px" }}>
          Este rol ya ve todas las villas, no hace falta asignarle ninguna en particular.
        </p>
      )}

      {esLimpieza && (
        <label
          className="choice-row"
          style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 14 }}
        >
          <input
            type="checkbox"
            checked={inventarioExtra}
            onChange={(e) => setInventarioExtra(e.target.checked)}
            style={{ width: 18, marginTop: 2 }}
          />
          <span>
            <strong>También puede agregar inventario nuevo</strong>
            <br />
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              Por default, limpieza solo puede reportar el estado de items que ya existen. Marca esto solo si esta
              persona en particular va a capturar el inventario completo (por ejemplo, con foto y todo).
            </span>
          </span>
        </label>
      )}

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, wordBreak: "break-word" }}>{error}</p>
        </div>
      )}

      <button className="btn btn-primary-dark" disabled={!puedeGuardar || guardando} onClick={crear}>
        {guardando ? "Creando..." : "Crear cuenta"}
      </button>
    </div>
  );
}
