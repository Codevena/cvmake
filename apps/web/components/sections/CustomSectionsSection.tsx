'use client';
import { errProp } from '@/lib/form-utils';
import type { CVData } from '@codevena/cvmake-schema';
import { BulletListEditor, Input } from '@codevena/cvmake-ui';
import { useState } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { ConfirmDialog } from '../ConfirmDialog';

const t = {
  heading: 'Custom sections',
  itemTitle: 'Title',
  itemSubtitle: 'Subtitle',
  itemDate: 'Date',
  itemDescription: 'Description',
  deleteItem: 'Delete item',
  confirmDeleteItem: 'Delete this item?',
  addItem: '+ Item',
  sectionIdSlug: 'ID (slug)',
  sectionTitle: 'Title',
  deleteSection: 'Delete section',
  confirmDeleteSection: 'Delete this section?',
  addSection: '+ Add section',
} as const;

function ItemsArray({ outerIdx }: { outerIdx: number }) {
  const { control } = useFormContext<CVData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `customSections.${outerIdx}.items`,
  });
  const [pendingDeleteItem, setPendingDeleteItem] = useState<number | null>(null);

  return (
    <div className="mt-2 flex flex-col gap-2 pl-4">
      {fields.map((f, idx) => (
        <div key={f.id} className="rounded border border-border p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Item #{idx + 1}</span>
            <button
              type="button"
              onClick={() => setPendingDeleteItem(idx)}
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
      <ConfirmDialog
        open={pendingDeleteItem !== null}
        title={t.deleteItem}
        message={t.confirmDeleteItem}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (pendingDeleteItem !== null) remove(pendingDeleteItem);
          setPendingDeleteItem(null);
        }}
        onCancel={() => setPendingDeleteItem(null)}
      />
    </div>
  );
}

export function CustomSectionsSection() {
  const { control } = useFormContext<CVData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'customSections' });
  const [pendingDeleteSection, setPendingDeleteSection] = useState<number | null>(null);

  return (
    <fieldset className="mt-6 flex flex-col gap-3">
      <legend className="font-display text-base font-semibold">{t.heading}</legend>
      {fields.map((f, idx) => (
        <div key={f.id} className="rounded border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Section #{idx + 1}</span>
            <button
              type="button"
              onClick={() => setPendingDeleteSection(idx)}
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
      <ConfirmDialog
        open={pendingDeleteSection !== null}
        title={t.deleteSection}
        message={t.confirmDeleteSection}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (pendingDeleteSection !== null) remove(pendingDeleteSection);
          setPendingDeleteSection(null);
        }}
        onCancel={() => setPendingDeleteSection(null)}
      />
    </fieldset>
  );
}
