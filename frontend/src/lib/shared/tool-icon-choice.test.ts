import { describe, expect, it } from "vitest";

import type { BrandIconEntry } from "./brand-icon-search";
import { iconPickerOptions, resolveDisplaySlug, type DisplayIconDeps } from "./tool-icon-choice";

const github: BrandIconEntry = { slug: "github", title: "GitHub", hex: "181717" };
const gitlab: BrandIconEntry = { slug: "gitlab", title: "GitLab", hex: "FC6D26" };
const vercel: BrandIconEntry = { slug: "vercel", title: "Vercel", hex: "000000" };
const lookup = (slug: string) => [github, gitlab, vercel].find((entry) => entry.slug === slug);

describe("icon picker selection", () => {
  it("marks the selected icon among the results", () => {
    const options = iconPickerOptions([github, gitlab], "gitlab", lookup);
    expect(options.map((o) => [o.slug, o.selected])).toEqual([
      ["github", false],
      ["gitlab", true],
    ]);
  });

  it("keeps the current choice visible when the search doesn't return it", () => {
    const options = iconPickerOptions([github, gitlab], "vercel", lookup);
    expect(options[0]).toEqual({ ...vercel, selected: true });
    expect(options).toHaveLength(3);
  });

  it("selects nothing for the fallback, including with no results at all", () => {
    expect(iconPickerOptions([github], null, lookup).some((o) => o.selected)).toBe(false);
    expect(iconPickerOptions([], null, lookup)).toEqual([]);
  });
});

describe("tool icon display fallback", () => {
  const deps = (failed: string[] = [], known = ["github", "vercel"]): DisplayIconDeps => ({
    has: (slug) => known.includes(slug),
    resolve: (hostname) => (hostname.endsWith("github.com") ? "github" : null),
    failed: (slug) => failed.includes(slug),
  });

  it("shows the chosen icon first", () => {
    expect(resolveDisplaySlug({ iconSlug: "vercel", hostname: "github.com" }, deps())).toBe("vercel");
  });

  it("falls back to the hostname match when the chosen SVG asset is missing or unknown", () => {
    expect(resolveDisplaySlug({ iconSlug: "vercel", hostname: "github.com" }, deps(["vercel"]))).toBe("github");
    expect(resolveDisplaySlug({ iconSlug: "removed-brand", hostname: "github.com" }, deps())).toBe("github");
  });

  it("falls back to the letter tile when the hostname match is missing too", () => {
    expect(resolveDisplaySlug({ iconSlug: "vercel", hostname: "github.com" }, deps(["vercel", "github"]))).toBeNull();
    expect(resolveDisplaySlug({ iconSlug: null, hostname: "example.com" }, deps())).toBeNull();
  });
});
