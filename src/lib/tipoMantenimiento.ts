import type { TipoMantenimiento } from "../types";

export const LABEL_TIPO_MANTENIMIENTO: Record<TipoMantenimiento, string> = {
  preventivo: "Preventivo",
  correctivo: "Correctivo",
};

// Quien paga cuando hay que comprar material o contratar a alguien.
export const LABEL_QUIEN_PAGA: Record<TipoMantenimiento, string> = {
  preventivo: "Se paga con fondos de Mazul",
  correctivo: "Lo paga el dueño de la villa",
};
