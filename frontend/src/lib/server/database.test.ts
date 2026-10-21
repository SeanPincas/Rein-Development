import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateClient, mockGetServerEnvironment } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockGetServerEnvironment: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mockCreateClient }));
vi.mock("@/lib/server/env", () => ({
  getServerEnvironment: mockGetServerEnvironment,
}));
vi.mock("@/lib/server/auth", () => ({
  requireAuthenticatedSession: vi.fn(),
}));

import { createUserDatabaseClient } from "./database";

describe("createUserDatabaseClient", () => {
  beforeEach(() => {
    mockCreateClient.mockReset();
    mockGetServerEnvironment.mockReset();
    mockGetServerEnvironment.mockReturnValue({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    });
    mockCreateClient.mockReturnValue({ client: true });
  });

  it("injects the verified Clerk token into a non-persistent client", async () => {
    const getToken = vi.fn().mockResolvedValue("clerk-session-token");

    expect(createUserDatabaseClient({ getToken })).toEqual({ client: true });
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "publishable-key",
      expect.objectContaining({
        accessToken: getToken,
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }),
    );

    const options = mockCreateClient.mock.calls[0]?.[2];
    await expect(options.accessToken()).resolves.toBe("clerk-session-token");
  });
});
