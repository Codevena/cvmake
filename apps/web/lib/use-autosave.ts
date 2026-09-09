'use client';
import type { SaveState } from '@/components/SaveIndicator';
import type { CVData } from '@codevena/cvmake-schema';
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
  // No `isDirty` here on purpose. It used to gate the save, and it is the
  // reason a revert was lost: react-hook-form compares against the values the
  // form was created with, so `M -> X -> M` reads clean while the disk still
  // holds `X`. Keeping it as an ignored option would invite a future reader to
  // wire it back in.
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
  /**
   * True when the current data differs from what the server last accepted.
   * Deliberately NOT react-hook-form's `isDirty`, which compares against the
   * values the form was created with: after `M -> X -> M` it reads false while
   * the disk still holds `X`.
   */
  hasUnsavedChanges: boolean;
  /**
   * Saves immediately, skipping the debounce, and reports whether the server
   * accepted it. Callers that navigate away need an answer to wait for, and
   * the fire-and-forget `save()` swallows every outcome into internal state.
   */
  saveNow: (payload: CVData) => Promise<boolean>;
  /**
   * Records that a conflict was resolved (reload or overwrite): both reference
   * points move to `data`, and `expectedMtime` to `mtime`. Without it the
   * effect would immediately write the freshly loaded server state back, and
   * `hasUnsavedChanges` would keep reporting work that no longer exists.
   */
  markResolved: (data: CVData, mtime: number) => void;
}

export function useAutosave(opts: UseAutosaveOpts): UseAutosaveReturn {
  const debounced = useDebouncedValue(opts.data, 2000);
  // Initialise to an empty sentinel so the first dirty payload triggers a save.
  // After a successful save we update this to the persisted serialisation; on
  // conflict/validation/server errors we also stamp it so the same payload is
  // not auto-retried in a loop (manual retry / new edit re-arms the path).
  // Two reference points, because they answer different questions.
  //
  // `lastAttemptedRef` is stamped on EVERY outcome including the failures, so a
  // payload the server rejected is not retried in a loop. It is what the
  // auto-save effect compares against.
  //
  // `lastPersistedRef` is stamped only when the server accepted the data (and
  // on conflict resolution). It is what `hasUnsavedChanges` compares against —
  // using the attempt marker there would report "nothing to save" right after a
  // failed save, which is exactly when the user must not navigate away.
  //
  // Both start from the data the page was loaded with: that IS the persisted
  // state, and starting the attempt marker empty would make the very first
  // render look like an unsaved change and fire a save nobody asked for.
  const lastAttemptedRef = useRef<string>(JSON.stringify(opts.data));
  const lastPersistedRef = useRef<string>(JSON.stringify(opts.data));
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

  const save = useCallback(async (payload: CVData): Promise<boolean> => {
    const current = optsRef.current;
    if (current.paused) return false;
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
        lastAttemptedRef.current = JSON.stringify(payload);
        current.onConflict({ currentData: body.currentData, currentMtime: body.currentMtime });
        setState('error');
        setErrorMessage('Conflict: file changed externally');
        return false;
      }
      if (res.status === 422) {
        const body = (await res.json()) as { issues?: unknown[] };
        lastAttemptedRef.current = JSON.stringify(payload);
        current.onError({ kind: 'validation', issues: body.issues ?? [] });
        setState('error');
        setErrorMessage('Validation error');
        return false;
      }
      if (!res.ok) {
        const text = await res.text();
        lastAttemptedRef.current = JSON.stringify(payload);
        current.onError({ kind: 'server', message: text });
        setState('error');
        setErrorMessage(`HTTP ${res.status}`);
        return false;
      }
      const body = (await res.json()) as { mtime: number };
      expectedMtimeRef.current = body.mtime;
      lastAttemptedRef.current = JSON.stringify(payload);
      lastPersistedRef.current = JSON.stringify(payload);
      setLastSavedAt(Date.now());
      setState('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setState('clean'), 3000);
      return true;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return false;
      lastAttemptedRef.current = JSON.stringify(payload);
      current.onError({ kind: 'network', message: (err as Error).message });
      setState('error');
      setErrorMessage((err as Error).message);
      return false;
    }
  }, []);

  // Debounced auto-save.
  //
  // Deliberately NOT gated on `isDirty`: that compares against the values the
  // form was created with, so returning a field to its original value reads as
  // clean while the server still holds the intermediate one. The attempt marker
  // is the right reference — a revert differs from what was last SENT.
  useEffect(() => {
    if (!opts.isValid || opts.paused) return;
    const ser = JSON.stringify(debounced);
    if (ser === lastAttemptedRef.current) return;
    // Never send a payload the debounce has already been overtaken by. A
    // conflict reload, a form reset or simply fast typing moves `opts.data` on
    // while `debounced` still carries the previous value; sending it would
    // write back something the user has already left behind — measurably, the
    // changes they just discarded in the conflict dialog.
    if (ser !== JSON.stringify(opts.data)) return;
    void save(debounced);
  }, [debounced, opts.data, opts.isValid, opts.paused, save]);

  // Mark dirty in indicator while typing
  useEffect(() => {
    if (state === 'saving' || state === 'error') return;
    const ser = JSON.stringify(opts.data);
    if (ser !== lastAttemptedRef.current) setState('dirty');
  }, [opts.data, state]);

  // Ctrl+S / Cmd+S override
  // No equality check here on purpose. Cmd+S is an explicit command, and after
  // a failed save the attempt marker already carries this exact payload — an
  // equality check would silently turn the manual retry into a no-op.
  useHotkey('mod+s', () => {
    if (opts.isValid) void save(opts.data);
  });

  const retry = useCallback(() => {
    void save(optsRef.current.data);
  }, [save]);

  const saveNow = useCallback((payload: CVData) => save(payload), [save]);

  const markResolved = useCallback((data: CVData, mtime: number) => {
    const ser = JSON.stringify(data);
    lastAttemptedRef.current = ser;
    lastPersistedRef.current = ser;
    expectedMtimeRef.current = mtime;
  }, []);

  const hasUnsavedChanges = JSON.stringify(opts.data) !== lastPersistedRef.current;

  // Clear any pending "saved → clean" timer on unmount to avoid setting
  // state on an unmounted component (and to keep timers tidy in tests).
  useEffect(
    () => () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    },
    [],
  );

  return {
    state,
    errorMessage,
    lastSavedAt,
    expectedMtimeRef,
    retry,
    hasUnsavedChanges,
    saveNow,
    markResolved,
  };
}
