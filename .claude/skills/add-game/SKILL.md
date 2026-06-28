---
name: add-game
description: Diseña un spec de integración de juego (NN-<slug>-game.md) para añadir un juego arcade nuevo con su leaderboard a la plataforma, siguiendo el patrón de SPEC 05 + 06. Hace preguntas guiadas sobre la fuente del juego, sus metadatos y el mapeo de estado, y guarda un spec en estado Draft para implementar después con /spec-impl. Nunca escribe código.
disable-model-invocation: true
argument-hint: 'nombre del juego, carpeta de referencia, o descripción corta'
---

# /add-game — Diseñador guiado de specs de integración de juegos

Este skill produce un **spec de integración** para añadir un juego arcade nuevo (con su leaderboard) a Arcade Vault. **No escribes código aquí.** Tu trabajo es clarificar qué juego se integra, hacer las preguntas correctas y desarrollar el spec sección por sección hasta dejarlo listo en `specs/`. La implementación la hace el usuario después con `/spec-impl`.

Es un caso especializado de `/spec`: en vez de empezar de cero, ya conoces el patrón de integración probado con "rocas" (Asteroids) y solo lo adaptas al juego nuevo.

## Filosofía

Integrar un juego en esta plataforma **es un patrón repetible**, no un diseño desde cero. SPEC 05 lo demostró con Asteroids y SPEC 06 dejó toda la infraestructura de leaderboard ya genérica. Tu trabajo es capturar las **diferencias del juego nuevo** (su lógica, su modelo de estado, sus assets) en un spec consistente, reutilizando el patrón en todo lo demás.

Como este skill es un caso especializado de `/spec`, **lee primero el skill `/spec` como referencia base** del método spec-driven antes de diseñar nada:

- `.claude/skills/spec/SKILL.md` — el flujo guiado canónico (fases, cómo preguntar, cómo desarrollar sección por sección, reglas duras, tono). Hereda ese estilo.
- `.claude/skills/spec/template.md` — la forma y reglas globales de un spec del repo (header en blockquote, estados válidos, anti-patrones de criterios, etc.).

Luego lee `template.md` (en este mismo directorio): es la versión de esa plantilla **especializada para integración de juegos**. Cuando ambas plantillas coincidan, sigue la de `/spec` para el estilo general y la de `add-game` para el contenido específico del juego. Apóyate en las dos en cada paso.

## Conocimiento de dominio (ya lo sabes — úsalo)

No vuelvas a descubrir esto desde cero; está fijado por SPEC 05 y SPEC 06.

### El patrón de integración (de SPEC 05 / `components/AsteroidsGame.tsx`)

- El juego se porta a un componente React `"use client"` llamado `components/<Pascal>Game.tsx` (p. ej. `TetrisGame.tsx`, `ArkanoidGame.tsx`).
- Props del componente: `{ paused, onScore, onLives, onLevel, onGameOver }`.
- **Toda la lógica del juego vive como variables locales dentro de un único `useEffect`** (clases, globals, funciones del `game.js` original). No se exportan globals ni se importa el `game.js` como módulo.
- El canvas se obtiene con `useRef<HTMLCanvasElement>`, no con `document.getElementById`.
- `pausedRef` (un `useRef<boolean>` sincronizado en cada render) se lee dentro del game loop para evitar **stale closures** sobre el prop `paused`.
- `gameOverFired` (flag local) garantiza que `onGameOver(score)` se llame **una sola vez**.
- Se compara `score`/`lives`/`level` con el valor previo en cada frame y se llaman los callbacks **solo cuando cambian**.
- Se **elimina `drawHUD()`** y las **overlays del canvas** (p. ej. "GAME OVER"): el HUD y el modal viven en la plataforma; dos serían redundantes.
- El game loop salta `update(dt)` cuando `pausedRef.current` es `true`, pero sigue dibujando.
- El **cleanup** del `useEffect` cancela el `requestAnimationFrame` y quita los listeners de teclado (y ratón/click si los hubiera).

### El touchpoint en `components/GamePlayer.tsx`

- `GamePlayer` ya es genérico salvo una **bifurcación por `id`** (alrededor de `GamePlayer.tsx:98`): hoy `id === 'rocas'` renderiza `<AsteroidsGame .../>` y cualquier otro `id` cae al placeholder `.game-arena`.
- El juego nuevo añade su propia rama: `id === '<game_id>'` → `<NuevoGame key={gameKey} paused={paused || over} onScore={setScore} onLives={setLives} onLevel={setLevel} onGameOver={(s) => { setScore(s); setOver(true) }} />`.
- El resto de `GamePlayer` (estado `score`/`lives`/`level`/`gameKey`/`paused`/`over`/`saved`, `restart()`, el handler de "Guardar puntuación") **ya funciona para cualquier juego**. No lo rediseñes.

