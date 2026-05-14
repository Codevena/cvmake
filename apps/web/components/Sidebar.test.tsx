import type { PreviewBootstrap } from '@/lib/preview-bootstrap';
import type { CVData } from '@codevena/cvmake-schema';
import { bootstrapTemplates } from '@codevena/cvmake-templates';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { Sidebar } from './Sidebar';

bootstrapTemplates();

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

// biome-ignore lint/suspicious/noExplicitAny: smoke-test partial bootstrap mock
const BOOTSTRAP = { resetCss: '', printCss: '', templates: {} } as any as PreviewBootstrap;

function Wrap() {
  const form = useForm<CVData>({ defaultValues: DATA });
  return (
    <FormProvider {...form}>
      <Sidebar bootstrap={BOOTSTRAP} />
    </FormProvider>
  );
}

describe('<Sidebar />', () => {
  it('renders three popover triggers in the icon rail', () => {
    render(<Wrap />);
    expect(screen.getByLabelText('Template')).toBeInTheDocument();
    expect(screen.getByLabelText('Palette')).toBeInTheDocument();
    expect(screen.getByLabelText('Sections')).toBeInTheDocument();
  });

  it('opens the Template popover and shows the template radiogroup', () => {
    render(<Wrap />);
    fireEvent.click(screen.getByLabelText('Template'));
    expect(screen.getByRole('radiogroup', { name: 'Template' })).toBeInTheDocument();
  });

  it('opens the Palette popover and shows the PaletteSelector', () => {
    render(<Wrap />);
    fireEvent.click(screen.getByLabelText('Palette'));
    // The palette popover dialog should be present
    expect(screen.getByRole('dialog', { name: 'Palette' })).toBeInTheDocument();
  });

  it('opens the Sections popover and shows the HiddenSectionsToggles dialog', () => {
    render(<Wrap />);
    fireEvent.click(screen.getByLabelText('Sections'));
    expect(screen.getByRole('dialog', { name: 'Sections' })).toBeInTheDocument();
  });
});
