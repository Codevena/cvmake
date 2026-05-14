import type { CVData } from '@codevena/cvmake-schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { EducationSection } from './EducationSection';

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
      <EducationSection />
    </FormProvider>
  );
}

describe('<EducationSection />', () => {
  it('+ Add entry renders an item', () => {
    render(<Wrap />);
    fireEvent.click(screen.getByRole('button', { name: /Add entry/ }));
    expect(screen.getByText('#1')).toBeInTheDocument();
  });
});
