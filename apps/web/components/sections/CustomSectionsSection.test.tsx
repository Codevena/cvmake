import type { CVData } from '@codevena/cvmake-schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { CustomSectionsSection } from './CustomSectionsSection';

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

describe('<CustomSectionsSection />', () => {
  it('add section + add item', () => {
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA, shouldUnregister: false });
      return (
        <FormProvider {...form}>
          <CustomSectionsSection />
        </FormProvider>
      );
    }
    render(<Wrap />);
    fireEvent.click(screen.getByRole('button', { name: /Add section/ }));
    expect(screen.getByText('Section #1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+ Item' }));
    expect(screen.getByText('Item #1')).toBeInTheDocument();
  });
});
