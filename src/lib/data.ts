import { supabase, supabaseConfigured } from "./supabaseClient";
import {
  villas as mockVillas,
  checklist as mockChecklist,
  insumos as mockInsumos,
  mejoras as mockMejoras,
  inventario as mockInventario,
} from "../data/mockData";
import type { ChecklistTarea, Condicion, EstadoMejora, InsumoStock, InventarioItem, Mejora, Profile, Resolucion, Villa } from "../types";
import { calcularUrgencia } from "./urgencia";
import { villasVisibles } from "./permissions";

export interface VillaBasica {
  id: string;
  numero: number;
  nombre: string | null;
}

// Todas las funciones de este archivo funcionan sin Supabase configurado
// (usan src/data/mockData.ts), y cambian a datos reales automáticamente
// en cuanto VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY estén en .env.
//
// El parametro `profile` (opcional) filtra el resultado a las villas
// visibles para ese perfil: los duenos solo ven sus villas asignadas, el
// resto de roles ve todas. Ademas de este filtro en el cliente, la
// seguridad real la da RLS en Supabase (ver supabase/schema.sql).

export async function listarVillas(profile?: Profile | null): Promise<VillaBasica[]> {
  const visibles = villasVisibles(profile ?? null);

  if (!supabaseConfigured || !supabase) {
    const todas = mockVillas.map(({ id, numero, nombre }) => ({ id, numero, nombre }));
    return visibles === null ? todas : todas.filter((v) => visibles.includes(v.id));
  }
  let query = supabase.from("villas").select("id, numero, nombre").order("numero");
  if (visibles !== null) query = query.in("id", visibles.length > 0 ? visibles : [""]);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listarVillasConEstado(profile?: Profile | null): Promise<Villa[]> {
  if (!supabaseConfigured || !supabase) {
    const visibles = villasVisibles(profile ?? null);
    return visibles === null ? mockVillas : mockVillas.filter((v) => visibles.includes(v.id));
  }

  const villasBase = await listarVillas(profile);
  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);

  const [checklistHoyRes, incidenciasRes, mejorasRes] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("villa_id, completado")
      .gte("creado_en", hoyInicio.toISOString()),
    supabase.from("incidencias").select("villa_id").eq("estado", "abierta"),
    supabase.from("mejoras").select("villa_id").eq("urgencia", "critico").neq("estado", "aprobada"),
  ]);

  const checklistHoy = checklistHoyRes.data ?? [];
  const villasConIncidencia = new Set(
    [...(incidenciasRes.data ?? []), ...(mejorasRes.data ?? [])].map(
      (r: { villa_id: string }) => r.villa_id
    )
  );

  return villasBase.map((v) => {
    if (villasConIncidencia.has(v.id)) {
      return { ...v, estadoHoy: "incidencia" as const };
    }
    const itemsVilla = checklistHoy.filter((c: { villa_id: string }) => c.villa_id === v.id);
    const enProceso = itemsVilla.length > 0 && itemsVilla.some((c: { completado: boolean }) => !c.completado);
    return { ...v, estadoHoy: enProceso ? ("limpieza" as const) : ("lista" as const) };
  });
}

export async function listarChecklist(villaId: string): Promise<ChecklistTarea[]> {
  if (!supabaseConfigured || !supabase) {
    return mockChecklist.filter((c) => c.villaId === villaId);
  }
  const { data, error } = await supabase
    .from("checklist_items")
    .select("id, villa_id, texto, completado")
    .eq("villa_id", villaId)
    .order("creado_en");
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    villaId: d.villa_id,
    texto: d.texto,
    completado: d.completado,
  }));
}

export async function actualizarChecklistItem(id: string, completado: boolean): Promise<void> {
  if (!supabaseConfigured || !supabase) return; // modo demo: solo se guarda en estado local
  const { error } = await supabase.from("checklist_items").update({ completado }).eq("id", id);
  if (error) throw error;
}

export async function listarInsumos(villaId: string): Promise<InsumoStock[]> {
  if (!supabaseConfigured || !supabase) {
    return mockInsumos.filter((i) => i.villaId === villaId);
  }
  const { data, error } = await supabase
    .from("insumos")
    .select("id, villa_id, nombre, stock_actual, stock_objetivo")
    .eq("villa_id", villaId);
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    villaId: d.villa_id,
    nombre: d.nombre,
    stockActual: d.stock_actual,
    stockObjetivo: d.stock_objetivo,
  }));
}

export async function listarMejoras(villaId?: string, profile?: Profile | null): Promise<Mejora[]> {
  const visibles = villasVisibles(profile ?? null);

  if (!supabaseConfigured || !supabase) {
    let resultado = mockMejoras;
    if (villaId) resultado = resultado.filter((m) => m.villaId === villaId);
    if (visibles !== null) resultado = resultado.filter((m) => visibles.includes(m.villaId));
    return resultado;
  }
  let query = supabase.from("mejoras").select("*").order("creado_en", { ascending: false });
  if (villaId) query = query.eq("villa_id", villaId);
  if (visibles !== null) query = query.in("villa_id", visibles.length > 0 ? visibles : [""]);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    villaId: d.villa_id,
    zona: d.zona,
    descripcion: d.descripcion,
    fotoAntesUrl: d.foto_antes_url ?? undefined,
    fotoDespuesUrl: d.foto_despues_url ?? undefined,
    afectaSeguridadOperacion: d.afecta_seguridad_operacion,
    afectaAmenidad: d.afecta_amenidad,
    urgencia: d.urgencia,
    resolucion: d.resolucion,
    materialNecesario: d.material_necesario ?? undefined,
    especialistaNecesario: d.especialista_necesario ?? undefined,
    costoEstimado: d.costo_estimado ?? undefined,
    estado: d.estado,
    creadoPor: d.creado_por ?? undefined,
    creadoEn: d.creado_en,
    resueltoEn: d.resuelto_en ?? undefined,
    aprobadoEn: d.aprobado_en ?? undefined,
  }));
}

