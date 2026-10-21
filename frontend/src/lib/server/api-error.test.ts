import { describe, expect, it } from "vitest";

import { ApiError, toErrorResponse } from "./api-error";

describe("toErrorResponse", () => {
  it("serializes an expected API error", async () => {
    const response = toErrorResponse(
      ApiError.validation({ name: ["Name is required."] }),
      "request-1",
    );

    expect(response.status).toBe(422);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Some fields need attention.",
        fields: { name: ["Name is required."] },
      },
      requestId: "request-1",
    });
  });

  it("does not expose unexpected error details", async () => {
    const response = toErrorResponse(new Error("database password"), "request-2");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toEqual({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
    });
    expect(JSON.stringify(body)).not.toContain("database password");
  });

  it("serializes rate limiting with a retry hint", async () => {
    const response = toErrorResponse(ApiError.rateLimited(37), "request-3");

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("37");
    expect(await response.json()).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Too many metadata requests. Try again shortly.",
        details: { retryAfterSeconds: 37 },
      },
      requestId: "request-3",
    });
  });
});
