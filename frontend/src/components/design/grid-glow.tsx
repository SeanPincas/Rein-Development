"use client";

import { useEffect, useRef } from "react";
import { cx, gridGlowPresets, gridGlowVariables, trackGridGlow, type GridGlowPresetName } from "@/lib/design";

type GridGlowProps = {
  preset?: GridGlowPresetName;
  className?: string;
};

/**
 * Lights up the blueprint grid in a circle around the cursor.
 * Place it in the same positioned layer as `.blueprint-lines` so the lines align.
 */
export function GridGlow({ preset = "default", className }: GridGlowProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    return trackGridGlow(ref.current);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cx("blueprint-lines-glow pointer-events-none absolute inset-0", className)}
      style={gridGlowVariables(gridGlowPresets[preset])}
    />
  );
}
