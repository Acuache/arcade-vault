# Plantilla para un spec de integración de juego

Este archivo es la referencia que el skill `/add-game` consulta al generar el spec. Cada sección incluye su propósito y un ejemplo mínimo (basado en SPEC 05 + 06). **No es texto para copiar literalmente** — es la forma que el spec debe respetar. Las partes entre `[...]` son condicionales: inclúyelas solo si aplican al juego.

---

## Header

Metadatos en blockquote, sin tablas:

```markdown
# SPEC NN — Integración del juego <Título> ("<game_id>") en la plataforma

> **Status:** Draft · **Depends on:** SPEC 05, SPEC 06 · **Date:** YYYY-MM-DD
> **Objective:** Una sola frase: integrar <juego> en `/game/<game_id>/jugar` conectando su estado real (score, [vidas,] nivel) al HUD y guardando puntuaciones en el leaderboard.
```

**Estados válidos:** `Draft`, `En revisión`, `Approved`, `Implementado`, `Obsoleto`. Empieza siempre en `Draft`.

**Regla del objetivo:** una frase que se lee en 5 segundos. Si necesita dos, el juego trae demasiado en un solo spec.

`Depends on` casi siempre es `SPEC 05, SPEC 06` (el patrón de componente y la infraestructura de leaderboard).

---

## Scope

Dos sub-bloques, **ambos obligatorios**. Adapta los corchetes a este juego.

```markdown
## Scope

**In:**

- `components/<Pascal>Game.tsx` — componente React (`"use client"`) que envuelve el juego en canvas (<W>×<H>), portando la lógica del original. Recibe `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`. Lógica dentro de un `useEffect` con cleanup (cancela `requestAnimationFrame`, quita listeners de teclado [y ratón]).
- Adaptar la lógica del original: canvas/ctx desde `useRef`; globals convertidos en variables locales; `drawHUD()` eliminado; overlays de game over del canvas suprimidas; [carga asíncrona de assets (spritesheet/audio) dentro del `useEffect`].
- Callbacks: `onScore`/`onLives`/`onLevel` al cambiar (comparando con el valor previo cada frame); `onGameOver(finalScore)` una sola vez al entrar en game over.
- Pausa real vía `pausedRef`; el loop salta `update(dt)` cuando `paused` es `true`.
- Bifurcar `components/GamePlayer.tsx`: cuando `id === '<game_id>'`, renderizar `<NuevoGame key={gameKey} paused={paused || over} onScore={...} onLives={...} onLevel={...} onGameOver={...} />`.
- [Insertar la fila de `<game_id>` en la tabla `games` vía MCP de Supabase — solo si aún no existe.]
- [Añadir la clase CSS `cover-<x>` en `app/globals.css` — solo si no existe.]
- [Copiar assets (imágenes/sonidos) a `public/` y referenciarlos con rutas absolutas.]

**Out of scope (para futuras specs):**

- Soporte para cualquier juego distinto de `<game_id>`.
- Cambios a la infraestructura de scores/auth/Salón de la Fama (ya genérica desde SPEC 06).
- Redimensionamiento responsivo del canvas (tamaño fijo).
- Tests automatizados.
```

El "Out" captura lo que se mencionó pero se difiere, para que nadie lo cuele "ya que estamos".

---

## Data model

```markdown
## Data model

El componente expone:

\`\`\`ts
interface <Pascal>GameProps {
paused: boolean
onScore: (score: number) => void
onLives: (lives: number) => void
onLevel: (level: number) => void
onGameOver: (finalScore: number) => void
}
\`\`\`

[Fila nueva en la tabla `games` (insertar vía MCP solo si no existe):
`id='<game_id>'`, `title='<TÍTULO>'`, `short='...'`, `long='...'`, `cat='<CAT>'`, `cover='cover-<x>'`, `color='<color>'`, `best=0`, `plays='0'`.]

La lógica del juego (clases/funciones/globals del original) vive íntegramente dentro del `useEffect`, sin exportarse. No se introducen tipos nuevos en `lib/types.ts`.
```

Si la fila en `games` ya existe (juego sembrado por SPEC 06), dilo explícitamente: _"La fila de `<game_id>` ya existe en `games`; no se modifica la BD."_

---

## Implementation plan

Pasos numerados; cada uno deja el sistema funcional y tiene su prueba manual.

