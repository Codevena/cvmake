'use client';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

interface Props {
  state: SaveState;
  errorMessage?: string | undefined;
  onRetry?: (() => void) | undefined;
  lastSavedAt?: number | undefined; // epoch ms
  /**
   * True when the form is dirty but invalid, so autosave is intentionally on
   * hold. Lets the indicator avoid the misleading "auto-save in 2s" promise.
   */
  blockedInvalid?: boolean | undefined;
}

function relativeTime(t: number): string {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

export function SaveIndicator({
  state,
  errorMessage,
  onRetry,
  lastSavedAt,
  blockedInvalid,
}: Props) {
  // Refresh the "Saved Ns ago" relative time while idle — otherwise it is
  // computed once at render and freezes until something else re-renders.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (state !== 'clean' || !lastSavedAt) return;
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [state, lastSavedAt]);

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
      {state === 'dirty' &&
        (blockedInvalid ? (
          <span>• Unsaved — fix errors to save</span>
        ) : (
          <span>• Unsaved changes (auto-save in 2s)</span>
        ))}
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
