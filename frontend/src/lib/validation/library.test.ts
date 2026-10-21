import { describe, expect, it } from "vitest";

import {
  createCategorySchema,
  createToolSchema,
  normalizeToolUrl,
  updateCategorySchema,
  updateToolSchema,
} from "./library";

describe("library validation", () => {
  it("canonicalizes category whitespace and accepts a catalogue icon", () => {
    expect(
      createCategorySchema.parse({
        name: "  Icon   Libraries  ",
        iconKey: "icon-libraries",
      }),
    ).toEqual({ name: "Icon Libraries", iconKey: "icon-libraries" });
  });

  it("rejects unknown category icons", () => {
    expect(() =>
      createCategorySchema.parse({ name: "Icons", iconKey: "made-up" }),
    ).toThrow();
  });

  it("requires a mutable category or tool field", () => {
    expect(() => updateCategorySchema.parse({ version: 1 })).toThrow();
    expect(() => updateToolSchema.parse({ version: 1 })).toThrow();
  });

  it("normalizes host casing and default ports while preserving destination parts", () => {
    expect(
      normalizeToolUrl("https://EXAMPLE.com:443/Course/?q=One#part"),
    ).toEqual({
      url: "https://EXAMPLE.com:443/Course/?q=One#part",
      normalizedUrl: "https://example.com/Course/?q=One#part",
      hostname: "example.com",
    });
  });

  it.each([
    "javascript:alert(1)",
    "https://user:password@example.com/",
    "not a URL",
  ])("rejects unsafe or invalid tool URL %s", (url) => {
    expect(() => normalizeToolUrl(url)).toThrow();
  });

  it("accepts inline category creation as part of a tool", () => {
    expect(
      createToolSchema.parse({
        name: "Heroicons",
        url: "https://heroicons.com/",
        description: "SVG icons for interfaces.",
        category: {
          create: { name: "Icon Libraries", iconKey: "icon-libraries" },
        },
      }),
    ).toMatchObject({
      url: { normalizedUrl: "https://heroicons.com/" },
      category: { create: { iconKey: "icon-libraries" } },
    });
  });
});
