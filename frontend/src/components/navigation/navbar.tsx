import type { ReactNode } from "react";
import Link from "next/link";
import { HeaderAuthControls } from "@/components/auth/auth-controls";
import { ReinMark } from "@/components/brand/rein-mark";

export type NavLink = {
  href: string;
  label: string;
};

type NavbarProps = {
  /** In-page or route links shown in the centre. Omit for a logo + account bar. */
  links?: readonly NavLink[];
  /** Centre content (e.g. the library search). Replaces `links` when given. */
  children?: ReactNode;
  /** Extra controls shown before the account area (e.g. + Add Tool). */
  actions?: ReactNode;
};

/**
 * Site navbar with no background fill. Place it in <AppShell nav={...}>, which keeps it
 * pinned above a scroll area whose content fades out before reaching the bar.
 */
export function Navbar({ links = [], children, actions }: NavbarProps) {
  return (
    <header className="relative z-10 shrink-0">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-4 md:py-5">
        <Link href="/" className="flex items-center gap-2.5 text-white">
          <ReinMark size={36} />
          <span className="text-[22px] font-semibold tracking-[-0.03em]">Rein</span>
        </Link>

        {children ? (
          <div className="order-3 w-full md:order-none md:w-auto md:flex-1 md:px-6">{children}</div>
        ) : links.length > 0 && (
          <nav
            aria-label="Main"
            className="order-3 flex w-full flex-wrap gap-x-7 gap-y-2 text-[15px] md:order-none md:w-auto"
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-violet-300 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          {actions}
          <HeaderAuthControls />
        </div>
      </div>
    </header>
  );
}
