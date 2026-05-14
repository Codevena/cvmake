# Editor Redesign — Showcase-Brand + Restructure + Public Deploy

**Author:** Markus Wiesecke
**Date:** 2026-05-14
**Status:** Spec — awaiting approval

---

## 1. Goal

Make the `apps/web` editor production-presentable so it can be deployed publicly at `editor.cvmake.codevena.dev` before the launch. Today the editor works but looks like a default Tailwind tutorial app (generic blue-on-white, flat borders, no brand). After this work it should feel like the natural twin of the showcase landing page: dark, editorial, sand-accented.

This unblocks the launch copy's claim of a "live web editor" — which is currently false (cvmake.codevena.dev is a static showcase, the editor only runs locally via `pnpm dev`).

## 2. Non-goals

- No new editor *features* (no new CV sections, no new export formats, no template changes).
- No i18n infrastructure — UI ships hardcoded English. (German retrofit is a later, separate effort.)
- No user accounts / cloud storage / database. The public deploy is a stateless demo.
- No mobile-first redesign. Desktop is the primary target; the layout should not *break* on tablet but phone is out of scope.
- No change to the CV schema, the renderer, the CLI, or the published npm packages.
- The static showcase (`apps/showcase`) keeps its current deploy (GitHub Pages) — only gains one link.

## 3. Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Aesthetic | **Showcase Match** — dark, Fraunces + Inter, sand/parchment accent |
| Layout | **Restructure** — 56px TopBar, 72px icon Sidebar, tab-nav form area, ~1.5× wider Preview |
| UI language | **English** — hardcoded, no i18n library |
| Command palette | **Yes** — `cmdk` library, ⌘K |
| Public persistence | **Demo mode** — browser-memory only, no save-to-disk on prod |
| Hosting | **Coolify on Hetzner**, subdomain `editor.cvmake.codevena.dev` |

## 4. Visual language

Replace the editor's design tokens with the showcase brand. The web app already imports `@codevena/cvmake-ui/styles/tailwind.css`, so the change is centralized in that one file (plus `apps/web/app/globals.css` if any app-level tokens exist).

New `@theme` block for `packages/ui/src/styles/tailwind.css`:

```css
@theme {
  --color-bg: #0b0f17;             /* ink — app background */
  --color-surface: #11161f;        /* ink-soft — panels, topbar, sidebar */
  --color-elevated: #1a212d;       /* cards, inputs, hover states */
  --color-border: #1f2531;         /* ink-line — all hairline borders */
  --color-text: #f5efe6;           /* parchment — primary text */
  --color-text-muted: #9ca0aa;     /* secondary text, labels */
  --color-text-subtle: #6b7280;    /* placeholders, disabled */
  --color-accent: #d4a574;         /* sand — CTAs, active states, focus rings */
  --color-accent-hover: #e0b582;
  --color-accent-muted: #a98558;
  --color-error: #f87171;
  --color-success: #6ee7b7;

  --font-display: "Fraunces", Georgia, serif;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;

  --shadow-card: 0 30px 60px -30px rgba(0, 0, 0, 0.5);
  --shadow-ring: 0 0 0 1px rgba(212, 165, 116, 0.25);
}
```

Old tokens (`--color-surface: #ffffff`, `--color-accent: #2563eb`, etc.) are fully replaced. Every editor component currently using `bg-surface`, `text-text`, `border-border`, `text-accent` etc. will pick up the new values automatically — but each component must be visually reviewed because some used the light-mode assumptions implicitly (e.g. relying on a white background for contrast).

Fonts are loaded via Google Fonts `<link>` in `apps/web/app/layout.tsx` (Fraunces + Inter + JetBrains Mono), matching the showcase's font loading.

## 5. Layout — Restructure

```
┌────────────────────────────────────────────────────────────────────┐
│ TopBar  56px                                                        │
│  cvmake(Fraunces italic)   [cv.de.yaml ▼]      [⌘K]   [Export PDF]  │
├──────┬──────────────────────────────────┬──────────────────────────┤
│ Side │ TabNav:  Personal · Experience · Education · Skills · ...    │
│ bar  ├──────────────────────────────────┤                          │
│ 72px │                                  │   Preview iframe         │
│ icon │   [Active section form]          │   shadow-card frame      │
│ only │                                  │   sticky on scroll       │
│      │                                  │                          │
└──────┴──────────────────────────────────┴──────────────────────────┘
            flex 0.85                              flex 1.5
```

