# SPEC 08 — Integración del juego Snake ("serpentina") en la plataforma

> **Status:** Aprobado · **Depends on:** SPEC 05, SPEC 06 · **Date:** 2026-06-28
> **Objective:** Integrar Snake en `/game/serpentina/jugar` con un componente nuevo escrito desde cero (patrón AsteroidsGame), conectando su estado real (puntuación, una única vida y nivel por velocidad) al HUD de la plataforma y guardando puntuaciones en el leaderboard.

## Scope

**In:**

- `components/SnakeGame.tsx` — componente React (`"use client"`) que monta un canvas 600×600 (grilla de 30×30 celdas de 20px), escrito desde cero siguiendo el patrón de `AsteroidsGame`/`TetrisGame`. Recibe `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`. Toda la lógica vive dentro de un `useEffect` con cleanup (cancela el `requestAnimationFrame` y quita el listener de `keydown`).
- Lógica del juego como variables locales dentro del `useEffect`: la serpiente (array de segmentos `{x, y}` en celdas), la dirección actual, la dirección encolada del input, el núcleo (comida), `score`, `level`, y el contador de núcleos comidos. `canvas`/`ctx` se obtienen desde `useRef<HTMLCanvasElement>`. No se dibuja HUD en el canvas ni overlay de game over (los aporta la plataforma).
- Game loop con acumulador de tiempo sobre `requestAnimationFrame` (no `setInterval`): la serpiente avanza una celda por "tick"; el intervalo entre ticks disminuye al subir de nivel. El loop salta el avance cuando `pausedRef.current` es `true`, pero sigue dibujando.
- Comer un núcleo: +10 puntos, la serpiente crece un segmento, y aparece un núcleo nuevo en una celda libre aleatoria. Cada 5 núcleos comidos sube el nivel y acelera la serpiente.
- Game over: chocar contra el borde del tablero o contra el propio cuerpo.
- Callbacks: `onScore(score)` y `onLevel(level)` cuando cambian (comparando con el valor previo en cada frame); `onLives(1)` una vez al montar; `onLives(0)` + `onGameOver(score)` exactamente una vez al entrar en game over (flag `gameOverFired`).
- Pausa real vía `pausedRef` (`useRef<boolean>` sincronizado en cada render).
- Controles de teclado dentro del componente: ←/→/↑/↓ y W/A/S/D mueven la serpiente; `preventDefault` en las flechas para no hacer scroll de la página; se ignora el giro de 180° instantáneo (no se permite invertir directo sobre el eje opuesto).
- Bifurcar `components/GamePlayer.tsx`: cuando `id === 'serpentina'`, renderizar `<SnakeGame key={gameKey} paused={paused || over} onScore={setScore} onLives={setLives} onLevel={setLevel} onGameOver={(s) => { setScore(s); setOver(true) }} />`. El resto de `GamePlayer` no se rediseña.
- Insertar la fila de `serpentina` en la tabla `games` vía herramientas MCP de Supabase (`apply_migration` / `execute_sql`) — necesario porque la fila **no existe** hoy en la BD.

**Out of scope (para futuras specs):**

- Soporte para cualquier juego distinto de `serpentina`.
- Cambios a la infraestructura de scores/auth/Salón de la Fama (ya genérica desde SPEC 06).
- Redimensionamiento responsivo del canvas (600×600 fijo).
- Wrap-around en los bordes (se descartó: pared = muerte).
- Modos o mecánicas extra (obstáculos, power-ups, núcleos especiales, multijugador).
- Sembrar los otros juegos del seed de SPEC 06 que faltan en la BD.
- La clase CSS `cover-snake` (ya existe en `app/globals.css`).
- Tests automatizados.

## Data model

El componente expone esta interfaz de props (idéntica a `AsteroidsGame` y `TetrisGame`):

```ts
interface SnakeGameProps {
  paused: boolean
  onScore: (score: number) => void
  onLives: (lives: number) => void
  onLevel: (level: number) => void
  onGameOver: (finalScore: number) => void
}
```

Forma del estado interno (variables locales dentro del `useEffect`, ilustrativo):

```ts
type Cell = { x: number; y: number } // coordenadas en celdas de la grilla (0..29)
let snake: Cell[] // [cabeza, ...cuerpo]
let dir: Cell // dirección actual (1 celda por tick)
let nextDir: Cell // dirección encolada desde el input
let food: Cell // núcleo magenta a comer
let score = 0
let level = 1
let eaten = 0 // núcleos comidos; level = floor(eaten / 5) + 1
```

Mapeo del estado interno a los callbacks de la plataforma:

| Estado interno (`SnakeGame`) | Callback de plataforma                            |
| ---------------------------- | ------------------------------------------------- |
| `score`                      | `onScore(score)` al cambiar                       |
| `level`                      | `onLevel(level)` al cambiar                       |
| una única vida               | `onLives(1)` al montar; `onLives(0)` al game over |
| `eaten` / `snake.length`     | (interno; no se expone al HUD)                    |
| choque (pared o cuerpo)      | `onGameOver(score)` una sola vez                  |

