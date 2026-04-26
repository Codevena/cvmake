'use client';
import type { SaveState } from '@/components/SaveIndicator';
import type { CVData } from '@codevena/forq-schema';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from './use-debounced-value';
import { useHotkey } from './use-hotkey';

// `currentData: null` represents the "file deleted externally" case where the
// server returns 409 because the file is missing on disk. The conflict modal
// must handle this distinctly — Reload is impossible (no data to reload to),
// only Overwrite (re-create) and Cancel are valid actions.
export type ConflictPayload = { currentData: CVData | null; currentMtime: number };
export type ServerError =
  | { kind: 'validation'; issues: unknown[] }
  | { kind: 'server' | 'network'; message: string };

export interface UseAutosaveOpts {
  slug: string;
  data: CVData;
  isDirty: boolean;
  isValid: boolean;
  expectedMtime: number;
  onConflict: (p: ConflictPayload) => void;
  onError: (e: ServerError) => void;
  paused: boolean;
}

export interface UseAutosaveReturn {
  state: SaveState;
  errorMessage: string | undefined;
  lastSavedAt: number | undefined;
  expectedMtimeRef: React.MutableRefObject<number>;
  retry: () => void;
}

export function useAutosave(opts: UseAutosaveOpts): UseAutosaveReturn {
  const debounced = useDebouncedValue(opts.data, 2000);
  // Initialise to an empty sentinel so the first dirty payload triggers a save.
  // After a successful save we update this to the persisted serialisation; on
  // conflict/validation/server errors we also stamp it so the same payload is
  // not auto-retried in a loop (manual retry / new edit re-arms the path).
  const lastSerializedRef = useRef<string>('');
  const expectedMtimeRef = useRef<number>(opts.expectedMtime);
  const inFlightRef = useRef<AbortController | null>(null);
  // Tracks the pending "saved → clean" transition timer so that a subsequent
  // save can cancel it before scheduling a new one. Without this, a stale 3s
  // timer from an earlier save can fire while the next edit is in-flight and
  // clobber the new state (`saving` / `dirty`) back to `clean`.
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<SaveState>('clean');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined);

  // Keep latest opts (callbacks, slug, paused, etc.) accessible from the
  // stable `save` closure without forcing the callback identity to change on
  // every render — that previously caused the auto-save effect to fire
  // repeatedly after the first response.
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  const save = useCallback(async (payload: CVData) => {
    const current = optsRef.current;
    if (current.paused) return;
    // Clear any pending "saved → clean" timer at the START — before the
    // await — so a stale timer from the previous save can never fire during
    // the new save's `'saving'` state and clobber it back to `'clean'`.
    // Without this, a slow second save (>3s) would briefly flash 'clean'
    // while still in-flight.
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
    inFlightRef.current?.abort();
    const ctrl = new AbortController();
    inFlightRef.current = ctrl;
    setState('saving');
    setErrorMessage(undefined);
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: current.slug,
          data: payload,
          expectedMtime: expectedMtimeRef.current,
        }),
      });
      if (res.status === 409) {
        const body = (await res.json()) as { currentData: CVData | null; currentMtime: number };
        // Stamp lastSerialized so the auto-save effect does not loop on the
        // same payload while the conflict modal is being resolved.
        lastSerializedRef.current = JSON.stringify(payload);
        current.onConflict({ currentData: body.currentData, currentMtime: body.currentMtime });
        setState('error');
        setErrorMessage('Konflikt: Datei extern verändert');
        return;
      }
      if (res.status === 422) {
        const body = (await res.json()) as { issues?: unknown[] };
        lastSerializedRef.current = JSON.stringify(payload);
        current.onError({ kind: 'validation', issues: body.issues ?? [] });
        setState('error');
        setErrorMessage('Validation-Fehler');
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        lastSerializedRef.current = JSON.stringify(payload);
        current.onError({ kind: 'server', message: text });
        setState('error');
        setErrorMessage(`HTTP ${res.status}`);
        return;
      }
      const body = (await res.json()) as { mtime: number };
      expectedMtimeRef.current = body.mtime;
      lastSerializedRef.current = JSON.stringify(payload);
      setLastSavedAt(Date.now());
      setState('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setState('clean'), 3000);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      lastSerializedRef.current = JSON.stringify(payload);
      current.onError({ kind: 'network', message: (err as Error).message });
      setState('error');
      setErrorMessage((err as Error).message);
    }
  }, []);

  // Debounced auto-save
  useEffect(() => {
    if (!opts.isDirty || !opts.isValid || opts.paused) return;
    const ser = JSON.stringify(debounced);
    if (ser === lastSerializedRef.current) return;
    void save(debounced);
  }, [debounced, opts.isDirty, opts.isValid, opts.paused, save]);

  // Mark dirty in indicator while typing
  useEffect(() => {
    if (state === 'saving' || state === 'error') return;
    const ser = JSON.stringify(opts.data);
    if (opts.isDirty && ser !== lastSerializedRef.current) setState('dirty');
  }, [opts.data, opts.isDirty, state]);

  // Ctrl+S / Cmd+S override
  useHotkey('mod+s', () => {
    if (opts.isDirty && opts.isValid) void save(opts.data);
  });

  const retry = useCallback(() => {
    void save(optsRef.current.data);
  }, [save]);

  // Clear any pending "saved → clean" timer on unmount to avoid setting
  // state on an unmounted component (and to keep timers tidy in tests).
  useEffect(
    () => () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    },
    [],
  );

  return { state, errorMessage, lastSavedAt, expectedMtimeRef, retry };
}
