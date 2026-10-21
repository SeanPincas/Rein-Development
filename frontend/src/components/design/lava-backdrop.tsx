"use client";

import { useEffect, useRef } from "react";
import { blobStyle, cx, lavaPresets, nextWanderStep, type LavaPresetName } from "@/lib/design";

type LavaBackdropProps = {
  preset?: LavaPresetName;
  /** `fixed` stays behind the viewport while scrolling; `absolute` fills its parent. */
  position?: "fixed" | "absolute";
  className?: string;
};

/**
 * Lava-lamp purple shadows: morphing, blurred blobs that wander to random spots.
 * Usage: <LavaBackdrop /> inside any `relative isolate` page root.
 */
export function LavaBackdrop({ preset = "hero", position = "fixed", className }: LavaBackdropProps) {
  const { blobs, wander } = lavaPresets[preset];
  const blobRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers = new Set<number>();

    const clearTimers = () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };

    const moveBlob = (element: HTMLDivElement) => {
      const step = nextWanderStep(wander);
      element.style.transitionDuration = `${step.durationMs}ms`;
      element.style.transform = step.transform;
      // Pick a new destination a little before arriving so the motion never fully stops.
      const id = window.setTimeout(() => {
        timers.delete(id);
        moveBlob(element);
      }, step.durationMs * 0.85);
      timers.add(id);
    };

    const start = () => {
      clearTimers();
      if (reducedMotion.matches || document.hidden) return;
      blobRefs.current.forEach((element, index) => {
        if (!element) return;
        const id = window.setTimeout(() => {
          timers.delete(id);
          moveBlob(element);
        }, index * 600);
        timers.add(id);
      });
    };

    start();
    document.addEventListener("visibilitychange", start);
    reducedMotion.addEventListener("change", start);

    return () => {
      clearTimers();
      document.removeEventListener("visibilitychange", start);
      reducedMotion.removeEventListener("change", start);
    };
  }, [wander]);

  return (
    <div
      aria-hidden="true"
      className={cx("pointer-events-none inset-0 -z-10 overflow-hidden", position, className)}
    >
      {blobs.map((blob, index) => (
        <div
          key={index}
          ref={(element) => {
            blobRefs.current[index] = element;
          }}
          className="lava-blob"
          style={blobStyle(blob, index)}
        />
      ))}
    </div>
  );
}
