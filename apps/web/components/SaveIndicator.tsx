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
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
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
      {state === 'clean' && lastSavedAt && <span>✓ Saved {relativeTime(lastSavedAt)}</span>}
      {state === 'clean' && !lastSavedAt && <span>✓ No changes</span>}
      {state === 'dirty' && <span>• Unsaved changes (auto-save in 2s)</span>}
      {state === 'saving' && <span>⟳ Saving…</span>}
      {state === 'saved' && <span>✓ Saved</span>}
      {state === 'error' && (
        <>
          <span>⚠ {errorMessage ?? 'Error saving'}</span>
          {onRetry && (
            <button type="button" className="underline" onClick={onRetry}>
              Retry
            </button>
          )}
        </>
      )}
    </div>
  );
}
