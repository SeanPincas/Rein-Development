/** Shared class names so buttons and panels stay consistent across the app. */
export const buttonStyles = {
  primary:
    "inline-flex h-11 items-center gap-2 rounded-[10px] bg-rein-accent px-5 text-[15px] font-semibold text-black transition-colors hover:bg-violet-300",
  white:
    "inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-5 text-[15px] font-semibold text-black transition-colors hover:bg-violet-100",
  outline:
    "inline-flex h-11 items-center gap-2 rounded-[10px] border border-white/30 px-5 text-[15px] font-medium text-white transition-colors hover:border-white",
  navPrimary:
    "inline-flex h-10 items-center rounded-lg bg-rein-accent px-4 text-sm font-semibold text-black transition-colors hover:bg-violet-300",
  navQuiet:
    "inline-flex h-10 items-center px-3 text-sm text-white transition-colors hover:text-violet-300",
} as const;

export const panel = "border border-rein-border bg-rein-surface";
export const eyebrow = "font-mono text-[11px] tracking-[0.12em] text-rein-label";
export const sectionTitle = "m-0 text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-[40px]";
