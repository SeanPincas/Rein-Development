"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { buttonStyles, eyebrow } from "@/components/ui/styles";
import { cx } from "@/lib/design";
import { categoryIconLibrary, defaultCategoryIconKey, type CategoryIconKey } from "@/lib/shared/icon-library";
import { IconPicker } from "./icon-picker";
import { CategoryIcon } from "./category-icon";
import { EmptyToolsSlot } from "./library-cards";

const NAME_LIMIT = 50;

type CreateCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

const canonical = (value: string) => value.trim().replace(/\s+/g, " ");

/** Modal form for POST /api/categories (name + icon), with a live card preview. */
export function CreateCategoryDialog({ open, onOpenChange, onCreated }: CreateCategoryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState<CategoryIconKey>(defaultCategoryIconKey);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Drive the native <dialog>: it supplies focus trapping, Esc and the backdrop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      nameRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const reset = () => {
    setName("");
    setIconKey(defaultCategoryIconKey);
    setFieldError(null);
    setFormError(null);
  };

  const close = () => {
    if (saving) return;
    onOpenChange(false);
    reset();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = canonical(name);
    if (!value) {
      setFieldError("Give the category a name.");
      nameRef.current?.focus();
      return;
    }

    setSaving(true);
    setFieldError(null);
    setFormError(null);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value, iconKey }),
      });
      const body = await response.json().catch(() => null);

      if (response.ok) {
        toast.success(`“${value}” created`);
        onOpenChange(false);
        reset();
        onCreated();
        return;
      }

      const code = body?.error?.code;
      if (code === "DUPLICATE_CATEGORY") {
        setFieldError("You already have a category with this name.");
        nameRef.current?.focus();
      } else if (code === "VALIDATION_ERROR") {
        setFieldError(body?.error?.fields?.name?.[0] ?? body?.error?.fields?.iconKey?.[0] ?? "Check the name and icon.");
      } else {
        setFormError(body?.error?.message ?? "The category could not be created. Try again.");
      }
    } catch {
      setFormError("You appear to be offline. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const preview = canonical(name) || "Untitled category";
  const selected = categoryIconLibrary.find((option) => option.key === iconKey);

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
      className="m-auto w-[min(560px,calc(100%-32px))] max-h-[calc(100dvh-32px)] overflow-x-hidden overflow-y-auto rounded-[20px] border border-rein-border-strong bg-[#07050f] p-0 text-white shadow-[0_0_120px_rgb(124_58_237/0.3)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit} noValidate>
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-rein-border px-7 pb-5 pt-6">
          <div className="flex flex-col gap-1.5">
            <p className={cx("m-0", eyebrow)}>NEW ENTRY / C.01</p>
            <h2 id={titleId} className="m-0 text-[26px] font-bold tracking-[-0.02em]">
              Create a category
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex size-10 items-center justify-center rounded-[10px] border border-rein-border text-rein-soft hover:text-white"
          >
            <XMarkIcon aria-hidden="true" className="size-[18px]" />
          </button>
        </div>

        <div className="flex flex-col gap-[22px] px-7 py-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor="category-name" className="text-sm font-semibold">
                Name
              </label>
              <span className="font-mono text-[11px] text-rein-label">
                {canonical(name).length} / {NAME_LIMIT}
              </span>
            </div>
            <input
              ref={nameRef}
              id="category-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value.slice(0, NAME_LIMIT));
                if (fieldError) setFieldError(null);
              }}
              maxLength={NAME_LIMIT}
              placeholder="e.g. Animation Libraries"
              autoComplete="off"
              aria-invalid={Boolean(fieldError) || undefined}
              aria-describedby="category-name-hint"
              className={cx(
                "h-[46px] rounded-[10px] border bg-black px-3.5 text-[15px] text-white placeholder:text-[#8e86b5] focus:outline-none focus:ring-2 focus:ring-rein-accent/40",
                fieldError ? "border-red-400/70" : "border-rein-border focus:border-rein-accent",
              )}
            />
            <span id="category-name-hint" className={cx("text-[13px]", fieldError ? "text-red-300" : "text-rein-soft")}>
              {fieldError ?? "Names are unique in your library. Capital letters and extra spaces don’t count."}
            </span>
          </div>

          {/* min-w-0: fieldsets default to min-content width, which would make the whole modal scroll. */}
          <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
            <div className="flex items-baseline justify-between">
              <legend className="text-sm font-semibold">Icon</legend>
              <span className="font-mono text-[11px] tracking-[0.08em] text-rein-accent">{selected?.label.toUpperCase()}</span>
            </div>
            <IconPicker value={iconKey} onChange={setIconKey} />
          </fieldset>

          <div className="flex flex-col gap-2.5">
            <span className={eyebrow}>PREVIEW</span>
            <div className="overflow-hidden rounded-[20px] border border-rein-border bg-[rgb(10_6_24/0.86)]">
              <div className="flex items-center gap-3 border-b border-dashed border-rein-border px-[18px] py-4">
                <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border border-rein-accent/40 bg-violet-600/20">
                  <CategoryIcon iconKey={iconKey} className="size-5 text-violet-300" />
                </span>
                <span className="min-w-0 flex-1 truncate text-lg font-semibold">{preview}</span>
                <span className="font-mono text-xs text-rein-label">0</span>
              </div>
              <div className="p-3">
                <EmptyToolsSlot categoryName={preview} preview />
              </div>
            </div>
          </div>

          {formError && (
            <p role="alert" className="m-0 text-sm text-red-300">
              {formError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rein-line bg-black/60 px-7 py-[18px]">
          <span className="font-mono text-[11px] tracking-[0.08em] text-rein-label">ESC TO CANCEL</span>
          <div className="flex gap-2.5">
            <button type="button" onClick={close} className={buttonStyles.outline}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cx(buttonStyles.primary, "disabled:cursor-wait disabled:opacity-70")}
            >
              {saving ? "Creating…" : "Create category"}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