### El leaderboard ya es genérico (no se reconstruye)

- El `insert` a la tabla `scores` en `GamePlayer`, y las queries de `components/GameDetail.tsx` y `components/HallOfFame.tsx`, **operan por `game_id`**. Funcionan automáticamente para cualquier juego.
- Lo único que un juego nuevo necesita para tener leaderboard es **existir como fila en la tabla `games`**.

### La tabla `games` y los 8 juegos ya sembrados

SPEC 06 sembró 8 juegos. Sus `id` son: `rocas`, `caida`, `bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`. **Antes de proponer un INSERT, comprueba si la fila ya existe** (vía las herramientas MCP de Supabase: `list_tables` / `execute_sql` con un `SELECT`). Para los juegos de referencia, la fila normalmente **ya existe** y no hay que tocar la BD.

Columnas de `games`: `id`, `title`, `short`, `long`, `cat` (`ARCADE` | `PUZZLE` | `SHOOTER` | `VERSUS`), `cover` (clase CSS, p. ej. `cover-rocas`), `color` (`cyan` | `magenta` | `yellow` | `green`), `best` (int), `plays` (text).

### Juegos de referencia disponibles (`references/started-games/`)

- `02-asteroids` — **ya integrado** como `rocas` (SHOOTER, `yellow`, `cover-rocas`).
- `03-tetris` — mapea a `caida` (PUZZLE, `magenta`, `cover-tetro`). Canvas `300×600`, HUD en el DOM, **sin "vidas"** (usa líneas y nivel), controles flechas + Space + P.
- `04-arkanoid` — mapea a `bloque-buster` (ARCADE, `cyan`, `cover-bricks`). Canvas `800×600`, **init asíncrono** (carga spritesheet + audio), controles ratón + teclado.

### Checklist de variabilidad entre juegos (el spec debe resolver cada punto)

- **Canvas**: id y tamaño (w/h fijos) del original.
- **Nombres de variables de estado**: `score`/`lives`/`level` vs variantes (`currentLevel`, `gameOver`, `gameState`). Hay que mapearlas a los callbacks.
- **Modelo sin vidas** (p. ej. Tetris): decidir explícitamente qué se hace con `onLives` (no llamarlo y dejar el HUD fijo, o reinterpretar el campo). **Pregunta obligatoria.**
- **Init síncrono vs asíncrono** (p. ej. Arkanoid carga spritesheet/audio): la carga ocurre dentro del `useEffect` y el loop arranca tras resolverse; el cleanup debe contemplarlo.
- **Ubicación del HUD** (canvas vs DOM): siempre se suprime el HUD del juego y se usa el de la plataforma.
- **Controles extra** (ratón/click además de teclado): se manejan dentro del componente y se limpian en el cleanup.
- **Assets** (imágenes/sonidos): se copian a `public/` y se referencian con rutas absolutas (`/...`).

## Flujo del comando

- Sigue las cinco fases en orden. **No te saltes fases.**
- Responde en el mismo idioma del prompt inicial (este proyecto trabaja en español).

### Fase 1 — Entender el contexto

1. Lee `CLAUDE.md` y `AGENTS.md` para las convenciones del repo.
2. **Lee el skill `/spec` como referencia de convenciones de spec**: `.claude/skills/spec/SKILL.md` (flujo y reglas del método spec-driven) y `.claude/skills/spec/template.md` (forma y reglas globales de un spec del repo). El spec que generes debe respetar esas convenciones.
3. Lista `specs/` para ver la numeración existente y fijar el próximo `NN`.
4. Lee SPEC `05-asteroids-rocas.md` y `06-auth-schema-salon.md` como patrón canónico, y echa un vistazo a `components/AsteroidsGame.tsx` y `components/GamePlayer.tsx` para confirmar que el patrón descrito arriba sigue vigente.
5. Lista `references/started-games/` para ver qué juegos hay disponibles.

Si `$ARGUMENTS` viene vacío, pide al usuario una descripción de **una sola frase** del juego a integrar.

### Fase 2 — Determinar la fuente y el juego

A partir del argumento, decide cuál de las dos fuentes aplica:

- **Juego de referencia** (`references/started-games/<n>-<nombre>/`): **inspecciona su anatomía** antes de preguntar nada — el id y tamaño del canvas (en `index.html` y el JS), las variables de estado y sus valores, el game loop (`requestAnimationFrame`, `update(dt)`/`draw()`), los controles, si el init es síncrono o asíncrono, y si usa assets (imágenes/sonidos). Esto alimenta las preguntas y el spec.
- **Escribir desde cero**: recoge la mecánica del juego (objetivo, controles, condición de game over, sistema de puntuación, si tiene vidas/niveles). El spec describirá un componente nuevo escrito siguiendo el patrón AsteroidsGame.

