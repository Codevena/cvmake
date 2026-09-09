import type { CVData } from '@codevena/cvmake-schema';
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

// The hook now saves when the data differs from what was last SENT, not when
// react-hook-form calls the form dirty. Mounting with untouched data must
// therefore produce no request at all — these tests hand it a genuinely
// changed document instead of only flipping `isDirty`.
const EDITED: CVData = {
  ...DATA,
  personal: { ...DATA.personal, firstName: 'Changed' },
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
    const { result, rerender } = renderHook(
      ({ data }: { data: CVData }) =>
        useAutosave({
          slug: 'cv.de',
          data,
          isValid: true,
          expectedMtime: 1,
          onConflict,
          onError,
          paused: false,
        }),
      { initialProps: { data: DATA } },
    );
    rerender({ data: EDITED });
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
          isValid: true,
          expectedMtime: 1,
          onConflict: vi.fn(),
          onError: vi.fn(),
          paused: false,
        }),
      { initialProps: { data: DATA } },
    );
    // A real edit, not just a dirty flag: the hook compares against what was
    // last sent, so mounting with untouched data produces no request.
    rerender({ data: EDITED });
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
          isValid: true,
          expectedMtime: 1,
          onConflict: vi.fn(),
          onError: vi.fn(),
          paused: false,
        }),
      { initialProps: { data: DATA } },
    );
    // A real edit, not just a dirty flag — see the note above EDITED.
    rerender({ data: EDITED });
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
    const { rerender } = renderHook(
      ({ data }: { data: CVData }) =>
        useAutosave({
          slug: 'cv.de',
          data,
          isValid: true,
          expectedMtime: 1,
          onConflict,
          onError: vi.fn(),
          paused: false,
        }),
      { initialProps: { data: DATA } },
    );
    rerender({ data: EDITED });
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(onConflict).toHaveBeenCalledWith({ currentData: DATA, currentMtime: 555 }),
    );
  });
});

describe('useAutosave — what the persisted state is measured against', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mount(overrides: Partial<Parameters<typeof useAutosave>[0]> = {}) {
    const onConflict = vi.fn();
    const onError = vi.fn();
    const view = renderHook(
      ({ data }: { data: CVData }) =>
        useAutosave({
          slug: 'cv.de',
          data,
          isValid: true,
          expectedMtime: 1,
          onConflict,
          onError,
          paused: false,
          ...overrides,
        }),
      { initialProps: { data: DATA } },
    );
    return { ...view, onConflict, onError };
  }

  const withName = (name: string): CVData => ({
    ...DATA,
    personal: { ...DATA.personal, firstName: name },
  });

  function bodiesOf(mock: { mock: { calls: unknown[][] } }): string[] {
    return mock.mock.calls.map((c) => {
      const init = c[1] as RequestInit;
      return JSON.parse(String(init.body)).data.personal.firstName as string;
    });
  }

  async function tick() {
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
  }

  it('saves a revert, which react-hook-form calls clean', async () => {
    // M -> X is saved; returning to M made react-hook-form report the form as
    // clean, and the old code bailed out there — leaving X on disk while the
    // editor showed M.
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ mtime: 2 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const { rerender } = mount();
    rerender({ data: withName('X') });
    await tick();
    await waitFor(() => expect(bodiesOf(fetchMock)).toEqual(['X']));
    // This is the moment react-hook-form would call the form clean: the value
    // is back to what it was created with. The hook no longer takes `isDirty`
    // at all — it compares the serialised document against what the server
    // last accepted — so what has to be saved here is a document that is
    // identical to the one loaded and different from the one on disk.
    rerender({ data: withName('M') });
    await tick();
    await waitFor(() => expect(bodiesOf(fetchMock)).toEqual(['X', 'M']));
  });

  it('does not save on mount when nothing was touched', async () => {
    // The counter-probe. Both reference points start from the loaded data, so
    // opening the editor must be silent.
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    mount();
    await tick();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still reports unsaved changes after a failed save', async () => {
    // The dangerous case: the attempt marker is stamped on failure too, so
    // comparing against it would say "clean" exactly when the work exists only
    // in memory and the user must not be allowed to navigate away.
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response('boom', { status: 500 }),
    );
    const { result, rerender } = mount();
    rerender({ data: withName('X') });
    await tick();
    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('lets Cmd+S retry the exact payload that just failed', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response('boom', { status: 500 }));
    const { result, rerender } = mount();
    rerender({ data: withName('X') });
    await tick();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    // Through the real key handler, not through saveNow: the hotkey is where
    // the equality check used to sit, and an equality check there would find
    // the attempt marker already holding this payload and do nothing — the
    // manual retry would be silently dead.
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true }),
      );
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('reports whether the server accepted the data', async () => {
    const responses = [
      new Response(JSON.stringify({ mtime: 3 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
      new Response(JSON.stringify({ issues: [] }), {
        status: 422,
        headers: { 'content-type': 'application/json' },
      }),
    ];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => responses.shift() as Response);
    const { result } = mount();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.saveNow(withName('A'));
    });
    expect(ok).toBe(true);
    await act(async () => {
      ok = await result.current.saveNow(withName('B'));
    });
    expect(ok).toBe(false);
  });

  it('does not write the discarded changes back after a conflict reload', async () => {
    // Measured failure without the settled guard: ["X","X","SERVER"] — the
    // second X is the edit the user just threw away in the conflict dialog.
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ kind: 'conflict', currentData: DATA, currentMtime: 7 }), {
          status: 409,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const { result, rerender } = mount();
    rerender({ data: withName('X') });
    await tick();
    await waitFor(() => expect(bodiesOf(fetchMock)).toEqual(['X']));

    // The user picks "reload": the shell resets the form and tells the hook.
    const server = withName('SERVER');
    act(() => result.current.markResolved(server, 7));
    rerender({ data: server });
    await tick();
    expect(bodiesOf(fetchMock)).toEqual(['X']);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });
});
