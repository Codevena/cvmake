#!/usr/bin/env node
// Renders a designed 1200x630 OG card via Puppeteer — replaces the
// resized-from-docs/social-preview placeholder.
//
// Output: apps/showcase/og-card.png + docs/og-card.png
// Used by:
//   - apps/showcase/index.html  <meta og:image> / <meta twitter:image>
//   - apps/web/app/layout.tsx   metadata.openGraph.images[0].url
//
// Run after `pnpm screenshots` so the 4 mini-tile sources exist.

import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
// Use the puppeteer instance that's already known to work on this machine
// (the editor's PDF pipeline). Same Chromium version → same font rendering
// as everything else we render.
const puppeteer = require(path.resolve('packages/core/node_modules/puppeteer'));

// 4 templates with maximum visual variety — same selection as the hero collage
// (classic-serif/swiss/bauhaus/noir) so the OG card and the showcase tell
// the same story.  Read each PNG and embed as base64 data: URL so Puppeteer
// doesn't have to chase file:// references (which get sandboxed in headless).
const MINI_TILE_PATHS = [
  'docs/screenshots/classic-serif.png',
  'docs/screenshots/swiss.png',
  'docs/screenshots/bauhaus.png',
  'docs/screenshots/noir.png',
];

async function dataUrl(file) {
  const buf = await readFile(file);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

const MINI_TILES = await Promise.all(MINI_TILE_PATHS.map(dataUrl));

const HTML = `
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  /* Brand colours match apps/showcase tokens. */
  :root {
    --ink: #0b0f17;
    --ink-soft: #141923;
    --ink-line: #1f2531;
    --parchment: #f5efe6;
    --sand: #d4a574;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @font-face {
    font-family: 'Fraunces';
    src: url('https://fonts.gstatic.com/s/fraunces/v45/6NUu8FuoNvvSwHs0XGSk7VtP1XJ.woff2') format('woff2');
    font-weight: 500;
    font-style: normal;
    font-display: block;
  }
  body {
    width: 1200px;
    height: 630px;
    background: var(--ink);
    color: var(--parchment);
    font-family: 'Inter', system-ui, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 80px;
    position: relative;
    overflow: hidden;
  }
  /* radial sand glow — same vibe as the showcase hero */
  body::before {
    content: '';
    position: absolute;
    top: -180px; left: 50%;
    transform: translateX(-50%);
    width: 900px;
    height: 540px;
    background: radial-gradient(ellipse at center, rgba(212, 165, 116, 0.22), transparent 65%);
    pointer-events: none;
  }
  /* subtle grid backdrop */
  body::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(to right, rgba(245, 239, 230, 0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(245, 239, 230, 0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: rgba(245, 239, 230, 0.7);
    padding: 8px 16px;
    border: 1px solid var(--ink-line);
    border-radius: 999px;
    background: rgba(245, 239, 230, 0.04);
    z-index: 1;
  }
  .badge-dot {
    width: 6px; height: 6px;
    background: var(--sand);
    border-radius: 50%;
  }
  h1 {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 96px;
    font-weight: 500;
    line-height: 0.98;
    letter-spacing: -0.025em;
    text-align: center;
    margin: 20px 0 6px;
    z-index: 1;
  }
  .yaml-line {
    font-family: 'Fraunces', Georgia, serif;
    font-style: italic;
    font-weight: 500;
    font-size: 58px;
    line-height: 1.1;
    color: var(--sand);
    text-align: center;
    margin-bottom: 18px;
    z-index: 1;
  }
  .tagline {
    font-size: 19px;
    line-height: 1.45;
    color: rgba(245, 239, 230, 0.65);
    text-align: center;
    max-width: 680px;
    z-index: 1;
  }
  .mini-row {
    display: flex;
    gap: 18px;
    margin-top: 36px;
    z-index: 1;
  }
  .mini-tile {
    width: 122px;
    height: 172px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(245, 239, 230, 0.12);
    background: var(--ink-soft);
    box-shadow: 0 8px 24px -10px rgba(0, 0, 0, 0.5);
  }
  .mini-tile img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
    display: block;
  }
  .url-row {
    margin-top: 22px;
    font-size: 13px;
    color: rgba(245, 239, 230, 0.45);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    z-index: 1;
  }
</style>
</head>
<body>
  <div class="badge">
    <span class="badge-dot"></span>
    Open source · MIT · 12 templates
  </div>
  <h1>cvmake</h1>
  <div class="yaml-line">YAML in, PDF out</div>
  <p class="tagline">
    One YAML file. Twelve polished templates. A PDF in one command.
    Diff it, version it, fork it — your résumé as code.
  </p>
  <div class="mini-row">
    ${MINI_TILES.map((src) => `<div class="mini-tile"><img src="${src}" alt="" /></div>`).join('')}
  </div>
  <div class="url-row">cvmake.codevena.dev</div>
</body>
</html>
`;

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
});

try {
  const page = await browser.newPage();
  // OG card spec: 1200x630, 1.91:1 — Twitter / LinkedIn / Slack all use this.
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

  await page.setContent(HTML, { waitUntil: 'load' });

  // Wait for fonts (10 s ceiling — Google Fonts can be slow on cold CDN).
  await Promise.race([
    page.evaluate(() => /** @type {any} */ (document).fonts.ready),
    new Promise((r) => setTimeout(r, 10_000)),
  ]);

  const png = await page.screenshot({ type: 'png', omitBackground: false });

  await writeFile('apps/showcase/og-card.png', png);
  await writeFile('docs/og-card.png', png);

  console.log(`✓ apps/showcase/og-card.png  (${(png.length / 1024).toFixed(0)} KB)`);
  console.log(`✓ docs/og-card.png           (${(png.length / 1024).toFixed(0)} KB)`);
} finally {
  await browser.close();
}
