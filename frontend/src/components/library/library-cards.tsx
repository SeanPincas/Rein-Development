"use client";

import { useRef, useState, type ReactNode } from "react";
import { PlusIcon, StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import type { LibraryCategory, LibraryTool } from "@/lib/shared/library-types";
import { useFlip } from "@/components/design/use-flip";
import { cx } from "@/lib/design";
import { CategoryActionsMenu } from "./category-actions-menu";
import { CategoryIcon } from "./category-icon";
import { ToolActionsMenu } from "./tool-actions-menu";
import { ToolIcon } from "./tool-icon";

type ToolRowProps = {
  tool: LibraryTool;
  onToggleFavorite?: (tool: LibraryTool) => void;
  onEdit?: (tool: LibraryTool) => void;
  onDelete?: (tool: LibraryTool) => void;
};

/**
 * One tool: icon (vertically centred) with the favorite star as a badge on its
 * top-left corner, name + site side by side, a two-line description, and the
 * ⋮ Edit/Delete menu on the right. The whole row opens the site (stretched link
 * on the name); the star and menu sit above that link.
 */
function ToolRow({ tool, onToggleFavorite, onEdit, onDelete }: ToolRowProps) {
  // Star "pop" plays only on a click, never on first render.
  const [pop, setPop] = useState(false);
  return (
    <li data-tool-flip-id={tool.id} className="group/tool relative flex items-center gap-3 rounded-xl border border-violet-400/10 bg-[linear-gradient(135deg,rgb(124_58_237/0.13),rgb(124_58_237/0.04)_60%,rgb(124_58_237/0.07))] px-2.5 py-3 transition-colors hover:border-violet-400/30 hover:bg-violet-500/15 has-[a:focus-visible]:bg-violet-500/15 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-rein-accent/60">
      <span className="relative shrink-0">
        <ToolIcon tool={tool} />
        <button
          type="button"
          aria-label={tool.isFavorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
          aria-pressed={tool.isFavorite}
          title={tool.isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => {
            setPop(true);
            onToggleFavorite?.(tool);
          }}
          onAnimationEnd={() => setPop(false)}
          className={cx(
            "absolute -left-2 -top-2 z-10 flex size-5 items-center justify-center rounded-full border transition-[color,border-color,background-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rein-accent",
            tool.isFavorite
              ? "border-amber-300/60 bg-[#1f1708] text-amber-300"
              : "border-rein-border bg-[#0a0618] text-rein-label hover:border-rein-accent hover:text-violet-200",
            pop && "animate-[rein-star-pop_460ms_cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:animate-none",
          )}
        >
          {tool.isFavorite ? (
            <StarSolidIcon aria-hidden="true" className="size-3" />
          ) : (
            <StarOutlineIcon aria-hidden="true" className="size-3" />
          )}
        </button>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-baseline gap-2">
          <a
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-[15px] font-semibold text-white outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] group-hover/tool:text-violet-200"
          >
            {tool.name}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <span className="truncate font-mono text-[11px] text-rein-label">{tool.hostname}</span>
        </span>
        <span className="line-clamp-2 text-[13px] leading-snug text-rein-soft" title={tool.description}>
          {tool.description}
        </span>
      </span>
      {onEdit && onDelete && (
        <ToolActionsMenu
          toolName={tool.name}
          onEdit={() => onEdit(tool)}
          onDelete={() => onDelete(tool)}
          className="relative z-10"
        />
      )}
    </li>
  );
}

/**
 * Inset panel inside every category card. It always shows: with tools it holds the
 * list rows, without tools it says "No tools yet." Either way it ends with + Add Tool.
 */
export function ToolsPanel({
  onAddTool,
  categoryName,
  preview = false,
  children,
}: {
  /** Opens the Add Tool form for this category; the button is disabled until provided. */
  onAddTool?: () => void;
  categoryName: string;
  /** Static rendering for the Create Category preview (not focusable). */
  preview?: boolean;
  /** The tool list; omit for the empty state. */
  children?: ReactNode;
}) {
  const hasTools = Boolean(children);
  const buttonClass =
    "inline-flex h-8 items-center gap-1.5 rounded-lg border border-rein-accent/50 bg-[#0a0618] px-3 text-xs font-semibold text-violet-200 transition-colors hover:border-rein-accent hover:bg-rein-accent hover:text-black disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#0a0618] disabled:hover:text-violet-200";

  const button = preview ? (
    <span aria-hidden="true" className={buttonClass}>
      <PlusIcon className="size-3.5 stroke-2" />
      Add Tool
    </span>
  ) : (
    <button
      type="button"
      onClick={onAddTool}
      disabled={!onAddTool}
      aria-label={`Add a tool to ${categoryName}`}
      className={buttonClass}
    >
      <PlusIcon aria-hidden="true" className="size-3.5 stroke-2" />
      Add Tool
    </button>
  );

  return (
    <div
      className={cx(
        "flex flex-col overflow-hidden rounded-xl border border-dashed border-rein-border-strong/70 bg-black/40",
        // Empty state: the whole panel gets the blueprint hatch used under the tool list.
        !hasTools && "bg-[repeating-linear-gradient(135deg,rgb(167_139_250/0.09)_0_1px,transparent_1px_9px)]",
      )}
    >
      {hasTools ? children : <span className="px-4 pt-5 text-center text-sm font-medium text-white/85">No tools yet.</span>}
      <div
        className={
          hasTools
            ? // Blueprint hatch fills the strip around + Add Tool; the button sits on it as a solid plate.
              "flex justify-center border-t border-dashed border-rein-border-strong/50 bg-[repeating-linear-gradient(135deg,rgb(167_139_250/0.09)_0_1px,transparent_1px_9px)] px-3 py-3"
            : "flex justify-center px-4 pb-5 pt-3"
        }
      >
        {button}
      </div>
    </div>
  );
}

/** Empty-state panel (kept for the Create Category preview). */
export function EmptyToolsSlot(props: { onAddTool?: () => void; categoryName: string; preview?: boolean }) {
  return <ToolsPanel {...props} />;
}

export function CategoryCard({
  category,
  tools,
  onAddTool,
  onToggleFavorite,
  onEditTool,
  onDeleteTool,
  onEdit,
  onDelete,
  headerAccessory,
  rearranging = false,
}: {
  category: LibraryCategory;
  tools: LibraryTool[];
  onAddTool?: () => void;
  onToggleFavorite?: (tool: LibraryTool) => void;
  /** Per-tool ⋮ menu actions; the menu appears when both are provided. */
  onEditTool?: (tool: LibraryTool) => void;
  onDeleteTool?: (tool: LibraryTool) => void;
  /** Category actions; the ⋮ button (swapping to Edit/Delete) appears when both are provided. */
  onEdit?: () => void;
  onDelete?: () => void;
  /** Extra control at the end of the header, e.g. the reorder handle. */
  headerAccessory?: ReactNode;
  /** Rearrange mode: hide the tool count and ⋮ so only the drag handle remains. */
  rearranging?: boolean;
}) {
  const headingId = `category-${category.id}`;
  // Rows slide to their new spot when the order changes (e.g. favoriting moves a tool up).
  const listRef = useRef<HTMLUListElement>(null);
  useFlip(listRef, tools.map((tool) => tool.id).join("|"), {
    attribute: "data-tool-flip-id",
    // Unhurried and symmetric: eases in, glides, eases out — rows travel together.
    durationMs: 900,
    staggerMs: 0,
    easing: "cubic-bezier(0.45, 0, 0.2, 1)",
  });
  return (
    <article
      aria-labelledby={headingId}
      className="overflow-hidden rounded-[20px] border border-rein-border bg-[rgb(10_6_24/0.86)]"
    >
      <header className="flex items-center gap-3 border-b border-dashed border-rein-border px-3.5 pb-3 pt-3.5 sm:px-[18px] sm:pb-3.5 sm:pt-[18px]">
        <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border border-rein-accent/40 bg-violet-600/20">
          <CategoryIcon iconKey={category.iconKey} className="size-5 text-violet-300" />
        </span>
        <h2 id={headingId} className="m-0 min-w-0 flex-1 truncate text-lg font-semibold tracking-[-0.01em]">
          {category.name}
        </h2>
        {!rearranging && (
          <CategoryActionsMenu categoryName={category.name} count={category.toolCount} onEdit={onEdit} onDelete={onDelete} />
        )}
        {headerAccessory}
      </header>
      <div className="p-2 sm:p-3">
        <ToolsPanel onAddTool={onAddTool} categoryName={category.name}>
          {tools.length > 0 ? (
            // List view: rows separated by thin dividers inside the inset panel.
            // Tiles: each row is a softly filled card, separated by small gaps.
            <ul ref={listRef} className="m-0 flex list-none flex-col gap-1.5 p-1.5">
              {tools.map((tool) => (
                <ToolRow key={tool.id} tool={tool} onToggleFavorite={onToggleFavorite} onEdit={onEditTool} onDelete={onDeleteTool} />
              ))}
            </ul>
          ) : null}
        </ToolsPanel>
      </div>
    </article>
  );
}
