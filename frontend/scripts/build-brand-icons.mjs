// Generates public/brand-icons/ from the `simple-icons` package (CC0 brand logos):
//   <slug>.svg   one monochrome 24×24 logo per brand, tinted in CSS via mask-image
//   index.json   { version, format, slugs, aliases }: hostname matching for every
//                tool icon (src/lib/shared/brand-icon-match.ts); small, loaded on /library
//   catalog.json [[slug, title, hex], …]: the Add/Edit Tool icon picker's search data
//                (src/lib/shared/brand-icon-search.ts); loaded only when the picker opens
// Runs before `dev` and `build`; does nothing when the output already matches the
// installed simple-icons version and this script's output format. `npm run brand-icons`
// forces a rebuild.
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputDir = path.join(frontendRoot, "public", "brand-icons");
/** Bump when the generated files change shape, so stale output is rebuilt. */
export const BRAND_ICONS_FORMAT = 2;

/** Lookup key for a brand title or domain label. Keep in sync with brand-icon-match.ts (a test checks parity). */
export function brandKey(value) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

const decodeEntities = (value) =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&(?:#39|apos);/g, "'")
    .replace(/&amp;/g, "&");

/**
 * @param {{ packageDir?: string; outputDir?: string; force?: boolean }} [options]
 * @returns {Promise<null | { version: string; skipped: boolean; icons?: number; aliases?: number }>}
 */
export async function buildBrandIcons(options = {}) {
  const packageDir =
    options.packageDir ?? process.env.SIMPLE_ICONS_DIR ?? path.join(frontendRoot, "node_modules", "simple-icons");
  const outputDir = options.outputDir ?? defaultOutputDir;
  const iconsDir = path.join(packageDir, "icons");
  if (!existsSync(iconsDir)) {
    console.warn("[brand-icons] simple-icons is not installed; skipping. Run `npm install` to enable brand logos.");
    return null;
  }

  const { version } = JSON.parse(await readFile(path.join(packageDir, "package.json"), "utf8"));
  const indexPath = path.join(outputDir, "index.json");
  const catalogPath = path.join(outputDir, "catalog.json");
  if (!options.force && existsSync(indexPath) && existsSync(catalogPath)) {
    try {
      const current = JSON.parse(await readFile(indexPath, "utf8"));
      if (current.version === version && current.format === BRAND_ICONS_FORMAT) return { version, skipped: true };
    } catch {
      // Unreadable index: rebuild below.
    }
  }

  const files = (await readdir(iconsDir)).filter((file) => file.endsWith(".svg")).sort();
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const slugs = [];
  const titles = new Map();
  const titleToSlug = new Map();
  for (const file of files) {
    const slug = file.slice(0, -4);
    const svg = await readFile(path.join(iconsDir, file), "utf8");
    const title = decodeEntities(svg.match(/<title>([^<]*)<\/title>/)?.[1] ?? "") || slug;
    slugs.push(slug);
    titles.set(slug, title);
    if (!titleToSlug.has(title)) titleToSlug.set(title, slug);
    await writeFile(path.join(outputDir, file), svg);
  }

  // Aliases map other spellings to a slug; they never shadow a real slug.
  const slugSet = new Set(slugs);
  const aliases = {};
  const addAlias = (key, slug) => {
    if (key && !slugSet.has(key) && !(key in aliases)) aliases[key] = slug;
  };
  for (const [title, slug] of titleToSlug) addAlias(brandKey(title), slug); // "Next.js" → nextjs → nextdotjs

  const hexes = new Map();
  const dataPath = path.join(packageDir, "data", "simple-icons.json");
  if (existsSync(dataPath)) {
    const raw = JSON.parse(await readFile(dataPath, "utf8"));
    const entries = Array.isArray(raw) ? raw : (raw.icons ?? []);
    for (const entry of entries) {
      const slug = entry.slug ?? titleToSlug.get(entry.title);
      if (!slug || !slugSet.has(slug)) continue;
      if (/^[0-9a-f]{6}$/i.test(entry.hex ?? "")) hexes.set(slug, entry.hex.toUpperCase());
      for (const aka of entry.aliases?.aka ?? []) addAlias(brandKey(aka), slug);
    }
  }

  const catalog = slugs.map((slug) => [slug, titles.get(slug), hexes.get(slug) ?? "000000"]);
  await writeFile(catalogPath, JSON.stringify(catalog));
  // index.json last: its presence + version/format mark a complete build.
  await writeFile(indexPath, JSON.stringify({ version, format: BRAND_ICONS_FORMAT, slugs, aliases }));
  return { version, skipped: false, icons: slugs.length, aliases: Object.keys(aliases).length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await buildBrandIcons({ force: process.argv.includes("--force") });
  if (result && !result.skipped) {
    console.log(`[brand-icons] ${result.icons} icons, ${result.aliases} aliases (simple-icons ${result.version})`);
  }
}
