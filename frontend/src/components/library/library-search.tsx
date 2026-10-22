"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

type LibrarySearchProps = {
  value: string;
  onChange: (value: string) => void;
  /** "collapsible": icon that expands (desktop toolbar). "full": always-open, full-width field (tablet/phone). */
  variant?: "collapsible" | "full";
};

/**
 * Library search in the toolbar: a borderless magnifying-glass button that expands
 * into the full search field. ⌘K / Ctrl+K or "/" opens and focuses it from anywhere.
 * It stays open while it holds a query; Esc clears the query, then collapses.
 * The "full" variant is the same field, always open and stretched to its container.
 * When both are mounted (one hidden by a breakpoint), only the visible one answers ⌘K.
 */
export function LibrarySearch({ value, onChange, variant = "collapsible" }: LibrarySearchProps) {
  const collapsible = variant === "collapsible";
  const [expanded, setExpanded] = useState(!collapsible || Boolean(value));
  const rootRef = useRef<HTMLElement | null>(null);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Where focus goes after the next expand/collapse commit.
  const pendingFocus = useRef<"input" | "button" | null>(null);

  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === "input") {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (target === "button") buttonRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable='true']");
      if (target?.closest("dialog[open]")) return; // not while a modal is open
      if (!rootRef.current || rootRef.current.getClientRects().length === 0) return; // hidden by a breakpoint
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        } else {
          pendingFocus.current = "input";
          setExpanded(true);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!expanded) {
    return (
      <button
        ref={(element) => {
          buttonRef.current = element;
          rootRef.current = element;
        }}
        type="button"
        onClick={() => {
          pendingFocus.current = "input";
          setExpanded(true);
        }}
        aria-label="Search tools by name or URL"
        aria-keyshortcuts="Control+K Meta+K /"
        title="Search (⌘K)"
        className="flex size-11 shrink-0 items-center justify-center rounded-[10px] text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rein-accent"
      >
        <MagnifyingGlassIcon aria-hidden="true" className="size-5" />
      </button>
    );
  }

  return (
    <div
      ref={(element) => {
        rootRef.current = element;
      }}
      className={
        collapsible
          ? "relative flex w-[min(380px,calc(100vw-48px))] transition-[width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] starting:w-11 starting:opacity-0 motion-reduce:transition-none"
          : "relative flex w-full"
      }
    >
      <label htmlFor={inputId} className="sr-only">
        Search tools by name or URL
      </label>
      <MagnifyingGlassIcon aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-rein-label" />
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          if (value) onChange("");
          else if (collapsible) {
            pendingFocus.current = "button";
            setExpanded(false);
          }
        }}
        onBlur={(event) => {
          // Collapse when focus leaves an empty search (not when moving to its clear button).
          if (collapsible && !value && !event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) {
            setExpanded(false);
          }
        }}
        placeholder="Search by tool name or URL…"
        autoComplete="off"
        className="h-11 w-full min-w-0 rounded-[10px] border border-rein-border bg-black/80 pl-[42px] pr-16 text-[15px] text-white placeholder:text-[#8e86b5] focus:border-rein-accent focus:outline-none focus:ring-2 focus:ring-rein-accent/40 [&::-webkit-search-cancel-button]:hidden"
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