Fila nueva en la tabla `games` (insertar vía MCP de Supabase; la fila **no existe** hoy):

```
id='serpentina', title='SERPENTINA',
short='Crece sin morder tu propia cola.',
long='Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.',
cat='ARCADE', cover='cover-snake', color='green', best=0, plays='0'
```

La lógica del juego (la grilla, el avance por ticks, la detección de colisiones, el spawn del núcleo, el dibujado) vive íntegramente dentro del `useEffect`, sin exportarse. No se introducen tipos nuevos en `lib/types.ts`.

## Implementation plan

1. **Insertar la fila `serpentina` en la tabla `games` vía MCP de Supabase.**
   Usar `apply_migration` (o `execute_sql`) con el INSERT del Data model (`best=0`, `plays='0'`). Se hace primero para que las rutas que resuelven el juego por `id` funcionen en los pasos siguientes.
   Prueba manual: `/game` lista la card SERPENTINA; `/game/serpentina` muestra el detalle; `/salon` tiene una pestaña SERPENTINA (leaderboard vacío).

2. **Crear `components/SnakeGame.tsx`.**
   Componente funcional (`"use client"`) con el patrón AsteroidsGame: `useRef<HTMLCanvasElement>` para el canvas (600×600); `pausedRef` sincronizado con `paused` en cada render. Dentro del `useEffect`: definir `snake`, `dir`, `nextDir`, `food`, `score`, `level`, `eaten` como variables locales y las funciones de avance, colisión, spawn de núcleo y dibujado. Game loop con acumulador de tiempo sobre `requestAnimationFrame`: avanza una celda por tick, salta el avance cuando `pausedRef.current` es `true` pero sigue dibujando. Comer núcleo: +10, crecer, respawnear el núcleo, y cada 5 núcleos subir nivel + acelerar. Callbacks: `onScore`/`onLevel` al cambiar (comparando con el valor previo); `onLives(1)` al iniciar; flag `gameOverFired` que dispara `onLives(0)` + `onGameOver(score)` una sola vez. Controles ←/→/↑/↓ + W/A/S/D con `preventDefault` en flechas y rechazo del giro de 180°. Cleanup: `cancelAnimationFrame` + `removeEventListener('keydown')`.
   Prueba manual: `npm run lint` pasa y el archivo compila (aún sin renderizar en la plataforma).

3. **Bifurcar `components/GamePlayer.tsx` por `id === 'serpentina'`.**
   Importar `SnakeGame` y añadir la rama: `id === 'serpentina'` → `<SnakeGame key={gameKey} paused={paused || over} onScore={setScore} onLives={setLives} onLevel={setLevel} onGameOver={(s) => { setScore(s); setOver(true) }} />`. El resto de `GamePlayer` (estado, `restart()`, guardado) no se toca.
   Prueba manual: `/game/serpentina/jugar` muestra el tablero 600×600 con la serpiente moviéndose y el núcleo magenta; el HUD refleja Puntuación, Vida (♥) y Nivel reales; PAUSA/REANUDAR detiene y reanuda; al chocar contra la pared o el propio cuerpo el modal "FIN DEL JUEGO" sale con la puntuación real y la Vida pasa a `—`; JUGAR DE NUEVO resetea; los demás juegos siguen con su placeholder.

4. **Verificar el flujo de leaderboard end-to-end.**
   Jugar una partida de `serpentina`, terminarla y pulsar "Guardar puntuación".
   Prueba manual: aparece una fila en la tabla `scores` con `game_id='serpentina'`, `alias` y `score` correctos; esa puntuación se ve en `/salon` (pestaña SERPENTINA) y en `/game/serpentina`.

## Acceptance criteria

- [ ] `npm run dev` arranca sin errores y `npm run lint` pasa sin errores ni warnings nuevos.
- [ ] La tabla `games` contiene una fila `serpentina` con `cat='ARCADE'`, `cover='cover-snake'`, `color='green'`.
- [ ] `/game` lista la card SERPENTINA y `/game/serpentina` muestra su detalle sin errores en consola.
- [ ] `/game/serpentina/jugar` muestra el tablero 600×600 con la serpiente avanzando y un núcleo magenta visible.
- [ ] El HUD de la plataforma refleja Puntuación y Nivel reales en tiempo real; la Vida muestra `♥` (una vida) durante la partida.
- [ ] Los controles funcionan: ←/→/↑/↓ y W/A/S/D mueven la serpiente; las flechas no hacen scroll de la página; un giro de 180° instantáneo se ignora.
- [ ] Comer un núcleo suma exactamente 10 puntos, alarga la serpiente y aparece un núcleo nuevo en una celda libre.
- [ ] Cada 5 núcleos comidos sube el Nivel del HUD y la serpiente se mueve más rápido.
- [ ] El botón PAUSA/REANUDAR detiene y reanuda el avance (el tablero sigue dibujándose en pausa).
- [ ] Al chocar contra el borde o contra el propio cuerpo, el modal "FIN DEL JUEGO" aparece con la puntuación final real y la Vida del HUD pasa a `—`.
- [ ] El botón FIN de la plataforma muestra el modal con la puntuación en curso; el juego queda congelado bajo el modal.
- [ ] JUGAR DE NUEVO reinicia el tablero y el HUD (`score=0`, `level=1`, Vida `♥`).
- [ ] Guardar la puntuación inserta una fila en `scores` con `game_id='serpentina'`, `alias` y `score` correctos, visible en `/salon` y `/game/serpentina`.
- [ ] Para los demás juegos (`id ≠ 'serpentina'`), el placeholder `.game-arena` sigue apareciendo igual.
- [ ] No hay memory leaks: navegar fuera de `/game/serpentina/jugar` cancela el `requestAnimationFrame` y elimina el listener de `keydown`.

