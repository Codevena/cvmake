# Personal-Data-Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transition `Codevena/forq` from a private repo with personal data to OSS-public-ready by replacing all personal-data with 2 fictional sample personas, gitignoring real-data + session/review artifacts, and rewriting the entire git history to remove personal-data from all 162+ commits.

**Architecture:** Two-phase migration with a user-gate between phases. Phase 1 = HEAD-scrub via normal PR (reviewable, reversible). Phase 2 = `git filter-repo` rewriting history + force-push (destructive, requires backup).

**Tech Stack:** `git-filter-repo` (history rewrite), Vitest + Playwright (test suite), `gh` CLI (GitHub orchestration), pnpm + turbo (workspace build), Gemini AI via design-skill (sample-foto generation).

**Spec:** `docs/superpowers/specs/2026-05-10-personal-data-strategy-design.md`

**Open Questions resolved (using spec recommendations):**
- §9.1 OSS-Author-Identity: Codevena <codevena@proton.me> beibehalten
- §9.2 Repo-Rename forq → cvmake: Ja, als Schritt in Phase 2
- §9.3 Public-Toggle Timing: Nach Phase 10 (NICHT Teil dieses Plans)
- §9.4 Foto-Source: Gemini AI via design-skill
- §9.5 Phase-1-Mode: Eigener PR `chore/personal-data-migration`

---

## Pre-Flight Check

- [ ] **Step 0.1: Verify clean working tree on `feat/cvmake-mvp`**

Run:
```bash
git status
git branch --show-current
```

Expected: `feat/cvmake-mvp` branch, only `?? data/cvs/photos/alex.webp` (untracked) and `M apps/web/next-env.d.ts` (auto-generated). No staged changes.

- [ ] **Step 0.2: Verify git-filter-repo is installed**

Run:
```bash
which git-filter-repo || brew install git-filter-repo
git filter-repo --version
```

Expected: version 2.x or higher.

- [ ] **Step 0.3: Verify `gh` CLI is authenticated for `Codevena/forq`**

Run:
```bash
gh auth status
gh repo view Codevena/forq --json visibility,nameWithOwner
```

Expected: authenticated as Codevena, repo visibility is `PRIVATE`.

---

## Phase 1 — HEAD-Scrub via PR

### Task 1: Create migration branch

**Files:**
- Read: current branch state

- [ ] **Step 1.1: Sync feat/cvmake-mvp to remote**

Run:
```bash
git checkout feat/cvmake-mvp
git pull --rebase origin feat/cvmake-mvp
```

Expected: up-to-date or fast-forward.

- [ ] **Step 1.2: Create branch from latest main**

Run:
```bash
git fetch origin main
git checkout -b chore/personal-data-migration origin/main
git status
```

Expected: new branch `chore/personal-data-migration`, clean working tree (uncommitted changes from feat/cvmake-mvp not carried over).

---

### Task 2: Generate sample portrait — Lena Bauer

**Files:**
- Create: `data/cvs/photos/example-lena.webp`

- [ ] **Step 2.1: Generate AI portrait via design-skill (Gemini)**

Invoke the `design` skill with prompt:
```
Generate a professional corporate headshot photograph of a fictional woman in
her mid-30s. She is a senior data scientist. Neutral grey or soft-blue
background. Soft natural light. Business-casual attire (blazer or smart
sweater). Direct eye contact with camera. Square crop. Photorealistic style.
```

Save output to `data/cvs/photos/example-lena.webp`. Expected file size: 30-80 KB. Expected dimensions: at least 512x512 (the renderer auto-resizes).

If `design`-skill is unavailable, fallback: download from `https://thispersondoesnotexist.com/`, resize to 800x800, convert to webp via `cwebp -q 85`.

- [ ] **Step 2.2: Verify file**

Run:
```bash
file data/cvs/photos/example-lena.webp
ls -la data/cvs/photos/example-lena.webp
```

Expected: WebP file, dimensions ≥512×512, size 20-100 KB.

---

### Task 3: Generate sample portrait — Adam Reyes

**Files:**
- Create: `data/cvs/photos/example-adam.webp`

- [ ] **Step 3.1: Generate AI portrait via design-skill (Gemini)**

Invoke the `design` skill with prompt:
```
Generate a professional headshot photograph of a fictional man in his early
30s. He is a product designer with a creative-but-polished aesthetic.
Neutral background (off-white or warm beige). Soft window light. Casual-smart
attire (button-up, no tie, possibly glasses). Slight smile. Square crop.
Photorealistic style.
```

Save output to `data/cvs/photos/example-adam.webp`. Same size/dimension expectations as Task 2.

- [ ] **Step 3.2: Verify file**

Run:
```bash
file data/cvs/photos/example-adam.webp
ls -la data/cvs/photos/example-adam.webp
```

Expected: WebP file, dimensions ≥512×512, size 20-100 KB.

---

### Task 4: Photo License Notice

**Files:**
- Create: `data/cvs/photos/README.md`

- [ ] **Step 4.1: Write license notice**

Content of `data/cvs/photos/README.md`:
```markdown
# Sample Portraits — License

The `example-*.webp` files in this directory are AI-generated fictional
portraits. They depict no real person.

- **Generation tool:** Gemini AI (Google) via the `design` skill
- **License:** Public domain / CC0 — free to use, modify, redistribute,
  including commercially, with no attribution required
- **Per US law (Naruto v. Slater 2018 precedent):** AI-generated images
  without human authorship are not copyrightable

Files in this directory matching `alex.*` or other personal patterns
are gitignored and belong to the maintainer's local working tree only.
```

- [ ] **Step 4.2: No commit yet** — accumulate Phase-1 changes for batched commits.

---

### Task 5: Sample CV — Lena Bauer (DE)

**Files:**
- Create: `data/cvs/example.de.yaml`

- [ ] **Step 5.1: Write the YAML**

