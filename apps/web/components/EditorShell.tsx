'use client';
import { isDemoMode } from '@/lib/demo-mode';
import { exportPdf } from '@/lib/export-pdf';
import type { PreviewBootstrap } from '@/lib/preview-bootstrap';
import { useHotkey } from '@/lib/use-hotkey';
import { type ConflictPayload, useAutosave } from '@/lib/use-autosave';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { applyZodIssues } from '@/lib/zod-issue-mapping';
import { type CVData, CVDataSchema } from '@codevena/cvmake-schema';
import { bootstrapTemplates, listTemplates } from '@codevena/cvmake-templates';
import { zodResolver } from '@hookform/resolvers/zod';
import yaml from 'js-yaml';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import type { ZodIssue } from 'zod';
import { CommandPalette, type PaletteCommands } from './CommandPalette';
import { ConflictModal } from './ConflictModal';
import { PreviewFrame } from './PreviewFrame';
import { Sidebar } from './Sidebar';
import { TabNav, type TabId } from './TabNav';
import { TopBar } from './TopBar';
import { CustomSectionsSection } from './sections/CustomSectionsSection';
import { EducationSection } from './sections/EducationSection';
import { ExperienceSection } from './sections/ExperienceSection';
import { LanguagesSection } from './sections/LanguagesSection';
import { PersonalSection } from './sections/PersonalSection';
import { SkillsSection } from './sections/SkillsSection';
import { SummarySection } from './sections/SummarySection';

// Populate the template registry on the client. `bootstrapTemplates()` is
// idempotent (calls clearRegistry() first), so running it at module load is
// safe in browser, tests, and React strict mode.
bootstrapTemplates();

interface Props {
  initialData: CVData;
  initialMtime: number;
  slug: string;
  allSlugs: string[];
  bootstrap: PreviewBootstrap;
}

