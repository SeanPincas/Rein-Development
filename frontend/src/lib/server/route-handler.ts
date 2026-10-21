import "server-only";

import { ApiError, createRequestId, toErrorResponse } from "@/lib/server/api-error";
import { getDatabaseContext, type DatabaseContext } from "@/lib/server/database";
import { isEmailVerifiedRequest } from "@/lib/server/email-verification";
import { getServerEnvironment } from "@/lib/server/env";
import {
  consoleApiLogger,
  createApiLogEvent,
  type ApiLogger,
} from "@/lib/server/logger";
import { assertSameOrigin } from "@/lib/server/request";

export type ApiRequestContext = {
  requestId: string;
};

export type AuthenticatedApiRequestContext = ApiRequestContext & DatabaseContext;

type Handler<TContext extends ApiRequestContext> = (
  context: TContext,
) => Promise<Response> | Response;

type RouteHandlerOptions = {
  applicationOrigin?: string;
  /**
   * Private routes require the post-sign-in email code by default. Only the
   * verification endpoints themselves opt out.
   */
  requireVerifiedEmail?: boolean;
  logger?: ApiLogger;
  now?: () => number;
};

function applyPrivateResponseHeaders(
  response: Response,
  requestId: string,
): Response {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Request-Id", requestId);
  return response;
}

export async function handleApiRequest(
  request: Request,
  handler: Handler<ApiRequestContext>,
  options: RouteHandlerOptions = {},
): Promise<Response> {
  const requestId = createRequestId();
  const logger = options.logger ?? consoleApiLogger;
  const now = options.now ?? performance.now.bind(performance);
  const startedAt = now();

  try {
    const applicationOrigin =
      options.applicationOrigin ?? getServerEnvironment().APP_ORIGIN;
    assertSameOrigin(request, applicationOrigin);

    const response = applyPrivateResponseHeaders(
      await handler({ requestId }),
      requestId,
    );

    logger.info(
      createApiLogEvent({
        request,
        requestId,
        status: response.status,
        durationMs: now() - startedAt,
      }),
    );

    return response;
  } catch (error) {
    const response = toErrorResponse(error, requestId);

    logger.error(
      createApiLogEvent({
        request,
        requestId,
        status: response.status,
        durationMs: now() - startedAt,
        error,
      }),
    );

    return response;
  }
}

export async function handleAuthenticatedApiRequest(
  request: Request,
  handler: Handler<AuthenticatedApiRequestContext>,
  options: RouteHandlerOptions = {},
): Promise<Response> {
  return handleApiRequest(
    request,
    async ({ requestId }) => {
      const databaseContext = await getDatabaseContext();

      if (
        options.requireVerifiedEmail !== false &&
        !isEmailVerifiedRequest(request, databaseContext.userId, databaseContext.sessionId)
      ) {
        throw ApiError.emailUnverified();
      }

      return handler({ requestId, ...databaseContext });
    },
    options,
  );
}
