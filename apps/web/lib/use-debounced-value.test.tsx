import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('hält den initialen Wert sofort', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 100));
    expect(result.current).toBe('a');
  });

  it('verzögert Updates', () => {
    let value = 'a';
    const { result, rerender } = renderHook(() => useDebouncedValue(value, 100));
    value = 'b';
    rerender();
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(99);
    });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });
});
