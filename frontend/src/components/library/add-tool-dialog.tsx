"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { buttonStyles, eyebrow } from "@/components/ui/styles";
import { cx } from "@/lib/design";
import { defaultCategoryIconKey, type CategoryIconKey } from "@/lib/shared/icon-library";
import type { LibraryCategory } from "@/lib/shared/library-types";
import { IconPicker } from "./icon-picker";

const LIMITS = { url: 2048, name: 100, description: 280, category: 50 } as const;
const LOOKUP_DELAY_MS = 600;

type Metadata = {
  sourceUrl: string;
  finalUrl: string;
  title: string | null;
  description: string | null;
  iconUrl: string | null;
  iconStatus: "ready" | "fallback" | "unavailable";
  metadataToken: string;
};

type Lookup =
  | { state: "idle" }
  | { state: "loading"; url: string }
  | { state: "done"; url: string; metadata: Metadata }
  | { state: "error"; url: string; message: string };

type FieldErrors = Partial<Record<"url" | "name" | "description" | "category", string>>;

type AddToolDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: LibraryCategory[];
  /** Category to preselect, e.g. when opened from an empty card. */
  initialCategoryId?: string;
  onSaved: () => void;
};

const fieldClass = (invalid: boolean) =>
  cx(
    "rounded-[10px] border bg-black px-3.5 text-[15px] text-white placeholder:text-[#8e86b5] focus:outline-none focus:ring-2 focus:ring-rein-accent/40",
    invalid ? "border-red-400/70" : "border-rein-border focus:border-rein-accent",
  );

const canonical = (value: string) => value.trim().replace(/\s+/g, " ");

