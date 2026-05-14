import type { CVData } from '@codevena/cvmake-schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { PersonalSection } from './PersonalSection';

function Wrapper({ initial }: { initial: CVData }) {
  const form = useForm<CVData>({
    defaultValues: initial,
    mode: 'onChange',
    shouldUnregister: false,
  });
  return (
    <FormProvider {...form}>
      <PersonalSection slug="cv.de" />
    </FormProvider>
  );
}

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

describe('<PersonalSection />', () => {
  it('renders name fields and propagates changes', () => {
    render(<Wrapper initial={DATA} />);
    const first = screen.getByLabelText(/First name/i) as HTMLInputElement;
    fireEvent.change(first, { target: { value: 'Lena' } });
    expect((screen.getByLabelText(/First name/i) as HTMLInputElement).value).toBe('Lena');
  });
});
