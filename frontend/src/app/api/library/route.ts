import { getLibrary } from "@/lib/server/library";
import { privateJsonResponse } from "@/lib/server/response";
import { handleAuthenticatedApiRequest } from "@/lib/server/route-handler";
import { withStarterCategories } from "@/lib/server/starter-categories";

export async function GET(request: Request) {
  return handleAuthenticatedApiRequest(request, async ({ database, requestId, userId }) => {
    const library = await withStarterCategories(database, userId, await getLibrary(database));
    return privateJsonResponse(
      { categories: library.categories },
      { meta: library.meta, requestId },
    );
  });
}
