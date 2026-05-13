# cvmake-showcase

Static landing page deployed to GitHub Pages on every push to `main` that
touches `apps/showcase/**` or `docs/screenshots/**`.

## Files

- `index.html` — the page itself
- `src/input.css` — Tailwind v4 entry; theme tokens live here
- `tailwind.css` — generated, gitignored. Built from `src/input.css`
- `styles.css` — small polish layer on top of Tailwind utilities
- `app.js` — template grid render + lightbox
- `favicon.svg` — inline SVG icon
- `screenshots/` — generated, gitignored. Copies of `docs/screenshots/*.png`

## Local development

```bash
pnpm --filter @codevena/cvmake-showcase dev
```

This syncs the screenshots from `docs/screenshots/`, builds `tailwind.css`
from `src/input.css`, and serves the folder on `http://localhost:4173`.

To rebuild only the CSS:

```bash
pnpm --filter @codevena/cvmake-showcase build:css
```

## Deployment

`.github/workflows/deploy-showcase.yml` installs dependencies, runs the
showcase build (sync screenshots + build Tailwind), assembles a `dist/`
payload (HTML/CSS/JS/SVG + screenshots), and publishes via the official
`actions/deploy-pages` flow. No `gh-pages` branch involved.

The Pages source must be set to **GitHub Actions** in repo settings
(Settings → Pages → Source) for the workflow to publish.
