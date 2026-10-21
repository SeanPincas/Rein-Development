import { describe, expect, it } from "vitest";
import { hexToRgb, liquidPresets } from "./liquid";

describe("hexToRgb", () => {
  it("converts 6- and 3-digit hex to 0–1 channels", () => {
    expect(hexToRgb("#ffffff")).toEqual([1, 1, 1]);
    expect(hexToRgb("#000")).toEqual([0, 0, 0]);
    expect(hexToRgb("6d28d9").map((v) => Number(v.toFixed(3)))).toEqual([0.427, 0.157, 0.851]);
  });

  it("rejects invalid colours", () => {
    expect(() => hexToRgb("#12345")).toThrow();
  });

  it("accepts every preset colour", () => {
    for (const preset of Object.values(liquidPresets)) {
      expect(() => [preset.deep, preset.mid, preset.light].map(hexToRgb)).not.toThrow();
    }
  });
});
