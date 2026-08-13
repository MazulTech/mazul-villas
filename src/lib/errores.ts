// Los errores de Supabase (tablas y storage) no son instancias de `Error`
// de JavaScript, son objetos planos con un campo `message` (ademas de
// `details`, `hint`, `code`). Un `e instanceof Error` los deja pasar de
// largo y esconde el motivo real detras de un texto generico. Esta
// funcion revisa cualquier objeto con un `.message` de texto, no solo
// los `Error` nativos.
export function mensajeError(e: unknown, textoGenerico: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim().length > 0) return m;
  }
  return textoGenerico;
}
