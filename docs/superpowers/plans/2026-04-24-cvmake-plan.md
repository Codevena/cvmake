# cvMake Implementation Plan

> **Renamed:** Project was renamed from `cvMake` to `forq` on 2026-04-25. Package paths in this plan reference `@cvmake/*`; the codebase now uses `@codevena/forq-*`. The plan remains structurally accurate. See [`docs/superpowers/specs/2026-04-25-naming-decision.md`](../specs/2026-04-25-naming-decision.md).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen produktionsreifen Open-Source CV-Generator bauen: YAML-Source-of-Truth + Next.js Web-UI + Puppeteer-PDF + 8 individuell perfektionierte Templates, MIT-lizenziert, fork-freundlich.

**Architecture:** pnpm-Monorepo mit Turborepo-Pipeline (`schema` → `core` → `templates` → `apps`). `@cvmake/schema` liefert den Zod-Vertrag. `@cvmake/core` kapselt Loader, i18n, Photo-Pipeline (sharp) und PDF-Rendering (Puppeteer). `@cvmake/templates` hält ein Plugin-artiges Registry mit einem Unterordner pro Template. `apps/cli` und `apps/web` konsumieren Core identisch.

**Tech Stack:** TypeScript strict, pnpm Workspaces, Turborepo, Next.js 16 (App Router), Zod, js-yaml, Puppeteer, sharp, react-image-crop, react-hook-form, Tailwind CSS (Editor), Biome, Vitest, Playwright, commander, picocolors, pdf-parse.

**Build-Prinzipien:**
- **TDD wo sinnvoll** — Schema, Loader, i18n, Photo, PDF-Integration, Templates haben Tests vor Implementation.
- **End-to-End-Proof vor Parallelisierung** — Classic Serif wird zuerst komplett durchgebaut (Loader → Renderer → PDF → CLI → echtes PDF aus `cv.de.yaml`), **bevor** die anderen 7 Templates parallel von Agents implementiert werden.
- **Web-UI zuletzt** — CLI + Templates + Visual-Baselines stehen, bevor der Editor draufkommt.
- **Visual-Regression = Template-Definition-of-Done** — ohne committed Baseline-PNG kein Merge.
- **Keine "Co-Authored-By" Zeilen** in Commit-Messages.
- **`pnpm build` + `pnpm typecheck`** laufen vor jedem Commit.

**Review-Checkpoints:** Nach jeder Phase Rückfrage zur Abnahme. Bei Phase 6 zusätzlich Code-Review nach jeder gelieferten Template-Arbeit.

---

## Phasenübersicht

| Phase | Ziel | Parallel? |
|-------|------|-----------|
| 0 | Monorepo-Scaffold | — |
| 1 | `@cvmake/schema` | — |
| 2 | `@cvmake/core` (Loader, i18n, Photo, Renderer, PDF) | — |
| 3 | Templates-Foundation (Registry, Shared-CSS, Fonts) | — |
| 4 | **End-to-End-Proof: Classic Serif** + CLI-Minimal + Markus-Content | — |
| 5 | CLI vollständig (build/validate/list-templates) | — |
| 6 | **7 Templates parallel** (Agent pro Template) | 7 Agents |
| 7 | `@cvmake/ui` (PhotoCropper, ColorPicker, …) | — |
| 8 | `apps/web` (Editor, Preview, API-Routes) | — |
| 9 | CI + E2E + Visual-Regression | — |
| 10 | README + Docs + Screenshots | — |

---

## Phase 0 — Monorepo-Scaffold

Ziel: Turborepo-Monorepo mit pnpm-Workspaces, Biome, TypeScript strict, Vitest, allen leeren Package-Ordnern. Ende: `pnpm install && pnpm build` läuft grün (no-op).

### Task 0.1: Root-Package + pnpm-Workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.nvmrc`
- Create: `.gitignore`
- Modify: `.gitignore` (falls schon vorhanden, erweitern)

- [ ] **Step 1: Root `package.json` anlegen**

```json
{
  "name": "cvmake",
  "version": "0.0.0",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20.11.0" },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "biome check .",
    "format": "biome format --write .",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:unit": "turbo run test:unit",
    "test:integration": "turbo run test:integration",
    "test:e2e": "turbo run test:e2e",
    "test:visual": "turbo run test:visual",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "@biomejs/biome": "1.9.4",
    "turbo": "2.3.0",
    "typescript": "5.6.3",
    "vitest": "2.1.5"
  }
}
```

- [ ] **Step 2: `pnpm-workspace.yaml` anlegen**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 3: `.nvmrc` anlegen**

```
20.11.1
```

- [ ] **Step 4: `.gitignore` erweitern**

```gitignore
node_modules/
dist/
.turbo/
.next/
out/
coverage/
playwright-report/
test-results/
*.log
.DS_Store
.env
.env.local
public/photos/
!public/photos/.gitkeep
```

- [ ] **Step 5: `pnpm install` ausführen und commit**

Run: `pnpm install`
Expected: lockfile `pnpm-lock.yaml` entsteht ohne Fehler.

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml .nvmrc .gitignore
git commit -m "chore: init pnpm workspace + root scripts"
```

### Task 0.2: Turborepo-Pipeline

**Files:**
- Create: `turbo.json`

- [ ] **Step 1: `turbo.json` anlegen**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["tsconfig.base.json", "biome.json"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "inputs": ["src/**", "tsconfig.json", "package.json"]
    },
    "dev": { "cache": false, "persistent": true },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": [],
      "inputs": ["src/**", "tsconfig.json"]
    },
    "test:unit": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "test:integration": { "dependsOn": ["^build"], "outputs": [] },
    "test:visual": { "dependsOn": ["^build"], "outputs": ["__tests__/__visual__/actual/**"] },
    "test:e2e": { "dependsOn": ["^build"], "outputs": ["playwright-report/**"] },
    "clean": { "cache": false }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add turbo.json
git commit -m "chore: add turborepo pipeline"
```

### Task 0.3: TypeScript-Basis-Konfig + Biome

**Files:**
- Create: `tsconfig.base.json`
- Create: `biome.json`

- [ ] **Step 1: `tsconfig.base.json` anlegen**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true
  },
  "exclude": ["node_modules", "dist", ".next", ".turbo"]
}
```

- [ ] **Step 2: `biome.json` anlegen**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "files": {
    "ignore": ["dist", ".next", ".turbo", "coverage", "playwright-report", "**/__visual__/**"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "error" },
      "style": { "useImportType": "error" }
    }
  },
  "javascript": {
    "formatter": { "quoteStyle": "single", "semicolons": "always", "trailingCommas": "all" }
  }
}
```

- [ ] **Step 3: `pnpm lint` verifizieren**

Run: `pnpm lint`
Expected: "No files to check" oder vergleichbar (noch keine Quellen).

- [ ] **Step 4: Commit**

```bash
git add tsconfig.base.json biome.json
git commit -m "chore: configure typescript strict + biome"
```

### Task 0.4: Leere Package-Skelette

**Files:**
- Create: `packages/schema/package.json`
- Create: `packages/schema/tsconfig.json`
- Create: `packages/schema/src/index.ts`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/templates/package.json`
- Create: `packages/templates/tsconfig.json`
- Create: `packages/templates/src/index.ts`
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`
- Create: `apps/cli/package.json`
- Create: `apps/cli/tsconfig.json`
- Create: `apps/cli/src/index.ts`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `data/cvs/.gitkeep`
- Create: `data/cvs/photos/.gitkeep`
- Create: `public/photos/.gitkeep`

- [ ] **Step 1: `packages/schema/package.json` anlegen**

```json
{
  "name": "@cvmake/schema",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": { "zod": "3.23.8" },
  "devDependencies": { "typescript": "5.6.3", "vitest": "2.1.5" }
}
```

- [ ] **Step 2: `packages/schema/tsconfig.json` anlegen**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: `packages/schema/src/index.ts` Platzhalter**

```ts
export const SCHEMA_VERSION = '0.0.0';
```

- [ ] **Step 4: `packages/core/package.json` anlegen**

```json
{
  "name": "@cvmake/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./loader": { "types": "./dist/loader.d.ts", "default": "./dist/loader.js" },
    "./renderer": { "types": "./dist/renderer.d.ts", "default": "./dist/renderer.js" },
    "./pdf": { "types": "./dist/pdf.d.ts", "default": "./dist/pdf.js" },
    "./photo": { "types": "./dist/photo.d.ts", "default": "./dist/photo.js" },
    "./i18n": { "types": "./dist/i18n.d.ts", "default": "./dist/i18n.js" }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "@cvmake/schema": "workspace:*",
    "js-yaml": "4.1.0",
    "puppeteer": "23.7.1",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "sharp": "0.33.5"
  },
  "devDependencies": {
    "@types/js-yaml": "4.0.9",
    "@types/react": "18.3.12",
    "@types/react-dom": "18.3.1",
    "typescript": "5.6.3",
    "vitest": "2.1.5"
  }
}
```

- [ ] **Step 5: `packages/core/tsconfig.json` anlegen**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "jsx": "react-jsx" },
  "include": ["src/**/*"],
  "references": [{ "path": "../schema" }]
}
```

- [ ] **Step 6: `packages/core/src/index.ts` Platzhalter**

```ts
export const CORE_VERSION = '0.0.0';
```

- [ ] **Step 7: `packages/templates/package.json` anlegen**

```json
{
  "name": "@cvmake/templates",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:visual": "vitest run --config vitest.visual.config.ts",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "@cvmake/core": "workspace:*",
    "@cvmake/schema": "workspace:*",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@types/react": "18.3.12",
    "@types/react-dom": "18.3.1",
    "pixelmatch": "6.0.0",
    "pngjs": "7.0.0",
    "typescript": "5.6.3",
    "vitest": "2.1.5"
  }
}
```

- [ ] **Step 8: `packages/templates/tsconfig.json` anlegen**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "jsx": "react-jsx" },
  "include": ["src/**/*"],
  "references": [{ "path": "../schema" }, { "path": "../core" }]
}
```

- [ ] **Step 9: `packages/templates/src/index.ts` Platzhalter**

```ts
export const TEMPLATES_VERSION = '0.0.0';
```

- [ ] **Step 10: `packages/ui/package.json` anlegen**

```json
{
  "name": "@cvmake/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "@cvmake/schema": "workspace:*",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-image-crop": "11.0.7"
  },
  "devDependencies": {
    "@testing-library/react": "16.0.1",
    "@types/react": "18.3.12",
    "@types/react-dom": "18.3.1",
    "happy-dom": "15.11.6",
    "typescript": "5.6.3",
    "vitest": "2.1.5"
  }
}
```

- [ ] **Step 11: `packages/ui/tsconfig.json` + Platzhalter anlegen**

`tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "jsx": "react-jsx" },
  "include": ["src/**/*"],
  "references": [{ "path": "../schema" }]
}
```

`src/index.ts`:
```ts
export const UI_VERSION = '0.0.0';
```

- [ ] **Step 12: `apps/cli/package.json` anlegen**

```json
{
  "name": "@cvmake/cli",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "bin": { "cvmake": "./bin/cvmake" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "@cvmake/core": "workspace:*",
    "@cvmake/schema": "workspace:*",
    "@cvmake/templates": "workspace:*",
    "commander": "12.1.0",
    "picocolors": "1.1.1"
  },
  "devDependencies": {
    "@types/node": "20.17.6",
    "pdf-parse": "1.1.1",
    "typescript": "5.6.3",
    "vitest": "2.1.5"
  }
}
```

- [ ] **Step 13: `apps/cli/tsconfig.json` + Stub**

`tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "module": "NodeNext", "moduleResolution": "NodeNext" },
  "include": ["src/**/*"],
  "references": [{ "path": "../../packages/schema" }, { "path": "../../packages/core" }, { "path": "../../packages/templates" }]
}
```

`src/index.ts`:
```ts
export {};
```

- [ ] **Step 14: `apps/web/package.json` anlegen**

```json
{
  "name": "@cvmake/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "clean": "rm -rf .next .turbo"
  },
  "dependencies": {
    "@cvmake/core": "workspace:*",
    "@cvmake/schema": "workspace:*",
    "@cvmake/templates": "workspace:*",
    "@cvmake/ui": "workspace:*",
    "@hookform/resolvers": "3.9.1",
    "next": "16.0.0",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-hook-form": "7.53.2",
    "zod": "3.23.8"
  },
  "devDependencies": {
    "@playwright/test": "1.49.0",
    "@tailwindcss/postcss": "4.0.0-beta.3",
    "@types/node": "20.17.6",
    "@types/react": "18.3.12",
    "@types/react-dom": "18.3.1",
    "autoprefixer": "10.4.20",
    "postcss": "8.4.49",
    "tailwindcss": "4.0.0-beta.3",
    "typescript": "5.6.3",
    "vitest": "2.1.5"
  }
}
```

- [ ] **Step 15: `apps/web/tsconfig.json` anlegen**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] },
    "noEmit": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next"]
}
```

- [ ] **Step 16: Leere Data-Ordner anlegen**

Run:
```bash
mkdir -p data/cvs/photos public/photos
touch data/cvs/.gitkeep data/cvs/photos/.gitkeep public/photos/.gitkeep
```

- [ ] **Step 17: `pnpm install` + Commit**

Run: `pnpm install`
Expected: Alle Workspace-Pakete sind verlinkt, kein Fehler.

```bash
git add packages apps data public pnpm-lock.yaml
git commit -m "chore: scaffold workspace packages (schema/core/templates/ui) + apps (cli/web)"
```

### Task 0.5: CI-Smoke-Test

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: CI-Workflow anlegen (minimal)**

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.12.0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20.11.1, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm build
```

- [ ] **Step 2: Lokal verifizieren**

Run: `pnpm typecheck && pnpm build`
Expected: Beide grün (no-op builds).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add minimal lint/typecheck/build workflow"
```

**Phase-0 Review-Checkpoint:** Stop. Rückfrage: "Phase 0 fertig. Monorepo steht, `pnpm build` grün. Freigabe für Phase 1 (Schema)?"

---

## Phase 1 — `@cvmake/schema`

Ziel: Zod-Schema für CVData, Template-API-Types, Fixtures, Unit-Tests.

### Task 1.1: Locale + Label-Dictionary-Types

**Files:**
- Create: `packages/schema/src/locale.ts`

- [ ] **Step 1: `packages/schema/src/locale.ts` anlegen**

```ts
import { z } from 'zod';

export const LocaleSchema = z.enum(['de', 'en']);
export type Locale = z.infer<typeof LocaleSchema>;

export const LABEL_KEYS = [
  'summary',
  'experience',
  'education',
  'skills',
  'languages',
  'present',
  'personalData',
  'contact',
  'github',
  'linkedin',
  'website',
  'email',
  'phone',
  'location',
  'birthDate',
  'drivingLicense',
  'maritalStatus',
] as const;

export type LabelKey = (typeof LABEL_KEYS)[number];
export type LabelDictionary = Record<LabelKey, string>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/schema/src/locale.ts
git commit -m "feat(schema): add locale enum + label dictionary keys"
```

### Task 1.2: CVData-Zod-Schema (Tests first)

**Files:**
- Create: `packages/schema/src/cv.ts`
- Create: `packages/schema/test/cv.test.ts`
- Create: `packages/schema/test/fixtures.ts`
- Create: `packages/schema/vitest.config.ts`

- [ ] **Step 1: Vitest-Config**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['test/**/*.test.ts'], environment: 'node' },
});
```

- [ ] **Step 2: Fixtures mit Minimum- und Vollbeispiel**

`test/fixtures.ts`:
```ts
import type { CVData } from '../src/cv.js';

export const minimalFixture: CVData = {
  meta: { locale: 'de' },
  personal: {
    firstName: 'Markus',
    lastName: 'Wiesecke',
    contacts: {},
  },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

export const fullFixture: CVData = {
  meta: { locale: 'de', updatedAt: '2026-04-24' },
  personal: {
    firstName: 'Markus',
    lastName: 'Wiesecke',
    title: 'Fullstack Developer',
    photo: 'photos/markus.jpg',
    birthDate: '1987-01-13',
    contacts: {
      email: 'hello@codevena.dev',
      phone: '+49 175 9025586',
      website: 'https://codevena.dev',
      github: 'codevena',
      linkedin: 'markus-wiesecke',
      location: 'Wuppertal, DE',
    },
  },
  summary: 'Fullstack Developer mit Fokus auf Next.js und TypeScript.',
  experience: [
    {
      title: 'Fullstack Developer',
      company: 'Codevena',
      location: 'Wuppertal',
      startDate: '2020-01',
      bullets: ['Next.js 16 SaaS entwickelt', 'Hetzner + Coolify Deployment'],
      tags: ['Next.js', 'TypeScript', 'PostgreSQL'],
    },
  ],
  education: [
    {
      degree: 'Fachinformatiker Anwendungsentwicklung',
      institution: 'BBQ Düsseldorf',
      startDate: '2024-08',
      endDate: '2026-07',
    },
  ],
  skills: {
    stack: ['Next.js', 'TypeScript', 'PostgreSQL'],
    categorized: { Backend: ['Node.js', 'Prisma'], Frontend: ['React', 'Tailwind'] },
  },
  languages: [
    { name: 'Deutsch', level: 'native' },
    { name: 'Englisch', level: 'B2' },
  ],
  customSections: [
    {
      id: 'projects',
      title: 'Projekte',
      items: [{ title: 'FlashBuddy', subtitle: 'SaaS', description: 'Lern-Karten App.' }],
    },
  ],
  rendering: {
    template: 'classic-serif',
    palette: 'classic-grey',
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  },
};
```

- [ ] **Step 3: Failing Tests schreiben**

