'use client';
import { useEscapeClose } from '@/lib/use-escape-close';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { type ReactNode, useEffect, useRef, useState } from 'react';

interface Props {
  trigger: ReactNode;
  label: string;
  children: ReactNode;
}

export function Popover({ trigger, label, children }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // H15: trap focus inside the dialog panel + restore focus to the trigger
  // on close.  The panel contains interactive grids (template picker, palette
  // picker) so trap-while-open is the right behaviour, not just escape-close.
  const panelRef = useFocusTrap(open);

  // Replaces the inline Escape keydown listener; click-outside stays inline.
  useEscapeClose(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-text-muted transition hover:bg-elevated hover:text-text aria-expanded:bg-elevated aria-expanded:text-accent"
      >
        {trigger}
      </button>
      {open && (
        // biome-ignore lint/a11y/useSemanticElements: a popover panel has no semantic HTML equivalent; role="dialog" is the correct ARIA pattern
        <div
          role="dialog"
          ref={panelRef}
          aria-label={label}
          className="absolute left-12 top-0 z-50 w-72 rounded-lg border border-border bg-surface p-4 shadow-card"
        >
          {children}
        </div>
      )}
    </div>
  );
}
