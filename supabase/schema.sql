-- Esquema Mazul App
-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor)
-- Este archivo es idempotente: se puede correr varias veces sin romper nada.

create table if not exists villas (
  id text primary key,
  numero int not null unique,
  nombre text -- apodo (Ostion, Sierra...); puede ser nulo si aun no tiene apodo asignado
);

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  villa_id text references villas(id) not null,
  texto text not null,
  completado boolean not null default false,
  reserva_id text, -- referencia opcional a la reserva de Guesty (checkOut)
  creado_en timestamptz not null default now()
);

create table if not exists insumos (
  id uuid primary key default gen_random_uuid(),
  villa_id text references villas(id) not null,
  nombre text not null,
  stock_actual int not null default 0,
  stock_objetivo int not null default 0,
  actualizado_en timestamptz not null default now()
);

-- La urgencia se calcula en la app (ver src/lib/urgencia.ts) a partir de
-- afecta_seguridad_operacion y afecta_amenidad, nunca se captura a mano.
-- foto_antes_url es obligatoria (se valida en el formulario); foto_despues_url
-- se sube al marcar la tarea como resuelta, antes de mandarla a aprobacion.
-- Una tarea solo llega a 'aprobada' cuando el dueno la aprueba (ver trigger
-- mas abajo, que aplica esta regla tambien a nivel de base de datos).
create table if not exists mejoras (
  id uuid primary key default gen_random_uuid(),
  villa_id text references villas(id) not null,
  zona text not null,
  descripcion text not null,
  foto_antes_url text not null,
  foto_despues_url text,
  afecta_seguridad_operacion boolean not null,
  afecta_amenidad boolean not null,
  urgencia text not null check (urgencia in ('critico', 'operacional', 'estetica')),
  resolucion text not null check (resolucion in ('equipo', 'materiales', 'contratar')),
  material_necesario text,
  especialista_necesario text,
  costo_estimado numeric,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'en_proceso', 'esperando_aprobacion', 'aprobada', 'rechazada')),
  creado_por uuid references auth.users(id) default auth.uid(),
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz,
  aprobado_en timestamptz
);

-- Por si la tabla ya existia de una version anterior sin este default
-- (create table if not exists no lo agrega a tablas ya creadas).
alter table mejoras alter column creado_por set default auth.uid();

create table if not exists incidencias (
  id uuid primary key default gen_random_uuid(),
  villa_id text references villas(id) not null,
  categoria text not null,
  descripcion text not null,
  foto_url text,
  estado text not null default 'abierta' check (estado in ('abierta', 'en_proceso', 'resuelta')),
  creado_en timestamptz not null default now()
);

-- Catalogo de mobiliario/equipo por villa, con foto. Cada fila es un
-- registro de auditoria con fecha (no se sobreescribe), asi que sirve
-- tanto de catalogo base como de bitacora de recorridos en el tiempo.
create table if not exists inventario_items (
  id uuid primary key default gen_random_uuid(),
  villa_id text references villas(id) not null,
  zona text not null,
  nombre text not null,
  cantidad int not null default 1,
  condicion text not null check (condicion in ('bueno', 'regular', 'danado')),
  foto_url text,
  creado_en timestamptz not null default now()
);

-- Perfiles con rol, para las 4 audiencias del negocio: administracion
-- (incluye supervisor/gerencia), mantenimiento, housekeeping (limpieza) y
-- dueno. villas_asignadas solo aplica a duenos: son las unicas villas que
-- pueden ver. El resto de roles ve todas las villas.
create table if not exists profiles (
  id uuid primary key references auth.users(id),
  nombre text,
  rol text not null check (rol in ('supervisor', 'mantenimiento', 'administracion', 'housekeeping', 'dueno')),
  villas_asignadas text[] default '{}'
);

alter table villas enable row level security;
alter table checklist_items enable row level security;
alter table insumos enable row level security;
alter table mejoras enable row level security;
alter table incidencias enable row level security;
alter table inventario_items enable row level security;
alter table profiles enable row level security;

-- ============================================================
-- Funciones auxiliares (SECURITY DEFINER para evitar recursion al leer
-- profiles desde dentro de las politicas de profiles mismas).
-- ============================================================
create or replace function public.mi_rol()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select rol from public.profiles where id = auth.uid();
$$;

create or replace function public.mis_villas()
returns text[]
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(villas_asignadas, '{}') from public.profiles where id = auth.uid();
$$;

create or replace function public.es_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select rol from public.profiles where id = auth.uid()) in ('administracion', 'supervisor'), false);
$$;

-- Villa visible: administracion/supervisor/mantenimiento/housekeeping ven
-- todas las villas; dueno solo las suyas.
create or replace function public.villa_visible(v_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.mi_rol() != 'dueno', false) or v_id = any(public.mis_villas());
$$;

-- ============================================================
-- Politicas por rol. Reemplazan las politicas "dev_*" (abiertas a
-- cualquiera con la anon key) que se usaron mientras no habia Auth.
-- ============================================================
drop policy if exists "dev_villas_all" on villas;
drop policy if exists "dev_checklist_all" on checklist_items;
drop policy if exists "dev_insumos_all" on insumos;
drop policy if exists "dev_mejoras_all" on mejoras;
drop policy if exists "dev_incidencias_all" on incidencias;
drop policy if exists "dev_inventario_all" on inventario_items;
drop policy if exists "dev_profiles_all" on profiles;

