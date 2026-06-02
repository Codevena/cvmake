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

  it('renames a category only on blur (stable key while typing, no per-keystroke commit)', () => {
    function Wrap() {
      const form = useForm<CVData>({
        defaultValues: { ...DATA, skills: { categorized: { Frontend: ['React'] } } },
        shouldUnregister: false,
      });
      return (
        <FormProvider {...form}>
          <SkillsSection />
        </FormProvider>
      );
    }
    render(<Wrap />);
    // The categorized tab is auto-selected because a category already exists.
    const input = screen.getByDisplayValue('Frontend');
    fireEvent.change(input, { target: { value: 'Backend' } });
    // Not committed yet — the rename must wait for blur, so the items group
    // is still keyed/labelled by the OLD name (old code committed immediately).
    expect(screen.getByLabelText('Frontend Items')).toBeInTheDocument();
    expect(screen.queryByLabelText('Backend Items')).not.toBeInTheDocument();
    // Commit on blur
    fireEvent.blur(input);
    expect(screen.getByLabelText('Backend Items')).toBeInTheDocument();
    expect(screen.queryByLabelText('Frontend Items')).not.toBeInTheDocument();
  });
});
