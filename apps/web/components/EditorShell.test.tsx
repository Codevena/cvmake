import type { CVData } from '@codevena/cvmake-schema';
import { bootstrapTemplates } from '@codevena/cvmake-templates';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorShell } from './EditorShell';

bootstrapTemplates();

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

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

describe('<EditorShell /> — leaving a CV with unsaved work', () => {
  beforeEach(() => push.mockClear());

  function mount(props: Partial<Parameters<typeof EditorShell>[0]> = {}) {
    return render(
      <EditorShell
        initialData={DATA}
        initialMtime={1}
        slug="cv.de"
        allSlugs={['cv.de', 'cv.en']}
        bootstrap={BOOTSTRAP as never}
        {...props}
      />,
    );
  }

  function switchCv(target: string) {
    const select = screen.getByLabelText(/CV/i, { selector: 'select' });
    fireEvent.change(select, { target: { value: target } });
  }

  it('switches straight away when nothing is unsaved', () => {
    mount();
    switchCv('cv.en');
    expect(push).toHaveBeenCalled();
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('asks first when there are changes that have not reached the disk', async () => {
    // The guard used to apply in demo mode only, on the assumption that
    // autosave every 2 s made it unnecessary. Inside the debounce window
    // nothing has been sent yet, so the assumption does not hold.
    mount();
    fireEvent.change(screen.getByDisplayValue('M'), { target: { value: 'Changed' } });
    switchCv('cv.en');
    await waitFor(() => expect(screen.getByText('Unsaved changes')).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save and switch' })).toBeInTheDocument();
  });

  it('offers a way to the error instead of a save that cannot succeed', async () => {
    // An invalid form cannot be saved, so "save and switch" would be a button
    // that never completes. The user needs the location of the problem.
    mount();
    fireEvent.change(screen.getByDisplayValue('M'), { target: { value: '' } });
    switchCv('cv.en');
    await waitFor(() => expect(screen.getByText('Unsaved changes')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Go to the error' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save and switch' })).not.toBeInTheDocument();
  });

  it('marks the tab that holds the error, and only that one', async () => {
    // The mapper and the tab strip each have their own test with hand-written
    // input. This is the join between them: without it, deleting the
    // `errorTabs={...}` prop in EditorShell leaves the whole suite green while
    // the feature — "tabs mark the sections that contain errors" — is gone.
    mount();
    fireEvent.change(screen.getByDisplayValue('M'), { target: { value: '' } });
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Personal/ })).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(screen.getByRole('tab', { name: /Education/ })).not.toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('guards the command palette too, not just the selector', async () => {
    // The palette called router.push directly. It is the defect the CHANGELOG
    // names, and no test reached it: reverting the guard left the suite green.
    mount();
    fireEvent.change(screen.getByDisplayValue('M'), { target: { value: 'Changed' } });
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    const item = await screen.findByText('Open CV: cv.en');
    fireEvent.click(item);
    await waitFor(() => expect(screen.getByText('Unsaved changes')).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });
});

describe('<EditorShell /> — a failed export says so from either entry point', () => {
  beforeEach(() => push.mockClear());

  async function failingExport(start: () => Promise<void>) {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ kind: 'client_unverified', reason: 'no-header' }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );
    render(
      <EditorShell
        initialData={DATA}
        initialMtime={1}
        slug="cv.de"
        allSlugs={['cv.de', 'cv.en']}
        bootstrap={BOOTSTRAP as never}
      />,
    );
    // The toolbar button is disabled until the resolver has run once, so both
    // cases have to wait for that — otherwise the click is a no-op and the
    // absent banner would look like a failure of the code under test.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Export PDF/i })).not.toBeDisabled(),
    );
    await start();
    const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
    vi.unstubAllGlobals();
    return alert;
  }

  it('reports it when the export came from the toolbar button', async () => {
    const alert = await failingExport(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Export PDF/i }));
    });
    expect(alert.textContent).toMatch(/identify this request|export failed/i);
  }, 15000);

  it('reports it when the export came from the command palette', async () => {
    // This path had no catch at all: the failure surfaced as an unhandled
    // rejection and nothing appeared on screen. It is also the LESS guarded of
    // the two — the toolbar button is disabled on an invalid form, the command
    // is not — so it can start an export the server will refuse outright.
    const alert = await failingExport(async () => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
      const item = await screen.findByRole('option', { name: /Export PDF/i });
      fireEvent.click(item);
    });
    expect(alert.textContent).toMatch(/identify this request|export failed/i);
  }, 15000);
});