-- profiles: cada quien ve su propio perfil; administracion/supervisor ven
-- y gestionan todos (alta de personal, asignar villas a duenos).
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select using (id = auth.uid() or public.es_admin());
drop policy if exists "profiles_admin_insert" on profiles;
create policy "profiles_admin_insert" on profiles for insert with check (public.es_admin());
drop policy if exists "profiles_admin_update" on profiles;
create policy "profiles_admin_update" on profiles for update using (public.es_admin()) with check (public.es_admin());
drop policy if exists "profiles_admin_delete" on profiles;
create policy "profiles_admin_delete" on profiles for delete using (public.es_admin());

-- villas: visibles segun rol (dueno solo las suyas). Solo administracion
-- puede agregar/editar villas.
drop policy if exists "villas_select" on villas;
create policy "villas_select" on villas for select using (public.villa_visible(id));
drop policy if exists "villas_admin_write" on villas;
create policy "villas_admin_write" on villas for all using (public.es_admin()) with check (public.es_admin());

-- checklist: se ve segun la villa; solo lo edita quien no sea dueno
-- (limpieza, mantenimiento, administracion, supervisor).
drop policy if exists "checklist_select" on checklist_items;
create policy "checklist_select" on checklist_items for select using (public.villa_visible(villa_id));
drop policy if exists "checklist_editar" on checklist_items;
create policy "checklist_editar" on checklist_items for all
  using (public.mi_rol() != 'dueno' and public.villa_visible(villa_id))
  with check (public.mi_rol() != 'dueno' and public.villa_visible(villa_id));

-- insumos: se ven segun la villa; solo administracion/supervisor
-- gestionan el stock (compras).
drop policy if exists "insumos_select" on insumos;
create policy "insumos_select" on insumos for select using (public.villa_visible(villa_id));
drop policy if exists "insumos_admin_write" on insumos;
create policy "insumos_admin_write" on insumos for all
  using (public.es_admin())
  with check (public.es_admin());

-- mejoras: se ven segun la villa. Cualquier rol autenticado puede crear un
-- caso para una villa que pueda ver. Las reglas de quien puede marcar
-- resuelto o aprobar/rechazar se validan ademas con un trigger (mas abajo),
-- que es lo que da la garantia real de "solo el dueno aprueba".
drop policy if exists "mejoras_select" on mejoras;
create policy "mejoras_select" on mejoras for select using (public.villa_visible(villa_id));
drop policy if exists "mejoras_insert" on mejoras;
create policy "mejoras_insert" on mejoras for insert
  with check (public.mi_rol() is not null and public.villa_visible(villa_id) and creado_por = auth.uid());
drop policy if exists "mejoras_update" on mejoras;
create policy "mejoras_update" on mejoras for update
  using (
    creado_por = auth.uid()
    or public.es_admin()
    or (public.mi_rol() = 'dueno' and public.villa_visible(villa_id))
  )
  with check (
    creado_por = auth.uid()
    or public.es_admin()
    or (public.mi_rol() = 'dueno' and public.villa_visible(villa_id))
  );

-- incidencias: mismas reglas de visibilidad que mejoras; lo crea/edita
-- cualquiera que no sea dueno.
drop policy if exists "incidencias_select" on incidencias;
create policy "incidencias_select" on incidencias for select using (public.villa_visible(villa_id));
drop policy if exists "incidencias_editar" on incidencias;
create policy "incidencias_editar" on incidencias for all
  using (public.mi_rol() != 'dueno' and public.villa_visible(villa_id))
  with check (public.mi_rol() != 'dueno' and public.villa_visible(villa_id));

-- inventario: se ve segun la villa; solo administracion/supervisor/
-- mantenimiento agregan o actualizan items.
drop policy if exists "inventario_select" on inventario_items;
create policy "inventario_select" on inventario_items for select using (public.villa_visible(villa_id));
drop policy if exists "inventario_write" on inventario_items;
create policy "inventario_write" on inventario_items for all
  using (public.es_admin() or public.mi_rol() = 'mantenimiento')
  with check (public.es_admin() or public.mi_rol() = 'mantenimiento');

-- ============================================================
-- Trigger: aplica a nivel de base de datos las dos reglas clave del flujo
-- de mejoras, sin depender de que el frontend se porte bien:
--   1) Solo quien reporto el caso (o administracion/supervisor) puede
--      marcarlo como resuelto, y debe traer foto de "despues".
--   2) Solo el dueno de esa villa puede aprobar o rechazar.
-- ============================================================
create or replace function public.mejoras_validar_transicion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'esperando_aprobacion' and old.estado is distinct from 'esperando_aprobacion' then
    if not (old.creado_por = auth.uid() or public.es_admin()) then
      raise exception 'Solo quien reporto el caso o administracion puede marcarlo como resuelto.';
    end if;
    if new.foto_despues_url is null then
      raise exception 'Se requiere la foto de despues para marcar el caso como resuelto.';
    end if;
  end if;

  if new.estado in ('aprobada', 'rechazada') and old.estado is distinct from new.estado then
    if not (public.mi_rol() = 'dueno' and old.villa_id = any(public.mis_villas())) then
      raise exception 'Solo el dueno de la villa puede aprobar o rechazar esta tarea.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_mejoras_validar_transicion on mejoras;
create trigger trg_mejoras_validar_transicion
  before update on mejoras
  for each row execute function public.mejoras_validar_transicion();
