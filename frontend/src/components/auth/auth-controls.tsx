"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { buttonStyles } from "@/components/ui/styles";
import { AccountMenu } from "./account-menu";

/** Navbar account area: links to the auth pages when signed out, library + account menu when signed in. */
export function HeaderAuthControls() {
  const { isLoaded, isSignedIn } = useAuth();
  const onLibrary = usePathname()?.startsWith("/library");

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        {!onLibrary && (
          <Link href="/library" className={buttonStyles.navQuiet}>
            Open library
          </Link>
        )}
        {/* Rein's own avatar menu + Account modal (Clerk's UserProfile is embedded for logins/security). */}
        <AccountMenu />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link href="/sign-in" className={buttonStyles.navQuiet}>
        Sign in
      </Link>
      <Link href="/sign-up" className={buttonStyles.navPrimary}>
        Get started
      </Link>
    </div>
  );
}

/** Main call to action: register when signed out, open the library when signed in. */
export function StartLibraryButton({ tone = "primary" }: { tone?: "primary" | "white" }) {
  const { isLoaded, isSignedIn } = useAuth();
  const signedIn = isLoaded && isSignedIn;

  return (
    <Link href={signedIn ? "/library" : "/sign-up"} className={buttonStyles[tone]}>
      {signedIn ? "Open your library" : "Start your library"} <span aria-hidden="true">→</span>
    </Link>
  );
}

/** Full-width account actions for the mobile top sheet. */
export function MobileAuthActions({ onNavigate }: { onNavigate?: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return (
      // Sign out instead of <UserButton>: its popover would open behind the modal sheet.
      <div className="flex flex-col gap-3">
        <Link href="/library" onClick={onNavigate} className={`${buttonStyles.primary} justify-center`}>
          Open library <span aria-hidden="true">→</span>
        </Link>
        <SignOutButton redirectUrl="/">
          <button type="button" className={`${buttonStyles.outline} justify-center`}>
            Sign out
          </button>
        </SignOutButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Link href="/sign-up" onClick={onNavigate} className={`${buttonStyles.primary} justify-center`}>
        Get started
      </Link>
      <Link href="/sign-in" onClick={onNavigate} className={`${buttonStyles.outline} justify-center`}>
        Sign in
      </Link>
    </div>
  );
}
