import { supabase, supabaseConfigured } from "./supabaseClient";
import {
  villas as mockVillas,
  checklist as mockChecklist,
  insumos as mockInsumos,
  almacenGeneral as mockAlmacen,
  mejoras as mockMejoras,
  inventario as mockInventario,
  reservas as mockReservas,
} from "../data/mockData";
import type { ChecklistTarea, Condicion, EstadoMejora, InsumoCatalogo, InsumoStock, InventarioItem, Mejora, Profile, Reserva, Resolucion, TipoMantenimiento, Villa } from "../types";
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

// ============================================================
// Almacen general: se compra aqui (administracion) y de aqui se reparte a
// cada villa. El reparto resta del almacen y suma al stock de esa villa en
// una sola operacion atomica (funcion de base de datos repartir_insumo, ver
// supabase/schema.sql) para que nunca queden descuadrados.
// ============================================================

export async function listarAlmacen(): Promise<InsumoCatalogo[]> {
  if (!supabaseConfigured || !supabase) {
    return mockAlmacen;
  }
  const { data, error } = await supabase
    .from("insumos_catalogo")
    .select("id, nombre, unidad, categoria, stock_actual, stock_minimo")
    .order("nombre");
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    nombre: d.nombre,
    unidad: d.unidad ?? undefined,
    categoria: d.categoria ?? undefined,
    stockActual: d.stock_actual,
    stockMinimo: d.stock_minimo,
  }));
}

export interface NuevoInsumoCatalogoInput {
  nombre: string;
  unidad?: string;
  categoria?: string;
  stockActual: number;
  stockMinimo: number;
}

export async function crearInsumoCatalogo(input: NuevoInsumoCatalogoInput): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    console.info("Insumo de catalogo creado (demo, no persistido):", input);
    return;
  }
  const { error } = await supabase.from("insumos_catalogo").insert({
    nombre: input.nombre,
    unidad: input.unidad || null,
    categoria: input.categoria || null,
    stock_actual: input.stockActual,
    stock_minimo: input.stockMinimo,
  });
  if (error) throw error;
}

// Compra: aumenta el stock del almacen general (solo administracion, ver RLS).
export async function registrarCompraInsumo(insumoId: string, cantidad: number): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    console.info("Compra registrada (demo, no persistida):", { insumoId, cantidad });
    return;
  }
  const { error } = await supabase.rpc("registrar_compra_insumo", {
    p_insumo_id: insumoId,
    p_cantidad: cantidad,
  });
  if (error) throw error;
}

// Reparto: resta del almacen general y suma al stock de la villa destino
// (creando su fila de insumo si todavia no la tenia).
export async function repartirInsumo(villaId: string, insumoId: string, cantidad: number): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    console.info("Reparto registrado (demo, no persistido):", { villaId, insumoId, cantidad });
    return;
  }
  const { error } = await supabase.rpc("repartir_insumo", {
    p_villa_id: villaId,
    p_insumo_id: insumoId,
    p_cantidad: cantidad,
  });
  if (error) throw error;
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
    tipoMantenimiento: d.tipo_mantenimiento ?? "correctivo",
    resolucion: d.resolucion,
    materialNecesario: d.material_necesario ?? undefined,
    especialistaNecesario: d.especialista_necesario ?? undefined,
    costoEstimado: d.costo_estimado ?? undefined,
    fotoCotizacionUrl: d.foto_cotizacion_url ?? undefined,
    proveedorOLink: d.proveedor_o_link ?? undefined,
    cotizacionAprobada: d.cotizacion_aprobada ?? false,
    cotizacionAprobadaEn: d.cotizacion_aprobada_en ?? undefined,
    cotizacionPagada: d.cotizacion_pagada ?? false,
    cotizacionPagadaEn: d.cotizacion_pagada_en ?? undefined,
    estado: d.estado,
    creadoPor: d.creado_por ?? undefined,
    creadoEn: d.creado_en,
    resueltoEn: d.resuelto_en ?? undefined,
    aprobadoEn: d.aprobado_en ?? undefined,
    inventarioItemId: d.inventario_item_id ?? undefined,
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
    tipoMantenimiento: data.tipo_mantenimiento ?? "correctivo",
    resolucion: data.resolucion,
    materialNecesario: data.material_necesario ?? undefined,
    especialistaNecesario: data.especialista_necesario ?? undefined,
    costoEstimado: data.costo_estimado ?? undefined,
    fotoCotizacionUrl: data.foto_cotizacion_url ?? undefined,
    proveedorOLink: data.proveedor_o_link ?? undefined,
    cotizacionAprobada: data.cotizacion_aprobada ?? false,
    cotizacionAprobadaEn: data.cotizacion_aprobada_en ?? undefined,
    cotizacionPagada: data.cotizacion_pagada ?? false,
    cotizacionPagadaEn: data.cotizacion_pagada_en ?? undefined,
    estado: data.estado,
    creadoPor: data.creado_por ?? undefined,
    creadoEn: data.creado_en,
    resueltoEn: data.resuelto_en ?? undefined,
    aprobadoEn: data.aprobado_en ?? undefined,
    inventarioItemId: data.inventario_item_id ?? undefined,
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
  tipoMantenimiento: TipoMantenimiento;
  resolucion: Resolucion;
  materialNecesario?: string;
  especialistaNecesario?: string;
  costoEstimado?: number;
  // Si se reporta desde un item de inventario en mal estado, referencia a
  // ese registro (ver botón "Reportar como mejora" en Inventario.tsx).
  inventarioItemId?: string;
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
    tipo_mantenimiento: input.tipoMantenimiento,
    resolucion: input.resolucion,
    material_necesario: input.materialNecesario || null,
    especialista_necesario: input.especialistaNecesario || null,
    costo_estimado: input.costoEstimado || null,
    inventario_item_id: input.inventarioItemId || null,
  });
  if (error) throw error;
}

