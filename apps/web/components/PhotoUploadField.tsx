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

// Demo-mode photo pipeline. The server path runs the original file + crop
// rect through Sharp (extract + resize); in demo mode there is no server
// write, so we replicate it in a <canvas>: `result.file` is the ORIGINAL
// image and `result.crop` is the crop rect in natural/source pixels (as
// PhotoCropper produces it). We extract that rect, cap the long side at
// 600px (matching Sharp's target size) and emit a base64 JPEG data URL.
// `embedPhoto` passes data URLs through untouched, so PDF export works the
// same way. Browsers apply EXIF orientation to images by default — same as
// Sharp's `.rotate()` — so the crop coords line up.
function cropFileToDataUrl(
  file: File,
  crop: { x: number; y: number; width: number; height: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const MAX = 600;
        const scale = Math.min(1, MAX / Math.max(crop.width, crop.height));
        const outW = Math.max(1, Math.round(crop.width * scale));
        const outH = Math.max(1, Math.round(crop.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas 2d context unavailable');
        ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, outW, outH);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      } catch (err) {
        reject(err as Error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image load failed'));
    };
    img.src = url;
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
        // write would clobber other visitors' photos. Apply the crop in-browser
        // and keep the result as a data URL in the form.
        onChange(await cropFileToDataUrl(result.file, result.crop));
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
