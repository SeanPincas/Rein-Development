import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { catalogFromRows, createBrandIconSearch, type BrandIconCatalogRow } from "./brand-icon-search";

const rows: BrandIconCatalogRow[] = [
  ["github", "GitHub", "181717"],
  ["githubactions", "GitHub Actions", "2088FF"],
  ["githubcopilot", "GitHub Copilot", "000000"],
  ["gitlab", "GitLab", "FC6D26"],
  ["nextdotjs", "Next.js", "000000"],
  ["radixui", "Radix UI", "161618"],
  ["supabase", "Supabase", "3FCF8E"],
  ["tailwindcss", "Tailwind CSS", "06B6D4"],
  ["googlecloud", "Google Cloud", "4285F4"],
  ["google", "Google", "4285F4"],
  ["vercel", "Vercel", "000000"],
];
const { search, get } = createBrandIconSearch(catalogFromRows(rows), { aliases: { nextjs: "nextdotjs", radixui: "radixui" } });
const slugs = (list: { slug: string }[]) => list.map((entry) => entry.slug);

describe("Simple Icons search", () => {
  it("puts the exact hostname match first", () => {
    const results = search({ hostname: "docs.github.com", name: "Docs" });
    expect(results[0]).toEqual({ slug: "github", title: "GitHub", hex: "181717" });
    expect(slugs(search({ hostname: "www.radix-ui.com" }))[0]).toBe("radixui");
    expect(slugs(search({ hostname: "nextjs.org" }))[0]).toBe("nextdotjs");
  });

  it("finds brands from the tool name: exact, alias, prefix and extended names", () => {
    expect(slugs(search({ name: "Supabase" }))[0]).toBe("supabase");
    expect(slugs(search({ name: "Next.js" }))[0]).toBe("nextdotjs");
    expect(slugs(search({ name: "RadixUI-Icons" }))[0]).toBe("radixui");
    expect(slugs(search({ name: "Heroicons by Tailwind CSS" }))).toContain("tailwindcss");
    expect(slugs(search({ name: "git" }))).toEqual(expect.arrayContaining(["github", "gitlab"]));
  });

  it("ranks exact hostname and exact name above fuzzy matches", () => {
    const results = slugs(search({ hostname: "vercel.com", name: "GitHub" }));
    expect(results.slice(0, 2)).toEqual(["vercel", "github"]);
    expect(results.indexOf("githubactions")).toBeGreaterThan(1);
  });

  it("searches titles and slugs from free text, and respects the result limit", () => {
    expect(slugs(search({ query: "cloud" }))).toContain("googlecloud");
    expect(slugs(search({ query: "nextdot" }))).toEqual(["nextdotjs"]);
    expect(search({ query: "g" }, 3)).toHaveLength(3);
    expect(search({ query: "g" }, 50).length).toBeLessThanOrEqual(12);
    expect(get("vercel")?.title).toBe("Vercel");
  });

  it("returns an empty list safely when nothing matches", () => {
    expect(search({ name: "zzqx unknown tool", hostname: "my-random-blog.example" })).toEqual([]);
    expect(search({})).toEqual([]);
    expect(search({ hostname: "localhost", name: "" })).toEqual([]);
    expect(createBrandIconSearch([]).search({ name: "GitHub" })).toEqual([]);
  });

  const generated = path.resolve(process.cwd(), "public/brand-icons/catalog.json");
  it.skipIf(!existsSync(generated))("works on the generated catalog", () => {
    const real = createBrandIconSearch(catalogFromRows(JSON.parse(readFileSync(generated, "utf8"))));
    expect(slugs(real.search({ hostname: "github.com", name: "GitHub" }))[0]).toBe("github");
    expect(slugs(real.search({ name: "Supabase" }))[0]).toBe("supabase");
  });
});