Content of `data/cvs/example.de.yaml`:
```yaml
meta:
  locale: de
  updatedAt: '2026-05-10'

personal:
  firstName: Lena
  lastName: Bauer
  title: 'Senior Data Scientist · MLOps · Open-Source-Beitragerin'
  photo: photos/example-lena.webp
  birthDate: '1989-03-14'
  contacts:
    email: lena.bauer@example.com
    phone: '+49 30 0000000'
    website: https://lenabauer.example.com
    github: lena-bauer
    linkedin: lena-bauer
    location: 'Berlin, DE'

summary: >-
  Senior Data Scientist mit acht Jahren Erfahrung in produktiv eingesetzten
  ML-Systemen. Schwerpunkt: NLP, Recommendation-Systems und MLOps. Ich überführe
  Forschungsprototypen in skalierbare Produkte und betreue sie über den
  gesamten Lebenszyklus.

experience:
  - title: 'Senior Data Scientist'
    company: 'Bayer Pharmaceuticals'
    location: 'Berlin'
    startDate: '2024-01'
    bullets:
      - 'Drug-Discovery-Pipeline mit PyTorch und Hugging-Face-Transformers, Reduktion der Lead-Identification-Zeit um 40 Prozent'
      - 'Aufbau eines internen MLOps-Stacks (Kubernetes, MLflow, Feast, Argo Workflows) mit produktivem Multi-Tenant-Betrieb'
      - 'Mentoring von 3 Junior Data Scientists, wöchentliche Code-Reviews und Pair-Programming-Sessions'
    tags: [PyTorch, Kubernetes, MLflow, Feast, Argo, Python]

  - title: 'Data Scientist'
    company: 'Zalando Research'
    location: 'Berlin'
    startDate: '2021-04'
    endDate: '2023-12'
    bullets:
      - 'Recommendation-System für Personalisierung im Outfit-Konfigurator (10M+ tägliche Nutzer)'
      - 'A/B-Testing-Framework mit statistisch signifikanten +12 Prozent Engagement im Test-Cohort'
      - 'NLP-Pipeline für Produktbeschreibungen mit BERT-basierten Embeddings, Multi-Sprachen-Support'
    tags: [BERT, Recommendation, A/B-Testing, Spark, Airflow]

  - title: 'ML Engineer'
    company: 'Trivago'
    location: 'Düsseldorf'
    startDate: '2018-08'
    endDate: '2021-03'
    bullets:
      - 'Search-Ranking-Modelle für Hotelvergleich basierend auf Gradient-Boosted-Trees und Learning-to-Rank'
      - 'Migration der Feature-Engineering-Pipeline von Hadoop auf Spark, 3-fache Performance-Verbesserung'
      - 'Beitrag zu LightGBM (Open-Source) — 4 merged Pull Requests im Bereich GPU-Acceleration'
    tags: [LightGBM, Spark, Scala, Hadoop]

education:
  - degree: 'Promotion (Dr. rer. nat.) — Computational Linguistics'
    institution: 'TU Berlin'
    location: 'Berlin'
    startDate: '2014-10'
    endDate: '2018-06'

  - degree: 'M.Sc. Computer Science'
    institution: 'KIT Karlsruhe'
    location: 'Karlsruhe'
    startDate: '2012-10'
    endDate: '2014-09'

  - degree: 'B.Sc. Mathematik'
    institution: 'Universität Heidelberg'
    location: 'Heidelberg'
    startDate: '2009-10'
    endDate: '2012-09'

skills:
  categorized:
    'ML/AI':
      - PyTorch
      - Transformers
      - scikit-learn
      - LightGBM
      - LangChain
    Data:
      - Python
      - Spark
      - Airflow
      - dbt
      - Feast
    DevOps:
      - Kubernetes
      - MLflow
      - Argo Workflows
      - Terraform
      - GitHub Actions
    Cloud:
      - AWS (SageMaker, S3, Lambda)
      - GCP (Vertex AI, BigQuery)

languages:
  - { name: Deutsch, level: native }
  - { name: Englisch, level: C1 }
  - { name: Spanisch, level: B1 }

rendering:
  template: tech-dev
  palette: tech-cyan
```

- [ ] **Step 5.2: Validate via CLI**

Run:
```bash
pnpm --filter @codevena/forq-cli build
pnpm --filter @codevena/forq-cli exec forq validate ../../data/cvs/example.de.yaml
```

Expected: `✓ ../../data/cvs/example.de.yaml valid`

If palette ID `tech-cyan` doesn't exist, swap to a valid palette for `tech-dev` template (check `packages/templates/src/tech-dev/palettes.ts`).

---

### Task 6: Sample CV — Adam Reyes (EN)

**Files:**
- Create: `data/cvs/example.en.yaml`

- [ ] **Step 6.1: Write the YAML**

Content of `data/cvs/example.en.yaml`:
```yaml
meta:
  locale: en
  updatedAt: '2026-05-10'

personal:
  firstName: Adam
  lastName: Reyes
  title: 'Product Designer · UX Research · Visual Systems'
  photo: photos/example-adam.webp
  birthDate: '1991-08-22'
  contacts:
    email: adam.reyes@example.com
    phone: '+351 21 000 0000'
    website: https://adamreyes.example.com
    github: adam-reyes
    linkedin: adam-reyes
    location: 'Lisbon, PT (remote)'

summary: >-
  Product Designer with six years of experience shipping consumer and B2B
  products end-to-end. I bridge research, visual systems, and design ops,
  shipping pragmatic interfaces that scale with the team.

experience:
  - title: 'Senior Product Designer'
    company: 'Deliveroo'
    location: 'London (remote)'
    startDate: '2023-06'
    bullets:
      - 'Owned consumer-facing checkout redesign across web and iOS, +8 percent conversion in core European markets'
      - 'Established the design system foundations adopted by 4 product squads (tokens, components, motion principles)'
      - 'Mentored 2 mid-level designers, ran weekly critique sessions and design QA reviews'
    tags: [Figma, Design Systems, Checkout, A/B-Testing]

  - title: 'Product Designer'
    company: 'Klarna'
    location: 'Stockholm'
    startDate: '2021-09'
    endDate: '2023-05'
    bullets:
      - 'Merchant-facing onboarding flow redesign, reduced support tickets by 23 percent in first quarter post-launch'
      - 'Visual identity refresh for the loyalty product (5M monthly users), unified brand expression across surfaces'
      - 'Cross-functional collaboration with engineering on motion-system implementation in React Native'
    tags: [Figma, Onboarding, Brand, Motion]

  - title: 'UX Researcher'
    company: 'Spotify'
    location: 'Stockholm'
    startDate: '2020-08'
    endDate: '2021-08'
    bullets:
      - 'Mixed-methods research on podcast discoverability — surveys, semi-structured interviews, two-week diary studies'
      - 'Synthesized findings into actionable design recommendations adopted by 3 product teams'
      - 'Built and maintained internal research repository with 40+ studies for cross-team reference'
    tags: [User Research, Mixed Methods, Diary Studies]

  - title: 'Visual Designer'
    company: 'HubSpot'
    location: 'Dublin'
    startDate: '2018-04'
    endDate: '2020-07'
    bullets:
      - 'Marketing site visual design, A/B tested 30+ landing-page variants with measurable conversion lifts'
      - 'Designed and shipped a brand illustration system (50+ assets) used across product and marketing'
    tags: [Illustration, Web Design, Brand]

education:
  - degree: 'BA Visual Communication'
    institution: 'Royal College of Art'
    location: 'London'
    startDate: '2014-09'
    endDate: '2017-06'

  - degree: 'UX Bootcamp'
    institution: 'CareerFoundry'
    location: 'Online'
    startDate: '2019-01'
    endDate: '2019-08'

skills:
  categorized:
    Design:
      - Figma
      - Framer
      - Principle
      - After Effects
    Research:
      - User interviews
      - Diary studies
      - Surveys
      - Usability testing
    Code:
      - HTML/CSS
      - React (basics)
      - Storybook
    Operations:
      - Design tokens
      - Documentation
      - Critique facilitation

languages:
  - { name: English, level: native }
  - { name: Portuguese, level: C1 }
  - { name: Spanish, level: B2 }

rendering:
  template: editorial
  palette: editorial-warm
```

- [ ] **Step 6.2: Validate via CLI**

Run:
```bash
pnpm --filter @codevena/forq-cli exec forq validate ../../data/cvs/example.en.yaml
```

Expected: `✓ ../../data/cvs/example.en.yaml valid`

If palette ID `editorial-warm` doesn't exist, swap to a valid palette for `editorial` template.

---

### Task 7: Test-Fixtures scrub (Group A)

**Files:**
- Modify: `packages/core/test/fixtures/valid.de.yaml`
- Modify: `packages/core/test/fixtures/invalid-missing.de.yaml`
- Modify: `packages/schema/test/fixtures.ts`
- Read-only: `packages/core/test/fixtures/broken.yaml` (no personal data — leave alone)

- [ ] **Step 7.1: Read existing fixtures**

Run:
```bash
cat packages/core/test/fixtures/valid.de.yaml
cat packages/core/test/fixtures/invalid-missing.de.yaml
cat packages/schema/test/fixtures.ts
```

Note current structure — fixtures use Alex's data as input.

