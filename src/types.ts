// Coincide con el check de supabase/schema.sql (tabla profiles.rol).
export type Rol = "supervisor" | "administracion" | "mantenimiento" | "housekeeping" | "dueno";

export interface Profile {
  id: string;
  nombre: string | null;
  rol: Rol;
  // Solo aplica a duenos: los ids de villa a las que tienen acceso.
  // Para el resto de roles se ignora (ven todas las villas).
  villasAsignadas: string[];
}

export interface Villa {
  id: string;
  numero: number;
  nombre: string | null; // apodo; null si aun no tiene uno asignado
  estadoHoy: "lista" | "limpieza" | "incidencia";
}

export type Urgencia = "critico" | "operacional" | "estetica";

export type Resolucion = "equipo" | "materiales" | "contratar";

export type EstadoMejora = "pendiente" | "en_proceso" | "esperando_aprobacion" | "aprobada" | "rechazada";

export interface Mejora {
  id: string;
  villaId: string;
  zona: string;
  descripcion: string;
  // La foto "antes" es obligatoria al crear la tarea (se valida en el
  // formulario). La foto "despues" se sube al marcarla como resuelta, antes
  // de mandarla a aprobacion del dueno.
  fotoAntesUrl?: string;
  fotoDespuesUrl?: string;
  // Preguntas tangibles que determinan la urgencia (no es un valor elegido a mano)
  afectaSeguridadOperacion: boolean; // bloquea la villa o empeora si no se atiende ya
  afectaAmenidad: boolean; // afecta un servicio/amenidad que el huesped espera
  urgencia: Urgencia; // calculado a partir de las dos preguntas anteriores
  resolucion: Resolucion;
  materialNecesario?: string;
  especialistaNecesario?: string;
  costoEstimado?: number;
  estado: EstadoMejora;
  // Quien reporto el caso; solo esa persona (o administracion/supervisor)
  // puede marcarlo como resuelto. Ver src/lib/permissions.ts.
  creadoPor?: string;
  creadoEn: string;
  resueltoEn?: string;
  aprobadoEn?: string;
}

export interface InsumoStock {
  id: string;
  villaId: string;
  nombre: string;
  stockActual: number;
  stockObjetivo: number;
}

// Catalogo del almacen general: se compra aqui y de aqui se reparte a cada
// villa (ver repartirInsumo en src/lib/data.ts). El stock por villa
// (InsumoStock arriba) refleja lo que ya se entrego a esa villa.
export interface InsumoCatalogo {
  id: string;
  nombre: string;
  unidad?: string;
  stockActual: number;
  stockMinimo: number;
}

export interface ChecklistTarea {
  id: string;
  villaId: string;
  texto: string;
  completado: boolean;
}

export type Condicion = "bueno" | "regular" | "danado";

// Cada registro es una entrada de auditoria con fecha (no se sobreescribe),
// asi que el historial completo por item queda como bitacora en el tiempo.
export interface InventarioItem {
  id: string;
  villaId: string;
  zona: string;
  nombre: string;
  cantidad: number;
  condicion: Condicion;
  fotoUrl?: string;
  creadoEn: string;
}
