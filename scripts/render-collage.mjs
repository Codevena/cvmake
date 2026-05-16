#!/usr/bin/env node
// Renders a 2x2 collage of 4 visually-distinct templates rendered from the
// SAME YAML content — the "same content, four templates" hero asset
// recommended by the marketing audit.  Output: docs/collage-4templates.png
// (used by README + Showcase + Tweet 1).
//
// External dep: pdftocairo (poppler-utils). Same as render-screenshots.mjs.

import { execFileSync } from 'node:child_process';
import { mkdir, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
// Use the sharp instance from packages/core's node_modules — sharp is platform-
// specific so we want the binary that's already known to work on this machine.
const sharp = require(path.resolve('packages/core/node_modules/sharp'));

// Four templates chosen for maximum visual variety:
// - classic-serif: traditional serif on parchment
// - swiss: strict grid, red accent, sans-serif (international design)
// - bauhaus: geometric, primary palette, joyful
// - noir: cinematic black canvas + gold accent
const TEMPLATES = [
  { id: 'classic-serif', palette: 'classic-grey' },
  { id: 'swiss', palette: 'swiss-red' },
  { id: 'bauhaus', palette: 'bauhaus-primary' },
  { id: 'noir', palette: 'noir-gold' },
];

const PDF_DIR = 'dist/collage';
const OUT_PATH = 'docs/collage-4templates.png';
const SHOWCASE_PATH = 'apps/showcase/collage-4templates.png';
const YAML = 'data/cvs/example.en.yaml';
const CLI = 'apps/cli/bin/cvmake';

// Render at 150 dpi (A4 portrait → 1242x1754) then sharp-resize to tile size.
const RENDER_DPI = 150;
// Final composite layout
const TILE_W = 600;
const TILE_H = 848; // preserves A4 aspect
const GAP = 24;
const PAD = 40;
const BG = '#0b0f17'; // ink — matches showcase palette
const CANVAS_W = PAD * 2 + TILE_W * 2 + GAP;
const CANVAS_H = PAD * 2 + TILE_H * 2 + GAP;

await mkdir(PDF_DIR, { recursive: true });
await mkdir(path.dirname(OUT_PATH), { recursive: true });
await mkdir(path.dirname(SHOWCASE_PATH), { recursive: true });

const tiles = [];

try {
  for (const { id, palette } of TEMPLATES) {
    const pdfPath = path.join(PDF_DIR, `${id}.pdf`);
    const pngBase = path.join(PDF_DIR, id);

    console.log(`\n→ ${id} (${palette})`);

    execFileSync(
      'node',
      [CLI, 'build', YAML, '--template', id, '--palette', palette, '--output', pdfPath],
      { stdio: 'inherit' },
    );

    execFileSync(
      'pdftocairo',
      ['-png', '-r', String(RENDER_DPI), '-f', '1', '-l', '1', '-singlefile', pdfPath, pngBase],
      { stdio: 'inherit' },
    );

    const pngPath = `${pngBase}.png`;
    const info = await stat(pngPath);
    if (info.size < 10_000) {
      throw new Error(`${id}.png suspiciously small (${info.size} bytes)`);
    }
    console.log(`  ✓ rendered ${(info.size / 1024).toFixed(0)} KB`);
    tiles.push({ id, path: pngPath });
  }

  // Resize each tile to TILE_W x TILE_H so the composite layout is deterministic.
  console.log('\n→ resizing tiles + compositing...');
  const resized = await Promise.all(
    tiles.map(async ({ path: p }) =>
      sharp(p).resize(TILE_W, TILE_H, { fit: 'cover', position: 'top' }).png().toBuffer(),
    ),
  );

  // 2x2 grid layout (top-left, top-right, bottom-left, bottom-right):
  const positions = [
    { left: PAD, top: PAD },
    { left: PAD + TILE_W + GAP, top: PAD },
    { left: PAD, top: PAD + TILE_H + GAP },
    { left: PAD + TILE_W + GAP, top: PAD + TILE_H + GAP },
  ];

  await sharp({
    create: {
      width: CANVAS_W,
      height: CANVAS_H,
      channels: 4,
      background: BG,
    },
  })
    .composite(
      resized.map((input, i) => ({
        input,
        left: positions[i].left,
        top: positions[i].top,
      })),
    )
    .png()
    .toFile(OUT_PATH);

  const outInfo = await stat(OUT_PATH);
  console.log(
    `\n  ✓ docs/collage-4templates.png  ${CANVAS_W}×${CANVAS_H}  (${(outInfo.size / 1024).toFixed(0)} KB)`,
  );

  // Mirror into showcase so the static site can ship it.
  await sharp(OUT_PATH).toFile(SHOWCASE_PATH);
  console.log(`  ✓ ${SHOWCASE_PATH}  (mirrored for showcase)`);
} finally {
  await rm(PDF_DIR, { recursive: true, force: true });
}

console.log(`\nDone. ${TEMPLATES.map((t) => t.id).join(', ')} composited from ${YAML}.`);
