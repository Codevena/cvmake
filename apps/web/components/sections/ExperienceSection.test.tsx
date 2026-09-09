import type { CVData } from '@codevena/cvmake-schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { ExperienceSection } from './ExperienceSection';

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

function Wrap() {
  const form = useForm<CVData>({ defaultValues: DATA, shouldUnregister: false });
  return (
    <FormProvider {...form}>
      <ExperienceSection />
    </FormProvider>
  );
}

describe('<ExperienceSection /> — the Current checkbox', () => {
  // Pre-existing, reproduces on HEAD, and it loses data silently: one click on
  // "Current" for an entry that HAS an end date left the checkbox unchecked and
  // the selects still showing the old date, while `endDate` was removed from
  // the saved CV. `endField.onChange(undefined)` writes undefined into the form
  // — which is correct, that is how the schema spells "current" — but
  // `useController` then falls back to `_defaultValues` for the field and hands
  // the OLD date straight back, so the component concludes it is not current.
  const WITH_END: CVData = {
    ...DATA,
    experience: [
      {
        company: 'Acme',
        title: 'Dev',
        startDate: '2019-01',
        endDate: '2021-07',
        bullets: [],
      },
    ],
  };

  function ObservedWrap({ formRef }: { formRef: { current: CVData | undefined } }) {
    const form = useForm<CVData>({ defaultValues: WITH_END, shouldUnregister: false });
    formRef.current = form.watch();
    return (
      <FormProvider {...form}>
        <ExperienceSection />
      </FormProvider>
    );
  }

  it('checking Current clears the end date and stays checked', () => {
    const formRef: { current: CVData | undefined } = { current: undefined };
    render(<ObservedWrap formRef={formRef} />);
    const current = screen.getByLabelText('Current');
    expect(screen.getByLabelText('End year')).toHaveValue('2021');

    fireEvent.click(current);

    // What the document holds, and what the user is shown, have to agree.
    expect(formRef.current?.experience[0]?.endDate).toBeUndefined();
    expect(current).toBeChecked();
    expect(screen.getByLabelText('End year')).toHaveValue('');
  });

  it('unchecking it again gives back an empty end date, not the old one', () => {
    const formRef: { current: CVData | undefined } = { current: undefined };
    render(<ObservedWrap formRef={formRef} />);
    const current = screen.getByLabelText('Current');
    fireEvent.click(current);
    fireEvent.click(current);
    expect(current).not.toBeChecked();
    expect(screen.getByLabelText('End year')).toHaveValue('');
    expect(formRef.current?.experience[0]?.endDate).toBe('');
  });
});

describe('<ExperienceSection />', () => {
  it('+ Add entry renders a new item', () => {
    render(<Wrap />);
    fireEvent.click(screen.getByRole('button', { name: /Add entry/ }));
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('deletes an item after confirming in the ConfirmDialog', () => {
    render(<Wrap />);
    // Add an entry first
    fireEvent.click(screen.getByRole('button', { name: /Add entry/ }));
    expect(screen.getByText('#1')).toBeInTheDocument();
    // Click the delete button to open the ConfirmDialog
    fireEvent.click(screen.getByLabelText('Delete entry'));
    // The ConfirmDialog should appear with the confirm button
    const confirmBtn = screen.getByRole('button', { name: /^Delete$/ });
    expect(confirmBtn).toBeInTheDocument();
    // Click Delete to confirm deletion
    fireEvent.click(confirmBtn);
    // The entry should be removed
    expect(screen.queryByText('#1')).not.toBeInTheDocument();
  });

  it('keeps item when cancel is clicked in the ConfirmDialog', () => {
    render(<Wrap />);
    fireEvent.click(screen.getByRole('button', { name: /Add entry/ }));
    expect(screen.getByText('#1')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Delete entry'));
    // Cancel the deletion
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    // Entry should still be there
    expect(screen.getByText('#1')).toBeInTheDocument();
  });
});

describe('ExperienceSection — partial date entry survives, and a reset clears it', () => {
  function ResetHarness() {
    const form = useForm<CVData>({
      defaultValues: {
        ...DATA,
        experience: [{ title: 'T', company: 'C', startDate: '', bullets: [] }],
      },
      shouldUnregister: false,
    });
    return (
      <FormProvider {...form}>
        <ExperienceSection />
        <button
          type="button"
          onClick={() =>
            form.reset({
              ...DATA,
              experience: [{ title: 'T', company: 'C', startDate: '', bullets: [] }],
            })
          }
        >
          reset
        </button>
      </FormProvider>
    );
  }

  it('keeps a month chosen before the year, and drops it on a form reset', () => {
    render(<ResetHarness />);
    const month = screen.getAllByLabelText('Start month')[0] as HTMLSelectElement;
    fireEvent.change(month, { target: { value: '03' } });
    // Survives: this is the selection the old component discarded outright.
    expect(month).toHaveValue('03');

    // A conflict reload resets the form to the same data. The component cannot
    // see that from its props — the parent hands it an identical value — so the
    // cleanup comes from `key={f.id}`, which react-hook-form regenerates on
    // reset, remounting the row. Switching those keys to an index would strand
    // the half-made selection here.
    fireEvent.click(screen.getByRole('button', { name: 'reset' }));
    const after = screen.getAllByLabelText('Start month')[0] as HTMLSelectElement;
    expect(after).toHaveValue('');
  });
});
