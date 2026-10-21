"use client";

import { useEffect, useRef } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

type LibrarySearchProps = {
  value: string;
  onChange: (value: string) => void;
};

/** Navbar search. ⌘K / Ctrl+K or "/" focuses it from anywhere on the page. */
export function LibrarySearch({ value, onChange }: LibrarySearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable='true']");
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative flex w-full max-w-[560px] md:mx-auto">
      <label htmlFor="library-search" className="sr-only">
        Search your tools
      </label>
      <MagnifyingGlassIcon aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-rein-label" />
      <input
        ref={inputRef}
        id="library-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            onChange("");
          }
        }}
        placeholder="Search tools, domains or categories…"
        autoComplete="off"
        className="h-11 w-full rounded-[10px] border border-rein-border bg-black/80 pl-[42px] pr-16 text-[15px] text-white placeholder:text-[#8e86b5] focus:border-rein-accent focus:outline-none focus:ring-2 focus:ring-rein-accent/40 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-rein-soft hover:text-white"
        >
          <XMarkIcon aria-hidden="true" className="size-4" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 border border-rein-border px-1.5 py-0.5 font-mono text-[11px] text-rein-label">
          ⌘K
        </kbd>
      )}
    </div>
  );
}
