'use client';
import type { CVData } from '@codevena/cvmake-schema';
import { Textarea } from '@codevena/cvmake-ui';
import { Controller, useFormContext } from 'react-hook-form';

// With exactOptionalPropertyTypes:true the Phase-7 <Textarea> rejects an
// explicit `error: undefined`. Spread the prop only when a message exists.
function errProp(message: string | undefined): { error: string } | Record<string, never> {
  return message ? { error: message } : {};
}

export function SummarySection() {
  const { control } = useFormContext<CVData>();
  return (
    <fieldset className="mt-6 flex flex-col gap-2">
      <legend className="text-base font-semibold">Profil</legend>
      <Controller
        control={control}
        name="summary"
        render={({ field, fieldState }) => (
          <Textarea
            label="Profil"
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
