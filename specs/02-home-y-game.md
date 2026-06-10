# SPEC 02 — Página de inicio (Home) y reubicación de la Biblioteca a /game

> **Status:** Implementado · **Depends on:** SPEC 01 · **Date:** 2026-06-10
> **Objective:** Portar `home.jsx` (referencia `references/templates/home-about/`) como la nueva página de inicio en `/`, y mover la Biblioteca (hoy en `/`) junto con sus subrutas a `/game`, `/game/[id]` y `/game/[id]/jugar`.

## Scope

**In:**

- Nueva página de inicio en `/` (`app/page.tsx`), que renderiza `components/Home.tsx` — port completo de `home.jsx`:
  - Hero con `FloatingSilhouettes` (SVGs decorativos), título, eyebrow, CTAs y flecha de scroll.
  - Sección "¿POR QUÉ ARCADE VAULT?" (feature grid + `FeatureIcon`).
  - Sección "JUEGOS DISPONIBLES AHORA" (`MiniCard` + `GAMES.slice(0, 6)` desde `lib/data.ts`).
  - Sección de stats ("12+ JUEGOS", "MILES DE PARTIDAS", "GLOBAL RANKING").
  - Sección "ACTIVIDAD EN VIVO" (ticker de puntuaciones recientes + top jugadores), con los datos hardcodeados del prototipo.
  - Sección de precios + FAQ.
  - CTA final.
  - `Home` es Client Component (`"use client"`) con el hook `useReveal` (IntersectionObserver) para las animaciones `.reveal`.
- Port del bloque "HOME PAGE" de `references/templates/home-about/styles.css` a `app/globals.css`.
- Reubicación de la Biblioteca y sus subrutas:
  - `app/page.tsx` (hoy `<Library />`) pasa a `app/game/page.tsx`.
  - `app/biblioteca/[id]/page.tsx` → `app/game/[id]/page.tsx` (actualizando `PageProps<"/game/[id]">`).
  - `app/biblioteca/[id]/jugar/page.tsx` → `app/game/[id]/jugar/page.tsx` (actualizando `PageProps<"/game/[id]/jugar">`).
  - Eliminación del directorio `app/biblioteca/`.
- Actualización de enlaces internos a las nuevas rutas `/game/...`:
  - `components/Library.tsx` (tarjetas → `/game/[id]`).
  - `components/GameDetail.tsx` (botón "Jugar ahora" → `/game/[id]/jugar`).
  - `components/GamePlayer.tsx` (botón volver → `/game/[id]`).
- Actualización de `components/Nav.tsx`:
  - Nuevo link "Inicio" (`/`), primero en el orden.
  - "Biblioteca" apunta a `/game`.
  - `isActive` actualizado para `home`, `biblioteca` (prefijo `/game`), `salon`, `login`.
  - Mismo cambio reflejado en el menú móvil.
- Todos los CTAs/links del Home apuntan a rutas reales: "EXPLORAR JUEGOS" / "VER TODOS LOS JUEGOS →" / "INSERTAR MONEDA →" → `/game`; "CREAR CUENTA" / "EMPEZAR GRATIS →" → `/login`; "VER SALÓN →" → `/salon`; mini-cards → `/game/[id]`.

**Out of scope (for future specs):**

- `about.jsx` y la página `/about` — siguiente spec.
- Link "Acerca de" en el Nav — se agrega junto con `/about`.
- Bloque "ABOUT PAGE" del CSS de `home-about/styles.css`.
- Bloque "GAMEPAD" del CSS (~580 líneas, widget de gamepad virtual no referenciado por ningún `.jsx` de `home-about`) — parece pertenecer a otra feature no especificada aún.
- Datos dinámicos/reales para "ACTIVIDAD EN VIVO" (se mantienen hardcodeados, igual que el prototipo).
- Cambios a `/salon`, `/login`, `lib/data.ts` o `lib/session.tsx` más allá de los enlaces de Nav.
- Redirects desde las antiguas URLs `/biblioteca/*` hacia `/game/*`.
- Tests automatizados.

## Data model

Esta spec no introduce estructuras de datos nuevas ni compartidas.

- La sección "JUEGOS DISPONIBLES AHORA" reutiliza `GAMES` desde `lib/data.ts` (ya existente, `GAMES.slice(0, 6)`).
- Los datos de "ACTIVIDAD EN VIVO" (ticker de puntuaciones recientes y top jugadores de hoy) son arrays literales locales dentro de `components/Home.tsx`, portados tal cual desde `home.jsx` — no se exportan ni se tipan como modelo compartido, igual que en el prototipo.

