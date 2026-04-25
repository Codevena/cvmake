'use client';
import type { CVData } from '@codevena/forq-schema';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { SaveIndicator, type SaveState } from './SaveIndicator';

interface Props {
  slug: string;
  allSlugs: string[];
  saveState: SaveState;
  saveError?: string | undefined;
  onRetry: () => void;
  lastSavedAt?: number | undefined;
}

export function TopBar({ slug, allSlugs, saveState, saveError, onRetry, lastSavedAt }: Props) {
  const { getValues, formState } = useFormContext<CVData>();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    if (!formState.isValid || exporting) return;
    setExporting(true);
    try {
      const data = getValues();
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          data,
          templateId: data.rendering.template,
          paletteId: data.rendering.palette,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}-${data.rendering.template}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    // biome-ignore lint/a11y/noInteractiveElementToNoninteractiveRole: explicit banner landmark for testability
    <header
      role="banner"
      className="flex h-12 shrink-0 items-center justify-between gap-4 border-b px-4"
    >
      <div className="flex items-center gap-3">
        <span className="font-semibold">forq</span>
        <select
          aria-label="CV auswählen"
          value={slug}
          onChange={(e) => router.push(`/cv/${e.target.value}`)}
          className="rounded border bg-surface px-2 py-1 text-sm"
        >
          {allSlugs.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <SaveIndicator
        state={saveState}
        errorMessage={saveError}
        onRetry={onRetry}
        lastSavedAt={lastSavedAt}
      />
      <button
        type="button"
        disabled={!formState.isValid || exporting}
        onClick={exportPdf}
        className="rounded bg-accent px-3 py-1 text-sm text-text-on-accent disabled:opacity-50"
      >
        {exporting ? 'Export…' : 'PDF exportieren'}
      </button>
    </header>
  );
}
