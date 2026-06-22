# SPEC 06 — Auth, esquema de Supabase y Salón de la Fama

> **Status:** Implementado · **Depends on:** SPEC 04 · **Date:** 2026-06-21
> **Objective:** Crear las tablas `games` y `scores` en Supabase con seed de datos, implementar auth por correo e invitado (alias en localStorage), migrar y eliminar `lib/data.ts`, conectar el guardado real de puntuaciones desde `GamePlayer`, e implementar la pantalla `/salon` con el leaderboard por juego.

## Scope

**In:**

- Tabla `games` en Supabase: columnas `id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`. SQL seed con los 8 juegos de `lib/data.ts`.
- Tabla `scores` en Supabase: columnas `id`, `game_id` (FK → games), `user_id` (nullable, FK → auth.users), `alias` (string, nombre de display), `score` (int), `created_at`. RLS básico: cualquiera puede leer; cualquiera puede insertar (autenticado o anónimo).
- Auth por correo/contraseña vía Supabase Auth + modo invitado (alias guardado en `localStorage` bajo la clave `av_alias`).
- Pantalla `/auth` — signup, login y entrada como invitado, portada desde `references/templates/auth.jsx`.
- `lib/types.ts` — nuevo archivo con los tipos `Game`, `GameCategory`, `GameColor`, `ScoreRow` que antes vivían en `lib/data.ts`.
- Migración: actualizar los 6 componentes que importan `lib/data.ts` (`GamePlayer`, `Home`, `Library`, `GameDetail`, `HallOfFame`, `GameCard`) para leer de Supabase. Eliminar `lib/data.ts`.
- Conectar el botón "Guardar puntuación" en `GamePlayer`: inserta en `scores` usando el `user_id` del usuario autenticado (o `null`) y el alias de `localStorage('av_alias')` o del perfil del usuario.
- Pantalla `/salon` — leaderboard por juego (podio top-3 + tabla de 12 scores), portada desde `references/templates/salon.jsx`, leyendo scores reales de Supabase.

**Out of scope (para futuras specs):**

- OAuth (Google, GitHub) — solo correo/invitado en este spec.
- Middleware de refresco de sesión (`proxy.ts`) — la sesión se lee al montar, no se refresca en cada request.
- Juegos distintos de "rocas" con lógica real — el resto sigue con placeholder.
- Redimensionamiento responsivo del canvas de Asteroids.
- Paginación del leaderboard (más de 12 scores por juego).
- Tests automatizados.

## Data model

### SQL — ejecutar en Supabase SQL Editor

```sql
-- Tabla de juegos
CREATE TABLE games (
  id     text PRIMARY KEY,
  title  text NOT NULL,
  short  text NOT NULL,
  long   text NOT NULL,
  cat    text NOT NULL,   -- 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS'
  cover  text NOT NULL,   -- clase CSS, e.g. 'cover-rocas'
  color  text NOT NULL,   -- 'cyan' | 'magenta' | 'yellow' | 'green'
  best   integer NOT NULL DEFAULT 0,
  plays  text NOT NULL DEFAULT '0'
);

-- Seed de los 8 juegos
INSERT INTO games VALUES
  ('bloque-buster', 'BLOQUE BUSTER', 'Rebota la pelota y destruye muros de neón.', 'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?', 'ARCADE', 'cover-bricks', 'cyan', 28450, '12.4K'),
  ('caida',         'CAÍDA',         'Encaja las piezas antes de que el techo te aplaste.', 'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.', 'PUZZLE', 'cover-tetro', 'magenta', 184220, '31.8K'),
  ('serpentina',    'SERPENTINA',    'Crece sin morder tu propia cola.', 'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.', 'ARCADE', 'cover-snake', 'green', 7820, '9.1K'),
  ('gloton',        'GLOTÓN',        'Devora puntos y escapa de los fantasmas.', 'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.', 'ARCADE', 'cover-glot', 'yellow', 96400, '27.2K'),
  ('invasores',     'INVASORES',     'Defiende el planeta de filas alienígenas.', 'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.', 'SHOOTER', 'cover-invaders', 'green', 54190, '18.0K'),
  ('rocas',         'ROCAS',         'Pulveriza asteroides en gravedad cero.', 'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.', 'SHOOTER', 'cover-rocas', 'yellow', 41200, '15.6K'),
  ('ranaria',       'RANARIA',       'Cruza la autopista de pixeles.', 'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.', 'ARCADE', 'cover-rana', 'green', 18900, '6.4K'),
  ('duelo-pixel',   'DUELO PIXEL',   'Dos paletas. Una pelota. Reflejos máximos.', 'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.', 'VERSUS', 'cover-duelo', 'cyan', 24, '4.2K');

-- Tabla de scores
CREATE TABLE scores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id    text NOT NULL REFERENCES games(id),
  user_id    uuid REFERENCES auth.users(id),  -- NULL para invitados
  alias      text NOT NULL,
  score      integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE games  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "games: lectura pública"   ON games  FOR SELECT USING (true);
CREATE POLICY "scores: lectura pública"  ON scores FOR SELECT USING (true);
CREATE POLICY "scores: inserción abierta" ON scores FOR INSERT WITH CHECK (true);
```

