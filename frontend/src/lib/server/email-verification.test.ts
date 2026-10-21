import { describe, expect, it } from "vitest";

import {
  EMAIL_VERIFIED_COOKIE,
  createVerifiedCookieValue,
  generateOtpCode,
  hashOtpCode,
  isEmailVerifiedRequest,
  isOtpCodeFormat,
  isValidVerifiedCookie,
  maskEmail,
  verifiedCookieHeader,
} from "./email-verification";

const secret = "test-secret";

describe("OTP codes", () => {
  it("are always six digits", () => {
    for (let i = 0; i < 500; i += 1) expect(isOtpCodeFormat(generateOtpCode())).toBe(true);
  });

  it("hash to 64-char hex bound to user, session and code", () => {
    const base = hashOtpCode("user_a", "sess_a", "123456", secret);
    expect(base).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOtpCode("user_a", "sess_a", "123456", secret)).toBe(base);
    expect(hashOtpCode("user_b", "sess_a", "123456", secret)).not.toBe(base);
    expect(hashOtpCode("user_a", "sess_b", "123456", secret)).not.toBe(base);
    expect(hashOtpCode("user_a", "sess_a", "123457", secret)).not.toBe(base);
    expect(hashOtpCode("user_a", "sess_a", "123456", "other-secret")).not.toBe(base);
  });
});

describe("verified cookie", () => {
  const now = 1_800_000_000;
  const value = createVerifiedCookieValue("user_a", "sess_a", now, secret);

  it("accepts the same user across sessions before expiry", () => {
    expect(isValidVerifiedCookie(value, "user_a", "sess_a", now + 60, secret)).toBe(true);
    expect(isValidVerifiedCookie(value, "user_a", "sess_b", now + 60, secret)).toBe(true);
  });

  it("rejects another user, expiry and tampering", () => {
    expect(isValidVerifiedCookie(value, "user_b", "sess_a", now, secret)).toBe(false);
    expect(isValidVerifiedCookie(value, "user_a", "sess_a", now + 60 * 60 * 24 * 8, secret)).toBe(false);
    expect(isValidVerifiedCookie(`${value}x`, "user_a", "sess_a", now, secret)).toBe(false);
    expect(isValidVerifiedCookie(value.replace(/\.\d+\./, `.${now + 999_999}.`), "user_a", "sess_a", now, secret)).toBe(false);
    expect(isValidVerifiedCookie(undefined, "user_a", "sess_a", now, secret)).toBe(false);
    expect(isValidVerifiedCookie(value, "user_a", null, now, secret)).toBe(true);
  });

  it("is HttpOnly and SameSite=Lax", () => {
    const header = verifiedCookieHeader("v", true);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Secure");
    expect(verifiedCookieHeader("v", false)).not.toContain("Secure");
  });

  it("is read from the request cookie header", () => {
    process.env.EMAIL_OTP_SECRET = secret;
    const fresh = createVerifiedCookieValue("user_a", "sess_a");
    const request = new Request("https://rein.example/api/library", {
      headers: { cookie: `other=1; ${EMAIL_VERIFIED_COOKIE}=${fresh}` },
    });
    expect(isEmailVerifiedRequest(request, "user_a", "sess_a")).toBe(true);
    expect(isEmailVerifiedRequest(request, "user_a", "sess_other")).toBe(true);
    delete process.env.EMAIL_OTP_SECRET;
  });
});

describe("maskEmail", () => {
  it("hides most of the local part", () => {
    expect(maskEmail("sean@example.com")).toBe("se••@example.com");
    expect(maskEmail("a@example.com")).toBe("a••@example.com");
  });
});
