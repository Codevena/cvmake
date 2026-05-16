'use client';
// ConfirmDialog is provided by Agent 5 — import will resolve once that file lands.
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { track } from '@/lib/analytics';
import { cvRoute } from '@/lib/cv-route';
import { exportPdf } from '@/lib/export-pdf';
import type { CVData } from '@codevena/cvmake-schema';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { DownloadYamlButton } from './DownloadYamlButton';
import { SaveIndicator, type SaveState } from './SaveIndicator';

// C13 — humanise demo-CV picker labels so the headline bilingual capability
// is discoverable instead of being buried behind raw slugs (`example.en`,
// `example.de`).  Falls back to the slug for non-example CVs so the picker
// still works for the normal (non-demo) editor case.
const SLUG_LABELS: Record<string, string> = {
  'example.en': 'English example',
  'example.de': 'Deutsches Beispiel',
};

function slugLabel(slug: string): string {
  return SLUG_LABELS[slug] ?? slug;
}

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
  // C11: intercept CV switch in demo mode when there are unsaved changes.
  const [pendingSwitch, setPendingSwitch] = useState<{ targetSlug: string } | null>(null);

  function handleCvSwitch(newSlug: string) {
    if (newSlug === slug) return;
    if (isDemo && formState.isDirty) {
      setPendingSwitch({ targetSlug: newSlug });
    } else {
      track('editor.locale_switch', { from: slug, to: newSlug });
      router.push(cvRoute(newSlug, isDemo));
    }
  }

  async function handleExportPdf() {
    if (!formState.isValid || exporting) return;
    setExporting(true);
    const values = getValues();
    track('editor.export_pdf', {
      slug,
      template: values.rendering?.template,
      palette: values.rendering?.palette,
    });
    try {
      await exportPdf({ data: values, slug });
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {/* biome-ignore lint/a11y/noInteractiveElementToNoninteractiveRole: <header> gets implicit role="banner" only when it's a direct descendant of <body>; rendered inside the editor shell tree it falls back to role="generic". The explicit role="banner" restores the landmark for AT and keeps `getByRole('banner')` deterministic in tests. */}
      <header
        role="banner"
        className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4 backdrop-blur"
      >
        <div className="flex items-center gap-3">
          <span className="font-display italic text-accent text-lg">cvmake</span>
          <select
            aria-label="Select CV"
            value={slug}
            onChange={(e) => handleCvSwitch(e.target.value)}
            className="rounded-md border border-border bg-elevated px-2 py-1 text-sm text-text"
          >
            {allSlugs.map((s) => (
              <option key={s} value={s}>
                {slugLabel(s)}
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
      {/* C11: Confirm dialog shown when switching CVs in demo mode with unsaved changes */}
      <ConfirmDialog
        open={!!pendingSwitch}
        title="Discard unsaved changes?"
        message="Your local demo edits will be lost."
        confirmLabel="Discard"
        tone="danger"
        onConfirm={() => {
          if (pendingSwitch) {
            router.push(cvRoute(pendingSwitch.targetSlug, isDemo));
          }
          setPendingSwitch(null);
        }}
        onCancel={() => setPendingSwitch(null)}
      />
    </>
  );
}
