/**
 * FLIP ("first, last, invert, play") helpers for animating reorders.
 *
 * Measure every item's position relative to its container before and after a
 * reorder, then play each item from its old offset back to zero. Positions are
 * container-relative so page scrolling between measurements isn't mistaken for
 * movement. Use `useFlip` (components/design/use-flip.ts) in React.
 */

export type Point = { x: number; y: number };

export const FLIP_DEFAULTS = {
  /** Slow enough to follow each card from its old place to its new one. */
  durationMs: 800,
  /** Smooth ease-in-out, like a carousel shifting every item along by one. */
  easing: "cubic-bezier(0.65, 0, 0.35, 1)",
  /** Each moving card starts slightly after the one before it (in the new order). */
  staggerMs: 45,
  /** Ignore sub-pixel jitter. */
  thresholdPx: 0.5,
} as const;

/** Offsets to play from: old position minus new position, for items that actually moved. */
export function flipDeltas(
  previous: ReadonlyMap<string, Point>,
  next: ReadonlyMap<string, Point>,
  thresholdPx: number = FLIP_DEFAULTS.thresholdPx,
): Map<string, Point> {
  const deltas = new Map<string, Point>();
  for (const [id, now] of next) {
    const before = previous.get(id);
    if (!before) continue;
    const dx = before.x - now.x;
    const dy = before.y - now.y;
    if (Math.abs(dx) > thresholdPx || Math.abs(dy) > thresholdPx) deltas.set(id, { x: dx, y: dy });
  }
  return deltas;
}

/** Positions of every `[data-flip-id]` element, relative to `container`. */
export function measureFlipItems(container: HTMLElement): Map<string, Point> {
  const base = container.getBoundingClientRect();
  const positions = new Map<string, Point>();
  container.querySelectorAll<HTMLElement>("[data-flip-id]").forEach((element) => {
    const id = element.dataset.flipId;
    if (!id) return;
    const rect = element.getBoundingClientRect();
    positions.set(id, { x: rect.left - base.left, y: rect.top - base.top });
  });
  return positions;
}
