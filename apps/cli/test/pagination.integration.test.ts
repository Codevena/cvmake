import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { shutdownPdfBrowser } from '@codevena/cvmake-core/pdf';
import { afterAll, describe, expect, it } from 'vitest';
import { runBuild } from '../src/commands/build.js';

const require = createRequire(import.meta.url);
type PdfParseFn = (b: Buffer) => Promise<{ text: string; numpages: number }>;
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as PdfParseFn;

afterAll(() => shutdownPdfBrowser());

// A deliberately long fixture that spans >1 page on any platform, so the
// page-break spacer-injection pass in packages/core/src/pdf.ts (the most
// complex, formerly untested code) actually runs. This is a regression guard
// against that pass crashing or collapsing a multi-page CV to one page /
// dropping later content — it does not assert exact spacer placement.
const YAML = path.join(import.meta.dirname, 'fixtures', 'multipage.en.yaml');

describe('pagination: multi-page CVs render through the spacer-injection pass', () => {
  // one two-column (sidebar) template and one single-column template — both go
  // through generatePDF's pagination logic.
  for (const template of ['classic-serif', 'modern-minimal']) {
    it(`${template}: produces a valid multi-page PDF without dropping late content`, async () => {
      const dir = await mkdtemp(path.join(tmpdir(), `cvmake-page-${template}-`));
      const pdfPath = path.join(dir, 'cv.pdf');
      try {
        await runBuild({ yaml: YAML, template, output: pdfPath });
        const buf = await readFile(pdfPath);
        expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-');

        const { text, numpages } = await pdfParse(buf);
        // The pagination pass ran and produced more than one page.
        expect(numpages).toBeGreaterThanOrEqual(2);
        const n = text.toLowerCase().replace(/\s+/g, '');
        // Content from the start AND the end survives the page-break injection.
        expect(n).toContain('orbitalsystems'); // first employer
        expect(n).toContain('universityofleipzig'); // last education entry
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }, 60_000);
  }
});
