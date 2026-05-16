#!/usr/bin/env node
// Generates .webp and .avif variants of every PNG in:
//   - docs/screenshots/    (the 12 template thumbnails)
//   - docs/                (the 4-template hero collage)
//
// Sharp negotiates the format the browser actually picks via <picture> with
// source ordering avif → webp → png. Average byte savings vs PNG:
//   - WebP ~60% smaller (lossy q=85, near-visually-lossless)
//   - AVIF ~80% smaller (lossy q=70, effort=4 — slower encode, fine for build-time)
//
// Run after `pnpm screenshots` (or `node scripts/render-collage.mjs`) — the
// PNGs are the source of truth and these are derived assets.

import { readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require(path.resolve('packages/core/node_modules/sharp'));

// Quality knobs — picked to be near-visually-lossless without exploding file
// size. Bumped from defaults because CV thumbnails have fine serif typography
// that gets crunchy if you go below ~80 on WebP / ~65 on AVIF.
const WEBP_QUALITY = 85;
const AVIF_QUALITY = 70;
const AVIF_EFFORT = 4; // 0=fast/large, 9=slow/small. 4 is a reasonable middle.

const TARGETS = [
  { dir: 'docs/screenshots', pattern: /\.png$/ },
  { dir: 'docs', pattern: /^collage-.*\.png$/ },
];

const ResetANSI = '\x1b[0m';
const Cyan = '\x1b[36m';
const Green = '\x1b[32m';
const Dim = '\x1b[2m';

let totalSavedPng = 0;
let totalWebp = 0;
let totalAvif = 0;
let processed = 0;

for (const { dir, pattern } of TARGETS) {
  const entries = await readdir(dir);
  const inputs = entries.filter((f) => pattern.test(f));
  if (inputs.length === 0) continue;

  console.log(`\n${Cyan}${dir}/${ResetANSI}  ${inputs.length} file(s)`);

  for (const file of inputs) {
    const src = path.join(dir, file);
    const base = path.join(dir, file.replace(/\.png$/, ''));
    const webpPath = `${base}.webp`;
    const avifPath = `${base}.avif`;

    const srcSize = (await stat(src)).size;

    // WebP — fast encode, broad support (Safari 14+).
    await sharp(src).webp({ quality: WEBP_QUALITY }).toFile(webpPath);
    const webpSize = (await stat(webpPath)).size;

    // AVIF — slower encode, best compression (Safari 16.4+, all modern browsers).
    await sharp(src).avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT }).toFile(avifPath);
    const avifSize = (await stat(avifPath)).size;

    totalSavedPng += srcSize;
    totalWebp += webpSize;
    totalAvif += avifSize;
    processed += 1;

    const webpPct = (((srcSize - webpSize) / srcSize) * 100).toFixed(0);
    const avifPct = (((srcSize - avifSize) / srcSize) * 100).toFixed(0);
    console.log(
      `  ${Green}✓${ResetANSI} ${file.padEnd(28)} ${Dim}${(srcSize / 1024).toFixed(0).padStart(4)} KB → ${ResetANSI}` +
        `webp ${(webpSize / 1024).toFixed(0).padStart(3)} KB (${webpPct}% less)  ` +
        `avif ${(avifSize / 1024).toFixed(0).padStart(3)} KB (${avifPct}% less)`,
    );
  }
}

const pngMB = (totalSavedPng / 1024 / 1024).toFixed(2);
const webpMB = (totalWebp / 1024 / 1024).toFixed(2);
const avifMB = (totalAvif / 1024 / 1024).toFixed(2);
const webpSavePct = (((totalSavedPng - totalWebp) / totalSavedPng) * 100).toFixed(0);
const avifSavePct = (((totalSavedPng - totalAvif) / totalSavedPng) * 100).toFixed(0);

console.log(`\n${Cyan}Summary${ResetANSI}`);
console.log(`  ${processed} file(s)`);
console.log(`  png:  ${pngMB.padStart(5)} MB  (baseline)`);
console.log(`  webp: ${webpMB.padStart(5)} MB  (${webpSavePct}% smaller)`);
console.log(`  avif: ${avifMB.padStart(5)} MB  (${avifSavePct}% smaller)`);
