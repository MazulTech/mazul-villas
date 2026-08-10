import type { ChecklistTarea, InsumoStock, Mejora, Villa } from "../types";
import { calcularUrgencia } from "../lib/urgencia";

export const villas: Villa[] = [
  { id: "ostion", nombre: "Ostión", estadoHoy: "lista" },
  { id: "barracuda", nombre: "Barracuda", estadoHoy: "limpieza" },
  { id: "pulpos", nombre: "Pulpos", estadoHoy: "incidencia" },
  { id: "sierra", nombre: "Sierra", estadoHoy: "lista" },
  { id: "langosta", nombre: "Langosta", estadoHoy: "lista" },
  { id: "coral", nombre: "Coral", estadoHoy: "limpieza" },
  { id: "erizo", nombre: "Erizo", estadoHoy: "lista" },
  { id: "gallo", nombre: "Gallo", estadoHoy: "lista" },
  { id: "pargo", nombre: "Pargo", estadoHoy: "lista" },
  { id: "concha", nombre: "Concha", estadoHoy: "lista" },
  { id: "cangrejo", nombre: "Cangrejo", estadoHoy: "lista" },
  { id: "caracol", nombre: "Caracol", estadoHoy: "lista" },
  { id: "mantarraya", nombre: "Mantarraya", estadoHoy: "lista" },
];

export const checklistBase: string[] = [
  "Tender blancos y toallas",
  "Reponer amenities de baño",
  "Revisar cocina y minibar",
  "Foto final de la villa",
];

export const checklist: ChecklistTarea[] = villas.flatMap((v) =>
  checklistBase.map((texto, i) => ({
    id: `${v.id}-chk-${i}`,
    villaId: v.id,
    texto,
    completado: v.estadoHoy === "lista" ? true : i < 2,
  }))
);

export const insumos: InsumoStock[] = [
  { id: "1", villaId: "ostion", nombre: "Toallas de baño", stockActual: 4, stockObjetivo: 8 },
  { id: "2", villaId: "ostion", nombre: "Shampoo amenity", stockActual: 10, stockObjetivo: 10 },
  { id: "3", villaId: "ostion", nombre: "Café / cápsulas", stockActual: 1, stockObjetivo: 12 },
  { id: "4", villaId: "barracuda", nombre: "Toallas de baño", stockActual: 8, stockObjetivo: 8 },
  { id: "5", villaId: "barracuda", nombre: "Papel higiénico", stockActual: 2, stockObjetivo: 10 },
];

function mejora(
  id: string,
  villaId: string,
  zona: string,
  descripcion: string,
  afectaSeguridadOperacion: boolean,
  afectaAmenidad: boolean,
  resolucion: Mejora["resolucion"],
  extra?: Partial<Mejora>
): Mejora {
  return {
    id,
    villaId,
    zona,
    descripcion,
    afectaSeguridadOperacion,
    afectaAmenidad,
    urgencia: calcularUrgencia(afectaSeguridadOperacion, afectaAmenidad),
    resolucion,
    estado: "pendiente",
    creadoEn: new Date().toISOString(),
    ...extra,
  };
}

export const mejoras: Mejora[] = [
  mejora(
    "m1",
    "pulpos",
    "Cocina",
    "Fuga en la llave del fregadero",
    true,
    false,
    "contratar",
    { especialistaNecesario: "Plomero", costoEstimado: 800 }
  ),
  mejora(
    "m2",
    "pulpos",
    "Terraza",
    "Silla de exterior rota",
    false,
    false,
    "materiales",
    { materialNecesario: "Silla de exterior", costoEstimado: 450 }
  ),
  mejora(
    "m3",
    "pulpos",
    "Habitación 2",
    "Foco fundido en lámpara de buró",
    false,
    false,
    "equipo"
  ),
  mejora(
    "m4",
    "coral",
    "Alberca",
    "Bomba de la alberca no enciende",
    false,
    true,
    "contratar",
    { especialistaNecesario: "Técnico de albercas", costoEstimado: 1200 }
  ),
  mejora(
    "m5",
    "barracuda",
    "Fachada",
    "Pintura descarapelada junto a la puerta",
    false,
    false,
    "equipo"
  ),
];
