import type { CVData } from '@codevena/cvmake-schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { LanguagesSection } from './LanguagesSection';

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
      <LanguagesSection />
    </FormProvider>
  );
}

describe('<LanguagesSection />', () => {
  it('add / remove cycle', () => {
    render(<Wrap />);
    fireEvent.click(screen.getByRole('button', { name: /Sprache hinzufügen/ }));
    expect(screen.getByLabelText(/Niveau/i)).toBeInTheDocument();
  });
});
