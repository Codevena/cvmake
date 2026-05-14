'use client';
import type { CVData } from '@codevena/cvmake-schema';
import { Input, Select } from '@codevena/cvmake-ui';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';

const t = {
  heading: 'Languages',
  language: 'Language',
  level: 'Level',
  labelOptional: 'Label (optional)',
  moveUp: 'Move up',
  moveDown: 'Move down',
  deleteLanguage: 'Delete language',
  confirmDelete: 'Delete language?',
  addLanguage: '+ Add language',
} as const;

// With exactOptionalPropertyTypes:true the Phase-7 <Input>/<Select> reject an
// explicit `error: undefined`. Spread the prop only when a message exists.
function errProp(message: string | undefined): { error: string } | Record<string, never> {
  return message ? { error: message } : {};
}

const LEVELS = [
  { value: 'native', label: 'Native' },
  { value: 'C2', label: 'C2' },
  { value: 'C1', label: 'C1' },
  { value: 'B2', label: 'B2' },
  { value: 'B1', label: 'B1' },
  { value: 'A2', label: 'A2' },
  { value: 'A1', label: 'A1' },
  { value: 'basic', label: 'Basic' },
];

export function LanguagesSection() {
  const { control } = useFormContext<CVData>();
  const { fields, append, remove, swap } = useFieldArray({ control, name: 'languages' });

  return (
    <fieldset className="mt-6 flex flex-col gap-3">
      <legend className="font-display text-base font-semibold">{t.heading}</legend>
      {fields.map((f, idx) => (
        <div
          key={f.id}
          className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 rounded border border-border p-3"
        >
          <Controller
            control={control}
            name={`languages.${idx}.name`}
            render={({ field, fieldState }) => (
              <Input
                label={t.language}
                value={field.value ?? ''}
                onChange={field.onChange}
                required
                {...errProp(fieldState.error?.message)}
              />
            )}
          />
          <Controller
            control={control}
            name={`languages.${idx}.level`}
            render={({ field, fieldState }) => (
              <Select
                label={t.level}
                value={field.value ?? 'B2'}
                onChange={(v) => field.onChange(v)}
                options={LEVELS}
                {...errProp(fieldState.error?.message)}
              />
            )}
          />
          <Controller
            control={control}
            name={`languages.${idx}.label`}
            render={({ field, fieldState }) => (
              <Input
                label={t.labelOptional}
                value={field.value ?? ''}
                onChange={field.onChange}
                {...errProp(fieldState.error?.message)}
              />
            )}
          />
          <div className="flex gap-1">
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => swap(idx, idx - 1)}
              aria-label={t.moveUp}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={idx === fields.length - 1}
              onClick={() => swap(idx, idx + 1)}
              aria-label={t.moveDown}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(t.confirmDelete)) remove(idx);
              }}
              aria-label={t.deleteLanguage}
            >
              🗑
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="rounded border border-dashed border-border p-2 text-sm text-text-muted hover:bg-elevated"
        onClick={() => append({ name: '', level: 'B2' })}
      >
        {t.addLanguage}
      </button>
    </fieldset>
  );
}
