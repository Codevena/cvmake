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
