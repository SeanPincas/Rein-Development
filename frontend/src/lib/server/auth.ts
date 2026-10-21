import "server-only";

import { auth } from "@clerk/nextjs/server";

import { ApiError } from "@/lib/server/api-error";

export type AuthenticatedSession = {
  userId: string;
  /** Clerk session ID (`sid`); email verification is bound to it. */
  sessionId: string | null;
  getToken: () => Promise<string>;
};

export async function requireAuthenticatedSession(): Promise<AuthenticatedSession> {
  const session = await auth();

  if (!session.userId) {
    throw ApiError.unauthenticated();
  }

  return {
    userId: session.userId,
    sessionId: session.sessionId ?? null,
    getToken: async () => {
      const token = await session.getToken();

      if (!token) {
        throw ApiError.unauthenticated();
      }

      return token;
    },
  };
}
