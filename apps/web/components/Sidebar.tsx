'use client';
import { track } from '@/lib/analytics';
import type { PreviewBootstrap } from '@/lib/preview-bootstrap';
import type { CVData } from '@codevena/cvmake-schema';
import { getTemplate, listTemplates } from '@codevena/cvmake-templates';
import { ColorPicker, PaletteSelector, TemplateCard } from '@codevena/cvmake-ui';
import { useEffect, useRef } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { HiddenSectionsToggles } from './HiddenSectionsToggles';
import { Popover } from './Popover';

interface Props {
  bootstrap: PreviewBootstrap;
}

export function Sidebar(_props: Props) {
  const { control, setValue, getValues } = useFormContext<CVData>();
  const templateId = useWatch({ control, name: 'rendering.template' });

  // Keep `rendering.palette` valid for the current template.
  //
  // This used to run only on a template SWITCH, which left the case the whole
  // check exists for untouched: a stored CV whose palette no longer exists.
  // renderCV silently falls back to palettes[0] for an unknown id, so such a
  // file rendered in colours nobody asked for, with HTTP 200 and exit 0.
  //
  // The two cases differ on purpose:
  //  - switch: any palette that does not belong to the new template is replaced,
  //    including an unset one, and the change is the user's (shouldDirty).
  //  - first render: only a value that is present AND invalid is healed, and it
  //    is NOT marked dirty, because the user did not do it.
  //
  // Do not read more into `shouldDirty: false` than that. It does NOT keep the
  // repair out of autosave: the unsaved-changes guard compares the serialised
  // document against what the server last accepted and never looks at dirty
  // state at all. What actually keeps a freshly opened CV from being written
  // back is effect ordering — this runs in a child effect, and EditorShell's
  // `useWatch` subscribes in a parent effect, which React runs afterwards, so
  // the repair never reaches the value autosave watches. That is an emergent
  // property, not a decision; `EditorShell.test.tsx` pins the behaviour and
  // says what would break it.
  const prevRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const isSwitch = prevRef.current !== undefined && prevRef.current !== templateId;
    prevRef.current = templateId;
    const tpl = getTemplate(templateId);
    if (!tpl) return;
    const current = getValues('rendering.palette');
    if (!isSwitch && current === undefined) return;
    if (tpl.palettes.some((p) => p.id === current)) return;
    const nextId = tpl.palettes[0]?.id;
    if (nextId === undefined) return;
    setValue('rendering.palette', nextId, { shouldDirty: isSwitch });
  }, [templateId, setValue, getValues]);

  const templates = listTemplates();
  const currentTpl = getTemplate(templateId);
  const palettes = currentTpl?.palettes ?? [];

  return (
    <aside className="flex w-[72px] shrink-0 flex-col items-center border-r border-border bg-surface py-3">
      <Popover
        label="Template"
        trigger={
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect x="2" y="2" width="7" height="7" rx="1" fill="currentColor" />
            <rect x="11" y="2" width="7" height="7" rx="1" fill="currentColor" />
            <rect x="2" y="11" width="7" height="7" rx="1" fill="currentColor" />
            <rect x="11" y="11" width="7" height="7" rx="1" fill="currentColor" />
          </svg>
        }
      >
        <Controller
          control={control}
          name="rendering.template"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Template" className="grid grid-cols-2 gap-2">
              {templates.map((t) => (
                <TemplateCard
                  key={t.meta.id}
                  templateId={t.meta.id}
                  name={t.meta.name}
                  description={t.meta.description}
                  thumbnailSrc={`/template-thumbnails/${t.meta.id}.png`}
                  selected={field.value === t.meta.id}
                  onSelect={() => {
                    track('editor.template_change', { template: t.meta.id });
                    field.onChange(t.meta.id);
                  }}
                />
              ))}
            </div>
          )}
        />
      </Popover>

      <Popover
        label="Palette"
        trigger={
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="10" cy="4" r="2" fill="currentColor" />
            <circle cx="15.2" cy="7.5" r="2" fill="currentColor" />
            <circle cx="15.2" cy="12.5" r="2" fill="currentColor" />
            <circle cx="10" cy="16" r="2" fill="currentColor" />
            <circle cx="4.8" cy="12.5" r="2" fill="currentColor" />
            <circle cx="4.8" cy="7.5" r="2" fill="currentColor" />
          </svg>
        }
      >
        <Controller
          control={control}
          name="rendering.palette"
          render={({ field }) => (
            <PaletteSelector
              palettes={palettes}
              value={field.value ?? ''}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="rendering.accentOverride"
          render={({ field }) => (
            <div className="mt-3 flex items-end gap-2">
              <ColorPicker label="Hex" value={field.value ?? ''} onChange={field.onChange} />
              <button
                type="button"
                onClick={() => {
                  setValue('rendering.accentOverride', undefined, { shouldDirty: true });
                }}
                className="rounded border px-2 py-1 text-xs"
              >
                Reset
              </button>
            </div>
          )}
        />
      </Popover>

      <Popover
        label="Sections"
        trigger={
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M1 10C1 10 4.5 4 10 4C15.5 4 19 10 19 10C19 10 15.5 16 10 16C4.5 16 1 10 1 10Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="10" cy="10" r="2.5" fill="currentColor" />
          </svg>
        }
      >
        <HiddenSectionsToggles />
      </Popover>

      <div className="mt-auto">
        {/* biome-ignore lint/a11y/useAnchorContent: anchor has aria-label="GitHub"; SVG child is aria-hidden; this is the correct accessible pattern for icon-only links */}
        <a
          href="https://github.com/Codevena/cvmake"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="flex h-10 w-10 items-center justify-center rounded-md text-text-muted transition hover:bg-elevated hover:text-text"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
            <line
              x1="10"
              y1="9"
              x2="10"
              y2="14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="10" cy="6.5" r="0.75" fill="currentColor" />
          </svg>
        </a>
      </div>
    </aside>
  );
}
