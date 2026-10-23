import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { requirePendingVerification } from "@/lib/server/page-guards";

export const metadata: Metadata = { title: "Verify your email" };

/** Signed-in users who still need the code: checked on the server before rendering. */
async function PendingVerification() {
  await requirePendingVerification();
  return <VerifyEmailContent />;
}

/** Mandatory after every sign-in and sign-up. */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <PendingVerification />
    </Suspense>
  );
}

function VerifyEmailContent() {
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
