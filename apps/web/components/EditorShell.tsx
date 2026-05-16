'use client';
import { cvRoute } from '@/lib/cv-route';
import { isDemoMode } from '@/lib/demo-mode';
import { downloadYaml as downloadYamlFile } from '@/lib/download-yaml';
import { exportPdf } from '@/lib/export-pdf';
import type { PreviewBootstrap } from '@/lib/preview-bootstrap';
import { type ConflictPayload, useAutosave } from '@/lib/use-autosave';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useHotkey } from '@/lib/use-hotkey';
import { applyZodIssues } from '@/lib/zod-issue-mapping';
import { type CVData, CVDataSchema } from '@codevena/cvmake-schema';
import { bootstrapTemplates, getTemplate, listTemplates } from '@codevena/cvmake-templates';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import type { ZodIssue } from 'zod';
import { CommandPalette, type PaletteCommands } from './CommandPalette';
import { ConflictModal } from './ConflictModal';
import { PreviewFrame } from './PreviewFrame';
import { Sidebar } from './Sidebar';
import { type TabId, TabNav } from './TabNav';
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
  // Overwrite error — shown as an inline banner inside the conflict modal
  // area instead of a blocking window.alert.
  const [overwriteError, setOverwriteError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>('personal');
  const [paletteOpen, setPaletteOpen] = useState(false);
  // C9 — mobile edit/preview toggle. Below `lg` (1024 px) the 3-pane shell
  // collapses to a single visible column at a time; this state selects which.
  // Above `lg` the toggle is hidden in TopBar and both columns render
  // side-by-side regardless of this value.
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

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

  // beforeunload guard (audit C11 sibling — covers the "close tab / refresh /
  // navigate to external URL" case that the in-app ConfirmDialog can't reach).
  // Only enabled in demo mode: non-demo deploys autosave every 2 s so unsaved
  // work is already protected; demo deploys explicitly don't save and a
  // closed tab would lose the user's edits silently.
  // Browsers ignore custom returnValue strings since Chrome 51 — setting any
  // string (or just calling preventDefault) triggers the native "Leave site?"
  // prompt. The empty string + preventDefault is the spec-compliant idiom.
  useEffect(() => {
    if (!demo || !form.formState.isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [demo, form.formState.isDirty]);

  const currentTemplateId = form.watch('rendering.template');

  const paletteCommands: PaletteCommands = {
    switchCv: (s) => router.push(cvRoute(s, demo)),
    allSlugs,
    switchTemplate: (id) => form.setValue('rendering.template', id, { shouldDirty: true }),
    templateIds: listTemplates().map((t) => t.meta.id),
    switchPalette: (id) => form.setValue('rendering.palette', id, { shouldDirty: true }),
    paletteIds: getTemplate(currentTemplateId)?.palettes.map((p) => p.id) ?? [],
    jumpToSection: (id) => setActiveTab(id),
    exportPdf: () => exportPdf({ data: form.getValues(), slug }),
    ...(demo
      ? {
          downloadYaml: () => downloadYamlFile({ data: form.getValues(), slug }),
        }
      : {}),
  };

  // Responsive column classes (C9 second pass).
  // - Below `lg` (1024 px): exactly one of {edit form, preview} is visible,
  //   chosen by `viewMode`; the toggle lives in TopBar.
  // - At `lg+`: both render side-by-side at the historical flex ratios.
  const formColClass =
    viewMode === 'preview'
      ? 'hidden lg:flex lg:flex-[0.85] flex-col overflow-hidden border-r border-border'
      : 'flex flex-1 lg:flex-[0.85] flex-col overflow-hidden border-r border-border';
  const previewColClass =
    viewMode === 'edit'
      ? 'hidden lg:flex lg:flex-[1.5] flex-col overflow-hidden'
      : 'flex flex-1 lg:flex-[1.5] flex-col overflow-hidden';

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
          viewMode={viewMode}
          onSetViewMode={setViewMode}
        />
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar: desktop only. On mobile, template + palette switching
              happens via the CommandPalette (⌘K button in TopBar, also
              touch-friendly) — avoids cramming the 3-popover sidebar +
              colour picker into a 320 px viewport. */}
          <div className="hidden lg:flex">
            <Sidebar bootstrap={bootstrap} />
          </div>
          <div className={formColClass}>
            <TabNav active={activeTab} onSelect={setActiveTab} />
            {/* biome-ignore lint/a11y/useSemanticElements: explicit role="form" is needed — <form> only carries an implicit role when given an accessible name via aria-label/aria-labelledby */}
            <div role="form" className="flex-1 overflow-y-auto p-4 lg:p-6">
              {/* sr-only h1 gives screen readers and SEO an accessible heading without affecting layout */}
              <h1 className="sr-only">cvmake CV Editor{slug ? ` — ${slug}` : ''}</h1>
              {activeTab === 'personal' && <PersonalSection slug={slug} />}
              {activeTab === 'experience' && <ExperienceSection />}
              {activeTab === 'education' && <EducationSection />}
              {activeTab === 'skills' && <SkillsSection />}
              {activeTab === 'languages' && <LanguagesSection />}
              {activeTab === 'custom' && <CustomSectionsSection />}
              {activeTab === 'summary' && <SummarySection />}
            </div>
          </div>
          <div className={previewColClass}>
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
            <a
              href="https://www.npmjs.com/package/@codevena/cvmake-cli"
              className="text-accent underline"
              target="_blank"
              rel="noreferrer"
            >
              Use the CLI
            </a>{' '}
            to keep your work.
          </div>
        )}
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          commands={paletteCommands}
        />
      </div>
      {conflict && (
        <>
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
              setOverwriteError(null);
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
                  setOverwriteError(
                    `Overwrite failed (HTTP ${res.status})${text ? `: ${text}` : ''}`,
                  );
                  return;
                }
                const body = (await res.json()) as { mtime: number };
                autosave.expectedMtimeRef.current = body.mtime;
                setConflict(null);
                setOverwriteError(null);
                // Successful overwrite resolves the conflict — resume autosave.
                setConflictPaused(false);
              } catch (err) {
                setOverwriteError(`Overwrite failed: ${(err as Error).message}`);
              }
            }}
            onCancel={() => {
              // Per spec §10.2: closing the modal without resolving must keep
              // autosave paused. The user has to pick Reload or Overwrite next
              // time the conflict surfaces (or fix the file by hand) — we must
              // not silently start 409-looping again in the background.
              setConflictPaused(true);
              setConflict(null);
              setOverwriteError(null);
            }}
          />
          {overwriteError && (
            // Inline error banner layered above the conflict modal, replacing
            // the previous window.alert for overwrite failures.
            <div className="pointer-events-none fixed inset-0 z-[60] flex items-end justify-center pb-8">
              <p
                role="alert"
                className="pointer-events-auto max-w-lg rounded border border-error bg-surface px-4 py-3 text-sm text-error shadow-card"
              >
                {overwriteError}
              </p>
            </div>
          )}
        </>
      )}
    </FormProvider>
  );
}
