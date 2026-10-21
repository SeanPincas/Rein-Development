import type { Metadata } from "next";
import Link from "next/link";
import { ReinMark } from "@/components/brand/rein-mark";

export const metadata: Metadata = { title: "Library" };

/** Placeholder until the library UI (bento grid, Add Tool) is built on GET /api/library. */
export default function LibraryPage() {
  return (
    <main className="blueprint-grid flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <ReinMark size={72} />
      <h1 className="m-0 text-4xl font-bold tracking-[-0.03em]">Your library is on its way</h1>
      <p className="m-0 max-w-md text-rein-muted">
        The bento library and Add Tool form are the next screens being built.
      </p>
      <Link href="/" className="text-violet-300 hover:text-white">
        ← Back to home
      </Link>
    </main>
  );
}
