# Mazul App

App interna para estandarizar procesos, insumos y mantenimiento en las 21 villas de Mazul (Puerto Escondido, Oaxaca).

## Stack

- **Frontend**: React + TypeScript + Vite, como PWA (instalable desde el navegador del teléfono, sin App Store).
- **Backend**: [Supabase](https://supabase.com) (Postgres + Auth + Storage para fotos de evidencia).
- **Hosting sugerido**: Vercel, con deploy automático al hacer push a `main`.

## Roles y permisos

La app tiene 4 audiencias (`profiles.rol` en `supabase/schema.sql`):

| Rol | Ve | Puede |
|---|---|---|
| `dueno` | Solo sus villas asignadas (`profiles.villas_asignadas`) | Consultar checklist/insumos/inventario de su villa (solo lectura), reportar casos, **aprobar o rechazar** el resultado de una mejora en su villa |
| `housekeeping` (limpieza) | Todas las villas | Marcar checklist, reportar casos de mejora, marcar como resuelto un caso que **ella misma reportó** |
| `mantenimiento` | Todas las villas | Marcar checklist, reportar casos, marcar como resuelto un caso que **él mismo reportó**, agregar/editar inventario |
| `administracion` (incluye supervisor/gerencia) | Todas las villas | Todo: checklist, insumos (compras/reabasto), inventario, mejoras — incluyendo marcar como resuelto cualquier caso (no solo los que reportó) |

Reglas clave del flujo de mejoras, aplicadas tanto en la app como con un trigger en la base de datos (`mejoras_validar_transicion` en `schema.sql`, así que no dependen de que nadie use la app "bien"):

1. Solo quien reportó el caso, o administración, puede marcarlo como resuelto (y debe subir la foto "después").
2. Solo el dueño de esa villa puede aprobar o rechazar el resultado.

## Qué incluye este scaffold

- `src/pages/Login.tsx` + `src/contexts/AuthContext.tsx` — login con Supabase Auth y perfil (rol + villas asignadas). Sin credenciales de Supabase configuradas, la app entra directo en modo demo (perfil de administración) para poder probar todo sin login.
- `src/pages/Dashboard.tsx` — estado del día por villa (lista / limpieza / incidencia), filtrado a las villas visibles del usuario.
- `src/pages/Checklist.tsx` — checklist de turnover por villa (solo lectura para dueños).
- `src/pages/Insumos.tsx` — stock de insumos por villa con alertas de reabasto (edición solo para administración).
- `src/pages/AlmacenGeneral.tsx` / `NuevoInsumoCatalogo.tsx` / `RepartirInsumo.tsx` — almacén general: se compra aquí (solo administración) y de aquí se reparte a cada villa (cualquier rol menos dueño), restando del almacén y sumando al stock de esa villa en una sola operación atómica (función `repartir_insumo` en `schema.sql`).
- `src/pages/Mejoras.tsx` / `MejoraDetalle.tsx` / `NuevaTarea.tsx` — reporte de mejoras con foto "antes" obligatoria, foto "después" al resolver, y aprobación del dueño. La urgencia **no se elige a mano**: se calcula con dos preguntas tangibles (`src/lib/urgencia.ts`):
  1. ¿Impide usar la villa con seguridad o empeora si no se atiende hoy? → **Crítico** (SLA: mismo día)
  2. ¿Afecta una amenidad que el huésped espera (A/C, wifi, alberca, cocina)? → **Operacional** (SLA: antes del próximo check-in)
  3. Si ninguna aplica → **Estética** (SLA: próximo mantenimiento programado)
- `src/pages/Inventario.tsx` / `NuevoItemInventario.tsx` — catálogo de mobiliario/equipo por villa con foto (edición para administración y mantenimiento).
- `src/lib/permissions.ts` — todas las reglas de "quién puede qué" en un solo lugar.
- `supabase/schema.sql` — tablas, políticas RLS por rol y el trigger que valida el flujo de aprobación.
- Datos de ejemplo en `src/data/mockData.ts` (21 villas reales del portafolio) para poder correr la app sin backend configurado todavía.

## Correr en local

```bash
npm install
npm run dev
```

Sin variables de entorno configuradas, la app funciona con los datos de ejemplo (`mockData.ts`) y sin pedir login.

## Conectar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (si no lo tienes ya).
2. Corre **todo** `supabase/schema.sql` en el SQL Editor del proyecto. Es idempotente: se puede volver a correr completo cada vez que este archivo cambie, sin duplicar nada ni borrar datos.
3. Corre `supabase/seed.sql` para precargar las 21 villas reales (si no lo has hecho ya).
4. Copia `.env.example` a `.env` y llena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
5. Reinicia `npm run dev`.

### Crear usuarios (staff y dueños)

Supabase Auth no se llena solo — cada persona necesita una cuenta:

1. En el dashboard de Supabase: **Authentication → Users → Add user** (correo + contraseña temporal). Copia el UUID que le asigna.
2. En el SQL Editor, crea su fila de perfil:

```sql
insert into profiles (id, nombre, rol, villas_asignadas) values
  ('PEGA-AQUI-EL-UUID', 'Nombre de la persona', 'housekeeping', '{}');
```

- Para `mantenimiento` o `administracion`, usa esos valores en `rol` y deja `villas_asignadas` en `'{}'` (ven todas las villas).
- Para un `dueno`, usa `rol = 'dueno'` y pon sus villas en `villas_asignadas`, por ejemplo `'{"villa-2","villa-9"}'`.

Sin esta fila en `profiles`, la persona puede iniciar sesión pero la app le dirá que no tiene un perfil asignado.

## Subir a GitHub

```bash
cd mazul-villas
git add -A
git commit -m "Roles y permisos por perfil (dueño/limpieza/mantenimiento/admin)"
git push
```

## Deploy

1. En [vercel.com](https://vercel.com), importa el repo `MazulTech/mazul-villas` (si no está importado ya).
2. Agrega las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Cada push a `main` despliega automáticamente. Luego se puede apuntar un dominio propio (ej. `app.mazul.mx`) desde Vercel → Settings → Domains.

## Pendientes conocidos

- Botón "Marcar villa como lista" en el checklist es visual todavía; falta conectar la acción.
- "Solicitar reabasto" en Insumos es visual todavía; falta conectar la acción (probablemente a una notificación o tarea para administración).
- Integración con Guesty (webhooks `reservation.new`/`reservation.updated` o `task.*`) para generar el checklist de limpieza automáticamente al detectar un checkout.
- No hay pantalla para que administración cree usuarios/perfiles desde la app (por ahora se hace a mano en el dashboard de Supabase, ver arriba).
