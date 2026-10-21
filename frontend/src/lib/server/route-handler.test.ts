import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error";

const { mockGetDatabaseContext } = vi.hoisted(() => ({
  mockGetDatabaseContext: vi.fn(),
}));

vi.mock("@/lib/server/database", () => ({
  getDatabaseContext: mockGetDatabaseContext,
}));

import {
  handleApiRequest,
  handleAuthenticatedApiRequest,
} from "./route-handler";

function createLogger() {
  return { info: vi.fn(), error: vi.fn() };
}

describe("route handlers", () => {
  beforeEach(() => {
    mockGetDatabaseContext.mockReset();
  });

  it("adds private headers and logs no query string", async () => {
    const logger = createLogger();
    const response = await handleApiRequest(
      new Request("https://rein.example/api/library?token=secret"),
      () => Response.json({ ok: true }),
      {
        applicationOrigin: "https://rein.example",
        logger,
        now: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(14),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "api.request.completed",
        pathname: "/api/library",
        status: 200,
        durationMs: 4,
      }),
    );
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain("secret");
  });

  it("rejects a cross-origin mutation before running its handler", async () => {
    const logger = createLogger();
    const handler = vi.fn(() => Response.json({ ok: true }));
    const response = await handleApiRequest(
      new Request("https://rein.example/api/tools", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
      }),
      handler,
      { applicationOrigin: "https://rein.example", logger },
    );

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "ORIGIN_FORBIDDEN", status: 403 }),
    );
  });

  it("does not log unexpected error messages", async () => {
    const logger = createLogger();
    const response = await handleApiRequest(
      new Request("https://rein.example/api/library"),
      () => {
        throw new Error("private description and ?token=secret");
      },
      { applicationOrigin: "https://rein.example", logger },
    );

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ errorType: "Error", status: 500 }),
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
      "private description",
    );
  });

  it("maps an unauthenticated database context consistently", async () => {
    const logger = createLogger();
    mockGetDatabaseContext.mockRejectedValue(ApiError.unauthenticated());

    const response = await handleAuthenticatedApiRequest(
      new Request("https://rein.example/api/library"),
      () => Response.json({ ok: true }),
      { applicationOrigin: "https://rein.example", logger },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("refuses a signed-in but unverified session on private routes", async () => {
    const logger = createLogger();
    const handler = vi.fn(() => Response.json({ ok: true }));
    mockGetDatabaseContext.mockResolvedValue({ userId: "user_a", sessionId: "sess_a", database: {} });

    const response = await handleAuthenticatedApiRequest(
      new Request("https://rein.example/api/library"),
      handler,
      { applicationOrigin: "https://rein.example", logger },
    );

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ error: { code: "EMAIL_UNVERIFIED" } });
  });

  it("lets verification endpoints run before the email is verified", async () => {
    const logger = createLogger();
    mockGetDatabaseContext.mockResolvedValue({ userId: "user_a", sessionId: "sess_a", database: {} });

    const response = await handleAuthenticatedApiRequest(
      new Request("https://rein.example/api/verification/email/status"),
      () => Response.json({ ok: true }),
      { applicationOrigin: "https://rein.example", logger, requireVerifiedEmail: false },
    );

    expect(response.status).toBe(200);
  });
});
