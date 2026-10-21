/** Shared class names so buttons and panels stay consistent across the landing page. */
export const buttonStyles = {
  primary:
    "inline-flex h-[52px] items-center gap-2 rounded-xl bg-rein-accent px-6 text-base font-semibold text-black transition-colors hover:bg-violet-300",
  white:
    "inline-flex h-[52px] items-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-black transition-colors hover:bg-violet-100",
  outline:
    "inline-flex h-[52px] items-center rounded-xl border border-white/40 px-6 text-base font-medium text-white transition-colors hover:border-white",
  navPrimary:
    "inline-flex h-11 items-center rounded-[10px] bg-rein-accent px-[18px] text-[15px] font-semibold text-black transition-colors hover:bg-violet-300",
  navQuiet:
    "inline-flex h-11 items-center px-4 text-[15px] text-white transition-colors hover:text-violet-300",
} as const;

export const panel = "border border-rein-border bg-rein-surface";
export const eyebrow = "font-mono text-[11px] tracking-[0.12em] text-rein-label";
export const sectionTitle = "m-0 text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-[40px]";
