import { createCategory } from "@/lib/server/library";
import { parseJsonRequest } from "@/lib/server/request";
import { privateJsonResponse } from "@/lib/server/response";
import { handleAuthenticatedApiRequest } from "@/lib/server/route-handler";
import { createCategorySchema } from "@/lib/validation/library";

export async function POST(request: Request) {
  return handleAuthenticatedApiRequest(request, async ({ database, requestId }) => {
    const input = await parseJsonRequest(request, createCategorySchema);
    const category = await createCategory(database, input);
    return privateJsonResponse({ category }, { status: 201, requestId });
  });
}
