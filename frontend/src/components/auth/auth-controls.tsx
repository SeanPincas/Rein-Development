"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { buttonStyles } from "@/components/ui/styles";

/** Navbar account area: links to the auth pages when signed out, library + account menu when signed in. */
export function HeaderAuthControls() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/library" className={buttonStyles.navQuiet}>
          Open library
        </Link>
        <UserButton />
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
