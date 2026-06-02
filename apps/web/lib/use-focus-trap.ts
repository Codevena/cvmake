import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'details',
  'embed',
  'iframe',
  'input:not([disabled])',
  'object',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
    (el) => !el.closest('[hidden]') && el.tabIndex !== -1,
  );
}

/**
 * Traps keyboard focus inside a modal container while `open` is true.
 *
 * Usage:
 *   const trapRef = useFocusTrap(open);
 *   return <div ref={trapRef} role="dialog">…</div>;
 *
 * On mount (when open transitions to true):
 *   - Saves `document.activeElement` as `previouslyFocused`.
 *   - Focuses the first focusable child inside the container.
 * On Tab / Shift+Tab:
 *   - Wraps focus within the container's focusable children.
 * On unmount (when open transitions to false):
 *   - Returns focus to `previouslyFocused`.
 *
 * Pattern based on the Reach UI / Radix focus-trap convention (no external dep).
 *
 * Stacked modals: a module-level stack ensures only the TOPMOST open trap
 * handles Tab — otherwise two traps listening on `document` simultaneously
 * fight over Tab wrapping and focus restoration.
 */
const trapStack: symbol[] = [];

export function useFocusTrap(open: boolean): RefObject<HTMLDivElement> {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);
  const idRef = useRef<symbol | null>(null);
  if (idRef.current === null) idRef.current = Symbol('focus-trap');

  useEffect(() => {
    if (!open) return;
    const id = idRef.current as symbol;

    // Capture the element that had focus before the modal opened.
    previouslyFocused.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Register as the current topmost trap.
    trapStack.push(id);

    // Focus the first focusable child (e.g. Close button).
    const focusable = getFocusableElements(container);
    const firstFocusable = focusable[0];
    if (firstFocusable !== undefined) {
      firstFocusable.focus();
    } else {
      // Fallback: focus the container itself so Escape works.
      container.setAttribute('tabindex', '-1');
      container.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only the topmost trap manages Tab so stacked modals don't conflict.
      if (trapStack[trapStack.length - 1] !== id) return;
      if (e.key !== 'Tab') return;

      const elements = getFocusableElements(container);
      if (elements.length === 0) {
        e.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        // Shift+Tab: wrap from first → last
        if (last !== undefined && (active === first || !container.contains(active))) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: wrap from last → first
        if (first !== undefined && (active === last || !container.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Unregister from the trap stack.
      const idx = trapStack.lastIndexOf(id);
      if (idx !== -1) trapStack.splice(idx, 1);
      // Restore focus to the element that was active before the modal opened.
      const prev = previouslyFocused.current;
      if (prev && 'focus' in prev && typeof (prev as HTMLElement).focus === 'function') {
        (prev as HTMLElement).focus();
      }
    };
  }, [open]);

  return containerRef;
}
