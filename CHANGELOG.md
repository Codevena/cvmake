# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Security
- Hardened API routes against demo-mode privilege escalation (audit C1).
- Added Content-Security-Policy, HSTS, and other security headers.
- Bumped Next.js past CVE-2025-66478; bumped Puppeteer to a maintained 24.x release.
- Container now runs as a non-root user.

## [0.1.0] — 2026-05-XX
### Added
- Initial public release.
- 12 polished CV templates (academic, bauhaus, brutalist, classic-serif, corporate, creative-accent, editorial, magazine, modern-minimal, monochrome-dark, noir, swiss).
- Live web editor with YAML editing, palette switching, photo cropping, PDF export.
- CLI: `npx @codevena/cvmake-cli build cv.yaml`.
- Multilingual support (English + German).
- MIT licensed.

[Unreleased]: https://github.com/Codevena/cvmake/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Codevena/cvmake/releases/tag/v0.1.0
