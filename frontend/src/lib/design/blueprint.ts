/** Blueprint surface helpers shared by pages and components. */

/** Join class names, skipping falsy values. */
export const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const blueprint = {
  /** 96px major / 24px minor purple grid on black (defined in globals.css). */
  grid: "blueprint-grid",
  /** Fine 16px grid for small illustrations. */
  gridFine: "blueprint-grid-fine",
  /** Page root: grid background, own stacking context, clips glows without breaking sticky children. */
  page: "blueprint-grid relative isolate min-h-screen overflow-clip",
  /** Full-height app frame: fixed navbar row on top, scrolling content below. */
  shell: "relative isolate flex h-dvh flex-col overflow-hidden bg-rein-bg",
  /** Scroll area whose content fades out at its top edge (see .scroll-fade in globals.css). */
  scrollArea: "scroll-fade min-h-0 flex-1 overflow-y-auto overscroll-contain motion-safe:scroll-smooth",
} as const;