`test/cv.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { CVDataSchema } from '../src/cv.js';
import { fullFixture, minimalFixture } from './fixtures.js';

describe('CVDataSchema', () => {
  it('akzeptiert das Minimal-Fixture', () => {
    expect(() => CVDataSchema.parse(minimalFixture)).not.toThrow();
  });

  it('akzeptiert das Voll-Fixture', () => {
    expect(() => CVDataSchema.parse(fullFixture)).not.toThrow();
  });

  it('verbietet unbekannte Top-Level-Felder (strict)', () => {
    expect(() => CVDataSchema.parse({ ...minimalFixture, extra: 'nope' })).toThrow();
  });

  it('erzwingt locale de|en', () => {
    expect(() =>
      CVDataSchema.parse({ ...minimalFixture, meta: { locale: 'fr' } }),
    ).toThrow();
  });

  it('validiert E-Mail-Format', () => {
    expect(() =>
      CVDataSchema.parse({
        ...minimalFixture,
        personal: { ...minimalFixture.personal, contacts: { email: 'kein-email' } },
      }),
    ).toThrow();
  });

  it('validiert accentOverride als Hex-Farbe', () => {
    expect(() =>
      CVDataSchema.parse({
        ...minimalFixture,
        rendering: { template: 'classic-serif', accentOverride: 'red' },
      }),
    ).toThrow();
    expect(() =>
      CVDataSchema.parse({
        ...minimalFixture,
        rendering: { template: 'classic-serif', accentOverride: '#7a8894' },
      }),
    ).not.toThrow();
  });

  it('erzwingt language-level enum', () => {
    expect(() =>
      CVDataSchema.parse({
        ...minimalFixture,
        languages: [{ name: 'DE', level: 'muttersprache' }],
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 4: Tests laufen lassen (müssen failen)**

Run: `pnpm --filter @cvmake/schema test:unit`
Expected: Alle Tests fehlgeschlagen (Import von `../src/cv.js` existiert nicht).

- [ ] **Step 5: `packages/schema/src/cv.ts` implementieren**

```ts
import { z } from 'zod';
import { LocaleSchema } from './locale.js';

export const ContactsSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional(),
    github: z.string().optional(),
    linkedin: z.string().optional(),
    location: z.string().optional(),
  })
  .strict();

export const PersonalSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    title: z.string().optional(),
    photo: z.string().optional(),
    birthDate: z.string().optional(),
    maritalStatus: z.string().optional(),
    drivingLicense: z.string().optional(),
    contacts: ContactsSchema,
  })
  .strict();

export const ExperienceItemSchema = z
  .object({
    title: z.string().min(1),
    company: z.string().min(1),
    location: z.string().optional(),
    startDate: z.string().min(1),
    endDate: z.string().optional(),
    bullets: z.array(z.string()),
    tags: z.array(z.string()).optional(),
  })
  .strict();

export const EducationItemSchema = z
  .object({
    degree: z.string().min(1),
    institution: z.string().min(1),
    location: z.string().optional(),
    startDate: z.string().min(1),
    endDate: z.string().optional(),
    bullets: z.array(z.string()).optional(),
  })
  .strict();

export const SkillsSchema = z
  .object({
    stack: z.array(z.string()).optional(),
    categorized: z.record(z.string(), z.array(z.string())).optional(),
  })
  .strict();

export const LanguageLevelSchema = z.enum([
  'native',
  'C2',
  'C1',
  'B2',
  'B1',
  'A2',
  'A1',
  'basic',
]);

export const LanguageItemSchema = z
  .object({
    name: z.string().min(1),
    level: LanguageLevelSchema,
    label: z.string().optional(),
  })
  .strict();

export const CustomSectionItemSchema = z
  .object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    date: z.string().optional(),
    description: z.string().optional(),
    bullets: z.array(z.string()).optional(),
  })
  .strict();

export const CustomSectionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    items: z.array(CustomSectionItemSchema),
  })
  .strict();

export const RenderingSchema = z
  .object({
    template: z.string().min(1),
    palette: z.string().optional(),
    accentOverride: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    sectionOrder: z.array(z.string()).optional(),
    hiddenSections: z.array(z.string()).optional(),
  })
  .strict();

export const CVDataSchema = z
  .object({
    meta: z
      .object({
        locale: LocaleSchema,
        updatedAt: z.string().optional(),
      })
      .strict(),
    personal: PersonalSchema,
    summary: z.string().optional(),
    experience: z.array(ExperienceItemSchema),
    education: z.array(EducationItemSchema),
    skills: SkillsSchema.optional(),
    languages: z.array(LanguageItemSchema).optional(),
    customSections: z.array(CustomSectionSchema).optional(),
    rendering: RenderingSchema,
  })
  .strict();

export type CVData = z.infer<typeof CVDataSchema>;
export type Personal = z.infer<typeof PersonalSchema>;
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;
export type EducationItem = z.infer<typeof EducationItemSchema>;
export type CustomSection = z.infer<typeof CustomSectionSchema>;
export type LanguageItem = z.infer<typeof LanguageItemSchema>;
export type LanguageLevel = z.infer<typeof LanguageLevelSchema>;
```

- [ ] **Step 6: Tests laufen lassen (alle grün)**

Run: `pnpm --filter @cvmake/schema test:unit`
Expected: PASS × 7.

- [ ] **Step 7: `packages/schema/src/index.ts` Exports**

```ts
export * from './cv.js';
export * from './locale.js';
export * from './template.js';
```

- [ ] **Step 8: Commit**

```bash
git add packages/schema
git commit -m "feat(schema): add CVData zod schema + fixtures + unit tests"
```

### Task 1.3: Template-API-Types

**Files:**
- Create: `packages/schema/src/template.ts`
- Modify: `packages/schema/test/cv.test.ts` (separater Template-Test-File)
- Create: `packages/schema/test/template.test.ts`

- [ ] **Step 1: Failing Test für ColorPaletteSchema**

`test/template.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ColorPaletteSchema } from '../src/template.js';

