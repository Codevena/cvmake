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
import { SaveIndicator } from './SaveIndicator';
import { Sidebar } from './Sidebar';
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

export function EditorShell({ initialData, initialMtime, slug, bootstrap }: Props) {
  const form = useForm<CVData>({
    defaultValues: initialData,
    resolver: zodResolver(CVDataSchema),
    mode: 'onChange',
    shouldUnregister: false,
  });

  const watched = useWatch({ control: form.control }) as CVData;
  const debounced = useDebouncedValue(watched, 150);
  const [conflict, setConflict] = useState<ConflictPayload | null>(null);

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
    paused: conflict !== null,
  });

  return (
    <FormProvider {...form}>
      <div className="flex h-screen flex-col bg-bg text-text">
        {/* biome-ignore lint/a11y/noInteractiveElementToNoninteractiveRole: explicit banner landmark for testability */}
        <header role="banner" className="flex h-12 items-center justify-between border-b px-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold">forq</span>
            <span className="text-sm text-text-muted">{slug}</span>
          </div>
          <SaveIndicator
            state={autosave.state}
            errorMessage={autosave.errorMessage}
            onRetry={autosave.retry}
            lastSavedAt={autosave.lastSavedAt}
          />
        </header>
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
          }}
          onOverwrite={async (mtime) => {
            autosave.expectedMtimeRef.current = mtime;
            setConflict(null);
            const res = await fetch('/api/save', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                slug,
                data: form.getValues(),
                expectedMtime: mtime,
              }),
            });
            if (res.ok) {
              const body = (await res.json()) as { mtime: number };
              autosave.expectedMtimeRef.current = body.mtime;
            }
          }}
          onCancel={() => setConflict(null)}
        />
      )}
    </FormProvider>
  );
}
