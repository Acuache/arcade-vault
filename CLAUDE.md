# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project overview

**Arcade Vault** is a Next.js (App Router) site for playing retro arcade games online and competing on shared leaderboards ("Salón de la Fama"). The repo is currently a fresh `create-next-app` scaffold — `app/page.tsx`, `app/layout.tsx`, and `app/globals.css` are still the default template and have not yet been built out into the real product.

## Commands

```bash
npm run dev     # start dev server (next dev)
npm run build   # production build (next build)
npm run start   # run the production build (next start)
npm run lint    # eslint
```

There is no test runner configured.

## Stack

- Next.js 16.2.9 (App Router), React 19, TypeScript (strict)
- Tailwind CSS v4 via `@tailwindcss/postcss` (theme tokens defined with `@theme inline` in `app/globals.css`)
- ESLint 9 flat config (`eslint.config.mjs`) extending `eslint-config-next` core-web-vitals + typescript
- Path alias `@/*` → repo root (see `tsconfig.json`)

⚠️ Next.js 16 differs from the version in your training data. Before using any App Router API (routing conventions, data fetching, config options, etc.), check `node_modules/next/dist/docs/01-app/` for the current behavior — see `AGENTS.md`.

## Spec-driven workflow

This repo follows a spec-driven process using two custom skills installed from `Klerith/fernando-skills` (tracked in `skills-lock.json`):

- **`/spec <description>`** — interactively designs a new feature spec section by section, asking clarifying questions, and saves it to `specs/NN-slug.md` with state `Draft`. It never writes code.
- **`/spec-impl <NN-slug>`** — only proceeds if the spec's state means "Approved". On success it creates/switches to a branch `spec-NN-slug` and implements the plan step by step, pausing for review after each step.

When asked to build a feature, check whether a spec for it already exists in `specs/` and what state it's in before writing code — `/spec-impl` will refuse to run against a non-approved spec.

## Design reference (`references/templates/`)

This folder is a **standalone, runnable HTML/JSX prototype** (vanilla React 18 + Babel via CDN, no build step — open `Arcade Vault.html` directly) that defines the intended UI, design system, and data shapes for the real Next.js app. It is reference material, not part of the build. When implementing screens in `app/`, port the structure/behavior from these files rather than designing from scratch:

- **`styles.css`** — the retro/neon design system: CSS variables for colors (`--cyan`, `--magenta`, `--yellow`, `--green`, `--gold`, etc.), the pixel font (`Press Start 2P`) and mono font (`JetBrains Mono`), animated grid/scanline background.
- **`data.jsx`** — mock domain data: `GAMES` (id, title, short/long description, category, cover, color, best score, play count), `CATS` (category filters), `PLAYERS`, and `seededScores(seed, count)` — a deterministic pseudo-random leaderboard generator.
- **`app.jsx`** — top-level app shell with hash-based routing (`route = { name, id? }` synced to `location.hash`), current user persisted to `localStorage` (`av_user`), and saved scores persisted to `localStorage` (`av_scores`).
- **`nav.jsx`** — top nav bar + mobile slide-out menu (Biblioteca / Salón de la Fama / auth).
- **`biblioteca.jsx`** — game library/catalog screen (`Library`, `GameCard`) with search and category filtering.
- **`detalle.jsx`** — game detail screen (`GameDetail`): info, tags, stats, and that game's leaderboard.
- **`reproductor.jsx`** — game player screen (`GamePlayer`): simulated gameplay HUD (score, lives, level, pause/end, score submission).
- **`salon.jsx`** — Hall of Fame screen (`HallOfFame`): per-game podium + leaderboard tabs across all games.
- **`auth.jsx`** — login/signup screen (`Auth`) with guest mode.

The five route names in the prototype (`biblioteca`, `detalle`, `player`, `auth`, `salon`) map naturally to App Router segments under `app/`.
