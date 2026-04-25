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