- [ ] **Step 7.2: Replace `valid.de.yaml` with mini-Lena**

Use sed for safe field-only replacement:
```bash
sed -i '' 's/Alex Schmidt/Lena Bauer/g' packages/core/test/fixtures/valid.de.yaml
sed -i '' 's/Alex/Lena/g' packages/core/test/fixtures/valid.de.yaml
sed -i '' 's/Schmidt/Bauer/g' packages/core/test/fixtures/valid.de.yaml
sed -i '' 's|alex@example.com|lena.bauer@example.com|g' packages/core/test/fixtures/valid.de.yaml
sed -i '' 's|photos/alex|photos/example-lena|g' packages/core/test/fixtures/valid.de.yaml
sed -i '' 's|+49 30 0000000|+49 30 0000000|g' packages/core/test/fixtures/valid.de.yaml
sed -i '' 's|Berlin, DE|Berlin, DE|g' packages/core/test/fixtures/valid.de.yaml
```

Then read the file and verify no remaining personal markers:
```bash
grep -i "alex\|schmidt\|berlin\|9025586" packages/core/test/fixtures/valid.de.yaml
```
Expected: no matches.

- [ ] **Step 7.3: Apply same replacements to `invalid-missing.de.yaml`**

Run the same sed commands against `packages/core/test/fixtures/invalid-missing.de.yaml`:
```bash
sed -i '' 's/Alex Schmidt/Lena Bauer/g' packages/core/test/fixtures/invalid-missing.de.yaml
sed -i '' 's/Alex/Lena/g' packages/core/test/fixtures/invalid-missing.de.yaml
sed -i '' 's/Schmidt/Bauer/g' packages/core/test/fixtures/invalid-missing.de.yaml
sed -i '' 's|alex@example.com|lena.bauer@example.com|g' packages/core/test/fixtures/invalid-missing.de.yaml
sed -i '' 's|photos/alex|photos/example-lena|g' packages/core/test/fixtures/invalid-missing.de.yaml
sed -i '' 's|+49 30 0000000|+49 30 0000000|g' packages/core/test/fixtures/invalid-missing.de.yaml
sed -i '' 's|Berlin, DE|Berlin, DE|g' packages/core/test/fixtures/invalid-missing.de.yaml
```

- [ ] **Step 7.4: Replace personal markers in `packages/schema/test/fixtures.ts`**

Read the file, then apply replacements:
```bash
sed -i '' 's/Alex Schmidt/Lena Bauer/g' packages/schema/test/fixtures.ts
sed -i '' 's/Alex/Lena/g' packages/schema/test/fixtures.ts
sed -i '' 's/Schmidt/Bauer/g' packages/schema/test/fixtures.ts
sed -i '' 's|alex@example.com|lena.bauer@example.com|g' packages/schema/test/fixtures.ts
sed -i '' 's|photos/alex|photos/example-lena|g' packages/schema/test/fixtures.ts
```

- [ ] **Step 7.5: Run schema + core unit tests**

Run:
```bash
pnpm --filter @codevena/forq-schema test:unit
pnpm --filter @codevena/forq-core test:unit
```

Expected: all pass. If any test asserts on `'Alex'` or `'Schmidt'` literal, that's Group B (next task) — flag it.

- [ ] **Step 7.6: No commit yet** — accumulate Phase-1 changes.

---

### Task 8: Test-Files scrub (Group B)

**Files:**
- Modify: `packages/core/test/loader.test.ts`
- Modify: `packages/core/test/photo.test.ts`
- Modify: `packages/core/test/renderer.test.tsx`
- Modify: `apps/cli/test/build.integration.test.ts`
- Modify: `apps/web/components/sections/PersonalSection.test.tsx`

- [ ] **Step 8.1: Apply replacements across all 5 files**

Run:
```bash
for f in \
  packages/core/test/loader.test.ts \
  packages/core/test/photo.test.ts \
  packages/core/test/renderer.test.tsx \
  apps/cli/test/build.integration.test.ts \
  apps/web/components/sections/PersonalSection.test.tsx; do
    sed -i '' 's/Alex Schmidt/Lena Bauer/g' "$f"
    sed -i '' 's/Alex/Lena/g' "$f"
    sed -i '' 's/Schmidt/Bauer/g' "$f"
    sed -i '' 's|alex@example.com|lena.bauer@example.com|g' "$f"
    sed -i '' 's|photos/alex|photos/example-lena|g' "$f"
done
```

- [ ] **Step 8.2: Update `apps/cli/test/build.integration.test.ts` to use example.de.yaml**

The integration test currently reads `data/cvs/cv.de.yaml`. After Section 5 of the spec, that file will be gitignored, so CI cannot find it. Change to `example.de.yaml`.

Read the file, then:
```bash
sed -i '' 's|data/cvs/cv.de.yaml|data/cvs/example.de.yaml|g' apps/cli/test/build.integration.test.ts
```

The assertion that expects "Berufserfahrung" should still pass (the German label, not personal-data). Verify:
```bash
grep -n "Berufserfahrung\|Lena\|Bauer" apps/cli/test/build.integration.test.ts
```

- [ ] **Step 8.3: Run all unit tests**

Run:
```bash
pnpm -r test:unit
```

Expected: all 178 tests pass. If any fails because it asserts on a Alex-specific string that wasn't covered, fix the assertion to match Lena.

- [ ] **Step 8.4: No commit yet** — accumulate.

---

### Task 9: Snapshot regeneration (Group C)

**Files:**
- Delete: `packages/templates/test/__snapshots__/*.snap` (8 files)
- Recreate: same path (Vitest auto-regenerates on `-u` flag)

- [ ] **Step 9.1: Delete all template snapshots**

Run:
```bash
rm packages/templates/test/__snapshots__/*.snap
ls packages/templates/test/__snapshots__/
```

Expected: empty directory.

- [ ] **Step 9.2: Regenerate snapshots with new fixtures**

Run:
```bash
pnpm --filter @codevena/forq-templates test:unit -u
```

Expected: 8 snapshot files regenerated, all 46 template tests pass.

- [ ] **Step 9.3: Verify no Alex markers in regenerated snapshots**

Run:
```bash
grep -i "alex\|schmidt" packages/templates/test/__snapshots__/*.snap
```

Expected: no output.

- [ ] **Step 9.4: No commit yet** — accumulate.

---

### Task 10: App-Code scrub (Group D)

**Files:**
- Modify: `apps/web/app/dev-ui/page.tsx:63`

- [ ] **Step 10.1: Read line 63**

Run:
```bash
grep -n "Alex" apps/web/app/dev-ui/page.tsx
```

Expected: line shows `placeholder="Alex"`.

- [ ] **Step 10.2: Replace with Alex**

Use Edit tool with old_string `placeholder="Alex"` and new_string `placeholder="Alex"`.

- [ ] **Step 10.3: Verify**

Run:
```bash
grep -i "alex" apps/web/app/dev-ui/page.tsx
```

Expected: no output.

- [ ] **Step 10.4: No commit yet** — accumulate.

---

### Task 11: Docs/Specs/Plans scrub (Group E)

**Files:**
- Modify: `docs/superpowers/plans/2026-04-24-cvmake-plan.md` (54 hits)
- Modify: `docs/superpowers/specs/2026-04-24-cvmake-design.md` (7 hits)
- Modify: `docs/superpowers/plans/2026-04-25-forq-ui.md` (3 hits)
- Modify: `docs/superpowers/specs/2026-04-25-forq-editor-design.md` (2 hits)
- Modify: `docs/superpowers/specs/2026-04-25-naming-decision.md` (2 hits)
- Modify: `docs/superpowers/plans/2026-04-25-forq-editor.md` (2 hits)
- Modify: `docs/superpowers/plans/2026-05-10-phase9-ci-visual-regression.md` (2 hits)
- Modify: `docs/superpowers/specs/2026-04-25-forq-ui-design.md` (1 hit)
- Modify: `docs/template-review-2026-04-25.md` (1 hit)

