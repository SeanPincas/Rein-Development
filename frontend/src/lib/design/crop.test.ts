import { describe, expect, it } from "vitest";

import { clampOffset, clampZoom, coverScale, cropRect, zoomAt } from "./crop";

const landscape = { width: 1200, height: 800 };
const VIEW = 280;

describe("avatar crop maths", () => {
  it("cover-fits the short side to the viewport", () => {
    expect(coverScale(landscape, VIEW)).toBeCloseTo(0.35);
    expect(coverScale({ width: 500, height: 1000 }, VIEW)).toBeCloseTo(0.56);
  });

  it("keeps zoom within 1–4", () => {
    expect(clampZoom(0.2)).toBe(1);
    expect(clampZoom(2.5)).toBe(2.5);
    expect(clampZoom(9)).toBe(4);
  });

  it("never lets an edge of the image move inside the viewport", () => {
    // At zoom 1 the 1200×800 image is 420×280 on screen: 70px of slack each side horizontally, none vertically.
    expect(clampOffset({ x: 500, y: 90 }, landscape, VIEW, 1)).toEqual({ x: 70, y: 0 });
    const left = clampOffset({ x: -500, y: -90 }, landscape, VIEW, 1);
    expect(left.x).toBe(-70);
    expect(Math.abs(left.y)).toBe(0);
    // At zoom 2 it's 840×560: 280px and 140px of slack.
    expect(clampOffset({ x: 300, y: -300 }, landscape, VIEW, 2)).toEqual({ x: 280, y: -140 });
  });

  it("crops the centred square at zoom 1", () => {
    expect(cropRect(landscape, VIEW, 1, { x: 0, y: 0 })).toEqual({ x: 200, y: 0, size: 800 });
  });

  it("crops a smaller square when zoomed and follows the pan", () => {
    const zoomed = cropRect(landscape, VIEW, 2, { x: 0, y: 0 });
    expect(zoomed).toEqual({ x: 400, y: 200, size: 400 });
    // Dragging the image right by 70px reveals more of its left side.
    const panned = cropRect(landscape, VIEW, 1, { x: 70, y: 0 });
    expect(panned.x).toBeCloseTo(0);
    expect(panned.size).toBe(800);
  });

  it("zooms around the pointer so the spot under it stays fixed", () => {
    const point = { x: 50, y: -20 };
    const next = zoomAt({ x: 0, y: 0 }, point, 1, 2);
    expect(next).toEqual({ x: -50, y: 20 });
    // Image point under the pointer is the same before and after.
    const scale1 = coverScale(landscape, VIEW);
    const before = { x: landscape.width / 2 + (point.x - 0) / scale1, y: landscape.height / 2 + (point.y - 0) / scale1 };
    const after = { x: landscape.width / 2 + (point.x - next.x) / (scale1 * 2), y: landscape.height / 2 + (point.y - next.y) / (scale1 * 2) };
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
});
