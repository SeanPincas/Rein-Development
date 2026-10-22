import { describe, expect, it } from "vitest";

import { placeMasonryItems } from "./masonry";

const opts = { gap: 24, stagger: 32 };

describe("masonry placement", () => {
  it("uses one column on phones", () => {
    expect(placeMasonryItems([300, 200, 100], 1, opts)).toEqual([0, 0, 0]);
  });

  it("keeps the natural order when columns are balanced", () => {
    expect(placeMasonryItems([200, 200, 200, 200, 200, 200], 3, opts)).toEqual([0, 1, 2, 0, 1, 2]);
    // The stagger offset alone (32px) is below half a card, so nothing moves.
    expect(placeMasonryItems([200, 200, 200], 2, opts)).toEqual([0, 1, 0]);
  });

  it("moves the last card into the shorter column (tablet dead space)", () => {
    // Left gets two long cards, right two short ones; the 5th card would extend the left.
    expect(placeMasonryItems([600, 200, 500, 200, 250], 2, opts)).toEqual([0, 1, 0, 1, 1]);
  });

  it("only re-places the last row; earlier cards keep the user's order", () => {
    const heights = [700, 150, 150, 600, 150, 150, 200, 200, 200];
    const placement = placeMasonryItems(heights, 3, opts);
    expect(placement.slice(0, 6)).toEqual([0, 1, 2, 0, 1, 2]);
    expect(placement.slice(6)).not.toContain(0);
  });

  it("fills short columns greedily, card by card, in order", () => {
    // Head: col0 = 900, col1 = 200 + 32 stagger. Both tail cards go right until it catches up.
    expect(placeMasonryItems([900, 200, 250, 250], 2, opts)).toEqual([0, 1, 1, 1]);
  });

  it("waits for every card to be measured", () => {
    expect(placeMasonryItems([600, 200, 500, 200, 0], 2, opts)).toEqual([0, 1, 0, 1, 0]);
  });

  it("can be switched off for rearrange mode", () => {
    expect(placeMasonryItems([600, 200, 500, 200, 250], 2, { ...opts, balanceTail: false })).toEqual([0, 1, 0, 1, 0]);
  });

  it("leaves a single row alone", () => {
    expect(placeMasonryItems([900, 100, 100], 3, opts)).toEqual([0, 1, 2]);
  });
});
