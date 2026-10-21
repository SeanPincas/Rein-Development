import "server-only";

import { type ZodType } from "zod";

import { ApiError } from "@/lib/server/api-error";

const DEFAULT_MAX_JSON_BYTES = 32 * 1024;
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function parseInput<T>(value: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const fields: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_root";
    fields[key] ??= [];
    fields[key].push(issue.message);
  }
  throw ApiError.validation(fields);
}

export function assertSameOrigin(
  request: Request,
  applicationOrigin: string,
): void {
  if (!MUTATION_METHODS.has(request.method.toUpperCase())) {
    return;
  }

  const origin = request.headers.get("origin");

  if (!origin) {
    throw ApiError.originForbidden();
  }

  try {
    const requestOrigin = new URL(origin);

    if (
      requestOrigin.pathname !== "/" ||
      requestOrigin.search ||
      requestOrigin.hash ||
      requestOrigin.origin !== new URL(applicationOrigin).origin
    ) {
      throw ApiError.originForbidden();
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw ApiError.originForbidden();
  }
}

export function validateReturnPath(
  value: string | null | undefined,
  applicationOrigin: string,
  fallback = "/",
): string {
  if (!value) {
    return fallback;
  }

  if (value.startsWith("//") || value.includes("\\")) {
    throw ApiError.invalidRequest("Redirect destination is not allowed.");
  }

  try {
    const applicationUrl = new URL(applicationOrigin);
    const destination = new URL(value, applicationUrl);

    if (
      destination.origin !== applicationUrl.origin ||
      destination.username ||
      destination.password
    ) {
      throw ApiError.invalidRequest("Redirect destination is not allowed.");
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw ApiError.invalidRequest("Redirect destination is not allowed.");
  }
}

export async function parseJsonRequest<T>(
  request: Request,
  schema: ZodType<T>,
  options: { maxBytes?: number } = {},
): Promise<T> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.startsWith("application/json")) {
    throw ApiError.invalidRequest("Content-Type must be application/json.");
  }

  const maxBytes = options.maxBytes ?? DEFAULT_MAX_JSON_BYTES;
  const declaredLength = request.headers.get("content-length");

  if (declaredLength) {
    const length = Number(declaredLength);
    if (Number.isFinite(length) && length > maxBytes) {
      throw ApiError.invalidRequest("Request body is too large.");
    }
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    throw ApiError.invalidRequest("Request body is too large.");
  }

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    throw new ApiError({
      code: "INVALID_JSON",
      status: 400,
      message: "Request body must contain valid JSON.",
    });
  }

  return parseInput(value, schema);
}