### TypeScript — `lib/types.ts`

```ts
export type GameCategory = 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS'
export type GameColor = 'cyan' | 'magenta' | 'yellow' | 'green'

export type Game = {
  id: string
  title: string
  short: string
  long: string
  cat: GameCategory
  cover: string
  color: GameColor
  best: number
  plays: string
}

export type ScoreRow = {
  rank: number
  alias: string
  score: number
  created_at: string // ISO timestamp de Supabase
}
```

## Implementation plan

1. **Crear esquema en Supabase.**
   Ejecutar el bloque SQL del modelo de datos en el SQL Editor de Supabase: tablas `games` y `scores`, seed de 8 juegos, políticas RLS.
   Prueba manual: el dashboard de Supabase muestra las dos tablas; `games` tiene 8 filas.

2. **Crear `lib/types.ts`.**
   Nuevo archivo con `GameCategory`, `GameColor`, `Game`, `ScoreRow` (con `alias` y `created_at` en lugar de `name` y `date`).
   Prueba manual: `npm run lint` pasa sin errores.

3. **Implementar auth: `lib/useAuth.ts`.**
   Hook React (`"use client"`) que expone `user` (objeto de Supabase Auth o `null`), `alias` (leído de `localStorage('av_alias')` si no hay usuario autenticado), `signUp(email, password)`, `signIn(email, password)`, `signOut()`. Usa el cliente de `lib/supabase/client.ts`.
   Prueba manual: compilación limpia; el hook no rompe ningún componente existente.

4. **Pantalla `/auth`.**
   Crear `app/auth/page.tsx` + `components/Auth.tsx` portado desde `references/templates/auth.jsx`. Tres flujos: signup (correo + contraseña), login, e "Invitado" (campo de alias → guarda en `localStorage('av_alias')` → redirige a `/biblioteca`). Actualizar el nav para que el botón de auth apunte a `/auth`.
   Prueba manual: navegar a `/auth`; completar signup crea un usuario en Supabase Auth; el botón "Invitado" guarda el alias y redirige.

5. **Migrar los 6 componentes a Supabase.**
   Reemplazar imports de `lib/data.ts` en `Home`, `Library`, `GameCard`, `GameDetail`, `HallOfFame` y `GamePlayer` por llamadas a Supabase (`createClient().from('games').select(...)` en Server Components; cliente de browser en Client Components). Importar tipos desde `lib/types.ts`. Añadir estados de carga (`loading`) donde sea necesario.
   Prueba manual: `/biblioteca` lista los 8 juegos; `/game/[id]` carga el detalle correcto; ningún componente muestra errores en consola.

6. **Eliminar `lib/data.ts`.**
   Verificar con `grep -r "lib/data"` que no queda ningún import. Borrar el archivo.
   Prueba manual: `npm run build` termina sin errores.

7. **Conectar "Guardar puntuación" en `GamePlayer`.**
   En el handler del botón: leer alias de `user.email` (autenticado) o `localStorage('av_alias')` (invitado). Si no hay alias, redirigir a `/auth`. Insertar `{ game_id: id, user_id: user?.id ?? null, alias, score }` en la tabla `scores` via cliente de Supabase. Marcar `setSaved(true)` al resolver.
   Prueba manual: jugar Rocas → guardar puntuación → la fila aparece en la tabla `scores` de Supabase.

