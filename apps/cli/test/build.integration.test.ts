import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
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

  // The photo is the field the render network policy touches: it may only reach
  // the document as an embedded data URL now. This is the one gate that renders
  // a REAL template through the real path and checks the picture actually
  // arrives — the unit and network tests use synthetic documents, and the
  // visual suite is not part of ./gates.
  it('embeds the local photo, and produces no image without one', async () => {
    const out = await mkdtemp(path.join(tmpdir(), 'forq-cli-photo-'));
    const source = path.resolve('../../data/cvs/example.de.yaml');
    const yaml = await readFile(source, 'utf8');
    expect(yaml).toContain('photo: photos/');

    const withPhoto = path.join(out, 'with.pdf');
    await runBuild({ yaml: source, output: withPhoto });

    // Same CV, photo line removed, rendered from the same directory so the
    // relative photo path would still resolve if it were there.
    // Deliberately NOT named example.*: `.gitignore` ignores data/cvs/*.yaml but
    // re-includes `example.*`, so that name would survive a hard kill as an
    // untracked file sitting next to the real examples.
    const strippedYaml = path.join(path.dirname(source), 'tmp-nophoto.yaml');
    await writeFile(strippedYaml, yaml.replace(/^\s*photo:.*\n/m, ''), 'utf8');
    const withoutPhoto = path.join(out, 'without.pdf');
    try {
      await runBuild({ yaml: strippedYaml, output: withoutPhoto });
    } finally {
      await rm(strippedYaml, { force: true });
    }

    const countImages = (b: Buffer) => b.toString('latin1').split('/Subtype /Image').length - 1;
    const withCount = countImages(await readFile(withPhoto));
    const withoutCount = countImages(await readFile(withoutPhoto));

    // The photo is 800px wide; a broken-image placeholder is 14px. Asserting
    // the WIDTH rather than a count is what makes this robust: under
    // `img-src 'none'` the photo disappears but Chromium draws two placeholder
    // images, so the count goes UP (measured: 3 vs 1) and any "count is
    // greater" formulation would pass while the picture is gone.
    const withBuf = await readFile(withPhoto);
    expect(withBuf.toString('latin1')).toContain('/Width 800');
    expect((await readFile(withoutPhoto)).toString('latin1')).not.toContain('/Width 800');
    // And the delta, which pins that the photo is what adds the object.
    expect(withCount).toBe(withoutCount + 1);

    await rm(out, { recursive: true });
  });
});
