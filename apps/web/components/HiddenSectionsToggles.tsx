'use client';
import type { CVData } from '@codevena/cvmake-schema';
import { Controller, useFormContext } from 'react-hook-form';

const TOGGLES: Array<{ id: string; label: string }> = [
  { id: 'summary', label: 'Profile' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'languages', label: 'Languages' },
];

export function HiddenSectionsToggles() {
  const { control } = useFormContext<CVData>();
  return (
    <Controller
      control={control}
      name="rendering.hiddenSections"
      render={({ field }) => {
        const hidden = new Set(field.value ?? []);
        return (
          <ul className="flex flex-col gap-1">
            {TOGGLES.map((t) => (
              <li key={t.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!hidden.has(t.id)}
                    onChange={(e) => {
                      const next = new Set(hidden);
                      if (e.target.checked) next.delete(t.id);
                      else next.add(t.id);
                      field.onChange([...next]);
                    }}
                  />
                  {t.label}
                </label>
              </li>
            ))}
          </ul>
        );
      }}
    />
  );
}
