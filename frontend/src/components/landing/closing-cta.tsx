import { StartLibraryButton } from "@/components/auth/auth-controls";
import { ReinMark } from "@/components/brand/rein-mark";

export function ClosingCta() {
  return (
    <section
      aria-labelledby="cta-title"
      className="flex flex-wrap items-center justify-between gap-6 border border-rein-accent bg-rein-surface-strong p-8"
    >
      <div className="flex flex-wrap items-center gap-5">
        <ReinMark size={56} />
        <div className="flex flex-col gap-1">
          <h2 id="cta-title" className="m-0 text-[26px] font-bold tracking-[-0.02em]">
            Stop hunting through bookmarks.
          </h2>
          <p className="m-0 text-base text-rein-muted">Save it once. Find it anywhere.</p>
        </div>
      </div>
      <StartLibraryButton tone="white" />
    </section>
  );
}
