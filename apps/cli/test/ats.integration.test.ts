import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { shutdownPdfBrowser } from '@codevena/cvmake-core/pdf';
import { afterAll, describe, expect, it } from 'vitest';
import { runBuild } from '../src/commands/build.js';

const require = createRequire(import.meta.url);
type PdfParseFn = (buf: Buffer) => Promise<{ text: string }>;
// Require the inner module directly: pdf-parse's index.js runs a debug branch
// (reads a bundled sample PDF) when it isn't loaded as a child module, which
// throws in the test context. The lib entry is the bare parser.
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as PdfParseFn;

afterAll(() => shutdownPdfBrowser());

// The single-column templates marketed as ATS-friendly (audit.md). An ATS
// parser reads the PDF's text layer, so the foundational requirement is that
// the exported PDF carries real, extractable text (not rasterised glyphs).
const ATS_TEMPLATES = ['classic-serif', 'corporate', 'modern-minimal'];

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
