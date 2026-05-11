'use client';
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
  const reloadDisabledTitle = fileDeleted ? 'Datei existiert nicht mehr' : undefined;
  return (
    // biome-ignore lint/a11y/useSemanticElements: native <dialog> requires showModal()/close() imperative APIs; explicit role="dialog" on a controlled overlay is the React-friendly pattern here
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="max-w-lg rounded bg-surface p-6 text-text shadow-xl">
        <h2 id="conflict-title" className="text-lg font-semibold">
          {fileDeleted ? 'Datei wurde extern gelöscht' : 'Datei wurde extern verändert'}
        </h2>
        {fileDeleted ? (
          <p className="mt-2 text-sm">
            Die YAML-Datei <code>data/cvs/{slug}.yaml</code> wurde extern <strong>gelöscht</strong>.
            Was möchtest du tun?
          </p>
        ) : (
          <p className="mt-2 text-sm">
            Die YAML-Datei <code>data/cvs/{slug}.yaml</code> wurde seit dem Laden geändert (z. B.
            via <code>git pull</code> oder einem anderen Editor). Was möchtest du tun?
          </p>
        )}
        {confirmReload ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm text-error">
              Achtung: deine ungespeicherten Editor-Änderungen gehen verloren. Wirklich neu laden?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={fileDeleted}
                title={reloadDisabledTitle}
                className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  if (!currentData) return;
                  onReload(currentData, currentMtime);
                }}
              >
                Ja, neu laden
              </button>
              <button
                type="button"
                className="rounded border px-3 py-1"
                onClick={() => setConfirmReload(false)}
              >
                Doch nicht
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={fileDeleted}
              title={reloadDisabledTitle}
              className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                if (!currentData) return;
                if (isFormDirty) setConfirmReload(true);
                else onReload(currentData, currentMtime);
              }}
            >
              Datenträger neu laden
            </button>
            <button
              type="button"
              className="rounded border px-3 py-1"
              onClick={() => onOverwrite(currentMtime)}
            >
              Meine Version überschreiben
            </button>
            <button type="button" className="rounded border px-3 py-1" onClick={onCancel}>
              Abbrechen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
