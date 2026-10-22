"use client";

import { useId, useState } from "react";
import { CheckIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { cx } from "@/lib/design";
import { iconPickerOptions } from "@/lib/shared/tool-icon-choice";
import { BrandGlyph, useBrandIconSearch, useBrandSlug, useFailedAssets } from "./brand-glyph";

type BrandIconPickerProps = {
  /** Tool name and hostname drive the suggestions until the user types a search. */
  name: string;
  hostname: string | null;
  /** Selected Simple Icons slug; null = fallback (hostname match or letter tile). */
  value: string | null;
  onChange: (slug: string | null) => void;
  error?: string;
};

const RESULT_LIMIT = 11; // + "Use fallback" = 12 tiles

/**
 * Icon chooser for Add/Edit Tool: Simple Icons brands matching the tool's name and
 * URL (or a typed search), plus "Use fallback". Optional: saving never depends on it.
 */
export function BrandIconPicker({ name, hostname, value, onChange, error }: BrandIconPickerProps) {
  const [query, setQuery] = useState("");
  const legendId = useId();
  const searchId = useId();
  const statusId = useId();
  const hasInput = Boolean(name.trim() || hostname || query.trim());
  const { status, results, get } = useBrandIconSearch({ name, hostname, query }, RESULT_LIMIT);
  const failed = useFailedAssets();
  const fallbackSlug = useBrandSlug(hostname);
  const fallbackLetter = (name.trim() || hostname?.replace(/^www\./, "") || "?").charAt(0).toUpperCase();

  const options = iconPickerOptions(
    hasInput ? results.filter((entry) => !failed.has(entry.slug)) : [],
    value,
    get,
  );

  const statusText =
    status === "unavailable"
      ? "Brand icons aren't available right now. The fallback will be used."
      : status === "loading"
        ? "Loading brand icons…"
        : !hasInput
          ? "Enter a name or URL to see matching brand icons."
          : options.length === 0
            ? query.trim()
              ? `No brands match “${query.trim()}”. The fallback will be used.`
              : "No matching brand icons. The fallback will be used."
            : value
              ? `${get(value)?.title ?? value} selected.`
              : "Using the fallback icon.";

  const tile =
    "relative flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-2 pb-2 pt-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rein-accent";
  const selectedTile = "border-rein-accent bg-rein-accent/20 text-white";
  const idleTile = "border-rein-border bg-black text-rein-muted hover:border-rein-accent/70 hover:text-white";

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0" aria-describedby={statusId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <legend id={legendId} className="text-sm font-semibold">
          Icon <span className="font-normal text-rein-label">(optional)</span>
        </legend>
        <label htmlFor={searchId} className="relative flex min-w-[180px] flex-1 sm:max-w-[240px]">
          <span className="sr-only">Search brand icons</span>
          <MagnifyingGlassIcon aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-rein-label" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // Enter in the search box shouldn't submit the whole tool form.
              if (event.key === "Enter") event.preventDefault();
            }}
            placeholder="Search brands…"
            autoComplete="off"
            spellCheck={false}
            className="h-9 w-full rounded-[10px] border border-rein-border bg-black pl-8 pr-3 text-sm text-white placeholder:text-[#8e86b5] focus:border-rein-accent focus:outline-none focus:ring-2 focus:ring-rein-accent/40"
          />
        </label>
      </div>

      <div
        role="radiogroup"
        aria-labelledby={legendId}
        className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2"
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          data-icon-option="fallback"
          onClick={() => onChange(null)}
          className={cx(tile, value === null ? selectedTile : idleTile)}
        >
          <span className="flex size-9 items-center justify-center rounded-[9px] border border-dashed border-rein-border bg-black text-[15px] font-bold text-violet-300">
            {fallbackSlug ? <BrandGlyph slug={fallbackSlug} className="size-5 text-violet-200" /> : fallbackLetter}
          </span>
          <span className="w-full truncate text-xs font-medium">Use fallback</span>
          {value === null && <SelectedMark />}
        </button>

        {options.map((option) => (
          <button
            key={option.slug}
            type="button"
            role="radio"
            aria-checked={option.selected}
            data-icon-option={option.slug}
            title={option.title}
            onClick={() => onChange(option.slug)}
            className={cx(tile, option.selected ? selectedTile : idleTile)}
          >
            <span className="flex size-9 items-center justify-center rounded-[9px] border border-rein-border bg-black">
              <BrandGlyph slug={option.slug} className="size-5 text-violet-200" />
            </span>
            <span className="w-full truncate text-xs font-medium">{option.title}</span>
            {option.selected && <SelectedMark />}
          </button>
        ))}
      </div>

      <p id={statusId} aria-live="polite" className={cx("m-0 text-[13px]", error ? "text-red-300" : "text-rein-soft")}>
        {error ?? statusText}
      </p>
    </fieldset>
  );
}

function SelectedMark() {
  return (
    <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-rein-accent text-black">
      <CheckIcon aria-hidden="true" className="size-3 stroke-[3]" />
    </span>
  );
}