describe('<EditorShell /> — opening a CV that needs repairing', () => {
  beforeEach(() => push.mockClear());

  it('repairs a stale palette without writing the file back', async () => {
    // Merely opening a document must not rewrite it, or viewing a CV would bump
    // its mtime and the CHANGELOG line ("the file itself keeps the stale value
    // until you save") would be false.
    //
    // WHY it holds is worth writing down, because nothing in `useAutosave`
    // decides it. The Sidebar repairs the palette in a CHILD effect, while
    // `EditorShell`'s `useWatch` subscribes in a PARENT effect — React runs
    // child effects first, so the repair reaches react-hook-form's values
    // before the subscription that feeds autosave exists, and never shows up
    // there. Measured directly on react-hook-form 7.53.2: a parent `useWatch`
    // still reports the original value after a child effect calls `setValue`.
    //
    // This is therefore a regression test over an emergent property. Moving the
    // repair into EditorShell, switching it to `useLayoutEffect`, or a
    // react-hook-form release that subscribes during render would each turn the
    // write-back on silently, and this case is what would notice.
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? 'GET'} ${url}`);
        return new Response(JSON.stringify({ mtime: 2 }), { status: 200 });
      }),
    );
    render(
      <EditorShell
        initialData={
          { ...DATA, rendering: { template: 'classic-serif', palette: 'gone-forever' } } as CVData
        }
        initialMtime={1}
        slug="cv.de"
        allSlugs={['cv.de', 'cv.en']}
        bootstrap={BOOTSTRAP as never}
      />,
    );

    // The repair really happened. Note what this does NOT prove: the popover
    // reads through Sidebar's own subscription, the one observer guaranteed to
    // see the repair. It rules out "nothing changed at all", nothing more.
    fireEvent.click(screen.getByLabelText('Palette'));
    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: 'Palette' }).querySelector('[aria-checked="true"]'),
      ).toHaveAttribute('aria-label', 'Classic Grey'),
    );
    fireEvent.keyDown(window, { key: 'Escape' });

    // Past the 2 s debounce, nothing sent...
    await new Promise((r) => setTimeout(r, 2600));
    expect(calls).toEqual([]);

    // ...and the part that actually discriminates: the editor does not regard
    // this as pending work either, so leaving goes straight through.
    fireEvent.change(screen.getByLabelText(/CV/i, { selector: 'select' }), {
      target: { value: 'cv.en' },
    });
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    expect(push).toHaveBeenCalled();
    vi.unstubAllGlobals();
  }, 15000);

  it('control: a real edit is still saved', async () => {
    // The counter-probe for the case above — otherwise "no request" could mean
    // the harness cannot observe a request at all.
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? 'GET'} ${url}`);
        return new Response(JSON.stringify({ mtime: 2 }), { status: 200 });
      }),
    );
    render(
      <EditorShell
        initialData={DATA}
        initialMtime={1}
        slug="cv.de"
        allSlugs={['cv.de', 'cv.en']}
        bootstrap={BOOTSTRAP as never}
      />,
    );
    fireEvent.change(screen.getByDisplayValue('M'), { target: { value: 'Changed' } });
    await waitFor(() => expect(calls).toEqual(['POST /api/save']), { timeout: 5000 });
    vi.unstubAllGlobals();
  }, 15000);
});

describe('<EditorShell /> — switching in demo mode', () => {
  // `demo` is read from NEXT_PUBLIC_DEMO_MODE by isDemoMode(), not passed in.
  beforeEach(() => {
    push.mockClear();
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');
  });
  afterEach(() => vi.unstubAllEnvs());

  function mountDemo() {
    return render(
      <EditorShell
        initialData={DATA}
        initialMtime={1}
        slug="example.de"
        allSlugs={['example.de', 'example.en']}
        bootstrap={BOOTSTRAP as never}
      />,
    );
  }

  it('does not offer a save that demo mode can never perform', async () => {
    // This is the deployed configuration: the Dockerfile sets
    // NEXT_PUBLIC_DEMO_MODE=true and the demo serves two CVs, so switching is
    // the ordinary thing to do. Autosave is permanently paused here, so
    // "Save and switch" called saveNow(), got false, closed the dialog and did
    // nothing whatsoever — no navigation, no message.
    mountDemo();
    fireEvent.change(screen.getByDisplayValue('M'), { target: { value: 'Changed' } });
    const select = screen.getByLabelText(/CV/i, { selector: 'select' });
    fireEvent.change(select, { target: { value: 'example.en' } });
    await waitFor(() => expect(screen.getByText('Unsaved changes')).toBeInTheDocument());
    // Asserting the ABSENCE of "Save and switch" would go quietly vacuous the
    // day someone rewords the label. Pin what the confirm button actually says.
    const buttons = screen
      .getAllByRole('button')
      .map((b) => b.textContent?.trim())
      .filter(Boolean);
    expect(buttons).toContain('Discard and switch');
    expect(buttons).not.toContain('Save and switch');
  });

  it('actually switches when the user discards', async () => {
    mountDemo();
    fireEvent.change(screen.getByDisplayValue('M'), { target: { value: 'Changed' } });
    const select = screen.getByLabelText(/CV/i, { selector: 'select' });
    fireEvent.change(select, { target: { value: 'example.en' } });
    await waitFor(() => expect(screen.getByText('Unsaved changes')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Discard and switch' }));
    await waitFor(() => expect(push).toHaveBeenCalled());
  });
});
