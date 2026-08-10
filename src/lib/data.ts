import { supabase, supabaseConfigured } from "./supabaseClient";
import {
  villas as mockVillas,
  checklist as mockChecklist,
  insumos as mockInsumos,
  mejoras as mockMejoras,
} from "../data/mockData";
import type { ChecklistTarea, InsumoStock, Mejora, Resolucion, Villa } from "../types";
import { calcularUrgencia } from "./urgencia";

export interface VillaBasica {
  id: string;
  nombre: string;
}

// Todas las funciones de este archivo funcionan sin Supabase configurado
// (usan src/data/mockData.ts), y cambian a datos reales automáticamente
// en cuanto VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY estén en .env.

export async function listarVillas(): Promise<VillaBasica[]> {
  if (!supabaseConfigured || !supabase) {
    return mockVillas.map(({ id, nombre }) => ({ id, nombre }));
  }
  const { data, error } = await supabase.from("villas").select("id, nombre").order("nombre");
  if (error) throw error;
  return data ?? [];
}

export async function listarVillasConEstado(): Promise<Villa[]> {
  if (!supabaseConfigured || !supabase) {
    return mockVillas;
  }

  const villasBase = await listarVillas();
  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);

  const [checklistHoyRes, incidenciasRes, mejorasRes] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("villa_id, completado")
      .gte("creado_en", hoyInicio.toISOString()),
    supabase.from("incidencias").select("villa_id").eq("estado", "abierta"),
    supabase.from("mejoras").select("villa_id").eq("urgencia", "critico").neq("estado", "resuelta"),
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

export async function listarMejoras(villaId?: string): Promise<Mejora[]> {
  if (!supabaseConfigured || !supabase) {
    return villaId ? mockMejoras.filter((m) => m.villaId === villaId) : mockMejoras;
  }
  let query = supabase.from("mejoras").select("*").order("creado_en", { ascending: false });
  if (villaId) query = query.eq("villa_id", villaId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    villaId: d.villa_id,
    zona: d.zona,
    descripcion: d.descripcion,
    fotoUrl: d.foto_url ?? undefined,
    afectaSeguridadOperacion: d.afecta_seguridad_operacion,
    afectaAmenidad: d.afecta_amenidad,
    urgencia: d.urgencia,
    resolucion: d.resolucion,
    materialNecesario: d.material_necesario ?? undefined,
    especialistaNecesario: d.especialista_necesario ?? undefined,
    costoEstimado: d.costo_estimado ?? undefined,
    estado: d.estado,
    creadoEn: d.creado_en,
  }));
}

export interface NuevaMejoraInput {
  villaId: string;
  zona: string;
  descripcion: string;
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
