import type { ReactNode } from "react";
import Link from "next/link";
import { ReinMark } from "@/components/brand/rein-mark";
import { BlueprintBackdrop } from "@/components/landing/blueprint-backdrop";
import { eyebrow } from "@/components/ui/styles";

type AuthShellProps = {
  sheet: string;
  heading: string;
  description: string;
  children: ReactNode;
};

/** Blueprint frame shared by the sign-in and sign-up pages. */
export function AuthShell({ sheet, heading, description, children }: AuthShellProps) {
  return (
    <div className="blueprint-grid relative isolate flex min-h-screen flex-col overflow-clip">
      <BlueprintBackdrop preset="subtle" />
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 pb-10">
        <header className="flex items-center justify-between border-b border-rein-line py-5">
          <Link href="/" className="flex items-center gap-2.5 text-white">
            <ReinMark size={36} />
            <span className="text-[22px] font-semibold tracking-[-0.03em]">Rein</span>
          </Link>
          <Link href="/" className="text-[15px] text-violet-300 transition-colors hover:text-white">
            ← Back to home
          </Link>
        </header>

        <main className="flex flex-1 flex-wrap items-center justify-center gap-x-20 gap-y-10 py-12">
          <div className="flex max-w-[420px] min-w-0 flex-[1_1_320px] flex-col gap-5">
            <p className={`m-0 ${eyebrow}`}>{sheet}</p>
            <h1 className="m-0 text-[clamp(36px,5vw,56px)] font-bold leading-none tracking-[-0.04em]">
              {heading}
            </h1>
            <p className="m-0 text-lg leading-relaxed text-rein-muted">{description}</p>
          </div>
          <div className="flex min-w-0 flex-[0_1_440px] justify-center">{children}</div>
        </main>
      </div>
    </div>
  );
}
