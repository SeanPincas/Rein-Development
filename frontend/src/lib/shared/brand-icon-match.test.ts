import { mkdtemp, readFile, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { BRAND_ICONS_FORMAT, brandKey as scriptBrandKey, buildBrandIcons } from "../../../scripts/build-brand-icons.mjs";
import { brandKey, brandKeysForHost, createBrandResolver, type BrandIconIndex } from "./brand-icon-match";

const index: BrandIconIndex = {
  version: "test",
  slugs: [
    "bbc", "bootstrap", "firebase", "flydotio", "github", "gmail", "google", "googlecloud", "jest",
    "mdnwebdocs", "nextdotjs", "radixui", "ray", "raycast", "storybook", "vercel", "x",
  ],
  aliases: { nextjs: "nextdotjs", flyio: "flydotio" },
};
const resolve = createBrandResolver(index);

describe("brand icon matching", () => {
  it("keeps the client key function in sync with the build script", () => {
    for (const value of ["Next.js", "Radix UI", "C++", "AT&T", "Citroën", "fly.io"]) {
      expect(brandKey(value)).toBe(scriptBrandKey(value));
    }
    expect(brandKey("Next.js")).toBe("nextjs");
  });

  it("resolves brands from domains, subdomains, aliases and marketing affixes", () => {
    expect(resolve("github.com")).toBe("github");
    expect(resolve("docs.github.com")).toBe("github");
    expect(resolve("www.vercel.com")).toBe("vercel");
    expect(resolve("www.radix-ui.com")).toBe("radixui");
    expect(resolve("nextjs.org")).toBe("nextdotjs");
    expect(resolve("fly.io")).toBe("flydotio");
    expect(resolve("console.cloud.google.com")).toBe("googlecloud");
    expect(resolve("firebase.google.com")).toBe("firebase");
    expect(resolve("storybook.js.org")).toBe("storybook");
    expect(resolve("getbootstrap.com")).toBe("bootstrap");
    expect(resolve("jestjs.io")).toBe("jest");
    expect(resolve("bbc.co.uk")).toBe("bbc");
    expect(resolve("x.com")).toBe("x");
  });

  it("applies overrides where the obvious key is the wrong brand", () => {
    expect(resolve("developer.mozilla.org")).toBe("mdnwebdocs");
    expect(resolve("mail.google.com")).toBe("gmail");
    expect(resolve("ray.so")).toBe("raycast");
    expect(resolve("twitter.com")).toBe("x");
  });

  it("does not brand projects hosted on platforms, unknown sites, IPs or local hosts", () => {
    expect(resolve("myapp.vercel.app")).toBeNull();
    expect(resolve("someone.github.io")).toBeNull();
    expect(resolve("docs.myapp.vercel.app")).toBeNull();
    expect(resolve("example.com")).toBeNull();
    expect(resolve("localhost")).toBeNull();
    expect(resolve("192.168.1.4")).toBeNull();
    expect(brandKeysForHost("[::1]")).toEqual([]);
  });
});

describe("brand icon build script", () => {
  it("writes logos, an alias index and the picker catalog, then skips an up-to-date rebuild", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "rein-brand-icons-"));
    try {
      const pkg = path.join(root, "simple-icons");
      const out = path.join(root, "out");
      await mkdir(path.join(pkg, "icons"), { recursive: true });
      await mkdir(path.join(pkg, "data"), { recursive: true });
      await writeFile(path.join(pkg, "package.json"), JSON.stringify({ version: "1.2.3" }));
      const svg = (title: string) => `<svg role="img" viewBox="0 0 24 24"><title>${title}</title><path d="M0 0h24v24H0z"/></svg>`;
      await writeFile(path.join(pkg, "icons", "nextdotjs.svg"), svg("Next.js"));
      await writeFile(path.join(pkg, "icons", "dotenv.svg"), svg(".ENV"));
      await writeFile(path.join(pkg, "data", "simple-icons.json"), JSON.stringify([
        { title: "Next.js", hex: "000000" },
        { title: ".ENV", slug: "dotenv", hex: "ECD53F", aliases: { aka: ["Dotenv Files"] } },
      ]));

      const first = await buildBrandIcons({ packageDir: pkg, outputDir: out });
      expect(first).toMatchObject({ version: "1.2.3", skipped: false, icons: 2 });
      const built = JSON.parse(await readFile(path.join(out, "index.json"), "utf8")) as BrandIconIndex;
      expect(built.slugs).toEqual(["dotenv", "nextdotjs"]);
      expect((built as BrandIconIndex & { format?: number }).format).toBe(BRAND_ICONS_FORMAT);
      expect(JSON.parse(await readFile(path.join(out, "catalog.json"), "utf8"))).toEqual([
        ["dotenv", ".ENV", "ECD53F"],
        ["nextdotjs", "Next.js", "000000"],
      ]);
      expect(built.aliases).toEqual({ env: "dotenv", nextjs: "nextdotjs", dotenvfiles: "dotenv" });
      expect(await readFile(path.join(out, "nextdotjs.svg"), "utf8")).toBe(svg("Next.js"));

      expect(await buildBrandIcons({ packageDir: pkg, outputDir: out })).toEqual({ version: "1.2.3", skipped: true });

      // Output from an older format (no catalog) is rebuilt even at the same version.
      await rm(path.join(out, "catalog.json"));
      expect(await buildBrandIcons({ packageDir: pkg, outputDir: out })).toMatchObject({ skipped: false });
      await writeFile(path.join(out, "index.json"), JSON.stringify({ ...built, format: 1 }));
      expect(await buildBrandIcons({ packageDir: pkg, outputDir: out })).toMatchObject({ skipped: false });
      expect(await buildBrandIcons({ packageDir: path.join(root, "missing"), outputDir: out })).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