Resuelve el `game_id` de plataforma propuesto y **comprueba vía MCP si ya existe en `games`** (`SELECT ... FROM games WHERE id = '<game_id>'`). Anota el resultado: determina si el spec necesita o no un paso de INSERT.

### Fase 3 — Clarificar mediante preguntas

Usa `AskUserQuestion`, en bloques. Detecta ambigüedades y pregunta; no asumas. Cubre como mínimo:

- **Identidad**: `game_id` (slug), `title`, `short` (una línea para la card), `long` (descripción de detalle), `cat`, `color`, clase `cover-*`. Para juegos de referencia, propón los valores ya sembrados y solo confírmalos.
- **Fila en `games`**: ¿ya existe (no tocar BD) o hay que insertarla vía MCP? Usa el resultado de la Fase 2 como recomendación.
- **Canvas**: tamaño fijo (w/h) tal como en el original.
- **Mapeo de estado al HUD** (score/lives/level): cómo se conecta el estado del juego a `onScore`/`onLives`/`onLevel`; y para juegos **sin vidas**, qué se hace con `onLives`. (Obligatoria.)
- **Init asíncrono / assets**: ¿hay spritesheet o sonidos? ¿se copian a `public/`?
- **Controles**: teclado, y ratón/click si aplica.
- **Fuera de alcance**: qué se deja explícitamente para otro spec.

Cuando ofrezcas opciones, da 2–4 y marca tu recomendación con su porqué. Deja de preguntar cuando puedas responder, sin asumir: (1) qué archivos aparecen o cambian, (2) cuál es el primer y último paso ejecutable, (3) cómo se verifica que el juego quedó integrado.

### Fase 4 — Desarrollar el spec sección por sección

No generes el spec completo de una vez. Desarrolla las secciones de `template.md` **una por una**, mostrando cada una y esperando confirmación antes de la siguiente. Orden estricto:

1. **Header** (Status `Draft`, Depends on `SPEC 05, SPEC 06`, Date de hoy, Objetivo de una frase).
2. **Scope** (In/Out; el "Out" explícito).
3. **Data model** (la interfaz de props del componente + la fila de `games` solo si es nueva).
4. **Implementation plan** (pasos numerados, cada uno deja el sistema funcional, con su prueba manual).
5. **Acceptance criteria** (checklist booleano).
6. **Decisions** (tomadas y descartadas, con razón).
7. **Risks** (solo si aplica).

Tras cada sección, muéstrala en markdown y pregunta si queda así o quiere ajustarla.

### Fase 5 — Guardar el spec

Cuando todas las secciones estén confirmadas:

1. Determina el próximo número secuencial mirando `specs/`.
2. Confirma con el usuario el nombre de archivo `specs/NN-<slug>-game.md` antes de escribirlo.
3. Crea el archivo con todas las secciones aprobadas, `Status: Draft` y `Date:` la fecha actual.
4. Confirma al usuario: la ruta creada; que está en `Draft` (que lo cambie a `Approved` tras releerlo); y que el siguiente paso es `/spec-impl NN-<slug>-game`.
5. **Detente aquí.** No propongas implementar ni escribir código.

## Reglas duras

- **Nunca escribas ni modifiques código** durante este comando. Solo el `.md` del spec al final.
- **Nunca alteres la base de datos.** El spec _describe_ el cambio en `games`; la _implementación_ lo aplica. Sí puedes hacer `SELECT` de solo lectura vía MCP para comprobar si una fila existe.
- Para Supabase, el spec instruye usar **herramientas MCP** (`apply_migration` / `execute_sql`), **no** copiar SQL al SQL Editor (a diferencia de SPEC 06).
- **Un solo juego por spec.**
- **Nunca asumas metadatos** (id, título, categoría, color, cover) sin confirmarlos con el usuario.
- **No ejecutes `/spec-impl`** ni propongas implementar tras guardar. Tu trabajo termina cuando el archivo está escrito.
- **No generes el spec completo en una sola respuesta.** Sección por sección, con confirmación.

## Tono al preguntar

Directo y específico. No te disculpes por preguntar. Cuando hay varias preguntas, una por línea y numeradas. Ofrece defaults razonables (sobre todo para juegos de referencia, donde los metadatos ya están sembrados y solo hay que confirmarlos).

## Argumentos

- `/add-game tetris` o `/add-game 03-tetris` → trata el argumento como el juego de referencia a integrar; resuelve su `game_id` (`caida`) y confírmalo.
- `/add-game "un clon de Snake"` → fuente "escribir desde cero"; recoge la mecánica en la Fase 2/3.
- `/add-game` sin argumentos → pide la descripción de una frase.
