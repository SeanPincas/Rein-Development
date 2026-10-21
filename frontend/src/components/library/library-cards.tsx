import { PlusIcon, StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import type { LibraryCategory, LibraryTool } from "@/lib/shared/library-types";
import { CategoryIcon } from "./category-icon";
import { ToolIcon } from "./tool-icon";

function ToolRow({ tool, onToggleFavorite }: { tool: LibraryTool; onToggleFavorite?: (tool: LibraryTool) => void }) {
  return (
    <li className="flex items-start">
      <a
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex min-w-0 flex-1 items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-violet-500/10 focus-visible:bg-violet-500/10"
      >
        <ToolIcon tool={tool} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-[15px] font-semibold text-white group-hover:text-violet-200">{tool.name}</span>
            <span className="truncate font-mono text-[11px] text-rein-label">{tool.hostname}</span>
          </span>
          <span className="line-clamp-2 text-[13px] leading-snug text-rein-soft" title={tool.description}>
            {tool.description}
          </span>
        </span>
      </a>
      <button
        type="button"
        aria-label={tool.isFavorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
        aria-pressed={tool.isFavorite}
        title={tool.isFavorite ? "Remove from favorites" : "Add to favorites"}
        onClick={() => onToggleFavorite?.(tool)}
        className="mt-2 shrink-0 rounded-md p-1 text-rein-label transition-colors hover:bg-violet-500/15 hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rein-accent"
      >
        {tool.isFavorite ? <StarSolidIcon aria-hidden="true" className="size-4 text-amber-300" /> : <StarOutlineIcon aria-hidden="true" className="size-4" />}
      </button>
      <span className="sr-only">(opens in a new tab)</span>
    </li>
  );
}

/** Inset panel shown in a category with no tools, with a small add button. */
export function EmptyToolsSlot({
  onAddTool,
  categoryName,
  preview = false,
}: {
  /** Opens the Add Tool form for this category; the button is disabled until provided. */
  onAddTool?: () => void;
  categoryName: string;
  /** Static rendering for the Create Category preview (not focusable). */
  preview?: boolean;
}) {
  const buttonClass =
    "inline-flex h-8 items-center gap-1.5 rounded-lg border border-rein-accent/50 px-3 text-xs font-semibold text-violet-200 transition-colors hover:border-rein-accent hover:bg-rein-accent hover:text-black disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-violet-200";

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-rein-border-strong/70 bg-black/40 px-4 py-5 text-center">
      <span className="text-sm font-medium text-white/85">No tools yet.</span>
      {preview ? (
        <span aria-hidden="true" className={buttonClass}>
          <PlusIcon className="size-3.5 stroke-2" />
          Add tool
        </span>
      ) : (
        <button
          type="button"
          onClick={onAddTool}
          disabled={!onAddTool}
          title={onAddTool ? undefined : "The Add Tool form is the next step being built."}
          aria-label={`Add a tool to ${categoryName}`}
          className={buttonClass}
        >
          <PlusIcon aria-hidden="true" className="size-3.5 stroke-2" />
          Add tool
        </button>
      )}
    </div>
  );
}

export function CategoryCard({
  category,
  tools,
  onAddTool,
  onToggleFavorite,
}: {
  category: LibraryCategory;
  tools: LibraryTool[];
  onAddTool?: () => void;
  onToggleFavorite?: (tool: LibraryTool) => void;
}) {
  const headingId = `category-${category.id}`;
  return (
    <article
      aria-labelledby={headingId}
      className="overflow-hidden rounded-[20px] border border-rein-border bg-[rgb(10_6_24/0.86)]"
    >
      <header className="flex items-center gap-3 border-b border-dashed border-rein-border px-[18px] pb-3.5 pt-[18px]">
        <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border border-rein-accent/40 bg-violet-600/20">
          <CategoryIcon iconKey={category.iconKey} className="size-5 text-violet-300" />
        </span>
        <h2 id={headingId} className="m-0 min-w-0 flex-1 truncate text-lg font-semibold tracking-[-0.01em]">
          {category.name}
        </h2>
        <span className="font-mono text-xs text-rein-label" aria-label={`${category.toolCount} tools`}>
          {category.toolCount}
        </span>
      </header>
      {tools.length > 0 ? (
        <ul className="m-0 flex list-none flex-col p-2 pb-2.5">
          {tools.map((tool) => (
            <ToolRow key={tool.id} tool={tool} onToggleFavorite={onToggleFavorite} />
          ))}
        </ul>
      ) : (
        <div className="p-3">
          <EmptyToolsSlot onAddTool={onAddTool} categoryName={category.name} />
        </div>
      )}
    </article>
  );
}

export function CategoryCardSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-[20px] border border-rein-border bg-[rgb(10_6_24/0.6)]">
      <div className="flex items-center gap-3 border-b border-dashed border-rein-border px-[18px] pb-3.5 pt-[18px]">
        <span className="size-[38px] animate-pulse rounded-[10px] bg-violet-500/15" />
        <span className="h-4 w-32 animate-pulse bg-violet-500/15" />
      </div>
      <div className="flex flex-col gap-4 p-[18px]">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex gap-3">
            <span className="size-9 animate-pulse rounded-[9px] bg-violet-500/10" />
            <span className="flex flex-1 flex-col gap-2 pt-1">
              <span className="h-3 w-2/5 animate-pulse bg-violet-500/15" />
              <span className="h-2.5 w-4/5 animate-pulse bg-violet-500/10" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
