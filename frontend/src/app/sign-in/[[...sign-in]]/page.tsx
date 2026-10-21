import type { Metadata } from "next";
import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthShell
      sheet="LOGIN / SHEET L.01"
      heading="Welcome back."
      description="Sign in to open your toolkit right where you left it."
    >
      <Suspense fallback={null}>
        <SignIn path="/sign-in" signUpUrl="/sign-up" />
      </Suspense>
    </AuthShell>
  );
}
