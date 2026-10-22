"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { eyebrow } from "@/components/ui/styles";
import { cx } from "@/lib/design";
import { keyboardTargetIndex, moveItem } from "@/lib/shared/category-order";
import type { LibraryCategory } from "@/lib/shared/library-types";
import { dragTargetIndex, rowShift } from "@/lib/shared/list-drag";
import { CategoryIcon } from "./category-icon";

type RearrangeCategoriesDialogProps = {
  /** Order when the dialog opened; the dialog edits a draft copy. */
  categories: LibraryCategory[];
  onClose: () => void;
  /** Called with the full new order (only when it changed). */
  onSave: (next: LibraryCategory[]) => void;
};

const ROW_GAP = 6; // px, matches gap-1.5 on the list

type Drag = { id: string; from: number; startY: number; deltaY: number; pitch: number };

/**
 * Phone rearranging: every category as one compact row, so long cards never have to
 * be dragged across the page. Press-and-drag the grip (touch or mouse), use the ↑/↓
 * buttons, or focus a grip and use the arrow keys / Home / End. Nothing is saved
 * until "Save order"; Cancel or Esc discards the draft. Mount it to open it.
 */
export function RearrangeCategoriesDialog({ categories, onClose, onSave }: RearrangeCategoriesDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const helpId = useId();
  const [draft, setDraft] = useState(categories);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const focusAfterMove = useRef<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // Keep focus on the moved row's grip (rows re-render in their new order).
  useEffect(() => {
    const id = focusAfterMove.current;
    if (!id) return;
    focusAfterMove.current = null;
    dialogRef.current?.querySelector<HTMLElement>(`[data-order-grip="${CSS.escape(id)}"]`)?.focus();
  });

  const changed = draft.some((category, index) => category.id !== categories[index]?.id);

  const move = (from: number, to: number, keepFocus = false) => {
    if (to < 0 || to >= draft.length || to === from) return;
    const moved = draft[from];
    setDraft(moveItem(draft, from, to));
    if (keepFocus) focusAfterMove.current = moved.id;
    setAnnouncement(`${moved.name} moved to position ${to + 1} of ${draft.length}.`);
  };

  const onGripPointerDown = (event: PointerEvent<HTMLButtonElement>, id: string, index: number) => {
    if (event.button !== 0) return;
    const row = event.currentTarget.closest("li");
    if (!row) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ id, from: index, startY: event.clientY, deltaY: 0, pitch: row.getBoundingClientRect().height + ROW_GAP });
  };

  const onGripPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const deltaY = event.clientY - drag.startY;
    setDrag((current) => (current ? { ...current, deltaY } : current));
  };

  const onGripPointerUp = () => {
    if (!drag) return;
    move(drag.from, dragTargetIndex(drag.from, drag.deltaY, drag.pitch, draft.length));
    setDrag(null);
  };

  const target = drag ? dragTargetIndex(drag.from, drag.deltaY, drag.pitch, draft.length) : -1;

  const iconButton =
    "flex size-8 shrink-0 items-center justify-center rounded-lg text-rein-label transition-colors hover:bg-violet-500/15 hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rein-accent disabled:pointer-events-none disabled:opacity-30";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={helpId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[min(480px,calc(100%-24px))] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[20px] border border-rein-border-strong bg-[#07050f] p-0 text-white shadow-[0_0_120px_rgb(124_58_237/0.3)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[calc(100dvh-24px)] flex-col">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-dashed border-rein-border px-5 pb-4 pt-5">
          <div className="flex flex-col gap-1">
            <p className={cx("m-0", eyebrow)}>REARRANGE</p>
            <h2 id={titleId} className="m-0 text-[22px] font-bold tracking-[-0.02em]">
              Category order
            </h2>
            <p id={helpId} className="m-0 text-[13px] text-rein-soft">
              Drag a handle, or use the arrows. The top category comes first.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-rein-border text-rein-soft hover:text-white"
          >
            <XMarkIcon aria-hidden="true" className="size-[18px]" />
          </button>
        </div>

        <ol className="m-0 flex min-h-0 flex-1 list-none flex-col gap-1.5 overflow-y-auto overscroll-contain p-3">
          {draft.map((category, index) => {
            const held = drag?.id === category.id;
            const shift = drag && !held ? rowShift(index, drag.from, target) * drag.pitch : 0;
            return (
              <li
                key={category.id}
                style={{
                  transform: held ? `translateY(${drag?.deltaY ?? 0}px)` : shift ? `translateY(${shift}px)` : undefined,
                  // Rows glide aside while dragging; no transition otherwise, so a drop never animates backwards.
                  transition: drag && !held ? "transform 160ms cubic-bezier(0.22,1,0.36,1)" : undefined,
                }}
                className={cx(
                  "relative flex h-14 shrink-0 items-center gap-1.5 rounded-xl border px-1.5",
                  "bg-[linear-gradient(135deg,rgb(124_58_237/0.13),rgb(124_58_237/0.04)_60%,rgb(124_58_237/0.07))]",
                  held
                    ? "z-10 border-rein-accent bg-[#1a1033] shadow-[0_14px_40px_rgb(0_0_0/0.55),0_0_24px_rgb(124_58_237/0.35)]"
                    : "border-violet-400/10",
                )}
              >
                <button
                  type="button"
                  data-order-grip={category.id}
                  aria-label={`Move ${category.name}, position ${index + 1} of ${draft.length}`}
                  title="Drag, or use the arrow keys"
                  onPointerDown={(event) => onGripPointerDown(event, category.id, index)}
                  onPointerMove={onGripPointerMove}
                  onPointerUp={onGripPointerUp}
                  onPointerCancel={() => setDrag(null)}
                  onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                    const to = keyboardTargetIndex(index, event.key, draft.length);
                    if (to === null) return;
                    event.preventDefault();
                    move(index, to, true);
                  }}
                  className={cx(
                    iconButton,
                    "size-9 touch-none select-none",
                    held ? "cursor-grabbing text-violet-200" : "cursor-grab",
                  )}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                    {[3, 7, 11].flatMap((y) => [4.5, 9.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />))}
                  </svg>
                </button>
                <span aria-hidden="true" className="w-4 shrink-0 text-right font-mono text-[11px] text-rein-label">
                  {index + 1}
                </span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-rein-accent/40 bg-violet-600/20">
                  <CategoryIcon iconKey={category.iconKey} className="size-4 text-violet-300" />
                </span>
                <span className="min-w-0 flex-1 truncate pl-1 text-[15px] font-semibold">{category.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-rein-label" aria-label={`${category.toolCount} tools`}>
                  {category.toolCount}
                </span>
                <button
                  type="button"
                  aria-label={`Move ${category.name} up`}
                  disabled={index === 0 || drag !== null}
                  onClick={() => move(index, index - 1)}
                  className={iconButton}
                >
                  <ChevronUpIcon aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${category.name} down`}
                  disabled={index === draft.length - 1 || drag !== null}
                  onClick={() => move(index, index + 1)}
                  className={iconButton}
                >
                  <ChevronDownIcon aria-hidden="true" className="size-4" />
                </button>
              </li>
            );
          })}
        </ol>

        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>

        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-rein-line bg-black/60 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-[10px] border border-white/30 px-4 text-sm font-medium text-white transition-colors hover:border-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!changed}
            onClick={() => onSave(draft)}
            className="inline-flex h-10 items-center rounded-[10px] bg-rein-accent px-4 text-sm font-semibold text-black transition-colors hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save order
          </button>
        </div>
      </div>
    </dialog>
  );
}
