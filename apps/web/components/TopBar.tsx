'use client';
import { cvRoute } from '@/lib/cv-route';
import { exportPdf } from '@/lib/export-pdf';
import type { CVData } from '@codevena/cvmake-schema';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { DownloadYamlButton } from './DownloadYamlButton';
import { SaveIndicator, type SaveState } from './SaveIndicator';

interface Props {
  slug: string;
  allSlugs: string[];
  saveState: SaveState;
  saveError?: string | undefined;
  onRetry: () => void;
  lastSavedAt?: number | undefined;
  onOpenPalette: () => void;
  isDemo: boolean;
}

export function TopBar({
  slug,
  allSlugs,
  saveState,
  saveError,
  onRetry,
  lastSavedAt,
  onOpenPalette,
  isDemo,
}: Props) {
  const { getValues, formState } = useFormContext<CVData>();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  async function handleExportPdf() {
    if (!formState.isValid || exporting) return;
    setExporting(true);
    try {
      await exportPdf({ data: getValues(), slug });
    } finally {
      setExporting(false);
    }
  }

  return (
    // biome-ignore lint/a11y/noInteractiveElementToNoninteractiveRole: explicit banner landmark for testability
    <header
      role="banner"
      className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4 backdrop-blur"
    >
      <div className="flex items-center gap-3">
        <span className="font-display italic text-accent text-lg">cvmake</span>
        <select
          aria-label="Select CV"
          value={slug}
          onChange={(e) => router.push(cvRoute(e.target.value, isDemo))}
          className="rounded-md border border-border bg-elevated px-2 py-1 text-sm text-text"
        >
          {allSlugs.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Open command palette"
          className="flex items-center gap-1 rounded-md bg-elevated px-2 py-1 text-xs text-text-muted"
        >
          <kbd className="font-mono">⌘K</kbd>
        </button>
        {!isDemo && (
          <SaveIndicator
            state={saveState}
            errorMessage={saveError}
            onRetry={onRetry}
            lastSavedAt={lastSavedAt}
          />
        )}
        {isDemo && <DownloadYamlButton getData={getValues} slug={slug} />}
        <button
          type="button"
          disabled={!formState.isValid || exporting}
          onClick={handleExportPdf}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-bg transition hover:-translate-y-0.5 hover:bg-accent-hover disabled:opacity-50"
        >
          {exporting ? 'Export…' : 'Export PDF'}
        </button>
      </div>
    </header>
  );
}
