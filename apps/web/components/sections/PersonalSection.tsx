'use client';
import { errProp } from '@/lib/form-utils';
import type { CVData } from '@codevena/cvmake-schema';
import { Input } from '@codevena/cvmake-ui';
import { Controller, useFormContext } from 'react-hook-form';
import { PhotoUploadField } from '../PhotoUploadField';

const t = {
  heading: 'Personal',
  firstName: 'First name',
  lastName: 'Last name',
  titleHeadline: 'Title / Headline',
  birthDate: 'Date of birth',
  maritalStatus: 'Marital status',
  drivingLicense: 'Driving licence',
  contact: 'Contact',
} as const;

export function PersonalSection({ slug }: { slug: string }) {
  const { control } = useFormContext<CVData>();
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-display text-base font-semibold">{t.heading}</legend>
      <div className="grid grid-cols-2 gap-3">
        <Controller
          control={control}
          name="personal.firstName"
          render={({ field, fieldState }) => (
            <Input
              label={t.firstName}
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
              label={t.lastName}
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
            label={t.titleHeadline}
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
              label={t.birthDate}
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
              label={t.maritalStatus}
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
              label={t.drivingLicense}
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
      <fieldset className="grid grid-cols-2 gap-3 rounded border border-border p-3">
        <legend className="px-1 text-sm font-medium">{t.contact}</legend>
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
