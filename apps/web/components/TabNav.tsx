'use client';

export type TabId =
  | 'personal'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'custom'
  | 'summary';

const TABS: { id: TabId; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'languages', label: 'Languages' },
  { id: 'custom', label: 'Custom' },
  { id: 'summary', label: 'Summary' },
];

interface Props {
  active: TabId;
  onSelect: (id: TabId) => void;
}

export function TabNav({ active, onSelect }: Props) {
  return (
    <div
      role="tablist"
      aria-label="CV sections"
      // overflow-x-auto + whitespace-nowrap → on mobile the 7-tab strip
      // scrolls horizontally instead of wrapping or overflowing.
      className="flex shrink-0 gap-1 overflow-x-auto whitespace-nowrap border-b border-border px-4"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition ${
              isActive
                ? 'border-accent text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
