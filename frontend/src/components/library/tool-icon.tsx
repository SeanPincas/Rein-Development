"use client";

import type { LibraryTool } from "@/lib/shared/library-types";
import { BrandGlyph, useBrandSlug } from "./brand-glyph";

/**
 * Tool icon: the Simple Icons brand the user picked (`iconSlug`), else the brand
 * matched from the hostname (tinted to the theme), else a letter tile. Rein never
 * fetches favicons from tool sites.
 */
export function ToolIcon({ tool }: { tool: Pick<LibraryTool, "name" | "hostname" | "iconSlug"> }) {
  const brand = useBrandSlug(tool.hostname, tool.iconSlug);

  return (
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-rein-border bg-black text-[15px] font-bold text-violet-300">
      {brand ? (
        <BrandGlyph slug={brand} className="size-5 text-violet-200" />
      ) : (
        <span aria-hidden="true">{tool.name.trim().charAt(0).toUpperCase() || "?"}</span>
      )}
    </span>
  );
}