## Decisions

- **Sí:** toda la lógica del juego dentro del `useEffect` como variables locales (patrón AsteroidsGame). Evita globals que contaminen entre remounts.
- **Sí:** `pausedRef` para leer `paused` actualizado dentro del loop; un closure sobre el prop quedaría obsoleto (stale closure).
- **Sí:** `gameKey` para forzar remount en restart. Patrón idiomático de React ya presente en `GamePlayer`.
- **Sí:** game loop con acumulador de tiempo sobre `requestAnimationFrame`, no `setInterval`. Se integra con `pausedRef` y con el cleanup del patrón, y permite variar la velocidad por nivel sin recrear timers.
- **Sí:** Snake tiene **una única vida**. `onLives(1)` al montar y `onLives(0)` al game over; el HUD muestra `♥` durante la partida y `—` al perder. Honesto con la mecánica y reutiliza el campo Vidas existente sin tocar el HUD.
- **No:** dejar el campo Vidas fijo en 3 ♥, ni repropósito a "longitud". Lo primero engaña; lo segundo rompe el ícono ♥ del HUD.
- **Sí:** nivel por velocidad — sube cada 5 núcleos comidos y acelera la serpiente; `onLevel(n)` al cambiar. Da progresión visible y dificultad creciente.
- **No:** nivel fijo en 01 (campo inerte) ni nivel = longitud (crece demasiado rápido).
- **Sí:** pared = muerte (Snake clásico). Chocar el borde dispara game over; la otra causa de muerte es morderse a sí misma.
- **No:** wrap-around en los bordes. Menos clásico y diluye la tensión del juego.
- **Sí:** canvas 600×600 con grilla 30×30 (celdas de 20px). Tablero cuadrado que encaja en la pantalla CRT.
- **Sí:** controles flechas + W/A/S/D, con `preventDefault` en flechas y rechazo del giro de 180° instantáneo. Más cómodo y evita la muerte accidental por invertir sobre sí misma.
- **Sí:** 10 puntos por núcleo. Puntuación simple y verificable.
- **Sí:** insertar la fila `serpentina` en `games` vía MCP. No existe en la BD viva (solo `rocas` y `caida`); sin ella el juego no aparece en `/game` ni en `/salon`. Valores `best=0`/`plays='0'` por no inventar cifras de showcase.
- **Sí:** reutilizar la clase `cover-snake` existente en `app/globals.css`. No hay trabajo de CSS ni de assets.
- **No:** sembrar los otros juegos faltantes del seed de SPEC 06. Fuera del alcance; un solo juego por spec.

## Risks

| Riesgo                                                                              | Mitigación                                                                               |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Stale closure en `paused`: el loop captura el valor inicial y no reacciona al prop. | `pausedRef` (`useRef<boolean>`) sincronizado en cada render.                             |
| `onGameOver`/`onLives(0)` llamados varias veces tras el game over.                  | Flag `gameOverFired` local al `useEffect`; se activa tras la primera llamada.            |
| Giro de 180° instantáneo: la serpiente se devora al invertir sobre su eje.          | Encolar la dirección en `nextDir` y validar contra `dir` antes de aplicarla en el tick.  |
| Las flechas hacen scroll de la página durante la partida.                           | `preventDefault()` en las teclas de flecha dentro del handler de teclado.                |
| El listener de `keydown` en `window` sigue activo tras desmontar.                   | Cleanup del `useEffect` con `removeEventListener` usando la misma referencia de función. |
| Navegar a `/game/serpentina/jugar` antes de insertar la fila `serpentina`.          | El paso 1 del plan inserta la fila en `games` antes de cablear el componente.            |

## What is **not** in this spec

- Soporte para juegos distintos de `serpentina`.
- Cambios a la infraestructura de scores/auth/Salón de la Fama.
- Redimensionamiento responsivo del canvas.
- Wrap-around en los bordes.
- Modos o mecánicas extra (obstáculos, power-ups, núcleos especiales, multijugador).
- Sembrar los otros juegos faltantes del seed de SPEC 06.
- Tests automatizados.

Cada uno, si llega a implementarse, va en su propio spec.
