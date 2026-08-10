-- Esquema inicial Mazul App
-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor)

create table if not exists villas (
  id text primary key,
  nombre text not null
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
create table if not exists mejoras (
  id uuid primary key default gen_random_uuid(),
  villa_id text references villas(id) not null,
  zona text not null,
  descripcion text not null,
  foto_url text,
  afecta_seguridad_operacion boolean not null,
  afecta_amenidad boolean not null,
  urgencia text not null check (urgencia in ('critico', 'operacional', 'estetica')),
  resolucion text not null check (resolucion in ('equipo', 'materiales', 'contratar')),
  material_necesario text,
  especialista_necesario text,
  costo_estimado numeric,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_proceso', 'resuelta')),
  creado_por uuid references auth.users(id),
  creado_en timestamptz not null default now()
);

create table if not exists incidencias (
  id uuid primary key default gen_random_uuid(),
  villa_id text references villas(id) not null,
  categoria text not null,
  descripcion text not null,
  foto_url text,
  estado text not null default 'abierta' check (estado in ('abierta', 'en_proceso', 'resuelta')),
  creado_en timestamptz not null default now()
);

-- Perfiles con rol, para las 5 audiencias definidas: supervisor, mantenimiento,
-- administracion, housekeeping, dueno.
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
alter table profiles enable row level security;

-- ============================================================
-- Politicas TEMPORALES para poder probar la app de inmediato:
-- cualquier persona con la anon key puede leer y escribir todo.
-- Esto es intencional mientras se conecta Auth con los 5 roles.
-- Antes de dar acceso real a duenos o al equipo, borrar estas
-- politicas "dev_*" y activar las de mas abajo (o equivalentes).
-- ============================================================
create policy "dev_villas_all" on villas for all using (true) with check (true);
create policy "dev_checklist_all" on checklist_items for all using (true) with check (true);
create policy "dev_insumos_all" on insumos for all using (true) with check (true);
create policy "dev_mejoras_all" on mejoras for all using (true) with check (true);
create policy "dev_incidencias_all" on incidencias for all using (true) with check (true);
create policy "dev_profiles_all" on profiles for all using (true) with check (true);

-- Politica de ejemplo para cuando se conecte Auth: un dueno solo ve sus
-- villas asignadas; el resto de los roles ve todo. Activar (y borrar las
-- "dev_*" de arriba) una vez que profiles.rol este poblado via Auth.
-- create policy "duenos ven solo sus villas" on mejoras
--   for select using (
--     exists (
--       select 1 from profiles p
--       where p.id = auth.uid()
--         and (p.rol != 'dueno' or villa_id = any(p.villas_asignadas))
--     )
--   );
