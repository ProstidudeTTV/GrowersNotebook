"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampAvatarPan,
  coverScale,
  renderAvatarCropJpeg,
  type AvatarCropState,
} from "@/lib/avatar-crop-canvas";

const VIEWPORT = 280;
const OUTPUT = 512;

type Props = {
  file: File;
  title?: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
};

export function AvatarCropModal({
  file,
  title = "Adjust profile photo",
  onCancel,
  onConfirm,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<AvatarCropState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    ox: number;
    oy: number;
  } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const applyClamp = useCallback((next: AvatarCropState) => {
    const img = imgRef.current;
    if (!img?.naturalWidth) return next;
    return clampAvatarPan(
      img.naturalWidth,
      img.naturalHeight,
      VIEWPORT,
      next,
    );
  }, []);

  const onImageLoad = () => {
    setReady(true);
    setState({ scale: 1, offsetX: 0, offsetY: 0 });
  };

  const pointerDown = (e: React.PointerEvent) => {
    if (!ready) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      ox: state.offsetX,
      oy: state.offsetY,
    };
  };

  const pointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setState((s) =>
      applyClamp({
        ...s,
        offsetX: d.ox + (e.clientX - d.startX),
        offsetY: d.oy + (e.clientY - d.startY),
      }),
    );
  };

  const pointerUp = () => {
    dragRef.current = null;
  };

  const confirm = async () => {
    const img = imgRef.current;
    if (!img?.naturalWidth) return;
    setBusy(true);
    try {
      const blob = await renderAvatarCropJpeg(
        img,
        VIEWPORT,
        OUTPUT,
        applyClamp(state),
      );
      await onConfirm(blob);
    } finally {
      setBusy(false);
    }
  };

  const base =
    imgRef.current?.naturalWidth && imgRef.current.naturalHeight
      ? coverScale(
          imgRef.current.naturalWidth,
          imgRef.current.naturalHeight,
          VIEWPORT,
        )
      : 1;
  const drawScale = base * state.scale;
  const drawW = (imgRef.current?.naturalWidth ?? 0) * drawScale;
  const drawH = (imgRef.current?.naturalHeight ?? 0) * drawScale;
  const imgX = (VIEWPORT - drawW) / 2 + state.offsetX;
  const imgY = (VIEWPORT - drawH) / 2 + state.offsetY;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] p-5 shadow-[var(--gn-shadow-lg)]">
        <h2
          id="avatar-crop-title"
          className="text-base font-bold text-[var(--gn-text)]"
        >
          {title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--gn-text-muted)]">
          Drag to reposition · use the slider to zoom · square crop saved to your
          profile
        </p>

        <div className="relative mx-auto mt-4 h-[280px] w-[280px] overflow-hidden rounded-2xl bg-[var(--gn-surface-muted)] ring-1 ring-[var(--gn-divide)]">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={src}
              alt=""
              className="pointer-events-none absolute max-w-none select-none"
              style={{
                width: drawW || "100%",
                height: drawH || "auto",
                left: imgX,
                top: imgY,
                opacity: ready ? 1 : 0,
              }}
              onLoad={onImageLoad}
              draggable={false}
            />
          ) : null}
          <div
            className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-[var(--gn-accent)]/40 ring-inset"
            aria-hidden
          />
        </div>

        <label className="mt-4 flex items-center gap-3 text-xs font-medium text-[var(--gn-text-muted)]">
          <span className="shrink-0">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.02}
            value={state.scale}
            disabled={!ready || busy}
            className="h-1.5 flex-1 accent-[var(--gn-accent)]"
            onChange={(e) => {
              const scale = Number(e.target.value);
              setState((s) => applyClamp({ ...s, scale }));
            }}
          />
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-full border border-[var(--gn-border)] px-4 py-2 text-sm font-medium text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready || busy}
            onClick={() => void confirm()}
            className="rounded-full bg-[var(--gn-accent)] px-4 py-2 text-sm font-semibold text-[var(--gn-on-accent)] transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