/** Absolute http(s) URL, or null. "vercel.com" is completed to https://vercel.com on blur. */
function parseHttpUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function withScheme(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

const lookupMessage: Record<string, string> = {
  UNSAFE_URL: "This address can't be checked safely. You can still save it manually.",
  RATE_LIMITED: "Too many lookups for now. Fill the details in yourself, or try again shortly.",
  SERVICE_UNAVAILABLE: "Site lookup is unavailable right now. You can still save manually.",
};

export function AddToolDialog({ open, onOpenChange, categories, initialCategoryId, onSaved }: AddToolDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // Once the user types in a field, late suggestions never overwrite it.
  const [edited, setEdited] = useState({ name: false, description: false });
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">(categories.length ? "existing" : "new");
  const [categoryId, setCategoryId] = useState<string | undefined>(initialCategoryId ?? categories[0]?.id);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<CategoryIconKey>(defaultCategoryIconKey);
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const lookupAbort = useRef<AbortController | null>(null);
  // Mirror of `edited` for the async lookup, so it reads the latest value without stale closures.
  const editedRef = useRef(edited);
  useEffect(() => {
    editedRef.current = edited;
  }, [edited]);

  const dirty = Boolean(url.trim() || name.trim() || description.trim() || newCategoryName.trim());

  const reset = useCallback(() => {
    lookupAbort.current?.abort();
    setUrl("");
    setName("");
    setDescription("");
    setEdited({ name: false, description: false });
    setNewCategoryName("");
    setNewCategoryIcon(defaultCategoryIconKey);
    setLookup({ state: "idle" });
    setErrors({});
    setFormError(null);
    setConfirmDiscard(false);
  }, []);

  // Open/close the native dialog (focus trap, Esc, backdrop) and apply the preselected category.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      urlRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      setCategoryMode(categories.length ? "existing" : "new");
      setCategoryId(initialCategoryId ?? categories[0]?.id);
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, initialCategoryId, categories]);

  // Debounced metadata lookup, correlated to the exact URL that started it.
  useEffect(() => {
    const target = parseHttpUrl(url);
    if (!open || !target) return;

    const timer = window.setTimeout(async () => {
      lookupAbort.current?.abort();
      const controller = new AbortController();
      lookupAbort.current = controller;
      setLookup({ state: "loading", url: target });
      try {
        const response = await fetch("/api/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: target }),
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null);
        if (controller.signal.aborted) return;
        if (!response.ok) {
          const code = body?.error?.code as string | undefined;
          setLookup({ state: "error", url: target, message: (code && lookupMessage[code]) ?? "Couldn't read this site. You can still save manually." });
          return;
        }
        const metadata = body.data.metadata as Metadata;
        setLookup({ state: "done", url: target, metadata });
        if (!editedRef.current.name && metadata.title) setName(metadata.title.slice(0, LIMITS.name));
        if (!editedRef.current.description && metadata.description) {
          setDescription(metadata.description.slice(0, LIMITS.description));
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setLookup({ state: "error", url: target, message: "Couldn't reach the lookup service. You can still save manually." });
        }
      }
    }, LOOKUP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [url, open]);

  const requestClose = () => {
    if (saving) return;
    if (dirty && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(false);
    reset();
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!parseHttpUrl(url)) next.url = "Enter a full web address, like https://example.com.";
    if (!canonical(name)) next.name = "Give the tool a name.";
    if (!canonical(description)) next.description = "Add a short description so you can find it later.";
    if (categoryMode === "existing" && !categoryId) next.category = "Choose a category.";
    if (categoryMode === "new" && !canonical(newCategoryName)) next.category = "Name the new category.";
    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setConfirmDiscard(false);
    const found = validate();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;

    const target = parseHttpUrl(url)!;
    // Only hand over the lookup token if it was issued for this exact URL.
    const metadataToken =
      lookup.state === "done" && lookup.url === target ? lookup.metadata.metadataToken : undefined;

    setSaving(true);
    try {
      const response = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: canonical(name),
          url: target,
          description: canonical(description),
          category:
            categoryMode === "existing"
              ? { id: categoryId }
              : { create: { name: canonical(newCategoryName), iconKey: newCategoryIcon } },
          ...(metadataToken ? { metadataToken } : {}),
        }),
      });
      const body = await response.json().catch(() => null);

      if (response.ok) {
        toast.success(`“${canonical(name)}” saved`);
        onOpenChange(false);
        reset();
        onSaved();
        return;
      }

      const code = body?.error?.code as string | undefined;
      if (code === "DUPLICATE_TOOL_URL") setErrors({ url: "This URL is already in your library." });
      else if (code === "DUPLICATE_CATEGORY") setErrors({ category: "You already have a category with this name." });
      else if (code === "VALIDATION_ERROR") {
        const fields = body?.error?.fields ?? {};
        setErrors({
          url: fields.url?.[0],
          name: fields.name?.[0],
          description: fields.description?.[0],
          category: fields.category?.[0] ?? fields["category.id"]?.[0] ?? fields["category.create.name"]?.[0],
        });
      } else if (code === "NOT_FOUND") {
        setErrors({ category: "That category no longer exists. Pick another." });
      } else {
        setFormError(body?.error?.message ?? "The tool could not be saved. Try again.");
      }
    } catch {
      setFormError("You appear to be offline. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const currentUrl = parseHttpUrl(url);
  const activeLookup = lookup.state !== "idle" && lookup.url === currentUrl ? lookup : null;
  const host = currentUrl ? new URL(currentUrl).hostname.replace(/^www\./, "") : "";
  const suggested = activeLookup?.state === "done";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      className="m-auto w-[min(600px,calc(100%-32px))] max-h-[calc(100dvh-32px)] overflow-x-hidden overflow-y-auto rounded-[20px] border border-rein-border-strong bg-[#07050f] p-0 text-white shadow-[0_0_120px_rgb(124_58_237/0.3)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit} noValidate>
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-rein-border px-7 pb-5 pt-6">
          <div className="flex flex-col gap-1.5">
            <p className={cx("m-0", eyebrow)}>NEW ENTRY / T.01</p>
            <h2 id={titleId} className="m-0 text-[26px] font-bold tracking-[-0.02em]">
              Add a tool
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="flex size-10 items-center justify-center rounded-[10px] border border-rein-border text-rein-soft hover:text-white"
          >
            <XMarkIcon aria-hidden="true" className="size-[18px]" />
          </button>
        </div>

        <div className="flex flex-col gap-[22px] px-7 py-6">
          {/* URL + lookup status */}
          <div className="flex flex-col gap-2">
            <label htmlFor="tool-url" className="text-sm font-semibold">
              Website URL
            </label>
            <input
              ref={urlRef}
              id="tool-url"
              type="url"
              inputMode="url"
              value={url}
              maxLength={LIMITS.url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (errors.url) setErrors((e) => ({ ...e, url: undefined }));
              }}
              onBlur={() => setUrl((value) => withScheme(value))}
              placeholder="https://example.com"
              autoComplete="url"
              spellCheck={false}
              aria-invalid={Boolean(errors.url) || undefined}
              aria-describedby="tool-url-status"
              className={cx(fieldClass(Boolean(errors.url)), "h-[46px] font-mono text-sm")}
            />
            <div id="tool-url-status" aria-live="polite">
              {errors.url ? (
                <span className="text-[13px] text-red-300">{errors.url}</span>
              ) : activeLookup ? (
                <div className="flex items-center gap-3 rounded-xl border border-rein-border bg-violet-600/10 p-3">
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-rein-accent/40 bg-black font-bold">
                    {activeLookup.state === "done" && activeLookup.metadata.iconStatus === "ready" && activeLookup.metadata.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote favicon, loaded without referrer.
                      <img src={activeLookup.metadata.iconUrl} alt="" width={22} height={22} referrerPolicy="no-referrer" className="size-[22px] object-contain" />
                    ) : (
                      <span aria-hidden="true">{(canonical(name) || host).charAt(0).toUpperCase() || "?"}</span>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-semibold">
                      {activeLookup.state === "loading"
                        ? "Looking up the site…"
                        : activeLookup.state === "error"
                          ? "Site details unavailable"
                          : activeLookup.metadata.iconStatus === "ready"
                            ? "Site icon found"
                            : activeLookup.metadata.iconStatus === "fallback"
                              ? "No icon found — a letter tile will be used"
                              : "Site didn't respond — a letter tile will be used"}
                    </span>
                    <span className="truncate font-mono text-xs text-rein-label">
                      {activeLookup.state === "error"
                        ? activeLookup.message
                        : activeLookup.state === "done" && (activeLookup.metadata.title || activeLookup.metadata.description)
                          ? `${host} · name and description suggested below`
                          : host}
                    </span>
                  </span>
                  {activeLookup.state === "loading" ? (
                    <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-rein-accent/30 border-t-rein-accent motion-reduce:animate-none" />
                  ) : activeLookup.state === "error" ? (
                    <ExclamationTriangleIcon aria-hidden="true" className="size-5 text-amber-300" />
                  ) : (
                    <CheckCircleIcon aria-hidden="true" className="size-5 text-rein-accent" />
                  )}
                </div>
              ) : (
                <span className="text-[13px] text-rein-soft">Paste a link and Rein will look up its icon and details.</span>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor="tool-name" className="text-sm font-semibold">
                Name
              </label>
              {suggested && !edited.name && name && (
                <span className="font-mono text-[11px] tracking-[0.08em] text-rein-accent">SUGGESTED · EDITABLE</span>
              )}
            </div>
            <input
              id="tool-name"
              value={name}
              maxLength={LIMITS.name}
              onChange={(event) => {
                setName(event.target.value);
                setEdited((e) => ({ ...e, name: true }));
                if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
              }}
              placeholder="e.g. Motion"
              autoComplete="off"
              aria-invalid={Boolean(errors.name) || undefined}
              aria-describedby={errors.name ? "tool-name-error" : undefined}
              className={cx(fieldClass(Boolean(errors.name)), "h-[46px]")}
            />
            {errors.name && (
              <span id="tool-name-error" className="text-[13px] text-red-300">
                {errors.name}
              </span>
            )}
          </div>

          {/* Category */}
          <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <legend className="text-sm font-semibold">Category</legend>
              <div role="group" aria-label="Category mode" className="flex rounded-[10px] border border-rein-border p-[3px]">
                {(["existing", "new"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={categoryMode === mode}
                    disabled={mode === "existing" && categories.length === 0}
                    onClick={() => {
                      setCategoryMode(mode);
                      setErrors((e) => ({ ...e, category: undefined }));
                    }}
                    className={cx(
                      "h-[30px] rounded-[7px] px-3 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      categoryMode === mode ? "bg-rein-accent font-semibold text-black" : "text-rein-muted hover:text-white",
                    )}
                  >
                    {mode === "existing" ? "Existing" : "+ New category"}
                  </button>
                ))}
              </div>
            </div>

            {categoryMode === "existing" ? (
              <div role="radiogroup" aria-label="Choose a category" className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const checked = category.id === categoryId;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      onClick={() => {
                        setCategoryId(category.id);
                        setErrors((e) => ({ ...e, category: undefined }));
                      }}
                      className={cx(
                        "h-9 rounded-full border px-3.5 text-sm transition-colors",
                        checked
                          ? "border-rein-accent bg-rein-accent/20 font-semibold text-white"
                          : "border-rein-border bg-black text-rein-muted hover:border-rein-accent hover:text-white",
                      )}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-dashed border-rein-border-strong/70 p-4">
                <label htmlFor="new-category-name" className="text-[13px] text-rein-soft">
                  Category name
                </label>
                <input
                  id="new-category-name"
                  value={newCategoryName}
                  maxLength={LIMITS.category}
                  onChange={(event) => {
                    setNewCategoryName(event.target.value);
                    if (errors.category) setErrors((e) => ({ ...e, category: undefined }));
                  }}
                  placeholder="e.g. Animation Libraries"
                  autoComplete="off"
                  className={cx(fieldClass(Boolean(errors.category)), "h-11")}
                />
                <span className="text-[13px] text-rein-soft">Icon</span>
                <IconPicker value={newCategoryIcon} onChange={setNewCategoryIcon} rows={2} label="New category icon" />
              </div>
            )}
            {errors.category && <span className="text-[13px] text-red-300">{errors.category}</span>}
          </fieldset>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor="tool-description" className="text-sm font-semibold">
                Short description
              </label>
              <span className="font-mono text-[11px] text-rein-label">
                {canonical(description).length} / {LIMITS.description}
              </span>
            </div>
            <textarea
              id="tool-description"
              rows={3}
              value={description}
              maxLength={LIMITS.description}
              onChange={(event) => {
                setDescription(event.target.value);
                setEdited((e) => ({ ...e, description: true }));
                if (errors.description) setErrors((e) => ({ ...e, description: undefined }));
              }}
              placeholder="What is it for? e.g. Animation library for React with gestures."
              aria-invalid={Boolean(errors.description) || undefined}
              aria-describedby={errors.description ? "tool-description-error" : undefined}
              className={cx(fieldClass(Boolean(errors.description)), "resize-y py-3 leading-normal")}
            />
            {errors.description && (
              <span id="tool-description-error" className="text-[13px] text-red-300">
                {errors.description}
              </span>
            )}
          </div>

          {formError && (
            <p role="alert" className="m-0 text-sm text-red-300">
              {formError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rein-line bg-black/60 px-7 py-[18px]">
          {confirmDiscard ? (
            <span role="alert" className="text-sm text-amber-200">
              Discard this tool? Your changes will be lost.
            </span>
          ) : (
            <span className="font-mono text-[11px] tracking-[0.08em] text-rein-label">ESC TO CANCEL</span>
          )}
          <div className="flex gap-2.5">
            {confirmDiscard ? (
              <>
                <button type="button" onClick={() => setConfirmDiscard(false)} className={buttonStyles.outline}>
                  Keep editing
                </button>
                <button type="button" onClick={requestClose} className={buttonStyles.white}>
                  Discard
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={requestClose} className={buttonStyles.outline}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={cx(buttonStyles.primary, "disabled:cursor-wait disabled:opacity-70")}
                >
                  {saving ? "Saving…" : "Save tool"}
                </button>
              </>
            )}
          </div>
        </div>
      </form>
    </dialog>
  );
}
