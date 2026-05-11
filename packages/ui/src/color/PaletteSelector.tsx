import type { ColorPalette } from '@codevena/cvmake-schema';

export interface PaletteSelectorProps {
  palettes: ColorPalette[];
  value: string;
  onChange: (paletteId: string) => void;
  className?: string;
}

export function PaletteSelector(props: PaletteSelectorProps): JSX.Element {
  const { palettes, value, onChange, className } = props;
  const wrapperClass = ['grid grid-cols-3 gap-2 md:grid-cols-5', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div role="radiogroup" className={wrapperClass}>
      {palettes.map((p) => {
        const selected = p.id === value;
        const buttonClass = [
          'flex flex-col items-stretch gap-1 rounded-md border bg-surface p-2 text-left text-xs',
          selected ? 'border-accent ring-2 ring-accent' : 'border-border',
        ].join(' ');
        return (
          <button
            key={p.id}
            type="button"
            // biome-ignore lint/a11y/useSemanticElements: visual palette tile needs richer content than <input type="radio"> allows
            role="radio"
            aria-checked={selected}
            aria-label={p.name}
            onClick={() => onChange(p.id)}
            className={buttonClass}
          >
            <span className="flex h-6 overflow-hidden rounded-sm">
              <span className="flex-1" style={{ backgroundColor: p.accent }} />
              <span className="flex-1" style={{ backgroundColor: p.background }} />
              <span className="flex-1" style={{ backgroundColor: p.text }} />
            </span>
            <span className="font-medium text-text">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}
