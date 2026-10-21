// Server code only (reads server secrets). No "server-only" import because proxy.ts uses it too.
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Post-sign-in email verification.
 *
 * - Codes: six random digits, generated and hashed on the server. The database
 *   stores only an HMAC keyed with a server secret, bound to the Clerk user and
 *   session, so the code itself never leaves the server except in the email.
 * - Verified state: a signed, HttpOnly cookie bound to the user and browser.
 *   It lasts seven days, so signing out and back in during that period does
 *   not require another code on the same browser.
 */

export const EMAIL_OTP = {
  length: 6,
  ttlSeconds: 600,
  resendCooldownSeconds: 60,
  maxAttempts: 5,
  hourlySendLimit: 5,
} as const;

export const EMAIL_VERIFIED_COOKIE = "rein_email_verified";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const COOKIE_VERSION = "v2";

function verificationSecret(): string {
  const secret = process.env.EMAIL_OTP_SECRET?.trim() || process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) throw new Error("EMAIL_OTP_SECRET or CLERK_SECRET_KEY is required for email verification.");
  return secret;
}

function hmac(purpose: string, value: string, secret = verificationSecret()): Buffer {
  return createHmac("sha256", `${purpose}:${secret}`).update(value).digest();
}

export function generateOtpCode(): string {
  return randomInt(0, 10 ** EMAIL_OTP.length).toString().padStart(EMAIL_OTP.length, "0");
}

export const isOtpCodeFormat = (value: string) => /^\d{6}$/.test(value);

/** 64-char hex HMAC of a code, bound to one user and one session. */
export function hashOtpCode(userId: string, sessionId: string, code: string, secret?: string): string {
  return hmac("email-otp", `${COOKIE_VERSION}|${userId}|${sessionId}|${code}`, secret).toString("hex");
}

/** "sean@example.com" -> "se••@example.com" for display. */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${visible}${"•".repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

export function createVerifiedCookieValue(
  userId: string,
  _sessionId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  secret?: string,
): string {
  const expires = nowSeconds + COOKIE_MAX_AGE_SECONDS;
  const signature = hmac("email-verified", `${COOKIE_VERSION}|${userId}|${expires}`, secret).toString("base64url");
  return `${COOKIE_VERSION}.${expires}.${signature}`;
}

export function isValidVerifiedCookie(
  value: string | undefined,
  userId: string,
  _sessionId: string | null,
  nowSeconds = Math.floor(Date.now() / 1000),
  secret?: string,
): boolean {
  if (!value) return false;
  const [version, expiresText, signature] = value.split(".");
  const expires = Number(expiresText);
  if (version !== COOKIE_VERSION || !Number.isInteger(expires) || expires <= nowSeconds || !signature) return false;

  const expected = hmac("email-verified", `${COOKIE_VERSION}|${userId}|${expires}`, secret);
  const provided = Buffer.from(signature, "base64url");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function isEmailVerifiedRequest(request: Request, userId: string, sessionId: string | null): boolean {
  return isValidVerifiedCookie(readCookie(request, EMAIL_VERIFIED_COOKIE), userId, sessionId);
}

export function verifiedCookieHeader(value: string, secure: boolean): string {
  return [
    `${EMAIL_VERIFIED_COOKIE}=${value}`,
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}
