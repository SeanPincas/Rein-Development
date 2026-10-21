import { createTool } from "@/lib/server/library";
import { parseJsonRequest } from "@/lib/server/request";
import { privateJsonResponse } from "@/lib/server/response";
import { handleAuthenticatedApiRequest } from "@/lib/server/route-handler";
import { createToolSchema } from "@/lib/validation/library";

export async function POST(request: Request) {
  return handleAuthenticatedApiRequest(request, async ({ database, requestId, userId }) => {
    const input = await parseJsonRequest(request, createToolSchema);
    const result = await createTool(database, input, userId);
    return privateJsonResponse(result, { status: 201, requestId });
  });
}
