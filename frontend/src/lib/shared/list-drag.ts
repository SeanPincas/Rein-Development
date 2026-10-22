/** Pure maths for dragging rows of equal height in a vertical list. */

/** Index a held row lands on after moving `deltaY` px, for rows `pitch` px apart (height + gap). */
export function dragTargetIndex(from: number, deltaY: number, pitch: number, count: number): number {
  if (count <= 0 || !(pitch > 0)) return from;
  return Math.min(count - 1, Math.max(0, from + Math.round(deltaY / pitch)));
}

/**
 * How many rows another row steps (−1 up, +1 down, 0 stays) to make room while the
 * row from `from` is held over `to`.
 */
export function rowShift(index: number, from: number, to: number): -1 | 0 | 1 {
  if (from < to && index > from && index <= to) return -1;
  if (from > to && index >= to && index < from) return 1;
  return 0;
}
