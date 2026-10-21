import { describe, expect, it } from "vitest";

import {
  EnvironmentConfigurationError,
  parseServerEnvironment,
} from "./env";

const validEnvironment = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
  CLERK_SECRET_KEY: "sk_test_example",
  APP_ORIGIN: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
};

describe("parseServerEnvironment", () => {
  it("accepts the required Clerk and Supabase settings", () => {
    expect(parseServerEnvironment(validEnvironment)).toEqual(validEnvironment);
  });

  it("reports every missing or invalid setting", () => {
    expect.assertions(2);

    try {
      parseServerEnvironment({ NEXT_PUBLIC_SUPABASE_URL: "not-a-url" });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentConfigurationError);
      expect((error as EnvironmentConfigurationError).issues).toMatchObject({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: expect.any(Array),
        CLERK_SECRET_KEY: expect.any(Array),
        APP_ORIGIN: expect.any(Array),
        NEXT_PUBLIC_SUPABASE_URL: expect.any(Array),
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: expect.any(Array),
      });
    }
  });

  it("canonicalizes the configured application origin", () => {
    expect(
      parseServerEnvironment({
        ...validEnvironment,
        APP_ORIGIN: "https://rein.example:443",
      }).APP_ORIGIN,
    ).toBe("https://rein.example");
  });

  it("rejects an origin containing a path", () => {
    expect(() =>
      parseServerEnvironment({
        ...validEnvironment,
        APP_ORIGIN: "https://rein.example/app",
      }),
    ).toThrow(EnvironmentConfigurationError);
  });
});
