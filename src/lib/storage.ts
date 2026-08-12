import { supabase, supabaseConfigured } from "./supabaseClient";

const BUCKET = "evidencias";

// Sube una foto (checklist, mejoras, incidencias o inventario) y regresa la
// URL publica para guardar en la tabla correspondiente. Sin Supabase
// configurado, regresa una URL local que solo vive mientras la pestaña
// esta abierta (modo demo).
export async function subirFoto(file: File, carpeta: string): Promise<string> {
  if (!supabaseConfigured || !supabase) {
    return URL.createObjectURL(file);
  }
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
