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

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Corre `supabase/schema.sql` en el SQL Editor del proyecto.
3. Copia `.env.example` a `.env` y llena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
4. Reemplaza las llamadas a `mockData.ts` por consultas a `supabase` (`src/lib/supabaseClient.ts`) según se vayan conectando las pantallas.

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

- Conectar Auth de Supabase con los 5 roles (`profiles.rol`) y las políticas de Row Level Security ya definidas en `schema.sql`.
- Conectar `NuevaTarea.tsx`, `Checklist.tsx` e `Insumos.tsx` a Supabase en vez de los arrays de `mockData.ts`.
- Subida real de fotos a Supabase Storage.
- Integración con Guesty (webhooks `reservation.new`/`reservation.updated` o `task.*`) para generar el checklist de limpieza automáticamente al detectar un checkout.
