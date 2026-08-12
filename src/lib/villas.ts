export interface VillaConNumero {
  numero: number;
  nombre?: string | null;
}

// "Villa 1 · Ostión" si tiene apodo, o solo "Villa 6" si todavía no le
// asignan uno. Se usa en toda la app para no repetir este formato.
export function etiquetaVilla(v: VillaConNumero): string {
  return v.nombre ? `Villa ${v.numero} · ${v.nombre}` : `Villa ${v.numero}`;
}
