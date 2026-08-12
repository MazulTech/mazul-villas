import type { Profile, Rol } from "../types";

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

// Inventario: administracion, supervisor y mantenimiento pueden agregar o
// actualizar items. Limpieza y dueno solo consultan.
export function puedeGestionarInventario(profile: Profile | null): boolean {
  return esAdmin(profile) || profile?.rol === "mantenimiento";
}
