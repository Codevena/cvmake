'use client';
import { isDemoMode } from '@/lib/demo-mode';
import { type PhotoAspect, type PhotoCropResult, PhotoCropper } from '@codevena/cvmake-ui';
import { type ChangeEvent, useState } from 'react';

interface Props {
  slug: string;
  value: string;
  onChange: (path: string) => void;
  aspect?: PhotoAspect;
}

// Read a (cropped) File as a base64 data URL — used in demo mode so the photo
// lives in the form/browser only, never on the server. `embedPhoto` already
// passes data URLs through untouched, so PDF export works the same way.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'));
    reader.readAsDataURL(file);
  });
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
      if (isDemoMode()) {
        // Demo deploy: every visitor shares the example slug, so a server-side
        // write would clobber other visitors' photos. Keep it in-browser.
        onChange(await fileToDataUrl(result.file));
        setPending(null);
        return;
      }
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
