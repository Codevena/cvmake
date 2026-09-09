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

  // A palette that does not exist used to render in the template's default
  // colours and exit 0 — the check existed but guarded only the --palette flag,
  // never the value in the YAML, which is where it actually comes from.
  describe('palette validation', () => {
    async function buildWithPalette(palette: string | undefined, template?: string) {
      const out = await mkdtemp(path.join(tmpdir(), 'forq-cli-pal-'));
      const source = path.resolve('../../data/cvs/example.de.yaml');
      const yaml = await readFile(source, 'utf8');
      // The example already carries a palette line, so replace it rather than
      // adding a second one — duplicate mapping keys make the YAML parser throw
      // before the palette check is ever reached.
      const edited = palette
        ? yaml.replace(/^(\s*)palette:.*$/m, `$1palette: ${palette}`)
        : yaml.replace(/^\s*palette:.*\n/m, '');
      const yamlPath = path.join(path.dirname(source), 'tmp-palette.yaml');
      await writeFile(yamlPath, edited, 'utf8');
      try {
        await runBuild({
          yaml: yamlPath,
          output: path.join(out, 'cv.pdf'),
          ...(template ? { template } : {}),
        });
        return { threw: false as const };
      } catch (err) {
        return { threw: true as const, message: (err as Error).message };
      } finally {
        await rm(yamlPath, { force: true });
        await rm(out, { recursive: true, force: true });
      }
    }

    it('refuses a palette that does not exist, and names the valid ones', async () => {
      const result = await buildWithPalette('tech-dev-default');
      expect(result.threw).toBe(true);
      if (result.threw) {
        expect(result.message).toContain('unknown palette');
        // The origin matters: without it the user hunts for a --palette flag
        // they never typed.
        expect(result.message).toContain('rendering.palette');
        expect(result.message).toContain('tech-ocean');
      }
    });

    it('accepts a palette that exists', async () => {
      expect((await buildWithPalette('tech-ocean')).threw).toBe(false);
    });

    it('accepts a CV without an explicit palette', async () => {
      expect((await buildWithPalette(undefined)).threw).toBe(false);
    });

    // The `--template` override moves the CV to a template with a different
    // palette list. Nothing in the repo exercised that branch before: every
    // call above leaves `template` undefined, so the note path was unguarded
    // and deleting the condition that shapes it changed no test at all.
    it('notes, rather than refuses, a palette the --template override invalidated', async () => {
      // `example.de.yaml` is tech-dev/tech-ocean: the palette is right for the
      // file and wrong only because of the flag. Blaming the file here would
      // send the user hunting through a YAML that is correct.
      expect((await buildWithPalette('tech-ocean', 'modern-minimal')).threw).toBe(false);
    });

    it('still refuses a palette that exists in no template, even with --template', async () => {
      // The guard for the line above: without the `validForOwnTemplate`
      // condition this case is downgraded to the same note, and a CV naming a
      // palette that exists nowhere renders in the wrong colours with exit 0.
      const result = await buildWithPalette('BOGUS-pal', 'modern-minimal');
      expect(result.threw).toBe(true);
      if (result.threw) expect(result.message).toContain('unknown palette');
    });
  });
});
