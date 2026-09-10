# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] — 2026-09-10

### Fixed
- **`cvmake init` suggested a palette that does not exist.** The starter file
  offered `classic-serif-default`; the template's palettes are `classic-grey`,
  `classic-navy` and `classic-ink`. Uncommenting the line produced a PDF in the
  template's default colours and exit 0. Both language variants now name a real
  palette, and `cvmake build` refuses an unknown one instead of substituting it
  silently — naming where the value came from and which names are valid. A
  palette that stops matching only because `--template` overrode the template is
  a note, not an error: that mismatch is a consequence of the override, not of
  the file.
- **The chosen aspect ratio no longer gets discarded.** The upload route read an
  `aspect` field and never used it, and photo processing resized every crop to a
  square — so a 3:4 selection was extracted correctly and then squashed. Output
  dimensions now follow the crop rectangle, which is what the user actually
  dragged: a 3:4 crop yields 450x600, a square one still yields 600x600. The
  seven templates that frame the photo in a square now anchor it at the top, so
  a portrait keeps its head rather than losing equal parts of crown and chin.
- **A stored CV whose palette no longer exists is repaired when it is opened**,
  instead of only when the template is switched. The rendered result is
  unchanged (it already fell back to the same palette); what changes is that a
  valid value travels on. The file itself keeps the stale value until you save,
  and `cvmake build` refuses it until then — correct the line, or open and save
  the file once.
- **A new experience or education entry can be given a date again.** The date
  input derived its display from the value it had just emitted, so picking a
  month before a year discarded the choice as it was made — and since a new
  entry starts with no date, it could never become valid. The field now keeps a
  partial selection, and a bare year is emitted as the valid date it is.
- **Reverting an edit is saved.** Autosave asked react-hook-form whether the
  form was dirty, which compares against the values the page was loaded with:
  after changing a field and changing it back, the form read clean while the
  disk still held the intermediate value. It now compares against what the
  server last accepted.
- **Switching CVs no longer walks away from unsaved work.** The confirmation
  only appeared in demo mode, on the reasoning that autosaving every two
  seconds made it unnecessary — which does not hold inside the debounce window,
  for an invalid form that is never sent, or after a save that failed. The
  guard now applies in both modes and to the command palette, which bypassed it
  entirely. Where the changes can be saved, the dialog offers to save and then
  switch; where they cannot, it says why and offers the way to the error or to
  the unresolved conflict instead of a button that could never complete.
- **Opening the Skills tab no longer makes the CV invalid.** Registering the
  field left an empty `skills` object behind, which failed validation although
  nothing had been typed: autosave stopped, PDF export greyed out, and nothing
  said where the problem was. An entirely empty skills section is now treated
  as no section at all. A half-added category still keeps the form invalid on
  purpose, so autosave does not persist it before it is finished.
- **Tabs mark the sections that contain errors**, visibly and for assistive
  technology. Previously an invalid form named no location at all.
- **Unchecking "Current" no longer leaves an end date on screen that the
  document does not hold.** Checking it clears the end; unchecking emitted an
  empty end while the two selects went on showing the old one, so the editor
  displayed a date the PDF would not have. It corrected itself only if the user
  touched a select again.
- **Switching CVs in demo mode works again.** The confirmation offered "Save and
  switch", but demo mode never writes to disk: the button called a save that
  returns immediately, closed the dialog and did nothing at all — no navigation
  and no message. It now says the demo cannot save and offers to discard and
  switch, which is what the older, demo-only dialog did.
- **A half-added skills category is refused by the form rather than by the
  server.** The value never reached disk either way, but the form reported
  itself valid, so autosave sent one request per edit and every one came back
  422.
- **The "live editor" links in `README.md` and `apps/cli/README.md` pointed at
  the template showcase**, not the editor. Both now point at
  `cveditor.codevena.dev`. The README also claimed the browser preview was
  "byte-identical" to the exported PDF; it says what the two actually share
  instead.

### Changed (breaking)
- **`personal.photo` now accepts only a local path or a `data:image/` URI.**
  Remote `http(s)` values, values carrying tab, carriage-return or line-feed
  characters, and protocol-relative values (`//host/x.jpg`) are rejected by the
  schema. A remote value did render before this change — which is precisely the
  problem: the machine doing the render fetched an address chosen by whoever
  supplied the CV. If you used a remote photo, download it next to your YAML and
  point `photo` at the local file, or embed it as a `data:image/` URI.

  An empty string keeps working: it means "no photo" and is what the editor
  writes when a picture is removed. A CV with no `photo` key is unaffected.

  **If you have an existing `cv.yaml` with a remote photo, the whole file now
  fails to load, not just the photo** — `cvmake build` and `cvmake validate`
  both stop with a validation error naming the field, the editor's API answers
  422, and the editor page fails to open the document at all, so you cannot fix
  it from the UI. Edit the `photo:` line in the YAML by hand. This mainly affects files produced by
  `cvmake import` before this release: its old mapping kept a JSON Resume
  `basics.image` URL verbatim, and JSON Resume images usually are URLs.

  `cvmake import` follows the same contract: JSON Resume's `basics.image` is
  usually a remote URL, and the importer now drops it with a note instead of
  writing a document that will not validate.

