import type { Profile, Rol, TipoMantenimiento } from "../types";

export const LABEL_ROL: Record<Rol, string> = {
  supervisor: "Supervisor",
  administracion: "Administración",
  mantenimiento: "Mantenimiento",
  housekeeping: "Limpieza",
  dueno: "Dueño",
};

const ROLES_ADMIN: Rol[] = ["administracion", "supervisor"];

export function esAdmin(profile: Profile | null): boolean {
  return !!profile && ROLES_ADMIN.includes(profile.rol);
}

export function esDueno(profile: Profile | null): boolean {
  return profile?.rol === "dueno";
}

// Villas que el perfil puede ver. null = todas las villas.
export function villasVisibles(profile: Profile | null): string[] | null {
  if (profile?.rol === "dueno") return profile.villasAsignadas;
  return null;
}

export function puedeVerVilla(profile: Profile | null, villaId: string): boolean {
  const visibles = villasVisibles(profile);
  return visibles === null || visibles.includes(villaId);
}

// Todos los roles autenticados pueden reportar un caso de mejora.
export function puedeCrearCaso(profile: Profile | null): boolean {
  return !!profile;
}

// Solo quien reportó el caso, o administración/supervisor, puede marcarlo
// como resuelto (subir la foto "despues" y mandarlo a aprobación).
export function puedeMarcarResuelta(profile: Profile | null, creadoPorId: string | null | undefined): boolean {
  if (!profile) return false;
  if (esAdmin(profile)) return true;
  return !!creadoPorId && creadoPorId === profile.id;
}

// Aprobar/rechazar el resultado de una tarea es exclusivo del dueño de esa villa.
export function puedeAprobarORechazar(profile: Profile | null, villaId: string): boolean {
  return esDueno(profile) && puedeVerVilla(profile, villaId);
}

// Checklist de turnover: lo marcan limpieza, mantenimiento y administracion.
// El dueno solo consulta (transparencia), no edita.
export function puedeEditarChecklist(profile: Profile | null): boolean {
  return !esDueno(profile);
}

// Insumos/compras: administracion y supervisor gestionan el stock y piden
// reabasto. El resto de roles (incluyendo limpieza/mantenimiento) solo
// consultan.
export function puedeGestionarInsumos(profile: Profile | null): boolean {
  return esAdmin(profile);
}

// Almacen general: administracion/supervisor compran y agregan stock al
// almacen. Limpieza y mantenimiento tambien pueden repartir de ahi a una
// villa (y por eso ven el almacen); el dueno no ve esto, es un tema
// operativo interno, no de su villa.
export function puedeRepartirInsumos(profile: Profile | null): boolean {
  return !esDueno(profile) && !!profile;
}

// Inventario: administracion, supervisor y mantenimiento pueden agregar o
// actualizar items. Limpieza y dueno solo consultan.
export function puedeGestionarInventario(profile: Profile | null): boolean {
  return esAdmin(profile) || profile?.rol === "mantenimiento";
}

// Borrar una tarea de mejora es exclusivo de administracion/supervisor
// (por ejemplo, si se creo por error o esta duplicada).
export function puedeBorrarMejora(profile: Profile | null): boolean {
  return esAdmin(profile);
}

// Cotizacion (material/proveedor/foto/precio) para tareas que requieren
// comprar algo o contratar a alguien: la edita quien reporto el caso,
// administracion/supervisor, o mantenimiento en general (por ejemplo el
// jefe de mantenimiento, aunque no haya sido quien reporto el caso).
export function puedeEditarCotizacion(profile: Profile | null): boolean {
  return esAdmin(profile) || profile?.rol === "mantenimiento";
}

// Preventivo vs correctivo (quien paga) lo decide solo administracion:
// mantenimiento y el resto de roles solo reportan incidentes/avances
// fisicos, no clasifican quien cubre el gasto.
export function puedeElegirTipoMantenimiento(profile: Profile | null): boolean {
  return esAdmin(profile);
}

// Solo administracion/supervisor aprueba que la cotizacion es correcta
// antes de que el dueno la vea y de que se pueda pagar.
export function puedeAprobarCotizacion(profile: Profile | null): boolean {
  return esAdmin(profile);
}

// Quien puede marcar la cotizacion como pagada/comprada (una vez ya
// aprobada) depende de quien paga: si es correctivo, el dueno de la villa
// (quien pone el dinero) o administracion; si es preventivo, se paga con
// fondos de Mazul, asi que solo administracion lo confirma.
export function puedeMarcarCotizacionPagada(
  profile: Profile | null,
  villaId: string,
  tipoMantenimiento: TipoMantenimiento
): boolean {
  if (esAdmin(profile)) return true;
  if (tipoMantenimiento === "correctivo") return esDueno(profile) && puedeVerVilla(profile, villaId);
  return false;
}

// El dueno solo ve material/proveedor/foto/precio de la cotizacion una vez
// que administracion la aprobo (para no exponer gastos sin revisar). Los
// demas roles siempre la ven. No aplica si la resolucion es "equipo" (no
// hay nada que comprar).
export function puedeVerDetallesCotizacion(
  profile: Profile | null,
  resolucionEsCompra: boolean,
  cotizacionAprobada: boolean
): boolean {
  if (!resolucionEsCompra) return true;
  if (!esDueno(profile)) return true;
  return cotizacionAprobada;
}
