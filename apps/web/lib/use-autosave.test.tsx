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
