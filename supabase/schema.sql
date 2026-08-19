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

-- Almacen general: catalogo central de insumos con su stock disponible. Se
-- compra aqui (administracion) y de aqui se reparte a cada villa (ver
-- funcion repartir_insumo mas abajo, que mueve stock de esta tabla a
-- `insumos` de forma atomica).
create table if not exists insumos_catalogo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  unidad text,
  categoria text,
  stock_actual int not null default 0,
  stock_minimo int not null default 0,
  actualizado_en timestamptz not null default now()
);

-- Por si la tabla ya existia de una version anterior sin categorias
-- (create table if not exists no la agrega a tablas ya creadas).
alter table insumos_catalogo add column if not exists categoria text;

-- Bitacora de cada reparto del almacen general a una villa.
create table if not exists repartos_insumos (
  id uuid primary key default gen_random_uuid(),
  villa_id text references villas(id) not null,
  insumo_id uuid references insumos_catalogo(id) not null,
  cantidad int not null check (cantidad > 0),
  creado_por uuid references auth.users(id) default auth.uid(),
  creado_en timestamptz not null default now()
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
  tipo_mantenimiento text not null default 'correctivo' check (tipo_mantenimiento in ('preventivo', 'correctivo')),
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

-- Por si la tabla 'mejoras' ya existia de una version anterior del schema
-- (de antes del flujo antes/despues + aprobacion): "create table if not
-- exists" de arriba NO le agrega columnas nuevas a una tabla que ya existe,
-- asi que sin esto la tabla se queda sin foto_antes_url y companeras,
-- rompiendo el guardado de tareas con el error "could not find column X
-- in the schema cache". Este bloque repara esa tabla vieja sin duplicar
-- nada si la tabla ya esta al dia (create table if not exists ya la creo
-- completa en una instalacion nueva).
alter table mejoras add column if not exists foto_antes_url text;
update mejoras set foto_antes_url = coalesce(foto_antes_url, '');
alter table mejoras alter column foto_antes_url set not null;

alter table mejoras add column if not exists foto_despues_url text;

alter table mejoras add column if not exists afecta_seguridad_operacion boolean;
update mejoras set afecta_seguridad_operacion = coalesce(afecta_seguridad_operacion, false);
alter table mejoras alter column afecta_seguridad_operacion set not null;
alter table mejoras alter column afecta_seguridad_operacion set default false;

alter table mejoras add column if not exists afecta_amenidad boolean;
update mejoras set afecta_amenidad = coalesce(afecta_amenidad, false);
alter table mejoras alter column afecta_amenidad set not null;
alter table mejoras alter column afecta_amenidad set default false;

alter table mejoras add column if not exists resolucion text;
update mejoras set resolucion = coalesce(resolucion, 'equipo');
alter table mejoras alter column resolucion set not null;
alter table mejoras alter column resolucion set default 'equipo';

alter table mejoras add column if not exists material_necesario text;
alter table mejoras add column if not exists especialista_necesario text;
alter table mejoras add column if not exists costo_estimado numeric;
alter table mejoras add column if not exists resuelto_en timestamptz;
alter table mejoras add column if not exists aprobado_en timestamptz;
alter table mejoras add column if not exists creado_por uuid references auth.users(id);

-- Si la tarea nace de un item de inventario en mal estado (boton
-- "Reportar como mejora"), queda esta referencia para ver el origen.
alter table mejoras add column if not exists inventario_item_id uuid references inventario_items(id);

-- Preventivo (fondos de Mazul) vs correctivo (lo paga el dueno). 'correctivo'
-- como default porque es el caso mas comun de lo ya reportado hasta ahora.
alter table mejoras add column if not exists tipo_mantenimiento text;
update mejoras set tipo_mantenimiento = coalesce(tipo_mantenimiento, 'correctivo');
alter table mejoras alter column tipo_mantenimiento set not null;
alter table mejoras alter column tipo_mantenimiento set default 'correctivo';
alter table mejoras drop constraint if exists mejoras_tipo_mantenimiento_check;
alter table mejoras add constraint mejoras_tipo_mantenimiento_check
  check (tipo_mantenimiento in ('preventivo', 'correctivo'));

-- Cotizacion: cuando hay que comprar material o contratar a alguien,
-- mantenimiento sube foto/proveedor/precio, administracion la aprueba, y
-- el dueno (quien paga) o administracion la marcan como pagada. Solo
-- entonces se puede marcar la tarea como resuelta (ver trigger mas abajo).
alter table mejoras add column if not exists foto_cotizacion_url text;
alter table mejoras add column if not exists proveedor_o_link text;
alter table mejoras add column if not exists cotizacion_aprobada boolean;
update mejoras set cotizacion_aprobada = coalesce(cotizacion_aprobada, false);
alter table mejoras alter column cotizacion_aprobada set not null;
alter table mejoras alter column cotizacion_aprobada set default false;
alter table mejoras add column if not exists cotizacion_aprobada_en timestamptz;
alter table mejoras add column if not exists cotizacion_pagada boolean;
update mejoras set cotizacion_pagada = coalesce(cotizacion_pagada, false);
alter table mejoras alter column cotizacion_pagada set not null;
alter table mejoras alter column cotizacion_pagada set default false;
alter table mejoras add column if not exists cotizacion_pagada_en timestamptz;

-- Por si la tabla ya existia de una version anterior sin este default
-- (create table if not exists no lo agrega a tablas ya creadas).
alter table mejoras alter column creado_por set default auth.uid();

-- Nombramos las constraints explicitamente para poder actualizarlas sin
-- duplicar ni tronar si ya existian (mismo nombre que Postgres genera
-- automaticamente al crear la tabla desde cero, asi que es un no-op ahi).
alter table mejoras drop constraint if exists mejoras_resolucion_check;
alter table mejoras add constraint mejoras_resolucion_check
  check (resolucion in ('equipo', 'materiales', 'contratar'));

alter table mejoras drop constraint if exists mejoras_estado_check;
alter table mejoras add constraint mejoras_estado_check
  check (estado in ('pendiente', 'en_proceso', 'esperando_aprobacion', 'aprobada', 'rechazada'));

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
  -- Ej: "Muebles", "Electrodomésticos", "Cristalería y vajilla"... ver
  -- src/data/categoriasInventario.ts. Opcional para no romper items ya
  -- capturados antes de tener categorías.
  categoria text,
  cantidad int not null default 1,
  condicion text not null check (condicion in ('bueno', 'regular', 'danado')),
  foto_url text,
  creado_en timestamptz not null default now()
);
-- Backstop por si la tabla ya existia de una version anterior sin esta
-- columna (create table if not exists no la habria agregado).
alter table inventario_items add column if not exists categoria text;
-- Que esta mal, cuando condicion no es "bueno" (ej. "pata rota", "ya no
-- enciende"). Sin esto, "Danado" no decia que habia pasado realmente.
alter table inventario_items add column if not exists descripcion_condicion text;

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
alter table insumos_catalogo enable row level security;
alter table repartos_insumos enable row level security;
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

-- almacen general: no es informacion por villa (el dueno no lo ve, es
-- operativo interno). El resto de roles lo consulta; solo administracion
-- lo edita directamente (altas de catalogo, registrar compra). El reparto
-- a una villa se hace con la funcion repartir_insumo (mas abajo), que
-- puede ajustar el stock aunque quien la llame no sea administracion.
drop policy if exists "almacen_select" on insumos_catalogo;
create policy "almacen_select" on insumos_catalogo for select
  using (public.mi_rol() is not null and public.mi_rol() != 'dueno');
drop policy if exists "almacen_admin_write" on insumos_catalogo;
create policy "almacen_admin_write" on insumos_catalogo for all
  using (public.es_admin())
  with check (public.es_admin());

drop policy if exists "repartos_select" on repartos_insumos;
create policy "repartos_select" on repartos_insumos for select
  using (public.mi_rol() is not null and public.mi_rol() != 'dueno');

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
    or public.mi_rol() = 'mantenimiento'
    or (public.mi_rol() = 'dueno' and public.villa_visible(villa_id))
  )
  with check (
    creado_por = auth.uid()
    or public.es_admin()
    or public.mi_rol() = 'mantenimiento'
    or (public.mi_rol() = 'dueno' and public.villa_visible(villa_id))
  );
