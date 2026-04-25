import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, SyntheticEvent } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export type PhotoAspect = '1:1' | '3:4' | 'free';

export interface PhotoCropResult {
  file: File;
  crop: { x: number; y: number; width: number; height: number };
  aspect: PhotoAspect;
}

export interface PhotoCropperProps {
  initialFile?: File;
  defaultAspect?: PhotoAspect;
  allowedAspects?: PhotoAspect[];
  onConfirm: (result: PhotoCropResult) => void;
  onCancel?: () => void;
  maxBytes?: number;
  className?: string;
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_MAX = 10 * 1024 * 1024;
const ASPECT_VALUE: Record<PhotoAspect, number | undefined> = {
  '1:1': 1,
  '3:4': 3 / 4,
  free: undefined,
};

function computeCenteredCrop(img: HTMLImageElement, aspect: PhotoAspect): PixelCrop | undefined {
  const ratio = ASPECT_VALUE[aspect];
  if (ratio === undefined) return undefined;
  const size = Math.min(img.width, img.height) * 0.8;
  const w = ratio >= 1 ? size : size * ratio;
  const h = ratio >= 1 ? size / ratio : size;
  return {
    unit: 'px',
    x: (img.width - w) / 2,
    y: (img.height - h) / 2,
    width: w,
    height: h,
  };
}

export function PhotoCropper(props: PhotoCropperProps): JSX.Element {
  const {
    initialFile,
    defaultAspect = '1:1',
    allowedAspects = ['1:1', '3:4', 'free'],
    onConfirm,
    onCancel,
    maxBytes = DEFAULT_MAX,
    className,
  } = props;

  const [file, setFile] = useState<File | null>(initialFile ?? null);
  // Create the blob URL inside an effect so React StrictMode's double-invocation
  // doesn't leak (or worse: revoke a URL that the rendered <img src=...> still uses).
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [aspect, setAspect] = useState<PhotoAspect>(defaultAspect);
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const [pixelCrop, setPixelCrop] = useState<PixelCrop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const onPick = (e: ChangeEvent<HTMLInputElement>): void => {
    const next = e.target.files?.[0] ?? null;
    setError(null);
    if (!next) return;
    if (!ALLOWED_MIME.has(next.type)) {
      setError(`Unsupported image type: ${next.type || 'unknown'}`);
      return;
    }
    if (next.size > maxBytes) {
      setError(
        `File too large (${Math.round(next.size / 1024 / 1024)}MB > ${Math.round(maxBytes / 1024 / 1024)}MB)`,
      );
      return;
    }
    setFile(next);
  };

  const onImageLoad = useCallback(
    (e: SyntheticEvent<HTMLImageElement>): void => {
      const img = e.currentTarget;
      imgRef.current = img;
      const next = computeCenteredCrop(img, aspect);
      if (next === undefined) return;
      setCrop(next);
      setPixelCrop(next);
    },
    [aspect],
  );

  const changeAspect = (a: PhotoAspect): void => {
    setAspect(a);
    if (imgRef.current) {
      const next = computeCenteredCrop(imgRef.current, a);
      setCrop(next);
      setPixelCrop(next ?? null);
    }
  };

  const handleConfirm = (): void => {
    if (!file || !pixelCrop || !imgRef.current) return;
    const img = imgRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    onConfirm({
      file,
      crop: {
        x: Math.round(pixelCrop.x * scaleX),
        y: Math.round(pixelCrop.y * scaleY),
        width: Math.round(pixelCrop.width * scaleX),
        height: Math.round(pixelCrop.height * scaleY),
      },
      aspect,
    });
  };

  const handleCancel = (): void => {
    setFile(null);
    setCrop(undefined);
    setPixelCrop(null);
    setError(null);
    onCancel?.();
  };

  if (!file || !imageUrl) {
    const wrapperClass = [
      'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8',
      className,
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <div className={wrapperClass}>
        <p className="text-sm text-text-muted">
          Upload a photo (JPEG, PNG, WebP; max {Math.round(maxBytes / 1024 / 1024)}MB)
        </p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onPick}
          aria-label="Upload photo"
          className="text-sm"
        />
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    );
  }

  const wrapperClass = ['flex flex-col gap-3', className].filter(Boolean).join(' ');
  return (
    <div className={wrapperClass}>
      <div className="flex flex-wrap items-center gap-2">
        {allowedAspects.map((a) => {
          const active = aspect === a;
          const cls = [
            'rounded-md border px-3 py-1.5 text-sm',
            active ? 'border-accent ring-2 ring-accent' : 'border-border',
          ].join(' ');
          return (
            <button
              key={a}
              type="button"
              onClick={() => changeAspect(a)}
              aria-pressed={active}
              className={cls}
            >
              {a}
            </button>
          );
        })}
      </div>
      <ReactCrop
        {...(crop !== undefined ? { crop } : {})}
        onChange={(c) => setCrop(c)}
        onComplete={(c) => setPixelCrop(c)}
        {...(ASPECT_VALUE[aspect] !== undefined ? { aspect: ASPECT_VALUE[aspect] } : {})}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Crop source"
          onLoad={onImageLoad}
          className="max-h-[60vh] w-auto"
        />
      </ReactCrop>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!pixelCrop}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
