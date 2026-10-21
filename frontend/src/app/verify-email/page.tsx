import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export const metadata: Metadata = { title: "Verify your email" };

/** Mandatory after every sign-in and sign-up; proxy.ts gates access to it and to /library. */
export default function VerifyEmailPage() {
  return (
    <AuthShell
      sheet="VERIFY / SHEET V.01"
      heading="Check your email."
      description="One more step. Enter the six-digit code we just sent to finish signing in and open your library."
    >
      <VerifyEmailForm />
    </AuthShell>
  );
}