drop policy if exists "mejoras_delete" on mejoras;
create policy "mejoras_delete" on mejoras for delete using (public.es_admin());

-- incidencias: mismas reglas de visibilidad que mejoras; lo crea/edita
-- cualquiera que no sea dueno.
drop policy if exists "incidencias_select" on incidencias;
create policy "incidencias_select" on incidencias for select using (public.villa_visible(villa_id));
drop policy if exists "incidencias_editar" on incidencias;
create policy "incidencias_editar" on incidencias for all
  using (public.mi_rol() != 'dueno' and public.villa_visible(villa_id))
  with check (public.mi_rol() != 'dueno' and public.villa_visible(villa_id));

-- inventario: se ve segun la villa; administracion/supervisor/mantenimiento
-- agregan items nuevos, pero solo administracion/supervisor puede corregir
-- (editar) un item ya registrado, por si mantenimiento se equivoco al
-- capturarlo (ver puedeEditarInventario en permissions.ts).
drop policy if exists "inventario_select" on inventario_items;
create policy "inventario_select" on inventario_items for select using (public.villa_visible(villa_id));
drop policy if exists "inventario_write" on inventario_items;
drop policy if exists "inventario_insert" on inventario_items;
create policy "inventario_insert" on inventario_items for insert
  with check (public.es_admin() or public.mi_rol() = 'mantenimiento');
