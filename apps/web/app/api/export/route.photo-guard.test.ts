import { bootstrapTemplates } from '@codevena/cvmake-templates';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Lives in its own file on purpose. `vi.mock` is hoisted and applies to the
 * whole module graph of a file, so putting these cases into route.test.ts —
 * which renders two real PDFs — would replace the renderer there as well.
 *
 * What is under test is the ORDER of the guard, not the renderer: a payload the
 * schema refuses must never reach Chromium. Mocking the renderer is what makes
 * "was not called" observable at all.
 */
const generatePDF = vi.fn(async (_html: string) => Buffer.from('%PDF-1.7\n', 'utf8'));

vi.mock('@codevena/cvmake-core/pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@codevena/cvmake-core/pdf')>();
  return { ...actual, generatePDF };
});

const BASE = {
  meta: { locale: 'de', updatedAt: '2026-09-09' },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

function withPhoto(photo?: string) {
  return {
    ...BASE,
    personal: {
      firstName: 'M',
      lastName: 'W',
      contacts: {},
      ...(photo === undefined ? {} : { photo }),
    },
  };
}

/** A distinct client IP per call: the route rate-limits 5 requests per minute. */
let ipCounter = 0;
async function post(data: unknown) {
  const { POST } = await import('./route');
  ipCounter += 1;
  return POST(
    new Request('http://x/api/export', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `198.51.100.${ipCounter}`,
      },
      body: JSON.stringify({ data, templateId: 'classic-serif' }),
    }),
  );
}

describe('POST /api/export — photo guard', () => {
  beforeAll(() => bootstrapTemplates());

  it('refuses a remote photo with 422 and never starts a render', async () => {
    generatePDF.mockClear();
    const res = await post(withPhoto('http://169.254.169.254/latest/meta-data/x.jpg'));
    expect(res.status).toBe(422);
    // The whole point of validating before rendering: a rejected request must
    // not launch a browser, open a socket, or produce any other side effect.
    expect(generatePDF).not.toHaveBeenCalled();
  });

  it('refuses a control-character smuggled scheme with 422', async () => {
    generatePDF.mockClear();
    const res = await post(withPhoto('ht\ttp://169.254.169.254/x.jpg'));
    expect(res.status).toBe(422);
    expect(generatePDF).not.toHaveBeenCalled();
  });

  it('still exports when the photo was removed in the editor', async () => {
    // The counter-probe, and the reason it exists: the editor writes photo: ""
    // when a user clicks Remove. A guard that refuses it would 422 the export
    // and break the autosave loop for everyone without a picture — a
    // regression no other test in the suite would notice.
    generatePDF.mockClear();
    const res = await post(withPhoto(''));
    expect(res.status).toBe(200);
    expect(generatePDF).toHaveBeenCalledTimes(1);
  });

  it('still exports when there is no photo key at all', async () => {
    generatePDF.mockClear();
    const res = await post(withPhoto(undefined));
    expect(res.status).toBe(200);
    expect(generatePDF).toHaveBeenCalledTimes(1);
  });

  it('still exports a local photo path', async () => {
    generatePDF.mockClear();
    const res = await post(withPhoto('photos/example-lena.webp'));
    expect(res.status).toBe(200);
    expect(generatePDF).toHaveBeenCalledTimes(1);
  });

  it('does not embed another CV photo when the request omits its slug', async () => {
    // `slug` is optional on this endpoint outside demo mode, so "no slug means
    // no restriction" would leave the cross-tenant read open to exactly the
    // request that leaves it out. The route must refuse instead.
    generatePDF.mockClear();
    const res = await post(withPhoto('/photos/someone-else.jpg'));
    expect(res.status).toBe(200);
    // The render still happens — the photo is simply not in it.
    expect(generatePDF).toHaveBeenCalledTimes(1);
    const html = String(generatePDF.mock.calls[0]?.[0] ?? '');
    expect(html).not.toContain('someone-else');
  });
});