**NOTE:** Do NOT modify `docs/superpowers/specs/2026-05-10-personal-data-strategy-design.md` — it's the spec for THIS migration and references "Alex" in the context-paragraph deliberately. Same for THIS plan file.

- [ ] **Step 11.1: Apply pseudonym replacements across all 9 files**

Run:
```bash
for f in \
  docs/superpowers/plans/2026-04-24-cvmake-plan.md \
  docs/superpowers/specs/2026-04-24-cvmake-design.md \
  docs/superpowers/plans/2026-04-25-forq-ui.md \
  docs/superpowers/specs/2026-04-25-forq-editor-design.md \
  docs/superpowers/specs/2026-04-25-naming-decision.md \
  docs/superpowers/plans/2026-04-25-forq-editor.md \
  docs/superpowers/plans/2026-05-10-phase9-ci-visual-regression.md \
  docs/superpowers/specs/2026-04-25-forq-ui-design.md \
  docs/template-review-2026-04-25.md; do
    sed -i '' 's/Alex Schmidt/Alex Schmidt/g' "$f"
    sed -i '' 's/Alex/Alex/g' "$f"
    sed -i '' 's/Schmidt/Schmidt/g' "$f"
    sed -i '' 's|alex@example.com|maintainer@example.com|g' "$f"
    sed -i '' 's|+49 30 0000000|+49 30 0000000|g' "$f"
    sed -i '' 's|Berlin|Berlin|g' "$f"
done
```

- [ ] **Step 11.2: Manual review — sample 3 random files**

Read each of these for context-sensitivity (sed may have caught false positives in code-blocks):
- `docs/superpowers/plans/2026-04-24-cvmake-plan.md`
- `docs/superpowers/specs/2026-04-24-cvmake-design.md`
- `docs/superpowers/plans/2026-04-25-forq-ui.md`

Check that "Alex" still makes sense in each context. If "Alex Schmidt" appears inside code-block as a string literal that should match a fixture, leave it (consistent with the test-fixture-scrub).

- [ ] **Step 11.3: Verify across all docs (excluding the 2 deliberate exceptions)**

Run:
```bash
grep -i "alex\|schmidt" docs/ -r \
  | grep -v "2026-05-10-personal-data-strategy-design.md" \
  | grep -v "2026-05-10-personal-data-migration.md"
```

Expected: no output.

- [ ] **Step 11.4: No commit yet** — accumulate.

---

### Task 12: `.gitignore` Updates

**Files:**
- Modify: `.gitignore`

- [ ] **Step 12.1: Read current `.gitignore`**

Run:
```bash
cat .gitignore
```

Note existing structure — additions go at the end of the file (or in a logical group).

- [ ] **Step 12.2: Append the new exclusions**

Append to `.gitignore`:
```gitignore

# Personal CV data — gitignored. Copy data/cvs/example.*.yaml to data/cvs/cv.*.yaml
# and edit yours locally. Templates stay clean of forker data.
data/cvs/*.yaml
data/cvs/*.yml
!data/cvs/example.*.yaml
!data/cvs/example.*.yml
data/cvs/photos/*
!data/cvs/photos/example-*
!data/cvs/photos/.gitkeep
!data/cvs/photos/README.md

# Session/review artifacts — local-only, never public
NEXT_SESSION.md
.review-logs/
.review/
```

- [ ] **Step 12.3: Verify pattern resolution**

Run:
```bash
git check-ignore -v data/cvs/cv.de.yaml data/cvs/example.de.yaml \
  data/cvs/photos/alex.jpg data/cvs/photos/example-lena.webp \
  data/cvs/photos/README.md NEXT_SESSION.md .review-logs/foo.md
```

Expected output:
- `data/cvs/cv.de.yaml` → ignored
- `data/cvs/example.de.yaml` → NOT ignored (no output line for it, OR explicit `!` rule shown)
- `data/cvs/photos/alex.jpg` → ignored
- `data/cvs/photos/example-lena.webp` → NOT ignored
- `data/cvs/photos/README.md` → NOT ignored
- `NEXT_SESSION.md` → ignored
- `.review-logs/foo.md` → ignored

If a file unexpectedly shows as ignored when it should be tracked (or vice versa), fix the `.gitignore` patterns.

- [ ] **Step 12.4: No commit yet** — accumulate.

---

### Task 13: Stop tracking now-gitignored files

**Files:**
- Untrack (keep in working tree): `data/cvs/cv.de.yaml`, `cv.en.yaml`, `photos/alex.jpg`, `photos/alex.webp`
- Untrack (keep in working tree): `NEXT_SESSION.md`
- Untrack (keep in working tree): `.review-logs/*`

- [ ] **Step 13.1: Confirm files exist in working tree**

Run:
```bash
ls data/cvs/cv.de.yaml data/cvs/cv.en.yaml data/cvs/photos/alex.jpg
ls NEXT_SESSION.md
ls .review-logs/ | head -5
```

Expected: all files present (alex.webp may or may not exist — currently untracked anyway).

- [ ] **Step 13.2: `git rm --cached` for each tracked file**

Run:
```bash
git rm --cached data/cvs/cv.de.yaml
git rm --cached data/cvs/cv.en.yaml
git rm --cached data/cvs/photos/alex.jpg
git rm --cached NEXT_SESSION.md
git rm --cached -r .review-logs/
```

Expected: Git reports files removed from index. Working-tree files remain.

- [ ] **Step 13.3: Verify untracked status**

Run:
```bash
git ls-files data/cvs/cv.de.yaml data/cvs/cv.en.yaml data/cvs/photos/alex.jpg NEXT_SESSION.md
ls -la data/cvs/cv.de.yaml NEXT_SESSION.md
```

Expected: `git ls-files` outputs nothing. `ls` shows files still present.

- [ ] **Step 13.4: No commit yet** — accumulate.

---

### Task 14: Layer-1 Verification

**Files:** none (verification only)

- [ ] **Step 14.1: Personal-marker grep across HEAD**

Run:
```bash
git grep -i "alex\|schmidt" -- ':!pnpm-lock.yaml' ':!.gitignore' \
  ':!docs/superpowers/specs/2026-05-10-personal-data-strategy-design.md' \
  ':!docs/superpowers/plans/2026-05-10-personal-data-migration.md'
```

Expected: no output. The 2 excluded files reference Alex deliberately as the migration's context.

- [ ] **Step 14.2: Email-leak grep**

Run:
```bash
git grep -E "@(gmail|posteo)\.(me|com|de)" -- ':!pnpm-lock.yaml'
git grep "@proton.me" -- ':!pnpm-lock.yaml'
```

Expected:
- First grep: no output (gmail/posteo are personal)
- Second grep: may show `codevena@proton.me` in some places — that's OK (deliberate OSS-Identity per spec §6).

- [ ] **Step 14.3: Phone-leak grep**

Run:
```bash
git grep -E "\\+49 ?(15|16|17)" -- ':!pnpm-lock.yaml'
```

Expected: no output.

- [ ] **Step 14.4: Berlin-leak grep (location)**

Run:
```bash
git grep -i "berlin" -- ':!pnpm-lock.yaml'
```