```markdown
## Implementation plan

1. Crear `components/<Pascal>Game.tsx` con el patrón AsteroidsGame: canvas por `ref`, lógica del original como variables locales en el `useEffect`, `pausedRef`, `gameOverFired`, callbacks, cleanup. Suprimir `drawHUD()` y overlays del canvas. [Cargar assets de forma asíncrona antes de arrancar el loop.] Prueba manual: navegar a `/game/<game_id>/jugar` → canvas visible y juego en movimiento; HUD de plataforma actualizando.
2. Mapear el estado del juego a los callbacks (score/[vidas/]nivel). [Decidir el tratamiento de `onLives` para juegos sin vidas.] Prueba manual: el HUD refleja los valores reales.
3. Bifurcar `GamePlayer.tsx` por `id === '<game_id>'`. Prueba manual: PAUSA detiene el juego; FIN muestra el modal con la puntuación real; JUGAR DE NUEVO resetea; otros juegos siguen con su placeholder.
4. [Insertar la fila de `<game_id>` en `games` vía MCP (`execute_sql`/`apply_migration`) — solo si no existe.] Prueba manual: el juego aparece en `/game` y como pestaña en `/salon`.
5. [Añadir la clase CSS `cover-<x>`.] [Copiar assets a `public/`.] Prueba manual: la card del juego muestra su portada [y los assets cargan].
6. Verificar el flujo de leaderboard end-to-end: jugar → guardar puntuación → la fila aparece en `scores` y en `/salon` / `/game/<game_id>`.
```

Cada paso debe ser commitable por sí solo. El último paso no es "probar todo" — eso son los criterios de aceptación.

---

## Acceptance criteria

Checklist booleano (sí/no), espejo de SPEC 05:

```markdown
## Acceptance criteria

- [ ] `npm run dev` arranca sin errores y `npm run lint` pasa sin warnings nuevos.
- [ ] `/game/<game_id>/jugar` muestra el canvas <W>×<H> con el juego en movimiento.
- [ ] El HUD de la plataforma (Puntuación, [Vidas,] Nivel) refleja los valores reales en tiempo real.
- [ ] El botón PAUSA/REANUDAR detiene y reanuda el game loop.
- [ ] Al terminar la partida, el modal "FIN DEL JUEGO" aparece con la puntuación final real.
- [ ] JUGAR DE NUEVO reinicia el canvas y el HUD.
- [ ] Guardar la puntuación inserta una fila en `scores` con `game_id`, `alias` y `score` correctos.
- [ ] El juego y sus scores aparecen en `/salon` y en `/game/<game_id>`.
- [ ] Para los demás juegos (`id ≠ '<game_id>'`), el placeholder sigue igual.
- [ ] No hay memory leaks: navegar fuera cancela el `requestAnimationFrame` y elimina los listeners.
```

Evita criterios no verificables ("que funcione bien", "buena UX").

---

## Decisions

La sección con más valor a futuro. Captura qué consideraste, no solo qué elegiste.

```markdown
## Decisions

- **Sí:** toda la lógica del juego dentro del `useEffect` como variables locales (patrón AsteroidsGame). Evita globals que contaminen entre remounts.
- **Sí:** `pausedRef` para leer `paused` actualizado en el loop; un closure sobre el prop quedaría obsoleto.
- **Sí:** `gameKey` para forzar remount en restart.
- **Sí:** suprimir el HUD/overlays del canvas; la plataforma ya los muestra.
- **[Sí/No]:** [decisión sobre `onLives` en juegos sin vidas — p. ej. no llamarlo y dejar el HUD fijo.]
- **[Sí/No]:** [insertar fila en `games` por MCP vs ya existe sembrada.]
```

Cada decisión con una razón breve.

---

## Risks (opcional)

Solo si hay riesgos no obvios. Tabla simple:

```markdown
## Risks

| Riesgo                                                     | Mitigación                                         |
| ---------------------------------------------------------- | -------------------------------------------------- |
| Stale closure en `paused`.                                 | `pausedRef` sincronizado en cada render.           |
| `onGameOver` llamado varias veces tras game over.          | Flag `gameOverFired` local al `useEffect`.         |
| Listeners de teclado [/ratón] siguen activos al desmontar. | Cleanup del `useEffect` con `removeEventListener`. |
| [Assets cargan de forma asíncrona; el loop arranca antes.] | [Arrancar el loop dentro del callback de carga.]   |
```

Para juegos muy contenidos, omítela.

---

## What is **not** in this spec (refuerzo)

Repite al final lo que NO se hará, como recordatorio:

```markdown
## What is **not** in this spec

- Soporte para juegos distintos de `<game_id>`.
- Cambios a la infraestructura de scores/auth/Salón.
- Redimensionamiento responsivo del canvas.
- Tests automatizados.

Cada uno, si llega a implementarse, va en su propio spec.
```

---

## Reglas globales del documento

- **Una idea por frase.**
- **Nombres concretos.** Di `components/TetrisGame.tsx`, no "el componente del juego"; di `id='caida'`, no "el id".
- **Sin TODOs.** Un TODO es una decisión no tomada; tómala o anótala como decisión pendiente con su razón.
- **Sin código ejecutable largo.** El spec describe; el código se escribe después. Snippets cortos para ilustrar (props, fila de `games`) sí; funciones completas no.
- **Markdown estándar.** Debe renderizar en GitHub sin sorpresas.
