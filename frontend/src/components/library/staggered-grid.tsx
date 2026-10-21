"use client";

import { useEffect, useState, type ReactNode } from "react";
import { columnEntrance, cx } from "@/lib/design";

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

/**
 * Staggered bento layout: items are dealt left-to-right into columns, so reading
 * order stays row by row, and every second column steps down by `stagger` px.
 * Changing `animationKey` replays the alternating column entrance.
 */
export function StaggeredGrid({
  items,
  stagger = 32,
  animationKey,
}: {
  items: ReactNode[];
  stagger?: number;
  /** Omit for no entrance animation (e.g. skeletons). */
  animationKey?: number;
}) {
  const columns = useColumnCount();
  const buckets = Array.from({ length: columns }, () => [] as ReactNode[]);
  items.forEach((item, index) => buckets[index % columns].push(item));

  return (
    <div
      className="flex items-start gap-4 md:gap-6"
      // Clip only the top edge: falling cards emerge from under the page header instead of
      // crossing the navbar, while rising cards still travel up from the bottom of the page.
      // The 8px allowance keeps focus rings on the first row visible.
      style={animationKey === undefined ? undefined : { clipPath: "inset(-8px -100vw -200vh -100vw)" }}
    >
      {buckets.map((bucket, column) => (
        <div
          key={column}
          className={cx("flex min-w-0 flex-1 flex-col gap-4 md:gap-6")}
          style={{ marginTop: columns > 1 && column % 2 === 1 ? stagger : 0 }}
        >
          {bucket.map((item, index) => {
            if (animationKey === undefined) return <div key={index}>{item}</div>;
            const entrance = columnEntrance(column, index, bucket.length);
            // Keying on animationKey remounts the wrapper, which restarts its CSS animation.
            return (
              <div key={`${animationKey}-${index}`} className={entrance.className} style={entrance.style}>
                {item}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
