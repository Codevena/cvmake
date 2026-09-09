# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
