import { describe, expect, it } from "vitest";
import { flipDeltas } from "./flip";

describe("flipDeltas", () => {
  it("returns old-minus-new offsets only for items that moved", () => {
    const before = new Map([
      ["a", { x: 0, y: 0 }],
      ["b", { x: 400, y: 0 }],
      ["c", { x: 800, y: 0 }],
    ]);
    const after = new Map([
      ["a", { x: 400, y: 0 }],
      ["b", { x: 0, y: 0 }],
      ["c", { x: 800, y: 0.2 }],
    ]);
    expect([...flipDeltas(before, after)]).toEqual([
      ["a", { x: -400, y: 0 }],
      ["b", { x: 400, y: 0 }],
    ]);
  });

  it("skips items that have no previous position (newly added cards)", () => {
    const after = new Map([["new", { x: 10, y: 10 }]]);
    expect(flipDeltas(new Map(), after).size).toBe(0);
  });

  it("handles a move into another column diagonally", () => {
    const before = new Map([["a", { x: 0, y: 300 }]]);
    const after = new Map([["a", { x: 420, y: 0 }]]);
    expect(flipDeltas(before, after).get("a")).toEqual({ x: -420, y: 300 });
  });
});
