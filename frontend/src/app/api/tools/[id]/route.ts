import { deleteTool, updateTool } from "@/lib/server/library";
import { parseInput, parseJsonRequest } from "@/lib/server/request";
import { noContentResponse, privateJsonResponse } from "@/lib/server/response";
import { handleAuthenticatedApiRequest } from "@/lib/server/route-handler";
import {
  deleteToolQuerySchema,
  idSchema,
  updateToolSchema,
} from "@/lib/validation/library";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return handleAuthenticatedApiRequest(request, async ({ database, requestId, userId }) => {
    const id = parseInput((await context.params).id, idSchema);
    const input = await parseJsonRequest(request, updateToolSchema);
    const tool = await updateTool(database, id, input, userId);
    return privateJsonResponse({ tool }, { requestId });
  });
}

export async function DELETE(request: Request, context: Context) {
  return handleAuthenticatedApiRequest(request, async ({ database, requestId }) => {
    const id = parseInput((await context.params).id, idSchema);
    const query = parseInput(
      Object.fromEntries(new URL(request.url).searchParams),
      deleteToolQuerySchema,
    );
    await deleteTool(database, id, query.version);
    return noContentResponse(requestId);
  });
}
