import type { CVData } from '@codevena/forq-schema';
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
  it('hat Tab-Buttons Liste/Kategorien', () => {
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA, shouldUnregister: false });
      return (
        <FormProvider {...form}>
          <SkillsSection />
        </FormProvider>
      );
    }
    render(<Wrap />);
    expect(screen.getByRole('button', { name: /Liste/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kategorien/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Kategorien/ }));
    expect(screen.getByRole('button', { name: /Kategorie hinzufügen/ })).toBeInTheDocument();
  });
});
