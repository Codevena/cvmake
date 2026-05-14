'use client';
import type { CVData } from '@codevena/cvmake-schema';
import { BulletListEditor, Input } from '@codevena/cvmake-ui';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';

const t = {
  heading: 'Custom sections',
  itemTitle: 'Title',
  itemSubtitle: 'Subtitle',
  itemDate: 'Date',
  itemDescription: 'Description',
  deleteItem: 'Delete item',
  confirmDeleteItem: 'Delete item?',
  addItem: '+ Item',
  sectionIdSlug: 'ID (slug)',
  sectionTitle: 'Title',
  deleteSection: 'Delete section',
  confirmDeleteSection: 'Delete section?',
  addSection: '+ Add section',
} as const;

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
        <div key={f.id} className="rounded border border-border p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Item #{idx + 1}</span>
            <button
              type="button"
              onClick={() => {
                if (confirm(t.confirmDeleteItem)) remove(idx);
              }}
              aria-label={t.deleteItem}
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
                  label={t.itemTitle}
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
                  label={t.itemSubtitle}
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
                  label={t.itemDate}
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
                  label={t.itemDescription}
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
        className="rounded border border-dashed border-border p-1 text-xs text-text-muted hover:bg-elevated"
      >
        {t.addItem}
      </button>
    </div>
  );
}

export function CustomSectionsSection() {
  const { control } = useFormContext<CVData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'customSections' });
  return (
    <fieldset className="mt-6 flex flex-col gap-3">
      <legend className="font-display text-base font-semibold">{t.heading}</legend>
      {fields.map((f, idx) => (
        <div key={f.id} className="rounded border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Section #{idx + 1}</span>
            <button
              type="button"
              onClick={() => {
                if (confirm(t.confirmDeleteSection)) remove(idx);
              }}
              aria-label={t.deleteSection}
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
                  label={t.sectionIdSlug}
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
                  label={t.sectionTitle}
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
        className="rounded border border-dashed border-border p-2 text-sm text-text-muted hover:bg-elevated"
        onClick={() => append({ id: '', title: '', items: [] })}
      >
        {t.addSection}
      </button>
    </fieldset>
  );
}
