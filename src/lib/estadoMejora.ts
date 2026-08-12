import type { EstadoMejora } from "../types";

export const LABEL_ESTADO_MEJORA: Record<EstadoMejora, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  esperando_aprobacion: "Esperando aprobación",
  aprobada: "Aprobada",
  rechazada: "Rechazada, requiere más trabajo",
};

export const CLASE_PILL_ESTADO_MEJORA: Record<EstadoMejora, string> = {
  pendiente: "pill pill-warn",
  en_proceso: "pill pill-warn",
  esperando_aprobacion: "pill pill-warn",
  aprobada: "pill pill-ok",
  rechazada: "pill pill-danger",
};
