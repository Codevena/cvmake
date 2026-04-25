import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useHotkey } from './use-hotkey';

describe('useHotkey', () => {
  it('feuert bei mod+s (Cmd auf Mac, Ctrl sonst)', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('mod+s', handler));
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 's', metaKey: true });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('ignoriert s ohne mod', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('mod+s', handler));
    fireEvent.keyDown(window, { key: 's' });
    expect(handler).not.toHaveBeenCalled();
  });
});
