"use client";

import type { DragEvent, KeyboardEvent, ReactNode } from "react";
import { cx } from "@/lib/design";

/** Elements that keep their own pointer behaviour; a drag must not start from them. */
const NON_DRAG_TARGETS = "a, button:not([data-reorder-handle]), input, textarea, select, label, [contenteditable='true']";

export type DragState = { draggingId: string | null; overId: string | null };

type ReorderableCardProps = {
  id: string;
  name: string;
  index: number;
  count: number;
  enabled: boolean;
  drag: DragState;
  onDragStateChange: (next: DragState) => void;
  onDropOn: (draggedId: string, targetId: string) => void;
  onKeyboardMove: (id: string, key: string) => boolean;
  children: (handle: ReactNode) => ReactNode;
};

/** Should this pointer drag be allowed to start? */
function canStartDrag(event: DragEvent<HTMLElement>): boolean {
  const target = event.target as HTMLElement | null;
  if (!target || target !== event.currentTarget) {
    if (target?.closest(NON_DRAG_TARGETS)) return false;
  }
  if (document.querySelector("dialog[open]")) return false;
  const active = document.activeElement as HTMLElement | null;
  if (active?.matches("input, textarea, select, [contenteditable='true']")) return false;
  return true;
}

/**
 * Wraps a category card with native drag-and-drop and a keyboard reorder handle.
 * The card renders the handle via the `children` render prop (in its header).
 */
export function ReorderableCard({
  id,
  name,
  index,
  count,
  enabled,
  drag,
  onDragStateChange,
  onDropOn,
  onKeyboardMove,
  children,
}: ReorderableCardProps) {
  const dragging = drag.draggingId === id;
  const isTarget = drag.draggingId !== null && drag.overId === id && !dragging;

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
        onDragStateChange({ draggingId: id, overId: null });
      }}
      onDragEnter={(event) => {
        if (!drag.draggingId || drag.draggingId === id) return;
        event.preventDefault();
        if (drag.overId !== id) onDragStateChange({ ...drag, overId: id });
      }}
      onDragOver={(event) => {
        if (!drag.draggingId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = drag.draggingId === id ? "none" : "move";
      }}
      onDragLeave={(event) => {
        if (drag.overId === id && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onDragStateChange({ ...drag, overId: null });
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        const draggedId = drag.draggingId ?? event.dataTransfer.getData("text/plain");
        onDragStateChange({ draggingId: null, overId: null });
        if (draggedId && draggedId !== id) onDropOn(draggedId, id);
      }}
      onDragEnd={() => onDragStateChange({ draggingId: null, overId: null })}
      className={cx(
        "rounded-[20px] transition-[opacity,box-shadow] duration-200",
        // Rearrange mode: a faint dashed outline marks every movable card.
        enabled && "cursor-grab outline-1 outline-offset-4 outline-rein-accent/45 outline-dashed active:cursor-grabbing",
        dragging && "opacity-40",
        isTarget && "ring-2 ring-rein-accent ring-offset-2 ring-offset-black shadow-[0_0_40px_rgb(124_58_237/0.35)]",
      )}
    >
      {children(handle)}
    </div>
  );
}