### 5.1 TopBar (56px, rewrite)

- `bg-surface` with `backdrop-blur`, bottom `border-border`.
- Left: "cvmake" wordmark in Fraunces italic, sand-colored.
- Center-left: CV selector — the existing `<select>` restyled as a pill (`bg-elevated`, rounded, sand focus ring).
- Right: ⌘K trigger button (subtle, `bg-elevated`, mono "⌘K" hint) + Save indicator + "Export PDF" CTA (sand background, ink text, hover-lift `-translate-y-0.5`).
- Save indicator (`SaveIndicator.tsx`) stays but restyled — in demo mode it is hidden (nothing to save).

### 5.2 Sidebar (72px, rewrite)

Icon-only vertical nav. Each icon is a button with a hover tooltip:

1. **Template** — grid icon → opens a popover/drawer with the `TemplateCard` grid (currently inline in the sidebar)
2. **Palette** — swatch icon → opens a popover with the `PaletteSelector` + `ColorPicker`
3. **Sections visibility** — eye icon → opens the `HiddenSectionsToggles` popover
4. **About / help** — info icon → links to the repo / shows keyboard shortcuts

The current `Sidebar.tsx` renders the template grid + palette selector + hidden-section toggles inline in a 320px column. The rewrite moves each into a popover triggered from the 72px icon rail. Popovers use the same `bg-surface` + `border-border` + `shadow-card` treatment.

### 5.3 Form area (tab-nav, restructure)

The current `EditorShell` renders all 7 sections stacked in one scroll. Replace with a horizontal `TabNav`:

`Personal · Experience · Education · Skills · Languages · Custom · Summary`

- Active tab: sand underline, `text-text`. Inactive: `text-text-muted`, hover `text-text`.
- Only the active section's form renders (others unmount or `hidden`). A short fade-in on switch.
- Section headlines inside each form use `font-display` (Fraunces).
- Form inputs (`Input`, `Textarea`, `Select` from `@codevena/cvmake-ui`) restyled: `bg-elevated`, `border-border`, sand focus ring, parchment text.
- Validation errors: `text-error`, shown inline as today.

Tab order matches the natural CV authoring flow. The "Hidden sections" control stays in the sidebar popover (it is a meta-control, not a section).

### 5.4 Preview (polish)

- `PreviewFrame.tsx` keeps its iframe approach.
- Wrap the iframe in a `shadow-card` frame so the white PDF "floats" on the dark background.
- Width: flex `1.5` vs the form area's flex `0.85` (preview is the hero).
- Add a subtle "rendering…" overlay (sand spinner dots) shown while the debounced CV data is being re-rendered — currently the preview just silently updates.
- Sticky on scroll so the preview stays visible while the form scrolls.

## 6. Components

| File | Action | Notes |
|---|---|---|
| `packages/ui/src/styles/tailwind.css` | rewrite | New `@theme` block (§4) |
| `apps/web/app/globals.css` | review | Add Google Fonts import or keep in layout.tsx |
| `apps/web/app/layout.tsx` | modify | Add Fraunces + Inter + JetBrains Mono `<link>` tags |
| `apps/web/components/TopBar.tsx` | rewrite | New 56px layout, italic logo, ⌘K trigger, sand CTA |
| `apps/web/components/Sidebar.tsx` | rewrite | 72px icon rail + popovers |
| `apps/web/components/EditorShell.tsx` | modify | New layout wrapper, render `TabNav`, wire ⌘K |
| `apps/web/components/PreviewFrame.tsx` | polish | shadow-card frame, rendering overlay, sticky |
| `apps/web/components/SaveIndicator.tsx` | restyle | New tokens; hidden in demo mode |
| `apps/web/components/sections/*.tsx` (7 files) | restyle + localize | New tokens, Fraunces headers, English strings |
| `apps/web/components/ConflictModal.tsx` | restyle + localize | New tokens, English strings |
| `apps/web/components/HiddenSectionsToggles.tsx` | restyle + localize | Moves into a sidebar popover |
| `apps/web/components/PhotoUploadField.tsx` | restyle + localize | New tokens, English strings |
| `apps/web/components/TagInput.tsx` | restyle | New tokens |
| **NEW** `apps/web/components/TabNav.tsx` | create | Tab navigation for the 7 sections |
| **NEW** `apps/web/components/CommandPalette.tsx` | create | `cmdk`-based ⌘K palette |
| **NEW** `apps/web/components/Popover.tsx` | create (if no primitive exists) | Lightweight popover for sidebar drawers |
| `apps/web/components/DownloadYamlButton.tsx` | create | Demo-mode "Download YAML" action |