describe('ColorPaletteSchema', () => {
  it('akzeptiert gültige Palette', () => {
    expect(() =>
      ColorPaletteSchema.parse({
        id: 'classic-grey',
        name: 'Classic Grey',
        accent: '#7a8894',
        background: '#ffffff',
        surface: '#f4f4f5',
        text: '#0f172a',
        textMuted: '#64748b',
        textOnAccent: '#ffffff',
      }),
    ).not.toThrow();
  });

  it('verbietet Hex ohne #', () => {
    expect(() =>
      ColorPaletteSchema.parse({
        id: 'x',
        name: 'X',
        accent: '7a8894',
        background: '#ffffff',
        surface: '#ffffff',
        text: '#000000',
        textMuted: '#000000',
        textOnAccent: '#ffffff',
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Tests fehlschlagen lassen**

Run: `pnpm --filter @cvmake/schema test:unit`
Expected: Template-Test fehlt → FAIL.

- [ ] **Step 3: `packages/schema/src/template.ts` anlegen**

```ts
import type { ReactElement } from 'react';
import { z } from 'zod';
import type { CVData } from './cv.js';
import type { LabelDictionary, Locale } from './locale.js';

const HexColor = z.string().regex(/^#[0-9a-f]{6}$/i);

export const ColorPaletteSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    accent: HexColor,
    background: HexColor,
    surface: HexColor,
    text: HexColor,
    textMuted: HexColor,
    textOnAccent: HexColor,
  })
  .strict();

export type ColorPalette = z.infer<typeof ColorPaletteSchema>;

export const TemplateMetaSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    description: z.string().min(1),
    supportsPhoto: z.boolean(),
    photoFallback: z.enum(['initials', 'placeholder', 'none']),
    supportedLocales: z.array(z.enum(['de', 'en'])).nonempty(),
    defaultSectionOrder: z.array(z.string()).nonempty(),
    supportsPagination: z.boolean(),
  })
  .strict();

export type TemplateMeta = z.infer<typeof TemplateMetaSchema>;

export interface TemplateProps {
  data: CVData;
  palette: ColorPalette;
  locale: Locale;
  labels: LabelDictionary;
}

export interface TemplateDefinition {
  meta: TemplateMeta;
  palettes: ColorPalette[];
  Component: (props: TemplateProps) => ReactElement;
}
```

- [ ] **Step 4: Tests grün**

Run: `pnpm --filter @cvmake/schema test:unit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/schema/src/template.ts packages/schema/test/template.test.ts
git commit -m "feat(schema): add template definition + color palette schemas"
```

**Phase-1 Review-Checkpoint:** "Phase 1 fertig. Schema + Tests grün. Freigabe für Phase 2 (Core)?"

---

## Phase 2 — `@cvmake/core`

Ziel: i18n, Loader (YAML → validiertes CVData), Photo-Pipeline, Renderer-Primitive, PDF-Generator.

### Task 2.1: i18n-Labels (DE + EN)

**Files:**
- Create: `packages/core/src/i18n.ts`
- Create: `packages/core/test/i18n.test.ts`
- Create: `packages/core/vitest.config.ts`

- [ ] **Step 1: Vitest-Config**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['test/**/*.test.ts'], environment: 'node' },
});
```

- [ ] **Step 2: Failing Test**

`test/i18n.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { LABEL_KEYS } from '@cvmake/schema';
import { getLabels } from '../src/i18n.js';

describe('i18n', () => {
  it('liefert DE-Labels für alle Keys', () => {
    const labels = getLabels('de');
    for (const key of LABEL_KEYS) expect(labels[key]).toBeTruthy();
  });

  it('liefert EN-Labels für alle Keys', () => {
    const labels = getLabels('en');
    for (const key of LABEL_KEYS) expect(labels[key]).toBeTruthy();
  });

  it('DE und EN haben identische Keys', () => {
    const de = Object.keys(getLabels('de')).sort();
    const en = Object.keys(getLabels('en')).sort();
    expect(de).toEqual(en);
  });
});
```

- [ ] **Step 3: Test fehlschlagen lassen**

Run: `pnpm --filter @cvmake/core test:unit`
Expected: FAIL.

- [ ] **Step 4: `packages/core/src/i18n.ts` implementieren**

```ts
import type { LabelDictionary, Locale } from '@cvmake/schema';

const DE: LabelDictionary = {
  summary: 'Profil',
  experience: 'Berufserfahrung',
  education: 'Ausbildung',
  skills: 'Kenntnisse',
  languages: 'Sprachen',
  present: 'heute',
  personalData: 'Persönliche Daten',
  contact: 'Kontakt',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  website: 'Webseite',
  email: 'E-Mail',
  phone: 'Telefon',
  location: 'Ort',
  birthDate: 'Geburtsdatum',
  drivingLicense: 'Führerschein',
  maritalStatus: 'Familienstand',
};

const EN: LabelDictionary = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  languages: 'Languages',
  present: 'present',
  personalData: 'Personal Data',
  contact: 'Contact',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  website: 'Website',
  email: 'Email',
  phone: 'Phone',
  location: 'Location',
  birthDate: 'Date of Birth',
  drivingLicense: 'Driving License',
  maritalStatus: 'Marital Status',
};

const DICTIONARIES: Record<Locale, LabelDictionary> = { de: DE, en: EN };

export function getLabels(locale: Locale): LabelDictionary {
  return DICTIONARIES[locale];
}
```

- [ ] **Step 5: Test grün + Commit**

Run: `pnpm --filter @cvmake/core test:unit`
Expected: PASS.

```bash
git add packages/core/src/i18n.ts packages/core/test/i18n.test.ts packages/core/vitest.config.ts
git commit -m "feat(core): add DE/EN label dictionaries with parity test"
```

### Task 2.2: Loader (YAML-Parse + Zod-Validate)

**Files:**
- Create: `packages/core/src/loader.ts`
- Create: `packages/core/src/errors.ts`
- Create: `packages/core/test/loader.test.ts`
- Create: `packages/core/test/fixtures/valid.de.yaml`
- Create: `packages/core/test/fixtures/invalid-missing.de.yaml`
- Create: `packages/core/test/fixtures/broken.yaml`

- [ ] **Step 1: Fixtures anlegen**

`test/fixtures/valid.de.yaml`:
```yaml
meta:
  locale: de
personal:
  firstName: Markus
  lastName: Wiesecke
  contacts:
    email: hello@codevena.dev
experience: []
education: []
rendering:
  template: classic-serif
```

`test/fixtures/invalid-missing.de.yaml`:
```yaml
meta:
  locale: de
personal:
  firstName: Markus
  contacts: {}
experience: []
education: []
rendering:
  template: classic-serif
```

`test/fixtures/broken.yaml`:
```yaml
meta: [this: is: not valid
```

- [ ] **Step 2: Failing Tests**

`test/loader.test.ts`:
```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadCV } from '../src/loader.js';
import { YAMLParseError, ValidationError } from '../src/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => path.join(__dirname, 'fixtures', name);

describe('loadCV', () => {
  it('lädt und validiert gültiges YAML', async () => {
    const cv = await loadCV(fixture('valid.de.yaml'));
    expect(cv.personal.firstName).toBe('Markus');
    expect(cv.meta.locale).toBe('de');
  });

  it('leitet Locale aus Dateinamen-Suffix ab (override)', async () => {
    const cv = await loadCV(fixture('valid.de.yaml'));
    expect(cv.meta.locale).toBe('de');
  });

  it('wirft ValidationError bei fehlendem Pflichtfeld', async () => {
    await expect(loadCV(fixture('invalid-missing.de.yaml'))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('wirft YAMLParseError bei kaputtem YAML', async () => {
    await expect(loadCV(fixture('broken.yaml'))).rejects.toBeInstanceOf(YAMLParseError);
  });
});
```

- [ ] **Step 3: `packages/core/src/errors.ts`**

```ts
import type { ZodIssue } from 'zod';

export class YAMLParseError extends Error {
  readonly path: string;
  readonly line?: number | undefined;
  readonly column?: number | undefined;
  constructor(path: string, message: string, line?: number, column?: number) {
    super(`${path}: ${message}`);
    this.name = 'YAMLParseError';
    this.path = path;
    this.line = line;
    this.column = column;
  }
}

export class ValidationError extends Error {
  readonly path: string;
  readonly issues: ZodIssue[];
  constructor(path: string, issues: ZodIssue[]) {
    super(`${path}: ${issues.length} validation issue(s)`);
    this.name = 'ValidationError';
    this.path = path;
    this.issues = issues;
  }
}
```

- [ ] **Step 4: `packages/core/src/loader.ts`**

```ts
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { CVDataSchema, type CVData, type Locale } from '@cvmake/schema';
import { ValidationError, YAMLParseError } from './errors.js';

function inferLocaleFromFilename(filePath: string): Locale | null {
  const base = path.basename(filePath, path.extname(filePath));
  const match = /\.(de|en)$/i.exec(base);
  if (!match) return null;
  return match[1].toLowerCase() as Locale;
}

export async function loadCV(filePath: string): Promise<CVData> {
  const raw = await readFile(filePath, 'utf8');
  let parsed: unknown;
  try {
    parsed = yaml.load(raw, { schema: yaml.CORE_SCHEMA, filename: filePath });
  } catch (err) {
    const e = err as yaml.YAMLException;
    throw new YAMLParseError(filePath, e.reason ?? e.message, e.mark?.line, e.mark?.column);
  }

  const inferred = inferLocaleFromFilename(filePath);
  if (inferred && parsed && typeof parsed === 'object' && 'meta' in parsed) {
    const meta = (parsed as { meta?: { locale?: string } }).meta;
    if (meta && !meta.locale) meta.locale = inferred;
  }

  const result = CVDataSchema.safeParse(parsed);
  if (!result.success) throw new ValidationError(filePath, result.error.issues);
  return result.data;
}
```

- [ ] **Step 5: Tests grün + Commit**

Run: `pnpm --filter @cvmake/core test:unit`
Expected: PASS.

```bash
git add packages/core/src/loader.ts packages/core/src/errors.ts packages/core/test/loader.test.ts packages/core/test/fixtures
git commit -m "feat(core): add YAML loader with locale inference + typed errors"
```

### Task 2.3: Photo-Pipeline (sharp)

**Files:**
- Create: `packages/core/src/photo.ts`
- Create: `packages/core/test/photo.test.ts`
- Create: `packages/core/test/fixtures/photo-input.jpg` (1000×1000 Testbild, via sharp generiert)
- Create: `packages/core/test/photo-fixture-gen.ts`

- [ ] **Step 1: Fixture-Generator für Testbild**

`test/photo-fixture-gen.ts`:
```ts
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.join(import.meta.dirname, 'fixtures', 'photo-input.jpg');

await writeFile(
  OUT,
  await sharp({
    create: { width: 1000, height: 1000, channels: 3, background: { r: 60, g: 120, b: 180 } },
  })
    .jpeg({ quality: 90 })
    .toBuffer(),
);
```

Run:
```bash
mkdir -p packages/core/test/fixtures
pnpm --filter @cvmake/core exec tsx test/photo-fixture-gen.ts
```
(tsx als devDep ergänzen: `pnpm --filter @cvmake/core add -D tsx`)

- [ ] **Step 2: Failing Test**

`test/photo.test.ts`:
```ts
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { processPhoto } from '../src/photo.js';

describe('processPhoto', () => {
  let outDir = '';
  beforeEach(async () => {
    outDir = await mkdtemp(path.join(tmpdir(), 'cvmake-photo-'));
  });
  afterEach(() => rm(outDir, { recursive: true, force: true }));

  it('erzeugt .webp + .jpg Variante im Zielordner', async () => {
    const input = path.join(import.meta.dirname, 'fixtures', 'photo-input.jpg');
    const result = await processPhoto({ inputPath: input, outputDir: outDir, slug: 'markus' });
    expect(result.webp).toMatch(/markus\.webp$/);
    expect(result.jpg).toMatch(/markus\.jpg$/);
    expect((await readFile(result.webp)).byteLength).toBeGreaterThan(100);
    expect((await readFile(result.jpg)).byteLength).toBeGreaterThan(100);
  });

  it('lehnt zu große Dateien ab (>10MB)', async () => {
    await expect(
      processPhoto({ inputPath: 'nonexistent', outputDir: outDir, slug: 'x', maxBytes: 1 }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: `packages/core/src/photo.ts`**

```ts
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export interface ProcessPhotoOptions {
  inputPath: string;
  outputDir: string;
  slug: string;
  maxBytes?: number;
  targetSize?: number;
}

export interface ProcessedPhoto {
  webp: string;
  jpg: string;
  width: number;
  height: number;
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_TARGET = 600;
const SLUG_RE = /^[a-z0-9-]+$/;

export async function processPhoto(opts: ProcessPhotoOptions): Promise<ProcessedPhoto> {
  const { inputPath, outputDir, slug, maxBytes = DEFAULT_MAX_BYTES, targetSize = DEFAULT_TARGET } =
    opts;
  if (!SLUG_RE.test(slug)) throw new Error(`invalid slug: ${slug}`);

  const info = await stat(inputPath);
  if (info.size > maxBytes) {
    throw new Error(`photo too large: ${info.size} > ${maxBytes}`);
  }

  const buffer = await readFile(inputPath);
  const pipeline = sharp(buffer).rotate().resize({
    width: targetSize,
    height: targetSize,
    fit: 'cover',
    position: 'attention',
  });

  const webpPath = path.join(outputDir, `${slug}.webp`);
  const jpgPath = path.join(outputDir, `${slug}.jpg`);

  const webpBuffer = await pipeline.clone().webp({ quality: 88 }).toBuffer();
  const jpgBuffer = await pipeline.clone().jpeg({ quality: 88, mozjpeg: true }).toBuffer();

  await writeFile(webpPath, webpBuffer);
  await writeFile(jpgPath, jpgBuffer);

  const meta = await sharp(webpBuffer).metadata();
  return {
    webp: webpPath,
    jpg: jpgPath,
    width: meta.width ?? targetSize,
    height: meta.height ?? targetSize,
  };
}
```

- [ ] **Step 4: Tests grün + Commit**

Run: `pnpm --filter @cvmake/core test:unit`
Expected: PASS.

```bash
git add packages/core/src/photo.ts packages/core/test/photo.test.ts packages/core/test/photo-fixture-gen.ts packages/core/test/fixtures/photo-input.jpg
git commit -m "feat(core): add sharp photo pipeline with webp + jpg variants"
```

### Task 2.4: Renderer-Primitive

**Files:**
- Create: `packages/core/src/renderer.tsx`
- Create: `packages/core/src/renderer-types.ts`
- Create: `packages/core/test/renderer.test.tsx`

- [ ] **Step 1: `packages/core/src/renderer-types.ts`**

```ts
import type { CVData, TemplateDefinition } from '@cvmake/schema';

export interface RenderInput {
  data: CVData;
  template: TemplateDefinition;
  paletteId?: string;
}

export interface RenderOutput {
  html: string;
  css: string;
  locale: 'de' | 'en';
}
```

- [ ] **Step 2: Failing Test**

`test/renderer.test.tsx`:
```ts
/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import type { TemplateDefinition } from '@cvmake/schema';
import { minimalFixture } from '@cvmake/schema/test/fixtures.js';
import { renderCV } from '../src/renderer.js';

const fakeTemplate: TemplateDefinition = {
  meta: {
    id: 'fake',
    name: 'Fake',
    description: 'x',
    supportsPhoto: false,
    photoFallback: 'none',
    supportedLocales: ['de', 'en'],
    defaultSectionOrder: ['summary'],
    supportsPagination: true,
  },
  palettes: [
    {
      id: 'fake-default',
      name: 'Fake Default',
      accent: '#112233',
      background: '#ffffff',
      surface: '#f1f1f1',
      text: '#000000',
      textMuted: '#666666',
      textOnAccent: '#ffffff',
    },
  ],
  Component: ({ data, labels }) => (
    <main>
      <h1>
        {data.personal.firstName} {data.personal.lastName}
      </h1>
      <p data-testid="label">{labels.experience}</p>
    </main>
  ),
};

describe('renderCV', () => {
  it('rendert HTML mit Locale-Label', () => {
    const out = renderCV({ data: minimalFixture, template: fakeTemplate });
    expect(out.html).toContain('<h1>Markus Wiesecke</h1>');
    expect(out.html).toContain('Berufserfahrung');
    expect(out.locale).toBe('de');
  });
});
```

- [ ] **Step 3: `packages/core/src/renderer.tsx`**

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { getLabels } from './i18n.js';
import type { RenderInput, RenderOutput } from './renderer-types.js';

export function renderCV({ data, template, paletteId }: RenderInput): RenderOutput {
  const palette =
    template.palettes.find((p) => p.id === paletteId) ?? template.palettes[0];
  if (!palette) throw new Error(`template ${template.meta.id} has no palettes`);
  const accent = data.rendering.accentOverride ?? palette.accent;
  const effectivePalette = { ...palette, accent };
  const labels = getLabels(data.meta.locale);

  const html = renderToStaticMarkup(
    <template.Component
      data={data}
      palette={effectivePalette}
      locale={data.meta.locale}
      labels={labels}
    />,
  );

  const css = cssVariables(effectivePalette);
  return { html, css, locale: data.meta.locale };
}

function cssVariables(p: {
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  textOnAccent: string;
}) {
  return `:root{--accent:${p.accent};--bg:${p.background};--surface:${p.surface};--text:${p.text};--text-muted:${p.textMuted};--text-on-accent:${p.textOnAccent};}`;
}
```

- [ ] **Step 4: Test grün + Commit**

Run: `pnpm --filter @cvmake/core test:unit`
Expected: PASS.

```bash
git add packages/core/src/renderer.tsx packages/core/src/renderer-types.ts packages/core/test/renderer.test.tsx
git commit -m "feat(core): add react→html renderer with palette + i18n"
```

### Task 2.5: PDF-Generator (Puppeteer)

**Files:**
- Create: `packages/core/src/pdf.ts`
- Create: `packages/core/src/html-document.ts`
- Create: `packages/core/test/pdf.integration.test.ts`
- Create: `packages/core/vitest.integration.config.ts`

- [ ] **Step 1: Integration-Vitest-Config**

`vitest.integration.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.integration.test.ts', 'test/**/*.integration.test.tsx'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
```

- [ ] **Step 2: HTML-Document-Hilfsfunktion**

`src/html-document.ts`:
```ts
export interface HtmlDocOptions {
  title: string;
  html: string;
  css: string;
  extraHead?: string;
}

export function wrapHtmlDocument({ title, html, css, extraHead = '' }: HtmlDocOptions): string {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>${css}</style>
${extraHead}
</head>
<body>${html}</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

- [ ] **Step 3: Failing Integration-Test**

`test/pdf.integration.test.ts`:
```ts
import { describe, expect, it, afterAll } from 'vitest';
import { generatePDF, shutdownPdfBrowser } from '../src/pdf.js';
import { wrapHtmlDocument } from '../src/html-document.js';

afterAll(() => shutdownPdfBrowser());

describe('generatePDF', () => {
  it('liefert PDF-Buffer mit %PDF-Header', async () => {
    const html = wrapHtmlDocument({
      title: 'Test CV',
      html: '<h1>Hello</h1>',
      css: 'body{font-family:sans-serif}',
    });
    const buf = await generatePDF(html);
    expect(buf.slice(0, 5).toString('utf8')).toBe('%PDF-');
    expect(buf.byteLength).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 4: `packages/core/src/pdf.ts`**

```ts
import type { Browser } from 'puppeteer';
import puppeteer from 'puppeteer';

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    });
  }
  return browserPromise;
}

export async function shutdownPdfBrowser(): Promise<void> {
  if (!browserPromise) return;
  const b = await browserPromise;
  browserPromise = null;
  await b.close();
}

export interface GeneratePDFOptions {
  format?: 'A4' | 'Letter';
  margin?: { top: string; right: string; bottom: string; left: string };
  fontTimeoutMs?: number;
}

export async function generatePDF(
  html: string,
  opts: GeneratePDFOptions = {},
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.emulateMediaType('print');
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await Promise.race([
      page.evaluate(() => (document as unknown as { fonts: { ready: Promise<void> } }).fonts.ready),
      new Promise((resolve) => setTimeout(resolve, opts.fontTimeoutMs ?? 5000)),
    ]);
    const pdf = await page.pdf({
      format: opts.format ?? 'A4',
      printBackground: true,
      margin: opts.margin ?? { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
```

- [ ] **Step 5: Test grün (Integration)**

Run: `pnpm --filter @cvmake/core test:integration`
Expected: PASS.

- [ ] **Step 6: Exports in `packages/core/src/index.ts`**

```ts
export * from './errors.js';
export * from './html-document.js';
export * from './i18n.js';
export * from './loader.js';
export * from './pdf.js';
export * from './photo.js';
export * from './renderer.js';
export * from './renderer-types.js';
```

- [ ] **Step 7: Commit**

```bash
git add packages/core
git commit -m "feat(core): add puppeteer pdf generator with singleton browser"
```

**Phase-2 Review-Checkpoint:** "Phase 2 fertig. Core liefert Loader, Photo, Renderer, PDF. Tests grün. Freigabe für Phase 3 (Templates-Foundation)?"

---

## Phase 3 — Templates-Foundation

Ziel: Registry, gemeinsame CSS-Resets, `@page`-Regeln, Font-Loading-Konventionen, Helfer für Datumsformatierung, Section-Guards. Noch kein Template.

### Task 3.1: Template-Registry

**Files:**
- Create: `packages/templates/src/registry.ts`
- Create: `packages/templates/test/registry.test.ts`
- Create: `packages/templates/vitest.config.ts`

- [ ] **Step 1: Vitest-Config**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['test/**/*.test.ts', 'test/**/*.test.tsx'], environment: 'node' },
  esbuild: { jsx: 'automatic' },
});
```

- [ ] **Step 2: Failing Test**

`test/registry.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { getTemplate, listTemplates, registerTemplate } from '../src/registry.js';
import type { TemplateDefinition } from '@cvmake/schema';

const stub: TemplateDefinition = {
  meta: {
    id: 'stub',
    name: 'Stub',
    description: 'x',
    supportsPhoto: false,
    photoFallback: 'none',
    supportedLocales: ['de', 'en'],
    defaultSectionOrder: ['summary'],
    supportsPagination: true,
  },
  palettes: [
    {
      id: 'stub-default',
      name: 'Stub Default',
      accent: '#000000',
      background: '#ffffff',
      surface: '#eeeeee',
      text: '#000000',
      textMuted: '#666666',
      textOnAccent: '#ffffff',
    },
  ],
  Component: () => null as unknown as JSX.Element,
};

describe('registry', () => {
  it('registriert und findet ein Template', () => {
    registerTemplate(stub);
    expect(getTemplate('stub')?.meta.id).toBe('stub');
  });

  it('gibt null zurück für unbekannte ID', () => {
    expect(getTemplate('unknown')).toBeNull();
  });

  it('listet alle registrierten Templates', () => {
    expect(listTemplates().some((t) => t.meta.id === 'stub')).toBe(true);
  });

  it('verbietet doppelte Registrierung derselben ID', () => {
    expect(() => registerTemplate(stub)).toThrow(/already registered/);
  });
});
```

- [ ] **Step 3: `packages/templates/src/registry.ts`**

```ts
import type { TemplateDefinition } from '@cvmake/schema';

const REGISTRY = new Map<string, TemplateDefinition>();

export function registerTemplate(def: TemplateDefinition): void {
  if (REGISTRY.has(def.meta.id)) {
    throw new Error(`Template ${def.meta.id} already registered`);
  }
  REGISTRY.set(def.meta.id, def);
}

export function getTemplate(id: string): TemplateDefinition | null {
  return REGISTRY.get(id) ?? null;
}

export function listTemplates(): TemplateDefinition[] {
  return [...REGISTRY.values()];
}

export function clearRegistry(): void {
  REGISTRY.clear();
}
```

- [ ] **Step 4: Tests grün + Commit**

Run: `pnpm --filter @cvmake/templates test:unit`
Expected: PASS.

```bash
git add packages/templates/src/registry.ts packages/templates/test/registry.test.ts packages/templates/vitest.config.ts
git commit -m "feat(templates): add plugin-style template registry"
```

### Task 3.2: Shared Utilities (Datum, Initialen, Section-Order)

**Files:**
- Create: `packages/templates/src/utils/dates.ts`
- Create: `packages/templates/src/utils/initials.ts`
- Create: `packages/templates/src/utils/sections.ts`
- Create: `packages/templates/test/utils.test.ts`

- [ ] **Step 1: Failing Tests**

`test/utils.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { formatDateRange, formatMonthYear } from '../src/utils/dates.js';
import { initials } from '../src/utils/initials.js';
import { resolveSectionOrder } from '../src/utils/sections.js';

describe('dates', () => {
  it('formatiert YYYY-MM auf DE', () => {
    expect(formatMonthYear('2024-08', 'de')).toBe('Aug. 2024');
  });
  it('formatiert YYYY-MM auf EN', () => {
    expect(formatMonthYear('2024-08', 'en')).toBe('Aug 2024');
  });
  it('range mit offenem Ende nutzt Label', () => {
    expect(formatDateRange('2020-01', undefined, 'de', 'heute')).toBe('Jan. 2020 – heute');
  });
});

describe('initials', () => {
  it('liefert zwei Buchstaben', () => {
    expect(initials('Markus', 'Wiesecke')).toBe('MW');
  });
});

describe('sections', () => {
  it('respektiert override vor default', () => {
    const o = resolveSectionOrder({
      override: ['experience', 'summary'],
      defaults: ['summary', 'experience', 'education'],
      hidden: [],
    });
    expect(o).toEqual(['experience', 'summary']);
  });
  it('fügt fehlende Sections aus defaults an', () => {
    const o = resolveSectionOrder({
      override: ['experience'],
      defaults: ['summary', 'experience', 'education'],
      hidden: [],
    });
    expect(o).toEqual(['experience', 'summary', 'education']);
  });
  it('entfernt versteckte Sections', () => {
    const o = resolveSectionOrder({
      override: undefined,
      defaults: ['summary', 'experience'],
      hidden: ['summary'],
    });
    expect(o).toEqual(['experience']);
  });
});
```

- [ ] **Step 2: `packages/templates/src/utils/dates.ts`**

```ts
import type { Locale } from '@cvmake/schema';

const MONTHS_DE = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonthYear(iso: string, locale: Locale): string {
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(iso);
  if (!match) return iso;
  const year = match[1];
  const monthNum = match[2] ? Number.parseInt(match[2], 10) : null;
  if (!monthNum) return year;
  const months = locale === 'de' ? MONTHS_DE : MONTHS_EN;
  return `${months[monthNum - 1]} ${year}`;
}

export function formatDateRange(
  start: string,
  end: string | undefined,
  locale: Locale,
  presentLabel: string,
): string {
  const s = formatMonthYear(start, locale);
  const e = end ? formatMonthYear(end, locale) : presentLabel;
  return `${s} – ${e}`;
}
```

- [ ] **Step 3: `packages/templates/src/utils/initials.ts`**

```ts
export function initials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0).toUpperCase();
  const last = lastName.trim().charAt(0).toUpperCase();
  return `${first}${last}`;
}
```

- [ ] **Step 4: `packages/templates/src/utils/sections.ts`**

```ts
export interface ResolveSectionOrderInput {
  override: string[] | undefined;
  defaults: string[];
  hidden: string[];
}

export function resolveSectionOrder(input: ResolveSectionOrderInput): string[] {
  const hidden = new Set(input.hidden);
  const base = input.override && input.override.length > 0 ? input.override : input.defaults;
  const result = [...base];
  for (const d of input.defaults) {
    if (!result.includes(d)) result.push(d);
  }
  return result.filter((s) => !hidden.has(s));
}
```

- [ ] **Step 5: Tests grün + Commit**

Run: `pnpm --filter @cvmake/templates test:unit`
Expected: PASS.

```bash
git add packages/templates/src/utils packages/templates/test/utils.test.ts
git commit -m "feat(templates): add date/initials/section-order utils"
```

### Task 3.3: Shared CSS-Reset + @page-Regeln

**Files:**
- Create: `packages/templates/src/shared/reset.css`
- Create: `packages/templates/src/shared/print.css`
- Create: `packages/templates/src/shared/fonts.ts`

- [ ] **Step 1: `reset.css` (minimal, designfreundlich)**

```css
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  color: var(--text);
  background: var(--bg);
  font-kerning: normal;
  font-feature-settings: 'liga' 1, 'kern' 1;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
img { max-width: 100%; display: block; }
ul { margin: 0; padding: 0; list-style: none; }
a { color: inherit; text-decoration: none; }
h1, h2, h3, h4, h5, h6, p { margin: 0; }
.cv-page { break-after: page; }
.cv-no-break { break-inside: avoid; }
```

- [ ] **Step 2: `print.css` (A4, margins)**

```css
@page { size: A4; margin: 0; }
@media print {
  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
```

- [ ] **Step 3: `fonts.ts` — Google-Fonts-Helper**

```ts
export interface FontFace {
  family: string;
  weights: number[];
  italic?: boolean;
}

export function googleFontsHref(faces: FontFace[]): string {
  const families = faces
    .map((f) => {
      const axis = f.italic ? 'ital,wght' : 'wght';
      const values = f.italic
        ? f.weights.flatMap((w) => [`0,${w}`, `1,${w}`]).join(';')
        : f.weights.join(';');
      return `family=${encodeURIComponent(f.family)}:${axis}@${values}`;
    })
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/templates/src/shared
git commit -m "feat(templates): add shared reset/print css + google-fonts helper"
```

### Task 3.4: Template-Meta-Validator (Build-Time-Guard)

**Files:**
- Create: `packages/templates/src/validate.ts`
- Create: `packages/templates/test/validate.test.ts`

- [ ] **Step 1: Failing Test**

`test/validate.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { validateTemplate } from '../src/validate.js';
import type { TemplateDefinition } from '@cvmake/schema';

const base: TemplateDefinition = {
  meta: {
    id: 'x',
    name: 'X',
    description: 'x',
    supportsPhoto: true,
    photoFallback: 'initials',
    supportedLocales: ['de', 'en'],
    defaultSectionOrder: ['summary'],
    supportsPagination: true,
  },
  palettes: [
    {
      id: 'x-a',
      name: 'A',
      accent: '#000000',
      background: '#ffffff',
      surface: '#eeeeee',
      text: '#000000',
      textMuted: '#666666',
      textOnAccent: '#ffffff',
    },
  ],
  Component: () => null as unknown as JSX.Element,
};

describe('validateTemplate', () => {
  it('akzeptiert valides Template', () => {
    expect(() => validateTemplate(base)).not.toThrow();
  });
  it('verbietet leere Palette-Liste', () => {
    expect(() => validateTemplate({ ...base, palettes: [] })).toThrow(/at least one palette/);
  });
  it('verbietet doppelte Palette-IDs', () => {
    expect(() =>
      validateTemplate({ ...base, palettes: [base.palettes[0]!, base.palettes[0]!] }),
    ).toThrow(/duplicate palette id/);
  });
});
```

- [ ] **Step 2: `packages/templates/src/validate.ts`**

```ts
import { ColorPaletteSchema, TemplateMetaSchema, type TemplateDefinition } from '@cvmake/schema';

export function validateTemplate(def: TemplateDefinition): void {
  TemplateMetaSchema.parse(def.meta);
  if (def.palettes.length === 0) {
    throw new Error(`template ${def.meta.id}: must have at least one palette`);
  }
  const ids = new Set<string>();
  for (const palette of def.palettes) {
    ColorPaletteSchema.parse(palette);
    if (ids.has(palette.id)) {
      throw new Error(`template ${def.meta.id}: duplicate palette id ${palette.id}`);
    }
    ids.add(palette.id);
  }
}
```

- [ ] **Step 3: In `registerTemplate` integrieren**

Ändere `registry.ts`:

```ts
import { validateTemplate } from './validate.js';
// …
export function registerTemplate(def: TemplateDefinition): void {
  validateTemplate(def);
  if (REGISTRY.has(def.meta.id)) {
    throw new Error(`Template ${def.meta.id} already registered`);
  }
  REGISTRY.set(def.meta.id, def);
}
```

- [ ] **Step 4: Tests grün + Commit**

Run: `pnpm --filter @cvmake/templates test:unit`
Expected: PASS.

```bash
git add packages/templates/src/validate.ts packages/templates/src/registry.ts packages/templates/test/validate.test.ts
git commit -m "feat(templates): add build-time template validator"
```

**Phase-3 Review-Checkpoint:** "Phase 3 fertig. Registry + Shared-CSS + Utils. Freigabe für Phase 4 (Classic Serif End-to-End-Proof)?"

---

## Phase 4 — End-to-End-Proof: Classic Serif

Ziel: **Ein** Template komplett durchbauen (Loader → Renderer → PDF → CLI-Build → echtes PDF aus Markus' Content). Das beweist die Architektur, bevor Phase 6 die anderen 7 Templates parallel ausrollt.

Diese Phase enthält auch das Aufsetzen des CLI-Minimalkommandos (`cvmake build`), damit das PDF reproduzierbar aus Markus' YAML erzeugt werden kann.

### Task 4.1: Markus-Content aus PDFs extrahieren

**Files:**
- Create: `data/cvs/cv.de.yaml`
- Create: `data/cvs/cv.en.yaml`
- Create: `data/cvs/photos/markus.jpg` (aus altem PDF extrahiert)

- [ ] **Step 1: Alten und aktuellen CV als Text extrahieren**

Run:
```bash
pnpm add -D -w pdf-parse
node -e "import('pdf-parse').then(async({default:p})=>{const fs=await import('node:fs');const b=fs.readFileSync('/Users/markus/Desktop/Markus_Wiesecke_CV_2025-06-27.pdf');const r=await p(b);process.stdout.write(r.text);})" > /tmp/cv-old.txt
node -e "import('pdf-parse').then(async({default:p})=>{const fs=await import('node:fs');const b=fs.readFileSync('/Users/markus/Desktop/Markus_Wiesecke_CV_aktuell.pdf');const r=await p(b);process.stdout.write(r.text);})" > /tmp/cv-new.txt
```

- [ ] **Step 2: Foto aus dem alten PDF als JPG extrahieren**

Run:
```bash
# pdfimages ist Teil von poppler
brew list poppler >/dev/null 2>&1 || brew install poppler
pdfimages -j /Users/markus/Desktop/Markus_Wiesecke_CV_2025-06-27.pdf /tmp/cv-img
ls /tmp/cv-img-*.jpg
# → manuell beste Variante aussuchen
cp /tmp/cv-img-000.jpg data/cvs/photos/markus.jpg
```

(Falls pdfimages kein Foto findet, Markus lädt später ein aktuelleres Bild über die Web-UI.)

- [ ] **Step 3: `data/cvs/cv.de.yaml` schreiben**

Struktur (Inhalt aus `/tmp/cv-old.txt` und `/tmp/cv-new.txt` mergen, aktuellerer Content gewinnt):
```yaml
meta:
  locale: de
  updatedAt: '2026-04-24'
personal:
  firstName: Markus
  lastName: Wiesecke
  title: Fullstack Developer / SaaS Builder / KI-Enthusiast
  photo: photos/markus.jpg
  birthDate: '1987-01-13'
  contacts:
    email: hello@codevena.dev
    phone: '+49 175 9025586'
    website: https://codevena.dev
    github: codevena
    linkedin: markus-wiesecke
    location: Wuppertal, DE
summary: >-
  Autodidaktischer Fullstack Developer mit Fokus auf Next.js, TypeScript und
  PostgreSQL. Ich baue eigene SaaS-Produkte von der Architektur bis zum
  Deployment (Hetzner + Coolify) und denke dabei in Produkten, nicht in Features.
experience:
  - title: Fullstack Developer (Selbstständig)
    company: Codevena
    location: Wuppertal
    startDate: '2020-01'
    bullets:
      - Eigene SaaS-Produkte (FlashBuddy, Dealbarg, Ludotek, AI Builds) von Architektur bis Deployment
      - Next.js 16 + TypeScript + PostgreSQL + Prisma, Hetzner Server + Coolify
      - OpenAI / OpenRouter, Embeddings, pgvector, TTS
    tags: [Next.js, TypeScript, PostgreSQL, Prisma, Docker, OpenAI]
education:
  - degree: Fachinformatiker Anwendungsentwicklung (Umschulung)
    institution: BBQ Düsseldorf
    location: Düsseldorf
    startDate: '2024-08'
    endDate: '2026-07'
skills:
  categorized:
    Frontend: [Next.js, React, TypeScript, Tailwind CSS]
    Backend: [Node.js, PostgreSQL, Prisma, Redis, MongoDB]
    DevOps: [Docker, Coolify, Hetzner, Cloudflare, Tailscale]
    KI: [OpenAI, OpenRouter, pgvector, Embeddings, TTS]
languages:
  - { name: Deutsch, level: native }
  - { name: Englisch, level: B2 }
  - { name: Farsi, level: basic }
rendering:
  template: classic-serif
  palette: classic-grey
```

(Genaue Inhalte gleicht Markus im Review-Checkpoint ab.)

- [ ] **Step 4: `data/cvs/cv.en.yaml` als EN-Variante schreiben**

Same Struktur, Labels/Strings auf Englisch, `meta.locale: en`, `personal.title` → `"Fullstack Developer / SaaS Builder / AI Enthusiast"`. Institutionen bleiben im Original (z. B. "BBQ Düsseldorf").

- [ ] **Step 5: Loader-Smoke-Test mit echtem Content**

Run:
```bash
pnpm --filter @cvmake/core build
node -e "import('@cvmake/core').then(async({loadCV})=>{console.log(await loadCV('data/cvs/cv.de.yaml'))})"
```
Expected: Validiertes CVData-Objekt auf stdout.

- [ ] **Step 6: Commit**

```bash
git add data/cvs
git commit -m "content: add markus cv.de.yaml + cv.en.yaml + photo"
```

### Task 4.2: Classic-Serif-Template — Struktur + Meta

**Files:**
- Create: `packages/templates/src/classic-serif/meta.ts`
- Create: `packages/templates/src/classic-serif/palettes.ts`
- Create: `packages/templates/src/classic-serif/styles.css`
- Create: `packages/templates/src/classic-serif/Template.tsx`
- Create: `packages/templates/src/classic-serif/index.ts`

- [ ] **Step 1: `meta.ts`**

```ts
import type { TemplateMeta } from '@cvmake/schema';

export const meta: TemplateMeta = {
  id: 'classic-serif',
  name: 'Classic Serif',
  description:
    'Zweispaltiges Layout mit Serifen-Typografie, rundem Foto und ruhiger grauer Palette. Klassisch, formell, zeitlos.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
```

- [ ] **Step 2: `palettes.ts`**

```ts
import type { ColorPalette } from '@cvmake/schema';

export const palettes: ColorPalette[] = [
  {
    id: 'classic-grey',
    name: 'Classic Grey',
    accent: '#7a8894',
    background: '#ffffff',
    surface: '#f4f4f5',
    text: '#0f172a',
    textMuted: '#64748b',
    textOnAccent: '#ffffff',
  },
  {
    id: 'classic-navy',
    name: 'Classic Navy',
    accent: '#1e3a5f',
    background: '#ffffff',
    surface: '#f1f5f9',
    text: '#0b1220',
    textMuted: '#475569',
    textOnAccent: '#ffffff',
  },
  {
    id: 'classic-ink',
    name: 'Classic Ink',
    accent: '#111827',
    background: '#ffffff',
    surface: '#f4f4f5',
    text: '#111827',
    textMuted: '#6b7280',
    textOnAccent: '#ffffff',
  },
];
```

- [ ] **Step 3: `styles.css`**

```css
@import '../shared/reset.css';
@import '../shared/print.css';

.classic-serif {
  font-family: 'EB Garamond', 'Garamond', 'Times New Roman', serif;
  font-size: 10.5pt;
  line-height: 1.45;
  color: var(--text);
}
.classic-serif__page {
  display: grid;
  grid-template-columns: 220pt 1fr;
  min-height: 297mm;
  width: 210mm;
  margin: 0 auto;
}
.classic-serif__sidebar {
  background: var(--surface);
  padding: 22mm 12mm 18mm;
  color: var(--text);
}
.classic-serif__main {
  padding: 22mm 14mm 18mm;
}
.classic-serif__photo {
  width: 140pt;
  height: 140pt;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto 14pt;
  border: 4pt solid var(--bg);
  box-shadow: 0 0 0 1pt var(--accent);
}
.classic-serif__initials {
  width: 140pt; height: 140pt; border-radius: 50%;
  background: var(--accent); color: var(--text-on-accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 48pt; margin: 0 auto 14pt;
}
.classic-serif__name {
  font-family: 'Playfair Display', 'Garamond', serif;
  font-weight: 600;
  font-size: 22pt;
  line-height: 1.1;
  text-wrap: balance;
}
.classic-serif__title { color: var(--text-muted); font-style: italic; margin-top: 4pt; }
.classic-serif__section { margin-top: 14pt; }
.classic-serif__section h2 {
  font-family: 'Playfair Display', serif;
  font-size: 12pt;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 6pt;
  border-bottom: 0.5pt solid var(--accent);
  padding-bottom: 2pt;
}
.classic-serif__exp { margin-bottom: 10pt; break-inside: avoid; }
.classic-serif__exp-head {
  display: flex; justify-content: space-between; gap: 8pt; align-items: baseline;
}
.classic-serif__exp-title { font-weight: 600; }
.classic-serif__exp-meta { color: var(--text-muted); font-size: 9.5pt; }
.classic-serif__bullets { padding-left: 14pt; list-style: disc; margin-top: 3pt; }
.classic-serif__bullets li { margin-bottom: 2pt; }
.classic-serif__contacts { font-size: 9.5pt; line-height: 1.6; }
.classic-serif__contacts dt { color: var(--text-muted); }
.classic-serif__skills-group { margin-bottom: 6pt; }
.classic-serif__skills-group h3 {
  font-size: 10pt; font-weight: 600; margin-bottom: 2pt; color: var(--accent);
}
```

- [ ] **Step 4: `Template.tsx` (vollständige Komponente)**

```tsx
import type { TemplateProps } from '@cvmake/schema';
import { formatDateRange } from '../utils/dates.js';
import { initials } from '../utils/initials.js';
import { resolveSectionOrder } from '../utils/sections.js';
import { meta } from './meta.js';

export function ClassicSerifTemplate({ data, palette, locale, labels }: TemplateProps) {
  const sections = resolveSectionOrder({
    override: data.rendering.sectionOrder,
    defaults: meta.defaultSectionOrder,
    hidden: data.rendering.hiddenSections ?? [],
  });

  return (
    <article className="classic-serif">
      <div className="classic-serif__page">
        <aside className="classic-serif__sidebar">
          {data.personal.photo ? (
            <img
              className="classic-serif__photo"
              src={`/${data.personal.photo}`}
              alt={`${data.personal.firstName} ${data.personal.lastName}`}
            />
          ) : (
            <div className="classic-serif__initials" aria-hidden>
              {initials(data.personal.firstName, data.personal.lastName)}
            </div>
          )}

          <section className="classic-serif__section">
            <h2>{labels.personalData}</h2>
            <dl className="classic-serif__contacts">
              {data.personal.contacts.email && (
                <>
                  <dt>{labels.email}</dt>
                  <dd>{data.personal.contacts.email}</dd>
                </>
              )}
              {data.personal.contacts.phone && (
                <>
                  <dt>{labels.phone}</dt>
                  <dd>{data.personal.contacts.phone}</dd>
                </>
              )}
              {data.personal.contacts.location && (
                <>
                  <dt>{labels.location}</dt>
                  <dd>{data.personal.contacts.location}</dd>
                </>
              )}
              {data.personal.contacts.website && (
                <>
                  <dt>{labels.website}</dt>
                  <dd>{data.personal.contacts.website}</dd>
                </>
              )}
              {data.personal.contacts.github && (
                <>
                  <dt>{labels.github}</dt>
                  <dd>github.com/{data.personal.contacts.github}</dd>
                </>
              )}
              {data.personal.contacts.linkedin && (
                <>
                  <dt>{labels.linkedin}</dt>
                  <dd>linkedin.com/in/{data.personal.contacts.linkedin}</dd>
                </>
              )}
              {data.personal.birthDate && (
                <>
                  <dt>{labels.birthDate}</dt>
                  <dd>{data.personal.birthDate}</dd>
                </>
              )}
            </dl>
          </section>

          {data.skills && (data.skills.categorized || data.skills.stack) && (
            <section className="classic-serif__section">
              <h2>{labels.skills}</h2>
              {data.skills.categorized &&
                Object.entries(data.skills.categorized).map(([group, items]) => (
                  <div className="classic-serif__skills-group" key={group}>
                    <h3>{group}</h3>
                    <div>{items.join(' · ')}</div>
                  </div>
                ))}
              {data.skills.stack && !data.skills.categorized && (
                <div>{data.skills.stack.join(' · ')}</div>
              )}
            </section>
          )}

          {data.languages && data.languages.length > 0 && (
            <section className="classic-serif__section">
              <h2>{labels.languages}</h2>
              <ul>
                {data.languages.map((l) => (
                  <li key={l.name}>
                    {l.name} — {l.label ?? l.level}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <main className="classic-serif__main">
          <header>
            <h1 className="classic-serif__name">
              {data.personal.firstName} {data.personal.lastName}
            </h1>
            {data.personal.title && (
              <p className="classic-serif__title">{data.personal.title}</p>
            )}
          </header>

          {sections.map((section) => {
            if (section === 'summary' && data.summary) {
              return (
                <section className="classic-serif__section" key="summary">
                  <h2>{labels.summary}</h2>
                  <p>{data.summary}</p>
                </section>
              );
            }
            if (section === 'experience' && data.experience.length > 0) {
              return (
                <section className="classic-serif__section" key="experience">
                  <h2>{labels.experience}</h2>
                  {data.experience.map((e, i) => (
                    <div className="classic-serif__exp" key={`${e.company}-${i}`}>
                      <div className="classic-serif__exp-head">
                        <div className="classic-serif__exp-title">
                          {e.title} · {e.company}
                        </div>
                        <div className="classic-serif__exp-meta">
                          {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                        </div>
                      </div>
                      {e.location && (
                        <div className="classic-serif__exp-meta">{e.location}</div>
                      )}
                      {e.bullets.length > 0 && (
                        <ul className="classic-serif__bullets">
                          {e.bullets.map((b, j) => (
                            <li key={j}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </section>
              );
            }
            if (section === 'education' && data.education.length > 0) {
              return (
                <section className="classic-serif__section" key="education">
                  <h2>{labels.education}</h2>
                  {data.education.map((e, i) => (
                    <div className="classic-serif__exp" key={`${e.institution}-${i}`}>
                      <div className="classic-serif__exp-head">
                        <div className="classic-serif__exp-title">
                          {e.degree} · {e.institution}
                        </div>
                        <div className="classic-serif__exp-meta">
                          {formatDateRange(e.startDate, e.endDate, locale, labels.present)}
                        </div>
                      </div>
                      {e.bullets && e.bullets.length > 0 && (
                        <ul className="classic-serif__bullets">
                          {e.bullets.map((b, j) => (
                            <li key={j}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </section>
              );
            }
            return null;
          })}

          {data.customSections?.map((cs) => (
            <section className="classic-serif__section" key={cs.id}>
              <h2>{cs.title}</h2>
              {cs.items.map((it, i) => (
                <div className="classic-serif__exp" key={i}>
                  <div className="classic-serif__exp-title">{it.title}</div>
                  {it.subtitle && (
                    <div className="classic-serif__exp-meta">{it.subtitle}</div>
                  )}
                  {it.description && <p>{it.description}</p>}
                  {it.bullets && (
                    <ul className="classic-serif__bullets">
                      {it.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}
        </main>
      </div>
    </article>
  );
}
```

- [ ] **Step 5: `index.ts` — Registry-Eintrag + CSS-Import**

```ts
import type { TemplateDefinition } from '@cvmake/schema';
import cssUrl from './styles.css?raw';
import { meta } from './meta.js';
import { palettes } from './palettes.js';
import { ClassicSerifTemplate } from './Template.js';

export const classicSerif: TemplateDefinition & { css: string } = {
  meta,
  palettes,
  Component: ClassicSerifTemplate,
  css: cssUrl,
};
```

Hinweis: Das `?raw`-Import benötigt einen Vite/TSC-Config-Support. Alternative: CSS als String exportieren via `fs.readFile` im Build. Da Turborepo/tsc-Builds kein `?raw` ohne Bundler haben, nutzen wir einen Shim (nächster Step).

- [ ] **Step 6: CSS-Loader-Shim (keine Bundler-Spezialsyntax)**

Ersetze Step-5-`index.ts` durch:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TemplateDefinition } from '@cvmake/schema';
import { meta } from './meta.js';
import { palettes } from './palettes.js';
import { ClassicSerifTemplate } from './Template.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.join(__dirname, 'styles.css'), 'utf8');

export const classicSerif: TemplateDefinition & { css: string } = {
  meta,
  palettes,
  Component: ClassicSerifTemplate,
  css,
};
```

TSC-Config: `tsup` oder tsc kopiert `.css` nicht automatisch → kleiner Build-Hook nötig (nächste Task).

- [ ] **Step 7: Commit**

```bash
git add packages/templates/src/classic-serif
git commit -m "feat(templates/classic-serif): add template component + palettes + styles"
```

### Task 4.3: Asset-Copy-Hook für Templates

**Files:**
- Modify: `packages/templates/package.json`
- Create: `packages/templates/scripts/copy-assets.mjs`

- [ ] **Step 1: Copy-Script**

`scripts/copy-assets.mjs`:
```js
import { cp } from 'node:fs/promises';
import { globSync } from 'node:fs';
import path from 'node:path';

const srcRoot = path.resolve('src');
const distRoot = path.resolve('dist');

const files = globSync('src/**/*.{css,png,woff2,svg}');
await Promise.all(
  files.map(async (f) => {
    const dest = f.replace(/^src/, 'dist');
    await cp(f, dest, { recursive: false, force: true });
  }),
);
console.log(`copied ${files.length} asset(s)`);
```

- [ ] **Step 2: `package.json` build-Script erweitern**

```json
"build": "tsc -p tsconfig.json && node scripts/copy-assets.mjs"
```

- [ ] **Step 3: Build-Lauf verifizieren**

Run: `pnpm --filter @cvmake/templates build`
Expected: `dist/classic-serif/styles.css` existiert.

- [ ] **Step 4: Commit**

```bash
git add packages/templates/scripts packages/templates/package.json
git commit -m "build(templates): copy css/image assets to dist"
```

### Task 4.4: Classic-Serif-Template registrieren + Registry-Bootstrap

**Files:**
- Create: `packages/templates/src/bootstrap.ts`
- Modify: `packages/templates/src/index.ts`

- [ ] **Step 1: `bootstrap.ts`**

```ts
import { clearRegistry, registerTemplate } from './registry.js';
import { classicSerif } from './classic-serif/index.js';

export function bootstrapTemplates(): void {
  clearRegistry();
  registerTemplate(classicSerif);
}
```

- [ ] **Step 2: `index.ts` Exports**

```ts
export * from './bootstrap.js';
export * from './registry.js';
export { classicSerif } from './classic-serif/index.js';
```

- [ ] **Step 3: Commit**

```bash
git add packages/templates/src
git commit -m "feat(templates): wire classic-serif into registry bootstrap"
```

### Task 4.5: Classic-Serif-Snapshot-Tests

**Files:**
- Create: `packages/templates/test/classic-serif.test.tsx`

- [ ] **Step 1: Test**

```tsx
/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { fullFixture, minimalFixture } from '@cvmake/schema/test/fixtures.js';
import { getLabels } from '@cvmake/core';
import { classicSerif } from '../src/classic-serif/index.js';

const palette = classicSerif.palettes[0]!;

describe('ClassicSerifTemplate', () => {
  it('rendert Voll-Fixture ohne Fehler', () => {
    const html = renderToStaticMarkup(
      <classicSerif.Component
        data={fullFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toContain('Markus Wiesecke');
    expect(html).toContain('Berufserfahrung');
    expect(html).toContain('Codevena');
  });

  it('zeigt Initialen wenn kein Foto', () => {
    const html = renderToStaticMarkup(
      <classicSerif.Component
        data={minimalFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toMatch(/classic-serif__initials[^>]*>MW/);
  });

  it('rendert EN-Labels bei locale=en', () => {
    const html = renderToStaticMarkup(
      <classicSerif.Component
        data={{ ...fullFixture, meta: { locale: 'en' } }}
        palette={palette}
        locale="en"
        labels={getLabels('en')}
      />,
    );
    expect(html).toContain('Experience');
    expect(html).not.toContain('Berufserfahrung');
  });

  it('matched HTML-Snapshot', () => {
    const html = renderToStaticMarkup(
      <classicSerif.Component
        data={fullFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Tests grün**

Run: `pnpm --filter @cvmake/templates test:unit`
Expected: PASS × 4 (Snapshot wird neu erzeugt).

- [ ] **Step 3: Commit**

```bash
git add packages/templates/test/classic-serif.test.tsx packages/templates/test/__snapshots__
git commit -m "test(templates/classic-serif): add render + snapshot tests"
```

### Task 4.6: CLI-Minimalkommando `cvmake build`

**Files:**
- Create: `apps/cli/bin/cvmake`
- Create: `apps/cli/src/index.ts`
- Create: `apps/cli/src/commands/build.ts`

- [ ] **Step 1: `bin/cvmake` Shebang-Wrapper**

```
#!/usr/bin/env node
import('../dist/index.js');
```

Run: `chmod +x apps/cli/bin/cvmake`

- [ ] **Step 2: `src/commands/build.ts`**

```ts
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import pc from 'picocolors';
import {
  generatePDF,
  loadCV,
  renderCV,
  wrapHtmlDocument,
  shutdownPdfBrowser,
} from '@cvmake/core';
import { bootstrapTemplates, getTemplate } from '@cvmake/templates';

export interface BuildArgs {
  yaml: string;
  template?: string;
  palette?: string;
  output: string;
}

export async function runBuild(args: BuildArgs): Promise<void> {
  bootstrapTemplates();
  const data = await loadCV(args.yaml);
  const templateId = args.template ?? data.rendering.template;
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`unknown template: ${templateId}`);
  }
  const rendered = renderCV({ data, template, paletteId: args.palette ?? data.rendering.palette });
  const css = `${rendered.css}\n${(template as unknown as { css?: string }).css ?? ''}`;
  const html = wrapHtmlDocument({
    title: `${data.personal.firstName} ${data.personal.lastName} — CV`,
    html: rendered.html,
    css,
  });
  const pdf = await generatePDF(html);
  const outPath = path.resolve(args.output);
  await writeFile(outPath, pdf);
  await shutdownPdfBrowser();
  console.warn(pc.green(`✓ wrote ${outPath} (${pdf.byteLength} bytes)`));
}
```

- [ ] **Step 3: `src/index.ts` (commander)**

```ts
import { Command } from 'commander';
import { runBuild } from './commands/build.js';

const program = new Command();
program.name('cvmake').description('cvMake CLI').version('0.0.0');

program
  .command('build')
  .argument('<yaml>', 'Pfad zur CV-YAML')
  .option('-t, --template <id>', 'Template-ID (default: aus YAML rendering.template)')
  .option('-p, --palette <id>', 'Palette-ID (default: aus YAML)')
  .option('-o, --output <path>', 'Output-PDF-Pfad', 'out/cv.pdf')
  .action(async (yaml, opts) => {
    await runBuild({ yaml, template: opts.template, palette: opts.palette, output: opts.output });
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
```

- [ ] **Step 4: Build + Smoke-Test**

Run:
```bash
pnpm --filter @cvmake/schema build
pnpm --filter @cvmake/core build
pnpm --filter @cvmake/templates build
pnpm --filter @cvmake/cli build
mkdir -p out
node apps/cli/dist/index.js build data/cvs/cv.de.yaml -o out/cv.de.pdf
ls -lh out/cv.de.pdf
```
Expected: `out/cv.de.pdf` existiert, > 20 KB, öffnet in Preview.

- [ ] **Step 5: Markus öffnet das PDF und bewertet**

Review-Checkpoint: Markus schaut sich das PDF visuell an. Diskussion über Proportionen, Typografie, Spacing. Agent notiert Feedback. **Wenn Feedback vorliegt: zurück zu Task 4.2, Styles anpassen, erneut bauen, erneut zeigen.** Wiederholen bis Markus grünes Licht gibt.

- [ ] **Step 6: Commit**

```bash
git add apps/cli
git commit -m "feat(cli): add build command producing pdf via core + templates"
```

### Task 4.7: Visual-Baseline für Classic Serif

**Files:**
- Create: `packages/templates/vitest.visual.config.ts`
- Create: `packages/templates/test/visual/classic-serif.visual.test.ts`
- Create: `packages/templates/__tests__/__visual__/classic-serif/classic-grey.page1.png` (Baseline)

- [ ] **Step 1: Visual-Vitest-Config**

`vitest.visual.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/visual/**/*.visual.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
```

- [ ] **Step 2: Visual-Harness**

`test/visual/classic-serif.visual.test.ts`:
```ts
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import puppeteer from 'puppeteer';
import {
  generatePDF,
  renderCV,
  wrapHtmlDocument,
  getLabels,
  shutdownPdfBrowser,
} from '@cvmake/core';
import { bootstrapTemplates, getTemplate } from '../../src/index.js';
import { fullFixture } from '@cvmake/schema/test/fixtures.js';

const BASELINE_DIR = path.resolve('__tests__/__visual__/classic-serif');
const ACTUAL_DIR = path.resolve('__tests__/__visual__/classic-serif/.actual');
const UPDATE = process.env.UPDATE_VISUAL === '1';

afterAll(() => shutdownPdfBrowser());

async function renderPageOneAsPng(paletteId: string): Promise<Buffer> {
  bootstrapTemplates();
  const template = getTemplate('classic-serif')!;
  const rendered = renderCV({ data: fullFixture, template, paletteId });
  const css = `${rendered.css}\n${(template as unknown as { css: string }).css}`;
  const html = wrapHtmlDocument({ title: 'CV', html: rendered.html, css });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buf = await page.screenshot({ fullPage: false, type: 'png' });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

describe('classic-serif visual baseline', () => {
  it('matched Baseline für classic-grey', async () => {
    const png = await renderPageOneAsPng('classic-grey');
    const baselinePath = path.join(BASELINE_DIR, 'classic-grey.page1.png');
    await mkdir(ACTUAL_DIR, { recursive: true });
    await writeFile(path.join(ACTUAL_DIR, 'classic-grey.page1.png'), png);

    if (UPDATE || !existsSync(baselinePath)) {
      await mkdir(BASELINE_DIR, { recursive: true });
      await writeFile(baselinePath, png);
      return;
    }

    const baseline = PNG.sync.read(await readFile(baselinePath));
    const actual = PNG.sync.read(png);
    const diff = new PNG({ width: baseline.width, height: baseline.height });
    const mismatched = pixelmatch(
      baseline.data,
      actual.data,
      diff.data,
      baseline.width,
      baseline.height,
      { threshold: 0.1 },
    );
    const total = baseline.width * baseline.height;
    expect(mismatched / total).toBeLessThan(0.001);
  });
});
```

- [ ] **Step 3: Baseline erzeugen**

Run:
```bash
UPDATE_VISUAL=1 pnpm --filter @cvmake/templates test:visual
```
Expected: PASS, Baseline `__tests__/__visual__/classic-serif/classic-grey.page1.png` wird committet.

- [ ] **Step 4: Re-Run ohne UPDATE**

Run: `pnpm --filter @cvmake/templates test:visual`
Expected: PASS (diff < 0.1%).

- [ ] **Step 5: Commit**

```bash
git add packages/templates/vitest.visual.config.ts packages/templates/test/visual packages/templates/__tests__
git commit -m "test(templates/classic-serif): add visual baseline regression"
```

**Phase-4 Review-Checkpoint:** "Phase 4 fertig. Classic Serif komplett: Template, Snapshot-Tests, Visual-Baseline, PDF aus Markus-YAML gebaut. Architektur bewiesen. Freigabe für Phase 5 (CLI vollständig)?"

---

## Phase 5 — CLI vollständig

Ziel: `validate`, `list-templates`, `build --all`-Kommandos + Fehler-Reporter + Integration-Tests.

### Task 5.1: `cvmake validate`

**Files:**
- Create: `apps/cli/src/commands/validate.ts`
- Modify: `apps/cli/src/index.ts`
- Create: `apps/cli/test/validate.test.ts`
- Create: `apps/cli/vitest.config.ts`

- [ ] **Step 1: Vitest-Config**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['test/**/*.test.ts'], environment: 'node' } });
```

- [ ] **Step 2: Failing Test**

`test/validate.test.ts`:
```ts
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runValidate } from '../src/commands/validate.js';

describe('validate', () => {
  it('exit 0 bei gültiger YAML', async () => {
    const p = path.resolve('../../packages/core/test/fixtures/valid.de.yaml');
    const code = await runValidate(p);
    expect(code).toBe(0);
  });

  it('exit 1 bei kaputter YAML', async () => {
    const p = path.resolve('../../packages/core/test/fixtures/broken.yaml');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = await runValidate(p);
    expect(code).toBe(1);
    spy.mockRestore();
  });
});
```

- [ ] **Step 3: `commands/validate.ts`**

```ts
import pc from 'picocolors';
import { loadCV, ValidationError, YAMLParseError } from '@cvmake/core';

export async function runValidate(yamlPath: string): Promise<number> {
  try {
    await loadCV(yamlPath);
    console.warn(pc.green(`✓ ${yamlPath} valid`));
    return 0;
  } catch (err) {
    if (err instanceof YAMLParseError) {
      console.error(
        pc.red(`✗ ${err.path} YAML parse error @ line ${err.line ?? '?'}: ${err.message}`),
      );
    } else if (err instanceof ValidationError) {
      console.error(pc.red(`✗ ${err.path}`));
      for (const issue of err.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
    } else {
      console.error(pc.red(String(err)));
    }
    return 1;
  }
}
```

- [ ] **Step 4: In `index.ts` einhängen**

```ts
import { runValidate } from './commands/validate.js';

program
  .command('validate')
  .argument('<yaml>', 'Pfad zur YAML')
  .action(async (yaml) => {
    process.exit(await runValidate(yaml));
  });
```

- [ ] **Step 5: Tests grün + Commit**

Run: `pnpm --filter @cvmake/cli test:unit`
Expected: PASS.

```bash
git add apps/cli/src apps/cli/test apps/cli/vitest.config.ts
git commit -m "feat(cli): add validate command with zod issue reporting"
```

### Task 5.2: `cvmake list-templates`

**Files:**
- Create: `apps/cli/src/commands/list-templates.ts`
- Modify: `apps/cli/src/index.ts`

- [ ] **Step 1: Command**

```ts
import pc from 'picocolors';
import { bootstrapTemplates, listTemplates } from '@cvmake/templates';

export function runListTemplates(): number {
  bootstrapTemplates();
  const templates = listTemplates();
  for (const t of templates) {
    console.warn(pc.bold(`${t.meta.id}`), pc.gray(`(${t.meta.name})`));
    console.warn(`  ${t.meta.description}`);
    console.warn(
      `  palettes: ${t.palettes.map((p) => p.id).join(', ')}`,
    );
    console.warn(`  photo: ${t.meta.supportsPhoto ? 'yes' : 'no'} (fallback: ${t.meta.photoFallback})`);
  }
  return 0;
}
```

- [ ] **Step 2: In `index.ts`**

```ts
program
  .command('list-templates')
  .description('listet alle Templates mit Paletten')
  .action(() => process.exit(runListTemplates()));
```

- [ ] **Step 3: Smoke-Test**

Run: `node apps/cli/dist/index.js list-templates`
Expected: Klassische-Serif-Eintrag zu sehen.

- [ ] **Step 4: Commit**

```bash
git add apps/cli/src
git commit -m "feat(cli): add list-templates command"
```

### Task 5.3: `cvmake build --all`

**Files:**
- Modify: `apps/cli/src/commands/build.ts`
- Modify: `apps/cli/src/index.ts`

- [ ] **Step 1: `build` mit `--all`-Modus**

```ts
import { readdir, mkdir } from 'node:fs/promises';
// … existing imports …

export async function runBuildAll(dir: string, outDir: string): Promise<void> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  await mkdir(outDir, { recursive: true });
  for (const f of files) {
    const yaml = path.join(dir, f);
    const output = path.join(outDir, f.replace(/\.(yaml|yml)$/, '.pdf'));
    await runBuild({ yaml, output });
  }
}
```

- [ ] **Step 2: CLI-Option**

```ts
program
  .command('build-all')
  .description('baut alle data/cvs/*.yaml')
  .option('-d, --dir <path>', 'Verzeichnis', 'data/cvs')
  .option('-o, --output <path>', 'Output-Ordner', 'out')
  .action(async (opts) => {
    await runBuildAll(opts.dir, opts.output);
  });
```

- [ ] **Step 3: Smoke-Test**

Run:
```bash
pnpm --filter @cvmake/cli build
node apps/cli/dist/index.js build-all
ls -lh out/
```
Expected: `cv.de.pdf` + `cv.en.pdf` in `out/`.

- [ ] **Step 4: Commit**

```bash
git add apps/cli/src
git commit -m "feat(cli): add build-all batch command"
```

### Task 5.4: CLI-PDF-Integration-Test (pdf-parse)

**Files:**
- Create: `apps/cli/vitest.integration.config.ts`
- Create: `apps/cli/test/build.integration.test.ts`

- [ ] **Step 1: Config**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['test/**/*.integration.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
```

- [ ] **Step 2: Test**

```ts
import path from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { afterAll, describe, expect, it } from 'vitest';
import { default as pdfParse } from 'pdf-parse';
import { runBuild } from '../src/commands/build.js';
import { shutdownPdfBrowser } from '@cvmake/core';

afterAll(() => shutdownPdfBrowser());

describe('runBuild integration', () => {
  it('erzeugt PDF mit erwarteten Strings', async () => {
    const out = await mkdtemp(path.join(tmpdir(), 'cvmake-cli-'));
    const pdfPath = path.join(out, 'cv.pdf');
    await runBuild({
      yaml: path.resolve('../../data/cvs/cv.de.yaml'),
      output: pdfPath,
    });
    const buf = await readFile(pdfPath);
    const parsed = await pdfParse(buf);
    expect(parsed.text).toContain('Markus Wiesecke');
    expect(parsed.text).toContain('Berufserfahrung');
    await rm(out, { recursive: true });
  });
});
```

- [ ] **Step 3: Tests grün + Commit**

Run: `pnpm --filter @cvmake/cli test:integration`
Expected: PASS.

```bash
git add apps/cli/test apps/cli/vitest.integration.config.ts
git commit -m "test(cli): add pdf build integration test"
```

**Phase-5 Review-Checkpoint:** "Phase 5 fertig. CLI kann validate/list-templates/build/build-all. Freigabe für Phase 6 (parallele Template-Agents)?"

---

## Phase 6 — Parallele Template-Implementierung (7 Agents)

> **Status (2026-04-25):** Phase 6 fertig — alle 8 Templates leben (`classic-serif`, `modern-minimal`, `creative-accent`, `academic`, `monochrome-dark`, `editorial`, `corporate`, `tech-dev`). Snapshot-Tests 46/46, Visual-Baselines 8/8, Markus' echtes `cv.de.yaml` produziert 8 PDFs. Page-2-Top-Margin-Bug per `page.evaluate()`-Spacer-Injection in `packages/core/src/pdf.ts` adressiert (commit `e98aad5`); Puppeteer-Margin bleibt bei 0 → full-bleed Sidebar-Gradient erhalten. Bekannte Restprobleme (für Phase 6.5 / Polish-Runde):
> - **classic-serif**: page 2 yMin = 1.14 — `break-before:page` auf Grid-Items wird von Chromium nicht zuverlässig respektiert.
> - **creative-accent (4 pages)**: page 3 yMin = 0.75 — der Spacer-Detector verpasst den Übergang von Seite 2 → 3.
> - **modern-minimal**: page 2 yMin = 8.0 — partielle Wirkung, ~8pt statt 16pt Top-Spacing.
>
> Alternative Approaches getestet und verworfen: A1 (`display: table-header-group` div), A3 (`@page { @top { background } }` und `position: running()`), A6 (Puppeteer `headerTemplate` mit Gradient-Strip — funktionierte für tech-dev, aber benötigte per-template Palette-Threading), A7 (`margin-break: keep`). Detail-Findings im Commit-Log.

Ziel: Die verbleibenden 7 Templates durch je einen dedizierten Agent parallel implementieren lassen. **Benutze das `dispatching-parallel-agents`-Skill.** Jeder Agent bekommt einen vollständigen Brief (Style-Richtung, Typografie, Palette, Layout, Foto-Treatment, Section-Rendering, Tests, Visual-Baseline). Nach Abschluss jedes Agenten: Review + Merge + erneuter Run der gesamten Test-Suite.

**Feedback-Memory:** Kein Batching. Ein Agent = ein Template. Jeder liefert in einem eigenen Worktree oder Branch, Merge in main erfolgt einzeln nach Review.

### Task 6.1: Dispatching-Skill starten

- [ ] **Step 1: Invoke `superpowers:dispatching-parallel-agents`**

Ziel: 7 parallele Agents, jeder mit folgendem Standard-Brief-Kopf + template-spezifischen Sektionen:

```
Du bist Design-Agent für das cvMake-Template "<TEMPLATE-ID>".

REPO-CONTEXT:
- Working Directory: /Users/markus/Developer/cvMake
- Spec: docs/superpowers/specs/2026-04-24-cvmake-design.md
- Plan: docs/superpowers/plans/2026-04-24-cvmake-plan.md (diese Datei)
- Reference-Template: packages/templates/src/classic-serif/ (Struktur als Blueprint, NICHT Style kopieren)
- Bootstrap: packages/templates/src/bootstrap.ts — dort musst du dein Template am Ende eintragen.

DELIVERABLES (zwingend):
- packages/templates/src/<id>/meta.ts
- packages/templates/src/<id>/palettes.ts (1–5 Paletten)
- packages/templates/src/<id>/styles.css
- packages/templates/src/<id>/Template.tsx
- packages/templates/src/<id>/index.ts (Registry-Eintrag mit CSS-Shim wie in classic-serif)
- packages/templates/src/<id>/preview.png (Screenshot aus Puppeteer 600×848px)
- packages/templates/test/<id>.test.tsx (Snapshot + Rendering-Tests)
- packages/templates/test/visual/<id>.visual.test.ts (Visual-Baseline)
- packages/templates/__tests__/__visual__/<id>/<palette>.page1.png (committed baseline)

TEST-RULES:
- Minimum 4 Snapshot-Tests: Full-Fixture, Minimal-Fixture, EN-Locale, CustomSection-Rendering.
- Visual-Baseline via UPDATE_VISUAL=1 erzeugen, Baseline committen.
- `pnpm --filter @cvmake/templates build && pnpm --filter @cvmake/templates test:unit && pnpm --filter @cvmake/templates test:visual` MUSS grün sein.

INTEGRATION:
- Registry-Eintrag in bootstrap.ts ergänzen.
- Einen Build via CLI für data/cvs/cv.de.yaml mit deiner Template-ID ausführen (`node apps/cli/dist/index.js build data/cvs/cv.de.yaml -t <id> -o out/cv.de.<id>.pdf`) — PDF muss entstehen, > 20 KB, Markus' Name enthalten.

COMMIT:
- Ein Commit "feat(templates/<id>): add <Name> template with <N> palettes, visual baseline"
- KEINE "Co-Authored-By Claude" Zeile.

QUALITÄT:
- Dies ist KEIN Quick-and-Dirty-Template. Markus verlangt Design-Qualität ≥ eines professionellen Designers.
- Typografie: echte Font-Stacks, klare Hierarchie, konsistente Vertical-Rhythm.
- Keine generischen Bootstrap-Placebos. Jedes Template muss visuell klar als eigenständige Richtung erkennbar sein.

TEMPLATE-SPEZIFISCHE RICHTUNG:
<siehe unten>
```

### Task 6.2: Brief — Modern Minimal

**Template-ID:** `modern-minimal`
**Anwendungsfeld:** Product / UX / Design-nahe Rollen, moderne Tech-Unternehmen.
**Style-Richtung:**
- Sans-Serif only: `Inter` (oder `Söhne` falls lizenzfrei verfügbar) in 400/500/600.
- Großzügiger Whitespace, großes Leading.
- Einspaltig, linksbündig. Kein Sidebar.
- Foto: optional, klein (36pt), quadratisch mit 4pt Radius, oben rechts neben dem Namen.
- Akzentfarbe nur in Section-Labels (uppercase, tracking 0.18em) und Links.
- Keine Rahmen, keine Trennlinien — Trennung durch Spacing.

**Paletten (3):**
- `minimal-ink` (accent `#111827`)
- `minimal-ocean` (accent `#1f7a8c`)
- `minimal-rose` (accent `#b91c5c`)

**Sonderheiten:**
- Bullet-Lists: custom Bullets via `::marker { color: var(--accent); }`, Inhalts-Schrift 10pt.
- Date-Format: `MMM YYYY`.
- `customSections` als identisches Pattern wie Experience.

### Task 6.3: Brief — Creative Accent

**Template-ID:** `creative-accent`
**Anwendungsfeld:** Creative / Marketing / Editorial Tech.
**Style-Richtung:**
- Serif Headlines (`Fraunces` 700, 24–34pt Display-Setting) + Sans-Serif Body (`Inter`).
- Asymmetrisches Grid: 60/40-Split, links Content, rechts schmale Akzent-Spalte mit Paletten-Fill.
- Foto: full-bleed quadratisch (160pt) oben in der Akzent-Spalte, leicht ins Hauptlayout überlappend (-12pt margin-left).
- Große farbige Initial-Letter am Start des Summary-Paragraphen.
- Tags aus `experience.tags` als Pills (runde border-radius, bg = `surface`, text = `accent`).

**Paletten (4):**
- `creative-citrus` (accent `#f59e0b`)
- `creative-forest` (accent `#14532d`)
- `creative-indigo` (accent `#4338ca`)
- `creative-coral` (accent `#e11d48`)

### Task 6.4: Brief — Academic

**Template-ID:** `academic`
**Anwendungsfeld:** Universität, Forschung, Stipendium, Bewerbung im Öffentlichen Dienst.
**Style-Richtung:**
- Zurückhaltende Serifen-Typografie (`Crimson Pro` oder `Source Serif Pro`).
- KEIN Foto (`supportsPhoto: false`).
- Einspaltig, sehr klar strukturiert, Section-Titel als Small-Caps mit 1pt Unterstrich.
- Date-Spalte links (YYYY–YYYY) fix 16pt breit, Content rechts — "Resume-typische" Hanging-Indent.
- Publications-Support über `customSections` mit spezialisierter Rendering-Heuristik (wenn `item.subtitle` eine URL ist → klickbar).
- Font-size 10pt, line-height 1.5. Sehr dichte Information-Darstellung.

**Paletten (2):**
- `academic-slate` (accent `#1f2937`)
- `academic-burgundy` (accent `#7f1d1d`)

### Task 6.5: Brief — Monochrome Dark

**Template-ID:** `monochrome-dark`
**Anwendungsfeld:** Senior Engineer, Tech-Lead, Agentur-Portfolio-PDF.
**Style-Richtung:**
- Dunkler Background (`#0b0b0d` / `#151518`), helle Typo.
- Sans-Serif `Geist` oder `Inter`, 400/600.
- Foto: rund (110pt), Duotone-Filter (kann über CSS `filter: grayscale(1) contrast(1.08)` simuliert werden).
- Akzent sehr sparsam, nur Name-Unterstreichung + Icons.
- Section-Titel: Weight 500, uppercase, kleines letter-spacing.
- `print-color-adjust: exact` zwingend (dark bg muss gedruckt werden).

**Paletten (3):**
- `mono-carbon` (accent `#a1a1aa`, bg `#0b0b0d`)
- `mono-amber` (accent `#f59e0b`, bg `#0c0a09`)
- `mono-emerald` (accent `#10b981`, bg `#0b1210`)

**Sonderheiten:** Wegen dunklem Background muss das Visual-Baseline sehr scharf sein — threshold bleibt 0.1%, aber JPG-Compression-Artefakte vermeiden.

### Task 6.6: Brief — Editorial

**Template-ID:** `editorial`
**Anwendungsfeld:** Journalistisch / Kolumnen-Stil / Publishing.
**Style-Richtung:**
- Magazin-Look: `Fraunces` Display 28pt + `Source Sans Pro` Body.
- Zweispaltig, wie Print-Zeitung. Überschriften als "Artikel-Titel".
- Summary läuft in 2-Spalten-Satz (CSS `column-count: 2`, `column-gap: 12pt`).
- Initial-Letter im Summary (Drop-Cap, 3-zeilig).
- Foto: breit quer (full-width, 48pt Höhe, object-fit cover) als "Artikel-Hero" ganz oben.
- Sehr strenge Rhythmik: Linie-Höhe 1.38, Spacing immer in 4pt-Schritten.

**Paletten (2):**
- `editorial-paper` (accent `#8b0000`, bg `#fdfcf7`)
- `editorial-cream` (accent `#0c4a6e`, bg `#fbf7f0`)

### Task 6.7: Brief — Corporate

**Template-ID:** `corporate`
**Anwendungsfeld:** DAX-Konzern, Consulting, Finance. **ATS-freundlich.**
**Style-Richtung:**
- `Arial` oder `Helvetica`, 10pt. Einfach, brav, „passt durch jede HR-Software".
- Einspaltig, links Datum, rechts Content. Abschnitte klar separiert durch Trennlinien.
- Foto: optional (Deutsch-Markt), rund (100pt), oben rechts neben Name.
- Name als H1 fett 18pt, Title gray 12pt.
- Section-Titel: fett, 11pt, 2pt `border-bottom` schwarz, uppercase.
- Keine spezielle Typo-Raffinesse — bewusst neutral. Der Charme liegt in präziser Ausrichtung und A4-Satz.

**Paletten (2):**
- `corporate-graphite` (accent `#1f2937`)
- `corporate-steel` (accent `#0f4c81`)

**ATS-Tests:** PDF-Text über `pdf-parse` durchlaufen lassen und sicherstellen, dass alle Experience-Titel + Firmennamen als zusammenhängende Strings extrahierbar sind.

### Task 6.8: Brief — Tech / Dev

**Template-ID:** `tech-dev`
**Anwendungsfeld:** Senior Developer, Staff Engineer, Startup-Tech.
**Style-Richtung:**
- Monospace-Akzente: Stack-Namen in `JetBrains Mono` / `Fira Code`.
- Haupttypo: `Inter`.
- Header-Bereich als "Terminal": `> markus@codevena:~$ whoami` Style (subtil, nicht zu cringe).
- Layout: zweispaltig mit linker Sidebar (Skills, Contact, Languages in Mono) + Hauptspalte mit Experience.
- Experience: Unternehmen als `#hashtag`-Tags, Stack als `[` Array `]`-Syntax.
- Foto: quadratisch mit 2pt-Rand, Pixel-Look (kein border-radius).

**Paletten (3):**
- `tech-terminal` (accent `#22c55e`, dark text on cream bg)
- `tech-ocean` (accent `#2563eb`)
- `tech-violet` (accent `#8b5cf6`)

### Task 6.9: Sammel-Merge + Gesamt-Integration

- [ ] **Step 1: Nach Abschluss aller 7 Agents — bootstrap.ts prüfen**

Bootstrap soll enthalten:
```ts
registerTemplate(classicSerif);
registerTemplate(modernMinimal);
registerTemplate(creativeAccent);
registerTemplate(academic);
registerTemplate(monochromeDark);
registerTemplate(editorial);
registerTemplate(corporate);
registerTemplate(techDev);
```

- [ ] **Step 2: Gesamt-Test-Run**

Run:
```bash
pnpm build
pnpm test:unit
pnpm test:integration
pnpm test:visual
```
Expected: Alle grün, 8 Visual-Baselines committed.

- [ ] **Step 3: Für alle 8 Templates PDF bauen (Smoke)**

Run:
```bash
for id in classic-serif modern-minimal creative-accent academic monochrome-dark editorial corporate tech-dev; do
  node apps/cli/dist/index.js build data/cvs/cv.de.yaml -t $id -o out/cv.de.$id.pdf
done
ls -lh out/
```

- [ ] **Step 4: Review mit Markus — 8 PDFs nebeneinander**

Markus schaut sich alle 8 PDFs an. Feedback-Runde pro Template. Bei Feedback → jeweils einen neuen Fix-Agent dispatchen (Single-Template-Fix).

- [ ] **Step 5: Commit der Preview-Assets + Fixes**

Kleine Korrekturen direkt committen.

**Phase-6 Review-Checkpoint:** "Phase 6 fertig. 8 Templates live, alle Tests grün, 8 PDFs gebaut. Freigabe für Phase 7 (UI-Components)?"

---

## Phase 7 — `@cvmake/ui` (Shared React Components)

Ziel: PhotoCropper, ColorPicker, TemplateCard, FormField, ArrayField als wiederverwendbare Komponenten (framework-agnostisch in Bezug auf Next.js — werden in apps/web konsumiert).

### Task 7.1: Vitest + Happy-DOM-Config

**Files:**
- Create: `packages/ui/vitest.config.ts`
- Create: `packages/ui/test/setup.ts`

- [ ] **Step 1: Config**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.tsx', 'test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
  esbuild: { jsx: 'automatic' },
});
```

- [ ] **Step 2: Setup**

```ts
import '@testing-library/jest-dom/vitest';
```

DevDep ergänzen: `pnpm --filter @cvmake/ui add -D @testing-library/jest-dom`

- [ ] **Step 3: Commit**

```bash
git add packages/ui/vitest.config.ts packages/ui/test/setup.ts packages/ui/package.json
git commit -m "chore(ui): add vitest + happy-dom config"
```

### Task 7.2: FormField Component

**Files:**
- Create: `packages/ui/src/FormField.tsx`
- Create: `packages/ui/test/FormField.test.tsx`

- [ ] **Step 1: Failing Test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from '../src/FormField.js';

describe('FormField', () => {
  it('zeigt Label und Input', () => {
    render(
      <FormField label="E-Mail" htmlFor="email">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByLabelText('E-Mail')).toBeInTheDocument();
  });
  it('zeigt Fehlertext', () => {
    render(
      <FormField label="E-Mail" htmlFor="email" error="Pflichtfeld">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByText('Pflichtfeld')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Komponente**

```tsx
import type { PropsWithChildren } from 'react';

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
}: PropsWithChildren<FormFieldProps>) {
  return (
    <div className="cv-field" data-error={error ? 'true' : undefined}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <p className="cv-field__hint">{hint}</p>}
      {error && (
        <p role="alert" className="cv-field__error">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Tests grün + Commit**

```bash
git add packages/ui/src/FormField.tsx packages/ui/test/FormField.test.tsx
git commit -m "feat(ui): add FormField with label + error + hint"
```

### Task 7.3: ArrayField (Add/Remove/Reorder)

**Files:**
- Create: `packages/ui/src/ArrayField.tsx`
- Create: `packages/ui/test/ArrayField.test.tsx`

- [ ] **Step 1: Failing Test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArrayField } from '../src/ArrayField.js';

describe('ArrayField', () => {
  it('rendert Kinder pro Eintrag', () => {
    render(
      <ArrayField
        items={['a', 'b']}
        onChange={() => {}}
        renderItem={(x, i) => <span data-testid={`i-${i}`}>{x}</span>}
        newItem={() => 'x'}
      />,
    );
    expect(screen.getByTestId('i-0')).toHaveTextContent('a');
    expect(screen.getByTestId('i-1')).toHaveTextContent('b');
  });

  it('ruft onChange beim Hinzufügen auf', () => {
    const changes: unknown[][] = [];
    render(
      <ArrayField
        items={['a']}
        onChange={(next) => changes.push(next)}
        renderItem={(x) => <span>{x}</span>}
        newItem={() => 'new'}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /hinzufügen/i }));
    expect(changes.at(-1)).toEqual(['a', 'new']);
  });

  it('entfernt Einträge', () => {
    const changes: unknown[][] = [];
    render(
      <ArrayField
        items={['a', 'b']}
        onChange={(next) => changes.push(next)}
        renderItem={(x) => <span>{x}</span>}
        newItem={() => 'x'}
      />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: /entfernen/i })[0]!);
    expect(changes.at(-1)).toEqual(['b']);
  });
});
```

- [ ] **Step 2: Komponente**

```tsx
import type { ReactNode } from 'react';

export interface ArrayFieldProps<T> {
  items: T[];
  onChange: (next: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  newItem: () => T;
  addLabel?: string;
  removeLabel?: string;
}

export function ArrayField<T>({
  items,
  onChange,
  renderItem,
  newItem,
  addLabel = 'Hinzufügen',
  removeLabel = 'Entfernen',
}: ArrayFieldProps<T>) {
  return (
    <div className="cv-array">
      {items.map((it, i) => (
        <div className="cv-array__row" key={i}>
          <div className="cv-array__body">{renderItem(it, i)}</div>
          <div className="cv-array__actions">
            <button
              type="button"
              onClick={() => onChange(moveUp(items, i))}
              disabled={i === 0}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onChange(moveDown(items, i))}
              disabled={i === items.length - 1}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              {removeLabel}
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, newItem()])}>
        {addLabel}
      </button>
    </div>
  );
}

function moveUp<T>(a: T[], i: number): T[] {
  if (i <= 0) return a;
  const b = [...a];
  [b[i - 1], b[i]] = [b[i]!, b[i - 1]!];
  return b;
}

function moveDown<T>(a: T[], i: number): T[] {
  if (i >= a.length - 1) return a;
  const b = [...a];
  [b[i], b[i + 1]] = [b[i + 1]!, b[i]!];
  return b;
}
```

- [ ] **Step 3: Tests grün + Commit**

```bash
git add packages/ui/src/ArrayField.tsx packages/ui/test/ArrayField.test.tsx
git commit -m "feat(ui): add ArrayField with add/remove/reorder"
```

### Task 7.4: ColorPicker (Accent-Override)

**Files:**
- Create: `packages/ui/src/ColorPicker.tsx`
- Create: `packages/ui/test/ColorPicker.test.tsx`

- [ ] **Step 1: Failing Test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ColorPicker } from '../src/ColorPicker.js';

describe('ColorPicker', () => {
  it('zeigt Preset-Swatches an', () => {
    render(
      <ColorPicker
        value="#7a8894"
        presets={['#7a8894', '#111827']}
        onChange={() => {}}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('callt onChange mit gewähltem Preset', () => {
    const onChange = vi.fn();
    render(
      <ColorPicker
        value="#7a8894"
        presets={['#7a8894', '#111827']}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getAllByRole('button')[1]!);
    expect(onChange).toHaveBeenCalledWith('#111827');
  });

  it('callt onChange beim Hex-Input', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#000000" presets={[]} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '#ff00aa' } });
    expect(onChange).toHaveBeenCalledWith('#ff00aa');
  });
});
```

- [ ] **Step 2: Komponente**

```tsx
export interface ColorPickerProps {
  value: string;
  presets: string[];
  onChange: (hex: string) => void;
  label?: string;
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function ColorPicker({ value, presets, onChange, label }: ColorPickerProps) {
  return (
    <div className="cv-color-picker">
      {label && <span className="cv-color-picker__label">{label}</span>}
      <div className="cv-color-picker__swatches">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            aria-label={`Preset ${p}`}
            aria-pressed={p === value}
            style={{ background: p }}
            onClick={() => onChange(p)}
          />
        ))}
      </div>
      <input
        type="text"
        value={value}
        aria-invalid={!HEX_RE.test(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Tests grün + Commit**

```bash
git add packages/ui/src/ColorPicker.tsx packages/ui/test/ColorPicker.test.tsx
git commit -m "feat(ui): add ColorPicker with presets + hex input"
```

### Task 7.5: TemplateCard (Preview-Galerie)

**Files:**
- Create: `packages/ui/src/TemplateCard.tsx`
- Create: `packages/ui/test/TemplateCard.test.tsx`

- [ ] **Step 1: Test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TemplateCard } from '../src/TemplateCard.js';

describe('TemplateCard', () => {
  it('rendert Name + Preview', () => {
    render(
      <TemplateCard
        id="classic-serif"
        name="Classic Serif"
        previewSrc="/preview.png"
        selected={false}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Classic Serif')).toBeInTheDocument();
    expect(screen.getByAltText('Classic Serif Preview')).toHaveAttribute('src', '/preview.png');
  });

  it('ruft onSelect mit ID auf', () => {
    const onSelect = vi.fn();
    render(
      <TemplateCard
        id="modern-minimal"
        name="Modern Minimal"
        previewSrc="/preview.png"
        selected={false}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('modern-minimal');
  });
});
```

- [ ] **Step 2: Komponente**

```tsx
export interface TemplateCardProps {
  id: string;
  name: string;
  previewSrc: string;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function TemplateCard({ id, name, previewSrc, selected, onSelect }: TemplateCardProps) {
  return (
    <button
      type="button"
      className="cv-template-card"
      aria-pressed={selected}
      onClick={() => onSelect(id)}
    >
      <img src={previewSrc} alt={`${name} Preview`} />
      <span>{name}</span>
    </button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/TemplateCard.tsx packages/ui/test/TemplateCard.test.tsx
git commit -m "feat(ui): add TemplateCard"
```

### Task 7.6: PhotoCropper (react-image-crop)

**Files:**
- Create: `packages/ui/src/PhotoCropper.tsx`
- Create: `packages/ui/test/PhotoCropper.test.tsx`

- [ ] **Step 1: Test (reduzierter Scope — react-image-crop rendert nur im Browser)**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PhotoCropper } from '../src/PhotoCropper.js';

describe('PhotoCropper', () => {
  it('rendert Canvas-Bereich bei geladenem Bild', () => {
    render(
      <PhotoCropper
        src="/photo.jpg"
        aspect={1}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByAltText('Crop source')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bestätigen/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Komponente**

```tsx
import { useState } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export interface PhotoCropperProps {
  src: string;
  aspect: number;
  onConfirm: (crop: Crop) => void;
  onCancel: () => void;
}

export function PhotoCropper({ src, aspect, onConfirm, onCancel }: PhotoCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  return (
    <div className="cv-cropper">
      <ReactCrop
        crop={crop}
        onChange={(c) => setCrop(c)}
        aspect={aspect}
        keepSelection
      >
        <img
          src={src}
          alt="Crop source"
          onLoad={(e) => {
            const img = e.currentTarget;
            setCrop(
              centerCrop(
                makeAspectCrop({ unit: '%', width: 80 }, aspect, img.width, img.height),
                img.width,
                img.height,
              ),
            );
          }}
        />
      </ReactCrop>
      <div className="cv-cropper__actions">
        <button type="button" onClick={onCancel}>
          Abbrechen
        </button>
        <button type="button" onClick={() => crop && onConfirm(crop)}>
          Bestätigen
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Exports + Commit**

`src/index.ts`:
```ts
export * from './ArrayField.js';
export * from './ColorPicker.js';
export * from './FormField.js';
export * from './PhotoCropper.js';
export * from './TemplateCard.js';
```

```bash
git add packages/ui/src packages/ui/test
git commit -m "feat(ui): add PhotoCropper + index exports"
```

**Phase-7 Review-Checkpoint:** "Phase 7 fertig. UI-Components bauen. Freigabe für Phase 8 (Web-App)?"

---

## Phase 8 — `apps/web` (Next.js 16 Editor)

Ziel: Lauffähige Next.js-App mit Editor, Live-Preview (iframe-Portal), API-Routes für Load/Save/Upload/Export, Tailwind-Editor-Styling, Markus-Editing-Erfahrung.

### Task 8.1: Next.js-Skelett + Tailwind

**Files:**
- Create: `apps/web/next.config.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/next-env.d.ts` (auto-generated, einmal committen)

- [ ] **Step 1: `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: { typedRoutes: true },
  transpilePackages: ['@cvmake/schema', '@cvmake/core', '@cvmake/templates', '@cvmake/ui'],
  serverExternalPackages: ['puppeteer', 'sharp'],
};

export default config;
```

- [ ] **Step 2: Tailwind-Config**

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

`postcss.config.mjs`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 3: Layout + Globals**

`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
body { font-family: ui-sans-serif, system-ui, sans-serif; }
```

`app/layout.tsx`:
```tsx
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = { title: 'cvMake', description: 'Open-source CV generator' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Platzhalter-Seite**

`app/page.tsx`:
```tsx
export default function Home() {
  return <main className="p-8">cvMake Editor — WIP</main>;
}
```

- [ ] **Step 5: `pnpm --filter @cvmake/web dev` testen**

Run: `pnpm --filter @cvmake/web dev` (Port 3000)
Expected: Seite lädt mit "WIP"-Text.

- [ ] **Step 6: Commit**

```bash
git add apps/web/next.config.ts apps/web/app apps/web/postcss.config.mjs apps/web/tailwind.config.ts apps/web/next-env.d.ts
git commit -m "feat(web): scaffold next.js 16 app with tailwind"
```

### Task 8.2: API-Route — CV laden

**Files:**
- Create: `apps/web/app/api/cv/route.ts`
- Create: `apps/web/app/api/cv/[slug]/route.ts`
- Create: `apps/web/lib/paths.ts`

- [ ] **Step 1: Pfad-Helper mit Traversal-Schutz**

`lib/paths.ts`:
```ts
import path from 'node:path';

const DATA_ROOT = path.resolve(process.cwd(), '..', '..', 'data', 'cvs');
const SLUG_RE = /^[a-z0-9-]+(\.(de|en))?$/;

export function assertSlug(slug: string): void {
  if (!SLUG_RE.test(slug)) throw new Error('invalid slug');
}

export function cvPath(slug: string): string {
  assertSlug(slug);
  const p = path.join(DATA_ROOT, `${slug}.yaml`);
  const resolved = path.resolve(p);
  if (!resolved.startsWith(DATA_ROOT + path.sep)) throw new Error('path traversal');
  return resolved;
}

export function dataRoot(): string { return DATA_ROOT; }
```

- [ ] **Step 2: Liste-Route**

`app/api/cv/route.ts`:
```ts
import { readdir } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { dataRoot } from '@/lib/paths';

export async function GET() {
  const entries = await readdir(dataRoot());
  const slugs = entries
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace(/\.yaml$/, ''));
  return NextResponse.json({ slugs });
}
```

- [ ] **Step 3: Single-Route**

`app/api/cv/[slug]/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { loadCV, ValidationError, YAMLParseError } from '@cvmake/core';
import { cvPath } from '@/lib/paths';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const cv = await loadCV(cvPath(slug));
    return NextResponse.json({ cv });
  } catch (err) {
    if (err instanceof YAMLParseError) {
      return NextResponse.json({ error: 'YAML_PARSE', message: err.message }, { status: 400 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: 'VALIDATION', issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'UNKNOWN', message: String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 4: Smoke-Test**

Run: `pnpm --filter @cvmake/web dev`, dann `curl http://localhost:3000/api/cv`
Expected: `{"slugs":["cv.de","cv.en"]}`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api apps/web/lib
git commit -m "feat(web): add /api/cv list + /api/cv/[slug] load routes"
```

### Task 8.3: API-Route — Save

**Files:**
- Create: `apps/web/app/api/save/route.ts`

- [ ] **Step 1: Route**

```ts
import { writeFile } from 'node:fs/promises';
import yaml from 'js-yaml';
import { NextResponse } from 'next/server';
import { CVDataSchema } from '@cvmake/schema';
import { cvPath } from '@/lib/paths';

export async function POST(req: Request) {
  const body = await req.json();
  const parse = CVDataSchema.safeParse(body?.cv);
  if (!parse.success) {
    return NextResponse.json({ error: 'VALIDATION', issues: parse.error.issues }, { status: 400 });
  }
  const slug = String(body.slug ?? '');
  const path = cvPath(slug);
  const dump = yaml.dump(parse.data, { lineWidth: 100, noRefs: true, quotingType: "'" });
  await writeFile(path, dump, 'utf8');
  return NextResponse.json({ ok: true, path });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/save
git commit -m "feat(web): add /api/save with zod validation + yaml dump"
```

### Task 8.4: API-Route — Photo-Upload

**Files:**
- Create: `apps/web/app/api/upload/route.ts`

- [ ] **Step 1: Route**

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { processPhoto } from '@cvmake/core';

const MAX_BYTES = 10 * 1024 * 1024;
const SLUG_RE = /^[a-z0-9-]+$/;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  const slug = String(form.get('slug') ?? '');
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'INVALID_SLUG' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'NO_FILE' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'TOO_LARGE' }, { status: 413 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const tempDir = path.join(tmpdir(), `cvmake-upload-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  const tempPath = path.join(tempDir, 'input');
  await writeFile(tempPath, buf);

  const outDir = path.resolve(process.cwd(), '..', '..', 'public', 'photos');
  await mkdir(outDir, { recursive: true });
  const result = await processPhoto({ inputPath: tempPath, outputDir: outDir, slug });
  return NextResponse.json({
    webp: `/photos/${path.basename(result.webp)}`,
    jpg: `/photos/${path.basename(result.jpg)}`,
  });
}

export const runtime = 'nodejs';
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/upload
git commit -m "feat(web): add /api/upload with sharp-processed webp + jpg"
```

### Task 8.5: API-Route — PDF-Export

**Files:**
- Create: `apps/web/app/api/export/route.ts`
- Create: `apps/web/lib/render.ts`

- [ ] **Step 1: Shared Render-Helper**

`lib/render.ts`:
```ts
import { generatePDF, renderCV, wrapHtmlDocument } from '@cvmake/core';
import { bootstrapTemplates, getTemplate } from '@cvmake/templates';
import type { CVData } from '@cvmake/schema';

export async function buildPdf(cv: CVData, templateId?: string, paletteId?: string): Promise<Buffer> {
  bootstrapTemplates();
  const id = templateId ?? cv.rendering.template;
  const template = getTemplate(id);
  if (!template) throw new Error(`unknown template: ${id}`);
  const rendered = renderCV({ data: cv, template, paletteId: paletteId ?? cv.rendering.palette });
  const css = `${rendered.css}\n${(template as unknown as { css: string }).css}`;
  const html = wrapHtmlDocument({
    title: `${cv.personal.firstName} ${cv.personal.lastName} — CV`,
    html: rendered.html,
    css,
  });
  return generatePDF(html);
}
```

- [ ] **Step 2: Route**

`app/api/export/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { CVDataSchema } from '@cvmake/schema';
import { buildPdf } from '@/lib/render';

export async function POST(req: Request) {
  const body = await req.json();
  const parse = CVDataSchema.safeParse(body?.cv);
  if (!parse.success) {
    return NextResponse.json({ error: 'VALIDATION', issues: parse.error.issues }, { status: 400 });
  }
  const pdf = await buildPdf(parse.data, body.template, body.palette);
  return new Response(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${parse.data.personal.lastName}-cv.pdf"`,
    },
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/export apps/web/lib
git commit -m "feat(web): add /api/export streaming pdf response"
```

### Task 8.6: Preview-Iframe (React-Portal)

**Files:**
- Create: `apps/web/components/PreviewFrame.tsx`

- [ ] **Step 1: Komponente**

```tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface PreviewFrameProps {
  children: ReactNode;
  css: string;
}

export function PreviewFrame({ children, css }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const init = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      doc.open();
      doc.write('<!doctype html><html><head><base target="_parent" /></head><body></body></html>');
      doc.close();
      setMountNode(doc.body);
    };
    if (iframe.contentDocument?.readyState === 'complete') init();
    else iframe.addEventListener('load', init, { once: true });
  }, []);

  useEffect(() => {
    if (!mountNode) return;
    const doc = mountNode.ownerDocument;
    let style = doc.getElementById('cv-style') as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement('style');
      style.id = 'cv-style';
      doc.head.appendChild(style);
    }
    style.textContent = css;
  }, [css, mountNode]);

  return (
    <iframe
      ref={iframeRef}
      title="CV Preview"
      className="w-full h-full bg-white"
      sandbox="allow-same-origin"
    >
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/PreviewFrame.tsx
git commit -m "feat(web): add PreviewFrame with react portal into iframe"
```

### Task 8.7: Editor-Seite + Sidebar

**Files:**
- Create: `apps/web/components/Editor.tsx`
- Create: `apps/web/components/Sidebar.tsx`
- Create: `apps/web/app/page.tsx` (ersetzen)
- Create: `apps/web/app/providers.tsx`

- [ ] **Step 1: `Sidebar.tsx` — CV-Dropdown + Template-Galerie**

```tsx
'use client';

import { TemplateCard } from '@cvmake/ui';
import type { TemplateMeta } from '@cvmake/schema';

export interface SidebarProps {
  slugs: string[];
  selectedSlug: string;
  onSelectSlug: (slug: string) => void;
  templates: { meta: TemplateMeta; previewSrc: string }[];
  selectedTemplate: string;
  onSelectTemplate: (id: string) => void;
}

export function Sidebar(p: SidebarProps) {
  return (
    <aside className="w-72 border-r p-4 space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">CV</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={p.selectedSlug}
          onChange={(e) => p.onSelectSlug(e.target.value)}
        >
          {p.slugs.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Templates</h3>
        <div className="grid grid-cols-2 gap-2">
          {p.templates.map(({ meta, previewSrc }) => (
            <TemplateCard
              key={meta.id}
              id={meta.id}
              name={meta.name}
              previewSrc={previewSrc}
              selected={meta.id === p.selectedTemplate}
              onSelect={p.onSelectTemplate}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: `Editor.tsx` — Form + Live-Preview**

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CVDataSchema, type CVData } from '@cvmake/schema';
import { FormField } from '@cvmake/ui';
import { bootstrapTemplates, getTemplate } from '@cvmake/templates';
import { renderCV, getLabels } from '@cvmake/core';
import { PreviewFrame } from './PreviewFrame';

bootstrapTemplates();

export interface EditorProps {
  initialCV: CVData;
  slug: string;
}

export function Editor({ initialCV, slug }: EditorProps) {
  const form = useForm<CVData>({
    resolver: zodResolver(CVDataSchema),
    defaultValues: initialCV,
    mode: 'onBlur',
  });

  const cv = form.watch();
  const [debouncedCV, setDebouncedCV] = useState(cv);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCV(cv), 150);
    return () => clearTimeout(t);
  }, [cv]);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, cv: debouncedCV }),
      });
    }, 2000);
    return () => clearTimeout(t);
  }, [debouncedCV, slug]);

  const rendered = useMemo(() => {
    const template = getTemplate(debouncedCV.rendering.template);
    if (!template) return null;
    const out = renderCV({
      data: debouncedCV,
      template,
      paletteId: debouncedCV.rendering.palette,
    });
    return {
      css: `${out.css}\n${(template as unknown as { css: string }).css}`,
      element: (
        <template.Component
          data={debouncedCV}
          palette={
            template.palettes.find((p) => p.id === debouncedCV.rendering.palette) ??
            template.palettes[0]!
          }
          locale={debouncedCV.meta.locale}
          labels={getLabels(debouncedCV.meta.locale)}
        />
      ),
    };
  }, [debouncedCV]);

  async function onExport() {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv: debouncedCV }),
    });
    if (!res.ok) return alert(`Export fehlgeschlagen: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cv.personal.lastName}-cv.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <FormProvider {...form}>
      <div className="grid grid-cols-[1fr_1fr] h-screen">
        <form className="p-4 overflow-auto space-y-4">
          <button
            type="button"
            className="px-3 py-1 rounded bg-black text-white"
            onClick={onExport}
          >
            PDF exportieren
          </button>
          <FormField label="Vorname" htmlFor="firstName">
            <input
              id="firstName"
              className="border rounded w-full px-2 py-1"
              {...form.register('personal.firstName')}
            />
          </FormField>
          <FormField label="Nachname" htmlFor="lastName">
            <input
              id="lastName"
              className="border rounded w-full px-2 py-1"
              {...form.register('personal.lastName')}
            />
          </FormField>
          <FormField label="Titel" htmlFor="title">
            <input
              id="title"
              className="border rounded w-full px-2 py-1"
              {...form.register('personal.title')}
            />
          </FormField>
          <FormField label="Summary" htmlFor="summary">
            <textarea
              id="summary"
              rows={4}
              className="border rounded w-full px-2 py-1"
              {...form.register('summary')}
            />
          </FormField>
          <p className="text-xs text-gray-500">
            Erweiterte Felder (Experience, Education, Skills, Languages, CustomSections)
            folgen unten via ArrayField. MVP-Scope dieses Step: Basis-Felder; Erweiterung
            in Task 8.8.
          </p>
        </form>
        <div className="border-l overflow-hidden">
          {rendered && <PreviewFrame css={rendered.css}>{rendered.element}</PreviewFrame>}
        </div>
      </div>
    </FormProvider>
  );
}
```

- [ ] **Step 3: `app/providers.tsx` (Bootstrap der Templates auf Client)**

```tsx
'use client';
import { bootstrapTemplates } from '@cvmake/templates';
bootstrapTemplates();
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 4: `app/page.tsx` mit SSR-Load**

```tsx
import { loadCV } from '@cvmake/core';
import { cvPath } from '@/lib/paths';
import { Editor } from '@/components/Editor';

export default async function Home() {
  const slug = 'cv.de';
  const cv = await loadCV(cvPath(slug));
  return <Editor initialCV={cv} slug={slug} />;
}
```

- [ ] **Step 5: Dev-Smoke-Test**

Run: `pnpm --filter @cvmake/web dev`
Expected: Editor lädt Markus' Content, Live-Preview rechts, `PDF exportieren` lädt PDF herunter.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components apps/web/app/providers.tsx apps/web/app/page.tsx
git commit -m "feat(web): add editor + live preview + pdf export"
```

### Task 8.8: Experience/Education/Skills-Array-Fields

**Files:**
- Modify: `apps/web/components/Editor.tsx`
- Create: `apps/web/components/ExperienceEditor.tsx`
- Create: `apps/web/components/EducationEditor.tsx`
- Create: `apps/web/components/SkillsEditor.tsx`

- [ ] **Step 1: `ExperienceEditor.tsx`**

Hinweis: Für Form-Arrays mit `react-hook-form` **direkt `useFieldArray` verwenden** (append/remove/move), nicht `ArrayField`. `ArrayField` ist für plain-State-Arrays gedacht — hier brauchen wir form-state-aware Operationen.

```tsx
'use client';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { FormField } from '@cvmake/ui';
import type { CVData } from '@cvmake/schema';

export function ExperienceEditor() {
  const { control, register } = useFormContext<CVData>();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'experience' });
  return (
    <div className="space-y-4">
      {fields.map((field, i) => (
        <div key={field.id} className="border rounded p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Eintrag {i + 1}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => move(i, Math.max(0, i - 1))}
                disabled={i === 0}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, Math.min(fields.length - 1, i + 1))}
                disabled={i === fields.length - 1}
              >
                ↓
              </button>
              <button type="button" onClick={() => remove(i)}>
                Entfernen
              </button>
            </div>
          </div>
          <FormField label="Titel" htmlFor={`exp-${i}-title`}>
            <input
              id={`exp-${i}-title`}
              className="border rounded w-full px-2 py-1"
              {...register(`experience.${i}.title` as const)}
            />
          </FormField>
          <FormField label="Firma" htmlFor={`exp-${i}-company`}>
            <input
              id={`exp-${i}-company`}
              className="border rounded w-full px-2 py-1"
              {...register(`experience.${i}.company` as const)}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Start" htmlFor={`exp-${i}-start`}>
              <input
                id={`exp-${i}-start`}
                className="border rounded w-full px-2 py-1"
                {...register(`experience.${i}.startDate` as const)}
              />
            </FormField>
            <FormField label="Ende" htmlFor={`exp-${i}-end`}>
              <input
                id={`exp-${i}-end`}
                className="border rounded w-full px-2 py-1"
                {...register(`experience.${i}.endDate` as const)}
              />
            </FormField>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="px-3 py-1 border rounded"
        onClick={() =>
          append({ title: '', company: '', startDate: '', bullets: [] })
        }
      >
        Eintrag hinzufügen
      </button>
    </div>
  );
}
```

`EducationEditor.tsx` und `SkillsEditor.tsx` folgen dem identischen Pattern:
- `EducationEditor`: `useFieldArray({ name: 'education' })`, Felder `degree`, `institution`, `startDate`, `endDate`.
- `SkillsEditor`: `skills.stack` als String-Array über `useFieldArray` nicht möglich (kein Objekt-Array) → stattdessen `register('skills.stack')` mit Textarea, Zeilen-split beim Submit. Alternativ `customSections`-Pattern.

- [ ] **Step 2: Editor.tsx erweitern**

Füge unterhalb des Summary-Felds ein:
```tsx
<section>
  <h2 className="font-semibold mt-6 mb-2">Berufserfahrung</h2>
  <ExperienceEditor />
</section>
<section>
  <h2 className="font-semibold mt-6 mb-2">Ausbildung</h2>
  <EducationEditor />
</section>
<section>
  <h2 className="font-semibold mt-6 mb-2">Skills</h2>
  <SkillsEditor />
</section>
```

- [ ] **Step 3: Manueller Test in Browser**

Run: `pnpm --filter @cvmake/web dev`, hinzufügen/entfernen von Experience-Einträgen, Preview aktualisiert.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/ExperienceEditor.tsx apps/web/components/EducationEditor.tsx apps/web/components/SkillsEditor.tsx apps/web/components/Editor.tsx
git commit -m "feat(web): add array editors for experience/education/skills"
```

### Task 8.9: Template + Palette Picker + Accent-Override

**Files:**
- Modify: `apps/web/components/Editor.tsx`
- Modify: `apps/web/components/Sidebar.tsx`

- [ ] **Step 1: Sidebar um Palette-Dropdown + ColorPicker erweitern**

```tsx
// in Sidebar.tsx
import { ColorPicker } from '@cvmake/ui';
// … props erweitern:
// palettes: { id: string; name: string; accent: string }[];
// selectedPalette: string; onSelectPalette(id): void;
// accentOverride?: string; onAccentOverride(hex?: string): void;
```

(Volle Implementation analog.)

- [ ] **Step 2: Editor.tsx — Props von Sidebar bereitstellen**

Form-Felder `rendering.template`, `rendering.palette`, `rendering.accentOverride` verknüpfen.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components
git commit -m "feat(web): add template/palette/accent controls"
```

### Task 8.10: Photo-Upload-Flow

**Files:**
- Create: `apps/web/components/PhotoUpload.tsx`
- Modify: `apps/web/components/Editor.tsx`

- [ ] **Step 1: Photo-Upload mit Cropper**

```tsx
'use client';
import { useState } from 'react';
import { PhotoCropper } from '@cvmake/ui';
import { useFormContext } from 'react-hook-form';
import type { CVData } from '@cvmake/schema';

export function PhotoUpload({ slug }: { slug: string }) {
  const { setValue, watch } = useFormContext<CVData>();
  const current = watch('personal.photo');
  const [src, setSrc] = useState<string | null>(null);

  async function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setSrc(url);
  }

  async function confirm(crop: { x: number; y: number; width: number; height: number; unit: string }) {
    // in MVP: simply upload original — cropping happens via sharp on server in the future
    const input = document.querySelector<HTMLInputElement>('input[type=file][name=photo]');
    const file = input?.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('slug', slug.replace(/\./g, '-'));
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) return alert('Upload fehlgeschlagen');
    const { jpg } = await res.json();
    setValue('personal.photo', jpg.replace(/^\//, ''));
    setSrc(null);
  }

  return (
    <div>
      {current && (
        <img src={`/${current}`} alt="Foto" className="w-24 h-24 object-cover rounded-full" />
      )}
      <input
        type="file"
        name="photo"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {src && <PhotoCropper src={src} aspect={1} onCancel={() => setSrc(null)} onConfirm={confirm} />}
    </div>
  );
}
```

- [ ] **Step 2: In Editor einbinden + Commit**

```bash
git add apps/web/components/PhotoUpload.tsx apps/web/components/Editor.tsx
git commit -m "feat(web): add photo upload with cropper modal"
```

**Phase-8 Review-Checkpoint:** "Phase 8 fertig. Web-App funktioniert End-to-End: Laden, Editieren, Foto-Upload, Template-Wechsel, PDF-Export. Freigabe für Phase 9 (CI/E2E/Visual)?"

---

## Phase 9 — CI, E2E, Visual-Regression vollständig

Ziel: GitHub-Actions-Pipeline erweitert, Playwright-E2E mit 5 kritischen Flows, Visual-Regression im CI.

### Task 9.1: Playwright-Setup

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/.gitignore`

- [ ] **Step 1: Config**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm start',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/playwright.config.ts
git commit -m "chore(web): add playwright config"
```

### Task 9.2: E2E — Load + Edit + Save

**Files:**
- Create: `apps/web/e2e/edit-save.spec.ts`

- [ ] **Step 1: Test**

```ts
import { expect, test } from '@playwright/test';

test('editor lädt, ändert Namen, speichert', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Vorname')).toHaveValue('Markus');
  await page.getByLabel('Vorname').fill('Max');
  // warten auf auto-save (2s debounce)
  await page.waitForTimeout(2500);
  // Reload: Wert sollte persistiert sein (wenn data/cvs beschreibbar war)
  await page.reload();
  await expect(page.getByLabel('Vorname')).toHaveValue('Max');
  // Cleanup
  await page.getByLabel('Vorname').fill('Markus');
  await page.waitForTimeout(2500);
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/edit-save.spec.ts
git commit -m "test(web): add e2e edit + autosave flow"
```

### Task 9.3: E2E — PDF-Export

**Files:**
- Create: `apps/web/e2e/export-pdf.spec.ts`

- [ ] **Step 1: Test**

```ts
import { expect, test } from '@playwright/test';

test('pdf export lädt datei', async ({ page }) => {
  await page.goto('/');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'PDF exportieren' }).click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
  const size = (await (await import('node:fs/promises')).stat(path!)).size;
  expect(size).toBeGreaterThan(20_000);
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/export-pdf.spec.ts
git commit -m "test(web): add e2e pdf export"
```

### Task 9.4: E2E — Template-Switch

**Files:**
- Create: `apps/web/e2e/template-switch.spec.ts`

- [ ] **Step 1: Test**

```ts
import { expect, test } from '@playwright/test';

test('template-switch ändert Preview-Font', async ({ page }) => {
  await page.goto('/');
  const getIframeBody = async () =>
    page.frameLocator('iframe[title="CV Preview"]').locator('body');

  const first = await (await getIframeBody()).evaluate((el) => getComputedStyle(el).fontFamily);
  await page.getByRole('button', { name: /Modern Minimal/i }).click();
  await page.waitForTimeout(300);
  const second = await (await getIframeBody()).evaluate((el) => getComputedStyle(el).fontFamily);
  expect(second).not.toEqual(first);
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/template-switch.spec.ts
git commit -m "test(web): add e2e template switch"
```

### Task 9.5: CI-Pipeline erweitern

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Workflow erweitern**

```yaml
      - run: pnpm test:unit
      - run: pnpm test:integration
      - name: install playwright
        run: pnpm --filter @cvmake/web exec playwright install --with-deps chromium
      - run: pnpm --filter @cvmake/web exec playwright test
      - run: pnpm test:visual
      - name: upload visual diffs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs
          path: packages/templates/__tests__/__visual__/**/.actual/**
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add unit/integration/visual/e2e jobs"
```

**Phase-9 Review-Checkpoint:** "Phase 9 fertig. CI grün, E2E grün, Visual-Regression aktiv. Freigabe für Phase 10 (README/Docs)?"

---

## Phase 10 — README, Docs, Screenshots, Release

Ziel: GitHub-taugliche Präsentation — `README.md` mit allen 8 Template-Screenshots, Fork-and-Use-Guide, MIT-Lizenz, Beispiel-YAMLs, kurzer Blog-Teaser im `docs/`-Verzeichnis für den "Build-in-Public"-Aspekt.

### Task 10.1: MIT-Lizenz

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: MIT-Template eintragen**

```
MIT License

Copyright (c) 2026 Markus Wiesecke

Permission is hereby granted, free of charge, to any person obtaining a copy
…
```

- [ ] **Step 2: Commit**

```bash
git add LICENSE
git commit -m "chore: add MIT license"
```

### Task 10.2: Template-Screenshots sammeln

**Files:**
- Create: `docs/screenshots/classic-serif.png`
- Create: `docs/screenshots/modern-minimal.png`
- (…6 weitere)
- Create: `scripts/generate-screenshots.mjs`

- [ ] **Step 1: Script**

```js
import { mkdir } from 'node:fs/promises';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { loadCV, renderCV, wrapHtmlDocument } from '@cvmake/core';
import { bootstrapTemplates, listTemplates } from '@cvmake/templates';

bootstrapTemplates();
const cv = await loadCV('data/cvs/cv.de.yaml');
const outDir = 'docs/screenshots';
await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
for (const template of listTemplates()) {
  const rendered = renderCV({ data: cv, template });
  const css = `${rendered.css}\n${template.css}`;
  const html = wrapHtmlDocument({ title: template.meta.name, html: rendered.html, css });
  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const buf = await page.screenshot({ type: 'png', fullPage: false });
  await writeFile(path.join(outDir, `${template.meta.id}.png`), buf);
  await page.close();
}
await browser.close();
console.log('done');
```

- [ ] **Step 2: Script ausführen**

Run: `node scripts/generate-screenshots.mjs`
Expected: 8 PNGs in `docs/screenshots/`.

- [ ] **Step 3: Commit**

```bash
git add docs/screenshots scripts/generate-screenshots.mjs
git commit -m "docs: add screenshots for all 8 templates"
```

### Task 10.3: README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: README schreiben** (Struktur)

```markdown
# cvMake

Open-source CV generator — YAML source of truth, Next.js editor, 8 designed templates, PDF export via headless Chromium.

## Features
- 8 visuell distinkte Templates (Classic Serif · Modern Minimal · Creative Accent · Academic · Monochrome Dark · Editorial · Corporate · Tech/Dev)
- DE + EN i18n via separate YAML-Files
- Web-Editor mit Live-Preview + Photo-Upload + Cropping
- CLI für CI/Batch-Export
- Plugin-artiges Template-Registry

## Quickstart (fork + use)
…

## Architecture
…

## Templates
<Grid mit allen 8 Screenshots>

## Development
…

## License
MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with features, quickstart, template gallery"
```

### Task 10.4: CONTRIBUTING + Template-Author-Guide

**Files:**
- Create: `CONTRIBUTING.md`
- Create: `docs/writing-a-template.md`

- [ ] **Step 1: Kurze Guides anlegen**

Inhalt: wie neues Template hinzufügen (Ordner anlegen → meta/palettes/styles/Template → in bootstrap.ts registrieren → Tests + Baseline → PR).

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md docs/writing-a-template.md
git commit -m "docs: add contributing guide + template authoring walkthrough"
```

### Task 10.5: v0.1.0-Tag (optional, nach Rückfrage)

- [ ] **Step 1: Rückfrage an Markus**

"Soll ich einen `v0.1.0`-Tag setzen und das GitHub-Release vorbereiten?"

- [ ] **Step 2: Bei OK**

```bash
git tag -a v0.1.0 -m "cvMake v0.1.0 — 8 templates, web editor, cli, pdf export"
```

(Kein `git push` ohne explizite Freigabe.)

**Phase-10 Review-Checkpoint:** "Phase 10 fertig. README + Screenshots + Docs da. Freigabe zum Veröffentlichen/Release?"

---

## Abschluss

Nach Phase 10:
- `pnpm build && pnpm typecheck && pnpm lint` grün.
- `pnpm test:unit && pnpm test:integration && pnpm test:visual && pnpm --filter @cvmake/web exec playwright test` grün.
- 8 PDFs aus `data/cvs/cv.de.yaml` und `cv.en.yaml` in `out/` reproduzierbar.
- README mit Screenshots aller 8 Templates auf GitHub präsentabel.
- Keine Push-Operationen ohne Markus' explizite Freigabe.

## Offene Fragen / Risiken

- **Puppeteer in Docker/Coolify:** Chromium-Dependency muss im Coolify-Image vorhanden sein (oder `@sparticuz/chromium` als Alternative). Erst wichtig wenn Deployment ansteht — MVP läuft lokal.
- **Font-Lizenzen:** `EB Garamond`, `Playfair Display`, `Fraunces`, `Inter`, `Crimson Pro`, `Source Serif Pro`, `Source Sans Pro`, `JetBrains Mono` sind alle OFL/SIL — MIT-kompatibel. Vor Release doppelt prüfen.
- **react-image-crop-Typen:** `Crop`-Typ hat Breaking-Changes zwischen 10.x/11.x — bei Bedarf eine konkrete Minor-Version einfrieren.
- **Next.js 16 Turbo vs. tsc:** Für `transpilePackages` muss Next die Workspace-Pakete JIT kompilieren. Evtl. `.mjs` vs `.js`-Ausgang beachten.


