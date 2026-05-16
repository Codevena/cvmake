'use client';
import { errProp } from '@/lib/form-utils';
import type { CVData } from '@codevena/cvmake-schema';
import { BulletListEditor, DateRangeInput, Input } from '@codevena/cvmake-ui';
import { useState } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { ConfirmDialog } from '../ConfirmDialog';

const t = {
  heading: 'Education',
  degree: 'Degree',
  institution: 'Institution',
  location: 'Location',
  period: 'Period',
  contents: 'Contents',
  moveUp: 'Move up',
  moveDown: 'Move down',
  deleteEntry: 'Delete entry',
  confirmDelete: 'Delete this education entry?',
  addEntry: '+ Add entry',
} as const;

export function EducationSection() {
  const { control } = useFormContext<CVData>();
  const { fields, append, remove, swap } = useFieldArray({ control, name: 'education' });
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

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
                onClick={() => setPendingDelete(idx)}
                aria-label={t.deleteEntry}
              >
                🗑
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={control}
              name={`education.${idx}.degree`}
              render={({ field, fieldState }) => (
                <Input
                  label={t.degree}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  required
                  {...errProp(fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name={`education.${idx}.institution`}
              render={({ field, fieldState }) => (
                <Input
                  label={t.institution}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  required
                  {...errProp(fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name={`education.${idx}.location`}
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
              name={`education.${idx}.startDate`}
              render={({ field: startField }) => (
                <Controller
                  control={control}
                  name={`education.${idx}.endDate`}
                  render={({ field: endField }) => {
                    // Bridge schema `{ startDate, endDate? }` (string/undef)
                    // to <DateRangeInput> `{ start, end: string | null }`.
                    // Convention: undefined endDate (schema) === current
                    // (end:null in DateRangeInput).
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
            name={`education.${idx}.bullets`}
            render={({ field }) => (
              <BulletListEditor
                label={t.contents}
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      ))}
      <button
        type="button"
        className="rounded border border-dashed border-border p-2 text-sm text-text-muted hover:bg-elevated"
        onClick={() => append({ degree: '', institution: '', startDate: '' })}
      >
        {t.addEntry}
      </button>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={t.deleteEntry}
        message={t.confirmDelete}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (pendingDelete !== null) remove(pendingDelete);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </fieldset>
  );
}
