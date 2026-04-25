import { useEffect, useRef } from 'react';

export interface BulletListEditorProps {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  placeholder?: string;
  addLabel?: string;
  className?: string;
}

export function BulletListEditor(props: BulletListEditorProps): JSX.Element {
  const { value, onChange, label, placeholder = '', addLabel = 'Add bullet', className } = props;
  const newRowRef = useRef<HTMLInputElement | null>(null);
  const justAddedRef = useRef(false);

  useEffect(() => {
    if (justAddedRef.current && newRowRef.current) {
      newRowRef.current.focus();
      justAddedRef.current = false;
    }
  });

  const update = (idx: number, next: string): void => {
    const out = value.slice();
    out[idx] = next;
    onChange(out);
  };
  const remove = (idx: number): void => {
    onChange(value.filter((_, i) => i !== idx));
  };
  const move = (idx: number, dir: -1 | 1): void => {
    const target = idx + dir;
    if (target < 0 || target >= value.length) return;
    const a = value[idx];
    const b = value[target];
    if (a === undefined || b === undefined) return;
    const out = value.slice();
    out[idx] = b;
    out[target] = a;
    onChange(out);
  };
  const add = (): void => {
    justAddedRef.current = true;
    onChange([...value, '']);
  };

  const wrapperClass = ['flex flex-col gap-2', className].filter(Boolean).join(' ');

  return (
    <div className={wrapperClass}>
      {label && <span className="text-sm font-medium text-text">{label}</span>}
      <ul className="flex flex-col gap-2">
        {value.map((bullet, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: bullet list reorders by index
          <li key={idx} className="flex items-center gap-2">
            <input
              ref={idx === value.length - 1 ? newRowRef : undefined}
              type="text"
              value={bullet}
              aria-label={`Bullet ${idx + 1}`}
              placeholder={placeholder}
              onChange={(e) => update(idx, e.target.value)}
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="button"
              aria-label="Move up"
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              className="rounded-md border border-border px-2 py-1 text-sm disabled:opacity-40"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="Move down"
              onClick={() => move(idx, 1)}
              disabled={idx === value.length - 1}
              className="rounded-md border border-border px-2 py-1 text-sm disabled:opacity-40"
            >
              ↓
            </button>
            <button
              type="button"
              aria-label="Delete bullet"
              onClick={() => remove(idx)}
              className="rounded-md border border-border px-2 py-1 text-sm text-error"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={add}
        className="self-start rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-muted"
      >
        + {addLabel}
      </button>
    </div>
  );
}
