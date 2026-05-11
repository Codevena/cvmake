# cvmake-showcase

Static landing page deployed to GitHub Pages on every push to `main` that
touches `apps/showcase/**` or `docs/screenshots/**`.

## Files

- `index.html` — the page itself (Tailwind via Play CDN, no build step)
- `styles.css` — small polish layer on top of Tailwind utilities
- `app.js` — template grid render + lightbox
- `favicon.svg` — inline SVG icon
- `screenshots/` — generated, gitignored. Copies of `docs/screenshots/*.png`

## Local development

```bash
pnpm --filter @codevena/cvmake-showcase dev
```

This syncs the screenshots from `docs/screenshots/` and serves the folder
on `http://localhost:4173`.

## Deployment

`.github/workflows/deploy-showcase.yml` assembles a `dist/` payload
(HTML/CSS/JS/SVG + freshly copied screenshots) and publishes via the
official `actions/deploy-pages` flow. No `gh-pages` branch involved.

The Pages source must be set to **GitHub Actions** in repo settings
(Settings → Pages → Source) for the workflow to publish.
