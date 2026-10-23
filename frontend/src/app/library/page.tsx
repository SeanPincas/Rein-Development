import type { Metadata } from "next";
import { Suspense } from "react";
import { LibraryView } from "@/components/library/library-view";
import { requireVerifiedSession } from "@/lib/server/page-guards";

export const metadata: Metadata = { title: "Library" };

/** Signed-in, email-verified users only: checked on the server before rendering. */
async function VerifiedLibrary() {
  await requireVerifiedSession();
  return <LibraryView />;
}

export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <VerifiedLibrary />
    </Suspense>
  );
}
