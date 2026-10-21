import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  requireAuthenticatedSession,
  type AuthenticatedSession,
} from "@/lib/server/auth";
import { getServerEnvironment } from "@/lib/server/env";

export type DatabaseContext = {
  userId: string;
  database: SupabaseClient;
};

export function createUserDatabaseClient(
  session: Pick<AuthenticatedSession, "getToken">,
): SupabaseClient {
  const environment = getServerEnvironment();

  return createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      accessToken: session.getToken,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

export async function getDatabaseContext(): Promise<DatabaseContext> {
  const session = await requireAuthenticatedSession();

  return {
    userId: session.userId,
    database: createUserDatabaseClient(session),
  };
}
