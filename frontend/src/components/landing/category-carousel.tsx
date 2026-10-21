"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/design";
import { CATEGORIES_PER_SLIDE, categories } from "./content";
import { CategoryCard } from "./feature-card";

const AUTOPLAY_MS = 7000;

const ChevronIcon = ({ direction }: { direction: "left" | "right" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

const controlButton =
  "flex size-10 items-center justify-center rounded-lg border border-rein-border bg-black/60 text-violet-200 transition-colors hover:border-rein-accent hover:text-white";

/** Four category cards per slide, with arrows, dots and a pausable autoplay. */
export function CategoryCarousel() {
  const slides = useMemo(() => {
    const pages = [];
    for (let i = 0; i < categories.length; i += CATEGORIES_PER_SLIDE) {
      pages.push(categories.slice(i, i + CATEGORIES_PER_SLIDE));
    }
    return pages;
  }, []);

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);
  const count = slides.length;

  const goTo = useCallback((index: number) => setActive(((index % count) + count) % count), [count]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Autoplay: off for reduced motion, while hovered/focused, or when the tab is hidden.
  useEffect(() => {
    if (paused || reducedMotion || count < 2) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setActive((current) => (current + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, reducedMotion, count]);

  return (
    <div
      ref={regionRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Example categories"
      className="flex flex-col gap-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!regionRef.current?.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="overflow-hidden">
        <div
          className={cx("flex", !reducedMotion && "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]")}
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((slide, index) => {
            const current = index === active;
            return (
              <ul
                key={index}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}`}
                aria-hidden={!current}
                inert={!current}
                className="m-0 grid w-full shrink-0 list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4"
              >
                {slide.map((category) => (
                  <CategoryCard key={category.title} {...category} />
                ))}
              </ul>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2" role="group" aria-label="Choose slide">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Show slide ${index + 1}`}
              aria-current={index === active || undefined}
              className="flex h-11 items-center px-1"
            >
              <span
                className={cx(
                  "block h-1.5 transition-all duration-300",
                  index === active ? "w-8 bg-rein-accent" : "w-4 bg-rein-border-strong hover:bg-violet-300",
                )}
              />
            </button>
          ))}
          <span className="ml-2 font-mono text-xs tracking-[0.1em] text-rein-label" aria-live="polite">
            {String(active + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </span>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => goTo(active - 1)} aria-label="Previous categories" className={controlButton}>
            <ChevronIcon direction="left" />
          </button>
          <button type="button" onClick={() => goTo(active + 1)} aria-label="Next categories" className={controlButton}>
            <ChevronIcon direction="right" />
          </button>
        </div>
      </div>
    </div>
  );
}
