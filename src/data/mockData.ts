import type { ChecklistTarea, InsumoCatalogo, InsumoStock, InventarioItem, Mejora, Reserva, Villa } from "../types";
import { calcularUrgencia } from "../lib/urgencia";

// Coincide con supabase/seed.sql: mismos ids, numero y apodo (o null si la
// villa todavia no tiene apodo confirmado).
export const villas: Villa[] = [
  { id: "villa-1", numero: 1, nombre: "Ostión", estadoHoy: "lista" },
  { id: "villa-2", numero: 2, nombre: "Sierra", estadoHoy: "lista" },
  { id: "villa-3", numero: 3, nombre: "Mantarraya", estadoHoy: "lista" },
  { id: "villa-4", numero: 4, nombre: "Cangrejo", estadoHoy: "lista" },
  { id: "villa-5", numero: 5, nombre: "Bozo", estadoHoy: "lista" },
  { id: "villa-6", numero: 6, nombre: null, estadoHoy: "lista" },
  { id: "villa-7", numero: 7, nombre: "Coral", estadoHoy: "limpieza" },
  { id: "villa-8", numero: 8, nombre: "Erizo", estadoHoy: "lista" },
  { id: "villa-9", numero: 9, nombre: null, estadoHoy: "lista" },
  { id: "villa-10", numero: 10, nombre: null, estadoHoy: "lista" },
  { id: "villa-11", numero: 11, nombre: "Barracuda", estadoHoy: "limpieza" },
  { id: "villa-12", numero: 12, nombre: "Pargo", estadoHoy: "lista" },
  { id: "villa-13", numero: 13, nombre: "Concha", estadoHoy: "lista" },
  { id: "villa-14", numero: 14, nombre: null, estadoHoy: "lista" },
  { id: "villa-15", numero: 15, nombre: "Langosta", estadoHoy: "lista" },
  { id: "villa-16", numero: 16, nombre: "Pulpos", estadoHoy: "incidencia" },
  { id: "villa-17", numero: 17, nombre: null, estadoHoy: "lista" },
  { id: "villa-18", numero: 18, nombre: "Gallo", estadoHoy: "lista" },
  { id: "villa-19", numero: 19, nombre: null, estadoHoy: "lista" },
  { id: "villa-20", numero: 20, nombre: null, estadoHoy: "lista" },
  { id: "villa-21", numero: 21, nombre: "Caracol", estadoHoy: "lista" },
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
  { id: "1", villaId: "villa-1", nombre: "Toallas de baño", stockActual: 4, stockObjetivo: 8 },
  { id: "2", villaId: "villa-1", nombre: "Shampoo amenity", stockActual: 10, stockObjetivo: 10 },
  { id: "3", villaId: "villa-1", nombre: "Café / cápsulas", stockActual: 1, stockObjetivo: 12 },
  { id: "4", villaId: "villa-11", nombre: "Toallas de baño", stockActual: 8, stockObjetivo: 8 },
  { id: "5", villaId: "villa-11", nombre: "Papel higiénico", stockActual: 2, stockObjetivo: 10 },
];

// Almacen general: se compra aqui (administracion) y de aqui se reparte a
// cada villa (limpieza/mantenimiento/administracion). Ver repartirInsumo.
export const almacenGeneral: InsumoCatalogo[] = [
  { id: "cat-1", nombre: "Toallas de baño", unidad: "piezas", categoria: "Blancos y toallas", stockActual: 46, stockMinimo: 20 },
  { id: "cat-2", nombre: "Shampoo amenity", unidad: "piezas", categoria: "Baño", stockActual: 80, stockMinimo: 40 },
  { id: "cat-3", nombre: "Café / cápsulas", unidad: "cajas", categoria: "Cocina", stockActual: 6, stockMinimo: 15 },
  { id: "cat-4", nombre: "Papel higiénico", unidad: "rollos", categoria: "Baño", stockActual: 30, stockMinimo: 40 },
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
    tipoMantenimiento: "correctivo",
    resolucion,
    cotizacionAprobada: false,
    cotizacionPagada: false,
    estado: "pendiente",
    creadoEn: new Date().toISOString(),
    ...extra,
  };
}

export const mejoras: Mejora[] = [
  mejora(
    "m1",
    "villa-16",
    "Cocina",
    "Fuga en la llave del fregadero",
    true,
    false,
    "contratar",
    { especialistaNecesario: "Plomero", costoEstimado: 800 }
  ),
  mejora(
    "m2",
    "villa-16",
    "Terraza",
    "Silla de exterior rota",
    false,
    false,
    "materiales",
    {
      materialNecesario: "Silla de exterior",
      costoEstimado: 450,
      estado: "esperando_aprobacion",
      resueltoEn: new Date().toISOString(),
    }
  ),
  mejora(
    "m3",
    "villa-16",
    "Habitación 2",
    "Foco fundido en lámpara de buró",
    false,
    false,
    "equipo"
  ),
  mejora(
    "m4",
    "villa-7",
    "Alberca",
    "Bomba de la alberca no enciende",
    false,
    true,
    "contratar",
    { especialistaNecesario: "Técnico de albercas", costoEstimado: 1200 }
  ),
  mejora(
    "m5",
    "villa-11",
    "Fachada",
    "Pintura descarapelada junto a la puerta",
    false,
    false,
    "equipo"
  ),
];

export const inventario: InventarioItem[] = [
  {
    id: "inv1",
    villaId: "villa-2",
    zona: "Sala",
    nombre: "TV sala",
    categoria: "Electrónica",
    cantidad: 1,
    condicion: "bueno",
    creadoEn: new Date().toISOString(),
  },
  {
    id: "inv2",
    villaId: "villa-2",
    zona: "Cocina",
    nombre: "Refrigerador",
    categoria: "Electrodomésticos",
    cantidad: 1,
    condicion: "regular",
    creadoEn: new Date().toISOString(),
  },
  {
    id: "inv3",
    villaId: "villa-2",
    zona: "Terraza",
    nombre: "Sillas de exterior",
    categoria: "Muebles",
    cantidad: 6,
    condicion: "danado",
    creadoEn: new Date().toISOString(),
  },
];

export const reservas: Reserva[] = [
  {
    id: "res1",
    villaId: "villa-2",
    huesped: "Familia Torres",
    fechaInicio: "2026-07-10",
    fechaFin: "2026-07-15",
    canal: "Airbnb",
    montoPagado: 18500,
    creadoEn: new Date().toISOString(),
  },
  {
    id: "res2",
    villaId: "villa-2",
    huesped: "J. Ramírez",
    fechaInicio: "2026-08-01",
    fechaFin: "2026-08-04",
    canal: "Booking.com",
    montoPagado: 9200,
    creadoEn: new Date().toISOString(),
  },
];
