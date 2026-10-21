import { deleteCategory, updateCategory } from "@/lib/server/library";
import { parseInput, parseJsonRequest } from "@/lib/server/request";
import { noContentResponse, privateJsonResponse } from "@/lib/server/response";
import { handleAuthenticatedApiRequest } from "@/lib/server/route-handler";
import {
  deleteCategoryQuerySchema,
  idSchema,
  updateCategorySchema,
} from "@/lib/validation/library";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return handleAuthenticatedApiRequest(request, async ({ database, requestId }) => {
    const id = parseInput((await context.params).id, idSchema);
    const input = await parseJsonRequest(request, updateCategorySchema);
    const category = await updateCategory(database, id, input);
    return privateJsonResponse({ category }, { requestId });
  });
}

export async function DELETE(request: Request, context: Context) {
  return handleAuthenticatedApiRequest(request, async ({ database, requestId }) => {
    const id = parseInput((await context.params).id, idSchema);
    const query = parseInput(
      Object.fromEntries(new URL(request.url).searchParams),
      deleteCategoryQuerySchema,
    );
    await deleteCategory(database, id, query.version, query.reassignTo);
    return noContentResponse(requestId);
  });
}