Expected: no output (or only inside the migration-spec/plan exception files).

- [ ] **Step 14.5: Verify sample files exist**

Run:
```bash
test -f data/cvs/example.de.yaml && echo OK || echo FAIL
test -f data/cvs/example.en.yaml && echo OK || echo FAIL
test -f data/cvs/photos/example-lena.webp && echo OK || echo FAIL
test -f data/cvs/photos/example-adam.webp && echo OK || echo FAIL
test -f data/cvs/photos/README.md && echo OK || echo FAIL
```

Expected: 5x `OK`.

- [ ] **Step 14.6: Verify real-data un-tracked**

Run:
```bash
git ls-files data/cvs/cv.de.yaml | grep -q . && echo "FAIL: still tracked" || echo OK
git ls-files data/cvs/photos/alex.jpg | grep -q . && echo "FAIL: still tracked" || echo OK
git ls-files NEXT_SESSION.md | grep -q . && echo "FAIL: still tracked" || echo OK
```

Expected: 3x `OK`.

If any check fails, go back and fix the corresponding task before proceeding.

---

### Task 15: Local typecheck + build + test

**Files:** none (verification only)

- [ ] **Step 15.1: Typecheck across workspace**

Run:
```bash
pnpm typecheck
```

Expected: all 10 tasks pass.

- [ ] **Step 15.2: Build across workspace**

Run:
```bash
pnpm build
```

Expected: 6 successful tasks.

- [ ] **Step 15.3: Run all unit tests**

Run:
```bash
pnpm -r test:unit
```

Expected: 178 tests pass across all packages.

- [ ] **Step 15.4: Run integration test (CLI)**

Run:
```bash
pnpm --filter @codevena/forq-cli test:integration
```

Expected: pass — generates a PDF from `data/cvs/example.de.yaml`.

If any of these fail, diagnose and fix before proceeding. Most likely failure: a test still asserts on Alex-specific content not caught by sed.

---

### Task 16: Commit Phase-1 changes (multi-commit, logical grouping)

**Files:** all changes from Tasks 2-13

- [ ] **Step 16.1: Inspect staged + working changes**

Run:
```bash
git status --short
```

Expected: many modifications (M) and additions (A) and deletions (D).

- [ ] **Step 16.2: Commit 1 — Sample data**

Run:
```bash
git add data/cvs/example.de.yaml data/cvs/example.en.yaml \
  data/cvs/photos/example-lena.webp data/cvs/photos/example-adam.webp \
  data/cvs/photos/README.md
git commit -m "content: add fictional sample CVs (Lena Bauer DE, Adam Reyes EN)

Two AI-portraits + 2 realistic personas demonstrating tool capabilities
across 8 templates. Forkers copy example.de.yaml to cv.de.yaml and edit
locally. AI-portraits declared CC0 in photos/README.md."
```

- [ ] **Step 16.3: Commit 2 — Test fixtures + tests**

Run:
```bash
git add packages/core/test/fixtures/ packages/schema/test/fixtures.ts \
  packages/core/test/loader.test.ts packages/core/test/photo.test.ts \
  packages/core/test/renderer.test.tsx \
  apps/cli/test/build.integration.test.ts \
  apps/web/components/sections/PersonalSection.test.tsx \
  packages/templates/test/__snapshots__/
git commit -m "test: replace personal-data fixtures with fictional Lena Bauer

Test fixtures, integration test, snapshot regeneration. CLI integration
test now reads data/cvs/example.de.yaml (committed) instead of cv.de.yaml
(now gitignored)."
```

- [ ] **Step 16.4: Commit 3 — App code + docs scrub**

Run:
```bash
git add apps/web/app/dev-ui/page.tsx \
  docs/superpowers/plans/2026-04-24-cvmake-plan.md \
  docs/superpowers/specs/2026-04-24-cvmake-design.md \
  docs/superpowers/plans/2026-04-25-forq-ui.md \
  docs/superpowers/specs/2026-04-25-forq-editor-design.md \
  docs/superpowers/specs/2026-04-25-naming-decision.md \
  docs/superpowers/plans/2026-04-25-forq-editor.md \
  docs/superpowers/plans/2026-05-10-phase9-ci-visual-regression.md \
  docs/superpowers/specs/2026-04-25-forq-ui-design.md \
  docs/template-review-2026-04-25.md
git commit -m "docs: scrub personal-data references — Alex → Alex pseudonym

Project-author references in plans/specs/docs use Alex Schmidt as
pseudonym. Maintainer's real identity remains in commit-author field
(intentional — see personal-data-strategy spec §9.1)."
```

- [ ] **Step 16.5: Commit 4 — `.gitignore` + untrack**

Run:
```bash
git add .gitignore
git add -u data/cvs/ NEXT_SESSION.md .review-logs/   # picks up the rm --cached
git commit -m "chore: gitignore personal CV data + session/review artifacts

cv.*.yaml + photos/alex.* are now local-only. Forkers' personal
data is also blocked by-default. NEXT_SESSION.md + .review-logs/ are
session-only and excluded from the repo. data/cvs/photos/README.md
declares the AI-portraits CC0."
```

- [ ] **Step 16.6: Verify commits**

Run:
```bash
git log --oneline -5
git status
```

Expected: 4 new commits, working tree clean (or only `M apps/web/next-env.d.ts` auto-gen).

---

### Task 17: Push branch + open PR

**Files:** none (Git/GitHub orchestration)

- [ ] **Step 17.1: Push branch**

Run (after explicit user permission):
```bash
git push -u origin chore/personal-data-migration
```

Expected: branch published to origin.

- [ ] **Step 17.2: Open PR via gh**

Run:
```bash
gh pr create --base main --head chore/personal-data-migration \
  --title "chore: personal-data migration — HEAD scrub (Phase 1 of 2)" \
  --body "$(cat <<'EOF'
## Summary

Phase 1 of the personal-data migration (see spec
`docs/superpowers/specs/2026-05-10-personal-data-strategy-design.md`).

Replaces personal-data in HEAD with 2 fictional sample personas:
- **Lena Bauer (DE)** — Senior Data Scientist, demonstrates tech-dev / monochrome-dark / academic templates
- **Adam Reyes (EN)** — Product Designer, demonstrates editorial / creative-accent / modern-minimal templates

Plus AI-generated CC0 portraits, sample-data committed at `data/cvs/example.*.yaml`,
real CV data + session/review artifacts moved to `.gitignore`.

**This PR does NOT rewrite git history** — the personal-data is still in
historical commits. Phase 2 of the migration (separate session, requires
explicit approval) does the `git filter-repo` + force-push.

## Test plan

- [x] All 178 unit tests pass
- [x] Snapshots regenerated and contain no Alex references
- [x] CLI integration test reads `example.de.yaml` and produces valid PDF
- [x] `.gitignore` patterns verified via `git check-ignore`
- [x] Local typecheck + build green
- [ ] CI 3-job pipeline green (static + unit + e2e+visual)
- [ ] Visual baselines regenerated via `gh workflow run update-baselines.yml` after merge
EOF
)"
```

- [ ] **Step 17.3: Note PR number**

Run:
```bash
gh pr view --json number,url
```

Save the PR number — needed for CI watching.

---

### Task 18: Watch CI + merge

**Files:** none

- [ ] **Step 18.1: Wait for CI completion**

Run:
```bash
PR_NUM=$(gh pr view --json number --jq .number)
gh pr checks $PR_NUM --watch
```

Expected: 3 checks (static, unit, e2e+visual) all `success`.

