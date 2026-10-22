import { describe, expect, it } from "vitest";

import { buildCreateToolPayload, buildToolUpdatePayload } from "./tool-payload";

const base = {
  name: "GitHub",
  url: "https://github.com/",
  description: "Code hosting",
  category: { id: "cat-1" },
};

const original = {
  url: "https://github.com/",
  name: "GitHub",
  description: "Code hosting",
  categoryId: "cat-1",
  iconSlug: "github" as string | null,
  version: 4,
};

describe("POST /api/tools payload", () => {
  it("includes the selected iconSlug and the metadata token", () => {
    expect(buildCreateToolPayload({ ...base, iconSlug: "github", metadataToken: "tok" })).toEqual({
      ...base,
      metadataToken: "tok",
      iconSlug: "github",
    });
  });

  it("omits iconSlug when the fallback is chosen", () => {
    const payload = buildCreateToolPayload({ ...base, iconSlug: null });
    expect(payload).toEqual(base);
    expect("iconSlug" in payload).toBe(false);
  });

  it("keeps the new-category shape", () => {
    const category = { create: { name: "Hosting", iconKey: "cloud" as const } };
    expect(buildCreateToolPayload({ ...base, category, iconSlug: null } as Parameters<typeof buildCreateToolPayload>[0]).category).toEqual(category);
  });
});

describe("PATCH /api/tools/:id payload", () => {
  const unchanged = { url: original.url, name: original.name, description: original.description, categoryId: "cat-1", iconSlug: "github" };

  it("returns null when nothing changed", () => {
    expect(buildToolUpdatePayload(original, unchanged)).toBeNull();
  });

  it("changes the icon with the current version", () => {
    expect(buildToolUpdatePayload(original, { ...unchanged, iconSlug: "githubactions" })).toEqual({ iconSlug: "githubactions", version: 4 });
  });

  it("clears the icon by sending null", () => {
    expect(buildToolUpdatePayload(original, { ...unchanged, iconSlug: null })).toEqual({ iconSlug: null, version: 4 });
  });

  it("selects an icon for a tool that had none", () => {
    expect(buildToolUpdatePayload({ ...original, iconSlug: null }, { ...unchanged, iconSlug: "github" })).toEqual({ iconSlug: "github", version: 4 });
  });

  it("re-sends a kept icon with a URL change so the server doesn't clear it", () => {
    expect(buildToolUpdatePayload(original, { ...unchanged, url: "https://github.com/features", metadataToken: "tok" })).toEqual({
      url: "https://github.com/features",
      iconSlug: "github",
      metadataToken: "tok",
      version: 4,
    });
    expect(buildToolUpdatePayload({ ...original, iconSlug: null }, { ...unchanged, url: "https://gitlab.com/", iconSlug: null })).toEqual({
      url: "https://gitlab.com/",
      version: 4,
    });
  });

  it("sends only changed text and category fields", () => {
    expect(buildToolUpdatePayload(original, { ...unchanged, name: "GitHub Docs", categoryId: "cat-2" })).toEqual({
      name: "GitHub Docs",
      categoryId: "cat-2",
      version: 4,
    });
  });
});