### 6.1 CommandPalette commands

`cmdk` library (~5 KB, no extra setup). Commands:

- **Switch CV** — list `allSlugs`, navigate on select
- **Switch template** — list templates, set `rendering.template`
- **Switch palette** — list current template's palettes, set `rendering.palette`
- **Jump to section** — focus a tab (Personal, Experience, …)
- **Export PDF** — trigger the export
- **Download YAML** — (demo mode) trigger the YAML download
- **Open repo / docs** — external links

Triggered by ⌘K / Ctrl+K (a `use-hotkey` hook already exists in `apps/web/lib/`).

## 7. Localization (German → English)

The editor UI is currently German. Convert to hardcoded English.

- Roughly 80–120 strings across the 7 section files + TopBar, Sidebar, ConflictModal, PhotoUploadField, HiddenSectionsToggles, SaveIndicator.
- Per file: a `const t = { … } as const` string map at the top, inline German replaced with `t.key`. No i18n library, no locale switching — the map just keeps strings in one place per file so a future i18n pass is mechanical.
- Examples: `"Persönliche Daten"` → `"Personal"`, `"Vorname"` → `"First name"`, `"Erfahrung"` → `"Experience"`, `"Abbrechen"` → `"Cancel"`, `"Speichern"` → `"Save"`.
- Test files reference some German strings (e.g. `TopBar.test.tsx` checks for "Gespeichert"-style text) — those assertions must be updated to the English equivalents in the same task that changes the component.
- CV *data* is untouched. `cv.de.yaml` with `meta.locale: de` still renders German content. Only the editor chrome changes language.

## 8. Demo mode (public deploy safety)

The editor currently autosaves edits to `data/cvs/<slug>.yaml` on disk via `/api/save`. On a public deploy this is unacceptable — every visitor would read and overwrite the same files.

Introduce `NEXT_PUBLIC_DEMO_MODE`:

- When `NEXT_PUBLIC_DEMO_MODE === 'true'`:
  - Initial data: load `example.en.yaml` (the tracked example) as the only CV.
  - The CV selector dropdown is hidden or shows only the example.
  - Autosave is disabled — `useAutosave` is not started; edits live only in React state / browser memory.
  - `SaveIndicator` is hidden.
  - A "Download YAML" button appears next to "Export PDF" — serializes the current form state to YAML and triggers a file download.
  - A subtle one-line banner: *"Demo mode — edits are not saved. Download the YAML or use the [CLI](https://www.npmjs.com/package/@codevena/cvmake-cli) to keep your work."*
- When the env var is unset (local `pnpm dev`): current behavior unchanged — autosave to disk, CV list, save indicator all work.

Implementation: a single `isDemoMode()` helper reading `process.env.NEXT_PUBLIC_DEMO_MODE`, branched in `EditorShell` (skip `useAutosave`), `TopBar` (hide indicator, add Download YAML), and `page.tsx` (force the example slug).

`/api/save` and `/api/export` routes are unchanged — export still works in demo mode (it is stateless), save is simply never called.

## 9. Deployment

### 9.1 Hosting

The editor is a Next.js 16 app needing a Node runtime + headless Chromium (Puppeteer) for PDF export. GitHub Pages cannot host it. Target: Coolify on Markus's existing Hetzner box.

