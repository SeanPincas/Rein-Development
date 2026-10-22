/**
 * Search over the bundled Simple Icons catalog (/brand-icons/catalog.json, built by
 * scripts/build-brand-icons.mjs from the `simple-icons` package) for the Add/Edit
 * Tool icon picker. Pure and synchronous; the caller loads the data.
 */
import { brandKey, createBrandResolver, hostNameLabel, type BrandIconIndex } from "./brand-icon-match";

export type BrandIconEntry = { slug: string; title: string; hex: string };

/** catalog.json rows: [slug, title, hex]. */
export type BrandIconCatalogRow = [slug: string, title: string, hex: string];

export type BrandIconSearchInput = {
  /** The tool name the user typed. */
  name?: string;
  /** Hostname of the tool URL (www./case are normalised). */
  hostname?: string | null;
  /** Free text from the picker's search box; when set, it replaces name/hostname. */
  query?: string;
};

export type BrandIconSearch = {
  search: (input: BrandIconSearchInput, limit?: number) => BrandIconEntry[];
  get: (slug: string) => BrandIconEntry | undefined;
};

export const DEFAULT_RESULT_LIMIT = 10;
const MAX_RESULT_LIMIT = 12;

// Score tiers. Exact hostname and exact tool-name matches always lead.
const SCORE = {
  hostExact: 1000,
  nameExact: 950,
  queryExact: 950,
  nameWord: 700, // a run of words in the name is a brand: "Heroicons by Tailwind CSS" → Tailwind CSS
  prefix: 600, // brand starts with the text: "supa" → Supabase
  extends: 550, // text starts with the brand: "RadixUI Icons" → Radix UI
  hostLabel: 500, // fuzzy on the site's name label
  wordPrefix: 450, // a word of the brand starts with the text: "cloud" → Google Cloud
  contains: 300,
} as const;

export function catalogFromRows(rows: BrandIconCatalogRow[]): BrandIconEntry[] {
  return rows
    .filter((row) => Array.isArray(row) && typeof row[0] === "string" && typeof row[1] === "string")
    .map(([slug, title, hex]) => ({ slug, title, hex: typeof hex === "string" ? hex : "000000" }));
}

type Prepared = { entry: BrandIconEntry; titleKey: string; words: string[] };

/**
 * Builds a search over one catalog. `index` (slugs + aliases from index.json) lets
 * exact hostname matching reuse the same rules as tool-card rendering.
 */
export function createBrandIconSearch(
  catalog: BrandIconEntry[],
  index: Pick<BrandIconIndex, "aliases"> = { aliases: {} },
): BrandIconSearch {
  const bySlug = new Map(catalog.map((entry) => [entry.slug, entry]));
  const prepared: Prepared[] = catalog.map((entry) => ({
    entry,
    titleKey: brandKey(entry.title),
    words: entry.title.toLowerCase().split(/[^a-z0-9]+/u).filter(Boolean),
  }));
  const byTitleKey = new Map<string, string>();
  for (const { entry, titleKey } of prepared) if (!byTitleKey.has(titleKey)) byTitleKey.set(titleKey, entry.slug);
  const resolveHost = createBrandResolver({ version: "", slugs: [...bySlug.keys()], aliases: index.aliases });

  /** Slug whose slug, title or alias equals the key exactly. */
  const exact = (key: string): string | null => {
    if (!key) return null;
    if (bySlug.has(key)) return key;
    const byTitle = byTitleKey.get(key);
    if (byTitle) return byTitle;
    const alias = index.aliases[key];
    return alias && bySlug.has(alias) ? alias : null;
  };

  function search(input: BrandIconSearchInput, limit = DEFAULT_RESULT_LIMIT): BrandIconEntry[] {
    const scores = new Map<string, number>();
    const bump = (slug: string | null, score: number) => {
      if (slug && bySlug.has(slug) && score > (scores.get(slug) ?? 0)) scores.set(slug, score);
    };

    /** Exact, word-run, prefix, word and substring matches of `text` against every brand. */
    const scoreText = (text: string, exactScore: number, fuzzyWeight: number, minFuzzyLength = 2) => {
      const key = brandKey(text);
      if (!key) return;
      bump(exact(key), exactScore);
      if (key.length < minFuzzyLength) return;
      // Runs of 1–3 consecutive words: "Heroicons by Tailwind CSS" → "tailwindcss".
      const words = text.toLowerCase().split(/[^a-z0-9]+/u).filter(Boolean);
      for (let start = 0; start < words.length; start += 1) {
        for (let size = 1; size <= 3 && start + size <= words.length; size += 1) {
          const run = brandKey(words.slice(start, start + size).join(""));
          if (run.length >= 3 && run !== key) bump(exact(run), SCORE.nameWord * fuzzyWeight);
        }
      }
      for (const { entry, titleKey, words: brandWords } of prepared) {
        let score = 0;
        if (titleKey.startsWith(key) || entry.slug.startsWith(key)) {
          score = SCORE.prefix - Math.min(99, titleKey.length - key.length);
        } else if (titleKey.length >= 3 && key.startsWith(titleKey)) {
          score = SCORE.extends - Math.min(99, key.length - titleKey.length);
        } else if (brandWords.some((word) => word.startsWith(key))) {
          score = SCORE.wordPrefix;
        } else if (key.length >= 3 && (titleKey.includes(key) || entry.slug.includes(key))) {
          score = SCORE.contains;
        }
        if (score) bump(entry.slug, score * fuzzyWeight);
      }
    };

    const query = input.query?.trim();
    if (query) {
      scoreText(query, SCORE.queryExact, 1, 1); // typing in the box: prefix-match from the first letter
    } else {
      if (input.hostname) {
        bump(resolveHost(input.hostname), SCORE.hostExact);
        const label = hostNameLabel(input.hostname);
        if (label) scoreText(label, SCORE.hostLabel + 50, SCORE.hostLabel / SCORE.prefix);
      }
      if (input.name) scoreText(input.name, SCORE.nameExact, 1);
    }

    const max = Math.max(1, Math.min(MAX_RESULT_LIMIT, Math.floor(limit)));
    return [...scores.entries()]
      .map(([slug, score]) => ({ entry: bySlug.get(slug)!, score }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.entry.title.length - b.entry.title.length ||
          a.entry.title.localeCompare(b.entry.title),
      )
      .slice(0, max)
      .map(({ entry }) => entry);
  }

  return { search, get: (slug) => bySlug.get(slug) };
}
