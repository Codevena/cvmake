import { bootstrapTemplates } from '@codevena/cvmake-templates';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const VALID_DATA = {
  meta: { locale: 'de', updatedAt: '2026-04-25' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

async function post(body: unknown) {
  const { POST } = await import('./route');
  return POST(
    new Request('http://x/api/export', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('POST /api/export', () => {
  beforeAll(() => bootstrapTemplates());
  afterAll(async () => {
    const pdf = await import('@codevena/cvmake-core/pdf');
    await pdf.shutdownPdfBrowser();
  });

  it('liefert application/pdf mit Content-Disposition', async () => {
    const res = await post({ data: VALID_DATA, templateId: 'classic-serif' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('attachment');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.byteLength).toBeGreaterThan(1000);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  }, 60_000);

  it('Filename enthält slug wenn übergeben (Spec §11)', async () => {
    const res = await post({ data: VALID_DATA, templateId: 'classic-serif', slug: 'cv.de' });
    expect(res.status).toBe(200);
    const cd = res.headers.get('content-disposition') ?? '';
    expect(cd).toContain('cv.de-classic-serif.pdf');
  }, 60_000);

  it('422 bei invaliden Daten', async () => {
    const res = await post({ data: { broken: true }, templateId: 'classic-serif' });
    expect(res.status).toBe(422);
  });

  it('404 bei unbekanntem Template', async () => {
    const res = await post({ data: VALID_DATA, templateId: 'no-such' });
    expect(res.status).toBe(404);
  });
});
