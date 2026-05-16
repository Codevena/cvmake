'use client';
import { useEscapeClose } from '@/lib/use-escape-close';
import { useFocusTrap } from '@/lib/use-focus-trap';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' renders the confirm button in a destructive red style */
  tone?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Lightweight confirm dialog modeled after ConflictModal's visual language.
 * - Closes on Escape (via useEscapeClose), backdrop click, or Cancel button.
 * - Traps Tab inside the dialog and restores focus to the trigger on close
 *   (via useFocusTrap — addresses the codex-A WARN about missing focus trap).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}: Props) {
  useEscapeClose(open, onCancel);
  const trapRef = useFocusTrap(open);

  if (!open) return null;

  const confirmBtnClass =
    tone === 'danger'
      ? 'rounded border border-error bg-error px-3 py-1 text-sm text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
      : 'rounded border border-border px-3 py-1 text-sm hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50';

  return (
    // biome-ignore lint/a11y/useSemanticElements: native <dialog> requires showModal()/close() imperative APIs; explicit role="dialog" on a controlled overlay is the React-friendly pattern here
    <div
      role="dialog"
      ref={trapRef}
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80"
      // Close on backdrop click (but not on clicks inside the panel).
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="max-w-sm rounded border border-border bg-surface p-6 text-text shadow-card">
        <h2 id="confirm-dialog-title" className="text-base font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm text-text-muted">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded border border-border px-3 py-1 text-sm hover:bg-elevated"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button type="button" className={confirmBtnClass} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
