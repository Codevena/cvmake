# Review record — editor data loss, audit findings, and the font/egress work

Three packages of work reviewed together, because they touch the same files.
This file exists so the verdicts survive `rm -rf .review/`.

## Gates

`./gates` 6/6 green: build, lint, typecheck, test-unit, test-integration,
smoke-pack. `pnpm audit --prod` went from 31 advisories to 7; the remaining
seven all arrive through Puppeteer 24 and need its major upgrade.

## Plan gates (before implementation)

| Plan | Rounds | Final verdict |
|---|---|---|
| Editor data-loss package | 3 | PASS |
| Four small audit findings | 3 | PASS |
| The remaining seven findings | 1 | FAIL — 5 CRITICAL, incorporated before coding |

The last one is the one worth remembering: every one of its five CRITICALs was
about a *fix*, not about the defect it was fixing. Taking the last
`x-forwarded-for` entry would have put every visitor behind Cloudflare into one
rate-limit bucket; the photo restriction was bypassable by omitting the optional
field it keyed on; and the visual-baseline plan would have destroyed all 34 CI
baselines, because they are Linux baselines and this machine is macOS.

## Definition of Done

### Slot A — executing reviewer (`codex`-equivalent Claude subagent)

**Round 1: FAIL — 2 CRITICAL, 4 WARN.** 38 mutations executed, 33 red.

- CRITICAL: demo mode — the deployed configuration — offered "Save and switch",
  which called a save that returns immediately because demo pauses autosave.
  Measured: `push: 0`, `fetch: 0`, dialog closes, no message.
- CRITICAL: `normaliseSkills` turned four classes of real YAML mistake into a
  silently deleted section with exit 0.
- WARN: the command-palette switch guard and the tab-error wiring each had no
  test — reverting either left 106/106 green.
- WARN: the payload's tree binding was void; the tree moved under the gate.

**Round 2: FAIL — 2 CRITICAL, 4 WARN.** Round 1 re-verified closed by measurement.

- CRITICAL: the photo ownership check was a prefix test on the *raw* value while
  containment ran *after* normalisation, so `/photos/cv.de./../other.jpg`
  satisfied both. Measured through the real route: 200, with the other person's
  image in the PDF. Every test that claimed to guard it was vacuous — they named
  files that did not exist, so `readFile` dropped the photo for an unrelated
  reason.
- CRITICAL: the vendored fonts went into the bootstrap object that the editor
  receives as a prop — all twelve templates, serialised into every page load.
  Measured: 2 218 957 bytes against ~57 KB before.
- WARN: the production fail-closed path was untested in both directions.
- WARN: a forwarded chain ending in a private address was used as a rate-limit
  key, which would put the whole site in one bucket.
- WARN: the published package shipped six OFL families with neither the licence
  text nor the copyright notices.
- WARN: the export-error handling reached one of two call sites.

**Evidence highlights (all executed, not read).** The autosave rewrite held
under every probe: 30 rapid edits → 1 request then silence; a permanently
failing server → 1 request with `hasUnsavedChanges` still true; edits during a
conflict → 0 requests; conflict→reload writes nothing back. The fonts genuinely
land in the PDF — a render per template, read back with `pdffonts`: Crimson Pro,
Fraunces+Inter, Fraunces+Source Sans, Inter, Inter, Cormorant Garamond,
JetBrains Mono+Inter, all embedded — and `pdftotext` still extracts name and
e-mail from all eight, so the subsets did not break ATS parsing.

### Slot B — reading reviewer

**FAIL — 4 CRITICAL, 7 WARN, 8 INFO.** Its best catch was one no executing probe
had made: `data:` was added to the *renderer's* `font-src` and forgotten in the
app's own CSP. The preview writes into an `about:blank` iframe, which inherits
the app policy, so every vendored face would have been refused in the browser —
the PDF/preview mismatch this work removes, pointing the other way.

It also found that three templates still name typefaces nobody ships, including
`classic-serif`, which `cvmake init` writes into the starter file.

One of its four CRITICALs was **refuted by measurement**: opening a CV with a
stale palette does not write the file back. Control (a real edit) → one POST;
stale palette → none, with the repair confirmed to have run.

## Mutation rounds

Every guard added here was run against a deliberately reintroduced defect in an
APFS clone. Notable results:

- The first `dirtyFields` assertion could not fail: the observer subscribed
  after the effect it observed. Replaced with a `setValue` spy built outside the
  tree, which has no ordering dependency.
- The first Skills validity guard passed by catching `isValid`'s initial `false`
  before the resolver had run. Rewritten around the real interaction.
- Two mutations on the `PeriodField` fix came back green and were shown to be
  vacuous *mutations* rather than vacuous tests; the mutation that reproduces the
  original mechanism (`useController` reading the field back) fails both cases.
