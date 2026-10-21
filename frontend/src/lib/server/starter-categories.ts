import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { clerkClient } from "@clerk/nextjs/server";

import { getLibrary, type LibraryResponse } from "@/lib/server/library";
import type { CategoryIconKey } from "@/lib/shared/icon-library";

/** The six default containers every new library starts with. */
export const STARTER_CATEGORIES: ReadonlyArray<{ name: string; iconKey: CategoryIconKey }> = [
  { name: "Developer Tools", iconKey: "developer-tools" },
  { name: "UI & Design", iconKey: "design" },
  { name: "Deployment", iconKey: "deployment" },
  { name: "Databases", iconKey: "databases" },
  { name: "AI Agents", iconKey: "ai-agents" },
  { name: "Courses & Learning", iconKey: "courses" },
];

const SEEDED_FLAG = "starterCategoriesSeeded";

/**
 * Give an empty library its starter categories, once per account. The "seeded"
 * flag lives in the user's Clerk private metadata (server-only), so a user who
 * later deletes every category is not re-seeded.
 */
export async function withStarterCategories(
  database: SupabaseClient,
  userId: string,
  library: LibraryResponse,
): Promise<LibraryResponse> {
  if (library.categories.length > 0) return library;

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  if (user.privateMetadata?.[SEEDED_FLAG] === true) return library;

  const { error } = await database
    .from("categories")
    .insert(STARTER_CATEGORIES.map(({ name, iconKey }) => ({ name, icon_key: iconKey })));

  // 23505 = a concurrent request already inserted them; anything else, show the empty library.
  if (error && error.code !== "23505") {
    console.warn(JSON.stringify({ event: "library.starter_categories.failed", code: error.code ?? "unknown" }));
    return library;
  }

  try {
    await clerk.users.updateUserMetadata(userId, { privateMetadata: { [SEEDED_FLAG]: true } });
  } catch {
    // Seeding worked; at worst a user who empties their library gets the starters once more.
  }

  return getLibrary(database);
}
