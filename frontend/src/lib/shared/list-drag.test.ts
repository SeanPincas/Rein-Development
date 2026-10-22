import { describe, expect, it } from "vitest";

import { dragTargetIndex, rowShift } from "./list-drag";

describe("list drag maths", () => {
  it("lands on the row the pointer passed half of", () => {
    expect(dragTargetIndex(0, 0, 60, 5)).toBe(0);
    expect(dragTargetIndex(0, 29, 60, 5)).toBe(0);
    expect(dragTargetIndex(0, 31, 60, 5)).toBe(1);
    expect(dragTargetIndex(3, -125, 60, 5)).toBe(1);
  });

  it("clamps to the ends of the list and ignores bad input", () => {
    expect(dragTargetIndex(1, -999, 60, 5)).toBe(0);
    expect(dragTargetIndex(1, 999, 60, 5)).toBe(4);
    expect(dragTargetIndex(2, 100, 0, 5)).toBe(2);
    expect(dragTargetIndex(0, 100, 60, 0)).toBe(0);
  });

  it("shifts the rows between the old and new spot toward the gap", () => {
    // Row 1 held over row 3: rows 2 and 3 step up.
    expect([0, 1, 2, 3, 4].map((i) => rowShift(i, 1, 3))).toEqual([0, 0, -1, -1, 0]);
    // Row 3 held over row 1: rows 1 and 2 step down.
    expect([0, 1, 2, 3, 4].map((i) => rowShift(i, 3, 1))).toEqual([0, 1, 1, 0, 0]);
    expect([0, 1, 2].map((i) => rowShift(i, 1, 1))).toEqual([0, 0, 0]);
  });
});
