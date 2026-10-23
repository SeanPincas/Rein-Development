"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { ArrowRightStartOnRectangleIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { cx } from "@/lib/design";
import { AccountModal } from "./account-modal";

const PHONE_QUERY = "(max-width: 639px)";

function Avatar({ src, initial, className }: { src?: string; initial: string; className?: string }) {
  return (
    <span className={cx("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-600/25 font-bold text-violet-200", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- Clerk-hosted avatar.
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </span>
  );
}

/**
 * Navbar account menu (Rein's own, replacing Clerk's <UserButton>): avatar trigger →
 * dropdown on desktop, bottom sheet on phones, with the user, "Manage account"
 * (opens AccountModal) and "Sign out".
 */
export function AccountMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const name = user.fullName || user.username || "Your account";
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const initial = (user.firstName || email || "?").charAt(0).toUpperCase();
  const avatarSrc = user.hasImage ? user.imageUrl : undefined;

  const manage = () => {
    setOpen(false);
    setAccountOpen(true);
  };

  const doSignOut = async () => {
    setSigningOut(true);
    await signOut({ redirectUrl: "/" });
  };

  const itemClass =
    "flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left text-[15px] font-medium transition-colors focus:outline-none sm:py-2.5 sm:text-sm";

  const content = (
    <>
      <div className="flex items-center gap-3 border-b border-dashed border-rein-border px-4 pb-4 pt-4">
        <Avatar src={avatarSrc} initial={initial} className="size-11 text-lg ring-2 ring-rein-accent/40 ring-offset-2 ring-offset-[#0a0618]" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold text-white">{name}</span>
          {email && <span className="truncate font-mono text-[11px] tracking-[0.04em] text-rein-label">{email}</span>}
        </span>
      </div>
      <div className="flex flex-col gap-1 p-2">
        <button
          ref={firstItemRef}
          type="button"
          role="menuitem"
          onClick={manage}
          className={cx(itemClass, "text-white/90 hover:bg-violet-500/15 hover:text-white focus-visible:bg-violet-500/15")}
        >
          <Cog6ToothIcon aria-hidden="true" className="size-[18px] text-violet-300" />
          Manage account
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={doSignOut}
          disabled={signingOut}
          className={cx(itemClass, "text-white/90 hover:bg-red-500/10 hover:text-red-200 focus-visible:bg-red-500/10 disabled:opacity-60")}
        >
          <ArrowRightStartOnRectangleIcon aria-hidden="true" className="size-[18px] text-rein-label" />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rein-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <Avatar
          src={avatarSrc}
          initial={initial}
          className={cx(
            "size-8 text-sm ring-2 ring-offset-1 ring-offset-black transition-shadow sm:size-9 sm:ring-offset-2 min-[1200px]:size-10",
            open ? "ring-rein-accent" : "ring-rein-accent/40 hover:ring-rein-accent",
          )}
        />
      </button>

      {open && !phone && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[300px] overflow-hidden rounded-[18px] border border-rein-border-strong bg-[#0a0618] shadow-[0_24px_70px_rgb(0_0_0/0.65),0_0_60px_rgb(124_58_237/0.25)] origin-top-right transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] starting:scale-95 starting:opacity-0 motion-reduce:transition-none"
        >
          {content}
        </div>
      )}

      {open && phone && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm transition-opacity duration-200 starting:opacity-0"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            id={menuId}
            role="menu"
            aria-label="Account"
            className="w-full overflow-hidden rounded-t-[22px] border-t border-rein-border-strong bg-[#0a0618] pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-20px_60px_rgb(0_0_0/0.6)] transition-[translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] starting:translate-y-full motion-reduce:transition-none"
          >
            <span aria-hidden="true" className="mx-auto mt-2.5 block h-1 w-10 rounded-full bg-white/20" />
            {content}
          </div>
        </div>
      )}

      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}
