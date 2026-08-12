import type { Condicion } from "../types";

export const LABEL_CONDICION: Record<Condicion, string> = {
  bueno: "Bueno",
  regular: "Regular",
  danado: "Dañado",
};

export const CLASE_PILL_CONDICION: Record<Condicion, string> = {
  bueno: "pill pill-ok",
  regular: "pill pill-warn",
  danado: "pill pill-danger",
};
