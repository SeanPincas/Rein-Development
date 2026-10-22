"use client";

import { useEffect, useRef, useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { MobileAuthActions } from "@/components/auth/auth-controls";
import { ReinWordmark } from "@/components/brand/rein-wordmark";
import { eyebrow } from "@/components/ui/styles";
import type { NavLink } from "./navbar";

/**
 * Mobile navigation: a burger that opens a top sheet with the section links and
 * the account actions. Built on <dialog> for focus trapping, Esc and an inert page.
 */
export function MobileMenu({ links }: { links: readonly NavLink[] }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      dialog.close();
      triggerRef.current?.focus();
    }
  }, [open]);

  // Close if the viewport grows to the desktop layout while the sheet is open.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const onChange = () => desktop.matches && setOpen(false);
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex size-10 items-center justify-center rounded-lg border border-rein-border text-violet-200 transition-colors hover:border-rein-accent hover:text-white"
      >
        <Bars3Icon aria-hidden="true" className="size-5" />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Menu"
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        className="top-sheet fixed inset-x-0 top-0 bottom-auto m-0 h-fit max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-b-[20px] border-0 border-b border-rein-border-strong bg-[#07050f]/95 p-0 text-white shadow-[0_24px_80px_rgb(124_58_237/0.25)] backdrop-blur-md backdrop:bg-black/60"
      >
        <div className="flex flex-col gap-6 px-6 pb-7 pt-4">
          <div className="flex items-center justify-between">
            <ReinWordmark className="text-[22px]" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              autoFocus
              className="flex size-10 items-center justify-center rounded-lg border border-rein-border text-rein-soft hover:text-white"
            >
              <XMarkIcon aria-hidden="true" className="size-5" />
            </button>
          </div>

          <nav aria-label="Main" className="flex flex-col">
            <span className={`mb-2 ${eyebrow}`}>NAVIGATE</span>
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => {
                  // Close the sheet first, then scroll: the page is inert while the dialog is open.
                  if (!link.href.startsWith("#")) return setOpen(false);
                  event.preventDefault();
                  setOpen(false);
                  window.requestAnimationFrame(() => {
                    document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    history.replaceState(null, "", link.href);
                  });
                }}
                className="flex h-12 items-center justify-between border-b border-rein-line text-lg font-medium text-violet-100 transition-colors hover:text-white"
              >
                {link.label}
                <span aria-hidden="true" className="text-rein-label">→</span>
              </a>
            ))}
          </nav>

          <MobileAuthActions onNavigate={() => setOpen(false)} />
        </div>
      </dialog>
    </>
  );
}
