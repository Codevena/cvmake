# Prompt für nächste Session — forq Phase 7 (`@codevena/forq-ui`)

Kopiere den folgenden Block in die neue Claude-Code-Session im Projektverzeichnis `/Users/markus/Developer/cvMake`:

---

## Prompt

Wir sind auf Branch `feat/cvmake-mvp`, Repo `Codevena/forq` (private). Phase 0–6 + 6.5 sind komplett, Projekt von `cvMake` zu `forq` umbenannt, alle Templates polished, Repo auf GitHub gepusht.

**Heute: Phase 7 — `@codevena/forq-ui`.** UI-Primitives, die später vom Web-Editor (Phase 8) konsumiert werden. **Vor dem Code: kurzes Brainstorming** zu Stack-/API-Entscheidungen — sonst bauen wir blind. Skill: `superpowers:brainstorming`.

### Aktueller Stand

```bash
git log --oneline main..feat/cvmake-mvp | head -5
```

- Letzter Commit: `09d0b92 chore: rename project from cvmake to forq`
- Davor: `1da86a6 fix(templates): phase 6.5 polish` + `3ed8914 docs: next-session prompt`
- Repo live: https://github.com/Codevena/forq (private, kein CI)
- `packages/ui/` ist Stub (`src/index.ts` exportiert nur `UI_VERSION`)
- `apps/web/` ist Next.js 16 Stub (`app/page.tsx` rendert "forq")
- `packages/ui/package.json` hat bereits `react-image-crop@11.0.7` als Dep
- `apps/web/package.json` hat bereits Tailwind v4 (`tailwindcss@4.0.0-beta.3`, `@tailwindcss/postcss`), `react-hook-form`, `@hookform/resolvers`, `zod`

### Geplante Komponenten (laut Design-Spec §11 / §4)

1. **PhotoCropper** — Datei-Upload + Crop-UI, basiert auf `react-image-crop`. Output: gecroppter File-Blob (an `processPhoto()` aus `@codevena/forq-core`).
2. **ColorPicker / PaletteSelector** — visuelles Picker-Grid für Template-Paletten (jedes Template hat 3–5 Paletten in `palettes.ts`).
3. **TemplateCard** — Template-Preview-Kachel (Thumbnail + Name + Selected-State).
4. **Form Primitives** — `<Input>`, `<Textarea>`, `<Select>`, `<DateRangeInput>` (Monat/Jahr-Pair), `<BulletListEditor>` (drag-reorder, add/remove). Alles strict-typed gegen die Zod-Schemas aus `@codevena/forq-schema`.

### Brainstorming-Themen (vor dem Coden)

#### Theme 1: Styling-Stack

- **A) Pure Tailwind v4** (schon in `apps/web` installiert) — minimaler, keine zusätzlichen Deps, direkter
- **B) shadcn/ui auf Tailwind v4** — vorgefertigte komponierbare Primitives (Dialog, Form, etc.), aber: shadcn ist "copy-paste in app", passt nicht 100% zum Lib-Pattern (`packages/ui` als wiederverwendbare Lib)
- **C) Headless UI (Radix) + custom Tailwind-Styling** — Hybrid

#### Theme 2: Component-API & Form-State

- React Hook Form ist schon in den `apps/web` Deps. Frage: Liefern wir die Components als unkontrolliert (RHF-friendly via `register()`) oder kontrolliert (eigener `value`/`onChange`)? Oder beide via Forwarding?

#### Theme 3: YAML ↔ Form Sync (Phase 8 Vorbereitung, hier Konzept)

- Debounced auto-save zurück in YAML? Explizit "Save"-Button? Optimistic update + Snapshot-Liste (Undo)?
- Wo lebt der Single-Source-of-Truth-State im Editor? RHF-State? Zustand-Store? URL-Param?

#### Theme 4: Photo-Pipeline-Trennung

- PhotoCropper liefert nur Crop-Region & Original-Blob → Server (`@codevena/forq-core` `processPhoto`) erzeugt `.webp` + `.jpg`. UI-Component soll **nicht** sharp-Aufrufe enthalten (Browser-Kontext).

### Empfohlener Ablauf

1. **`Skill: superpowers:brainstorming`** öffnen.
2. Themes 1–4 durchgehen (1 Frage = 1 Antwort, Multiple-Choice).
3. Approved Design → Spec nach `docs/superpowers/specs/2026-04-25-forq-ui-design.md` schreiben.
4. **`Skill: superpowers:writing-plans`** für den Implementation-Plan.
5. Implementation: pro Component 1 Datei + 1 Vitest-Test (DOM via `happy-dom`, schon installiert). `packages/ui/test:unit` muss am Ende grün sein (aktuell skipt es weil keine Test-Files existieren).
6. Visual Story-ähnliche Demo: nicht via Storybook (out of scope für MVP), sondern als simple `apps/web/app/_dev-ui/` Test-Page wenn nötig — damit du die Components live siehst.

### Akzeptanz-Kriterium für Phase 7

- `pnpm --filter @codevena/forq-ui build` grün
- `pnpm --filter @codevena/forq-ui test:unit` grün (mind. 1 Test je Component)
- Components werden in `packages/ui/src/index.ts` exportiert
- TypeScript-Types passen 1:1 zu den Zod-Schemas (für Form-Felder via `z.infer`)

### Memory + Konventionen

Auto-Memory in `/Users/markus/.claude/projects/-Users-markus-Developer-cvMake/memory/`. Globale Regeln (aus `~/.claude/CLAUDE.md`):
- **Keine "Co-Authored-By"-Zeilen** in Commits.
- **Niemals pushen** ohne explizite Freigabe.
- `pnpm typecheck && pnpm build` vor jedem Commit.
- Definition-of-Done verlangt 4 Review-Agents — bei Phase-Abschluss konsequent.

### Quick-Reference

```bash
# Lint / Typecheck / Test / Build
pnpm lint && pnpm typecheck && pnpm build

# Aktuelle Tests
pnpm --filter @codevena/forq-ui test:unit              # noch leer
pnpm --filter @codevena/forq-templates test:unit       # 46/46
pnpm --filter @codevena/forq-templates test:visual     # 8/8
pnpm --filter @codevena/forq-cli test:integration      # 1/1

# CLI smoketest
node apps/cli/dist/index.js --help

# 8 PDFs neu bauen
for id in classic-serif modern-minimal creative-accent academic monochrome-dark editorial corporate tech-dev; do
  node apps/cli/dist/index.js build data/cvs/cv.de.yaml -t $id -o out/cv.de.$id.pdf
done
```

Leg los: `superpowers:brainstorming` öffnen, Theme 1 (Styling-Stack) als erste Frage stellen.
