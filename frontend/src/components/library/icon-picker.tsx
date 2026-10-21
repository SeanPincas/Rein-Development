"use client";

import { useRef, type KeyboardEvent } from "react";
import { cx } from "@/lib/design";
import { categoryIconLibrary, type CategoryIconKey } from "@/lib/shared/icon-library";
import { CategoryIcon } from "./category-icon";

type IconPickerProps = {
  value: CategoryIconKey;
  onChange: (key: CategoryIconKey) => void;
  /** Rows in the side-scrolling grid; columns grow with the catalogue. */
  rows?: number;
  label?: string;
};

/**
 * Side-scrolling radio grid of every category icon. Only this grid scrolls
 * horizontally. Keyboard: ↑/↓ within a column, ←/→ across columns, Home/End.
 */
export function IconPicker({ value, onChange, rows = 4, label = "Category icon" }: IconPickerProps) {
  const iconRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = categoryIconLibrary.length - 1;
    const step: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, ArrowRight: rows, ArrowLeft: -rows };
    let next: number | null = null;
    if (event.key in step) next = Math.min(last, Math.max(0, index + step[event.key]));
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    onChange(categoryIconLibrary[next].key);
    const button = iconRefs.current[next];
    button?.focus();
    button?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        role="radiogroup"
        aria-label={label}
        className="icon-picker-scroll grid auto-cols-[52px] grid-flow-col gap-2 overflow-x-auto overscroll-x-contain pb-3 [scroll-snap-type:x_proximity]"
        style={{ gridTemplateRows: `repeat(${rows}, 52px)` }}
      >
        {categoryIconLibrary.map((option, index) => {
          const checked = option.key === value;
          return (
            <button
              key={option.key}
              ref={(element) => {
                iconRefs.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={option.label}
              title={option.label}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(option.key)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cx(
                "flex size-[52px] items-center justify-center rounded-[10px] border transition-colors [scroll-snap-align:start]",
                checked
                  ? "border-rein-accent bg-rein-accent/25 text-white"
                  : "border-rein-border bg-black text-violet-300 hover:border-rein-accent",
              )}
            >
              <CategoryIcon iconKey={option.key} className="size-[22px]" />
            </button>
          );
        })}
      </div>
      <span className="text-[12px] text-rein-label">Scroll sideways for more · {categoryIconLibrary.length} icons</span>
    </div>
  );
}
