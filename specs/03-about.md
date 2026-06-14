# SPEC 03 — Página "Acerca de" (About + Contacto)

> **Status:** Implementado · **Depends on:** SPEC 02 · **Date:** 2026-06-11
> **Objective:** Portar `about.jsx` (referencia `references/templates/home-about/`) como la nueva página `/about` —hero "Acerca de" + sección de contacto decorativa—, agregando el link "Acerca de" al Nav (desktop y móvil) y el bloque CSS "ABOUT PAGE" de `home-about/styles.css` a `app/globals.css`.

## Scope

**In:**

- Nueva página `/about` (`app/about/page.tsx`), que renderiza `components/About.tsx` — port completo de `about.jsx`:
  - Sección hero "ACERCA DE": kicker, título, párrafo de misión, fila de 3 highlights (corazón, navegador, planta) con `HighlightIcon`.
  - Banner divisor animado (`.about-divider`, pixeles parpadeantes).
  - Sección "CONTACTO": columna de intro + tips, y formulario (`contact-form`) con validación local (animación `shake` si falta algún campo) y "terminal de éxito" simulada al enviar; botón "ENVIAR OTRO MENSAJE" reinicia el formulario.
  - `About` es Client Component (`"use client"`), usa el hook compartido `useReveal` para las animaciones `.reveal` (igual patrón que `Home`).
- Extracción del hook `useReveal` (hoy función no exportada dentro de `Home.tsx`) a `lib/useReveal.ts`, reutilizado por `Home.tsx` y `About.tsx`.
- Port del bloque "ABOUT PAGE" de `references/templates/home-about/styles.css` (~líneas 1071-1150) a `app/globals.css`, omitiendo reglas que ya existen (`.reveal`, `.divider`, `.fade-in`).
- Actualización de `components/Nav.tsx`:
  - Nuevo link "Acerca de" → `/about`, ubicado después de "Salón de la Fama" y antes del botón de auth, tanto en el nav de escritorio como en el menú móvil.
  - `isActive` extendido con el caso `"about"`.

**Out of scope (para futuras specs):**

- Envío real de mensajes (email, API, backend) — el formulario sigue siendo decorativo/local, sin persistencia ni red.
- Bloque "GAMEPAD" del CSS (~580 líneas) — sigue sin relacionarse con ninguna pantalla especificada.
- Cambios al footer global, `/salon`, `/login`, `/game`, `lib/data.ts` o `lib/session.tsx`.
- Tests automatizados.

## Data model

Esta spec no introduce estructuras de datos compartidas ni tipos nuevos en `lib/data.ts`. El único estado es local a `About.tsx`, portado tal cual del prototipo:

```ts
type ContactForm = { name: string; email: string; msg: string };

const [form, setForm] = useState<ContactForm>({ name: "", email: "", msg: "" });
const [sent, setSent] = useState<string | null>(null); // nombre enviado, para el mensaje de éxito
const [shake, setShake] = useState(false); // animación cuando falta algún campo
```

`lib/useReveal.ts` exporta un hook sin parámetros ni valor de retorno, extraído de `Home.tsx` sin cambios de lógica:

```ts
export function useReveal(): void;
```

## Implementation plan

1. **Extraer `useReveal` a `lib/useReveal.ts`.** Crear el archivo con el hook extraído de `Home.tsx` (misma lógica, sin cambios). Actualizar `Home.tsx` para importarlo desde `@/lib/useReveal` y eliminar la definición local. Prueba manual: `npm run dev` sigue sirviendo `/` sin errores; las animaciones `.reveal` del Home siguen funcionando igual al hacer scroll.

2. **CSS del About.** Portar el bloque "ABOUT PAGE" de `references/templates/home-about/styles.css` (~líneas 1071-1150) a `app/globals.css`, omitiendo reglas que ya existen (`.reveal`, `.divider`, `.fade-in`). Prueba manual: `npm run dev` sigue sirviendo todas las páginas sin errores ni warnings nuevos de `npm run lint`.

3. **Página `/about`.** Crear `components/About.tsx` (Client Component, `"use client"`) con el port completo de `about.jsx`: hero "ACERCA DE" (kicker, título, misión, fila de highlights con `HighlightIcon` no exportada), banner divisor animado, sección "CONTACTO" (intro + tips + formulario con validación local/shake/terminal de éxito/"enviar otro mensaje"), usando `useReveal` de `lib/useReveal.ts`. Crear `app/about/page.tsx` que renderiza `<About />`. Prueba manual: `/about` muestra el hero, highlights, divisor animado y sección de contacto con el diseño del prototipo; enviar el formulario vacío dispara el "shake"; completarlo y enviarlo muestra la terminal de éxito con el nombre ingresado; "ENVIAR OTRO MENSAJE" reinicia el formulario.