export async function obtenerMejora(id: string): Promise<Mejora | null> {
  if (!supabaseConfigured || !supabase) {
    return mockMejoras.find((m) => m.id === id) ?? null;
  }
  const { data, error } = await supabase.from("mejoras").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    villaId: data.villa_id,
    zona: data.zona,
    descripcion: data.descripcion,
    fotoAntesUrl: data.foto_antes_url ?? undefined,
    fotoDespuesUrl: data.foto_despues_url ?? undefined,
    afectaSeguridadOperacion: data.afecta_seguridad_operacion,
    afectaAmenidad: data.afecta_amenidad,
    urgencia: data.urgencia,
    resolucion: data.resolucion,
    materialNecesario: data.material_necesario ?? undefined,
    especialistaNecesario: data.especialista_necesario ?? undefined,
    costoEstimado: data.costo_estimado ?? undefined,
    estado: data.estado,
    creadoPor: data.creado_por ?? undefined,
    creadoEn: data.creado_en,
    resueltoEn: data.resuelto_en ?? undefined,
    aprobadoEn: data.aprobado_en ?? undefined,
  };
}

export interface NuevaMejoraInput {
  villaId: string;
  zona: string;
  descripcion: string;
  // Obligatoria: no se puede reportar una mejora sin foto de evidencia.
  fotoAntesUrl: string;
  afectaSeguridadOperacion: boolean;
  afectaAmenidad: boolean;
  resolucion: Resolucion;
  materialNecesario?: string;
  especialistaNecesario?: string;
  costoEstimado?: number;
}

export async function crearMejora(input: NuevaMejoraInput): Promise<void> {
  const urgencia = calcularUrgencia(input.afectaSeguridadOperacion, input.afectaAmenidad);

  if (!supabaseConfigured || !supabase) {
    // Modo demo sin backend conectado: no persiste entre recargas.
    console.info("Mejora creada (demo, no persistida):", { ...input, urgencia });
    return;
  }

  const { error } = await supabase.from("mejoras").insert({
    villa_id: input.villaId,
    zona: input.zona,
    descripcion: input.descripcion,
    foto_antes_url: input.fotoAntesUrl,
    afecta_seguridad_operacion: input.afectaSeguridadOperacion,
    afecta_amenidad: input.afectaAmenidad,
    urgencia,
    resolucion: input.resolucion,
    material_necesario: input.materialNecesario || null,
    especialista_necesario: input.especialistaNecesario || null,
    costo_estimado: input.costoEstimado || null,
  });
  if (error) throw error;
}

// El equipo marca la tarea como resuelta subiendo la foto "despues"; queda
// esperando que el dueno la apruebe (o la rechace y pida mas trabajo).
export async function marcarMejoraResuelta(id: string, fotoDespuesUrl: string): Promise<void> {
  const ahora = new Date().toISOString();
  if (!supabaseConfigured || !supabase) {
    console.info("Mejora marcada como resuelta (demo, no persistida):", { id, fotoDespuesUrl });
    return;
  }
  const { error } = await supabase
    .from("mejoras")
    .update({ estado: "esperando_aprobacion" as EstadoMejora, foto_despues_url: fotoDespuesUrl, resuelto_en: ahora })
    .eq("id", id);
  if (error) throw error;
}

// Solo se marca completada la tarea cuando el dueno aprueba el resultado.
export async function aprobarMejora(id: string): Promise<void> {
  const ahora = new Date().toISOString();
  if (!supabaseConfigured || !supabase) {
    console.info("Mejora aprobada por el dueno (demo, no persistida):", { id });
    return;
  }
  const { error } = await supabase
    .from("mejoras")
    .update({ estado: "aprobada" as EstadoMejora, aprobado_en: ahora })
    .eq("id", id);
  if (error) throw error;
}

// El dueno rechaza el resultado: la tarea regresa a trabajo pendiente.
export async function rechazarMejora(id: string): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    console.info("Mejora rechazada por el dueno (demo, no persistida):", { id });
    return;
  }
  const { error } = await supabase
    .from("mejoras")
    .update({ estado: "rechazada" as EstadoMejora })
    .eq("id", id);
  if (error) throw error;
}

export async function listarInventario(villaId: string): Promise<InventarioItem[]> {
  if (!supabaseConfigured || !supabase) {
    return mockInventario.filter((i) => i.villaId === villaId);
  }
  const { data, error } = await supabase
    .from("inventario_items")
    .select("id, villa_id, zona, nombre, cantidad, condicion, foto_url, creado_en")
    .eq("villa_id", villaId)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    villaId: d.villa_id,
    zona: d.zona,
    nombre: d.nombre,
    cantidad: d.cantidad,
    condicion: d.condicion,
    fotoUrl: d.foto_url ?? undefined,
    creadoEn: d.creado_en,
  }));
}

export interface NuevoInventarioInput {
  villaId: string;
  zona: string;
  nombre: string;
  cantidad: number;
  condicion: Condicion;
  fotoUrl?: string;
}

export async function crearInventarioItem(input: NuevoInventarioInput): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    console.info("Item de inventario creado (demo, no persistido):", input);
    return;
  }
  const { error } = await supabase.from("inventario_items").insert({
    villa_id: input.villaId,
    zona: input.zona,
    nombre: input.nombre,
    cantidad: input.cantidad,
    condicion: input.condicion,
    foto_url: input.fotoUrl || null,
  });
  if (error) throw error;
}