## Implementation plan

1. **CSS base del Home.** Portar el bloque "HOME PAGE" de `references/templates/home-about/styles.css` a `app/globals.css` (clases `.home`, `.home-hero`, `.home-silos`, `.home-title`, `.home-section`, `.feature-grid`, `.feature-card`, `.mini-rail`, `.mini-card`, `.home-stats`, `.stats-inner`, `.home-final`, `.reveal`, etc.). Prueba manual: `npm run dev` sigue sirviendo `/` (Biblioteca actual) sin errores ni warnings de `npm run lint`.

2. **Reubicar Biblioteca a `/game`.** Mover `app/page.tsx` → `app/game/page.tsx`, `app/biblioteca/[id]/page.tsx` → `app/game/[id]/page.tsx` (actualizando `PageProps<"/game/[id]">`), `app/biblioteca/[id]/jugar/page.tsx` → `app/game/[id]/jugar/page.tsx` (actualizando `PageProps<"/game/[id]/jugar">`), y eliminar `app/biblioteca/`. Actualizar enlaces en `components/Library.tsx`, `components/GameDetail.tsx` y `components/GamePlayer.tsx` para apuntar a `/game/...`. Actualizar `components/Nav.tsx`: el link "Biblioteca" pasa a `/game` y `isActive` usa el prefijo `/game`. Prueba manual: `/game` muestra la Biblioteca con búsqueda/filtros funcionando, las tarjetas navegan a `/game/[id]`, "Jugar ahora" navega a `/game/[id]/jugar` y "Volver al vault" regresa a `/game`; `/` devuelve 404 (se resuelve en el paso 3).

3. **Página de inicio (`/`).** Crear `components/Home.tsx` (Client Component, `"use client"`) con el port completo de `home.jsx`: hook `useReveal` (IntersectionObserver), `FloatingSilhouettes`, hero con CTAs, sección "¿POR QUÉ ARCADE VAULT?" con `FeatureIcon`, sección "JUEGOS DISPONIBLES AHORA" con `MiniCard` y `GAMES.slice(0, 6)`, sección de stats, "ACTIVIDAD EN VIVO" (ticker + top jugadores hardcodeados), precios + FAQ, y CTA final. Crear `app/page.tsx` que renderiza `<Home />`. Todos los CTAs/enlaces apuntan a `/game`, `/game/[id]`, `/salon` o `/login` según corresponda. Agregar el link "Inicio" (`/`) al inicio del Nav (desktop y móvil) y su `isActive`. Prueba manual: `/` muestra el Home completo con animaciones de aparición al hacer scroll, todos los CTAs navegan a la ruta correcta, y el Nav resalta "Inicio" en `/` y "Biblioteca" en `/game/*`.

## Acceptance criteria

- [ ] `npm run dev` arranca sin errores y `npm run lint` pasa sin errores ni warnings nuevos.
- [ ] `/` muestra la nueva página de inicio (Home): hero con eyebrow, título, CTAs y silhouettes flotantes.
- [ ] Al hacer scroll en `/`, las secciones marcadas con `.reveal` aparecen con la animación de entrada.
- [ ] La sección "¿POR QUÉ ARCADE VAULT?" muestra las 4 tarjetas de features con sus iconos.
- [ ] La sección "JUEGOS DISPONIBLES AHORA" muestra 6 `MiniCard` desde `GAMES`, y hacer clic en una navega a `/game/[id]`.
- [ ] El botón "VER TODOS LOS JUEGOS →" navega a `/game`.
- [ ] La sección de stats muestra "12+ JUEGOS", "MILES DE PARTIDAS" y "GLOBAL RANKING".
- [ ] La sección "ACTIVIDAD EN VIVO" muestra el ticker de puntuaciones recientes y el top 5 de jugadores de hoy con los datos del prototipo.
- [ ] El botón "VER SALÓN →" navega a `/salon`.
- [ ] La sección de precios muestra el plan único, la lista de beneficios y el FAQ; "EMPEZAR GRATIS →" navega a `/login`.
- [ ] El CTA final "INSERTAR MONEDA →" navega a `/game`.
- [ ] Los botones "▶ EXPLORAR JUEGOS" y "✦ CREAR CUENTA" del hero navegan a `/game` y `/login` respectivamente.
- [ ] `/game` muestra la Biblioteca (hero, búsqueda, chips de categoría, grid de juegos) igual que antes en `/`.
- [ ] `/game/[id]` muestra el detalle del juego correspondiente, y "Jugar ahora" navega a `/game/[id]/jugar`.
- [ ] `/game/[id]/jugar` muestra el Reproductor, y "Volver al vault" navega a `/game`.
- [ ] `/biblioteca` y `/biblioteca/[id]` ya no existen (devuelven 404).
- [ ] El Nav muestra "Inicio", "Biblioteca", "Salón de la Fama" en ese orden, sin "Acerca de".
- [ ] El Nav resalta "Inicio" como activo en `/`, y "Biblioteca" como activo en `/game` y sus subrutas.
- [ ] El logo del Nav navega a `/`.
- [ ] El menú móvil (hamburguesa) refleja los mismos enlaces y estados activos que el Nav de escritorio.

