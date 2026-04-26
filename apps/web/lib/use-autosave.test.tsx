import type { CVData } from '@codevena/forq-schema';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutosave } from './use-autosave';

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('löst nach 2s einen save aus, bei 200 → expectedMtime updated', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ ok: true, mtime: 99 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const onConflict = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useAutosave({
        slug: 'cv.de',
        data: DATA,
        isDirty: true,
        isValid: true,
        expectedMtime: 1,
        onConflict,
        onError,
        paused: false,
      }),
    );
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(result.current.expectedMtimeRef.current).toBe(99));
  });

  it('zweiter Save innerhalb 3s setzt state nicht stale auf clean', async () => {
    // Reproduces the setTimeout(3000) clobber: if a stale "saved → clean"
    // timer from the first save is allowed to fire after a second save
    // started, the indicator flips to `clean` even though the second save
    // is still in-flight (or already showed `saved`). After the fix the
    // first timer is cleared when the second save schedules its own.
    let mtimeCounter = 100;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ ok: true, mtime: mtimeCounter++ }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const { result, rerender } = renderHook(
      ({ data }: { data: CVData }) =>
        useAutosave({
          slug: 'cv.de',
          data,
          isDirty: true,
          isValid: true,
          expectedMtime: 1,
          onConflict: vi.fn(),
          onError: vi.fn(),
          paused: false,
        }),
      { initialProps: { data: DATA } },
    );
    // First save fires after 2s debounce, completes, schedules clean@+3s.
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    await waitFor(() => expect(result.current.expectedMtimeRef.current).toBe(100));
    // Edit again before the 3s clean timer fires.
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    rerender({ data: { ...DATA, personal: { ...DATA.personal, firstName: 'Edit2' } } });
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    await waitFor(() => expect(result.current.expectedMtimeRef.current).toBe(101));
    // Now advance past where the FIRST stale timer would have fired (3s after
    // first save): state must NOT be clobbered to 'clean' by the stale timer.
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    // The fresh timer for the second save is the only one allowed to flip
    // state — it fires 3s after the second save's success.
    expect(result.current.state).toBe('saved');
  });

  it('langsamer zweiter Save: stale clean-Timer überschreibt nicht den saving-State', async () => {
    // Simulates the delayed-save scenario: the first save resolves quickly
    // and schedules a 3s "saved → clean" timer. Then a second save starts
    // before that timer fires but its network response is delayed past the
    // 3s mark. Without the START-of-save clear, the stale clean timer fires
    // while the second save is still in 'saving', clobbering the indicator
    // back to 'clean'. After the fix the stale timer is cleared up-front.
    let resolveSecond: ((res: Response) => void) | null = null;
    let callIndex = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      const idx = callIndex++;
      if (idx === 0) {
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true, mtime: 200 }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      // Second call: keep open until we resolve manually so we can advance
      // past the 3s stale-timer mark while the request is in-flight.
      return new Promise<Response>((resolve) => {
        resolveSecond = resolve;
      });
    });
    const { result, rerender } = renderHook(
      ({ data }: { data: CVData }) =>
        useAutosave({
          slug: 'cv.de',
          data,
          isDirty: true,
          isValid: true,
          expectedMtime: 1,
          onConflict: vi.fn(),
          onError: vi.fn(),
          paused: false,
        }),
      { initialProps: { data: DATA } },
    );
    // T=0..2.1s: First save fires after 2s debounce, resolves immediately,
    // sets state='saved' and schedules the 3s clean timer (fires at T=5.1s).
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    await waitFor(() => expect(result.current.expectedMtimeRef.current).toBe(200));
    expect(result.current.state).toBe('saved');
    // T=2.6s: Edit again, well within the 3s clean window. Debounce schedules
    // the second save for T=4.6s — BEFORE the T=5.1s stale clean timer.
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    rerender({ data: { ...DATA, personal: { ...DATA.personal, firstName: 'Slow' } } });
    // T=2.6 → 4.7s: debounce fires, save() runs, clears the stale timer at
    // the START (the fix), then setState('saving') and awaits the never-
    // resolving fetch. Without the fix the T=5.1s stale timer would later
    // fire during that wait and clobber state back to 'clean'.
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(result.current.state).toBe('saving');
    // T=4.7 → 7.7s: advance well past the original T=5.1s clean timer.
    // With the fix the timer was cleared at start-of-save, so nothing fires.
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    // Second save still in-flight → must remain 'saving', NEVER 'clean'.
    expect(result.current.state).toBe('saving');
    // Resolve the second save and verify state moves to 'saved'.
    await act(async () => {
      resolveSecond?.(
        new Response(JSON.stringify({ ok: true, mtime: 201 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    });
    await waitFor(() => expect(result.current.expectedMtimeRef.current).toBe(201));
    expect(result.current.state).toBe('saved');
  });

  it('bei 409 → onConflict mit currentData', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ kind: 'conflict', currentData: DATA, currentMtime: 555 }), {
          status: 409,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const onConflict = vi.fn();
    renderHook(() =>
      useAutosave({
        slug: 'cv.de',
        data: DATA,
        isDirty: true,
        isValid: true,
        expectedMtime: 1,
        onConflict,
        onError: vi.fn(),
        paused: false,
      }),
    );
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(onConflict).toHaveBeenCalledWith({ currentData: DATA, currentMtime: 555 }),
    );
  });
});
