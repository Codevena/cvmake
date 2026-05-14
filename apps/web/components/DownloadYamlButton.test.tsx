import type { CVData } from '@codevena/cvmake-schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DownloadYamlButton } from './DownloadYamlButton';

const DATA: CVData = {
  meta: { locale: 'en' },
  personal: { firstName: 'Lena', lastName: 'Bauer', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

describe('DownloadYamlButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serializes the data to a YAML blob and triggers a download', () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download);
    });

    render(<DownloadYamlButton getData={() => DATA} slug="cv.en" />);
    fireEvent.click(screen.getByRole('button', { name: /download yaml/i }));

    expect(createUrl).toHaveBeenCalledTimes(1);
    const blob = createUrl.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toContain('yaml');
    expect(clicked).toEqual(['cv.en.yaml']);
    expect(revokeUrl).toHaveBeenCalledWith('blob:fake');
  });
});
