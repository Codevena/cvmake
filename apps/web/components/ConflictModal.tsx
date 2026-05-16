'use client';
import { useEscapeClose } from '@/lib/use-escape-close';
import { useFocusTrap } from '@/lib/use-focus-trap';
import type { CVData } from '@codevena/cvmake-schema';
import { useState } from 'react';

interface Props {
  slug: string;
  // `null` signals the file was deleted externally — Reload is then impossible
  // (there is no on-disk version to reload to). Overwrite still works (it
  // re-creates the file) and Cancel is always available.
  currentData: CVData | null;
  currentMtime: number;
  isFormDirty: boolean;
  onReload: (data: CVData, mtime: number) => void;
  onOverwrite: (mtime: number) => void;
  onCancel: () => void;
}

export function ConflictModal({
  slug,
  currentData,
  currentMtime,
  isFormDirty,
  onReload,
  onOverwrite,
  onCancel,
}: Props) {
  const [confirmReload, setConfirmReload] = useState(false);
  const fileDeleted = currentData === null;
  const reloadDisabledTitle = fileDeleted ? 'File no longer exists' : undefined;
  // Modal is always open when rendered — the parent controls mounting.
  useEscapeClose(true, onCancel);
  const trapRef = useFocusTrap(true);
  return (
    // biome-ignore lint/a11y/useSemanticElements: native <dialog> requires showModal()/close() imperative APIs; explicit role="dialog" on a controlled overlay is the React-friendly pattern here
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80"
    >
      <div
        ref={trapRef}
        className="max-w-lg rounded bg-surface border border-border p-6 text-text shadow-card"
      >
        <h2 id="conflict-title" className="text-lg font-semibold">
          {fileDeleted ? 'File was deleted externally' : 'File was modified externally'}
        </h2>
        {fileDeleted ? (
          <p className="mt-2 text-sm">
            The YAML file <code>data/cvs/{slug}.yaml</code> was <strong>deleted</strong> externally.
            What would you like to do?
          </p>
        ) : (
          <p className="mt-2 text-sm">
            The YAML file <code>data/cvs/{slug}.yaml</code> was modified since it was loaded (e.g.
            via <code>git pull</code> or another editor). What would you like to do?
          </p>
        )}
        {confirmReload ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm text-error">
              Warning: your unsaved editor changes will be lost. Really reload?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={fileDeleted}
                title={reloadDisabledTitle}
                className="rounded border border-border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  if (!currentData) return;
                  onReload(currentData, currentMtime);
                }}
              >
                Yes, reload
              </button>
              <button
                type="button"
                className="rounded border border-border px-3 py-1"
                onClick={() => setConfirmReload(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={fileDeleted}
              title={reloadDisabledTitle}
              className="rounded border border-border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                if (!currentData) return;
                if (isFormDirty) setConfirmReload(true);
                else onReload(currentData, currentMtime);
              }}
            >
              Reload from disk
            </button>
            <button
              type="button"
              className="rounded border border-border px-3 py-1"
              onClick={() => onOverwrite(currentMtime)}
            >
              Overwrite with my version
            </button>
            <button
              type="button"
              className="rounded border border-border px-3 py-1"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
