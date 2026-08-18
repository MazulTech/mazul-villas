import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfigured } from "./supabaseClient";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Cliente aparte, sin sesión persistida, que se usa SOLO para dar de alta
// la cuenta (auth) de un dueño nuevo desde la pantalla de administración
// (ver NuevoDueno.tsx). Si usáramos el cliente normal (`supabase` en
// supabaseClient.ts) para eso, supabase-js reemplazaría la sesión activa
// del admin por la de la cuenta recién creada al llamar signUp — con este
// cliente aislado eso no pasa, la sesión de quien está usando la app no se
// toca para nada.
export const supabaseAuxiliar: SupabaseClient | null = supabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null;
