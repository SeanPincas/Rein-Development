import { describe, expect, it } from "vitest";

import {
  categoryIconKeys,
  categoryIconLibrary,
  defaultCategoryIconKey,
  getCategoryIconOption,
  isCategoryIconKey,
} from "./icon-library";

describe("category icon library", () => {
  it("contains unique stable keys and Heroicons component names", () => {
    expect(new Set(categoryIconKeys).size).toBe(categoryIconLibrary.length);

    for (const option of categoryIconLibrary) {
      expect(option.key).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(option.heroicon).toMatch(/^[A-Z][A-Za-z0-9]+Icon$/);
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  it("recognizes only catalogue keys", () => {
    expect(isCategoryIconKey("databases")).toBe(true);
    expect(isCategoryIconKey("CircleStackIcon")).toBe(false);
    expect(isCategoryIconKey("unknown")).toBe(false);
  });

  it("resolves an icon option by its persisted key", () => {
    expect(getCategoryIconOption("deployment")).toMatchObject({
      label: "Deployment",
      heroicon: "RocketLaunchIcon",
    });
    expect(getCategoryIconOption(defaultCategoryIconKey).key).toBe("general");
  });
});