drop policy if exists "inventario_update" on inventario_items;
create policy "inventario_update" on inventario_items for update
  using (public.es_admin())
  with check (public.es_admin());
-- Borrar (quitar del inventario por completo, ya sea por error de captura o
-- porque el item se rompio/desecho) es exclusivo de administracion/
-- supervisor, igual que corregirlo (ver puedeBorrarInventario en
-- permissions.ts).
drop policy if exists "inventario_delete" on inventario_items;
create policy "inventario_delete" on inventario_items for delete using (public.es_admin());

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
    if old.resolucion in ('materiales', 'contratar') and not (old.cotizacion_aprobada and old.cotizacion_pagada) then
      raise exception 'Falta aprobar y pagar la cotizacion antes de marcar esta tarea como resuelta.';
    end if;
  end if;

  if new.estado in ('aprobada', 'rechazada') and old.estado is distinct from new.estado then
    if not (public.mi_rol() = 'dueno' and old.villa_id = any(public.mis_villas())) then
      raise exception 'Solo el dueno de la villa puede aprobar o rechazar esta tarea.';
    end if;
  end if;

  -- Preventivo vs correctivo (quien paga) solo lo decide administracion;
  -- mantenimiento y el resto de roles solo reportan, no clasifican esto.
  if new.tipo_mantenimiento is distinct from old.tipo_mantenimiento then
    if not public.es_admin() then
      raise exception 'Solo administracion puede cambiar si es preventivo o correctivo.';
    end if;
  end if;

  -- Cotizacion: solo administracion la aprueba.
  if new.cotizacion_aprobada and not old.cotizacion_aprobada then
    if not public.es_admin() then
      raise exception 'Solo administracion puede aprobar la cotizacion.';
    end if;
  end if;

  -- Cotizacion: si es correctivo, el dueno de la villa (quien paga) o
  -- administracion marcan que ya se pago. Si es preventivo, se paga con
  -- fondos de Mazul, asi que solo administracion lo confirma.
  if new.cotizacion_pagada and not old.cotizacion_pagada then
    if not (
      public.es_admin()
      or (old.tipo_mantenimiento = 'correctivo' and public.mi_rol() = 'dueno' and old.villa_id = any(public.mis_villas()))
    ) then
      raise exception 'Solo el dueno de la villa (si es correctivo) o administracion pueden marcar la cotizacion como pagada.';
    end if;
    if not old.cotizacion_aprobada then
      raise exception 'La cotizacion debe estar aprobada antes de marcarla como pagada.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_mejoras_validar_transicion on mejoras;
