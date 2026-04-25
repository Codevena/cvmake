export interface TemplateCardProps {
  templateId: string;
  name: string;
  description?: string;
  thumbnailSrc?: string;
  selected: boolean;
  onSelect: (templateId: string) => void;
  className?: string;
}

export function TemplateCard(props: TemplateCardProps): JSX.Element {
  const { templateId, name, description, thumbnailSrc, selected, onSelect, className } = props;
  const wrapperClass = [
    'flex flex-col overflow-hidden rounded-lg border bg-surface text-left shadow-card',
    selected ? 'border-accent ring-2 ring-accent' : 'border-border',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      // biome-ignore lint/a11y/useSemanticElements: template card needs richer content than <input type="radio"> allows
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(templateId)}
      className={wrapperClass}
    >
      <div className="aspect-[3/4] w-full bg-surface-muted">
        {thumbnailSrc ? (
          <img src={thumbnailSrc} alt={`${name} preview`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-text-muted">
            no preview
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <span className="text-sm font-medium text-text">{name}</span>
        {description && <span className="text-xs text-text-muted">{description}</span>}
      </div>
    </button>
  );
}
