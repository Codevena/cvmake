'use client';
import type { PreviewBootstrap } from '@/lib/preview-bootstrap';
import type { CVData } from '@codevena/forq-schema';
import { getTemplate, listTemplates } from '@codevena/forq-templates';
import { ColorPicker, PaletteSelector, TemplateCard } from '@codevena/forq-ui';
import { useEffect, useRef } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { HiddenSectionsToggles } from './HiddenSectionsToggles';

interface Props {
  bootstrap: PreviewBootstrap;
}

export function Sidebar(_props: Props) {
  const { control, setValue, getValues } = useFormContext<CVData>();
  const templateId = useWatch({ control, name: 'rendering.template' });

  // Template-switch effect: reset palette if not present in new template
  const prevRef = useRef(templateId);
  useEffect(() => {
    if (prevRef.current === templateId) return;
    const tpl = getTemplate(templateId);
    if (tpl) {
      const current = getValues('rendering.palette');
      if (!tpl.palettes.some((p) => p.id === current)) {
        const nextId = tpl.palettes[0]?.id;
        if (nextId !== undefined) {
          setValue('rendering.palette', nextId, { shouldDirty: true });
        }
      }
    }
    prevRef.current = templateId;
  }, [templateId, setValue, getValues]);

  const templates = listTemplates();
  const currentTpl = getTemplate(templateId);
  const palettes = currentTpl?.palettes ?? [];

  return (
    // biome-ignore lint/a11y/noRedundantRoles: explicit complementary landmark for testability + intent
    <aside role="complementary" className="w-80 shrink-0 overflow-y-auto border-r p-4">
      <section>
        <h2 className="mb-2 text-sm font-semibold">Template</h2>
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
                  selected={field.value === t.meta.id}
                  onSelect={() => field.onChange(t.meta.id)}
                />
              ))}
            </div>
          )}
        />
      </section>
      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold">Palette</h2>
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
      </section>
      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold">Accent-Override</h2>
        <Controller
          control={control}
          name="rendering.accentOverride"
          render={({ field }) => (
            <div className="flex items-end gap-2">
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
      </section>
      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold">Sichtbare Sections</h2>
        <HiddenSectionsToggles />
      </section>
    </aside>
  );
}
