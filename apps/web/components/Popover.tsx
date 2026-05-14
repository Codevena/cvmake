'use client';
import { type ReactNode, useEffect, useRef, useState } from 'react';

interface Props {
  trigger: ReactNode;
  label: string;
  children: ReactNode;
}

export function Popover({ trigger, label, children }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-text-muted transition hover:bg-elevated hover:text-text aria-expanded:bg-elevated aria-expanded:text-accent"
      >
        {trigger}
      </button>
      {open && (
        // biome-ignore lint/a11y/useSemanticElements: a popover panel has no semantic HTML equivalent; role="dialog" is the correct ARIA pattern
        <div
          role="dialog"
          aria-label={label}
          className="absolute left-12 top-0 z-50 w-72 rounded-lg border border-border bg-surface p-4 shadow-card"
        >
          {children}
        </div>
      )}
    </div>
  );
}
