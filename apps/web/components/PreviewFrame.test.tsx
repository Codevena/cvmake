import type { CVData } from '@codevena/forq-schema';
import { bootstrapTemplates } from '@codevena/forq-templates';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PreviewFrame } from './PreviewFrame';

bootstrapTemplates();

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

describe('<PreviewFrame />', () => {
  it('rendert ein iframe mit title="CV Preview"', () => {
    const bootstrap = {
      resetCss: 'body{margin:0}',
      printCss: '@page{size:A4}',
      // biome-ignore lint/suspicious/noExplicitAny: minimal partial bootstrap mock for smoke test
      templates: { 'classic-serif': { css: '.cv{}', meta: { id: 'classic-serif' } as any } },
    };
    render(
      // biome-ignore lint/suspicious/noExplicitAny: minimal partial bootstrap mock for smoke test
      <PreviewFrame data={DATA} bootstrap={bootstrap as any} templateId="classic-serif" />,
    );
    const iframe = screen.getByTitle('CV Preview') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin');
  });
});
