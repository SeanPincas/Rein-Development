import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk session handling only. Access checks live where the data is (Clerk's
 * resource-based auth): pages call `src/lib/server/page-guards.ts`, and private API
 * routes check the session and email-code state in the shared route handler.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
