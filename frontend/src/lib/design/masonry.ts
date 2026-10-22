export type MasonryPlacementOptions = {
  /** Vertical gap between cards in a column (px). */
  gap: number;
  /** Extra top offset of every second column (px); it counts toward that column's length. */
  stagger: number;
  /** Re-place the last row into shorter columns. Off = strict `index % columns` (rearrange mode). */
  balanceTail?: boolean;
  /** A tail card moves only if its own column is longer than the shortest by more than this × the average card height. */
  thresholdRatio?: number;
};

/**
 * Column for each card in a staggered masonry.
 *
 * Head (everything above the last row): `index % columns`, exactly the user's order,
 * so rearranging stays predictable. Tail (the last row): each card, in order, goes to
 * the currently shortest column if that saves more than `thresholdRatio` of an average
 * card, otherwise it keeps its natural column. Heights of 0 mean "not measured yet";
 * until every card is measured the natural placement is used, so nothing flickers.
 */
export function placeMasonryItems(
  heights: readonly number[],
  columns: number,
  { gap, stagger, balanceTail = true, thresholdRatio = 0.5 }: MasonryPlacementOptions,
): number[] {
  const count = heights.length;
  const placement = heights.map((_, index) => (columns > 1 ? index % columns : 0));
  if (columns <= 1 || !balanceTail || count <= columns) return placement;
  if (heights.some((height) => !(height > 0))) return placement;

  const threshold = (heights.reduce((sum, height) => sum + height, 0) / count) * thresholdRatio;
  const tailStart = Math.floor((count - 1) / columns) * columns;
  const bottoms = Array.from({ length: columns }, (_, column) => (column % 2 === 1 ? stagger : 0));
  for (let index = 0; index < tailStart; index += 1) bottoms[placement[index]] += heights[index] + gap;

  for (let index = tailStart; index < count; index += 1) {
    const natural = placement[index];
    let shortest = natural;
    for (let column = 0; column < columns; column += 1) if (bottoms[column] < bottoms[shortest]) shortest = column;
    const column = bottoms[natural] - bottoms[shortest] > threshold ? shortest : natural;
    placement[index] = column;
    bottoms[column] += heights[index] + gap;
  }
  return placement;
}
