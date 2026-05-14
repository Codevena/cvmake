'use client';
import type { CVData } from '@codevena/cvmake-schema';
import { BulletListEditor, DateRangeInput, Input } from '@codevena/cvmake-ui';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { TagInput } from '../TagInput';

const t = {
  heading: 'Experience',
  role: 'Role',
  company: 'Company',
  location: 'Location',
  period: 'Period',
  tasks: 'Tasks',
  moveUp: 'Move up',
  moveDown: 'Move down',
  deleteEntry: 'Delete entry',
  confirmDelete: 'Delete entry?',
  addEntry: '+ Add entry',
} as const;

// With exactOptionalPropertyTypes:true the Phase-7 <Input> rejects an
// explicit `error: undefined`. Spread the prop only when a message exists.
function errProp(message: string | undefined): { error: string } | Record<string, never> {
  return message ? { error: message } : {};
}

export function ExperienceSection() {
  const { control } = useFormContext<CVData>();
  const { fields, append, remove, swap } = useFieldArray({ control, name: 'experience' });

  return (
    <fieldset className="mt-6 flex flex-col gap-3">
      <legend className="font-display text-base font-semibold">{t.heading}</legend>
      {fields.map((f, idx) => (
        <div key={f.id} className="rounded border border-border p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">#{idx + 1}</span>
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
                aria-label={t.deleteEntry}
              >
                🗑
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={control}
              name={`experience.${idx}.title`}
              render={({ field, fieldState }) => (
                <Input
                  label={t.role}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  required
                  {...errProp(fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name={`experience.${idx}.company`}
              render={({ field, fieldState }) => (
                <Input
                  label={t.company}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  required
                  {...errProp(fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name={`experience.${idx}.location`}
              render={({ field, fieldState }) => (
                <Input
                  label={t.location}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  {...errProp(fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name={`experience.${idx}.startDate`}
              render={({ field: startField }) => (
                <Controller
                  control={control}
                  name={`experience.${idx}.endDate`}
                  render={({ field: endField }) => {
                    // Bridge schema `{ startDate, endDate? }` (string/undef)
                    // to <DateRangeInput> `{ start, end: string | null }`.
                    // Convention: undefined endDate (schema) === current
                    // position (end:null in DateRangeInput).
                    const endRaw = endField.value as string | undefined;
                    const end: string | null = endRaw === undefined ? null : endRaw;
                    return (
                      <DateRangeInput
                        label={t.period}
                        value={{ start: startField.value ?? '', end }}
                        onChange={(v) => {
                          startField.onChange(v.start);
                          // null (current) → undefined in form state.
                          endField.onChange(v.end === null ? undefined : v.end);
                        }}
                      />
                    );
                  }}
                />
              )}
            />
          </div>
          <Controller
            control={control}
            name={`experience.${idx}.bullets`}
            render={({ field }) => (
              <BulletListEditor
                label={t.tasks}
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name={`experience.${idx}.tags`}
            render={({ field }) => (
              <TagInput label="Tags" value={field.value ?? []} onChange={field.onChange} />
            )}
          />
        </div>
      ))}
      <button
        type="button"
        className="rounded border border-dashed border-border p-2 text-sm text-text-muted hover:bg-elevated"
        onClick={() => append({ title: '', company: '', startDate: '', bullets: [] })}
      >
        {t.addEntry}
      </button>
    </fieldset>
  );
}
