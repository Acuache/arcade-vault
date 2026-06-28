# SPEC 07 — Integración del juego Tetris ("caida") en la plataforma

> **Status:** Implementado · **Depends on:** SPEC 05, SPEC 06 · **Date:** 2026-06-28
> **Objective:** Integrar Tetris (`references/started-games/03-tetris/`) en `/game/caida/jugar` conectando su estado real (score, nivel y una única vida) al HUD de la plataforma, mostrando la siguiente pieza y guardando puntuaciones en el leaderboard.

## Scope

**In:**

- `components/TetrisGame.tsx` — componente React (`"use client"`) que envuelve el tablero en canvas (300×600) y un canvas de preview de la siguiente pieza (120×120), portando la lógica de `game.js`. Recibe `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`. Toda la lógica vive dentro de un `useEffect` con cleanup (cancela el `requestAnimationFrame` y quita el listener de `keydown`).
- Adaptar `game.js` dentro del `useEffect`: `canvas`/`ctx` (y el del preview) se obtienen desde `useRef<HTMLCanvasElement>` en lugar de `document.getElementById`; los globals del juego (`board`, `current`, `next`, `score`, `lines`, `level`, etc.) se convierten en variables locales; `updateHUD()` se elimina (el HUD vive en la plataforma); el overlay PAUSA/GAME OVER del DOM se suprime; el theme toggle y su `localStorage('tetris-theme')` se eliminan; en `drawGrid()`, `getComputedStyle(...).getPropertyValue('--grid-line')` se reemplaza por un color literal (esa variable CSS no existe en la plataforma).
- Callbacks: `onScore(score)` y `onLevel(level)` cuando cambian (comparando con el valor previo en cada frame); `onLives(1)` una vez al montar (Tetris tiene una única vida); `onLives(0)` + `onGameOver(score)` exactamente una vez cuando una pieza nueva ya no puede aparecer (el `endGame()` original).
- Preview NEXT: el segundo canvas 120×120 se renderiza dentro del componente vía la función `drawNext()` portada.
- Pausa real vía `pausedRef` (`useRef<boolean>` sincronizado en cada render): el loop salta el auto-descenso y el `lockPiece()` cuando `paused` es `true`, pero sigue dibujando. Se elimina la pausa interna por tecla `P` y `togglePause()`; la pausa la dirige el botón de la plataforma.
- Controles de teclado dentro del componente, con `preventDefault` en flechas y `Space` para no hacer scroll de la página: ←/→ mover, ↑ (o `X`) rotar, ↓ soft drop, `Space` hard drop.
- Bifurcar `components/GamePlayer.tsx`: cuando `id === 'caida'`, renderizar `<TetrisGame key={gameKey} paused={paused || over} onScore={setScore} onLives={setLives} onLevel={setLevel} onGameOver={(s) => { setScore(s); setOver(true) }} />`. El resto de `GamePlayer` no se rediseña.
- Insertar la fila de `caida` en la tabla `games` vía herramientas MCP de Supabase (`apply_migration` / `execute_sql`) — necesario porque la fila **no existe** hoy en la BD.

**Out of scope (para futuras specs):**

- Soporte para cualquier juego distinto de `caida`.
- Cambios a la infraestructura de scores/auth/Salón de la Fama (ya genérica desde SPEC 06).
- Redimensionamiento responsivo de los canvas (tamaños fijos 300×600 y 120×120).
- El theme toggle claro/oscuro del original (se elimina; la plataforma tiene su propio tema).
- Mecánicas extra no presentes en el original (hold piece, sistema de puntuación distinto).
- Sembrar los otros 6 juegos del seed de SPEC 06 que faltan en la BD.
- Tests automatizados.

## Data model

El componente expone esta interfaz de props (idéntica a `AsteroidsGame`):

```ts
interface TetrisGameProps {
  paused: boolean
  onScore: (score: number) => void
  onLives: (lives: number) => void
  onLevel: (level: number) => void
  onGameOver: (finalScore: number) => void
}
```

Mapeo del estado interno de Tetris a los callbacks:

| Estado interno (`game.js`)  | Callback de plataforma                            |
| --------------------------- | ------------------------------------------------- |
| `score`                     | `onScore(score)` al cambiar                       |
| `level`                     | `onLevel(level)` al cambiar                       |
| una única vida              | `onLives(1)` al montar; `onLives(0)` al game over |
| `lines`                     | (interno; no se expone al HUD)                    |
| `gameOver` (en `endGame()`) | `onGameOver(score)` una sola vez                  |

