'use client';
import type { SaveState } from '@/components/SaveIndicator';
import type { CVData } from '@codevena/forq-schema';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from './use-debounced-value';
import { useHotkey } from './use-hotkey';

export type ConflictPayload = { currentData: CVData; currentMtime: number };
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
        const body = (await res.json()) as { currentData: CVData; currentMtime: number };
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
      setTimeout(() => setState('clean'), 3000);
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

  return { state, errorMessage, lastSavedAt, expectedMtimeRef, retry };
}
