import { describe, expect, it } from "vitest";
import { blobStyle, lavaPresets, nextWanderStep } from "./lava";

const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("nextWanderStep", () => {
  const range = lavaPresets.hero.wander;

  it("stays inside the configured range", () => {
    for (let n = 0; n < 200; n += 1) {
      const step = nextWanderStep(range);
      const [, x, y, scale, rotate] =
        /translate3d\((-?[\d.]+)vw, (-?[\d.]+)vh, 0\) scale\(([\d.]+)\) rotate\((-?[\d.]+)deg\)/.exec(step.transform) ?? [];
      expect(Math.abs(Number(x))).toBeLessThanOrEqual(range.x);
      expect(Math.abs(Number(y))).toBeLessThanOrEqual(range.y);
      expect(Number(scale)).toBeGreaterThanOrEqual(range.scale[0]);
      expect(Number(scale)).toBeLessThanOrEqual(range.scale[1]);
      expect(Math.abs(Number(rotate))).toBeLessThanOrEqual(range.rotate);
      expect(step.durationMs).toBeGreaterThanOrEqual(range.duration[0] * 1000);
      expect(step.durationMs).toBeLessThanOrEqual(range.duration[1] * 1000);
    }
  });

  it("is deterministic with an injected random source", () => {
    const a = nextWanderStep(range, sequence(0, 1, 0.5, 0.5, 0));
    const b = nextWanderStep(range, sequence(0, 1, 0.5, 0.5, 0));
    expect(a).toEqual(b);
    expect(a.transform).toBe("translate3d(-28.00vw, 22.00vh, 0) scale(1.025) rotate(0.0deg)");
    expect(a.durationMs).toBe(9000);
  });
});

describe("blobStyle", () => {
  it("staggers morph timing per blob", () => {
    const blob = lavaPresets.hero.blobs[0];
    expect(blobStyle(blob, 0).animationDelay).toBe("0s");
    expect(blobStyle(blob, 2).animationDelay).toBe("-7s");
  });
});