Fila nueva en la tabla `games` (insertar vía MCP de Supabase; la fila **no existe** hoy):

```
id='caida', title='CAÍDA',
short='Encaja las piezas antes de que el techo te aplaste.',
long='Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
cat='PUZZLE', cover='cover-tetro', color='magenta', best=0, plays='0'
```

La lógica del juego (matriz `board`, piezas `PIECES`, `collide`, `rotateCW`, `clearLines`, `loop`, etc.) vive íntegramente dentro del `useEffect`, sin exportarse. No se introducen tipos nuevos en `lib/types.ts`.

## Implementation plan

1. **Insertar la fila `caida` en la tabla `games` vía MCP de Supabase.**
   Usar `apply_migration` (o `execute_sql`) con el INSERT del Data model (`best=0`, `plays='0'`). Se hace primero para que las rutas que resuelven el juego por `id` funcionen en los pasos siguientes.
   Prueba manual: `/game` lista la card CAÍDA; `/game/caida` muestra el detalle; `/salon` tiene una pestaña CAÍDA (leaderboard vacío).

2. **Crear `components/TetrisGame.tsx`.**
   Componente funcional (`"use client"`) con el patrón AsteroidsGame: `useRef<HTMLCanvasElement>` para el tablero (300×600) y otro para el preview NEXT (120×120); `pausedRef` sincronizado con `paused` en cada render. Dentro del `useEffect`: portar `board`/`current`/`next`/`score`/`lines`/`level` y las funciones (`collide`, `tryRotate`, `clearLines`, `lockPiece`, `draw`, `drawNext`, `loop`) como variables locales. Suprimir `updateHUD()`, el overlay del DOM y el theme toggle; reemplazar `getComputedStyle(...).getPropertyValue('--grid-line')` por un color literal. Callbacks: `onScore`/`onLevel` al cambiar (comparando con el valor previo cada frame); `onLives(1)` al iniciar; flag `gameOverFired` que dispara `onLives(0)` + `onGameOver(score)` una sola vez en `endGame()`. El loop salta el auto-descenso y `lockPiece()` cuando `pausedRef.current` es `true`, pero sigue dibujando. Cleanup: `cancelAnimationFrame` + `removeEventListener('keydown')`.
   Prueba manual: `npm run lint` pasa y el archivo compila (aún sin renderizar en la plataforma).

3. **Bifurcar `components/GamePlayer.tsx` por `id === 'caida'`.**
   Añadir la rama: `id === 'caida'` → `<TetrisGame key={gameKey} paused={paused || over} onScore={setScore} onLives={setLives} onLevel={setLevel} onGameOver={(s) => { setScore(s); setOver(true) }} />`. El resto de `GamePlayer` (estado, `restart()`, guardado) no se toca.
   Prueba manual: `/game/caida/jugar` muestra el tablero 300×600 + el preview NEXT con piezas cayendo; el HUD refleja Puntuación, Vida (♥) y Nivel reales; PAUSA/REANUDAR detiene y reanuda; al colisionar al aparecer una pieza el modal "FIN DEL JUEGO" sale con la puntuación real y la Vida pasa a `—`; JUGAR DE NUEVO resetea; los demás juegos siguen con su placeholder.

4. **Verificar el flujo de leaderboard end-to-end.**
   Jugar una partida de `caida`, terminarla y pulsar "Guardar puntuación".
   Prueba manual: aparece una fila en la tabla `scores` con `game_id='caida'`, `alias` y `score` correctos; esa puntuación se ve en `/salon` (pestaña CAÍDA) y en `/game/caida`.

## Acceptance criteria

- [x] `npm run dev` arranca sin errores y `npm run lint` pasa sin errores ni warnings nuevos.
- [x] La tabla `games` contiene una fila `caida` con `cat='PUZZLE'`, `cover='cover-tetro'`, `color='magenta'`.
- [x] `/game` lista la card CAÍDA y `/game/caida` muestra su detalle sin errores en consola.
- [x] `/game/caida/jugar` muestra el tablero 300×600 con las piezas cayendo y el preview NEXT 120×120 con la siguiente pieza.
- [x] El HUD de la plataforma refleja Puntuación y Nivel reales en tiempo real; la Vida muestra `♥` (una vida) durante la partida.
- [x] Los controles funcionan: ←/→ mueven, ↑ (o `X`) rota, ↓ acelera la caída, `Space` hace hard drop; `Space` no hace scroll de la página.
- [x] El botón PAUSA/REANUDAR detiene y reanuda el descenso de piezas (el tablero sigue dibujándose en pausa).
- [x] Al no poder aparecer una pieza nueva, el modal "FIN DEL JUEGO" aparece con la puntuación final real y la Vida del HUD pasa a `—`.
- [x] El botón FIN de la plataforma muestra el modal con la puntuación en curso; el juego queda congelado bajo el modal.
- [x] JUGAR DE NUEVO reinicia el tablero, el preview y el HUD (`score=0`, `level=1`, Vida `♥`).
- [x] Guardar la puntuación inserta una fila en `scores` con `game_id='caida'`, `alias` y `score` correctos, visible en `/salon` y `/game/caida`.
- [x] Para los demás juegos (`id ≠ 'caida'`), el placeholder `.game-arena` sigue apareciendo igual.
- [x] No hay memory leaks: navegar fuera de `/game/caida/jugar` cancela el `requestAnimationFrame` y elimina el listener de `keydown`.

