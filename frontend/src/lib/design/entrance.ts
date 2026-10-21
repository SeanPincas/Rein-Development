/**
 * Alternating column entrance for staggered grids: even columns (1st, 3rd…) travel
 * down from above the viewport; odd columns (2nd…) travel up from below it.
 * Duration is `--enter-duration` (default 1600ms). CSS keyframes live in
 * globals.css (`.rein-enter-down` / `.rein-enter-up`).
 */

export type EntranceOptions = {
  /** Delay between cards in one column, ms. */
  stepMs?: number;
  /** Extra delay per column so columns start slightly apart, ms. */
  columnOffsetMs?: number;
};

export function columnEntrance(
  column: number,
  index: number,
  columnLength: number,
  { stepMs = 160, columnOffsetMs = 120 }: EntranceOptions = {},
) {
  const rising = column % 2 === 1;
  // The card nearest its destination leaves first, so cards never pass through each other:
  // falling columns lead with the bottom card, the rising column with the top card.
  const order = rising ? index : columnLength - 1 - index;
  return {
    className: rising ? "rein-enter-up" : "rein-enter-down",
    style: { animationDelay: `${column * columnOffsetMs + order * stepMs}ms` },
  };
}
