import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { shutdownPdfBrowser } from '@codevena/cvmake-core/pdf';
import { afterAll, describe, expect, it } from 'vitest';
import { runBuild } from '../src/commands/build.js';

afterAll(() => shutdownPdfBrowser());

const require = createRequire(import.meta.url);

describe('runBuild integration', () => {
  it('erzeugt PDF mit erwarteten Strings', async () => {
    const out = await mkdtemp(path.join(tmpdir(), 'forq-cli-'));
    const pdfPath = path.join(out, 'cv.pdf');
    await runBuild({
      yaml: path.resolve('../../data/cvs/example.de.yaml'),
      output: pdfPath,
    });

    const buf = await readFile(pdfPath);

    // Verify it is a real PDF
    const header = buf.slice(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');

    const fileInfo = await stat(pdfPath);
    expect(fileInfo.size).toBeGreaterThan(20_000);

    // Parse the PDF's text layer (machine-readable text, not rasterised glyphs).
    // Use the lib entry so pdf-parse's index.js debug branch (which reads a
    // bundled sample PDF) doesn't run; normalise to survive text-layer quirks.
    type PdfParseFn = (b: Buffer) => Promise<{ text: string }>;
    const pdfParse = require('pdf-parse/lib/pdf-parse.js') as PdfParseFn;
    const parsed = await pdfParse(buf);
    const n = parsed.text.toLowerCase().replace(/\s+/g, '');
    expect(n).toContain('lenabauer');
    expect(n).toContain('berufserfahrung');

    await rm(out, { recursive: true });
  });
});
