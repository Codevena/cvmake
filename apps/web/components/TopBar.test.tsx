import type { CVData } from '@codevena/cvmake-schema';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { TopBar } from './TopBar';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

describe('<TopBar />', () => {
  it('rendert Dropdown + Save-Indicator + Export-Button', () => {
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA });
      return (
        <FormProvider {...form}>
          <TopBar slug="cv.de" allSlugs={['cv.de', 'cv.en']} saveState="clean" onRetry={() => {}} />
        </FormProvider>
      );
    }
    render(<Wrap />);
    expect(screen.getByLabelText(/CV auswählen/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PDF exportieren/ })).toBeInTheDocument();
  });
});
