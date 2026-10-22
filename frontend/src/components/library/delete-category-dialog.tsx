"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { buttonStyles, eyebrow } from "@/components/ui/styles";
import { cx } from "@/lib/design";
import type { LibraryCategory } from "@/lib/shared/library-types";

type DeleteCategoryDialogProps = {
  category: LibraryCategory | null;
  categories: LibraryCategory[];
  onClose: () => void;
  onDeleted: () => void;
};

/**
 * Confirm deleting a category. A category with tools must name another category
 * to receive them; the API moves the tools and deletes the category atomically.
 */
export function DeleteCategoryDialog({ category, categories, onClose, onDeleted }: DeleteCategoryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [reassignTo, setReassignTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const others = categories.filter((other) => other.id !== category?.id);
  const hasTools = (category?.toolCount ?? 0) > 0;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (category && !dialog.open) dialog.showModal();
    if (!category && dialog.open) dialog.close();
  }, [category]);

  const close = () => {
    if (deleting) return;
    setReassignTo(null);
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!category) return;
    if (hasTools && !reassignTo) {
      setError("Choose where to move its tools first.");
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const params = new URLSearchParams({ version: String(category.version) });
      if (hasTools && reassignTo) params.set("reassignTo", reassignTo);
      const response = await fetch(`/api/categories/${category.id}?${params}`, { method: "DELETE" });
      if (response.ok) {
        const target = others.find((other) => other.id === reassignTo);
        toast.success(
          hasTools && target ? `“${category.name}” deleted; tools moved to “${target.name}”` : `“${category.name}” deleted`,
        );
        setReassignTo(null);
        onClose();
        onDeleted();
        return;
      }
      const body = await response.json().catch(() => null);
      const code = body?.error?.code;
      if (code === "STALE_VERSION" || code === "NOT_FOUND" || code === "CATEGORY_NOT_EMPTY") {
        setError(
          code === "CATEGORY_NOT_EMPTY"
            ? "This category has tools now. Your library was refreshed; choose where to move them."
            : "This category changed in another tab or device. Your library was refreshed; try again.",
        );
        onDeleted();
      } else {
        setError(body?.error?.message ?? "The category could not be deleted. Try again.");
      }
    } catch {
      setError("You appear to be offline. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="m-auto w-[min(500px,calc(100%-32px))] max-h-[calc(100dvh-32px)] overflow-hidden rounded-[20px] border border-red-400/40 bg-[#07050f] p-0 text-white shadow-[0_0_100px_rgb(239_68_68/0.15)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {category && (
        <div className="flex max-h-[calc(100dvh-32px)] flex-col">
          <div className="flex shrink-0 items-start gap-4 border-b border-dashed border-rein-border px-7 pb-5 pt-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-red-400/40 bg-red-500/10 text-red-300">
              <ExclamationTriangleIcon aria-hidden="true" className="size-6" />
            </span>
            <div className="flex flex-col gap-1.5">
              <p className={cx("m-0", eyebrow)}>DELETE ENTRY</p>
              <h2 id={titleId} className="m-0 text-2xl font-bold tracking-[-0.02em]">
                Delete “{category.name}”?
              </h2>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-7 py-6">
            {hasTools ? (
              <>
                <p className="m-0 text-[15px] leading-relaxed text-rein-soft">
                  It has {category.toolCount} {category.toolCount === 1 ? "tool" : "tools"}. Tools are never deleted with a
                  category — choose where to move {category.toolCount === 1 ? "it" : "them"}.
                </p>
                {others.length > 0 ? (
                  <div role="radiogroup" aria-label="Move tools to" className="flex flex-wrap gap-2">
                    {others.map((other) => {
                      const checked = other.id === reassignTo;
                      return (
                        <button
                          key={other.id}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          onClick={() => {
                            setReassignTo(other.id);
                            setError(null);
                          }}
                          className={cx(
                            "h-9 rounded-full border px-3.5 text-sm transition-colors",
                            checked
                              ? "border-rein-accent bg-rein-accent/20 font-semibold text-white"
                              : "border-rein-border bg-black text-rein-muted hover:border-rein-accent hover:text-white",
                          )}
                        >
                          {other.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="m-0 text-sm text-amber-200">
                    Create another category first, then move these tools into it before deleting this one.
                  </p>
                )}
              </>
            ) : (
              <p className="m-0 text-[15px] leading-relaxed text-rein-soft">This category is empty. This can’t be undone.</p>
            )}
            {error && (
              <p role="alert" className="m-0 text-sm text-red-300">
                {error}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-rein-line bg-black/60 px-7 py-[18px]">
            <button type="button" onClick={close} className={buttonStyles.outline}>
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={deleting || (hasTools && others.length === 0)}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-red-500 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "Deleting…" : hasTools ? "Move tools & delete" : "Delete category"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
