"use client";

import { useRef, useState, type FormEvent } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { cx } from "@/lib/design";
import { AvatarCropDialog } from "./avatar-crop-dialog";

const ACCEPT = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAX_BYTES = 10 * 1000 * 1000;

const fieldClass =
  "h-11 w-full rounded-[10px] border border-rein-border bg-black px-3.5 text-[15px] text-white placeholder:text-[#8e86b5] focus:border-rein-accent focus:outline-none focus:ring-2 focus:ring-rein-accent/40 disabled:opacity-60";

/**
 * Account → Profile (Rein's own UI): clickable photo with a camera badge that goes
 * through the crop step, first/last name stacked beside it, Cancel/Save below.
 * Uses Clerk's `user.setProfileImage` and `user.update`.
 */
export function ProfilePanel() {
  const { user, isLoaded } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  // Name drafts start from the saved values; `null` = untouched.
  const [firstDraft, setFirstDraft] = useState<string | null>(null);
  const [lastDraft, setLastDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  if (!isLoaded || !user) return null;

  const savedFirst = user.firstName ?? "";
  const savedLast = user.lastName ?? "";
  const first = firstDraft ?? savedFirst;
  const last = lastDraft ?? savedLast;
  const dirty = first.trim() !== savedFirst || last.trim() !== savedLast;
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const initial = (savedFirst || email || "?").charAt(0).toUpperCase();

  const choose = (file: File | undefined) => {
    setPhotoError(null);
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return setPhotoError("Choose a PNG, JPG, WebP or GIF image.");
    if (file.size > MAX_BYTES) return setPhotoError("That image is over 10 MB. Choose a smaller one.");
    setCropFile(file);
  };

  const removePhoto = async () => {
    setRemoving(true);
    setPhotoError(null);
    try {
      await user.setProfileImage({ file: null });
      toast.success("Profile photo removed");
    } catch {
      setPhotoError("The photo couldn't be removed. Try again.");
    } finally {
      setRemoving(false);
    }
  };

  const reset = () => {
    setFirstDraft(null);
    setLastDraft(null);
    setNameError(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty) return;
    setSaving(true);
    setNameError(null);
    try {
      await user.update({ firstName: first.trim(), lastName: last.trim() });
      reset();
      toast.success("Profile updated");
    } catch {
      setNameError("Your name couldn't be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[24px] font-bold tracking-[-0.02em] sm:text-[26px]">Profile</h2>
        <p className="m-0 text-[14px] text-rein-soft">Your photo and name, as shown in Rein.</p>
      </div>

      <form
        onSubmit={save}
        className="grid grid-cols-1 gap-x-7 gap-y-5 rounded-[18px] border border-rein-border-strong bg-black/30 p-5 min-[520px]:grid-cols-[auto_minmax(0,1fr)] sm:p-6"
      >
        {/* Photo: the whole circle opens the file picker → crop step. */}
        <div className="flex flex-col items-center gap-2 justify-self-center min-[520px]:justify-self-start">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Change profile photo"
            className="group relative size-26 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rein-accent focus-visible:ring-offset-4 focus-visible:ring-offset-[#07050f]"
          >
            <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-violet-600/20 text-4xl font-bold text-violet-200 ring-2 ring-rein-accent/40 ring-offset-2 ring-offset-[#07050f]">
              {user.hasImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- Clerk-hosted avatar.
                <img src={user.imageUrl} alt="" className="size-full object-cover" />
              ) : (
                <span aria-hidden="true">{initial}</span>
              )}
            </span>
            <span aria-hidden="true" className="absolute inset-0 rounded-full bg-black/0 transition-colors group-hover:bg-black/35" />
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -right-0.5 flex size-[34px] items-center justify-center rounded-full border-[3px] border-[#07050f] bg-[#7c3aed] text-white transition-[background-color,scale] group-hover:scale-105 group-hover:bg-[#8b5cf6]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-[17px]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
            </span>
          </button>
          {user.hasImage && (
            <button
              type="button"
              onClick={removePhoto}
              disabled={removing}
              className="rounded-md px-1.5 text-xs font-medium text-red-300 hover:text-red-200 disabled:opacity-50"
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          )}
          {photoError && (
            <p role="alert" className="m-0 max-w-[180px] text-center text-xs text-red-300">
              {photoError}
            </p>
          )}
        </div>

        {/* Names, stacked. */}
        <div className="flex min-w-0 flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">First name</span>
            <input
              value={first}
              onChange={(event) => setFirstDraft(event.target.value)}
              autoComplete="given-name"
              maxLength={60}
              disabled={saving}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Last name</span>
            <input
              value={last}
              onChange={(event) => setLastDraft(event.target.value)}
              autoComplete="family-name"
              maxLength={60}
              disabled={saving}
              className={fieldClass}
            />
          </label>
          {email && (
            <p className="m-0 font-mono text-[11px] tracking-[0.04em] text-rein-label">
              Signed in as <span className="text-violet-200">{email}</span>
            </p>
          )}
          {nameError && (
            <p role="alert" className="m-0 text-sm text-red-300">
              {nameError}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2.5 min-[520px]:col-span-2">
          <button
            type="button"
            onClick={reset}
            disabled={!dirty || saving}
            className="inline-flex h-10 items-center rounded-[10px] px-4 text-sm font-medium text-rein-soft transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!dirty || saving}
            className={cx(
              "inline-flex h-10 items-center rounded-[10px] bg-rein-accent px-5 text-sm font-semibold text-black transition-colors hover:bg-violet-300",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {cropFile && (
        <AvatarCropDialog
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={async (blob) => {
            await user.setProfileImage({ file: blob });
            setCropFile(null);
            toast.success("Profile photo updated");
          }}
        />
      )}
    </div>
  );
}
