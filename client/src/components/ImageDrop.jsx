import { useEffect, useId, useRef, useState } from 'react';
import { cn, imgUrl } from '../lib/format';
import { MAX_UPLOAD_BYTES, prepareImage, prettySize } from '../lib/imageFile';
import { Icon } from './ui';

const TYPE_NAMES = { 'image/svg+xml': 'SVG', 'application/pdf': 'PDF' };

/**
 * Friendly single-file picker for shoppers: tap/click, drag & drop or paste.
 * Shows a preview, shrinks big photos before upload and explains any problem in plain words.
 *
 * value: File | { url } | null — the current file or an already-saved image.
 * onChange(file|null) — called with the ready-to-upload file.
 * progress: 0–1 while uploading (optional).
 */
export default function ImageDrop({
  value,
  onChange,
  accept = 'image/*',
  label = 'Add a photo',
  hint = 'JPG, PNG or WebP · big photos are resized automatically',
  shape = 'box',
  progress,
  busy,
  disabled,
  className,
}) {
  const inputId = useId();
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const file = value instanceof File ? value : null;
  const savedUrl = !file && value?.url ? imgUrl(value.url, 240) : null;

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const allowed = (f) => accept.split(',').some((a) => (a.trim().endsWith('/*') ? f.type.startsWith(a.trim().slice(0, -1)) : f.type === a.trim())) || /\.(heic|heif)$/i.test(f.name);

  const take = async (f) => {
    if (!f || disabled) return;
    setError('');
    if (!allowed(f)) {
      setError(`That file type isn't supported. Please choose ${accept.includes('pdf') ? 'an image or PDF' : 'a photo (JPG, PNG or WebP)'}.`);
      return;
    }
    setWorking(true);
    try {
      const ready = await prepareImage(f);
      if (ready.size > MAX_UPLOAD_BYTES) {
        setError(`This file is ${prettySize(ready.size)}. Please choose one under 5 MB.`);
        return;
      }
      onChange(ready);
    } finally {
      setWorking(false);
    }
  };

  // Paste an image (Ctrl/⌘+V) while the picker is hovered or focused.
  const onPaste = (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.kind === 'file');
    if (item) {
      e.preventDefault();
      take(item.getAsFile());
    }
  };

  const loading = working || busy;
  const round = shape === 'circle';
  const shown = preview || savedUrl;
  const pct = progress != null ? Math.round(progress * 100) : null;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-labelledby={inputId}
        onClick={() => !loading && ref.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), ref.current?.click())}
        onPaste={onPaste}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          take(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'group relative flex items-center gap-4 cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-secondary',
          round ? 'rounded-full' : 'p-3 rounded-2xl border-2 border-dashed',
          !round && (drag ? 'border-secondary bg-secondary/10' : error ? 'border-error/60 bg-error-container/30' : 'border-outline-variant hover:border-secondary/60 hover:bg-secondary/5'),
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        {/* Preview */}
        <span
          className={cn(
            'relative shrink-0 overflow-hidden flex items-center justify-center bg-surface-container text-outline',
            round ? 'w-24 h-24 rounded-full ring-4 transition-shadow' : 'w-20 h-20 rounded-xl',
            round && (drag ? 'ring-secondary' : 'ring-surface-container-lowest group-hover:ring-secondary/40')
          )}
        >
          {shown ? (
            <img src={shown} alt="" className={cn('w-full h-full', file?.type === 'image/svg+xml' ? 'object-contain p-2' : 'object-cover')} />
          ) : file ? (
            <span className="flex flex-col items-center text-[11px] font-bold text-secondary"><Icon name="description" className="text-[28px]" />{TYPE_NAMES[file.type] || 'FILE'}</span>
          ) : (
            <Icon name={round ? 'person' : 'add_photo_alternate'} className="text-[30px]" />
          )}
          {(loading || drag) && (
            <span className="absolute inset-0 bg-black/45 text-white flex flex-col items-center justify-center text-[11px] font-semibold">
              {drag ? <Icon name="file_download" className="text-[24px]" /> : <span className="w-5 h-5 border-2 border-white border-r-transparent rounded-full animate-spin" />}
              {!drag && pct != null && <span className="mt-1">{pct}%</span>}
            </span>
          )}
          {round && !loading && !drag && (
            <span className="absolute bottom-0 inset-x-0 h-7 bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon name="photo_camera" className="text-[16px]" />
            </span>
          )}
        </span>

        {/* Words */}
        {!round && (
          <span className="flex-1 min-w-0">
            <span id={inputId} className="block text-[14px] font-semibold">
              {file ? file.name : savedUrl ? 'Current image' : drag ? 'Drop it here' : label}
            </span>
            <span className="block text-[12px] text-on-surface-variant">
              {working ? 'Getting your photo ready…' : busy ? `Uploading${pct != null ? ` ${pct}%` : '…'}` : file ? `${prettySize(file.size)} · ready to send` : 'Tap to choose, drag it here or paste (Ctrl+V)'}
            </span>
            {!file && <span className="block text-[11px] text-outline mt-0.5">{hint}</span>}
            {busy && pct != null && (
              <span className="block mt-1.5 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                <span className="block h-full bg-secondary transition-[width] duration-200" style={{ width: `${pct}%` }} />
              </span>
            )}
          </span>
        )}
        {!round && file && !loading && (
          <span className="flex flex-col gap-1 shrink-0">
            <span className="h-8 px-3 rounded-lg bg-surface-container text-[12px] font-semibold inline-flex items-center gap-1"><Icon name="swap_horiz" className="text-[15px]" /> Change</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="h-8 px-3 rounded-lg text-error hover:bg-error-container text-[12px] font-semibold inline-flex items-center gap-1"
            >
              <Icon name="delete" className="text-[15px]" /> Remove
            </button>
          </span>
        )}
        <input
          ref={ref}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => {
            take(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {round && <span id={inputId} className="sr-only">{label}</span>}
      {error && (
        <p className="flex items-start gap-1.5 text-[12px] text-error" role="alert">
          <Icon name="error" className="text-[15px] mt-px" /> {error}
        </p>
      )}
    </div>
  );
}