// Permite completar despues los datos de material/especialista/costo
// cuando al reportar el caso todavia no se sabe que se necesita comprar
// o contratar (no hace falta volver a crear la tarea).
export interface DetallesMejoraInput {
  resolucion: Resolucion;
  materialNecesario?: string;
  especialistaNecesario?: string;
  costoEstimado?: number;
  fotoCotizacionUrl?: string;
  proveedorOLink?: string;
  // Solo administracion puede cambiar esto (ver permissions.ts); si no se
  // manda, no se toca la clasificacion que ya tenia.
  tipoMantenimiento?: TipoMantenimiento;
}

// Cualquier edicion a los datos de compra reinicia la aprobacion/pago de
// la cotizacion (si cambio el precio o el proveedor, hay que revisarla de
// nuevo antes de que el dueno pague). Si la resolucion es "equipo" no
// aplica cotizacion, asi que se deja todo limpio.
export async function actualizarDetallesMejora(id: string, input: DetallesMejoraInput): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    console.info("Detalles de mejora actualizados (demo, no persistida):", { id, ...input });
    return;
  }
  const requiereCompra = input.resolucion !== "equipo";
  const cambios: Record<string, unknown> = {
    resolucion: input.resolucion,
    material_necesario: input.materialNecesario || null,
    especialista_necesario: input.especialistaNecesario || null,
    costo_estimado: input.costoEstimado || null,
    foto_cotizacion_url: requiereCompra ? input.fotoCotizacionUrl || null : null,
    proveedor_o_link: requiereCompra ? input.proveedorOLink || null : null,
    cotizacion_aprobada: false,
    cotizacion_pagada: false,
  };
  if (input.tipoMantenimiento !== undefined) {
    cambios.tipo_mantenimiento = input.tipoMantenimiento;
  }
  const { error } = await supabase.from("mejoras").update(cambios).eq("id", id);
  if (error) throw error;
}

// Solo administracion/supervisor: confirma que la cotizacion (material,
// proveedor, precio) es correcta. A partir de aqui el dueno ya puede
// verla y pagarla.
export async function aprobarCotizacion(id: string): Promise<void> {
  const ahora = new Date().toISOString();
  if (!supabaseConfigured || !supabase) {
    console.info("Cotizacion aprobada (demo, no persistida):", { id });
    return;
  }
  const { error } = await supabase
    .from("mejoras")
    .update({ cotizacion_aprobada: true, cotizacion_aprobada_en: ahora })
    .eq("id", id);
  if (error) throw error;
}

// El dueno (quien paga) o administracion confirman que ya se pago/compro
// el material. Recien entonces el equipo puede marcar la tarea resuelta.
export async function marcarCotizacionPagada(id: string): Promise<void> {
  const ahora = new Date().toISOString();
  if (!supabaseConfigured || !supabase) {
    console.info("Cotizacion marcada como pagada (demo, no persistida):", { id });
    return;
  }
  const { error } = await supabase
    .from("mejoras")
    .update({ cotizacion_pagada: true, cotizacion_pagada_en: ahora })
    .eq("id", id);
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

// Solo administracion/supervisor pueden borrar (ver permissions.ts); la
// base de datos tambien lo exige via RLS, esto es nada mas la llamada.
export async function eliminarMejora(id: string): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    console.info("Mejora borrada (demo, no persistida):", { id });
    return;
  }
  const { error } = await supabase.from("mejoras").delete().eq("id", id);
  if (error) throw error;
}