If e2e+visual fails on baselines: visual regression is expected because the rendered content is now Lena/Adam instead of Alex. Solution:

```bash
# Trigger baseline regeneration workflow
gh workflow run update-baselines.yml --ref chore/personal-data-migration
# Wait for it to complete, then re-run the failing CI
gh run list --workflow update-baselines.yml --limit 1
```

After baselines updated, push the new baseline commit and CI should pass.

- [ ] **Step 18.2: Merge PR (squash)**

Run (after explicit user permission):
```bash
gh pr merge $PR_NUM --squash --delete-branch
```

Expected: merge commit on main, branch deleted on origin.

- [ ] **Step 18.3: Sync main locally**

Run:
```bash
git checkout main
git pull --ff-only origin main
git log --oneline -3
```

Expected: PR merge commit at HEAD on main.

---

## ⏸ Gate 1 — User Approval Required

**STOP HERE.** Phase 1 is complete: HEAD is clean, sample-data is in place, repo is still private and history still contains personal-data. Do NOT proceed to Phase 2 without explicit user approval.

Verify before requesting approval:
- [ ] PR #N is merged to main
- [ ] Local `pnpm typecheck && pnpm build && pnpm -r test:unit` all green on `main`
- [ ] Layer-1 verification (Task 14) re-run on `main` — all pass

When user approves Phase 2, continue.

---

## Phase 2 — filter-repo + Force-Push

### Task 19: Mirror Backup

**Files:**
- Create: `~/forq-backup-2026-05-10.git/` (Git mirror)
- Create: secondary backup at user-chosen external location

- [ ] **Step 19.1: Mirror clone**

Run:
```bash
cd ~
git clone --mirror git@github.com:Codevena/forq.git forq-backup-2026-05-10.git
cd forq-backup-2026-05-10.git
git log --oneline | wc -l
```

Expected: ≥162 commits.

- [ ] **Step 19.2: Verify backup integrity**

Run:
```bash
git fsck --full
```

Expected: no errors, no missing objects.

- [ ] **Step 19.3: Make a second backup at external location**

Ask user where (USB / iCloud / 2nd-machine / NAS). Then:
```bash
# Example for external HD:
cp -R ~/forq-backup-2026-05-10.git /Volumes/EXT/backups/
# Verify:
ls -la /Volumes/EXT/backups/forq-backup-2026-05-10.git/
```

- [ ] **Step 19.4: Restore-test (Layer 0)**

Run:
```bash
cd /tmp
git clone --mirror ~/forq-backup-2026-05-10.git restore-test.git
cd restore-test.git
git log --oneline | wc -l
git fsck --full
rm -rf /tmp/restore-test.git
```

Expected: same commit count, fsck clean. Confirms backup is restorable.

---

### Task 20: Fresh Clone for Rewrite

**Files:**
- Create: `/tmp/forq-rewrite/`

- [ ] **Step 20.1: Clean any prior rewrite directory**

Run:
```bash
rm -rf /tmp/forq-rewrite
```

- [ ] **Step 20.2: Fresh clone**

Run:
```bash
git clone git@github.com:Codevena/forq.git /tmp/forq-rewrite
cd /tmp/forq-rewrite
git log --oneline | head -3
```

Expected: clone successful, latest commits visible.

- [ ] **Step 20.3: Confirm filter-repo would work on this clone**

Run:
```bash
git filter-repo --analyze
ls .git/filter-repo/analysis/
```

Expected: analysis files generated (path-deleted-sizes.txt, blob-shas-and-paths.txt, etc.). This also confirms the clone has the right structure (filter-repo refuses to operate on clones with multiple remotes).

---

### Task 21: Disable Branch Protection

**Files:** none (GitHub API)

- [ ] **Step 21.1: Check current protection settings**

Run:
```bash
gh api repos/Codevena/forq/branches/main/protection > /tmp/main-protection-backup.json
cat /tmp/main-protection-backup.json | head -30
```

Expected: JSON output OR `404 Not Found`. Save to `/tmp/main-protection-backup.json` for restoration.

- [ ] **Step 21.2: Disable protection**

If protection exists:
```bash
gh api -X DELETE repos/Codevena/forq/branches/main/protection
```

Expected: 204 No Content.

If protection didn't exist (404 in 21.1): skip — nothing to disable.

---

### Task 22: Operation A — Path Deletions

**Files:** modifies entire git history of `/tmp/forq-rewrite`

- [ ] **Step 22.1: Run path-deletion filter-repo**

Run from `/tmp/forq-rewrite`:
```bash
cd /tmp/forq-rewrite
git filter-repo --invert-paths \
  --path data/cvs/cv.de.yaml \
  --path data/cvs/cv.en.yaml \
  --path data/cvs/photos/alex.jpg \
  --path data/cvs/photos/alex.webp \
  --path NEXT_SESSION.md \
  --path-glob '.review-logs/*' \
  --path-glob '.review/*' \
  --path scripts/build-letter.mjs \
  --path-glob 'data/letters/*'
```

Expected: filter-repo runs, reports number of commits processed, ends with "Done." Origin remote is automatically removed by filter-repo (safety mechanism).

- [ ] **Step 22.2: Verify path-deletion**

Run:
```bash
git log --all --oneline -- data/cvs/cv.de.yaml
git log --all --oneline -- NEXT_SESSION.md
git log --all --oneline -- .review-logs/
```

