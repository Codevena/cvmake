import type { CVData } from '@codevena/cvmake-schema';
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
  it('renders a textarea and saves changes to form state', () => {
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
    const ta = screen.getByLabelText(/Summary/i) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: 'Hallo Welt' } });
    expect(screen.getByRole('status')).toHaveTextContent('Hallo Welt');
  });
});
