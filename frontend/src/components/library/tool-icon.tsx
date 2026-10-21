"use client";

import { useState } from "react";
import type { LibraryTool } from "@/lib/shared/library-types";

/** Site icon with a letter-tile fallback. Remote images load without a referrer. */
export function ToolIcon({ tool }: { tool: Pick<LibraryTool, "name" | "iconUrl" | "iconStatus"> }) {
  const [failed, setFailed] = useState(false);
  const showImage = tool.iconStatus === "ready" && tool.iconUrl && !failed;

  return (
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-rein-border bg-black text-[15px] font-bold text-violet-300">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote favicons; next/image would proxy them.
        <img
          src={tool.iconUrl!}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-5 object-contain"
        />
      ) : (
        <span aria-hidden="true">{tool.name.trim().charAt(0).toUpperCase() || "?"}</span>
      )}
    </span>
  );
}
