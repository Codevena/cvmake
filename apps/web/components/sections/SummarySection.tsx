'use client';
import { errProp } from '@/lib/form-utils';
import type { CVData } from '@codevena/cvmake-schema';
import { Textarea } from '@codevena/cvmake-ui';
import { Controller, useFormContext } from 'react-hook-form';

const t = {
  heading: 'Summary',
  label: 'Summary',
} as const;

export function SummarySection() {
  const { control } = useFormContext<CVData>();
  return (
    <fieldset className="mt-6 flex flex-col gap-2">
      <legend className="font-display text-base font-semibold">{t.heading}</legend>
      <Controller
        control={control}
        name="summary"
        render={({ field, fieldState }) => (
          <Textarea
            label={t.label}
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            rows={5}
            {...errProp(fieldState.error?.message)}
          />
        )}
      />
    </fieldset>
  );
}
