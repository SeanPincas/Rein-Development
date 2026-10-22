"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { buttonStyles, eyebrow } from "@/components/ui/styles";
import { cx } from "@/lib/design";
import type { LibraryTool } from "@/lib/shared/library-types";
import { ToolIcon } from "./tool-icon";

type DeleteToolDialogProps = {
  tool: LibraryTool | null;
  onClose: () => void;
  /** Called after a delete, and after a conflict so the library refreshes. */
  onDeleted: () => void;
};

/** Confirm deleting one tool (DELETE /api/tools/:id?version=). */
export function DeleteToolDialog({ tool, onClose, onDeleted }: DeleteToolDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (tool && !dialog.open) dialog.showModal();
    if (!tool && dialog.open) dialog.close();
  }, [tool]);

  const close = () => {
    if (deleting) return;
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!tool) return;
    setDeleting(true);
    setError(null);
    try {
      const params = new URLSearchParams({ version: String(tool.version) });
      const response = await fetch(`/api/tools/${tool.id}?${params}`, { method: "DELETE" });
      if (response.ok) {
        toast.success(`“${tool.name}” deleted`);
        onClose();
        onDeleted();
        return;
      }
      const body = await response.json().catch(() => null);
      const code = body?.error?.code;
      if (code === "NOT_FOUND") {
        toast.message(`“${tool.name}” was already deleted`);
        onClose();
        onDeleted();
      } else if (code === "STALE_VERSION") {
        setError("This tool changed in another tab or device. Your library was refreshed; try again.");
        onDeleted();
      } else {
        setError(body?.error?.message ?? "The tool could not be deleted. Try again.");
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
      className="m-auto w-[min(460px,calc(100%-32px))] max-h-[calc(100dvh-32px)] overflow-hidden rounded-[20px] border border-red-400/40 bg-[#07050f] p-0 text-white shadow-[0_0_100px_rgb(239_68_68/0.15)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {tool && (
        <div className="flex max-h-[calc(100dvh-32px)] flex-col">
          <div className="flex shrink-0 items-start gap-4 border-b border-dashed border-rein-border px-7 pb-5 pt-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-red-400/40 bg-red-500/10 text-red-300">
              <ExclamationTriangleIcon aria-hidden="true" className="size-6" />
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className={cx("m-0", eyebrow)}>DELETE TOOL</p>
              <h2 id={titleId} className="m-0 break-words text-2xl font-bold tracking-[-0.02em]">
                Delete “{tool.name}”?
              </h2>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-7 py-6">
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-rein-border bg-black/40 p-3">
              <ToolIcon tool={tool} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-semibold">{tool.name}</span>
                <span className="truncate font-mono text-[11px] text-rein-label">{tool.hostname}</span>
              </span>
            </div>
            <p className="m-0 text-[15px] leading-relaxed text-rein-soft">
              It will be removed from your library. This can’t be undone.
            </p>
            {error && (
              <p role="alert" className="m-0 text-sm text-red-300">
                {error}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-rein-line bg-black/60 px-7 py-[18px]">
            <button type="button" onClick={close} className={buttonStyles.outline}>
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={deleting}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-red-500 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete tool"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
