import type { CVData } from '@codevena/cvmake-schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
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
});
