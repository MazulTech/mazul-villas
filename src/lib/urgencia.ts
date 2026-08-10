import type { Urgencia } from "../types";

/**
 * La urgencia NUNCA se elige a mano. Se calcula a partir de dos preguntas
 * tangibles que cualquier persona del equipo puede responder de forma
 * consistente, sin depender de su criterio personal:
 *
 * 1. afectaSeguridadOperacion: ¿esto impide usar la villa con seguridad,
 *    o va a empeorar (más daño, más costo) si no se atiende hoy?
 *    Ej: fuga activa, falla eléctrica, chapa que no cierra, gas.
 *
 * 2. afectaAmenidad: ¿esto afecta un servicio o amenidad que el huésped
 *    espera que funcione, aunque no impida rentar la villa?
 *    Ej: A/C, wifi, TV, alberca, cocina.
 *
 * Si ninguna de las dos aplica, es estética por descarte (apariencia,
 * sin impacto en función ni seguridad).
 */
export function calcularUrgencia(
  afectaSeguridadOperacion: boolean,
  afectaAmenidad: boolean
): Urgencia {
  if (afectaSeguridadOperacion) return "critico";
  if (afectaAmenidad) return "operacional";
  return "estetica";
}

export const SLA_POR_URGENCIA: Record<Urgencia, string> = {
  critico: "Mismo día",
  operacional: "Antes del próximo check-in",
  estetica: "Próximo mantenimiento programado",
};

export const LABEL_URGENCIA: Record<Urgencia, string> = {
  critico: "Crítico",
  operacional: "Operacional",
  estetica: "Estética",
};

export const CLASE_PILL_URGENCIA: Record<Urgencia, string> = {
  critico: "pill pill-danger",
  operacional: "pill pill-warn",
  estetica: "pill pill-ok",
};