export async function listarInventario(villaId: string): Promise<InventarioItem[]> {
  if (!supabaseConfigured || !supabase) {
    return mockInventario.filter((i) => i.villaId === villaId);
  }
  const { data, error } = await supabase
    .from("inventario_items")
    .select(
      "id, villa_id, zona, nombre, categoria, cantidad, condicion, descripcion_condicion, link_compra, foto_url, creado_en"
    )
    .eq("villa_id", villaId)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    villaId: d.villa_id,
    zona: d.zona,
    nombre: d.nombre,
    categoria: d.categoria ?? undefined,
    cantidad: d.cantidad,
    condicion: d.condicion,
    descripcionCondicion: d.descripcion_condicion ?? undefined,
    linkCompra: d.link_compra ?? undefined,
    fotoUrl: d.foto_url ?? undefined,
    creadoEn: d.creado_en,
  }));
}

export interface NuevoInventarioInput {
  villaId: string;
  zona: string;
  nombre: string;
  categoria?: string;
  cantidad: number;
  condicion: Condicion;
  descripcionCondicion?: string;
  linkCompra?: string;
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
    categoria: input.categoria || null,
    cantidad: input.cantidad,
    condicion: input.condicion,
    descripcion_condicion: input.descripcionCondicion || null,
    link_compra: input.linkCompra || null,
    foto_url: input.fotoUrl || null,
  });
  if (error) throw error;
}

export async function obtenerInventarioItem(id: string): Promise<InventarioItem | null> {
  if (!supabaseConfigured || !supabase) {
    return mockInventario.find((i) => i.id === id) ?? null;
  }
  const { data, error } = await supabase
    .from("inventario_items")
    .select(
      "id, villa_id, zona, nombre, categoria, cantidad, condicion, descripcion_condicion, link_compra, foto_url, creado_en"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    villaId: data.villa_id,
    zona: data.zona,
    nombre: data.nombre,
    categoria: data.categoria ?? undefined,
    cantidad: data.cantidad,
    condicion: data.condicion,
    descripcionCondicion: data.descripcion_condicion ?? undefined,
    linkCompra: data.link_compra ?? undefined,
    fotoUrl: data.foto_url ?? undefined,
    creadoEn: data.creado_en,
  };
}

// Corrige un item ya registrado (por ejemplo, un error de captura). No
// cambia la villa a la que pertenece — solo administracion/supervision
// puede hacer esto, ver puedeEditarInventario en permissions.ts (y la RLS
// "inventario_update" en supabase/schema.sql, que lo exige tambien del
// lado del servidor).
export interface EditarInventarioInput {
  zona: string;
  nombre: string;
  categoria?: string;
  cantidad: number;
  condicion: Condicion;
  descripcionCondicion?: string;
  linkCompra?: string;
  fotoUrl?: string;
}

export async function actualizarInventarioItem(id: string, input: EditarInventarioInput): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    console.info("Item de inventario corregido (demo, no persistido):", { id, ...input });
    return;
  }
  const { error } = await supabase
    .from("inventario_items")
    .update({
      zona: input.zona,
      nombre: input.nombre,
      categoria: input.categoria || null,
      cantidad: input.cantidad,
      condicion: input.condicion,
      descripcion_condicion: input.descripcionCondicion || null,
      link_compra: input.linkCompra || null,
      foto_url: input.fotoUrl || null,
    })
    .eq("id", id);
  if (error) throw error;
}

// Busca items (en cualquier villa) con un nombre parecido que ya tengan un
// link de compra guardado — para cuando hay que comprar lo mismo en otra
// villa y no acordarse dónde se compró la primera vez. Ver
// NuevoItemInventario.tsx. La RLS "inventario_select" ya deja ver todas las
// villas a cualquier rol que no sea dueño (villa_visible).
export interface SugerenciaLinkCompra {
  villaId: string;
  nombre: string;
  linkCompra: string;
}

