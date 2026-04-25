import type { CVData } from '@codevena/forq-schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { SummarySection } from './SummarySection';

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

describe('<SummarySection />', () => {
  it('rendert eine Textarea und speichert Änderungen im form-state', () => {
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA, shouldUnregister: false });
      return (
        <FormProvider {...form}>
          <SummarySection />
          <output>{form.watch('summary') ?? ''}</output>
        </FormProvider>
      );
    }
    render(<Wrap />);
    const ta = screen.getByLabelText(/Profil/i) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: 'Hallo Welt' } });
    expect(screen.getByRole('status')).toHaveTextContent('Hallo Welt');
  });
});