Expected: all 3 commands return no output (paths no longer in any commit's tree).

---

### Task 23: Operation B — Content Replacements

**Files:** rewrites file-contents + commit-messages across history

- [ ] **Step 23.1: Write replacement-rules file**

Run:
```bash
cat > /tmp/replacements.txt <<'EOF'
Alex Schmidt==>Alex Schmidt
Schmidt==>Schmidt
alex@example.com==>alex@example.com
regex:\+49 ?(15|16|17)\d{1,2}[\s-]?\d{3,}==>+49 30 0000000
EOF
cat /tmp/replacements.txt
```

Expected: 4 lines in the file. Note: `codevena@proton.me` is intentionally NOT replaced (deliberate OSS-Maintainer-Identity per spec §6 + §9.1).

- [ ] **Step 23.2: Run content-replacement filter-repo**

Run from `/tmp/forq-rewrite`:
```bash
git filter-repo --replace-text /tmp/replacements.txt
```

Expected: filter-repo processes commits, reports count.

- [ ] **Step 23.3: Spot-check a replacement**

Run:
```bash
git show $(git rev-list --all | tail -50 | head -1) -- data/cvs/cv.de.yaml 2>/dev/null | head -20
git log --oneline | grep -i "alex" | head -3
```

Expected: commit messages that previously had "Alex" content now show "Alex"; old YAML reference (if any) shows scrubbed content.

---

### Task 24: Operation C — Mailmap (commit-author cleanup)

**Files:** rewrites commit-author across history (safety net)

- [ ] **Step 24.1: Write mailmap file**

Run:
```bash
cat > /tmp/mailmap.txt <<'EOF'
Codevena <codevena@proton.me> Claude <noreply@anthropic.com>
EOF
```

- [ ] **Step 24.2: Run mailmap filter-repo**

Run from `/tmp/forq-rewrite`:
```bash
git filter-repo --mailmap /tmp/mailmap.txt
```

Expected: completes (likely 0 commits-affected on `main`-only history per spec §6 reality-check, but safe to run).

- [ ] **Step 24.3: Verify**

Run:
```bash
git log --all --author="Claude" --oneline
```

Expected: no output.

---

### Task 25: Layer-2 Full-History Blob Scan

**Files:** none (verification only — but slow, may take 1-2 min)

- [ ] **Step 25.1: Walk every blob and grep for personal markers**

Run from `/tmp/forq-rewrite`:
```bash
git rev-list --objects --all \
  | awk '{print $1}' | sort -u \
  | while read sha; do
      [ "$(git cat-file -t $sha 2>/dev/null)" = "blob" ] || continue
      git cat-file -p $sha 2>/dev/null \
        | grep -q -i "alex\|schmidt\|alex.schmidt@gmail" \
        && echo "LEAK in $sha"
    done
```

Expected: NO output (no leaks).

If leaks found: investigate which file/commit, identify pattern not caught by Operations A/B, add to replacement rules, re-run filter-repo from a fresh clone (DO NOT continue past leaks).

- [ ] **Step 25.2: Re-run filter-repo --analyze for diagnostic**

Run:
```bash
git filter-repo --analyze
grep -i "alex\|schmidt" .git/filter-repo/analysis/*.txt
```

Expected: no output.

- [ ] **Step 25.3: Save audit trail**

Run:
```bash
{
  echo "Personal-Data Migration Audit — $(date -Iseconds)"
  echo ""
  echo "## Phase-2 filter-repo summary"
  echo "Commits in rewritten repo: $(git log --all --oneline | wc -l)"
  echo "Branches: $(git branch -a | wc -l)"
  echo ""
  echo "## Layer-2 leak scan (all blobs)"
  echo "(empty = no leaks found)"
  git rev-list --objects --all \
    | awk '{print $1}' | sort -u \
    | while read sha; do
        [ "$(git cat-file -t $sha 2>/dev/null)" = "blob" ] || continue
        git cat-file -p $sha 2>/dev/null \
          | grep -q -i "alex\|schmidt\|alex.schmidt@gmail" \
          && echo "LEAK in $sha"
      done
  echo ""
  echo "## filter-repo --analyze findings"
  ls .git/filter-repo/analysis/
} > /tmp/forq-migration-audit.txt
cat /tmp/forq-migration-audit.txt
```

Expected: audit file saved with no leaks.

---

### Task 26: Layer-3 Build/Test in rewritten repo

**Files:** none (verification only)

- [ ] **Step 26.1: Restore origin remote (filter-repo removed it)**

Run:
```bash
cd /tmp/forq-rewrite
git remote add origin git@github.com:Codevena/forq.git
git remote -v
```

Expected: origin set.

- [ ] **Step 26.2: pnpm install**

Run:
```bash
pnpm install
```

Expected: install completes.

- [ ] **Step 26.3: Typecheck + build**

Run:
```bash
pnpm typecheck
pnpm build
```

Expected: all green.

- [ ] **Step 26.4: Unit tests**

Run:
```bash
pnpm -r test:unit
```

Expected: 178 tests pass. Visual tests are expected to fail because baselines reference old SHAs/content; that's regenerated post-push (Task 30).

---

## ⏸ Gate 2 — User Approval Required

**STOP HERE.** Show user:
- `/tmp/forq-migration-audit.txt` contents (proof of zero leaks)
- Test results (178 unit tests passing in rewritten repo)
- Backup locations (primary + secondary)

Do NOT force-push without explicit user approval.

When user approves, continue.

---

### Task 27: Force-Push

**Files:** none (Git push)

- [ ] **Step 27.1: Final pre-push sanity-check**

Run:
```bash
cd /tmp/forq-rewrite
gh run list --status in_progress --limit 5
```

Expected: empty or only unrelated workflow-runs. If a workflow on main is in-progress, wait for it to finish (~5 min) before push.

- [ ] **Step 27.2: Force-push all branches + tags**

Run (after explicit user approval):
```bash
git push --force --all origin
git push --force --tags origin
```

Expected: push reports `+ <old-sha>...<new-sha>` for main (and any other branches), confirming force-update.

- [ ] **Step 27.3: Verify origin state**

Run:
```bash
gh api repos/Codevena/forq/git/refs/heads/main --jq .object.sha
gh api repos/Codevena/forq/contents/data/cvs?ref=main \
  --jq '.[] | .name'
```

Expected:
- New SHA on main matches local `git rev-parse HEAD`
- `data/cvs/` listing shows `example.de.yaml`, `example.en.yaml`, `photos/`, `.gitkeep` — NO `cv.de.yaml`/`cv.en.yaml`/`alex.*`

---

### Task 28: Re-enable Branch Protection

**Files:** restores from `/tmp/main-protection-backup.json`

- [ ] **Step 28.1: Restore protection if it existed**

If `/tmp/main-protection-backup.json` had content (was not 404):
```bash
# Re-apply via gh api (or via repo Settings UI in browser)
# Settings UI is often safer — open:
gh repo view Codevena/forq --web
# Navigate to Settings → Branches → Add rule for main with same options as backup
```

If protection was originally absent: skip.

- [ ] **Step 28.2: Verify**

Run:
```bash
gh api repos/Codevena/forq/branches/main/protection 2>&1 | head -20
```

Expected: matches the original protection state.

---

### Task 29: Optional — Repo Rename forq → cvmake

**Files:** none (GitHub admin)

This implements OQ §9.2.

- [ ] **Step 29.1: Confirm with user before rename**

This action affects all clones, all CI references, all GitHub URLs.

- [ ] **Step 29.2: Rename via gh**

Run (after explicit user approval):
```bash
gh repo rename cvmake --repo Codevena/forq
```

Expected: repo is now `Codevena/cvmake`. GitHub auto-redirects `Codevena/forq` URLs.

- [ ] **Step 29.3: Update local clones' remotes (in this session's working repo)**

Already-existing clones need updating in Task 30.

---

### Task 30: Re-Clone Working Repo + Restore Real-Data

**Files:** Alex's local working tree at `/Users/alex/Developer/cvMake`

- [ ] **Step 30.1: Backup real-data from current working tree**

Run:
```bash
mkdir -p ~/cv-backup-2026-05-10
cd /Users/alex/Developer/cvMake
cp data/cvs/cv.de.yaml ~/cv-backup-2026-05-10/
cp data/cvs/cv.en.yaml ~/cv-backup-2026-05-10/
cp data/cvs/photos/alex.* ~/cv-backup-2026-05-10/ 2>/dev/null
ls ~/cv-backup-2026-05-10/
```

Expected: backup directory contains cv.de.yaml, cv.en.yaml, alex.jpg (and possibly alex.webp).

