import { consumeMetadataRateLimit } from "@/lib/server/metadata-rate-limit";
import { discoverMetadata } from "@/lib/server/metadata";
import { parseJsonRequest } from "@/lib/server/request";
import { privateJsonResponse } from "@/lib/server/response";
import { handleAuthenticatedApiRequest } from "@/lib/server/route-handler";
import { metadataRequestSchema } from "@/lib/validation/metadata";

export async function POST(request: Request) {
  return handleAuthenticatedApiRequest(request, async ({ database, requestId, userId }) => {
    await consumeMetadataRateLimit(database, request);
    const input = await parseJsonRequest(request, metadataRequestSchema);
    const metadata = await discoverMetadata(userId, input.url);
    return privateJsonResponse({ metadata }, { requestId });
  });
}