## Decisions

- **Sí:** toda la lógica del juego dentro del `useEffect` como variables locales (patrón AsteroidsGame). Evita globals que contaminen entre remounts.
- **Sí:** `pausedRef` para leer `paused` actualizado dentro del loop; un closure sobre el prop quedaría obsoleto (stale closure).
- **Sí:** `gameKey` para forzar remount en restart. Patrón idiomático de React para resetear un componente con estado de canvas opaco (ya existe en `GamePlayer`).
- **Sí:** Tetris tiene **una única vida**. `onLives(1)` al montar y `onLives(0)` al game over; el HUD muestra `♥` durante la partida y `—` al perder. Honesto con la mecánica y reutiliza el campo Vidas existente sin tocar el HUD.
- **No:** dejar el campo Vidas fijo en 3 ♥, ni repropósito a "Líneas". Lo primero engaña; lo segundo exigiría modificar el HUD de `GamePlayer` fuera del patrón de bifurcación por `id`.
- **Sí:** mostrar el preview NEXT como segundo canvas 120×120 dentro del componente. Es una mecánica central de Tetris y queda autocontenida, sin tocar `GamePlayer`.
- **Sí:** insertar la fila `caida` en `games`. La fila **no existe** en la BD viva (solo está `rocas`); sin ella el juego no aparece en `/game` ni en `/salon`. Valores `best=0`/`plays='0'` por no inventar cifras de showcase.
- **Sí:** insertar vía herramientas MCP de Supabase (`apply_migration`/`execute_sql`), no copiando SQL al SQL Editor (a diferencia de SPEC 06).
- **Sí:** suprimir `updateHUD()`, el overlay del DOM y el theme toggle del original. El HUD, el modal y el tema ya los aporta la plataforma; duplicarlos sería redundante o inconsistente.
- **Sí:** eliminar la pausa interna por tecla `P` y `togglePause()`. La pausa la dirige el botón de la plataforma vía `pausedRef`; mantener dos fuentes de pausa las desincronizaría.
- **Sí:** reemplazar `getComputedStyle(...).getPropertyValue('--grid-line')` por un color literal. Esa variable CSS pertenece al `style.css` del original y no existe en la plataforma.
- **No:** sembrar los otros 6 juegos faltantes del seed de SPEC 06. Fuera del alcance; un solo juego por spec.

## Risks

| Riesgo                                                                              | Mitigación                                                                               |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Stale closure en `paused`: el loop captura el valor inicial y no reacciona al prop. | `pausedRef` (`useRef<boolean>`) sincronizado en cada render.                             |
| `onGameOver`/`onLives(0)` llamados varias veces tras el game over.                  | Flag `gameOverFired` local al `useEffect`; se activa tras la primera llamada.            |
| El listener de `keydown` en `window` sigue activo tras desmontar.                   | Cleanup del `useEffect` con `removeEventListener` usando la misma referencia de función. |
| Navegar a `/game/caida/jugar` antes de insertar la fila `caida` rompe la carga.     | El paso 1 del plan inserta la fila en `games` antes de cablear el componente.            |
| `Space` (hard drop) hace scroll de la página durante la partida.                    | `preventDefault()` en flechas y `Space` dentro del handler de teclado.                   |

## What is **not** in this spec

- Soporte para juegos distintos de `caida`.
- Cambios a la infraestructura de scores/auth/Salón de la Fama.
- Redimensionamiento responsivo de los canvas.
- El theme toggle claro/oscuro del original.
- Sembrar los otros 6 juegos faltantes del seed de SPEC 06.
- Tests automatizados.

Cada uno, si llega a implementarse, va en su propio spec.
