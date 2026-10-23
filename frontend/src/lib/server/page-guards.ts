import "server-only";

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { EMAIL_VERIFIED_COOKIE, isValidVerifiedCookie } from "@/lib/server/email-verification";

/**
 * Page-level access checks (Clerk's recommended resource-based auth): each protected
 * page calls one of these on the server before rendering. Private API routes do the
 * same checks in the shared route handler. Must run inside a <Suspense> boundary
 * (Cache Components): they read the request's session and cookies.
 */

/** Signed in? Redirects to /sign-in if not; returns whether the post-sign-in email code is done. */
async function emailVerified(): Promise<boolean> {
  // Request-time only: the cookie check compares against the current time (Date.now),
  // which Cache Components refuses to evaluate while prerendering.
  await connection();
  const { userId, sessionId } = await auth();
  if (!userId) redirect("/sign-in");
  const store = await cookies();
  return isValidVerifiedCookie(store.get(EMAIL_VERIFIED_COOKIE)?.value, userId, sessionId);
}

/** /library: signed in and email code done; otherwise /sign-in or /verify-email. */
export async function requireVerifiedSession(): Promise<void> {
  if (!(await emailVerified())) redirect("/verify-email");
}

/** /verify-email: signed in and still needs the code; already verified users go to /library. */
export async function requirePendingVerification(): Promise<void> {
  if (await emailVerified()) redirect("/library");
}
