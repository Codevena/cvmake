import { type CVData, CVDataSchema } from '@codevena/cvmake-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm, useFormState } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { SkillsSection } from './SkillsSection';

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

describe('<SkillsSection />', () => {
  it('has tab buttons List/Categories', () => {
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA, shouldUnregister: false });
      return (
        <FormProvider {...form}>
          <SkillsSection />
        </FormProvider>
      );
    }
    render(<Wrap />);
    expect(screen.getByRole('button', { name: /List/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Categories/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Categories/ }));
    expect(screen.getByRole('button', { name: /Add category/ })).toBeInTheDocument();
  });

  it('renames a category only on blur (stable key while typing, no per-keystroke commit)', () => {
    function Wrap() {
      const form = useForm<CVData>({
        defaultValues: { ...DATA, skills: { categorized: { Frontend: ['React'] } } },
        shouldUnregister: false,
      });
      return (
        <FormProvider {...form}>
          <SkillsSection />
        </FormProvider>
      );
    }
    render(<Wrap />);
    // The categorized tab is auto-selected because a category already exists.
    const input = screen.getByDisplayValue('Frontend');
    fireEvent.change(input, { target: { value: 'Backend' } });
    // Not committed yet — the rename must wait for blur, so the items group
    // is still keyed/labelled by the OLD name (old code committed immediately).
    expect(screen.getByLabelText('Frontend Items')).toBeInTheDocument();
    expect(screen.queryByLabelText('Backend Items')).not.toBeInTheDocument();
    // Commit on blur
    fireEvent.blur(input);
    expect(screen.getByLabelText('Backend Items')).toBeInTheDocument();
    expect(screen.queryByLabelText('Frontend Items')).not.toBeInTheDocument();
  });

  describe('validity, with the same resolver the editor uses', () => {
    // Reads formState DURING render — it is a Proxy that only observes a field
    // a component actually reads while rendering.
    function Validity() {
      const { isValid } = useFormState();
      return <output data-testid="valid">{String(isValid)}</output>;
    }

    function Wrap() {
      const form = useForm<CVData>({
        defaultValues: DATA,
        resolver: zodResolver(CVDataSchema),
        mode: 'onChange',
        shouldUnregister: false,
      });
      return (
        <FormProvider {...form}>
          <Validity />
          <SkillsSection />
        </FormProvider>
      );
    }

    // `isValid` starts out `false` for one tick, before the resolver has run
    // for the first time. Every case below therefore waits for the settled
    // `true` first — without that, a `waitFor(... 'false')` passes by catching
    // the initial value and proves nothing at all.
    async function openCategories() {
      render(<Wrap />);
      fireEvent.click(screen.getByRole('button', { name: /Categories/ }));
      await waitFor(() => expect(screen.getByTestId('valid').textContent).toBe('true'));
    }

    it('stays valid when the tab is merely opened', async () => {
      // The counter-probe, and the defect this whole section was written for:
      // registering the field used to leave `skills: {}` behind, which failed
      // validation although nothing had been typed — autosave stopped and PDF
      // export greyed out for a user who had touched nothing.
      await openCategories();
      fireEvent.click(screen.getByRole('button', { name: /Add category/ }));
      // Opening the inline name field is not yet a category either.
      expect(screen.getByTestId('valid').textContent).toBe('true');
    });

    it('goes invalid once a category is actually committed with nothing in it', async () => {
      // Clicking "Add category" only opens an input; the category exists after
      // the name is typed and confirmed. Measured through that real flow:
      // `false` with `shouldValidate` on the setValue call, `true` without —
      // and without it autosave POSTs once per edit and the server answers 422
      // every time, so the refusal arrives a round-trip late.
      await openCategories();
      fireEvent.click(screen.getByRole('button', { name: /Add category/ }));
      const input = screen.getByPlaceholderText(/category/i);
      fireEvent.change(input, { target: { value: 'Frontend' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      await waitFor(() => expect(screen.getByTestId('valid').textContent).toBe('false'));
    });
  });
});
