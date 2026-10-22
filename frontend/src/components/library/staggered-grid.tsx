"use client";

import { isValidElement, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useFlip } from "@/components/design/use-flip";
import { columnEntrance, cx, placeMasonryItems } from "@/lib/design";

/** Masonry row unit in px; each card spans as many rows as its height needs. */
const ROW_UNIT = 8;
/** Longest entrance (delays + 1.6s travel) before its classes are removed. */
const ENTRANCE_SETTLE_MS = 3200;

/** 3 columns from 1200px, 2 from 768px, otherwise 1 (matches the project plan). */
function useColumnCount() {
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const three = window.matchMedia("(min-width: 1200px)");
    const two = window.matchMedia("(min-width: 768px)");
    const update = () => setColumns(three.matches ? 3 : two.matches ? 2 : 1);
    update();
    three.addEventListener("change", update);
    two.addEventListener("change", update);
    return () => {
      three.removeEventListener("change", update);
      two.removeEventListener("change", update);
    };
  }, []);

  return columns;
}

type MasonryItemProps = {
  measureKey: string;
  onMeasure: (key: string, height: number) => void;
  column: number;
  gap: number;
  offsetTop: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/** One grid cell: measures its content, spans enough rows to fit it plus the gap, and reports its height. */
function MasonryItem({ measureKey, onMeasure, column, gap, offsetTop, className, style, children }: MasonryItemProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [span, setSpan] = useState(1);

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    const update = () => {
      const height = element.getBoundingClientRect().height;
      setSpan(Math.max(1, Math.ceil((height + gap) / ROW_UNIT)));
      onMeasure(measureKey, Math.round(height));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [gap, measureKey, onMeasure]);

  return (
    <div
      style={{ gridColumn: column + 1, gridRowEnd: `span ${span}`, position: "relative", top: offsetTop, alignSelf: "start" }}
    >
      <div ref={contentRef} className={className} style={style}>
        {children}
      </div>
    </div>
  );
}

/**
 * Staggered bento layout as a single CSS grid: items keep row-major DOM order
 * (reading and Tab order go row by row), each is pinned to column `index % columns`,
 * dense packing stacks each column, and every second column steps down by `stagger`.
 * One parent means React only reorders nodes on a reorder (no remounts), which
 * keeps a native drag alive and lets FLIP slide cards between columns.
 * The last row is balanced into shorter columns (see `placeMasonryItems`), so a few
 * long cards near the top don't leave dead space at the bottom.
 * Changing `animationKey` replays the alternating column entrance.
 */
export function StaggeredGrid({
  items,
  stagger = 32,
  animationKey,
  balanceTail = true,
  flip = false,
}: {
  items: ReactNode[];
  stagger?: number;
  /** Omit for no entrance animation. */
  animationKey?: number;
  /** Move last-row cards into shorter columns. Turn off while rearranging (strict order). */
  balanceTail?: boolean;
  /** Slide `[data-flip-id]` cards when the order or the column placement changes. */
  flip?: boolean;
}) {
  const columns = useColumnCount();
  const gap = columns === 1 ? 16 : 24;
  // Drop entrance classes once it has played: otherwise a card changing column during a
  // reorder would swap fall/rise classes and replay its entrance instead of just sliding.
  const [settledKey, setSettledKey] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (animationKey === undefined) return;
    const id = window.setTimeout(() => setSettledKey(animationKey), ENTRANCE_SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [animationKey]);
  const entering = animationKey !== undefined && settledKey !== animationKey;
  const staggered = columns > 1;

  // Measured card heights by item key feed the placement.
  const [heights, setHeights] = useState<Record<string, number>>({});
  const onMeasure = useCallback((key: string, height: number) => {
    setHeights((current) => (current[key] === height ? current : { ...current, [key]: height }));
  }, []);
  const keys = items.map((item, index) => (isValidElement(item) && item.key !== null ? String(item.key) : String(index)));
  const placement = placeMasonryItems(
    keys.map((key) => heights[key] ?? 0),
    columns,
    { gap, stagger: staggered ? stagger : 0, balanceTail },
  );
  const columnLengths = Array.from({ length: columns }, (_, column) => placement.filter((c) => c === column).length);
  const rowInColumn = placement.map((column, index) => placement.slice(0, index).filter((c) => c === column).length);

  // Slides cards on reorders and on balancing moves; skipped during the entrance.
  const containerRef = useRef<HTMLDivElement>(null);
  useFlip(containerRef, keys.map((key, index) => `${key}@${placement[index]}`).join("|"), {
    enabled: flip && !entering,
    order: keys,
  });

  return (
    <div
      ref={containerRef}
      className={cx("grid")}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridAutoRows: `${ROW_UNIT}px`,
        gridAutoFlow: "row dense",
        columnGap: gap,
        paddingBottom: staggered ? stagger : 0,
        // Clip only the top edge during entrances: falling cards emerge from under the page
        // header instead of crossing the navbar; rising cards still travel up from below.
        ...(entering ? { clipPath: "inset(-8px -100vw -200vh -100vw)" } : {}),
      }}
    >
      {items.map((item, index) => {
        const column = placement[index];
        const itemKey = keys[index];
        const entrance = entering ? columnEntrance(column, rowInColumn[index], columnLengths[column]) : null;
        return (
          <MasonryItem
            measureKey={itemKey}
            onMeasure={onMeasure}
            // Stable per-item keys: a reorder moves nodes instead of remounting them.
            key={animationKey === undefined ? itemKey : `${animationKey}-${itemKey}`}
            column={column}
            gap={gap}
            offsetTop={staggered && column % 2 === 1 ? stagger : 0}
            className={entrance?.className}
            style={entrance?.style}
          >
            {item}
          </MasonryItem>
        );
      })}
    </div>
  );
}
