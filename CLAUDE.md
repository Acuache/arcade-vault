# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

@AGENTS.md

## Visión general del proyecto

**Arcade Vault** es un sitio Next.js (App Router) para jugar juegos arcade retro en línea y competir en marcadores compartidos ("Salón de la Fama"). El producto está desarrollado: tiene una página de inicio real, biblioteca de juegos, detalle de juego + marcador por juego, un reproductor de juegos funcional con tres juegos jugables, un Salón de la Fama, una página "Acerca de" y autenticación por email/invitado respaldada por Supabase.

La interfaz está en español y sigue el sistema de diseño retro/neón de `references/templates/` (ver más abajo).

## Comandos

```bash
npm run dev     # inicia el servidor de desarrollo (next dev)
npm run build   # compilación de producción (next build)
npm run start   # ejecuta la compilación de producción (next start)
npm run lint    # eslint
```

No hay un ejecutor de pruebas configurado. El código se formatea con Prettier (sin punto y coma, comillas simples — ver archivos existentes).

## Stack

- Next.js 16.2.9 (App Router), React 19.2, TypeScript (strict)
- **Supabase** para datos + autenticación: `@supabase/ssr` + `@supabase/supabase-js`. Los clientes de servidor y de navegador viven en `lib/supabase/`.
- Tailwind CSS v4 vía `@tailwindcss/postcss`, pero el estilo real es el sistema de diseño retro hecho a mano en `app/globals.css` (portado desde `references/templates/styles.css`) — variables CSS + nombres de clase, no clases utilitarias.
- Fuentes de Google cargadas vía `next/font`: `Press Start 2P` (pixel), `JetBrains Mono`, `Courier Prime` — conectadas como variables CSS en `app/layout.tsx`.
- Configuración flat de ESLint 9 (`eslint.config.mjs`) que extiende `eslint-config-next` core-web-vitals + typescript
- Alias de ruta `@/*` → raíz del repo (ver `tsconfig.json`)

⚠️ Next.js 16 difiere de la versión en tus datos de entrenamiento. Antes de usar cualquier API del App Router (convenciones de enrutamiento, obtención de datos, opciones de configuración, etc.), consulta `node_modules/next/dist/docs/01-app/` para conocer el comportamiento actual — ver `AGENTS.md`. Nota el helper tipado `PageProps<'/route'>` y `await props.params` ya usados en los archivos de rutas.

## Entorno

`.env` proporciona (ignorado por git, ya presente localmente):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Ambos clientes de Supabase los leen. No hay clave service-role en la aplicación.

## Arquitectura

**Rutas (`app/`)** — nota que estos son los segmentos reales; NO coinciden uno a uno con los nombres hash del prototipo:

| Ruta               | Archivo de página              | Renderiza                             |
| ------------------ | ------------------------------ | ------------------------------------- |
| `/`                | `app/page.tsx`                 | `Home` (landing + juegos destacados)  |
| `/game`            | `app/game/page.tsx`            | `Library` (catálogo, búsqueda/filtro) |
| `/game/[id]`       | `app/game/[id]/page.tsx`       | `GameDetail` (info + marcador)        |
| `/game/[id]/jugar` | `app/game/[id]/jugar/page.tsx` | `GamePlayer` (el reproductor + HUD)   |
| `/salon`           | `app/salon/page.tsx`           | `HallOfFame`                          |
| `/auth`            | `app/auth/page.tsx`            | `Auth` (login/registro/invitado)      |
| `/about`           | `app/about/page.tsx`           | `About`                               |

**Flujo de datos** — las páginas de ruta son **Server Components asíncronos** que obtienen datos de Supabase vía los helpers en `lib/games.ts` (`getGames`, `getGame`, `getScores`) y pasan datos planos a los **Client Components** en `components/`. Mantén la obtención de datos en la página Server Component; mantén la interactividad (`'use client'`) en `components/`.

**Módulos clave:**

- `lib/types.ts` — tipos de dominio compartidos: `Game`, `GameCategory`, `GameColor`, `ScoreRow`. (Ya no existe `lib/data.ts` — fue eliminado; todos los datos están en Supabase.)
- `lib/games.ts` — lecturas de Supabase del lado del servidor para juegos y puntuaciones. `getScores` calcula `rank` del lado del cliente vía `.map((r, i) => ({ ...r, rank: i + 1 }))`.
- `lib/supabase/server.ts` — `createClient()` para Server Components (basado en cookies, `@supabase/ssr`).
- `lib/supabase/client.ts` — cliente de navegador `createClient()` para Client Components.
- `lib/useAuth.ts` — hook `'use client'` que expone `user` (usuario de auth de Supabase o `null`), `alias` (nombre de invitado desde `localStorage('av_alias')`), `loading`, `signUp`, `signIn`, `signOut`, `setAlias`.
- `lib/useReveal.ts` — hook de IntersectionObserver que agrega `.in` a los elementos `.reveal` al hacer scroll.

**Modelo de autenticación** — email/contraseña vía Supabase Auth, más un **modo invitado**: el alias de visualización del invitado se almacena en `localStorage` bajo `av_alias`. En toda la app el nombre de visualización del jugador es `user?.email ?? alias`. No hay middleware de refresco de sesión (`proxy.ts`); la sesión se lee al montar.

