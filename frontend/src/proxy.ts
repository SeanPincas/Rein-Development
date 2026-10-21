import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { EMAIL_VERIFIED_COOKIE, isValidVerifiedCookie } from "@/lib/server/email-verification";

/** Pages that need a signed-in session that has passed the email code. */
const isVerifiedPage = createRouteMatcher(["/library(.*)"]);
const isVerifyEmailPage = createRouteMatcher(["/verify-email(.*)"]);

/**
 * Page gate for the post-sign-in email code. Private API routes enforce the same
 * check in the shared route handler, so they return the standard error envelope.
 */
export default clerkMiddleware(async (auth, request) => {
  const verifiedPage = isVerifiedPage(request);
  const verifyPage = isVerifyEmailPage(request);
  if (!verifiedPage && !verifyPage) return;

  const { userId, sessionId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const verified = isValidVerifiedCookie(
    request.cookies.get(EMAIL_VERIFIED_COOKIE)?.value,
    userId,
    sessionId,
  );

  if (verifiedPage && !verified) {
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }
  if (verifyPage && verified) {
    return NextResponse.redirect(new URL("/library", request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
