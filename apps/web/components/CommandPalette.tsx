'use client';
import { useEscapeClose } from '@/lib/use-escape-close';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { Command } from 'cmdk';
import type { TabId } from './TabNav';

export interface PaletteCommands {
  switchCv: (slug: string) => void;
  allSlugs: string[];
  switchTemplate: (id: string) => void;
  templateIds: string[];
  switchPalette: (id: string) => void;
  paletteIds: string[];
  jumpToSection: (id: TabId) => void;
  exportPdf: () => void;
  // Present only in demo mode — when set, the palette shows a
  // "Download YAML" action alongside "Export PDF".
  downloadYaml?: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommands;
}

const SECTIONS: TabId[] = [
  'personal',
  'experience',
  'education',
  'skills',
  'languages',
  'custom',
  'summary',
];

export function CommandPalette({ open, onClose, commands }: Props) {
  // Replaces the inline document.addEventListener('keydown', ...) Escape block.
  useEscapeClose(open, onClose);
  const trapRef = useFocusTrap(open);

  if (!open) return null;

  function run(fn: () => void) {
    fn();
    onClose();
  }

  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: overlay click is a pointer-only convenience; Escape-to-close is handled by the document keydown listener in the effect above */}
      <div
        className="fixed inset-0 z-50 flex items-start justify-center bg-bg/80 p-4 pt-[12vh]"
        onClick={onClose}
        role="presentation"
      >
        <div ref={trapRef} className="w-full max-w-lg">
          <Command
            label="Command palette"
            className="overflow-hidden rounded-lg border border-border bg-surface shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <Command.Input
              autoFocus
              placeholder="Type a command…"
              className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-text outline-none placeholder:text-text-subtle"
            />
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="px-3 py-6 text-center text-sm text-text-muted">
                No results.
              </Command.Empty>

              <Command.Group
                heading="Sections"
                className="px-2 py-1 text-xs uppercase tracking-wider text-text-subtle"
              >
                {SECTIONS.map((id) => (
                  <Command.Item
                    key={id}
                    onSelect={() => run(() => commands.jumpToSection(id))}
                    className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-elevated aria-selected:text-accent"
                  >
                    Go to {id.charAt(0).toUpperCase() + id.slice(1)}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group
                heading="Template"
                className="px-2 py-1 text-xs uppercase tracking-wider text-text-subtle"
              >
                {commands.templateIds.map((id) => (
                  <Command.Item
                    key={id}
                    onSelect={() => run(() => commands.switchTemplate(id))}
                    className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-elevated aria-selected:text-accent"
                  >
                    Switch template: {id}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group
                heading="Palette"
                className="px-2 py-1 text-xs uppercase tracking-wider text-text-subtle"
              >
                {commands.paletteIds.map((id) => (
                  <Command.Item
                    key={id}
                    onSelect={() => run(() => commands.switchPalette(id))}
                    className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-elevated aria-selected:text-accent"
                  >
                    Switch palette: {id}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group
                heading="CV"
                className="px-2 py-1 text-xs uppercase tracking-wider text-text-subtle"
              >
                {commands.allSlugs.map((slug) => (
                  <Command.Item
                    key={slug}
                    onSelect={() => run(() => commands.switchCv(slug))}
                    className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-elevated aria-selected:text-accent"
                  >
                    Open CV: {slug}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group
                heading="Actions"
                className="px-2 py-1 text-xs uppercase tracking-wider text-text-subtle"
              >
                <Command.Item
                  onSelect={() => run(commands.exportPdf)}
                  className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-elevated aria-selected:text-accent"
                >
                  Export PDF
                </Command.Item>
                {commands.downloadYaml && (
                  <Command.Item
                    onSelect={() => run(commands.downloadYaml as () => void)}
                    className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-elevated aria-selected:text-accent"
                  >
                    Download YAML
                  </Command.Item>
                )}
              </Command.Group>
            </Command.List>
          </Command>
        </div>
      </div>
    </>
  );
}