export function EditorShell({ initialData, initialMtime, slug, allSlugs, bootstrap }: Props) {
  const demo = isDemoMode();
  const router = useRouter();

  const form = useForm<CVData>({
    defaultValues: initialData,
    resolver: zodResolver(CVDataSchema),
    mode: 'onChange',
    shouldUnregister: false,
  });

  const watched = useWatch({ control: form.control }) as CVData;
  const debounced = useDebouncedValue(watched, 150);
  const [conflict, setConflict] = useState<ConflictPayload | null>(null);
  // Per spec §10.2 the autosave loop must stay paused after the user clicks
  // "Cancel" on the conflict modal — otherwise the next debounced save
  // would re-hit /api/save with the same stale mtime and 409 again, looping
  // until the user resolves the conflict. Only an explicit Reload or a
  // successful Overwrite is allowed to resume autosave.
  const [conflictPaused, setConflictPaused] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>('personal');
  const [paletteOpen, setPaletteOpen] = useState(false);

  const autosave = useAutosave({
    slug,
    data: watched,
    isDirty: form.formState.isDirty,
    isValid: form.formState.isValid,
    expectedMtime: initialMtime,
    onConflict: setConflict,
    onError: (e) => {
      if (e.kind === 'validation') {
        applyZodIssues(e.issues as ZodIssue[], form.setError);
      }
    },
    paused: demo || conflict !== null || conflictPaused,
  });

  useHotkey('mod+k', (e) => {
    e.preventDefault();
    setPaletteOpen((prev) => !prev);
  });

  const paletteCommands: PaletteCommands = {
    switchCv: (s) => router.push(`/cv/${encodeURIComponent(s)}`),
    allSlugs,
    switchTemplate: (id) => form.setValue('rendering.template', id, { shouldDirty: true }),
    templateIds: listTemplates().map((t) => t.meta.id),
    jumpToSection: (id) => setActiveTab(id),
    exportPdf: () => exportPdf({ data: form.getValues(), slug }),
    ...(demo
      ? {
          downloadYaml: () => {
            const text = yaml.dump(form.getValues(), { lineWidth: 100, noRefs: true });
            const blob = new Blob([text], { type: 'text/yaml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${slug}.yaml`;
            a.click();
            URL.revokeObjectURL(url);
          },
        }
      : {}),
  };

  return (
    <FormProvider {...form}>
      <div className="flex h-screen flex-col bg-bg text-text">
        <TopBar
          slug={slug}
          allSlugs={allSlugs}
          saveState={autosave.state}
          saveError={autosave.errorMessage}
          onRetry={autosave.retry}
          lastSavedAt={autosave.lastSavedAt}
          onOpenPalette={() => setPaletteOpen(true)}
          isDemo={demo}
        />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar bootstrap={bootstrap} />
          <div className="flex flex-[0.85] flex-col overflow-hidden border-r border-border">
            <TabNav active={activeTab} onSelect={setActiveTab} />
            {/* biome-ignore lint/a11y/useSemanticElements: explicit role="form" is intentional — <form> only has implicit role="form" when given an accessible name */}
            <div
              // biome-ignore lint/a11y/noRedundantRoles: explicit role="form" is intentional for the same reason
              role="form"
              className="flex-1 overflow-y-auto p-6"
            >
              {activeTab === 'personal' && <PersonalSection slug={slug} />}
              {activeTab === 'experience' && <ExperienceSection />}
              {activeTab === 'education' && <EducationSection />}
              {activeTab === 'skills' && <SkillsSection />}
              {activeTab === 'languages' && <LanguagesSection />}
              {activeTab === 'custom' && <CustomSectionsSection />}
              {activeTab === 'summary' && <SummarySection />}
            </div>
          </div>
          <div className="flex flex-[1.5] flex-col overflow-hidden">
            <PreviewFrame
              data={debounced}
              bootstrap={bootstrap}
              templateId={debounced?.rendering?.template ?? 'classic-serif'}
              paletteId={debounced?.rendering?.palette}
              accentOverride={debounced?.rendering?.accentOverride}
              rendering={debounced !== watched}
            />
          </div>
        </div>
        {demo && (
          <div className="shrink-0 border-t border-border bg-surface px-4 py-1.5 text-center text-xs text-text-muted">
            Demo mode — edits are not saved.{' '}
            <a href="https://www.npmjs.com/package/@codevena/cvmake-cli" className="text-accent underline" target="_blank" rel="noreferrer">Use the CLI</a>{' '}
            to keep your work.
          </div>
        )}
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={paletteCommands} />
      </div>
      {conflict && (
        <ConflictModal
          slug={slug}
          currentData={conflict.currentData}
          currentMtime={conflict.currentMtime}
          isFormDirty={form.formState.isDirty}
          onReload={(data, mtime) => {
            form.reset(data);
            autosave.expectedMtimeRef.current = mtime;
            setConflict(null);
            // Reload resolved the conflict — resume autosave.
            setConflictPaused(false);
          }}
          onOverwrite={async (mtime) => {
            // Await the response BEFORE dismissing the modal so a failed
            // overwrite stays visible for the user to retry. Previously we
            // closed the modal optimistically and a network/server error
            // would silently drop the user's intent.
            try {
              const res = await fetch('/api/save', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  slug,
                  data: form.getValues(),
                  expectedMtime: mtime,
                }),
              });
              if (!res.ok) {
                const text = await res.text().catch(() => '');
                window.alert(
                  `Overwrite failed (HTTP ${res.status})${text ? `:\n${text}` : ''}`,
                );
                return;
              }
              const body = (await res.json()) as { mtime: number };
              autosave.expectedMtimeRef.current = body.mtime;
              setConflict(null);
              // Successful overwrite resolves the conflict — resume autosave.
              setConflictPaused(false);
            } catch (err) {
              window.alert(`Overwrite failed: ${(err as Error).message}`);
            }
          }}
          onCancel={() => {
            // Per spec §10.2: closing the modal without resolving must keep
            // autosave paused. The user has to pick Reload or Overwrite next
            // time the conflict surfaces (or fix the file by hand) — we must
            // not silently start 409-looping again in the background.
            setConflictPaused(true);
            setConflict(null);
          }}
        />
      )}
    </FormProvider>
  );
}
