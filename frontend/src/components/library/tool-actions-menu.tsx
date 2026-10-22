"use client";

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { EllipsisVerticalIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { cx } from "@/lib/design";
import { actionMotion, triggerIconMotion, triggerLayerMotion } from "./action-swap-motion";

type ToolActionsMenuProps = {
  toolName: string;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
};

const iconButton =
  "flex size-7 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70";

/**
 * Tool-row twin of the category card's actions: the ⋮ button swaps, in place, for
 * icon-only Edit and Delete buttons stacked vertically. Both layers share one grid
 * cell, so the row never shifts. Click outside, Esc, or tabbing out swaps back.
 * Keyboard: ↑/↓ move between Edit and Delete; Esc returns focus to ⋮.
 */
export function ToolActionsMenu({ toolName, onEdit, onDelete, className }: ToolActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  // Focus moves after commit, once the `inert` flags have flipped.
  const pendingFocus = useRef<"edit" | "trigger" | null>(null);

  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === "edit") editRef.current?.focus();
    else if (target === "trigger") triggerRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Event-handler only: records where focus should land once `open` commits.
  function setOpenAndFocus(next: boolean, focus: "edit" | "trigger" | null) {
    pendingFocus.current = focus;
    setOpen(next);
  }

  const onActionsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpenAndFocus(false, "trigger");
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      (document.activeElement === editRef.current ? deleteRef : editRef).current?.focus();
    }
  };

  // Tab / Shift+Tab out of the pair swaps back without stealing focus.
  const onActionsBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenAndFocus(false, null);
  };

  const choose = (action: () => void) => {
    setOpenAndFocus(false, null);
    action();
  };

  const layer = "col-start-1 row-start-1 flex items-center justify-center";

  return (
    <div ref={rootRef} className={cx("grid shrink-0", className)}>
      <div
        inert={open}
        aria-hidden={open}
        className={cx(layer, triggerLayerMotion(open))}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Actions for ${toolName}`}
          aria-expanded={open}
          onClick={() => setOpenAndFocus(true, "edit")}
          className={cx(iconButton, "size-8 text-rein-label hover:bg-violet-500/15 hover:text-violet-200", triggerIconMotion(open))}
        >
          <EllipsisVerticalIcon aria-hidden="true" className="size-5" />
        </button>
      </div>

      <div
        role="group"
        aria-label={`${toolName} actions`}
        inert={!open}
        aria-hidden={!open}
        onKeyDown={onActionsKeyDown}
        onBlur={onActionsBlur}
        className={cx(layer, "flex-col gap-1", !open && "pointer-events-none")}
      >
        <button
          ref={editRef}
          type="button"
          aria-label={`Edit ${toolName}`}
          title="Edit"
          onClick={() => choose(onEdit)}
          className={cx(iconButton, "text-violet-300 hover:bg-violet-500/15 hover:text-white", actionMotion(open, "translate-y-4"))}
        >
          <PencilSquareIcon aria-hidden="true" className="size-4" />
        </button>
        <button
          ref={deleteRef}
          type="button"
          aria-label={`Delete ${toolName}`}
          title="Delete"
          onClick={() => choose(onDelete)}
          className={cx(iconButton, "text-red-300 hover:bg-red-500/10 hover:text-red-200", actionMotion(open, "-translate-y-4", "delay-[60ms]"))}
        >
          <TrashIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