- [ ] **Step 30.2: Move existing clone aside (don't delete yet)**

Run:
```bash
cd /Users/alex/Developer
mv cvMake cvMake-OLD-2026-05-10
```

Expected: old clone preserved at `cvMake-OLD-2026-05-10`.

- [ ] **Step 30.3: Fresh clone**

Run:
```bash
# If repo was renamed in Task 29:
git clone git@github.com:Codevena/cvmake.git cvMake
# Otherwise:
# git clone git@github.com:Codevena/forq.git cvMake
cd cvMake
git log --oneline -3
```

Expected: fresh clone with rewritten history at HEAD.

- [ ] **Step 30.4: Restore real-data into the gitignored slots**

Run:
```bash
cp ~/cv-backup-2026-05-10/cv.de.yaml data/cvs/
cp ~/cv-backup-2026-05-10/cv.en.yaml data/cvs/
cp ~/cv-backup-2026-05-10/alex.* data/cvs/photos/ 2>/dev/null
git status
```

Expected: `git status` shows clean working tree (the real-data files are gitignored, so they don't appear).

- [ ] **Step 30.5: Verify real-data is properly gitignored**

Run:
```bash
git check-ignore data/cvs/cv.de.yaml data/cvs/cv.en.yaml data/cvs/photos/alex.jpg
```

Expected: all 3 paths echoed back (= ignored).

---

### Task 31: Layer-4 Fresh-Clone Verification

**Files:** none

- [ ] **Step 31.1: pnpm install + typecheck + build + test in fresh clone**

Run:
```bash
cd /Users/alex/Developer/cvMake
pnpm install
pnpm typecheck && pnpm build && pnpm -r test:unit
```

Expected: all green, 178 tests pass.

- [ ] **Step 31.2: Re-run Layer-2 blob-scan in fresh clone**

Run:
```bash
git rev-list --objects --all \
  | awk '{print $1}' | sort -u \
  | while read sha; do
      [ "$(git cat-file -t $sha 2>/dev/null)" = "blob" ] || continue
      git cat-file -p $sha 2>/dev/null \
        | grep -q -i "alex\|schmidt\|alex.schmidt@gmail" \
        && echo "LEAK in $sha"
    done
```

Expected: no output (confirms force-push delivered the rewritten history).

---

### Task 32: Visual-Baseline Regeneration

**Files:** GitHub Actions workflow `update-baselines.yml`

- [ ] **Step 32.1: Trigger update-baselines workflow**

Run:
```bash
cd /Users/alex/Developer/cvMake
gh workflow run update-baselines.yml --ref main
gh run list --workflow update-baselines.yml --limit 1
```

Expected: workflow triggered, run-ID returned.

- [ ] **Step 32.2: Wait for completion + sync**

Run:
```bash
RUN_ID=$(gh run list --workflow update-baselines.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch $RUN_ID
git pull --ff-only origin main
ls packages/templates/test/visual/__baselines__/ | head -5
```

Expected: workflow succeeds, commits 22 new Linux-baselines with Lena/Adam content, local main syncs.

- [ ] **Step 32.3: Confirm no Alex content in baselines**

Run:
```bash
file packages/templates/test/visual/__baselines__/*.png | head
# baselines are PNG files, can't grep for text — but check for visual review:
open packages/templates/test/visual/__baselines__/*.png   # macOS preview
```

Expected: visually inspect — Lena/Adam content visible in 1-2 baselines.

---

### Task 33: Migration Documentation (COMPLETE)

**Files:**
- Create: `docs/superpowers/specs/2026-05-10-personal-data-migration-COMPLETE.md`

- [ ] **Step 33.1: Write the completion record**

Content of `docs/superpowers/specs/2026-05-10-personal-data-migration-COMPLETE.md`:

```markdown
# Personal-Data Migration — COMPLETED

**Date:** 2026-05-10
**Plan:** `docs/superpowers/plans/2026-05-10-personal-data-migration.md`
**Spec:** `docs/superpowers/specs/2026-05-10-personal-data-strategy-design.md`

## Summary

Successfully migrated `Codevena/forq` (renamed to `Codevena/cvmake` if Task 29 executed) from a private repo containing personal-data to an OSS-public-ready state.

## State Before/After

- **Before:** 162 commits, personal CV data (Alex Schmidt) in HEAD + history
- **After:** Personal data scrubbed from all blobs across all commits. 2 fictional sample personas (Lena Bauer DE, Adam Reyes EN) demonstrate tool capabilities.

## Migration SHAs

- **Last commit before migration (main):** [fill in: `git rev-parse @{1}` from old clone, OR from backup]
- **First commit after migration (main):** [fill in: `git rev-parse main` after force-push]

## Backups

- **Primary:** `~/forq-backup-2026-05-10.git` (Mac local disk)
- **Secondary:** [fill in user-chosen external location from Task 19.3]

## Layer-2 Audit

See `/tmp/forq-migration-audit.txt` (saved during Phase-2). Result: **zero leaks** confirmed.

## Restoration Procedure (if needed)

```bash
git clone --mirror ~/forq-backup-2026-05-10.git restore.git
cd restore.git
git push --mirror --force git@github.com:Codevena/cvmake.git
```

Use within 24-48h of force-push, before Phase-10 work lands on top.

## Phase-10 Readiness

This migration unblocks Phase 10 (README + Docs + Screenshots + Release):
- Sample-data demonstrates tool capabilities for screenshots
- README can document the `cp example.de.yaml cv.de.yaml` onboarding flow
- LICENSE-file (MIT/Apache-2.0) can be safely added in Phase 10
```

- [ ] **Step 33.2: Fill in the SHA placeholders + backup-location**

Replace `[fill in]` with actual values from the session.

- [ ] **Step 33.3: Commit completion doc**

Run:
```bash
git add docs/superpowers/specs/2026-05-10-personal-data-migration-COMPLETE.md
git commit -m "docs: personal-data migration complete

Records SHAs before/after, backup locations, audit-trail reference,
and restoration procedure. Phase 10 (README + release) is now unblocked."
git push origin main
```

---

### Task 34: Cleanup

**Files:** none (housekeeping)

- [ ] **Step 34.1: After 48h of confirmed stability, remove local rewrite directory**

Run:
```bash
rm -rf /tmp/forq-rewrite /tmp/replacements.txt /tmp/mailmap.txt /tmp/forq-migration-audit.txt /tmp/main-protection-backup.json
```

- [ ] **Step 34.2: Keep mirror backup for at least 30 days**

`~/forq-backup-2026-05-10.git` and external backup remain available. After 30 days of post-migration work, user may delete.

- [ ] **Step 34.3: Optional — delete `cvMake-OLD-2026-05-10`**

Once user confirms the new clone has all needed data and works correctly:
```bash
rm -rf /Users/alex/Developer/cvMake-OLD-2026-05-10
```

---

## Self-Review Checklist (executor reads before starting)

Before kicking off Task 1, verify:
- [ ] Spec read and understood: `docs/superpowers/specs/2026-05-10-personal-data-strategy-design.md`
- [ ] Backups will go to 2 locations (Task 19)
- [ ] Two user-gates exist: Gate 1 (Phase-1 done, before Phase 2 starts), Gate 2 (filter-repo done, before force-push)
- [ ] Operation C (mailmap) likely 0-effect on main but runs as safety-net (per spec §6)
- [ ] `codevena@proton.me` is deliberately NOT scrubbed (per spec §6 + §9.1)
- [ ] Files `2026-05-10-personal-data-strategy-design.md` and `2026-05-10-personal-data-migration.md` are EXCEPTIONS in scrub (they reference Alex deliberately as context)
- [ ] If filter-repo finds leaks (Task 25): STOP, do NOT continue past Gate 2

---

## Plan Coverage Map (spec → tasks)

| Spec Section | Plan Tasks |
|--------------|-----------|
| §1 Goals + Non-Goals | embedded throughout, Goal stated in plan header |
| §2 Decisions Snapshot | reflected in OQ-resolutions and task structure |
| §3 Sample-Data-Inventar | Tasks 2, 3, 4, 5, 6 |
| §4 Source-Code-Scrub Inventar | Tasks 7, 8, 9, 10, 11 |
| §5 .gitignore + Final Repo State | Tasks 12, 13 |
| §6 filter-repo Recipe | Tasks 22, 23, 24 |
| §7 Verifikation + Test-Plan | Tasks 14, 15, 25, 26, 31 |
| §8 Migration-Sequence | overall plan structure (Phase 1 / Gate 1 / Phase 2 / Gate 2) |
| §9 Risks + Open Questions | OQ-resolutions in plan header, risk-mitigations in Tasks 19, 21, 28, 30 |
| §10 Phase-10-Readiness | Task 33 documentation |
