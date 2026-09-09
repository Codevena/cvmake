import { bootstrapTemplates } from '@codevena/cvmake-templates';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * The renderer is not allowed to fetch anything, so the document handed to it
 * has to be self-contained — fonts included.
 *
 * This is worth its own guard because the two paths were split apart: the
 * editor preview now pulls `/template-fonts/<id>.css` over the network (it may;
 * it is a browser), while the export composes its CSS server-side with
 * `loadTemplateCss`. The obvious way to shrink the client payload was to drop
 * the faces from the shared bootstrap object — and the export route used to
 * read its CSS from exactly that object. Doing one without the other produces a
 * PDF in the wrong typeface, with HTTP 200 and no error anywhere.
 */
const generatePDF = vi.fn(async (_html: string) => Buffer.from('%PDF-1.7\n', 'utf8'));
vi.mock('@codevena/cvmake-core/pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@codevena/cvmake-core/pdf')>();
  return { ...actual, generatePDF };
});

let ipCounter = 0;
async function htmlFor(templateId: string): Promise<string> {
  const { POST } = await import('./route');
  generatePDF.mockClear();
  ipCounter += 1;
  const res = await POST(
    new Request('http://x/api/export', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `198.51.100.${ipCounter}`,
      },
      body: JSON.stringify({
        templateId,
        data: {
          meta: { locale: 'de' },
          personal: { firstName: 'M', lastName: 'W', contacts: {} },
          experience: [],
          education: [],
          rendering: { template: templateId },
        },
      }),
    }),
  );
  expect(res.status).toBe(200);
  return String(generatePDF.mock.calls[0]?.[0] ?? '');
}

describe('the exported document embeds its own fonts', () => {
  beforeAll(() => bootstrapTemplates());

  it('tech-dev carries every face as a data: URI', async () => {
    const html = await htmlFor('tech-dev');
    const faces = html.match(/@font-face/g) ?? [];
    const embedded = html.match(/data:font\/woff2;base64,/g) ?? [];
    expect(faces.length).toBeGreaterThan(0);
    expect(embedded.length).toBe(faces.length);
    // No request may be left in the document at all — the renderer would refuse
    // it and the weight would silently vanish from the PDF.
    expect(/url\(\s*['"]?https?:/i.test(html)).toBe(false);
  });

  it('classic-serif ships no faces, which is the known gap and not a failure', async () => {
    // The counter-probe. It keeps the case above honest: if the assertion were
    // satisfied by something global rather than by this template's own
    // fonts.css, this would carry faces too.
    const html = await htmlFor('classic-serif');
    expect(html).not.toContain('@font-face');
  });
});
