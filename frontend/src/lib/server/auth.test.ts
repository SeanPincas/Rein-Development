import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockGetToken } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetToken: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }));

import { requireAuthenticatedSession } from "./auth";

describe("requireAuthenticatedSession", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockGetToken.mockReset();
  });

  it("rejects a request without a verified Clerk user", async () => {
    mockAuth.mockResolvedValue({ userId: null, getToken: mockGetToken });

    await expect(requireAuthenticatedSession()).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
    });
  });

  it("returns the verified user and session token", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_clerk_one",
      getToken: mockGetToken,
    });
    mockGetToken.mockResolvedValue("session-token");

    const session = await requireAuthenticatedSession();

    expect(session.userId).toBe("user_clerk_one");
    await expect(session.getToken()).resolves.toBe("session-token");
  });

  it("rejects a session whose token is unavailable", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_clerk_one",
      getToken: mockGetToken,
    });
    mockGetToken.mockResolvedValue(null);

    const session = await requireAuthenticatedSession();

    await expect(session.getToken()).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
    });
  });
});
