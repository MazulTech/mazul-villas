export interface Villa {
  id: string;
  nombre: string;
  estadoHoy: "lista" | "limpieza" | "incidencia";
}

export type Urgencia = "critico" | "operacional" | "estetica";

export type Resolucion = "equipo" | "materiales" | "contratar";

export interface Mejora {
  id: string;
  villaId: string;
  zona: string;
  descripcion: string;
  fotoUrl?: string;
  // Preguntas tangibles que determinan la urgencia (no es un valor elegido a mano)
  afectaSeguridadOperacion: boolean; // bloquea la villa o empeora si no se atiende ya
  afectaAmenidad: boolean; // afecta un servicio/amenidad que el huesped espera
  urgencia: Urgencia; // calculado a partir de las dos preguntas anteriores
  resolucion: Resolucion;
  materialNecesario?: string;
  especialistaNecesario?: string;
  costoEstimado?: number;
  estado: "pendiente" | "en_proceso" | "resuelta";
  creadoEn: string;
}

export interface InsumoStock {
  id: string;
  villaId: string;
  nombre: string;
  stockActual: number;
  stockObjetivo: number;
}

export interface ChecklistTarea {
  id: string;
  villaId: string;
  texto: string;
  completado: boolean;
}
