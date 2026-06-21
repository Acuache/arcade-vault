# SPEC 05 — Integración del juego Asteroids ("rocas") en el reproductor de la plataforma

> **Status:** Implementado · **Depends on:** SPEC 02 · **Date:** 2026-06-21
> **Objective:** Adaptar el juego Asteroids (vanilla JS + canvas, `references/started-games/02-asteroids/`) al reproductor de la plataforma en `/game/rocas/jugar`, conectando su estado real (score, vidas, nivel) al HUD del `GamePlayer` y habilitando la pausa real desde el botón de la plataforma.

## Scope

**In:**

- `components/AsteroidsGame.tsx` — componente React (`"use client"`) que envuelve el juego en canvas. Recibe `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`; monta un `<canvas>` 800×600; toda la lógica del juego vive dentro de un `useEffect` con cleanup (cancela el `requestAnimationFrame` y elimina los listeners de teclado).
- Adaptar `game.js` dentro del `useEffect`: `canvas`/`ctx` se obtienen desde `useRef<HTMLCanvasElement>` en lugar de `document.getElementById`; los globals del juego (`ship`, `bullets`, `asteroids`, etc.) se convierten en variables locales dentro del efecto; `drawHUD()` se elimina (el HUD vive en la plataforma); la overlay "GAME OVER" del canvas se suprime (la plataforma muestra el modal).
- Callbacks del juego: llamar `onScore(score)` y `onLives(lives)` cuando cambian (comparando con el valor anterior en cada frame); `onLevel(level)` al avanzar nivel; `onGameOver(finalScore)` exactamente una vez cuando el estado transiciona a `'gameover'`.
- Pausa real: el game loop salta `update(dt)` cuando `paused` es `true` (sigue dibujando el último frame). El prop `paused` se lee desde un `useRef<boolean>` para evitar stale closures.
- Modificar `GamePlayer.tsx`:
  - Eliminar el `useEffect` con `setInterval` (simulación falsa).
  - Convertir `level` de valor derivado a `useState(1)`.
  - Añadir `gameKey: number` (useState) para forzar remount de `AsteroidsGame` al reiniciar.
  - Cuando `id === "rocas"`: renderizar `<AsteroidsGame key={gameKey} paused={paused || over} onScore={setScore} onLives={setLives} onLevel={setLevel} onGameOver={(s) => { setScore(s); setOver(true); }} />` en lugar del bloque `.game-arena` con sprites CSS.
  - Para cualquier otro `id`: el bloque `.game-arena` placeholder permanece intacto.
  - `restart()`: incrementa `gameKey` + resetea `score`, `lives`, `level`, `paused`, `over`, `saved`.

**Out of scope (para futuras specs):**

- Persistencia real de puntuaciones (solo `setSaved(true)` sin escritura a BD).
- Soporte para cualquier juego diferente de "rocas".
- Leaderboard actualizado con la nueva puntuación.
- Redimensionamiento responsivo del canvas (800×600 fijo).
- Añadir "rocas" a `lib/data.ts` (la entrada ya existe).
- Tests automatizados.

## Data model

No se introducen tipos nuevos en `lib/data.ts`. El componente `AsteroidsGame` expone esta interfaz de props:

```ts
interface AsteroidsGameProps {
  paused: boolean
  onScore: (score: number) => void
  onLives: (lives: number) => void
  onLevel: (level: number) => void
  onGameOver: (finalScore: number) => void
}
```

La lógica del juego (clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, y los globals `ship`, `bullets`, `asteroids`, etc.) vive íntegramente dentro del `useEffect`, sin exportarse.

## Implementation plan

1. **Crear `components/AsteroidsGame.tsx`.**
   Componente funcional (`"use client"`). `useRef<HTMLCanvasElement>` para el canvas. `useRef<boolean>` (`pausedRef`) sincronizado con la prop `paused` en cada render para evitar stale closures en el game loop.

   El `useEffect` principal:
   - Obtiene `canvas` del ref y `ctx` de `getContext('2d')`.
   - Define todas las clases y funciones de `game.js` como variables locales (portadas sin cambios de lógica salvo las que siguen).
   - Elimina la llamada a `drawHUD()` en `draw()`.
   - Elimina la overlay de `drawOverlay('GAME OVER', ...)` del `draw()`.
   - Al detectar `state === 'gameover'` por primera vez (flag `gameOverFired`): llama `onGameOver(score)` y fija `gameOverFired = true`.
   - Compara `score` / `lives` / `level` con el valor previo en cada frame; llama los callbacks solo cuando cambian.
   - Game loop: si `pausedRef.current` es `true`, salta `update(dt)` pero sigue llamando `draw()` y `requestAnimationFrame`.
   - Cleanup: `cancelAnimationFrame(rafId)`, `removeEventListener` de `keydown`/`keyup` en `window`.

   Renders `<canvas ref={canvasRef} width={800} height={600} style={{ display: 'block' }} />`.

   Prueba manual: navegar a `/game/rocas/jugar` → canvas visible con asteroides y nave en movimiento; HUD de plataforma actualizando.

