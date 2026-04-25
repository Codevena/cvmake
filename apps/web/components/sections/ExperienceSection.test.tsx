import type { CVData } from '@codevena/forq-schema';
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
  it('+ Eintrag hinzufügen rendert ein neues Item', () => {
    render(<Wrap />);
    fireEvent.click(screen.getByRole('button', { name: /Eintrag hinzufügen/ }));
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('löscht ein Item nach confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Wrap />);
    fireEvent.click(screen.getByRole('button', { name: /Eintrag hinzufügen/ }));
    fireEvent.click(screen.getByLabelText('Eintrag löschen'));
    expect(screen.queryByText('#1')).not.toBeInTheDocument();
  });
});
