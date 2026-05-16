import { useEffect } from 'react';

/**
 * Closes a modal/popover when the user presses Escape.
 *
 * Extracted from the duplicated `document.addEventListener('keydown', ...)` blocks
 * in CommandPalette and Popover (cleancode-web #12). Attach to any component that
 * has an `open` boolean and an `onClose` callback.
 */
export function useEscapeClose(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);
}
