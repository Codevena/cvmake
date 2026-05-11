#!/usr/bin/env node
// Renders one PNG per template into docs/screenshots/.
// External dep: pdftocairo (poppler-utils). brew install poppler / apt install poppler-utils.

import { execFileSync } from 'node:child_process';
import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const TEMPLATES = [
  { id: 'academic', palette: 'academic-slate' },
  { id: 'bauhaus', palette: 'bauhaus-primary' },
  { id: 'classic-serif', palette: 'classic-grey' },
  { id: 'corporate', palette: 'corporate-graphite' },
  { id: 'creative-accent', palette: 'creative-citrus' },
  { id: 'editorial', palette: 'editorial-paper' },
  { id: 'magazine', palette: 'magazine-sand' },
  { id: 'modern-minimal', palette: 'minimal-ink' },
  { id: 'monochrome-dark', palette: 'mono-carbon' },
  { id: 'noir', palette: 'noir-gold' },
  { id: 'swiss', palette: 'swiss-red' },
  { id: 'tech-dev', palette: 'tech-terminal' },
];

const PDF_DIR = 'dist/screenshots';
const PNG_DIR = 'docs/screenshots';
const YAML = 'data/cvs/example.de.yaml';
const CLI = 'apps/cli/bin/cvmake';

await mkdir(PDF_DIR, { recursive: true });
await mkdir(PNG_DIR, { recursive: true });

try {
  for (const { id, palette } of TEMPLATES) {
    const pdfPath = path.join(PDF_DIR, `${id}.pdf`);
    const pngBase = path.join(PNG_DIR, id); // pdftocairo -singlefile appends .png

    console.log(`\n→ ${id} (${palette})`);

    execFileSync(
      'node',
      [CLI, 'build', YAML, '--template', id, '--palette', palette, '--output', pdfPath],
      { stdio: 'inherit' },
    );

    execFileSync(
      'pdftocairo',
      ['-png', '-r', '150', '-f', '1', '-l', '1', '-singlefile', pdfPath, pngBase],
      { stdio: 'inherit' },
    );

    const info = await stat(`${pngBase}.png`);
    if (info.size < 10_000) {
      throw new Error(`${id}.png suspiciously small (${info.size} bytes)`);
    }
    console.log(`  ✓ ${pngBase}.png  (${(info.size / 1024).toFixed(0)} KB)`);
  }
} finally {
  await rm(PDF_DIR, { recursive: true, force: true });
}
console.log(`\nAll ${TEMPLATES.length} screenshots rendered.`);