- New Coolify application `cvmake-editor`.
- Build: `pnpm install --frozen-lockfile && pnpm build`.
- Start: `pnpm --filter @codevena/cvmake-web start`.
- Runtime needs Chromium system dependencies (`libnss3`, `libatk`, `fonts-liberation`, etc.) — either a Dockerfile based on a Puppeteer-ready base image, or Coolify's nixpacks with the deps declared.
- ENV: `NEXT_PUBLIC_DEMO_MODE=true`. No secrets required (the editor is fully local-first / stateless on the server side).
- A committed `apps/web/Dockerfile` (or `nixpacks.toml`) so the build is reproducible.

### 9.2 DNS + domain

- Cloudflare: `editor.cvmake.codevena.dev` → A record to the Hetzner IP (or CNAME to the Coolify-assigned host).
- TLS via Coolify's built-in Let's Encrypt.
- The apex `cvmake.codevena.dev` is unchanged (still GitHub Pages → showcase).

### 9.3 Showcase link

`apps/showcase/index.html` gains a sand "Open editor →" button — in the top nav and/or the hero — linking to `https://editor.cvmake.codevena.dev`. This is the only change to the showcase.

## 10. Testing

- The existing 28 web test files largely test component behavior, not layout — most survive. The ones that assert on German UI strings (`TopBar.test.tsx` and any section tests checking labels) must update their assertions to English in the same task that localizes the component.
- New components (`TabNav`, `CommandPalette`, `DownloadYamlButton`) get unit tests: tab switching renders the right section, ⌘K opens/closes the palette and commands fire, Download YAML produces a valid YAML blob.
- Demo-mode branch gets a test: with `NEXT_PUBLIC_DEMO_MODE=true`, `useAutosave` is not invoked and the Download YAML button is present.
- Visual check: run `pnpm --filter @codevena/cvmake-web dev`, walk every tab, switch templates/palettes, export a PDF, trigger ⌘K — confirm against this spec.
- After the redesign, refresh the editor screenshot(s) used anywhere (none currently in the repo, but the launch drafts will want fresh ones).

## 11. Risks

| Risk | Mitigation |
|---|---|
| Dark-mode contrast regressions in restyled components | Visual review every component; the `@theme` swap is centralized so it is easy to audit |
| `cmdk` adds bundle weight / hydration quirks | ~5 KB, widely used; if it misbehaves, the palette is a progressive enhancement — editor works without it |
| Coolify + Puppeteer Chromium deps are fiddly | Use a known Puppeteer-ready Docker base image; this is a solved problem with documented setups |
| Test assertions on German strings break | Localization task explicitly includes updating the matching test files |
| Scope creep — "while we're in here, let's also…" | This spec's §2 non-goals are the fence; new features wait for v0.2.0 |
| Launch slips 1–2 days | Accepted trade-off — a credible editor is worth more at launch than hitting an arbitrary date |

## 12. Acceptance criteria

1. The editor at `pnpm --filter @codevena/cvmake-web dev` renders in the showcase aesthetic (dark, Fraunces headers, sand accents) — no generic blue/white remains.
2. Layout matches §5: 56px TopBar, 72px icon Sidebar with working popovers, tab-nav form area, ~1.5× preview with shadow-card frame.
3. ⌘K opens a command palette; every command in §6.1 works.
4. All editor UI text is English; no German strings remain in the chrome. CV data still renders in its own language.
5. With `NEXT_PUBLIC_DEMO_MODE=true`: no autosave, example CV loaded, Download YAML button works, demo banner shown.
6. `pnpm build && pnpm typecheck && pnpm -r test:unit` all green; new components have tests.
7. The editor is deployed and reachable at `https://editor.cvmake.codevena.dev`, can render a CV and export a PDF.
8. `apps/showcase` has a working "Open editor →" link to the deployed editor.

## 13. Out of scope (future)

- i18n / German UI toggle
- The "Reimagine" notebook layout (brainstorm option C) — possible v0.2.0
- User accounts + cloud-saved CVs
- Mobile-first layout
- An editor-mode switch (Compact / Focus)
