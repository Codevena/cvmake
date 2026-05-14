import type { CVData } from '@codevena/cvmake-schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
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

  it('deletes an item after confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Wrap />);
    fireEvent.click(screen.getByRole('button', { name: /Add entry/ }));
    fireEvent.click(screen.getByLabelText('Delete entry'));
    expect(screen.queryByText('#1')).not.toBeInTheDocument();
  });
});
