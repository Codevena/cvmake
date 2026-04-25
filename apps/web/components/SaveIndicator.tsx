'use client';
import clsx from 'clsx';

export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

interface Props {
  state: SaveState;
  errorMessage?: string | undefined;
  onRetry?: (() => void) | undefined;
  lastSavedAt?: number | undefined; // epoch ms
}

function relativeTime(t: number): string {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return `vor ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.round(m / 60);
  return `vor ${h} h`;
}

export function SaveIndicator({ state, errorMessage, onRetry, lastSavedAt }: Props) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 text-sm',
        state === 'error' && 'text-error',
        state === 'saved' && 'text-success',
      )}
    >
      {state === 'clean' && lastSavedAt && <span>✓ Gespeichert {relativeTime(lastSavedAt)}</span>}
      {state === 'clean' && !lastSavedAt && <span>✓ Keine Änderungen</span>}
      {state === 'dirty' && <span>• Ungespeicherte Änderungen</span>}
      {state === 'saving' && <span>⟳ Speichere…</span>}
      {state === 'saved' && <span>✓ Gespeichert</span>}
      {state === 'error' && (
        <>
          <span>⚠ {errorMessage ?? 'Fehler beim Speichern'}</span>
          {onRetry && (
            <button type="button" className="underline" onClick={onRetry}>
              Erneut versuchen
            </button>
          )}
        </>
      )}
    </div>
  );
}
