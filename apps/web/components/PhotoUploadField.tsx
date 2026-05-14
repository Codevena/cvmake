'use client';
import { type PhotoAspect, type PhotoCropResult, PhotoCropper } from '@codevena/cvmake-ui';
import { type ChangeEvent, useState } from 'react';

interface Props {
  slug: string;
  value: string;
  onChange: (path: string) => void;
  aspect?: PhotoAspect;
}

export function PhotoUploadField({ slug, value, onChange, aspect = '1:1' }: Props) {
  const [pending, setPending] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setPending(f);
    e.target.value = '';
  }

  async function onCropConfirm(result: PhotoCropResult) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', result.file);
      form.append('slug', slug);
      form.append('crop', JSON.stringify(result.crop));
      form.append('aspect', result.aspect);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { jpg: string };
      onChange(body.jpg);
      setPending(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Photo</span>
      {value && (
        <div className="flex items-center gap-3">
          <img src={value} alt="Uploaded headshot" className="h-20 w-20 rounded object-cover" />
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-xs"
            onClick={() => onChange('')}
          >
            Remove
          </button>
        </div>
      )}
      <label className="inline-flex w-fit cursor-pointer rounded border border-dashed px-3 py-1 text-sm">
        {value ? 'Replace' : 'Choose photo'}
        <input type="file" accept="image/*" className="hidden" onChange={onFileSelect} />
      </label>
      {pending && (
        <PhotoCropper
          initialFile={pending}
          defaultAspect={aspect}
          onCancel={() => setPending(null)}
          onConfirm={onCropConfirm}
        />
      )}
      {busy && <span className="text-xs text-text-muted">Uploading…</span>}
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
