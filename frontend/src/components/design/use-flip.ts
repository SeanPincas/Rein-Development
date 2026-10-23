"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { FLIP_DEFAULTS, flipDeltas, measureFlipItems, type Point } from "@/lib/design";

type FlipOptions = {
  durationMs?: number;
  easing?: string;
  staggerMs?: number;
  /** false: track positions but don't animate (e.g. while an entrance plays). */
  enabled?: boolean;
  /** Cascade order of ids; defaults to `orderKey.split("|")`. */
  order?: readonly string[];
  /** Attribute marking the items to slide (default `data-flip-id`); lets nested lists animate independently. */
  attribute?: string;
};

/**
 * Slide `[data-flip-id]` children of `containerRef` to their new places whenever
 * `orderKey` changes. Positions are re-measured after every render so the next
 * reorder starts from where cards really are. Skipped for reduced motion.
 */
export function useFlip(containerRef: RefObject<HTMLElement | null>, orderKey: string, options: FlipOptions = {}) {
  const positions = useRef<Map<string, Point>>(new Map());
  const lastKey = useRef(orderKey);
  const {
    durationMs = FLIP_DEFAULTS.durationMs,
    easing = FLIP_DEFAULTS.easing,
    staggerMs = FLIP_DEFAULTS.staggerMs,
    enabled = true,
    order: orderOption,
    attribute = "data-flip-id",
  } = options;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const next = measureFlipItems(container, attribute);
    const orderChanged = lastKey.current !== orderKey;
    lastKey.current = orderKey;

    if (enabled && orderChanged && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const order = orderOption ? [...orderOption] : orderKey.split("|");
      const moved = [...flipDeltas(positions.current, next)].sort(
        ([a], [b]) => order.indexOf(a) - order.indexOf(b),
      );
      moved.forEach(([id, delta], step) => {
        const element = container.querySelector<HTMLElement>(`[${attribute}="${CSS.escape(id)}"]`);
        // fill "backwards" holds the old position during the cascade delay, so nothing jumps first.
        element?.animate(
          [{ transform: `translate(${delta.x}px, ${delta.y}px)` }, { transform: "translate(0, 0)" }],
          { duration: durationMs, easing, delay: step * staggerMs, fill: "backwards" },
        );
      });
    }
    positions.current = next;
  });
}
