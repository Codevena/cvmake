'use client';
import type { CVData } from '@codevena/forq-schema';
import { Input } from '@codevena/forq-ui';
import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { TagInput } from '../TagInput';

type Tab = 'stack' | 'categorized';

export function SkillsSection() {
  const { control, getValues, setValue, watch } = useFormContext<CVData>();
  const initialCats = getValues('skills.categorized') ?? {};
  const initialTab: Tab = Object.keys(initialCats).length > 0 ? 'categorized' : 'stack';
  const [tab, setTab] = useState<Tab>(initialTab);
  const cats = watch('skills.categorized') ?? {};
  const catEntries = Object.entries(cats);

  function addCategory() {
    const name = prompt('Kategorie-Name?');
    if (!name) return;
    setValue('skills.categorized', { ...cats, [name]: [] }, { shouldDirty: true });
  }
  function removeCategory(name: string) {
    if (!confirm(`Kategorie ${name} löschen?`)) return;
    const { [name]: _omitted, ...rest } = cats;
    setValue('skills.categorized', rest, { shouldDirty: true });
  }

  return (
    <fieldset className="mt-6 flex flex-col gap-3">
      <legend className="text-base font-semibold">Skills</legend>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('stack')}
          className={`rounded border px-3 py-1 text-sm ${tab === 'stack' ? 'bg-accent text-text-on-accent' : ''}`}
        >
          Liste
        </button>
        <button
          type="button"
          onClick={() => setTab('categorized')}
          className={`rounded border px-3 py-1 text-sm ${tab === 'categorized' ? 'bg-accent text-text-on-accent' : ''}`}
        >
          Kategorien
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
            <div key={name} className="rounded border p-3">
              <div className="mb-2 flex items-center justify-between">
                <Input
                  label="Kategorie"
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
                  onClick={() => removeCategory(name)}
                  aria-label={`Kategorie ${name} löschen`}
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
          <button
            type="button"
            onClick={addCategory}
            className="rounded border border-dashed p-2 text-sm hover:bg-surface"
          >
            + Kategorie hinzufügen
          </button>
        </div>
      )}
    </fieldset>
  );
}
