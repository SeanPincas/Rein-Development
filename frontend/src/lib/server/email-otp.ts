import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { clerkClient } from "@clerk/nextjs/server";

import { ApiError } from "@/lib/server/api-error";
import { createBrevoEmailSender, type TransactionalEmailSender } from "@/lib/server/brevo";
import { EMAIL_OTP, generateOtpCode, hashOtpCode, maskEmail } from "@/lib/server/email-verification";

export type OtpState = {
  sentTo: string;
  expiresAt: string | null;
  resendAvailableAt: string | null;
  attemptsRemaining: number;
  expired: boolean;
  pending: boolean;
};

type IssueResult =
  | { issued: true; expiresAt: string; resendAvailableAt: string; attemptsRemaining: number }
  | { issued: false; reason: "cooldown" | "rate_limited"; retryAfterSeconds: number };

type VerifyResult =
  | { status: "verified" }
  | { status: "invalid"; attemptsRemaining: number }
  | { status: "locked"; attemptsRemaining: 0 }
  | { status: "expired" }
  | { status: "missing" };

type StatusResult =
  | { pending: false }
  | { pending: true; expired: boolean; expiresAt: string; resendAvailableAt: string; attemptsRemaining: number };

function requireSession(sessionId: string | null): string {
  if (!sessionId) throw ApiError.unauthenticated();
  return sessionId;
}

export async function primaryEmailFor(userId: string): Promise<string> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (!email) throw ApiError.invalidRequest("This account has no email address.");
  return email;
}

function otpEmail(code: string) {
  const minutes = EMAIL_OTP.ttlSeconds / 60;
  return {
    subject: `${code} is your Rein verification code`,
    textContent: `Your Rein verification code is ${code}.\n\nIt expires in ${minutes} minutes and can be used once. If you didn't just sign in to Rein, you can ignore this email.`,
    htmlContent: `<!doctype html><html><body style="margin:0;background:#000;font-family:Arial,sans-serif;color:#fff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;border:1px solid #6d4fc2;background:#07050f;padding:32px">
<tr><td style="font-size:12px;letter-spacing:2px;color:#a59bd0">REIN · EMAIL VERIFICATION</td></tr>
<tr><td style="padding-top:16px;font-size:22px;font-weight:bold">Your verification code</td></tr>
<tr><td style="padding:24px 0;font-size:36px;font-weight:bold;letter-spacing:10px;color:#a78bfa;font-family:'Courier New',monospace">${code}</td></tr>
<tr><td style="font-size:14px;line-height:1.6;color:#cfc8ee">It expires in ${minutes} minutes and can be used once. If you didn't just sign in to Rein, you can ignore this email.</td></tr>
</table></td></tr></table></body></html>`,
  };
}

/** Issue a fresh code for the current session and email it. The code is never returned. */
export async function sendEmailOtp(
  database: SupabaseClient,
  userId: string,
  sessionId: string | null,
  sender: TransactionalEmailSender = createBrevoEmailSender(),
): Promise<OtpState> {
  const session = requireSession(sessionId);
  const email = await primaryEmailFor(userId);
  const code = generateOtpCode();

  const { data, error } = await database.rpc("issue_email_otp", {
    p_code_hash: hashOtpCode(userId, session, code),
  });
  if (error || !data) throw ApiError.serviceUnavailable();

  const result = data as IssueResult;
  if (!result.issued) {
    throw ApiError.rateLimited(
      result.retryAfterSeconds,
      result.reason === "cooldown"
        ? "Wait a moment before requesting another code."
        : "Too many codes requested. Try again later.",
    );
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!senderEmail) throw ApiError.serviceUnavailable();

  try {
    await sender.sendTransacEmail({
      ...otpEmail(code),
      sender: { name: process.env.BREVO_SENDER_NAME?.trim() || "Rein", email: senderEmail },
      to: [{ email }],
    });
  } catch {
    throw ApiError.serviceUnavailable();
  }

  return {
    sentTo: maskEmail(email),
    expiresAt: result.expiresAt,
    resendAvailableAt: result.resendAvailableAt,
    attemptsRemaining: result.attemptsRemaining,
    expired: false,
    pending: true,
  };
}

/** Check a submitted code. Resolves on success, throws a typed ApiError otherwise. */
export async function verifyEmailOtp(
  database: SupabaseClient,
  userId: string,
  sessionId: string | null,
  code: string,
): Promise<void> {
  const session = requireSession(sessionId);
  const { data, error } = await database.rpc("verify_email_otp", {
    p_code_hash: hashOtpCode(userId, session, code),
  });
  if (error || !data) throw ApiError.serviceUnavailable();

  const result = data as VerifyResult;
  switch (result.status) {
    case "verified":
      return;
    case "invalid":
      throw ApiError.invalidCode(result.attemptsRemaining);
    case "locked":
      throw ApiError.tooManyAttempts();
    case "expired":
    case "missing":
      throw ApiError.codeExpired();
  }
}

export async function emailOtpStatus(
  database: SupabaseClient,
  userId: string,
  sessionId: string | null,
): Promise<OtpState> {
  requireSession(sessionId);
  const [{ data, error }, email] = await Promise.all([
    database.rpc("email_otp_status"),
    primaryEmailFor(userId),
  ]);
  if (error || !data) throw ApiError.serviceUnavailable();

  const result = data as StatusResult;
  if (!result.pending) {
    return { sentTo: maskEmail(email), pending: false, expired: false, expiresAt: null, resendAvailableAt: null, attemptsRemaining: EMAIL_OTP.maxAttempts };
  }
  return {
    sentTo: maskEmail(email),
    pending: true,
    expired: result.expired,
    expiresAt: result.expiresAt,
    resendAvailableAt: result.resendAvailableAt,
    attemptsRemaining: result.attemptsRemaining,
  };
}
