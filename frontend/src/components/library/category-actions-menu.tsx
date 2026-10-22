"use client";

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { EllipsisVerticalIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { cx } from "@/lib/design";
import { actionMotion, triggerIconMotion, triggerLayerMotion } from "./action-swap-motion";

type CategoryActionsMenuProps = {
  categoryName: string;
  count: number;
  /** When either action is missing, only the tool count is shown. */
  onEdit?: () => void;
  onDelete?: () => void;
};

const iconButton =
  "flex size-8 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70";

/**
 * Tool count + ⋮ button. Clicking ⋮ swaps both, in place, for icon-only Edit
 * and Delete buttons (the two layers share one grid cell, so the header never
 * shifts). Click outside, Esc, or tabbing out of the pair swaps back.
 * Keyboard: ←/→ move between Edit and Delete; Esc returns focus to ⋮.
 */
export function CategoryActionsMenu({ categoryName, count, onEdit, onDelete }: CategoryActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  // Focus is moved after commit, once the `inert` flags have flipped.
  const pendingFocus = useRef<"edit" | "trigger" | null>(null);

  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === "edit") editRef.current?.focus();
    else if (target === "trigger") triggerRef.current?.focus();
  }, [open]);

  // Click/tap outside swaps back.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const countLabel = (
    <span className="font-mono text-xs text-rein-label" aria-label={`${count} ${count === 1 ? "tool" : "tools"}`}>
      {count}
    </span>
  );

  if (!onEdit || !onDelete) return countLabel;

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
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      (document.activeElement === editRef.current ? deleteRef : editRef).current?.focus();
    }
  };

  // Tab / Shift+Tab out of the Edit–Delete pair swaps back without stealing focus.
  const onActionsBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenAndFocus(false, null);
  };

  const choose = (action: () => void) => {
    setOpenAndFocus(false, null);
    action();
  };

  const layer = "col-start-1 row-start-1 flex items-center justify-end";

  return (
    <div ref={rootRef} className="grid shrink-0">
      <div
        inert={open}
        aria-hidden={open}
        className={cx(layer, "gap-3", triggerLayerMotion(open))}
      >
        {countLabel}
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Actions for ${categoryName}`}
          aria-expanded={open}
          onClick={() => setOpenAndFocus(true, "edit")}
          className={cx(iconButton, "text-rein-label hover:bg-violet-500/15 hover:text-violet-200", triggerIconMotion(open))}
        >
          <EllipsisVerticalIcon aria-hidden="true" className="size-5" />
        </button>
      </div>

      <div
        role="group"
        aria-label={`${categoryName} actions`}
        inert={!open}
        aria-hidden={!open}
        onKeyDown={onActionsKeyDown}
        onBlur={onActionsBlur}
        className={cx(layer, "gap-1", !open && "pointer-events-none")}
      >
        <button
          ref={editRef}
          type="button"
          aria-label={`Edit ${categoryName}`}
          title="Edit"
          onClick={() => choose(onEdit)}
          className={cx(iconButton, "text-violet-300 hover:bg-violet-500/15 hover:text-white", actionMotion(open, "translate-x-9", "delay-[60ms]"))}
        >
          <PencilSquareIcon aria-hidden="true" className="size-[18px]" />
        </button>
        <button
          ref={deleteRef}
          type="button"
          aria-label={`Delete ${categoryName}`}
          title="Delete"
          onClick={() => choose(onDelete)}
          className={cx(iconButton, "text-red-300 hover:bg-red-500/10 hover:text-red-200", actionMotion(open, "translate-x-3"))}
        >
          <TrashIcon aria-hidden="true" className="size-[18px]" />
        </button>
      </div>
    </div>
  );
}