export async function buscarLinksCompra(nombre: string): Promise<SugerenciaLinkCompra[]> {
  const texto = nombre.trim();
  if (texto.length < 3) return [];
  if (!supabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("inventario_items")
    .select("villa_id, nombre, link_compra")
    .ilike("nombre", `%${texto}%`)
    .not("link_compra", "is", null)
    .limit(5);
  if (error) throw error;
  return (data ?? [])
    .filter((d) => !!d.link_compra)
    .map((d) => ({ villaId: d.villa_id, nombre: d.nombre, linkCompra: d.link_compra as string }));
}

// Quita el item del inventario por completo: se capturó por error, o se
// rompió/se desechó y ya no existe en la villa. Solo administracion/
// supervision (ver puedeBorrarInventario en permissions.ts y la RLS
// "inventario_delete" en supabase/schema.sql, que lo exige tambien del
// lado del servidor).
export async function eliminarInventarioItem(id: string): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    console.info("Item de inventario borrado (demo, no persistido):", { id });
    return;
  }
  const { error } = await supabase.from("inventario_items").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// Reservas: bitácora de rentas ya cobradas por villa (no un calendario de
// reservaciones futuras). Registrarlas/corregirlas/borrarlas es exclusivo
// de administración — ver puedeGestionarReservas en permissions.ts y la
// RLS "reservas_admin_write" en supabase/schema.sql.
// ============================================================

export async function listarReservas(villaId: string): Promise<Reserva[]> {
  if (!supabaseConfigured || !supabase) {
    return mockReservas.filter((r) => r.villaId === villaId);
  }
  const { data, error } = await supabase
    .from("reservas")
    .select("id, villa_id, huesped, fecha_inicio, fecha_fin, canal, monto_pagado, notas, creado_en")
    .eq("villa_id", villaId)
    .order("fecha_inicio", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    villaId: d.villa_id,
    huesped: d.huesped ?? undefined,
    fechaInicio: d.fecha_inicio,
    fechaFin: d.fecha_fin,
    canal: d.canal,
    montoPagado: d.monto_pagado,
    notas: d.notas ?? undefined,
    creadoEn: d.creado_en,
  }));
}

export interface NuevaReservaInput {
  villaId: string;
  huesped?: string;
  fechaInicio: string;
  fechaFin: string;
  canal: string;
  montoPagado: number;
  notas?: string;
}

export async function crearReserva(input: NuevaReservaInput): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    console.info("Reserva creada (demo, no persistida):", input);
    return;
  }
  const { error } = await supabase.from("reservas").insert({
    villa_id: input.villaId,
    huesped: input.huesped || null,
    fecha_inicio: input.fechaInicio,
    fecha_fin: input.fechaFin,
    canal: input.canal,
    monto_pagado: input.montoPagado,
    notas: input.notas || null,
  });
  if (error) throw error;
}

// Trae una sola reserva (para el formulario de edición). Solo
// administración/supervisión llega a esta pantalla, ver puedeGestionarReservas.
export async function obtenerReserva(id: string): Promise<Reserva | null> {
  if (!supabaseConfigured || !supabase) {
    return mockReservas.find((r) => r.id === id) ?? null;
  }
  const { data, error } = await supabase
    .from("reservas")
    .select("id, villa_id, huesped, fecha_inicio, fecha_fin, canal, monto_pagado, notas, creado_en")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    villaId: data.villa_id,
    huesped: data.huesped ?? undefined,
    fechaInicio: data.fecha_inicio,
    fechaFin: data.fecha_fin,
    canal: data.canal,
    montoPagado: data.monto_pagado,
    notas: data.notas ?? undefined,
    creadoEn: data.creado_en,
  };
}

export interface ActualizarReservaInput {
  huesped?: string;
  fechaInicio: string;
  fechaFin: string;
  canal: string;
  montoPagado: number;
  notas?: string;
}

// Corrige una reserva ya capturada (por ejemplo, cambio de última hora en
// fechas o monto). Solo administración/supervisión, ver puedeGestionarReservas.
export async function actualizarReserva(id: string, input: ActualizarReservaInput): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    console.info("Reserva actualizada (demo, no persistida):", { id, ...input });
    return;
  }
  const { error } = await supabase
    .from("reservas")
    .update({
      huesped: input.huesped || null,
      fecha_inicio: input.fechaInicio,
      fecha_fin: input.fechaFin,
      canal: input.canal,
      monto_pagado: input.montoPagado,
      notas: input.notas || null,
    })
    .eq("id", id);
  if (error) throw error;
}

// Borra una reserva ya capturada (error de captura). Solo
// administración/supervisión, ver puedeGestionarReservas.
export async function eliminarReserva(id: string): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    console.info("Reserva borrada (demo, no persistida):", { id });
    return;
  }
  const { error } = await supabase.from("reservas").delete().eq("id", id);
  if (error) throw error;
}

