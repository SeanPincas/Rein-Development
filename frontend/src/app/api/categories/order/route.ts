import { reorderCategories } from "@/lib/server/library";
import { parseJsonRequest } from "@/lib/server/request";
import { privateJsonResponse } from "@/lib/server/response";
import { handleAuthenticatedApiRequest } from "@/lib/server/route-handler";
import { reorderCategoriesSchema } from "@/lib/validation/library";

export async function PATCH(request: Request) {
  return handleAuthenticatedApiRequest(request, async ({ database, requestId }) => {
    const input = await parseJsonRequest(request, reorderCategoriesSchema);
    const result = await reorderCategories(database, input.items);
    return privateJsonResponse(result, { requestId });
  });
}
