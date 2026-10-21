import "server-only";

export type ApiErrorCode =
  | "INVALID_JSON"
  | "INVALID_REQUEST"
  | "UNAUTHENTICATED"
  | "ORIGIN_FORBIDDEN"
  | "NOT_FOUND"
  | "DUPLICATE_CATEGORY"
  | "DUPLICATE_TOOL_URL"
  | "STALE_VERSION"
  | "CATEGORY_NOT_EMPTY"
  | "VALIDATION_ERROR"
  | "UNSAFE_URL"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

type FieldErrors = Record<string, string[]>;
type ErrorDetails = Record<string, string | number | boolean | null>;

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fields?: FieldErrors;
  readonly details?: ErrorDetails;

  constructor(options: {
    code: ApiErrorCode;
    status: number;
    message: string;
    fields?: FieldErrors;
    details?: ErrorDetails;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.fields = options.fields;
    this.details = options.details;
  }

  static unauthenticated(): ApiError {
    return new ApiError({
      code: "UNAUTHENTICATED",
      status: 401,
      message: "Sign in to continue.",
    });
  }

  static invalidRequest(message: string): ApiError {
    return new ApiError({ code: "INVALID_REQUEST", status: 400, message });
  }

  static unsafeUrl(): ApiError {
    return new ApiError({
      code: "UNSAFE_URL",
      status: 422,
      message: "This URL cannot be fetched safely.",
    });
  }

  static rateLimited(retryAfterSeconds = 60): ApiError {
    return new ApiError({
      code: "RATE_LIMITED",
      status: 429,
      message: "Too many metadata requests. Try again shortly.",
      details: { retryAfterSeconds },
    });
  }

  static originForbidden(): ApiError {
    return new ApiError({
      code: "ORIGIN_FORBIDDEN",
      status: 403,
      message: "This request origin is not allowed.",
    });
  }

  static notFound(resource = "Item"): ApiError {
    return new ApiError({
      code: "NOT_FOUND",
      status: 404,
      message: `${resource} was not found.`,
    });
  }

  static staleVersion(): ApiError {
    return new ApiError({
      code: "STALE_VERSION",
      status: 409,
      message: "This item changed elsewhere. Refresh it and try again.",
    });
  }

  static duplicateCategory(): ApiError {
    return new ApiError({
      code: "DUPLICATE_CATEGORY",
      status: 409,
      message: "This category already exists.",
    });
  }

  static duplicateToolUrl(): ApiError {
    return new ApiError({
      code: "DUPLICATE_TOOL_URL",
      status: 409,
      message: "This URL is already in your library.",
    });
  }

  static categoryNotEmpty(): ApiError {
    return new ApiError({
      code: "CATEGORY_NOT_EMPTY",
      status: 409,
      message: "Choose another category for the saved tools.",
    });
  }

  static serviceUnavailable(): ApiError {
    return new ApiError({
      code: "SERVICE_UNAVAILABLE",
      status: 503,
      message: "The library is temporarily unavailable. Try again.",
    });
  }

  static validation(fields: FieldErrors): ApiError {
    return new ApiError({
      code: "VALIDATION_ERROR",
      status: 422,
      message: "Some fields need attention.",
      fields,
    });
  }
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function toErrorResponse(
  error: unknown,
  requestId = createRequestId(),
): Response {
  const apiError =
    error instanceof ApiError
      ? error
      : new ApiError({
          code: "INTERNAL_ERROR",
          status: 500,
          message: "An unexpected error occurred.",
        });

  return Response.json(
    {
      error: {
        code: apiError.code,
        message: apiError.message,
        ...(apiError.fields ? { fields: apiError.fields } : {}),
        ...(apiError.details ? { details: apiError.details } : {}),
      },
      requestId,
    },
    {
      status: apiError.status,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Request-Id": requestId,
        ...(apiError.code === "RATE_LIMITED" && apiError.details?.retryAfterSeconds
          ? { "Retry-After": String(apiError.details.retryAfterSeconds) }
          : {}),
      },
    },
  );
}
