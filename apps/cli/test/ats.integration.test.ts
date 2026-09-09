import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { shutdownPdfBrowser } from '@codevena/cvmake-core/pdf';
import { bootstrapTemplates, listTemplates } from '@codevena/cvmake-templates';
import { afterAll, describe, expect, it } from 'vitest';
import { runBuild } from '../src/commands/build.js';

const require = createRequire(import.meta.url);
type PdfParseFn = (buf: Buffer) => Promise<{ text: string }>;
// Require the inner module directly: pdf-parse's index.js runs a debug branch
// (reads a bundled sample PDF) when it isn't loaded as a child module, which
// throws in the test context. The lib entry is the bare parser.
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as PdfParseFn;

afterAll(() => shutdownPdfBrowser());

// EVERY registered template, taken from the registry rather than a hand-kept
// list. An ATS parser reads the PDF's text layer, so the foundational
// requirement is that the exported PDF carries real, extractable text and not
// rasterised glyphs — and that requirement does not stop at the three templates
// somebody once picked.
//
// It matters more since the fonts were vendored: seven templates now embed
// subsetted woff2, and a bad subset produces a PDF that looks perfect and
// extracts nothing. Deriving the list from the registry means a thirteenth
// template is covered the day it is added, rather than the day someone
// remembers this file.
bootstrapTemplates();
const ATS_TEMPLATES = listTemplates().map((t) => t.meta.id);

const YAML = path.resolve('../../data/cvs/example.en.yaml');
const COMPANIES = ['deliveroo', 'klarna', 'spotify', 'hubspot'];

// Normalise away case + ALL whitespace so the assertions survive PDF text-layer
// quirks (letter-spacing splitting words, text-transform:uppercase, wrapping).
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

describe('ATS: exported PDFs carry a machine-readable text layer', () => {
  for (const template of ATS_TEMPLATES) {
    it(`${template}: candidate name, employers and skills are extractable`, async () => {
      const dir = await mkdtemp(path.join(tmpdir(), `cvmake-ats-${template}-`));
      const pdfPath = path.join(dir, 'cv.pdf');
      try {
        await runBuild({ yaml: YAML, template, output: pdfPath });
        const buf = await readFile(pdfPath);
        expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-');

        const { text } = await pdfParse(buf);
        const n = normalize(text);

        // A real text layer (not an image-only PDF): substantial extractable text.
        expect(n.length).toBeGreaterThan(800);
        // The candidate's surname — the single most important ATS field.
        expect(n).toContain('reyes');
        // A skill from the skills section must be extractable.
        expect(n).toContain('figma');
        // At least two employers must be extractable from the experience section.
        expect(COMPANIES.filter((c) => n.includes(c)).length).toBeGreaterThanOrEqual(2);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }, 60_000);
  }
});
