import type { CVData } from '@codevena/cvmake-schema';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadYaml } from './download-yaml';

const DATA: CVData = {
  meta: { locale: 'en' },
  personal: { firstName: 'Lena', lastName: 'Bauer', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

describe('downloadYaml', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serializes the data to a text/yaml blob and triggers a download with the correct filename', () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download);
    });

    downloadYaml({ data: DATA, slug: 'cv.en' });

    expect(createUrl).toHaveBeenCalledTimes(1);
    const blob = createUrl.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toContain('yaml');
    expect(clicked).toEqual(['cv.en.yaml']);
    expect(revokeUrl).toHaveBeenCalledWith('blob:fake');
  });
});
