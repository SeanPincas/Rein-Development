import { getLibrary } from "@/lib/server/library";
import { privateJsonResponse } from "@/lib/server/response";
import { handleAuthenticatedApiRequest } from "@/lib/server/route-handler";

export async function GET(request: Request) {
  return handleAuthenticatedApiRequest(request, async ({ database, requestId }) => {
    const library = await getLibrary(database);
    return privateJsonResponse(
      { categories: library.categories },
      { meta: library.meta, requestId },
    );
  });
}
