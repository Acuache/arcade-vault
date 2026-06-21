# SPEC 04 — Clientes de Supabase (browser y server)

> **Status:** Aprobado · **Depends on:** Ninguno · **Date:** 2026-06-14
> **Objective:** Instalar `@supabase/supabase-js` y `@supabase/ssr`, y crear los clientes de Supabase para navegador (`lib/supabase/client.ts`) y servidor (`lib/supabase/server.ts`) usando las variables de entorno ya configuradas, sin agregar todavía lógica de autenticación, proxy de sesión ni tablas.

## Scope

**In:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr` como dependencias (`package.json` / `package-lock.json`).
- `lib/supabase/client.ts`: exporta `createClient()`, un cliente de Supabase para navegador (`createBrowserClient` de `@supabase/ssr`).
- `lib/supabase/server.ts`: exporta una función `createClient()` async, un cliente de Supabase para Server Components/Route Handlers/Server Actions (`createServerClient` de `@supabase/ssr`), usando `cookies()` de `next/headers`.

**Out of scope (para futuras specs):**

- `proxy.ts` (refresco de sesión en cada request) — se agrega junto con el spec de Auth, cuando exista una sesión que refrescar.
- Cualquier lógica de autenticación (`lib/session.tsx`, `components/Auth.tsx`, signup/login/logout reales).
- Tablas, migraciones, RLS o tipos generados (`mcp__supabase__generate_typescript_types`) — el esquema `public` sigue vacío.
- Persistencia de puntuaciones/leaderboard o catálogo de juegos en BD.
- Uso real de estos clientes en algún componente o página — quedan listos para que specs futuros los importen.
- Tests automatizados.

## Data model

Esta spec no introduce estructuras de datos nuevas en la base de datos (el esquema `public` sigue vacío). Define dos módulos que exponen un factory `createClient()`:

```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignorado si se llama desde un Server Component (no puede escribir cookies)
          }
        },
      },
    }
  )
}
```

Variables de entorno usadas (ya configuradas en `.env`, gitignored):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Implementation plan

1. **Instalar dependencias.** Ejecutar `npm install @supabase/supabase-js @supabase/ssr`. Prueba manual: `npm run dev` sigue arrancando sin errores; `package.json` y `package-lock.json` quedan actualizados con ambas dependencias.

2. **Crear los clientes.** Crear `lib/supabase/client.ts` (cliente de navegador con `createBrowserClient`) y `lib/supabase/server.ts` (cliente de servidor async con `createServerClient` + `cookies()`), según el modelo de datos definido arriba. Prueba manual: `npm run lint` pasa sin errores ni warnings nuevos; `npm run dev` sigue sirviendo todas las rutas sin errores (ningún componente importa estos archivos todavía, así que no hay cambios visuales).

## Acceptance criteria

- [ ] `npm run dev` arranca sin errores y `npm run lint` pasa sin errores ni warnings nuevos.
- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen como dependencias en `package.json` (y `package-lock.json` actualizado).
- [ ] `lib/supabase/client.ts` existe y exporta `createClient()`, que devuelve un `SupabaseClient` creado con `createBrowserClient`.
- [ ] `lib/supabase/server.ts` existe y exporta una función `createClient()` async que devuelve un `SupabaseClient` creado con `createServerClient`, usando `cookies()` de `next/headers`.
- [ ] Ningún componente o página existente importa estos archivos todavía; la app se ve y funciona exactamente igual que antes.

## Decisions

- **Sí:** instalar tanto `@supabase/supabase-js` como `@supabase/ssr`. Es el setup estándar recomendado por Supabase para Next.js y da tipado completo (`SupabaseClient`, etc.).
- **No:** instalar solo `@supabase/ssr`. Sin `@supabase/supabase-js` se pierde parte del tipado y es una desviación del setup estándar sin beneficio real.
- **Sí:** ubicar los clientes en `lib/supabase/client.ts` y `lib/supabase/server.ts`, siguiendo la convención `lib/` ya usada en el repo (`lib/data.ts`, `lib/session.tsx`, `lib/useReveal.ts`).
- **No:** incluir `proxy.ts` (refresco de sesión) en este spec. Sin autenticación implementada aún, no hay sesión que refrescar; se agrega junto con el spec de Auth.
- **No:** tocar `lib/session.tsx`, `components/Auth.tsx`, crear tablas/RLS, o usar estos clientes en algún componente. Son cambios de un spec de Auth futuro que dependerá de este.
- **Sí:** usar las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, ya configuradas en `.env` (gitignored).
- **Sí:** reducir el alcance a "solo los clientes de Supabase", descartando una primera propuesta de spec más amplia ("Autenticación real con Supabase") por ser demasiado grande para un solo spec.

## What is **not** in this spec

- `proxy.ts` (refresco de sesión en cada request).
- Lógica de autenticación (`lib/session.tsx`, `components/Auth.tsx`).
- Tablas, migraciones, RLS o tipos generados.
- Persistencia de puntuaciones/leaderboard o catálogo de juegos en BD.
- Uso real de estos clientes en componentes/páginas existentes.
- Tests automatizados.

Cada uno de estos, si llega a implementarse, va en su propio spec.
