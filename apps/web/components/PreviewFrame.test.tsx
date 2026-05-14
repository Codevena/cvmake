import type { CVData } from '@codevena/cvmake-schema';
import { bootstrapTemplates } from '@codevena/cvmake-templates';
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
  const bootstrap = {
    resetCss: 'body{margin:0}',
    printCss: '@page{size:A4}',
    // biome-ignore lint/suspicious/noExplicitAny: minimal partial bootstrap mock for smoke test
    templates: { 'classic-serif': { css: '.cv{}', meta: { id: 'classic-serif' } as any } },
  };

  it('rendert ein iframe mit title="CV Preview"', () => {
    render(
      // biome-ignore lint/suspicious/noExplicitAny: minimal partial bootstrap mock for smoke test
      <PreviewFrame data={DATA} bootstrap={bootstrap as any} templateId="classic-serif" />,
    );
    const iframe = screen.getByTitle('CV Preview') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin');
  });

  it('zeigt das Rendering-Overlay wenn rendering=true', () => {
    render(
      // biome-ignore lint/suspicious/noExplicitAny: minimal partial bootstrap mock for smoke test
      <PreviewFrame data={DATA} bootstrap={bootstrap as any} templateId="classic-serif" rendering />,
    );
    expect(screen.getByTestId('preview-rendering')).toBeInTheDocument();
  });

  it('zeigt kein Rendering-Overlay wenn rendering nicht gesetzt ist', () => {
    render(
      // biome-ignore lint/suspicious/noExplicitAny: minimal partial bootstrap mock for smoke test
      <PreviewFrame data={DATA} bootstrap={bootstrap as any} templateId="classic-serif" />,
    );
    expect(screen.queryByTestId('preview-rendering')).not.toBeInTheDocument();
  });

  it('zeigt kein Rendering-Overlay wenn rendering=false', () => {
    render(
      // biome-ignore lint/suspicious/noExplicitAny: minimal partial bootstrap mock for smoke test
      <PreviewFrame data={DATA} bootstrap={bootstrap as any} templateId="classic-serif" rendering={false} />,
    );
    expect(screen.queryByTestId('preview-rendering')).not.toBeInTheDocument();
  });
});