**Puntuaciones** — se guardan desde `GamePlayer` insertando en la tabla `scores`: `{ game_id, user_id: user?.id ?? null, alias, score }`. Si no hay alias (ni con sesión iniciada ni invitado), el jugador es redirigido a `/auth`. RLS está abierto: lectura pública en `games`/`scores`, inserción abierta en `scores`.

## Esquema de Supabase

Dos tablas (creadas en SPEC 06, ver `specs/06-auth-schema-salon.md` para el DDL completo):

- `games` — `id` (PK de texto), `title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`.
- `scores` — `id` (PK uuid), `game_id` (FK→games), `user_id` (uuid, nullable, FK→auth.users), `alias`, `score`, `created_at`.

> ⚠️ La BD viva no contiene el seed completo de 8 juegos de SPEC 06 — solo los juegos realmente jugables tienen filas. Verifica con `list_tables` / un `select` antes de asumir que un juego existe.

## Juegos

`GamePlayer` (`components/GamePlayer.tsx`) es el shell compartido del reproductor: HUD (puntuación/vidas/nivel), pausar/terminar/salir, modal de fin de juego y guardado de puntuación. Hace switch sobre el `id` del juego y monta el componente de juego correspondiente, recurriendo a una arena placeholder estática para juegos que aún no tienen lógica real.

Juegos jugables (cada uno un componente canvas `'use client'` que comparte la misma interfaz de props — `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`):

Puedes ver su contenido cuando lo necesites en (references\implemented-games.md)

Los originales en JS vanilla viven en `references/started-games/` (`02-asteroids/`, `03-tetris/`, `04-arkanoid/`) — son juegos HTML/JS independientes usados como material fuente al portar un juego a un componente React. `04-arkanoid` (`bloque-buster`) aún no está integrado.

**Detalle de refs en React:** sincroniza los refs mutables (p. ej. `pausedRef`) dentro de un `useEffect([dep])`, no durante el render — las reglas `react-hooks` del proyecto (v7) marcan la mutación de refs en el render.

## Flujo de trabajo dirigido por specs

Este repo sigue un proceso dirigido por specs. Los skills se rastrean en `skills-lock.json`:

- **`/spec <descripción>`** (`Klerith/fernando-skills`) — diseña interactivamente un nuevo spec de feature sección por sección, haciendo preguntas aclaratorias, y lo guarda en `specs/NN-slug.md` con estado `Draft`. Nunca escribe código.
- **`/spec-impl <NN-slug>`** (`Klerith/fernando-skills`) — solo procede si el estado del spec significa "Aprobado". Si tiene éxito crea/cambia a una rama `spec-NN-slug` e implementa el plan paso a paso, pausando para revisión después de cada paso.
- **`frontend-design`** (`anthropics/skills`) — orientación para un diseño visual distintivo al construir/remodelar la interfaz.

Los specs `01`–`08` están implementados (`specs/`): pantallas MVP, Home + páginas de juego, About, clientes de Supabase, Asteroids, auth/esquema/Salón, Tetris, Snake. Cada encabezado de spec lleva una línea `Status:`. Cuando se pida construir una feature, verifica si ya existe un spec para ella y en qué estado está antes de escribir código — `/spec-impl` se negará a ejecutarse contra un spec no aprobado.

## Referencia de diseño (`references/templates/`)

Esta carpeta es un **prototipo HTML/JSX independiente y ejecutable** (React 18 vanilla + Babel vía CDN, sin paso de compilación — abre `Arcade Vault.html` directamente) que define la interfaz prevista, el sistema de diseño y las formas de los datos. Es material de referencia, no parte de la compilación. La app real ya ha portado la mayor parte; al agregar/ajustar pantallas, porta la estructura/comportamiento de estos archivos en lugar de diseñar desde cero:

- **`styles.css`** — el sistema de diseño retro/neón (ahora vive en `app/globals.css`): variables CSS para colores (`--cyan`, `--magenta`, `--yellow`, `--green`, `--gold`, etc.), la fuente pixel (`Press Start 2P`) y la fuente mono (`JetBrains Mono`), fondo animado de grilla/scanline.
- **`data.jsx`** — datos de dominio simulados (`GAMES`, `CATS`, `PLAYERS`, `seededScores`). En la app real esto se reemplaza por Supabase + `lib/types.ts`; los generadores simulados ya no existen en la compilación.
- **`app.jsx`** — shell del prototipo con enrutamiento por hash y `localStorage`. La app real usa segmentos del App Router (tabla de arriba) y autenticación de Supabase en lugar de `av_user`.
- **`nav.jsx`** → `components/Nav.tsx` · **`biblioteca.jsx`** → `Library`/`GameCard` · **`detalle.jsx`** → `GameDetail` · **`reproductor.jsx`** → `GamePlayer` · **`salon.jsx`** → `HallOfFame` · **`auth.jsx`** → `Auth`.

Mapeo ruta-prototipo → ruta-real: `biblioteca` → `/game`, `detalle` → `/game/[id]`, `player` → `/game/[id]/jugar`, `salon` → `/salon`, `auth` → `/auth`, más `/` (Home) y `/about` que son adiciones más allá del prototipo.
