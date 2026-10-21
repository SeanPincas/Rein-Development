import "server-only";

import { createRequestId } from "@/lib/server/api-error";

export function privateJsonResponse<T>(
  data: T,
  options: { status?: number; requestId?: string; meta?: unknown } = {},
): Response {
  const requestId = options.requestId ?? createRequestId();

  return Response.json(
    {
      data,
      ...(options.meta === undefined ? {} : { meta: options.meta }),
      requestId,
    },
    {
      status: options.status ?? 200,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Request-Id": requestId,
      },
    },
  );
}

export function noContentResponse(requestId = createRequestId()): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Request-Id": requestId,
    },
  });
}
