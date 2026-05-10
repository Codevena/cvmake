# Personal-Data Migration — COMPLETED

**Date:** 2026-05-10
**Plan:** `docs/superpowers/plans/2026-05-10-personal-data-migration.md`
**Spec:** `docs/superpowers/specs/2026-05-10-personal-data-strategy-design.md`

## Summary

Successfully migrated `Codevena/forq` (renamed to `Codevena/cvmake` per OQ §9.2)
from a private repo containing personal CV data to an OSS-public-ready state.
Phase 1 scrubbed HEAD via a reviewable PR; Phase 2 rewrote all 156 commits
across both branches via `git filter-repo` and force-pushed the new history.

## State Before / After

- **Before:** 166 commits on `feat/cvmake-mvp`, personal CV data (Markus
  Wiesecke) in HEAD + history. Real CVs at `data/cvs/cv.{de,en}.yaml`,
  portrait at `data/cvs/photos/markus.jpg`. Personal session/review
  artefacts (`NEXT_SESSION.md`, `.review-logs/`) tracked.
- **After:** Personal data scrubbed from all blobs across all commits and
  branches. Two fictional sample personas (Lena Bauer DE, Adam Reyes EN)
  with AI-generated CC0 portraits demonstrate tool capabilities. Real
  data lives in working tree only, gitignored. Repo renamed `forq → cvmake`.

## Migration SHAs (main)

- **Last commit before Phase 1 merge:** `22a8e2f` (Phase-9 cleanup squash-merge)
- **Phase 1 merge (HEAD-scrub via PR):** `ad096d5` (squash of 9 commits)
- **Phase 2 rewrite (force-pushed):** `08277c1` (rewritten merge-equivalent)

The `feat/cvmake-mvp` branch was rewritten in parallel:
`a46fd11 → acab9c4` (155 commits).

## Backups (PRESERVED)

- **Primary:** `~/cvmake-backup-2026-05-10.git` — Mac local disk, 181 commits,
  fsck clean, mirror clone of pre-rewrite `Codevena/forq`.
- **Secondary:** `~/Documents/cvmake-backup-2026-05-10.git` — same content,
  separate path, restore-tested.

## Audit Trail

- **Layer-1** (HEAD scrub, Phase 1): `git grep -i "markus|wiesecke"` clean
  except 2 deliberate-reference docs. 178 unit tests + integration test pass.
- **Layer-2** (full-history blob scan, Phase 2): zero leaks across all 156
  commits and 2 branches. See `/tmp/forq-migration-audit.txt` (or recreate
  via the same script).
- **Layer-3** (build/test in rewritten repo): typecheck 10/10, build 6/6,
  unit 178/178, mirroring Phase-1 baseline.
- **Layer-4** (fresh-clone verification): zero leaks, build green, tests
  green at `/Users/markus/Developer/cvMake` cloned from renamed origin.
- **CI on rewritten main:** run 25637444046 — `success` in 4m09s, including
  e2e + visual regression on the inherited Lena/Adam baselines.

## Authors after rewrite

Single normalized author across all 156 commits:
`Codevena <codevena@proton.me>` (per spec §9.1, deliberate OSS-Identity).

## filter-repo operations applied (recap)

- **A — path-deletions:** `data/cvs/cv.{de,en}.yaml`, `data/cvs/photos/markus.{jpg,webp}`,
  `NEXT_SESSION.md`, `.review-logs/*`, `.review/*`, `scripts/build-letter.mjs`,
  `data/letters/*`.
- **B — replace-text** (18 rules; see `/tmp/replacements.txt`):
  Markus Wiesecke→Alex Schmidt, lowercase variants, linkedin handles, photo
  paths, terminal-prompt, `/Users/markus/`, Wuppertal→Berlin, plus uppercase
  fallbacks for case-insensitive completeness.
- **C — mailmap:** safety-net rewrite of any `Claude <noreply@anthropic.com>`
  or `Markus <codevena@proton.me>` author into the canonical
  `Codevena <codevena@proton.me>`.

## Restoration Procedure (if needed)

```bash
git clone --mirror ~/cvmake-backup-2026-05-10.git restore.git
cd restore.git
git push --mirror --force git@github.com:Codevena/cvmake.git
```

Use within 24–48h of force-push, before any new work lands on top.

## Phase-10 Readiness

This migration unblocks Phase 10 (README + LICENSE + CONTRIBUTING + Screenshots
+ public-toggle):

- Sample-data demonstrates tool capabilities for screenshots
- README can document the `cp example.de.yaml cv.de.yaml` onboarding flow
- LICENSE-file (MIT/Apache-2.0) can be safely added in Phase 10
- Repo is now under the `cvmake` name, aligned with the brand decision in
  spec `docs/superpowers/specs/2026-04-25-naming-decision.md`

## Cleanup pending

Per plan §34, after 48h of confirmed stability:

- `rm -rf /tmp/forq-rewrite /tmp/replacements.txt /tmp/mailmap.txt`
  `/tmp/forq-migration-audit.txt /tmp/main-protection-backup.json`
- After 30 days, primary + secondary backups can be deleted at user's discretion
- `cvMake-OLD-2026-05-10` (sibling of the fresh clone) can be deleted once
  the new clone is confirmed working
