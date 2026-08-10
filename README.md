# Mazul App

App interna para estandarizar procesos, insumos y mantenimiento en las villas de Mazul (Puerto Escondido, Oaxaca).

## Stack

- **Frontend**: React + TypeScript + Vite, como PWA (instalable desde el navegador del teléfono, sin App Store).
- **Backend**: [Supabase](https://supabase.com) (Postgres + Auth + Storage para fotos de evidencia).
- **Hosting sugerido**: Vercel, con deploy automático al hacer push a `main`.

## Qué incluye este scaffold

- `src/pages/Dashboard.tsx` — estado del día por villa (lista / limpieza / incidencia).
- `src/pages/Checklist.tsx` — checklist de turnover por villa.
- `src/pages/Insumos.tsx` — stock de insumos por villa con alertas de reabasto.
- `src/pages/Mejoras.tsx` — lista de tareas de mejora de **todas** las villas, con filtro por villa.
- `src/pages/NuevaTarea.tsx` — formulario para reportar una mejora. La urgencia **no se elige a mano**: se calcula con dos preguntas tangibles (`src/lib/urgencia.ts`):
  1. ¿Impide usar la villa con seguridad o empeora si no se atiende hoy? → **Crítico** (SLA: mismo día)
  2. ¿Afecta una amenidad que el huésped espera (A/C, wifi, alberca, cocina)? → **Operacional** (SLA: antes del próximo check-in)
  3. Si ninguna aplica → **Estética** (SLA: próximo mantenimiento programado)
- `supabase/schema.sql` — tablas de villas, checklist, insumos, mejoras, incidencias y perfiles con rol (supervisor, mantenimiento, administración, housekeeping, dueño).
- Datos de ejemplo en `src/data/mockData.ts` (13 villas reales del portafolio) para poder correr la app sin backend configurado todavía.

## Correr en local

```bash
npm install
npm run dev
```

Sin variables de entorno configuradas, la app funciona con los datos de ejemplo (`mockData.ts`).

## Conectar Supabase

Las pantallas ya están conectadas a Supabase a través de `src/lib/data.ts` — mientras no haya credenciales configuradas, siguen usando `mockData.ts` automáticamente (ver `supabaseConfigured` en `src/lib/supabaseClient.ts`), así que la app nunca se rompe por falta de backend.

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Corre `supabase/schema.sql` en el SQL Editor del proyecto (crea las tablas y políticas RLS temporales de desarrollo).
3. Corre `supabase/seed.sql` para precargar las 13 villas reales (opcional, puedes empezar vacío).
4. Copia `.env.example` a `.env` y llena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
5. Reinicia `npm run dev` — a partir de aquí, todo lee y escribe en Supabase.

**Importante:** `schema.sql` crea políticas `dev_*` que permiten leer y escribir todo con la anon key, para poder probar de inmediato. Antes de dar acceso real a dueños o al equipo, hay que borrarlas y activar políticas por rol (hay un ejemplo comentado al final del archivo).

## Subir a GitHub

Este proyecto vive en `MazulTech/mazul-villas`, que hoy está vacío. Para subir este scaffold:

```bash
cd mazul-villas
git init
git remote add origin https://github.com/MazulTech/mazul-villas.git
git add .
git commit -m "Scaffold inicial: dashboard, checklist, insumos, mejoras"
git branch -M main
git push -u origin main
```

## Deploy

1. En [vercel.com](https://vercel.com), importa el repo `MazulTech/mazul-villas`.
2. Agrega las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Cada push a `main` despliega automáticamente. Luego se puede apuntar un dominio propio (ej. `app.mazul.mx`) desde Vercel → Settings → Domains.

## Pendientes conocidos

- Conectar Auth de Supabase con los 5 roles (`profiles.rol`) y reemplazar las políticas `dev_*` por las políticas por rol reales (ejemplo comentado en `schema.sql`).
- Subida real de fotos a Supabase Storage (hoy el campo `fotoUrl`/`foto_url` existe pero el formulario no sube el archivo).
- Botón "Marcar villa como lista" y "Solicitar reabasto" son visuales todavía; falta conectar sus acciones.
- Integración con Guesty (webhooks `reservation.new`/`reservation.updated` o `task.*`) para generar el checklist de limpieza automáticamente al detectar un checkout.
