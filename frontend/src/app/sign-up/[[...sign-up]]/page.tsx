import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <AuthShell
      sheet="REGISTER / SHEET R.01"
      heading="Start your library."
      description="Create an account to save your tools once and find them in any browser, on any device."
    >
      <Suspense fallback={null}>
        <SignUp path="/sign-up" signInUrl="/sign-in" />
      </Suspense>
    </AuthShell>
  );
}
