import type { CVData } from '@codevena/cvmake-schema';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportPdf } from './export-pdf';

const DATA: CVData = {
  meta: { locale: 'en' },
  personal: { firstName: 'Lena', lastName: 'Bauer', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

describe('exportPdf', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs to /api/export with the correct body and triggers anchor download', async () => {
    const fakeBlob = new Blob(['%PDF-fake'], { type: 'application/pdf' });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(fakeBlob, { status: 200 }));
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-pdf');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download);
    });

    await exportPdf({ data: DATA, slug: 'cv.en' });

    // Correct endpoint
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/export');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'content-type': 'application/json' });

    // Body contains the right shape
    const body = JSON.parse(init.body as string);
    expect(body.slug).toBe('cv.en');
    expect(body.templateId).toBe('classic-serif');
    expect(body.data).toMatchObject({ meta: { locale: 'en' } });

    // Blob URL created and released
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(revokeUrl).toHaveBeenCalledWith('blob:fake-pdf');

    // Anchor download triggered with correct filename
    expect(clicked).toEqual(['cv.en-classic-serif.pdf']);
  });

  it('throws when the server returns a non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

    await expect(exportPdf({ data: DATA, slug: 'cv.en' })).rejects.toThrow('HTTP 500');
  });
});
