import type { PreviewBootstrap } from '@/lib/preview-bootstrap';
import type { CVData } from '@codevena/cvmake-schema';
import { bootstrapTemplates } from '@codevena/cvmake-templates';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

bootstrapTemplates();

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

// biome-ignore lint/suspicious/noExplicitAny: smoke-test partial bootstrap mock
const BOOTSTRAP = { resetCss: '', printCss: '', templates: {} } as any as PreviewBootstrap;

function Wrap() {
  const form = useForm<CVData>({ defaultValues: DATA });
  return (
    <FormProvider {...form}>
      <Sidebar bootstrap={BOOTSTRAP} />
    </FormProvider>
  );
}

describe('<Sidebar />', () => {
  it('renders three popover triggers in the icon rail', () => {
    render(<Wrap />);
    expect(screen.getByLabelText('Template')).toBeInTheDocument();
    expect(screen.getByLabelText('Palette')).toBeInTheDocument();
    expect(screen.getByLabelText('Sections')).toBeInTheDocument();
  });

  it('opens the Template popover and shows the template radiogroup', () => {
    render(<Wrap />);
    fireEvent.click(screen.getByLabelText('Template'));
    expect(screen.getByRole('radiogroup', { name: 'Template' })).toBeInTheDocument();
  });

  it('opens the Palette popover and shows the PaletteSelector', () => {
    render(<Wrap />);
    fireEvent.click(screen.getByLabelText('Palette'));
    // The palette popover dialog should be present
    expect(screen.getByRole('dialog', { name: 'Palette' })).toBeInTheDocument();
  });

  it('opens the Sections popover and shows the HiddenSectionsToggles dialog', () => {
    render(<Wrap />);
    fireEvent.click(screen.getByLabelText('Sections'));
    expect(screen.getByRole('dialog', { name: 'Sections' })).toBeInTheDocument();
  });

  // A stored CV whose palette no longer exists used to keep that value: the
  // repair ran only on a template SWITCH, so the file went on rendering in the
  // template's default colours with HTTP 200 and exit 0 — the case the check
  // exists for. It must not mark the form dirty, or the unsaved-changes guard
  // reports pending work the user never created.
  describe('palette repair on first render', () => {
    /**
     * Observes the `setValue` CALL rather than its effect on `dirtyFields`.
     *
     * Not the first choice in general — asserting on a call is weaker than
     * asserting on a result — but here the thing under test IS the flag on that
     * call, and the effect turned out to be observable only through an
     * arrangement that two obvious formulations already got wrong:
     *
     *  - `formState.isDirty` read off the form object: never fails. `formState`
     *    is a Proxy that tracks a field only when a component reads it DURING
     *    render, and `useForm` hands back the state of its last render, which
     *    nothing refreshes after the repair.
     *  - `isDirty` is the wrong quantity anyway: `rendering.palette` is not a
     *    registered input, so it stays false either way. Only
     *    `rendering.template` is registered, being a radio.
     *  - a subscribed `dirtyFields` readout mounted AFTER <Sidebar/>: also never
     *    fails, because sibling effects run in tree order and the repair fires
     *    before the readout has subscribed.
     *
     * `renderHook` builds the form outside the tree, so the spy is installed
     * before any effect runs and no ordering carries meaning.
     */
    function mountWith(palette?: string) {
      const { result } = renderHook(() =>
        useForm<CVData>({
          defaultValues: {
            ...DATA,
            rendering: { ...DATA.rendering, ...(palette ? { palette } : {}) },
          },
        }),
      );
      const form = result.current;
      const setValue = vi.spyOn(form, 'setValue');
      render(
        <FormProvider {...form}>
          <Sidebar bootstrap={BOOTSTRAP} />
        </FormProvider>,
      );
      return { form, setValue };
    }

    it('heals a palette that does not exist, and does not dirty the form', async () => {
      const { form, setValue } = mountWith('classic-serif-default');
      await waitFor(() => {
        expect(form.getValues('rendering.palette')).toBe('classic-grey');
      });
      // `shouldDirty: false` is the whole point: the user did not do this, and
      // the unsaved-changes guard would otherwise report work they never made.
      expect(setValue).toHaveBeenCalledWith('rendering.palette', 'classic-grey', {
        shouldDirty: false,
      });
    });

    it('leaves a valid palette alone', async () => {
      const { form, setValue } = mountWith('classic-navy');
      await waitFor(() => expect(form.getValues('rendering.template')).toBe('classic-serif'));
      expect(form.getValues('rendering.palette')).toBe('classic-navy');
      // Stricter than "the value is unchanged": it also catches a redundant
      // no-op write, which would be invisible in the value and would still mark
      // the form dirty on the switch path.
      expect(setValue).not.toHaveBeenCalled();
    });

    it('does not invent a palette for a CV that has none', async () => {
      // Only a value that is PRESENT and invalid is healed. Writing one here
      // would add a field the file never had.
      const { form, setValue } = mountWith(undefined);
      await waitFor(() => expect(form.getValues('rendering.template')).toBe('classic-serif'));
      expect(form.getValues('rendering.palette')).toBeUndefined();
      expect(setValue).not.toHaveBeenCalled();
    });
  });
});