## Decisions

- **Sí:** renombrar todo el segmento `/biblioteca` → `/game` (`/game`, `/game/[id]`, `/game/[id]/jugar`). Da consistencia: la Biblioteca vive en `/game` y sus tarjetas llevan a `/game/[id]`, sin mezclar prefijos `/game` y `/biblioteca`.
- **No:** mover solo la raíz (`/` → `/game`) dejando `/biblioteca/[id]` y `/biblioteca/[id]/jugar` intactos. Descartado por la inconsistencia de nombres que generaría.
- **No:** mantener redirects desde `/biblioteca/*` hacia `/game/*`. El proyecto está en desarrollo activo, sin usuarios con URLs guardadas; no aporta valor en esta etapa.
- **Sí:** agregar "Inicio" al Nav ahora (apunta a `/`), pero omitir "Acerca de" hasta que exista `/about` en el siguiente spec. Evita un link que daría 404.
- **Sí:** portar los datos de "ACTIVIDAD EN VIVO" (ticker + top jugadores) tal cual hardcodeados, igual que el prototipo. Consistente con la decisión de SPEC 01 de priorizar fidelidad visual sin introducir lógica nueva de generación de datos.
- **No:** derivar esos datos desde `lib/data.ts` / `seededScores`. Fuera del alcance visual de esta spec; queda como posible mejora futura.
- **Sí:** `Home` como Client Component (`"use client"`) con `useReveal` / `IntersectionObserver`, mismo patrón que `Library` / `GameDetail`. Mantiene fidelidad a las animaciones de aparición del prototipo.
- **Sí:** portar solo el bloque "HOME PAGE" del nuevo `styles.css` a `globals.css`. "ABOUT PAGE" se difiere al spec del about.
- **No:** portar el bloque "GAMEPAD" (~580 líneas) de `home-about/styles.css`. Ningún componente lo usa todavía y no está relacionado con Home; parece pertenecer a una feature aún no especificada.
- **Sí:** mantener `FloatingSilhouettes`, `MiniCard` y `FeatureIcon` como funciones no exportadas dentro de `components/Home.tsx`, igual que en `home.jsx` (todo en un solo archivo). Evita crear archivos adicionales para componentes de un solo uso.

## Risks

| Risk                                                                                                                                                             | Mitigation                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| El renombrado de `/biblioteca` a `/game` toca varios archivos (`Library`, `GameDetail`, `GamePlayer`, `Nav`, páginas movidas); un enlace olvidado quedaría roto. | Tras el paso 2, buscar (`grep`) cualquier referencia residual a `/biblioteca` en `app/` y `components/`.  |
| Next.js 16 genera tipos para `PageProps<'/game/[id]'>` a partir de las rutas existentes; mover archivos de página puede requerir regenerar esos tipos.           | Ejecutar `npm run dev` (o `npm run build`) tras mover las páginas antes de ajustar los tipos `PageProps`. |
| `/` devuelve 404 temporalmente entre el paso 2 y el paso 3 del plan de implementación.                                                                           | Documentado en el plan; la spec no se considera terminada hasta completar el paso 3.                      |

## What is **not** in this spec

- `about.jsx` y la página `/about`.
- Link "Acerca de" en el Nav.
- Bloque "ABOUT PAGE" del CSS de `home-about/styles.css`.
- Bloque "GAMEPAD" del CSS (~580 líneas).
- Datos dinámicos/reales para "ACTIVIDAD EN VIVO".
- Cambios a `/salon`, `/login`, `lib/data.ts` o `lib/session.tsx` más allá de los enlaces de Nav.
- Redirects desde `/biblioteca/*` hacia `/game/*`.
- Tests automatizados.

Cada uno de estos, si llega a implementarse, va en su propio spec.
