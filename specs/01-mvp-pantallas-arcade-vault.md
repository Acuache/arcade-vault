# SPEC 01 — MVP visual: pantallas principales de Arcade Vault

> **Status:** Aprobado · **Depends on:** Ninguno · **Date:** 2026-06-09
> **Objective:** Portar las 5 pantallas del prototipo (`references/templates/`) —Biblioteca, Detalle, Reproductor, Salón de la Fama y Acceso— a páginas de Next.js App Router con su diseño, navegación y comportamiento visual completos, sin implementar juegos reales ni backend.

## Scope

**In:**

- Las 5 pantallas como rutas de Next.js App Router, navegables entre sí mediante el Nav superior + menú móvil (montados en `app/layout.tsx`).
- Ruteo: `/` (Biblioteca), `/biblioteca/[id]` (Detalle), `/biblioteca/[id]/jugar` (Reproductor), `/salon` (Salón de la Fama), `/login` (Acceso).
- Port del resto de `references/templates/styles.css` (lo no portado aún) a `app/globals.css`, reutilizando los nombres de clase del prototipo (`.av-nav`, `.card`, `.btn`, `.crt`, `.leaderboard`, etc.).
- Datos mock (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) portados a un módulo TypeScript tipado, reemplazando los globals `window.*` del prototipo.
- Estado de sesión en memoria vía Context en el layout raíz: usuario `{ name } | null` (logueado / invitado). Login, "jugar como invitado" y "cerrar sesión" actualizan este estado y se reflejan en Nav, Reproductor (precarga de nombre) y Salón de la Fama ("tu mejor marca") durante la navegación, sin recarga de página. No hay `localStorage`.
- Biblioteca: hero, búsqueda por nombre y filtro por categoría (estado local), grid de `GameCard` con efecto tilt, estado "sin resultados".
- Detalle: portada CSS, tags, descripción, stats, leaderboard (`seededScores`), botones "Jugar ahora" / "Volver al vault".
- Reproductor: HUD (jugador, puntuación, vidas, nivel), arena CRT animada por CSS, ticker de puntuación simulado, pausa, fin de partida, modal con input de iniciales y "guardar puntuación" (toggle visual local, sin persistencia).
- Salón de la Fama: tabs por juego, podio top 3, tabla de leaderboard, fila "tu mejor marca" cuando hay sesión activa.
- Acceso: tabs iniciar sesión / crear cuenta, formulario, modo invitado, botones sociales decorativos (sin OAuth real).
- Footer global (igual a `app.jsx`).

**Out of scope (for future specs):**

- Implementación de cualquier juego real (Bloque Buster, Caída, Serpentina, etc.) — la arena del Reproductor sigue siendo decorativa/CSS.
- Backend, autenticación real, base de datos o APIs — el formulario de Acceso no valida credenciales reales.
- Persistencia de sesión y puntuaciones (`localStorage`, claves `av_user` / `av_scores`) — se difiere para cuando exista backend.
- Login social real con Google/GitHub.
- Reescritura del sistema de estilos a utilidades Tailwind — se mantiene el CSS portado tal cual; una migración a Tailwind queda para un spec futuro.
- Tests automatizados (no hay test runner configurado).

## Data model

Se introduce un módulo `lib/data.ts` con los datos mock tipados (hoy viven como `window.GAMES` / `window.CATS` / `window.PLAYERS` / `window.seededScores` en `data.jsx`):

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS, ej. "cover-bricks"
  color: GameColor;
  best: number;
  plays: string;
};

export const GAMES: Game[] = [
  /* los 8 juegos del prototipo */
];
export const CATS: Array<"TODOS" | GameCategory> = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];
export const PLAYERS: string[] = [
  /* los 18 nombres del prototipo */
];

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};
export function seededScores(seed: number, count?: number): ScoreRow[] {
  /* misma lógica determinista */
}
```

Estado de sesión en memoria, en un nuevo `lib/session.tsx` (Client Component con Context, montado desde `app/layout.tsx`):

```tsx
export type SessionUser = { name: string };

