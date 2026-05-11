'use client';
import type { CVData } from '@codevena/cvmake-schema';
import { BulletListEditor, Input } from '@codevena/cvmake-ui';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';

// With exactOptionalPropertyTypes:true the Phase-7 <Input> rejects an explicit
// `error: undefined`. Spread the prop only when a message exists.
function errProp(message: string | undefined): { error: string } | Record<string, never> {
  return message ? { error: message } : {};
}

function ItemsArray({ outerIdx }: { outerIdx: number }) {
  const { control } = useFormContext<CVData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `customSections.${outerIdx}.items`,
  });
  return (
    <div className="mt-2 flex flex-col gap-2 pl-4">
      {fields.map((f, idx) => (
        <div key={f.id} className="rounded border p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs">Item #{idx + 1}</span>
            <button
              type="button"
              onClick={() => {
                if (confirm('Item löschen?')) remove(idx);
              }}
              aria-label="Item löschen"
            >
              🗑
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Controller
              control={control}
              name={`customSections.${outerIdx}.items.${idx}.title`}
              render={({ field, fieldState }) => (
                <Input
                  label="Titel"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  required
                  {...errProp(fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name={`customSections.${outerIdx}.items.${idx}.subtitle`}
              render={({ field, fieldState }) => (
                <Input
                  label="Subtitle"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  {...errProp(fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name={`customSections.${outerIdx}.items.${idx}.date`}
              render={({ field, fieldState }) => (
                <Input
                  label="Datum"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  {...errProp(fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name={`customSections.${outerIdx}.items.${idx}.description`}
              render={({ field, fieldState }) => (
                <Input
                  label="Beschreibung"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  {...errProp(fieldState.error?.message)}
                />
              )}
            />
          </div>
          <Controller
            control={control}
            name={`customSections.${outerIdx}.items.${idx}.bullets`}
            render={({ field }) => (
              <BulletListEditor
                label="Bullets"
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => append({ title: '' })}
        className="rounded border border-dashed p-1 text-xs hover:bg-surface"
      >
        + Item
      </button>
    </div>
  );
}

export function CustomSectionsSection() {
  const { control } = useFormContext<CVData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'customSections' });
  return (
    <fieldset className="mt-6 flex flex-col gap-3">
      <legend className="text-base font-semibold">Eigene Sections</legend>
      {fields.map((f, idx) => (
        <div key={f.id} className="rounded border p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Section #{idx + 1}</span>
            <button
              type="button"
              onClick={() => {
                if (confirm('Section löschen?')) remove(idx);
              }}
              aria-label="Section löschen"
            >
              🗑
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Controller
              control={control}
              name={`customSections.${idx}.id`}
              render={({ field, fieldState }) => (
                <Input
                  label="ID (slug)"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  required
                  {...errProp(fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name={`customSections.${idx}.title`}
              render={({ field, fieldState }) => (
                <Input
                  label="Titel"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  required
                  {...errProp(fieldState.error?.message)}
                />
              )}
            />
          </div>
          <ItemsArray outerIdx={idx} />
        </div>
      ))}
      <button
        type="button"
        className="rounded border border-dashed p-2 text-sm hover:bg-surface"
        onClick={() => append({ id: '', title: '', items: [] })}
      >
        + Section hinzufügen
      </button>
    </fieldset>
  );
}
