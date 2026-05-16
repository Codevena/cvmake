// TODO(Agent 2 + build): Move this page under app/(dev)/dev-ui/ route group and
// gate the entire group with a build-time condition in next.config.mjs to exclude
// it from production bundles entirely. The runtime notFound() guard below is
// defense-in-depth only — the route still exists in the production JS bundle.
// Coordinate with Agent 2 (next.config.mjs) and Agent 3 (robots.ts disallow /dev-ui).
'use client';

import type { ColorPalette } from '@codevena/cvmake-schema';
import {
  BulletListEditor,
  ColorPicker,
  DateRangeInput,
  type DateRangeValue,
  Input,
  PaletteSelector,
  type PhotoCropResult,
  PhotoCropper,
  Select,
  TemplateCard,
  Textarea,
} from '@codevena/cvmake-ui';
import { notFound } from 'next/navigation';
import { useState } from 'react';

const PALETTES: ColorPalette[] = [
  {
    id: 'classic-grey',
    name: 'Classic Grey',
    accent: '#7a8894',
    background: '#ffffff',
    surface: '#f4f4f5',
    text: '#0f172a',
    textMuted: '#64748b',
    textOnAccent: '#ffffff',
  },
  {
    id: 'classic-navy',
    name: 'Classic Navy',
    accent: '#1e3a5f',
    background: '#ffffff',
    surface: '#f1f5f9',
    text: '#0b1220',
    textMuted: '#475569',
    textOnAccent: '#ffffff',
  },
];

export default function DevUI(): JSX.Element {
  // C15: only render in development. Production, staging, test, and any
  // other unknown NODE_ENV value (including the empty/undefined case)
  // should 404 — this avoids accidentally serving dev tooling whenever
  // the build pipeline forgets to set NODE_ENV=production.
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [locale, setLocale] = useState('de');
  const [range, setRange] = useState<DateRangeValue>({ start: '2020-03', end: null });
  const [bullets, setBullets] = useState<string[]>(['First bullet']);
  const [accent, setAccent] = useState('');
  const [palette, setPalette] = useState('classic-grey');
  const [template, setTemplate] = useState('classic-serif');
  const [photo, setPhoto] = useState<PhotoCropResult | null>(null);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-12 p-8">
      <h1 className="text-2xl font-semibold text-text">cvmake-ui dev playground</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-text">Input</h2>
        <Input label="Name" value={name} onChange={setName} placeholder="Alex" />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-text">Textarea</h2>
        <Textarea label="Summary" value={summary} onChange={setSummary} rows={3} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-text">Select</h2>
        <Select
          label="Locale"
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'de', label: 'Deutsch' },
            { value: 'en', label: 'English' },
          ]}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-text">DateRangeInput</h2>
        <DateRangeInput label="Period" value={range} onChange={setRange} />
        <pre className="text-xs text-text-muted">{JSON.stringify(range)}</pre>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-text">BulletListEditor</h2>
        <BulletListEditor label="Bullets" value={bullets} onChange={setBullets} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-text">ColorPicker</h2>
        <ColorPicker label="Accent override" value={accent} onChange={setAccent} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-text">PaletteSelector</h2>
        <PaletteSelector palettes={PALETTES} value={palette} onChange={setPalette} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-text">TemplateCard</h2>
        <div className="grid grid-cols-2 gap-3">
          {['classic-serif', 'modern-minimal'].map((id) => (
            <TemplateCard
              key={id}
              templateId={id}
              name={id}
              description="demo card"
              selected={template === id}
              onSelect={setTemplate}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-text">PhotoCropper</h2>
        <PhotoCropper onConfirm={setPhoto} />
        {photo && (
          <pre className="text-xs text-text-muted">
            {JSON.stringify({ file: photo.file.name, crop: photo.crop, aspect: photo.aspect })}
          </pre>
        )}
      </section>
    </main>
  );
}