type SessionContextValue = {
  user: SessionUser | null;
  login: (user: SessionUser | null) => void; // null = modo invitado
  logout: () => void;
};
```

Rutas dinámicas (Next.js 16: `params` es `Promise<{ id: string }>` en Server Components, vía `PageProps<'/biblioteca/[id]'>`):

- `app/biblioteca/[id]/page.tsx` → `{ id: string }`
- `app/biblioteca/[id]/jugar/page.tsx` → `{ id: string }`

Convenciones:

- Los IDs de juego son los mismos slugs del prototipo (`bloque-buster`, `caida`, etc.).
- Los componentes de pantalla que necesitan estado/efectos (Library, GameDetail, GamePlayer, HallOfFame, Auth, Nav) son Client Components (`"use client"`); las páginas en `app/` resuelven `params` y delegan el render a esos componentes.

## Implementation plan

1. **Base: datos, tipos y estilos.** Crear `lib/data.ts` con los tipos `Game`, `GameCategory`, `GameColor`, `ScoreRow`, los arrays `GAMES` / `CATS` / `PLAYERS` y la función `seededScores`, portados de `data.jsx`. Portar el resto de `references/templates/styles.css` (lo no incluido aún) a `app/globals.css`. Prueba manual: `npm run dev` sigue sirviendo la página actual sin errores ni warnings de `npm run lint`.

2. **Sesión + navegación global.** Crear `lib/session.tsx` (`SessionProvider`, hook `useSession`) y `components/Nav.tsx` (port de `nav.jsx` usando `<Link>` / `usePathname` para `/`, `/salon`, `/login`, incluyendo el menú móvil). Envolver `app/layout.tsx` con `SessionProvider`, montar `Nav` y el footer global (igual a `app.jsx`). Prueba manual: el nav y el footer aparecen en todas las páginas; los enlaces a `/salon` y `/login` devuelven 404 (se resuelven en pasos posteriores).

3. **Biblioteca (`/`).** Reemplazar el contenido de `app/page.tsx` por el port de `Library` + `GameCard` (`biblioteca.jsx`): hero, búsqueda, chips de categoría, grid con efecto tilt, estado "sin resultados". Las tarjetas enlazan a `/biblioteca/[id]`. Prueba manual: buscar y filtrar funciona; clic en una tarjeta navega a `/biblioteca/<id>` (404 hasta el paso 4).

4. **Detalle (`/biblioteca/[id]`).** Crear `app/biblioteca/[id]/page.tsx` (Server Component que resuelve `params`) que renderiza el port de `GameDetail` (`detalle.jsx`): portada, tags, descripción, stats, leaderboard con `seededScores`, botones "Jugar ahora" (→ `/biblioteca/[id]/jugar`) y "Volver al vault" (→ `/`). Prueba manual: navegar desde la Biblioteca a cada juego muestra su info y leaderboard correctos.

5. **Reproductor (`/biblioteca/[id]/jugar`).** Crear `app/biblioteca/[id]/jugar/page.tsx` con el port de `GamePlayer` (`reproductor.jsx`): HUD, arena CRT animada por CSS, ticker de puntuación simulado, pausa/fin, modal de fin con input de iniciales (precargado con `useSession().user?.name ?? "INVITADO"`) y botón "guardar puntuación" (toggle visual local, sin persistencia). Botones "Salir"/"Volver al vault" navegan según corresponda. Prueba manual: jugar, pausar, terminar, guardar puntuación y reiniciar funcionan visualmente.

6. **Salón de la Fama (`/salon`).** Crear `app/salon/page.tsx` con el port de `HallOfFame` (`salon.jsx`): tabs por juego, podio top 3, tabla de leaderboard y fila "tu mejor marca" cuando `useSession().user` no es `null`. Prueba manual: cambiar de tab actualiza podio/tabla; con sesión iniciada aparece "tu mejor marca", sin sesión no aparece.

7. **Acceso (`/login`).** Crear `app/login/page.tsx` con el port de `Auth` (`auth.jsx`): tabs iniciar sesión/crear cuenta, formulario, modo invitado, botones sociales decorativos. Al enviar el formulario o pulsar "jugar como invitado" llama a `useSession().login(...)` y redirige a `/`. Prueba manual: iniciar sesión actualiza el Nav (muestra el nombre) y, en el Salón, aparece "tu mejor marca"; "cerrar sesión" desde el Nav vuelve al estado invitado.

## Acceptance criteria

- [ ] `npm run dev` arranca sin errores y `npm run lint` pasa sin errores ni warnings nuevos.
- [ ] `/` muestra la Biblioteca: hero, buscador, chips de categoría y grid de juegos con el diseño del prototipo.
- [ ] Buscar por nombre y/o filtrar por categoría en `/` actualiza el grid; si no hay resultados se muestra "NO HAY RESULTADOS".
- [ ] Hacer clic en una tarjeta de juego navega a `/biblioteca/[id]` y muestra portada, tags, descripción, stats y leaderboard de ese juego.
- [ ] El botón "Jugar ahora" en `/biblioteca/[id]` navega a `/biblioteca/[id]/jugar`; "Volver al vault" navega a `/`.
- [ ] `/biblioteca/[id]/jugar` muestra el HUD (jugador, puntuación, vidas, nivel) y la puntuación sube automáticamente mientras el juego no está pausado ni terminado.
- [ ] "Pausa" detiene el incremento de puntuación y muestra "EN PAUSA"; "Reanudar" lo retoma.
- [ ] "Fin" abre el modal de fin de partida con la puntuación final y un campo de iniciales.
- [ ] "Guardar puntuación" cambia el modal a "▸ PUNTUACIÓN GUARDADA\_" sin recargar la página.
- [ ] "Jugar de nuevo" reinicia puntuación/vidas/nivel; "Volver al vault" navega a `/`.
- [ ] `/salon` muestra tabs por juego, podio top 3 y tabla de leaderboard para el juego seleccionado, y cambiar de tab actualiza ambos.
- [ ] El Nav muestra "Iniciar Sesión" cuando no hay sesión activa, y enlaza a `/login`.
- [ ] En `/login`, enviar el formulario o pulsar "Jugar como invitado" inicia sesión, redirige a `/` y el Nav pasa a mostrar el nombre del usuario (o "PLAYER1" si el campo usuario quedó vacío).
- [ ] Con sesión iniciada, `/salon` muestra la fila "▸ TU MEJOR MARCA EN [JUEGO]" con el nombre del usuario; sin sesión, esa fila no aparece.
- [ ] Hacer clic en el nombre de usuario del Nav cierra sesión y el Nav vuelve a mostrar "Iniciar Sesión".
- [ ] Recargar la página (F5) en cualquier ruta no produce errores; la sesión vuelve a estado invitado (sin persistencia, según Decisiones).
- [ ] El menú móvil (hamburguesa) abre/cierra y permite navegar a Biblioteca, Salón y Acceso/Cuenta.

## Decisions

- **Sí:** portar `reproductor.jsx` tal cual (HUD + arena CRT animada por CSS + ticker de puntuación simulado). No es "un juego real", es la cáscara visual común a todos los títulos — encaja con "solo visual, sin implementar juegos".
- **No:** placeholder estático para el Reproductor. Descartado en favor de la fidelidad al prototipo.
- **Sí:** `/` es la Biblioteca directamente (sin redirect). Coincide con la ruta por defecto del prototipo (`{ name: "biblioteca" }`).
- **Sí:** estado de sesión en memoria vía React Context (sin `localStorage`), se pierde al recargar. El pedido es "solamente visual"; evita introducir una capa de persistencia que no aporta al MVP.
- **No:** `localStorage` (`av_user` / `av_scores`) como en el prototipo. Descartado por la misma razón — fuera del alcance de "solo visual".
- **No:** persistir las puntuaciones guardadas (`av_scores`) de ninguna forma. En el prototipo ese dato nunca se vuelve a leer (el "tu mejor marca" del Salón se calcula con una fórmula determinista independiente), así que no aporta valor visual mantenerlo.
- **Sí:** portar `styles.css` completo a `globals.css` y reusar las clases del prototipo tal cual (`.av-nav`, `.card`, `.btn`, etc.). Máxima fidelidad visual con mínimo riesgo/esfuerzo para el MVP.
- **No (por ahora):** reescribir el sistema de diseño con utilidades Tailwind. El usuario prefiere Tailwind "puro" a futuro, pero para este MVP se prioriza velocidad y fidelidad; queda anotado como posible spec de migración de estilos.
- **Sí:** rutas en español alineadas al prototipo (`/biblioteca`, `/biblioteca/[id]`, `/biblioteca/[id]/jugar`, `/salon`, `/login`). Mantiene coherencia con el idioma de la UI y los nombres de ruta del prototipo (`biblioteca`, `detalle`, `player`, `salon`, `auth`→`login`).
- **Sí:** ubicar el código nuevo en `lib/` (datos, sesión) y `components/` (Nav y pantallas) en la raíz del repo, aprovechando el alias `@/*`. Convención estándar de Next.js App Router; el repo no tenía una previa.

## Risks

| Risk                                                                                                                                        | Mitigation                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| El efecto tilt de `GameCard` manipula el DOM vía `ref` (`el.style.transform`) — riesgo de errores de hidratación si no es Client Component. | `Library`/`GameCard` marcados `"use client"`, mismo patrón `useRef` que el prototipo.                                    |
| Next.js 16 difiere de versiones previas (`params` es `Promise`, posibles cambios en convenciones de `Link`/`usePathname`/archivos).         | Revisar `node_modules/next/dist/docs/01-app/` antes de usar cada API durante la implementación, como indica `AGENTS.md`. |
| Resetear la sesión al recargar (F5) puede confundir durante pruebas manuales si se espera que "iniciar sesión" persista.                    | Documentado en Decisions y en Acceptance criteria; verificarlo explícitamente al probar cada pantalla.                   |

## What is **not** in this spec

- Implementación de cualquier juego real (Bloque Buster, Caída, Serpentina, etc.).
- Backend, autenticación real, base de datos o APIs.
- Persistencia de sesión y puntuaciones (`localStorage`, `av_user` / `av_scores`).
- Login social real con Google/GitHub.
- Migración del sistema de estilos a utilidades Tailwind.
- Tests automatizados.

Cada uno de estos, si llega a implementarse, va en su propio spec.
