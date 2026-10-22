"use client";

import type { DragEvent, KeyboardEvent, ReactNode } from "react";
import { cx } from "@/lib/design";

/** Elements that keep their own pointer behaviour; a drag must not start from them. */
const NON_DRAG_TARGETS = "a, button:not([data-reorder-handle]), input, textarea, select, label, [contenteditable='true']";

type ReorderableCardProps = {
  id: string;
  name: string;
  index: number;
  count: number;
  enabled: boolean;
  /** This card is the one being dragged (faded in place). */
  dragging: boolean;
  /** The held card is over this card: it will take this position on drop. */
  dropTarget: boolean;
  /** Some card is being dragged. */
  dragActive: boolean;
  onDragStart: (id: string) => void;
  /** The dragged card entered this card: highlight it as the drop target. */
  onDragEnterCard: (id: string) => void;
  onDropCommit: (targetId?: string) => void;
  onDragEnd: () => void;
  onKeyboardMove: (id: string, key: string) => boolean;
  children: (handle: ReactNode) => ReactNode;
};

/** Should this pointer drag be allowed to start? */
function canStartDrag(event: DragEvent<HTMLElement>): boolean {
  const target = event.target as HTMLElement | null;
  if (target && target !== event.currentTarget && target.closest(NON_DRAG_TARGETS)) return false;
  if (document.querySelector("dialog[open]")) return false;
  const active = document.activeElement as HTMLElement | null;
  if (active?.matches("input, textarea, select, [contenteditable='true']")) return false;
  return true;
}

/**
 * Category card wrapper for rearrange mode: native drag-and-drop with live
 * preview, a keyboard handle, and a gentle jiggle like phone home-screen edit mode.
 * `data-flip-id` lets useFlip slide the card when the order changes.
 */
export function ReorderableCard({
  id,
  name,
  index,
  count,
  enabled,
  dragging,
  dropTarget,
  dragActive,
  onDragStart,
  onDragEnterCard,
  onDropCommit,
  onDragEnd,
  onKeyboardMove,
  children,
}: ReorderableCardProps) {
  const handle = enabled ? (
    <button
      type="button"
      data-reorder-handle={id}
      aria-label={`Reorder ${name}, position ${index + 1} of ${count}`}
      aria-describedby="category-reorder-help"
      title="Drag to reorder, or use the arrow keys"
      onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
        if (onKeyboardMove(id, event.key)) event.preventDefault();
      }}
      className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-rein-label transition-colors hover:bg-violet-500/15 hover:text-violet-200 active:cursor-grabbing"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
        {[3, 7, 11].flatMap((y) => [4.5, 9.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />))}
      </svg>
    </button>
  ) : null;

  return (
    <div
      data-flip-id={id}
      data-category-id={id}
      draggable={enabled}
      aria-roledescription={enabled ? "reorderable category" : undefined}
      onDragStart={(event) => {
        if (!enabled || !canStartDrag(event)) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
        onDragStart(id);
      }}
      onDragEnter={(event) => {
        if (!dragActive) return;
        event.preventDefault();
        onDragEnterCard(id);
      }}
      onDragOver={(event) => {
        if (!dragActive) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        if (!dragActive) return;
        event.preventDefault();
        event.stopPropagation();
        onDropCommit(dragging ? undefined : id);
      }}
      onDragEnd={onDragEnd}
      className={cx(
        "relative rounded-[20px]",
        enabled && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div
        className={cx(
          "rounded-[20px] transition-[opacity,outline-color] duration-200",
          // Rearrange mode: a faint dashed outline marks every movable card, and it jiggles.
          enabled && !dropTarget && "outline-1 outline-offset-4 outline-dashed outline-rein-accent/45",
          enabled && !dragActive && "rein-jiggle",
          // The held card fades in place; the card under the pointer is the highlighted drop target.
          dragging && "opacity-40",
          dropTarget && "outline-2 outline-offset-4 outline-solid outline-rein-accent shadow-[0_0_40px_rgb(124_58_237/0.35)]",
        )}
        style={enabled ? { animationDelay: `${(index % 5) * -0.17}s` } : undefined}
      >
        {children(handle)}
      </div>
    </div>
  );
}
