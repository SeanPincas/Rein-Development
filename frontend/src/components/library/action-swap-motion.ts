import { cx } from "@/lib/design";

/**
 * Motion for the "⋮ swaps for Edit/Delete" pattern (category card + tool row).
 * Tailwind v4 `scale-*`, `translate-*` and `rotate-*` set the individual CSS
 * `scale`/`translate`/`rotate` properties, so those (not `transform`) are transitioned.
 */
// Colours are listed too: these buttons also carry hover colours.
const motion = "transition-[opacity,scale,translate,rotate,color,background-color] motion-reduce:transition-none";
// Enter with a slight overshoot ("pop"); leave fast so the ⋮ can come back.
const enter = "duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]";
const exit = "duration-150 ease-in";

/** Layer holding ⋮ (and the category count): fades out at once, back in after the actions leave. */
export const triggerLayerMotion = (open: boolean) =>
  cx(
    "transition-opacity motion-reduce:transition-none",
    open ? "pointer-events-none opacity-0 duration-150" : "opacity-100 duration-200 delay-100",
  );

/** The ⋮ button itself spins a quarter turn and shrinks away. */
export const triggerIconMotion = (open: boolean) =>
  cx(motion, open ? cx(exit, "rotate-90 scale-50") : cx(enter, "delay-100 rotate-0 scale-100"));

/**
 * One action button. `from` is where it hides (toward the ⋮); `delay` staggers the
 * entrance. Pass literal Tailwind classes so they're generated.
 */
export const actionMotion = (open: boolean, from: string, delay = "") =>
  cx(motion, open ? cx(enter, delay, "translate-x-0 translate-y-0 scale-100 opacity-100") : cx(exit, from, "scale-50 opacity-0"));
