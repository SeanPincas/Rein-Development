import "server-only";

import { ApiError } from "@/lib/server/api-error";

export type ApiLogEvent = {
  event: "api.request.completed" | "api.request.failed";
  requestId: string;
  method: string;
  pathname: string;
  status: number;
  durationMs: number;
  errorCode?: string;
  errorType?: string;
};

export type ApiLogger = {
  info: (event: ApiLogEvent) => void;
  error: (event: ApiLogEvent) => void;
};

export const consoleApiLogger: ApiLogger = {
  info: (event) => console.info(event),
  error: (event) => console.error(event),
};

export function createApiLogEvent(options: {
  request: Request;
  requestId: string;
  status: number;
  durationMs: number;
  error?: unknown;
}): ApiLogEvent {
  const { error } = options;
  const failed = options.status >= 400;

  return {
    event: failed ? "api.request.failed" : "api.request.completed",
    requestId: options.requestId,
    method: options.request.method.toUpperCase(),
    pathname: new URL(options.request.url).pathname,
    status: options.status,
    durationMs: Math.max(0, Math.round(options.durationMs)),
    ...(error instanceof ApiError ? { errorCode: error.code } : {}),
    ...(error && !(error instanceof ApiError)
      ? {
          errorType:
            error instanceof Error ? error.constructor.name : "UnknownError",
        }
      : {}),
  };
}
