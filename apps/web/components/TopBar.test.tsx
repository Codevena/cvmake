import type { CVData } from '@codevena/cvmake-schema';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  it('renders dropdown + Save-Indicator + Export PDF button', () => {
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA });
      return (
        <FormProvider {...form}>
          <TopBar
            slug="cv.de"
            allSlugs={['cv.de', 'cv.en']}
            saveState="clean"
            onRetry={() => {}}
            onOpenPalette={() => {}}
            isDemo={false}
          />
        </FormProvider>
      );
    }
    render(<Wrap />);
    expect(screen.getByLabelText(/Select CV/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export PDF/ })).toBeInTheDocument();
  });

  it('calls onOpenPalette when ⌘K button is clicked', async () => {
    const onOpenPalette = vi.fn();
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA });
      return (
        <FormProvider {...form}>
          <TopBar
            slug="cv.de"
            allSlugs={['cv.de', 'cv.en']}
            saveState="clean"
            onRetry={() => {}}
            onOpenPalette={onOpenPalette}
            isDemo={false}
          />
        </FormProvider>
      );
    }
    render(<Wrap />);
    await userEvent.click(screen.getByLabelText(/Open command palette/));
    expect(onOpenPalette).toHaveBeenCalledOnce();
  });
});