- **`contacts.website` now accepts only `http(s)` URLs.** `javascript:`,
  `data:`, `file:` and `ftp:` were valid, and two of the twelve templates put
  the value straight into an `<a href>`; `mailto:` is refused too, since the
  address has its own field.
- **`rendering.sectionOrder` must not repeat a section.** A duplicate rendered
  the section twice with no validation error and no React warning, because the
  keys are fixed strings.

### Changed
- The PDF renderer no longer loads anything from the network. Only content
  embedded in the document itself is used; the rendered document additionally
  declares a Content-Security-Policy that says the same.
- **Seven templates now ship the typefaces they name.** They used to pull Inter,
  Playfair Display, JetBrains Mono and friends through a Google Fonts `@import`
  that the PDF path never executed: the composed stylesheet puts another rule in
  front of it, and CSS drops an `@import` that is not first. The browser preview
  loaded them and the export did not, so the two disagreed — and once the
  renderer was cut off from the network, the fetch could not have succeeded at
  all. The fonts are vendored now: 32 faces, latin subset, embedded as `data:`
  URIs, which `@font-face` accepts with no ordering rule to lose. Exported PDFs
  in `academic`, `creative-accent`, `editorial`, `modern-minimal`,
  `monochrome-dark`, `noir` and `tech-dev` therefore change appearance — they
  render in the typeface the template always named. This adds ~2.1 MB to
  `@codevena/cvmake-templates`. Licences (OFL-1.1 / Apache-2.0, both
  redistributable) are recorded in `src/shared/FONT-LICENSES.md`.
- **The rate limit on `/api/export` now identifies clients through a single
  resolver** (`apps/web/lib/client-ip.ts`) instead of reading the first
  `x-forwarded-for` entry inline. That entry is written by the client, so a
  fresh value per request bought a fresh bucket and the limit did nothing.
  Candidates are validated with `net.isIP`, IPv6 is bucketed by `/64`, and a
  request whose origin cannot be established is refused in production before
  any renderer starts rather than sharing one sentinel bucket with everyone
  else. What this is worth depends on the origin being unreachable outside the
  proxy; the module says so rather than implying more.
- **A failed PDF export now says so — from both places it can be started.** The
  button flipped back to its label and the rejection went unhandled, so a
  failure was indistinguishable from a no-op. The command palette had no
  handling at all, and it is the less guarded of the two: the toolbar button is
  disabled on an invalid form, the command is not.
- **An export the server cannot attribute to a client is refused in production**
  before a browser starts, instead of sharing one bucket with every other
  unattributable request. A forwarded chain that ends inside the infrastructure
  — a docker bridge, a loopback, a private range — counts as unattributable
  rather than as a visitor: keying on it would have put the whole site into one
  bucket of five exports a minute.
- **The editor page is back to its old weight.** Vendoring the fonts into the
  bootstrap object that the editor receives as a prop took every page load from
  ~57 KB to 2.12 MB, and eleven twelfths of that was typefaces for templates the
  viewer is not looking at. The preview now fetches `/template-fonts/<id>.css`
  for the one template it renders, cached by the browser; the PDF still embeds
  everything, because the renderer cannot fetch anything at all.
- The app's Content-Security-Policy allows `data:` fonts. Without it the browser
  refused every vendored face and the preview fell back to a system font — the
  PDF/preview mismatch this release removes, pointing the other way. The preview
  renders into an `about:blank` iframe, which inherits the app's policy rather
  than the renderer's, so the two have to be changed together.

### Security
- **Puppeteer 24 → 25.** `pnpm audit --prod` goes from 7 advisories to none —
  all seven arrived through Puppeteer's dependency tree (`ws`, `ip-address`,
  `extract-zip`) and none had a fix below the major. No API change was needed;
  the SSRF control that sits on `page.setRequestInterception` was verified as
  live under the new major, not merely present.
- **A CV can no longer embed another CV's photo.** Uploads all live flat under
  `data/cvs/photos/`, and the containment check accepted any path below it, so
  `photo: "photos/<someone-else>.jpg"` pulled a stranger's picture into your
  export. `/photos/` entries must now belong to the requesting CV, and a request
  that names no CV is refused rather than exempted — omitting the optional field
  was the way through. The relative spelling `photos/<someone-else>.jpg` — the
  form the finding actually names — resolves through a different branch and is
  now checked too, and the comparison is exact rather than a prefix, so the
  owner of `cv` cannot reach `cv.de.jpg`. Only relevant on a deployment serving
  more than one person; the CLI is unaffected, since there the file is your own.
  **This is defence in depth, not a boundary:** the owner is taken from the same
  request body, and uploaded photos are served publicly at `/photos/<slug>.jpg`
  regardless. A deployment with real tenants needs authentication and a
  non-public photo directory. The check also runs after path normalisation now:
  as a prefix test on the raw value it was satisfied by `…/cv.de./../other.jpg`,
  which resolves back inside the photo directory and passed the containment
  guard.
