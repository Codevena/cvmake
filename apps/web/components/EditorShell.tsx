'use client';
import type { PreviewBootstrap } from '@/lib/preview-bootstrap';
import { type ConflictPayload, useAutosave } from '@/lib/use-autosave';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { applyZodIssues } from '@/lib/zod-issue-mapping';
import { type CVData, CVDataSchema } from '@codevena/forq-schema';
import { bootstrapTemplates } from '@codevena/forq-templates';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import type { ZodIssue } from 'zod';
import { ConflictModal } from './ConflictModal';
import { PreviewFrame } from './PreviewFrame';
import { Sidebar } from './Sidebar';
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
  // "Abbrechen" on the conflict modal — otherwise the next debounced save
  // would re-hit /api/save with the same stale mtime and 409 again, looping
  // until the user resolves the conflict. Only an explicit Reload or a
  // successful Overwrite is allowed to resume autosave.
  const [conflictPaused, setConflictPaused] = useState(false);

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
    paused: conflict !== null || conflictPaused,
  });

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
        />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar bootstrap={bootstrap} />
          {/* biome-ignore lint/a11y/useSemanticElements: explicit role="form" is intentional — <form> only has implicit role="form" when given an accessible name */}
          <form
            // biome-ignore lint/a11y/noRedundantRoles: explicit role="form" is intentional for the same reason
            role="form"
            className="flex-1 overflow-y-auto p-6"
            onSubmit={(e) => e.preventDefault()}
          >
            <PersonalSection slug={slug} />
            <SummarySection />
            <ExperienceSection />
            <EducationSection />
            <SkillsSection />
            <LanguagesSection />
            <CustomSectionsSection />
          </form>
          <section className="flex-1 overflow-hidden p-4">
            <PreviewFrame
              data={debounced}
              bootstrap={bootstrap}
              templateId={debounced?.rendering?.template ?? 'classic-serif'}
              paletteId={debounced?.rendering?.palette}
              accentOverride={debounced?.rendering?.accentOverride}
            />
          </section>
        </div>
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
                  `Überschreiben fehlgeschlagen (HTTP ${res.status})${text ? `:\n${text}` : ''}`,
                );
                return;
              }
              const body = (await res.json()) as { mtime: number };
              autosave.expectedMtimeRef.current = body.mtime;
              setConflict(null);
              // Successful overwrite resolves the conflict — resume autosave.
              setConflictPaused(false);
            } catch (err) {
              window.alert(`Überschreiben fehlgeschlagen: ${(err as Error).message}`);
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
