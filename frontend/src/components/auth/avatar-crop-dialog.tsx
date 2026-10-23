"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { ArrowPathIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { eyebrow } from "@/components/ui/styles";
import { cx } from "@/lib/design";
import { MAX_ZOOM, MIN_ZOOM, clampOffset, clampZoom, cropRect, zoomAt, type Point, type Size } from "@/lib/design/crop";

const OUTPUT_PX = 512;
const KEY_PAN_PX = 12;

type AvatarCropDialogProps = {
  file: File;
  onCancel: () => void;
  /** Receives the cropped square image; resolves when saved. Throw to keep the dialog open. */
  onConfirm: (blob: Blob) => Promise<void>;
};

/**
 * Crop & zoom step for a new profile photo. Rendered inside Clerk's Account modal
 * (so Clerk's focus trap keeps working) as a full-screen overlay with its own panel.
 * Drag to move; zoom with the slider, the mouse wheel, pinch, or +/−; arrow keys
 * move. The square under the circle is exported at 512×512.
 */
export function AvatarCropDialog({ file, onCancel, onConfirm }: AvatarCropDialogProps) {
  const titleId = useId();
  const zoomId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  const [source, setSource] = useState<{ url: string; size: Size } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewport, setViewport] = useState(280);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Decode the chosen file (browsers apply EXIF rotation to <img> and canvas drawing).
  useEffect(() => {
    // React's dev Strict Mode runs this twice; the first run is cleaned up mid-load,
    // so detach its handlers and cancel the load before freeing its blob URL.
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setSource({ url, size: { width: image.naturalWidth, height: image.naturalHeight } });
    };
    image.onerror = () => setLoadError("This file couldn't be read as an image. Try a PNG, JPG or WebP.");
    image.src = url;
    return () => {
      image.onload = null;
      image.onerror = null;
      image.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // The viewport is a responsive square; track its real size for the maths.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setViewport(element.clientWidth || 280));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const size = source?.size;
  const apply = (nextZoom: number, nextOffset: Point) => {
    if (!size) return;
    const z = clampZoom(nextZoom);
    setZoom(z);
    setOffset(clampOffset(nextOffset, size, viewport, z));
  };

  /** Point relative to the viewport centre, in viewport px. */
  const fromCentre = (clientX: number, clientY: number): Point => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  };

  const zoomTo = (nextZoom: number, around: Point = { x: 0, y: 0 }) => {
    const z = clampZoom(nextZoom);
    apply(z, zoomAt(offset, around, zoom, z));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!size || saving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous || !size) return;
    const current = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, current);
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomTo(pinch.current.zoom * (distance / pinch.current.distance), mid);
      return;
    }
    apply(zoom, { x: offset.x + current.x - previous.x, y: offset.y + current.y - previous.y });
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!size) return;
    zoomTo(zoom * Math.exp(-event.deltaY * 0.0015), fromCentre(event.clientX, event.clientY));
  };

  const onViewportKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const pan: Record<string, Point> = {
      ArrowLeft: { x: KEY_PAN_PX, y: 0 },
      ArrowRight: { x: -KEY_PAN_PX, y: 0 },
      ArrowUp: { x: 0, y: KEY_PAN_PX },
      ArrowDown: { x: 0, y: -KEY_PAN_PX },
    };
    if (pan[event.key]) {
      event.preventDefault();
      apply(zoom, { x: offset.x + pan[event.key].x, y: offset.y + pan[event.key].y });
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomTo(zoom * 1.15);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomTo(zoom / 1.15);
    }
  };

  const reset = () => apply(1, { x: 0, y: 0 });

  const save = async () => {
    const image = imageRef.current;
    if (!image || !size) return;
    setSaving(true);
    setSaveError(null);
    try {
      const rect = cropRect(size, viewport, zoom, offset);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_PX;
      canvas.height = OUTPUT_PX;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.imageSmoothingQuality = "high";
      context.drawImage(image, rect.x, rect.y, rect.size, rect.size, 0, 0, OUTPUT_PX, OUTPUT_PX);
      const jpeg = file.type === "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, jpeg ? "image/jpeg" : "image/png", jpeg ? 0.92 : undefined),
      );
      if (!blob) throw new Error("Export failed");
      await onConfirm(blob);
    } catch {
      setSaveError("The photo couldn't be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const scale = size ? (viewport / Math.min(size.width, size.height)) * zoom : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            // Close only this step, not the Account modal behind it.
            event.preventDefault();
            event.stopPropagation();
            if (!saving) onCancel();
          }
        }}
        className="flex w-full max-w-[440px] flex-col overflow-hidden rounded-t-[20px] border border-rein-border-strong bg-[#07050f] text-white shadow-[0_0_120px_rgb(124_58_237/0.3)] focus:outline-none sm:rounded-[20px]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-rein-border px-5 pb-4 pt-5">
          <div className="flex flex-col gap-1">
            <p className={cx("m-0", eyebrow)}>PROFILE PHOTO</p>
            <h2 id={titleId} className="m-0 text-[22px] font-bold tracking-[-0.02em]">
              Crop your photo
            </h2>
            <p className="m-0 text-[13px] text-rein-soft">Drag to move, zoom to fit. The circle is what people see.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Cancel"
            className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-rein-border text-rein-soft hover:text-white disabled:opacity-50"
          >
            <XMarkIcon aria-hidden="true" className="size-[18px]" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-5 px-5 py-6">
          {/* Square viewport; the circle cut-out shows the avatar, the rest is dimmed. */}
          <div
            ref={viewportRef}
            role="application"
            aria-label="Photo position. Drag, or use the arrow keys to move and + or − to zoom."
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onWheel={onWheel}
            onKeyDown={onViewportKey}
            className="relative size-[min(280px,72vw)] cursor-grab touch-none select-none overflow-hidden rounded-xl bg-black outline-none focus-visible:ring-2 focus-visible:ring-rein-accent active:cursor-grabbing"
          >
            {source && size ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL being cropped, not a page image.
              <img
                src={source.url}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                style={{
                  width: size.width * scale,
                  height: size.height * scale,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-sm text-rein-soft">
                {loadError ?? "Loading photo…"}
              </span>
            )}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgb(0_0_0/0.62)] ring-2 ring-rein-accent/80"
            />
          </div>

          <div className="flex w-full max-w-[320px] items-center gap-3">
            <button
              type="button"
              onClick={() => zoomTo(zoom / 1.2)}
              disabled={!size || zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-rein-soft hover:bg-violet-500/15 hover:text-white disabled:opacity-40"
            >
              <MagnifyingGlassMinusIcon aria-hidden="true" className="size-[18px]" />
            </button>
            <label htmlFor={zoomId} className="sr-only">
              Zoom
            </label>
            <input
              id={zoomId}
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={!size}
              onChange={(event) => zoomTo(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer accent-[#a78bfa]"
            />
            <button
              type="button"
              onClick={() => zoomTo(zoom * 1.2)}
              disabled={!size || zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-rein-soft hover:bg-violet-500/15 hover:text-white disabled:opacity-40"
            >
              <MagnifyingGlassPlusIcon aria-hidden="true" className="size-[18px]" />
            </button>
          </div>

          {saveError && (
            <p role="alert" className="m-0 text-center text-sm text-red-300">
              {saveError}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2.5 border-t border-rein-line bg-black/60 px-5 py-4">
          <button
            type="button"
            onClick={reset}
            disabled={!size || saving}
            className="inline-flex h-10 items-center gap-1.5 rounded-[10px] px-3 text-sm text-rein-soft hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            <ArrowPathIcon aria-hidden="true" className="size-4" />
            Reset
          </button>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-[10px] border border-white/30 px-4 text-sm font-medium text-white transition-colors hover:border-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!size || saving}
              className="inline-flex h-10 items-center rounded-[10px] bg-rein-accent px-4 text-sm font-semibold text-black transition-colors hover:bg-violet-300 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save photo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
