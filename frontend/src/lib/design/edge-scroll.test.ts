import { describe, expect, it } from "vitest";

import { edgeScrollSpeed } from "./edge-scroll";

const area = { top: 100, bottom: 900 };

describe("edgeScrollSpeed", () => {
  it("holds still in the middle", () => {
    expect(edgeScrollSpeed(500, area)).toBe(0);
    expect(edgeScrollSpeed(100 + 110, area)).toBe(0);
  });

  it("scrolls up near the top and down near the bottom", () => {
    expect(edgeScrollSpeed(150, area)).toBeLessThan(0);
    expect(edgeScrollSpeed(850, area)).toBeGreaterThan(0);
  });

  it("gets faster closer to the edge and caps beyond it", () => {
    const gentle = Math.abs(edgeScrollSpeed(200, area));
    const quick = Math.abs(edgeScrollSpeed(110, area));
    expect(quick).toBeGreaterThan(gentle);
    expect(edgeScrollSpeed(100, area)).toBe(-22);
    expect(edgeScrollSpeed(20, area)).toBe(-22); // pointer over the navbar
    expect(edgeScrollSpeed(990, area)).toBe(22);
  });

  it("never drops below the minimum speed inside the zone", () => {
    expect(Math.abs(edgeScrollSpeed(209, area))).toBeGreaterThanOrEqual(1.5);
  });
});