create trigger trg_mejoras_validar_transicion
  before update on mejoras
  for each row execute function public.mejoras_validar_transicion();

-- ============================================================
-- Almacen general: compra y reparto.
-- Ambas funciones son SECURITY DEFINER para poder ajustar el stock del
-- almacen aunque quien las llame no tenga permiso de escritura directa
-- sobre insumos_catalogo (por ejemplo, limpieza puede repartir aunque no
-- pueda editar el catalogo directamente). Cada una valida el rol por su
-- cuenta antes de mover cualquier stock.
-- ============================================================

-- Solo administracion/supervisor pueden registrar una compra (aumenta el
-- stock del almacen general).
create or replace function public.registrar_compra_insumo(p_insumo_id uuid, p_cantidad int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a cero.';
  end if;
  if not public.es_admin() then
    raise exception 'Solo administracion puede registrar compras.';
  end if;

  update insumos_catalogo
    set stock_actual = stock_actual + p_cantidad, actualizado_en = now()
    where id = p_insumo_id;

  if not found then
    raise exception 'Insumo no encontrado en el almacen.';
  end if;
end;
$$;

grant execute on function public.registrar_compra_insumo(uuid, int) to authenticated;

-- Cualquier rol que no sea dueno puede repartir: resta del almacen general
-- y suma al stock de la villa destino (creando su fila de insumo si
-- todavia no la tenia), en una sola transaccion.
create or replace function public.repartir_insumo(p_villa_id text, p_insumo_id uuid, p_cantidad int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_stock_almacen int;
begin
  if p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a cero.';
  end if;

  if public.mi_rol() is null or public.mi_rol() = 'dueno' then
    raise exception 'No tienes permiso para repartir insumos.';
  end if;

  if not public.villa_visible(p_villa_id) then
    raise exception 'No tienes acceso a esa villa.';
  end if;

  select nombre, stock_actual into v_nombre, v_stock_almacen
    from insumos_catalogo where id = p_insumo_id
    for update;

  if v_nombre is null then
    raise exception 'Insumo no encontrado en el almacen.';
  end if;

  if v_stock_almacen < p_cantidad then
    raise exception 'No hay suficiente stock en el almacen general (disponible: %).', v_stock_almacen;
  end if;

  update insumos_catalogo
    set stock_actual = stock_actual - p_cantidad, actualizado_en = now()
    where id = p_insumo_id;

  insert into repartos_insumos (villa_id, insumo_id, cantidad, creado_por)
    values (p_villa_id, p_insumo_id, p_cantidad, auth.uid());

  update insumos
    set stock_actual = stock_actual + p_cantidad, actualizado_en = now()
    where villa_id = p_villa_id and nombre = v_nombre;

  if not found then
    insert into insumos (villa_id, nombre, stock_actual, stock_objetivo)
      values (p_villa_id, v_nombre, p_cantidad, p_cantidad);
  end if;
end;
$$;

grant execute on function public.repartir_insumo(text, uuid, int) to authenticated;

-- ============================================================
-- Storage: bucket para las fotos de evidencia (checklist, mejoras antes/
-- despues, incidencias, inventario). Publico para que la foto se pueda ver
-- directo con su URL guardada en la tabla, sin necesitar sesion.
-- src/lib/storage.ts sube los archivos aqui.
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('evidencias', 'evidencias', true)
  on conflict (id) do update set public = true;

drop policy if exists "evidencias_insert" on storage.objects;
create policy "evidencias_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidencias');

drop policy if exists "evidencias_select" on storage.objects;
create policy "evidencias_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'evidencias');
