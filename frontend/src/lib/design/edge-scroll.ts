/**
 * Auto-scroll speed while dragging near the top or bottom edge of a scroll area.
 * Returns px to scroll this frame: negative = up, positive = down, 0 = hold still.
 * The closer the pointer gets to (or past) an edge, the faster it scrolls; the
 * speed eases in so the first few pixels inside the zone move gently.
 */
export type EdgeScrollOptions = {
  /** Height of the active band at each edge, px. Capped at a third of the area. */
  zone?: number;
  /** Fastest speed, px per frame (reached at or beyond the edge). */
  maxSpeed?: number;
  /** Slowest speed once inside the zone, px per frame, so it never stalls. */
  minSpeed?: number;
};

export function edgeScrollSpeed(
  pointerY: number,
  area: { top: number; bottom: number },
  { zone = 110, maxSpeed = 22, minSpeed = 1.5 }: EdgeScrollOptions = {},
): number {
  const band = Math.min(zone, (area.bottom - area.top) / 3);
  if (band <= 0) return 0;
  const speedFor = (distance: number) => {
    const t = Math.min(1, Math.max(0, (band - distance) / band));
    return minSpeed + (maxSpeed - minSpeed) * t * t;
  };
  const fromTop = pointerY - area.top;
  const fromBottom = area.bottom - pointerY;
  if (fromTop < band) return -speedFor(fromTop);
  if (fromBottom < band) return speedFor(fromBottom);
  return 0;
}