- The published `@codevena/cvmake-templates` package now carries the SIL Open
  Font License 1.1 and the per-family copyright notices it is required to ship
  with the embedded fonts. `FONT-LICENSES.md` was in neither the `files` list
  nor the asset copier, so every `fonts.css` header pointed at a file that was
  not in the tarball. It also no longer claims that every template ships its
  typefaces — three still do not, and they are named.
- Updated Next (16.2.6 → 16.3.4), sharp (0.33.5 → 0.35.4) and `@playwright/test`
  (1.49.0 → 1.63.0). `pnpm audit --prod` drops from 31 advisories to 7 — both
  criticals and 14 of the 18 highs. The remaining seven all arrive through
  Puppeteer 24 (`ws`, `ip-address`, `extract-zip`) and need the major upgrade
  to 25, which is a separate change.

## [0.2.0] — 2026-09-09

The first release since 0.1.0, and mainly a repair one: on 0.1.0 the CLI could
not start at all unless Puppeteer happened to be installed already, which made
the documented quickstart fail on a clean machine.

### Fixed
- **The CLI now starts.** `packages/core` imported Puppeteer statically while
  declaring it as an *optional* peer dependency, so a normal install never
  brought it. Because the CLI entry point loads every command eagerly, this
  killed `--help`, `init`, `validate` and `list-templates` too — commands that
  never open a browser. Puppeteer is now a real dependency of `packages/core`
  and is imported lazily, on the first render.
- **`cvmake build cv.yaml -o cv.yaml` no longer destroys the input.** The
  output path was never compared against the input, so the render overwrote the
  source YAML with PDF bytes and exited 0. Paths are now compared by device and
  inode, which also covers a case-only spelling on a case-insensitive
  filesystem (`-o CV.YAML`), a symlink, and a hard link.

### Added
- `cvmake init` — scaffolds a commented, schema-valid starter `cv.yaml`
  (`--lang de` for German). Present in the repository since May but never
  published; the README documented it against a release that did not have it.
- `cvmake import` — converts an existing [JSON Resume](https://jsonresume.org)
  file into cvmake's YAML schema.
- `scripts/smoke-pack.mjs` — packs the four packages, installs them into an
  empty directory and runs the CLI as a consumer would. Runs in CI on Node 20
  and 22 before any publish. The workspace has Puppeteer as a devDependency, so
  no in-workspace gate can see a missing runtime dependency.

### Security
- Bumped `js-yaml` from 4.1.0 to 4.3.2 in the CLI, core and the web app. 4.1.0
  is affected by CVE-2025-64718 (prototype pollution, fixed in 4.1.1) and two
  denial-of-service advisories (fixed in 4.2.0 and 4.3.0). It is the parser that
  reads user-supplied CV files, so it sits directly in the quickstart path.
- Hardened API routes against demo-mode privilege escalation (audit C1).
- Added Content-Security-Policy, HSTS, and other security headers.
- Bumped Next.js past CVE-2025-66478; bumped Puppeteer to a maintained 24.x release.
- Container now runs as a non-root user.

### Changed
- `puppeteer` moved from an optional peer dependency of `packages/core` to a
  regular dependency. The dynamic `import('puppeteer')` resolves from inside
  that package, so the package has to own the dependency rather than rely on a
  consumer hoisting a copy into place.
- The release workflow publishes tarballs produced by `pnpm pack` via
  `npm publish <tarball>` instead of running `pnpm publish` per directory. Both
  tools are needed: only pnpm rewrites the `workspace:*` protocol, and only npm
  can authenticate via OIDC trusted publishing.

## [0.1.0] — 2026-05-13
### Added
- Initial public release.
- 12 polished CV templates (academic, bauhaus, classic-serif, corporate,
  creative-accent, editorial, magazine, modern-minimal, monochrome-dark, noir,
  swiss, tech-dev).
- Live web editor with YAML editing, palette switching, photo cropping, PDF export.
- CLI: `npx @codevena/cvmake-cli build cv.yaml`.
- Multilingual support (English + German).
- MIT licensed.

[Unreleased]: https://github.com/Codevena/cvmake/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Codevena/cvmake/releases/tag/v0.2.0
[0.1.0]: https://www.npmjs.com/package/@codevena/cvmake-cli/v/0.1.0

<!--
0.1.0 was published to npm by hand and never tagged in git, so there is no
`v0.1.0` ref to compare against — a compare link would 404. It points at the
npm release instead; 0.2.0 is the first version the tagged release workflow
produces.
-->