// Recordatorio de limpieza: villas con entrada o salida de huésped en los
// próximos días (desde ayer hasta pasado mañana), para que limpieza sepa
// qué villa dejar lista antes de que llegue el huésped y cuál limpiar
// después de que se va. Solo fechas — sin montos ni datos del huésped, así
// que lo puede ver cualquier rol (RLS "reservas_select" ya filtra por villa
// visible, así que a un dueño solo le salen sus propias villas). Ver
// Dashboard.tsx.
export interface ProximoMovimiento {
  villaId: string;
  tipo: "entrada" | "salida";
  fecha: string; // yyyy-mm-dd
}

export async function listarProximosMovimientos(): Promise<ProximoMovimiento[]> {
  if (!supabaseConfigured || !supabase) return [];
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const hoy = new Date();
  const desde = new Date(hoy);
  desde.setDate(desde.getDate() - 1);
  const hasta = new Date(hoy);
  hasta.setDate(hasta.getDate() + 2);
  const desdeStr = fmt(desde);
  const hastaStr = fmt(hasta);
  const { data, error } = await supabase
    .from("reservas")
    .select("villa_id, fecha_inicio, fecha_fin")
    .gte("fecha_fin", desdeStr)
    .lte("fecha_inicio", hastaStr);
  if (error) throw error;
  const movimientos: ProximoMovimiento[] = [];
  for (const r of data ?? []) {
    if (r.fecha_inicio >= desdeStr && r.fecha_inicio <= hastaStr) {
      movimientos.push({ villaId: r.villa_id, tipo: "entrada", fecha: r.fecha_inicio });
    }
    if (r.fecha_fin >= desdeStr && r.fecha_fin <= hastaStr) {
      movimientos.push({ villaId: r.villa_id, tipo: "salida", fecha: r.fecha_fin });
    }
  }
  return movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Calendario de reservas (7 días hacia adelante por default): villa contra
// fecha, para ver de un vistazo qué villas tienen huésped cada día. Solo
// fechas, sin monto/canal/huésped — lo puede ver cualquier rol (ver
// CalendarioReservas.tsx).
export interface ReservaCalendario {
  villaId: string;
  fechaInicio: string;
  fechaFin: string;
}

export async function listarReservasCalendario(diasAdelante = 7): Promise<ReservaCalendario[]> {
  if (!supabaseConfigured || !supabase) {
    return mockReservas.map((r) => ({ villaId: r.villaId, fechaInicio: r.fechaInicio, fechaFin: r.fechaFin }));
  }
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const hoy = new Date();
  const hastaDate = new Date(hoy);
  hastaDate.setDate(hastaDate.getDate() + diasAdelante - 1);
  const hoyStr = fmt(hoy);
  const hastaStr = fmt(hastaDate);
  const { data, error } = await supabase
    .from("reservas")
    .select("villa_id, fecha_inicio, fecha_fin")
    .lte("fecha_inicio", hastaStr)
    .gte("fecha_fin", hoyStr);
  if (error) throw error;
  return (data ?? []).map((d) => ({ villaId: d.villa_id, fechaInicio: d.fecha_inicio, fechaFin: d.fecha_fin }));
}

// ============================================================
// Usuarios: solo para la pantalla admin "Usuarios y permisos" (ver
// Usuarios.tsx). La RLS "profiles_select" ya deja a administracion/
// supervision ver todos los perfiles, no solo el propio.
// ============================================================

export async function listarUsuarios(): Promise<Profile[]> {
  if (!supabaseConfigured || !supabase) {
    return [
      { id: "demo", nombre: "Modo demo", email: "demo@mazul.mx", rol: "administracion", villasAsignadas: [], inventarioExtra: false },
    ];
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nombre, rol, villas_asignadas, inventario_extra, email")
    .order("rol", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    nombre: d.nombre,
    email: d.email ?? undefined,
    rol: d.rol,
    villasAsignadas: d.villas_asignadas ?? [],
    inventarioExtra: d.inventario_extra ?? false,
  }));
}

// Prende/apaga la excepción por persona de agregar inventario nuevo (ver
// inventarioExtra en types.ts). Solo administración/supervisión — la RLS
// "profiles_admin_update" en schema.sql lo exige también del lado del
// servidor.
export async function actualizarInventarioExtra(id: string, valor: boolean): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    console.info("Permiso extra de inventario actualizado (demo, no persistido):", { id, valor });
    return;
  }
  const { error } = await supabase.from("profiles").update({ inventario_extra: valor }).eq("id", id);
  if (error) throw error;
}
