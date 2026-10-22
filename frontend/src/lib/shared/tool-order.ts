import type { LibraryTool } from "./library-types";

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

/**
 * Display order inside a category: favorites first, then everything else; each
 * group A→Z by name (case- and accent-insensitive, "Tool 2" before "Tool 10"),
 * ties broken by hostname then id so the order is stable across refreshes.
 * Returns a new array.
 */
export function sortTools<T extends Pick<LibraryTool, "id" | "name" | "hostname" | "isFavorite">>(tools: readonly T[]): T[] {
  return [...tools].sort(
    (a, b) =>
      Number(b.isFavorite) - Number(a.isFavorite) ||
      collator.compare(a.name.trim(), b.name.trim()) ||
      collator.compare(a.hostname, b.hostname) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}
