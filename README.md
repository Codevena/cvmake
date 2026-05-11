# cvmake

> fork-friendly OSS CV builder. YAML in, PDF out.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/Codevena/cvmake/actions/workflows/ci.yml/badge.svg)](https://github.com/Codevena/cvmake/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript&logoColor=white)

**→ Live demo: [cvmake.codevena.dev](https://cvmake.codevena.dev)**

---

## Showcase

<table width="100%">
  <tr>
    <td width="25%" align="center"><img src="docs/screenshots/academic.png" width="200" alt="academic"><br/><b>academic</b></td>
    <td width="25%" align="center"><img src="docs/screenshots/bauhaus.png" width="200" alt="bauhaus"><br/><b>bauhaus</b></td>
    <td width="25%" align="center"><img src="docs/screenshots/classic-serif.png" width="200" alt="classic-serif"><br/><b>classic-serif</b></td>
    <td width="25%" align="center"><img src="docs/screenshots/corporate.png" width="200" alt="corporate"><br/><b>corporate</b></td>
  </tr>
  <tr>
    <td width="25%" align="center"><img src="docs/screenshots/creative-accent.png" width="200" alt="creative-accent"><br/><b>creative-accent</b></td>
    <td width="25%" align="center"><img src="docs/screenshots/editorial.png" width="200" alt="editorial"><br/><b>editorial</b></td>
    <td width="25%" align="center"><img src="docs/screenshots/magazine.png" width="200" alt="magazine"><br/><b>magazine</b></td>
    <td width="25%" align="center"><img src="docs/screenshots/modern-minimal.png" width="200" alt="modern-minimal"><br/><b>modern-minimal</b></td>
  </tr>
  <tr>
    <td width="25%" align="center"><img src="docs/screenshots/monochrome-dark.png" width="200" alt="monochrome-dark"><br/><b>monochrome-dark</b></td>
    <td width="25%" align="center"><img src="docs/screenshots/noir.png" width="200" alt="noir"><br/><b>noir</b></td>
    <td width="25%" align="center"><img src="docs/screenshots/swiss.png" width="200" alt="swiss"><br/><b>swiss</b></td>
    <td width="25%" align="center"><img src="docs/screenshots/tech-dev.png" width="200" alt="tech-dev"><br/><b>tech-dev</b></td>
  </tr>
</table>

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
