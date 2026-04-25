import type { PreviewBootstrap } from '@/lib/preview-bootstrap';
import type { CVData } from '@codevena/forq-schema';
import { bootstrapTemplates } from '@codevena/forq-templates';
import { render, screen } from '@testing-library/react';
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

describe('<Sidebar />', () => {
  it('rendert Template-Picker, Palette-Picker, Accent-Override', () => {
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA });
      return (
        <FormProvider {...form}>
          <Sidebar bootstrap={BOOTSTRAP} />
        </FormProvider>
      );
    }
    render(<Wrap />);
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText('Palette')).toBeInTheDocument();
    expect(screen.getByText('Accent-Override')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Template' })).toBeInTheDocument();
  });
});
