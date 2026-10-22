"use client";

import { useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { cx } from "@/lib/design";
import { createBrandResolver, type BrandIconIndex } from "@/lib/shared/brand-icon-match";
import {
  catalogFromRows,
  createBrandIconSearch,
  type BrandIconCatalogRow,
  type BrandIconEntry,
  type BrandIconSearch,
  type BrandIconSearchInput,
} from "@/lib/shared/brand-icon-search";
import { resolveDisplaySlug } from "@/lib/shared/tool-icon-choice";

const ASSET_BASE = "/brand-icons";
export const brandAssetUrl = (slug: string) => `${ASSET_BASE}/${slug}.svg`;

/** Fetches a JSON file once per page load; a failure (not generated yet, offline) allows a later retry. */
function cachedJson<T>(path: string, accept: (value: unknown) => value is T) {
  let loaded: T | null = null;
  let pending: Promise<T | null> | null = null;
  return {
    peek: () => loaded,
    load(): Promise<T | null> {
      pending ??= fetch(path)
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null)
        .then((value: unknown) => {
          if (accept(value)) loaded = value;
          else pending = null;
          return loaded;
        });
      return pending;
    },
  };
}

// index.json: small, used by every tool card. catalog.json: only for the picker.
const indexFile = cachedJson(`${ASSET_BASE}/index.json`, (value): value is BrandIconIndex =>
  Boolean(value && Array.isArray((value as BrandIconIndex).slugs)),
);
const catalogFile = cachedJson(`${ASSET_BASE}/catalog.json`, (value): value is BrandIconCatalogRow[] => Array.isArray(value));

type Resolver = { resolve: (hostname: string) => string | null; has: (slug: string) => boolean };
const resolvers = new WeakMap<BrandIconIndex, Resolver>();
function resolverFor(index: BrandIconIndex): Resolver {
  let resolver = resolvers.get(index);
  if (!resolver) {
    const slugs = new Set(index.slugs);
    resolver = { resolve: createBrandResolver(index), has: (slug) => slugs.has(slug) };
    resolvers.set(index, resolver);
  }
  return resolver;
}

// ---- SVG asset health: a mask-image can't report a 404, so each slug is probed once.
let failedAssets: ReadonlySet<string> = new Set();
const probed = new Set<string>();
const assetListeners = new Set<() => void>();

function probeAsset(slug: string) {
  if (probed.has(slug) || typeof Image === "undefined") return;
  probed.add(slug);
  const image = new Image();
  image.onerror = () => {
    failedAssets = new Set([...failedAssets, slug]);
    for (const listener of assetListeners) listener();
  };
  image.src = brandAssetUrl(slug);
}

function subscribeAssets(listener: () => void) {
  assetListeners.add(listener);
  return () => {
    assetListeners.delete(listener);
  };
}
const noFailures: ReadonlySet<string> = new Set();

/** Slugs whose SVG failed to load in this browser (re-renders when one fails). */
export function useFailedAssets(): ReadonlySet<string> {
  return useSyncExternalStore(subscribeAssets, () => failedAssets, () => noFailures);
}

function useBrandIndex(enabled: boolean): BrandIconIndex | null {
  const [index, setIndex] = useState<BrandIconIndex | null>(indexFile.peek());
  useEffect(() => {
    if (index || !enabled) return;
    let live = true;
    void indexFile.load().then((value) => {
      if (live && value) setIndex(value);
    });
    return () => {
      live = false;
    };
  }, [index, enabled]);
  return index;
}

/**
 * Simple Icons slug to render, or null for the letter tile: the chosen
 * `preferredSlug`, else the hostname match, skipping unknown slugs and assets
 * that failed to load.
 */
export function useBrandSlug(hostname: string | null | undefined, preferredSlug?: string | null): string | null {
  const index = useBrandIndex(Boolean(hostname || preferredSlug));
  const failed = useFailedAssets();
  const slug = useMemo(() => {
    if (!index) return null;
    const resolver = resolverFor(index);
    return resolveDisplaySlug(
      { iconSlug: preferredSlug, hostname },
      { has: resolver.has, resolve: resolver.resolve, failed: (candidate) => failed.has(candidate) },
    );
  }, [index, hostname, preferredSlug, failed]);

  useEffect(() => {
    if (slug) probeAsset(slug);
  }, [slug]);
  return slug;
}

export type BrandSearchState = {
  status: "loading" | "ready" | "unavailable";
  results: BrandIconEntry[];
  /** Catalog lookup by slug (for showing the current choice). */
  get: (slug: string) => BrandIconEntry | undefined;
};

const searches = new WeakMap<BrandIconCatalogRow[], BrandIconSearch>();

/** Loads the catalog on first use and searches it (deferred, so typing stays smooth). */
export function useBrandIconSearch(input: BrandIconSearchInput, limit?: number): BrandSearchState {
  const [rows, setRows] = useState<BrandIconCatalogRow[] | null>(catalogFile.peek());
  const [unavailable, setUnavailable] = useState(false);
  const index = useBrandIndex(true);

  useEffect(() => {
    if (rows) return;
    let live = true;
    void catalogFile.load().then((value) => {
      if (!live) return;
      if (value) setRows(value);
      else setUnavailable(true);
    });
    return () => {
      live = false;
    };
  }, [rows]);

  const engine = useMemo(() => {
    if (!rows) return null;
    let search = searches.get(rows);
    if (!search) {
      search = createBrandIconSearch(catalogFromRows(rows), index ?? undefined);
      if (index) searches.set(rows, search);
    }
    return search;
  }, [rows, index]);

  const name = useDeferredValue(input.name ?? "");
  const hostname = useDeferredValue(input.hostname ?? "");
  const query = useDeferredValue(input.query ?? "");
  const results = useMemo(
    () => (engine ? engine.search({ name, hostname, query }, limit) : []),
    [engine, name, hostname, query, limit],
  );

  return {
    status: engine ? "ready" : unavailable ? "unavailable" : "loading",
    results,
    get: (slug) => engine?.get(slug),
  };
}

/** Monochrome brand logo tinted with the current text colour. */
export function BrandGlyph({ slug, className }: { slug: string; className?: string }) {
  useEffect(() => probeAsset(slug), [slug]);
  const mask = `url(${brandAssetUrl(slug)}) center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      data-brand={slug}
      className={cx("inline-block shrink-0 bg-current", className)}
      style={{ mask, WebkitMask: mask } as CSSProperties}
    />
  );
}
