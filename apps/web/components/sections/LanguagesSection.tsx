'use client';
import type { CVData } from '@codevena/forq-schema';
import { Input, Select } from '@codevena/forq-ui';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';

// With exactOptionalPropertyTypes:true the Phase-7 <Input>/<Select> reject an
// explicit `error: undefined`. Spread the prop only when a message exists.
function errProp(message: string | undefined): { error: string } | Record<string, never> {
  return message ? { error: message } : {};
}

const LEVELS = [
  { value: 'native', label: 'Muttersprache (native)' },
  { value: 'C2', label: 'C2' },
  { value: 'C1', label: 'C1' },
  { value: 'B2', label: 'B2' },
  { value: 'B1', label: 'B1' },
  { value: 'A2', label: 'A2' },
  { value: 'A1', label: 'A1' },
  { value: 'basic', label: 'Grundkenntnisse' },
];

export function LanguagesSection() {
  const { control } = useFormContext<CVData>();
  const { fields, append, remove, swap } = useFieldArray({ control, name: 'languages' });

  return (
    <fieldset className="mt-6 flex flex-col gap-3">
      <legend className="text-base font-semibold">Sprachen</legend>
      {fields.map((f, idx) => (
        <div
          key={f.id}
          className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 rounded border p-3"
        >
          <Controller
            control={control}
            name={`languages.${idx}.name`}
            render={({ field, fieldState }) => (
              <Input
                label="Sprache"
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
                label="Niveau"
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
                label="Label (optional)"
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
              aria-label="nach oben"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={idx === fields.length - 1}
              onClick={() => swap(idx, idx + 1)}
              aria-label="nach unten"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm('Sprache löschen?')) remove(idx);
              }}
              aria-label="Sprache löschen"
            >
              🗑
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="rounded border border-dashed p-2 text-sm hover:bg-surface"
        onClick={() => append({ name: '', level: 'B2' })}
      >
        + Sprache hinzufügen
      </button>
    </fieldset>
  );
}
