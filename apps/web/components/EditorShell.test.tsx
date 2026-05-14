import type { CVData } from '@codevena/cvmake-schema';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditorShell } from './EditorShell';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

const BOOTSTRAP = {
  resetCss: '/* reset */',
  printCss: '/* print */',
  templates: {
    'classic-serif': {
      css: '/* tpl */',
      meta: {
        id: 'classic-serif',
        name: 'Classic Serif',
        description: '',
        supportsPhoto: true,
        photoFallback: 'initials' as const,
        supportedLocales: ['de', 'en'] as const,
        defaultSectionOrder: ['experience'],
        supportsPagination: true,
      },
    },
  },
};

describe('<EditorShell />', () => {
  it('rendert TopBar + Sidebar + FormPanel + PreviewFrame Slots', () => {
    render(
      <EditorShell
        initialData={DATA}
        initialMtime={1}
        slug="cv.de"
        allSlugs={['cv.de']}
        // biome-ignore lint/suspicious/noExplicitAny: smoke-test partial bootstrap mock
        bootstrap={BOOTSTRAP as any}
      />,
    );
    expect(screen.getByRole('banner')).toBeInTheDocument(); // TopBar
    expect(screen.getByRole('complementary')).toBeInTheDocument(); // Sidebar
    expect(screen.getByRole('form')).toBeInTheDocument();
    expect(screen.getByTitle('CV Preview')).toBeInTheDocument();
  });

  it('renders the active tab section (personal by default)', () => {
    render(
      <EditorShell
        initialData={DATA}
        initialMtime={1}
        slug="cv.de"
        allSlugs={['cv.de']}
        // biome-ignore lint/suspicious/noExplicitAny: smoke-test partial bootstrap mock
        bootstrap={BOOTSTRAP as any}
      />,
    );
    // TabNav should be present
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    // The 'personal' tab should be selected by default
    expect(screen.getByRole('tab', { name: /personal/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders demo banner and hides SaveIndicator in demo mode', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');
    render(
      <EditorShell
        initialData={DATA}
        initialMtime={1}
        slug="example.en"
        allSlugs={['example.en']}
        // biome-ignore lint/suspicious/noExplicitAny: smoke-test partial bootstrap mock
        bootstrap={BOOTSTRAP as any}
      />,
    );
    // Demo banner should be present
    expect(screen.getByText(/demo mode — edits are not saved/i)).toBeInTheDocument();
    // SaveIndicator should not be present in demo mode
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });
});