8. **Implementar `/salon`.**
   Crear `app/salon/page.tsx`. Actualizar `components/HallOfFame.tsx` con la estructura de `references/templates/salon.jsx`: pestañas por juego, podio top-3, tabla de los 12 mejores scores. Los datos vienen de `SELECT * FROM scores WHERE game_id = ? ORDER BY score DESC LIMIT 12`. El `rank` se calcula en cliente con `.map((r, i) => ({ ...r, rank: i + 1 }))`.
   Prueba manual: navegar a `/salon`; si hay scores guardados aparecen correctamente; sin scores la tabla muestra estado vacío.

## Acceptance criteria

- [x] `npm run dev` arranca sin errores y `npm run lint` pasa sin errores ni warnings nuevos.
- [x] `npm run build` completa sin errores.
- [x] La tabla `games` en Supabase tiene exactamente 8 filas con los datos correctos.
- [x] La tabla `scores` existe con RLS activo (lectura pública, inserción abierta).
- [x] `lib/data.ts` no existe en el repositorio.
- [x] `lib/types.ts` existe y exporta `Game`, `GameCategory`, `GameColor`, `ScoreRow`.
- [x] Ningún archivo del proyecto importa desde `lib/data.ts`.
- [x] Navegar a `/auth` muestra formulario de signup/login y botón de invitado.
- [x] Signup con correo/contraseña crea un usuario en Supabase Auth Dashboard.
- [x] El botón "Invitado" guarda el alias en `localStorage('av_alias')` y redirige a `/biblioteca`.
- [x] `/biblioteca` carga los 8 juegos desde Supabase (sin datos hardcodeados).
- [x] Al terminar una partida de Rocas y pulsar "Guardar puntuación", aparece una nueva fila en la tabla `scores` de Supabase con el `game_id`, `alias` y `score` correctos.
- [x] `/salon` muestra el leaderboard con los scores reales de Supabase, ordenados de mayor a menor.

## Decisions

- **Sí:** todo en un solo spec en lugar de dos o tres. Decisión explícita del usuario tras proponer la separación; se registra aquí como definición rápida sin clarificación detallada de secciones intermedias.
- **No:** OAuth (Google/GitHub). Fuera del alcance; solo correo + invitado en esta iteración.
- **Sí:** `lib/types.ts` para los tipos compartidos. Eliminar `lib/data.ts` sin un reemplazo de tipos rompería los 6 componentes dependientes.
- **Sí:** RLS con inserción abierta en `scores`. No hay OAuth ni roles complejos; la inserción abierta permite que invitados (sin `user_id`) también guarden scores sin un endpoint intermedio.
- **Sí:** alias de invitado en `localStorage('av_alias')`. Consistente con cómo el prototipo persiste el usuario (`av_user`). El alias se pide una sola vez.
- **No:** middleware de refresco de sesión (`proxy.ts`). Se descartó en SPEC 04 hasta tener auth; se mantiene fuera de este spec para no ampliar más el alcance.
- **Sí:** eliminar `lib/data.ts` completamente (incluidos `PLAYERS`, `CATS`, `seededScores`). El usuario lo solicitó explícitamente para no dejar archivos sin uso. `CATS` pasa a ser una constante inline donde se necesite.

## Risks

| Riesgo                                                                                                                                                                     | Mitigación                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Los 6 componentes que leían datos síncronos de `lib/data.ts` ahora son async (Supabase). Server Components sin loading state muestran pantalla en blanco durante el fetch. | Añadir `loading` state o usar `Suspense` en cada componente migrado.                                                       |
| `ScoreRow` cambia de `name`/`date` a `alias`/`created_at`; cualquier componente que use las propiedades antiguas fallará en compilación.                                   | El cambio de tipos fuerza errores de TypeScript en todos los puntos de uso — sirve de checklist de migración.              |
| Inserción abierta en `scores` permite spam o datos basura.                                                                                                                 | Aceptable para la fase actual sin usuarios reales; se puede endurecer con RLS por `user_id` en un spec de auth más maduro. |

## What is **not** in this spec

- OAuth (Google, GitHub).
- Middleware de refresco de sesión.
- Soporte para juegos distintos de "rocas" con lógica real.
- Paginación del leaderboard.
- Tests automatizados.

Cada uno de estos, si llega a implementarse, va en su propio spec.
