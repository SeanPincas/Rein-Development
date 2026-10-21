import type { Metadata } from "next";
import { LibraryView } from "@/components/library/library-view";

export const metadata: Metadata = { title: "Library" };

/** Signed-in, email-verified users only — proxy.ts redirects everyone else. */
export default function LibraryPage() {
  return <LibraryView />;
}
