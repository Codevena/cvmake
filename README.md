# cvmake

> fork-friendly OSS CV builder. YAML in, PDF out.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/Codevena/cvmake/actions/workflows/ci.yml/badge.svg)](https://github.com/Codevena/cvmake/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript&logoColor=white)

**→ Live demo: [cvmake.codevena.dev](https://cvmake.codevena.dev)**

---

## Showcase

| | | | |
|---|---|---|---|
| ![academic](docs/screenshots/academic.png)<br/>**academic** | ![bauhaus](docs/screenshots/bauhaus.png)<br/>**bauhaus** | ![classic-serif](docs/screenshots/classic-serif.png)<br/>**classic-serif** | ![corporate](docs/screenshots/corporate.png)<br/>**corporate** |
| ![creative-accent](docs/screenshots/creative-accent.png)<br/>**creative-accent** | ![editorial](docs/screenshots/editorial.png)<br/>**editorial** | ![magazine](docs/screenshots/magazine.png)<br/>**magazine** | ![modern-minimal](docs/screenshots/modern-minimal.png)<br/>**modern-minimal** |
| ![monochrome-dark](docs/screenshots/monochrome-dark.png)<br/>**monochrome-dark** | ![noir](docs/screenshots/noir.png)<br/>**noir** | ![swiss](docs/screenshots/swiss.png)<br/>**swiss** | ![tech-dev](docs/screenshots/tech-dev.png)<br/>**tech-dev** |

## Why cvmake

- **YAML as the source of truth** — your CV is a plain text file you can diff, version, and grep.
- **Multilingual** — author in `cv.de.yaml`, `cv.en.yaml`, etc., switch via CLI flag.
- **12 polished templates** — academic, bauhaus, classic-serif, corporate, creative-accent, editorial, magazine, modern-minimal, monochrome-dark, noir, swiss, tech-dev — each with multiple palettes.
- **CLI + Web UI** — render PDFs from the terminal or edit live in the browser preview.

## Quickstart

```bash
git clone https://github.com/Codevena/cvmake
cd cvmake
pnpm install
pnpm build      # builds the workspace packages once

# Copy the example to your local-only CV (cv.*.yaml is gitignored)
cp data/cvs/example.de.yaml data/cvs/cv.de.yaml

# Render a PDF
pnpm cvmake build data/cvs/cv.de.yaml
```

Output PDF lands in `out/cv.pdf` by default.

## Templates

| ID | Style |
|---|---|
| `academic` | Serif, two-column publication-style layout |
| `bauhaus` | Geometric shapes, primary palette, Futura |
| `classic-serif` | Traditional resume with serif typography |
| `corporate` | Restrained corporate single-column |
| `creative-accent` | Colored accent block, modern sans-serif |
| `editorial` | Magazine-style with strong typography |
| `magazine` | Display serif, italic, two-column body — Vogue-style |
| `modern-minimal` | Minimal, lots of whitespace |
| `monochrome-dark` | Dark theme, high contrast |
| `noir` | Cinematic dark, cream serif, gold accent, prose entries |
| `swiss` | Strict grid, Helvetica, red accent — pure information design |
| `tech-dev` | Developer-focused with code-style accents |

Each template ships with 3+ color palettes. List them all:

```bash
pnpm cvmake list-templates
```

## Tech Stack

- **Monorepo** — pnpm 9 workspaces + Turbo
- **Schema** — Zod
- **Rendering** — React 18 + Puppeteer (headless Chrome → PDF)
- **Web UI** — Next.js 16 (App Router) + Tailwind CSS 4
- **CLI** — Commander 12
- **Testing** — Vitest, Playwright (e2e), visual regression via pixelmatch

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports, template ideas, and pull requests welcome.

## License

MIT — see [LICENSE](LICENSE).
