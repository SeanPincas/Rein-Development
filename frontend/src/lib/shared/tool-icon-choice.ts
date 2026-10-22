/**
 * Pure rules for choosing and showing a tool's icon. Rein only ever shows local
 * Simple Icons assets (/brand-icons/<slug>.svg) or a letter tile, never favicons.
 */
import type { BrandIconEntry } from "./brand-icon-search";

export type BrandIconOption = BrandIconEntry & { selected: boolean };

/**
 * Options for the picker grid: search results with the chosen slug marked. The
 * current choice stays visible (first) even when the search doesn't return it,
 * e.g. while editing a tool whose name no longer matches its icon.
 */
export function iconPickerOptions(
  results: BrandIconEntry[],
  selectedSlug: string | null,
  lookup: (slug: string) => BrandIconEntry | undefined,
): BrandIconOption[] {
  const list = [...results];
  if (selectedSlug && !list.some((entry) => entry.slug === selectedSlug)) {
    list.unshift(lookup(selectedSlug) ?? { slug: selectedSlug, title: selectedSlug, hex: "000000" });
  }
  return list.map((entry) => ({ ...entry, selected: entry.slug === selectedSlug }));
}

export type DisplayIconDeps = {
  /** The slug exists in the generated index. */
  has: (slug: string) => boolean;
  /** Hostname → matched slug (or null). */
  resolve: (hostname: string) => string | null;
  /** The slug's SVG asset failed to load in this browser. */
  failed: (slug: string) => boolean;
};

/**
 * Slug to render for a tool, or null for the letter tile:
 * the chosen `iconSlug` → the hostname match → letter. A slug that's unknown or
 * whose asset failed to load is skipped.
 */
export function resolveDisplaySlug(
  tool: { iconSlug?: string | null; hostname?: string | null },
  deps: DisplayIconDeps,
): string | null {
  if (tool.iconSlug && deps.has(tool.iconSlug) && !deps.failed(tool.iconSlug)) return tool.iconSlug;
  const matched = tool.hostname ? deps.resolve(tool.hostname) : null;
  return matched && !deps.failed(matched) ? matched : null;
}
