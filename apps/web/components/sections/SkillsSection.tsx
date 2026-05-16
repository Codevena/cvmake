'use client';
import type { CVData } from '@codevena/cvmake-schema';
import { Input } from '@codevena/cvmake-ui';
import { useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { ConfirmDialog } from '../ConfirmDialog';
import { TagInput } from '../TagInput';

const t = {
  heading: 'Skills',
  tabList: 'List',
  tabCategories: 'Categories',
  category: 'Category',
  confirmDeleteCategory: (name: string) => `Delete category "${name}"?`,
  deleteCategory: (name: string) => `Delete category ${name}`,
  addCategory: '+ Add category',
  newCategoryPlaceholder: 'Category name',
  newCategoryConfirm: 'Add',
  newCategoryCancel: 'Cancel',
} as const;

type Tab = 'stack' | 'categorized';

export function SkillsSection() {
  const { control, getValues, setValue, watch } = useFormContext<CVData>();
  const initialCats = getValues('skills.categorized') ?? {};
  const initialTab: Tab = Object.keys(initialCats).length > 0 ? 'categorized' : 'stack';
  const [tab, setTab] = useState<Tab>(initialTab);
  const cats = watch('skills.categorized') ?? {};
  const catEntries = Object.entries(cats);

  // Inline "add category" state — replaces window.prompt
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const newCategoryInputRef = useRef<HTMLInputElement>(null);

  // Pending delete state — replaces window.confirm
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<string | null>(null);

  function commitNewCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setValue('skills.categorized', { ...cats, [name]: [] }, { shouldDirty: true });
    setNewCategoryName('');
    setAddingCategory(false);
  }

  function removeCategory(name: string) {
    const { [name]: _omitted, ...rest } = cats;
    setValue('skills.categorized', rest, { shouldDirty: true });
  }

  return (
    <fieldset className="mt-6 flex flex-col gap-3">
      <legend className="font-display text-base font-semibold">{t.heading}</legend>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('stack')}
          className={`rounded border border-border px-3 py-1 text-sm ${tab === 'stack' ? 'bg-accent text-bg' : 'text-text-muted hover:bg-elevated'}`}
        >
          {t.tabList}
        </button>
        <button
          type="button"
          onClick={() => setTab('categorized')}
          className={`rounded border border-border px-3 py-1 text-sm ${tab === 'categorized' ? 'bg-accent text-bg' : 'text-text-muted hover:bg-elevated'}`}
        >
          {t.tabCategories}
        </button>
      </div>
      {tab === 'stack' && (
        <Controller
          control={control}
          name="skills.stack"
          render={({ field }) => (
            <TagInput label="Skills" value={field.value ?? []} onChange={field.onChange} />
          )}
        />
      )}
      {tab === 'categorized' && (
        <div className="flex flex-col gap-3">
          {catEntries.map(([name, items]) => (
            <div key={name} className="rounded border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <Input
                  label={t.category}
                  value={name}
                  onChange={(next) => {
                    if (!next || next === name) return;
                    const { [name]: oldItems, ...rest } = cats;
                    setValue(
                      'skills.categorized',
                      { ...rest, [next]: oldItems ?? [] },
                      { shouldDirty: true },
                    );
                  }}
                />
                <button
                  type="button"
                  onClick={() => setPendingDeleteCategory(name)}
                  aria-label={t.deleteCategory(name)}
                >
                  🗑
                </button>
              </div>
              <TagInput
                label={`${name} Items`}
                value={items}
                onChange={(next) =>
                  setValue('skills.categorized', { ...cats, [name]: next }, { shouldDirty: true })
                }
              />
            </div>
          ))}
          {addingCategory ? (
            <div className="flex items-center gap-2 rounded border border-dashed border-border p-2">
              <input
                ref={newCategoryInputRef}
                // biome-ignore lint/a11y/noAutofocus: intentionally focused when the inline add form opens
                autoFocus
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t.newCategoryPlaceholder}
                className="flex-1 rounded border border-border bg-bg px-2 py-1 text-sm text-text outline-none focus:ring-1 focus:ring-accent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitNewCategory();
                  } else if (e.key === 'Escape') {
                    setAddingCategory(false);
                    setNewCategoryName('');
                  }
                }}
              />
              <button
                type="button"
                onClick={commitNewCategory}
                className="rounded border border-border px-2 py-1 text-sm hover:bg-elevated"
              >
                {t.newCategoryConfirm}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingCategory(false);
                  setNewCategoryName('');
                }}
                className="rounded border border-border px-2 py-1 text-sm text-text-muted hover:bg-elevated"
              >
                {t.newCategoryCancel}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingCategory(true)}
              className="rounded border border-dashed border-border p-2 text-sm text-text-muted hover:bg-elevated"
            >
              {t.addCategory}
            </button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={pendingDeleteCategory !== null}
        title="Delete category"
        message={pendingDeleteCategory ? t.confirmDeleteCategory(pendingDeleteCategory) : ''}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (pendingDeleteCategory) removeCategory(pendingDeleteCategory);
          setPendingDeleteCategory(null);
        }}
        onCancel={() => setPendingDeleteCategory(null)}
      />
    </fieldset>
  );
}
