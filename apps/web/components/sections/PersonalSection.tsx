'use client';
import type { CVData } from '@codevena/cvmake-schema';
import { Input } from '@codevena/cvmake-ui';
import { Controller, useFormContext } from 'react-hook-form';
import { PhotoUploadField } from '../PhotoUploadField';

// With exactOptionalPropertyTypes:true the Phase-7 <Input> rejects an
// explicit `error: undefined`. Spread the prop only when a message exists.
function errProp(message: string | undefined): { error: string } | Record<string, never> {
  return message ? { error: message } : {};
}

export function PersonalSection({ slug }: { slug: string }) {
  const { control } = useFormContext<CVData>();
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-base font-semibold">Persönliche Daten</legend>
      <div className="grid grid-cols-2 gap-3">
        <Controller
          control={control}
          name="personal.firstName"
          render={({ field, fieldState }) => (
            <Input
              label="Vorname"
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              {...errProp(fieldState.error?.message)}
              required
            />
          )}
        />
        <Controller
          control={control}
          name="personal.lastName"
          render={({ field, fieldState }) => (
            <Input
              label="Nachname"
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              {...errProp(fieldState.error?.message)}
              required
            />
          )}
        />
      </div>
      <Controller
        control={control}
        name="personal.title"
        render={({ field, fieldState }) => (
          <Input
            label="Titel / Headline"
            value={field.value ?? ''}
            onChange={field.onChange}
            {...errProp(fieldState.error?.message)}
          />
        )}
      />
      <div className="grid grid-cols-3 gap-3">
        <Controller
          control={control}
          name="personal.birthDate"
          render={({ field, fieldState }) => (
            <Input
              label="Geburtsdatum"
              value={field.value ?? ''}
              onChange={field.onChange}
              {...errProp(fieldState.error?.message)}
            />
          )}
        />
        <Controller
          control={control}
          name="personal.maritalStatus"
          render={({ field, fieldState }) => (
            <Input
              label="Familienstand"
              value={field.value ?? ''}
              onChange={field.onChange}
              {...errProp(fieldState.error?.message)}
            />
          )}
        />
        <Controller
          control={control}
          name="personal.drivingLicense"
          render={({ field, fieldState }) => (
            <Input
              label="Führerschein"
              value={field.value ?? ''}
              onChange={field.onChange}
              {...errProp(fieldState.error?.message)}
            />
          )}
        />
      </div>
      <Controller
        control={control}
        name="personal.photo"
        render={({ field }) => (
          <PhotoUploadField slug={slug} value={field.value ?? ''} onChange={field.onChange} />
        )}
      />
      <fieldset className="grid grid-cols-2 gap-3 rounded border p-3">
        <legend className="px-1 text-sm font-medium">Kontakt</legend>
        {(['email', 'phone', 'website', 'github', 'linkedin', 'location'] as const).map((k) => (
          <Controller
            key={k}
            control={control}
            name={`personal.contacts.${k}` as const}
            render={({ field, fieldState }) => (
              <Input
                label={k}
                value={field.value ?? ''}
                onChange={field.onChange}
                {...errProp(fieldState.error?.message)}
                type={
                  k === 'email' ? 'email' : k === 'website' ? 'url' : k === 'phone' ? 'tel' : 'text'
                }
              />
            )}
          />
        ))}
      </fieldset>
    </fieldset>
  );
}