2. **Modificar `GamePlayer.tsx`.**
   - Importar `AsteroidsGame` desde `"./AsteroidsGame"`.
   - Eliminar el `useEffect` del `setInterval`.
   - Reemplazar `const level = Math.floor(score / 2500) + 1` por `const [level, setLevel] = useState(1)`.
   - Añadir `const [gameKey, setGameKey] = useState(0)`.
   - Actualizar `restart()`:
     ```ts
     setGameKey((k) => k + 1)
     setScore(0)
     setLives(3)
     setLevel(1)
     setPaused(false)
     setOver(false)
     setSaved(false)
     ```
   - Dentro de `.crt-screen`, bifurcar por `id`:
     ```tsx
     {
       id === 'rocas' ? (
         <AsteroidsGame
           key={gameKey}
           paused={paused || over}
           onScore={setScore}
           onLives={setLives}
           onLevel={setLevel}
           onGameOver={(s) => {
             setScore(s)
             setOver(true)
           }}
         />
       ) : (
         <div className="game-arena">{/* sprites CSS placeholder */}</div>
       )
     }
     ```

   Prueba manual: PAUSA detiene el juego; FIN muestra el modal con la puntuación real del canvas; JUGAR DE NUEVO resetea el canvas y el HUD; navegar a otro juego no rompe el placeholder.

## Acceptance criteria

- [ ] `npm run dev` arranca sin errores y `npm run lint` pasa sin errores ni warnings nuevos.
- [ ] `/game/rocas/jugar` muestra el canvas 800×600 con la nave y los asteroides en movimiento.
- [ ] El HUD de la plataforma (Puntuación, Vidas, Nivel) refleja los valores reales del juego en tiempo real.
- [ ] El botón PAUSA/REANUDAR detiene y reanuda el game loop del canvas.
- [ ] Al morir todas las vidas, el modal "FIN DEL JUEGO" aparece automáticamente con la puntuación final real.
- [ ] El botón FIN de la plataforma muestra el modal con la puntuación en curso; el juego queda congelado bajo el modal.
- [ ] JUGAR DE NUEVO reinicia el canvas y el HUD con `score=0`, `lives=3`, `level=1`.
- [ ] VOLVER AL VAULT navega a `/game/rocas`.
- [ ] Para todos los demás juegos (`id ≠ "rocas"`), el bloque `.game-arena` placeholder sigue apareciendo igual que antes.
- [ ] No hay memory leaks: navegar fuera de `/game/rocas/jugar` cancela el `requestAnimationFrame` y elimina los listeners de teclado.

## Decisions

- **Sí:** toda la lógica del juego dentro de `useEffect` como variables locales. Evita globals que contaminarían entre remounts y es el patrón correcto para canvas + React.
- **No:** importar `game.js` como módulo externo con exports. El archivo original usa `'use strict'` y globals implícitos; adaptarlo como módulo requeriría refactors adicionales sin beneficio neto para esta spec.
- **Sí:** `useRef<boolean>` (`pausedRef`) para leer `paused` actualizado dentro del closure del game loop. Un closure sobre el valor directo del prop quedaría obsoleto (stale closure).
- **Sí:** `gameKey` para forzar remount en restart. Es el patrón idiomático de React para resetear un componente con estado interno opaco (canvas).
- **Sí:** suprimir `drawHUD()` del canvas. El HUD de la plataforma muestra la misma información; dos HUDs simultáneos son redundantes.
- **Sí:** suprimir la overlay "GAME OVER" del canvas. La plataforma tiene el modal correspondiente; duplicarlo dentro del canvas sería inconsistente con el diseño.
- **No:** hacer `GamePlayer` completamente genérico (renderizar cualquier juego vía componente dinámico). Fuera del alcance de esta spec; la bifurcación `id === "rocas"` es suficiente y honesta sobre lo que existe hoy.
- **Sí:** pasar `paused || over` al juego cuando el modal está visible. Evita que el game loop siga corriendo e interfiera con el teclado mientras el usuario usa el modal.
- **No:** guardar la puntuación en BD en esta spec. El flujo de persistencia (Supabase) se deja para un spec dedicado de leaderboard; aquí solo `setSaved(true)` como placeholder.

## Risks

| Riesgo                                                                                                | Mitigación                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Stale closure en `paused`: el game loop captura el valor inicial y no reacciona a cambios del prop.   | `useRef<boolean>` (`pausedRef`) sincronizado en cada render mediante un efecto separado.                                                   |
| `onGameOver` llamado varias veces (cada frame después del game over).                                 | Flag `gameOverFired` local al `useEffect`; se activa tras la primera llamada y bloquea las siguientes.                                     |
| Los listeners de teclado en `window` siguen activos tras desmontar el componente si el cleanup falla. | El cleanup del `useEffect` llama `removeEventListener` con las mismas referencias de función; verificar con DevTools Network / Memory tab. |

## What is **not** in this spec

- Persistencia real de puntuaciones en BD.
- Soporte para juegos distintos de "rocas".
- Leaderboard actualizado tras guardar puntuación.
- Redimensionamiento responsivo del canvas.
- Tests automatizados.

Cada uno de estos, si llega a implementarse, va en su propio spec.