4. **Nav: link "Acerca de".** Actualizar `components/Nav.tsx`: agregar `Link href="/about"` con texto "Acerca de" después de "Salón de la Fama" y antes del botón de auth, en el nav de escritorio y en el menú móvil; extender `isActive` con el caso `"about"` (`pathname === "/about"`). Prueba manual: el link "Acerca de" aparece en desktop y en el menú móvil, navega a `/about`, y se resalta como activo solo en esa ruta.

## Acceptance criteria

- [x] `npm run dev` arranca sin errores y `npm run lint` pasa sin errores ni warnings nuevos.
- [x] `/about` muestra el hero "ACERCA DE": kicker, título con gradiente, párrafo de misión y fila de 3 highlights (corazón, navegador, planta) con sus iconos.
- [x] El banner divisor animado (pixeles parpadeantes) aparece entre el hero y la sección de contacto.
- [x] La sección "CONTACTO" muestra la columna de intro (kicker, título, texto, 3 tips con LED) y el formulario con campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE.
- [x] Enviar el formulario con algún campo vacío dispara la animación "shake" y no avanza al estado de éxito.
- [x] Enviar el formulario con los 3 campos completos reemplaza el formulario por la "terminal de éxito" mostrando el nombre ingresado en mayúsculas.
- [x] El botón "ENVIAR OTRO MENSAJE" en la terminal de éxito vuelve a mostrar el formulario vacío.
- [x] Las secciones marcadas con `.reveal` (`about-divider`, `about-contact`) aparecen con la animación de entrada al hacer scroll.
- [x] El Nav (desktop y móvil) muestra "Acerca de" después de "Salón de la Fama" y antes del botón de auth/login, y navega a `/about`.
- [x] El Nav resalta "Acerca de" como activo solo en `/about`.
- [x] `/` (Home) sigue funcionando igual que antes, incluidas sus animaciones `.reveal` (usando el `useReveal` ahora compartido).

## Decisions

- **Sí:** ruta `/about` (no `/acerca-de`). Es corta, coincide con el nombre de ruta `about` del prototipo y es convención común en sitios en español.
- **No:** `/acerca-de`. Descartado para mantener nombres de ruta cortos, igual que `/game` y `/salon`.
- **Sí:** extraer `useReveal` a `lib/useReveal.ts`, compartido entre `Home.tsx` y `About.tsx`. Evita duplicar ~15 líneas idénticas; `Home.tsx` se actualiza para importarlo desde ahí.
- **No:** duplicar `useReveal` dentro de `About.tsx`. Aunque SPEC 02 prefirió "todo en un archivo" para componentes de un solo uso, `useReveal` deja de ser de un solo uso al usarse en dos componentes.
- **Sí:** formulario de contacto 100% decorativo/local (validación `shake` + "terminal de éxito" simulada), sin red ni backend — consistente con la decisión de SPEC 01 de "sin backend".
- **No:** envío real de mensajes (email/API). Fuera de alcance del MVP visual.
- **Sí:** "Acerca de" en el Nav después de "Salón de la Fama" y antes del botón de auth, en desktop y móvil — mismo orden que `home-about/nav.jsx`.
- **Sí:** `HighlightIcon` como función no exportada dentro de `About.tsx`, mismo patrón que `FeatureIcon` en `Home.tsx`.
- **No:** portar el bloque "GAMEPAD" del CSS (~580 líneas) — sigue sin relacionarse con ninguna pantalla especificada (decisión heredada de SPEC 02).
- **Sí:** al portar el bloque "ABOUT PAGE", omitir reglas ya existentes en `globals.css` (`.reveal`, `.divider`, `.fade-in`) para evitar declaraciones duplicadas.

## Risks

| Risk                                                                                                                                                                                       | Mitigation                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Al portar el bloque "ABOUT PAGE" de `home-about/styles.css`, podrían colarse declaraciones duplicadas con reglas ya existentes en `globals.css` (`.reveal`, `.divider`, `.fade-in`, etc.). | Revisar con `grep` antes de pegar el bloque y omitir/fusionar las reglas que ya existen (paso 2 del plan).                                              |
| Extraer `useReveal` a `lib/useReveal.ts` y actualizar `Home.tsx` para importarlo podría romper las animaciones de aparición del Home si se introduce algún cambio sutil.                   | Copiar la lógica del hook sin modificarla; probar `/` manualmente tras el paso 1 para confirmar que las animaciones `.reveal` siguen funcionando igual. |

## What is **not** in this spec

- Envío real de mensajes (email, API, backend).
- Bloque "GAMEPAD" del CSS (~580 líneas).
- Cambios al footer global, `/salon`, `/login`, `/game`, `lib/data.ts` o `lib/session.tsx`.
- Tests automatizados.

Cada uno de estos, si llega a implementarse, va en su propio spec.
