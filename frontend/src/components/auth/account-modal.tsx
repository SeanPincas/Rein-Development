"use client";

import { useEffect, useId, useRef, useState, type ComponentType, type SVGProps } from "react";
import { UserProfile } from "@clerk/nextjs";
import { EnvelopeIcon, ShieldCheckIcon, UserCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { eyebrow } from "@/components/ui/styles";
import { cx } from "@/lib/design";
import { ProfilePanel } from "./profile-panel";

type Tab = "profile" | "logins" | "security";

const TABS: { id: Tab; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: "profile", label: "Profile", icon: UserCircleIcon },
  { id: "logins", label: "Emails & logins", icon: EnvelopeIcon },
  { id: "security", label: "Security", icon: ShieldCheckIcon },
];

/** Clerk's <UserProfile routing="hash"> follows the URL hash: "#/" = its account page, "#/security" = security. */
const clerkHash = (tab: Exclude<Tab, "profile">) => (tab === "security" ? "#/security" : "#/");

/** Point Clerk's hash router at a page without adding Back-button history entries. */
function showClerkPage(tab: Exclude<Tab, "profile">) {
  window.location.replace(clerkHash(tab));
}

function clearHash() {
  if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

/**
 * Account settings (Rein's own modal): desktop is a two-pane panel, phones get a
 * full-screen sheet with tabs. "Profile" is ours (photo + name); "Emails & logins"
 * and "Security" embed Clerk's real <UserProfile> pages (verification, passwords,
 * devices, account deletion) with Clerk's own nav and profile card hidden.
 *
 * Deliberately not a top-layer <dialog>: Clerk opens its own re-verification modal
 * for sensitive actions, and that must be able to appear above this one.
 */
export function AccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("profile");

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      clearHash();
    };
  }, [open]);

  if (!open) return null;

  const select = (next: Tab) => {
    if (next !== "profile") showClerkPage(next);
    setTab(next);
  };

  const close = () => {
    setTab("profile");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !event.defaultPrevented) {
            event.stopPropagation();
            close();
          }
        }}
        className={cx(
          "relative flex h-dvh w-full flex-col overflow-hidden bg-[#07050f] text-white focus:outline-none",
          "sm:h-[min(700px,calc(100dvh-32px))] sm:w-[min(980px,calc(100vw-32px))] sm:flex-row sm:rounded-[22px] sm:border sm:border-rein-border-strong sm:shadow-[0_0_120px_rgb(124_58_237/0.3)]",
          "transition-[opacity,scale] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] starting:scale-95 starting:opacity-0 motion-reduce:transition-none",
        )}
      >
        {/* Nav: sidebar on desktop, title + segmented tabs on phones. */}
        <nav
          aria-label="Account sections"
          className="flex shrink-0 flex-col gap-4 border-b border-dashed border-rein-border bg-black/60 px-4 pb-3 pt-5 sm:w-[240px] sm:gap-6 sm:border-b-0 sm:border-r sm:px-5 sm:py-7"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className={cx("m-0", eyebrow)}>SETTINGS</p>
              <h1 id={titleId} className="m-0 text-[24px] font-bold tracking-[-0.02em]">
                Account
              </h1>
              <p className="m-0 hidden text-[13px] text-rein-soft sm:block">Manage your profile and sign-in.</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close account settings"
              className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-rein-border text-rein-soft hover:text-white sm:hidden"
            >
              <XMarkIcon aria-hidden="true" className="size-[18px]" />
            </button>
          </div>
          <div className="flex gap-1 overflow-x-auto sm:flex-col">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => select(id)}
                  className={cx(
                    "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-rein-accent/15 text-white" : "text-rein-muted hover:bg-violet-500/10 hover:text-white",
                  )}
                >
                  <Icon aria-hidden="true" className={cx("size-[18px]", active ? "text-violet-300" : "text-rein-label")} />
                  {label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-9 sm:py-9">
          <button
            type="button"
            onClick={close}
            aria-label="Close account settings"
            className="absolute right-4 top-4 hidden size-10 items-center justify-center rounded-[10px] text-rein-soft hover:bg-white/5 hover:text-white sm:flex"
          >
            <XMarkIcon aria-hidden="true" className="size-[18px]" />
          </button>
          {tab === "profile" ? <ProfilePanel /> : <UserProfile key={tab} routing="hash" />}
        </div>
      </div>
    </div>
  );
}
