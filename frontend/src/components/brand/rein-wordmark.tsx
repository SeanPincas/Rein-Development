import { cx } from "@/lib/design";
import { ReinMark } from "./rein-mark";

/*
 * Geometry (viewBox units of 96): the R's right edge is at x=78 and its feet at y=78.
 * Everything is in em of the "ein" text, so one font-size class scales the whole mark.
 */
const MARK_EM = 1 / 0.6; // mark is 1.667× the text size
const FOOT_GAP = (96 - 78) / 96; // empty space under/right of the R, as a share of the mark
const TUCK = 0.165; // pull "ein" left so it sits ~1px from the R's leg

/**
 * "Rein" wordmark: the Stepped R doubles as the capital, followed by "ein" tucked
 * against its leg on the same baseline. Plays an entrance (rails rise, the R settles,
 * "ein" slides out from behind it) and a rail ripple on hover. Set the size with a
 * text-size class. Screen readers hear "Rein".
 */
export function ReinWordmark({ className }: { className?: string }) {
  return (
    <span className={cx("rein-wordmark inline-block whitespace-nowrap font-medium leading-none tracking-[-0.03em] text-white", className)}>
      <ReinMark
        size={`${MARK_EM}em`}
        className="inline overflow-visible"
        // Inline layout: an SVG sits on the text baseline by its bottom edge, so lowering it
        // by the space under the R's feet puts the R and "ein" on one baseline.
        style={{ verticalAlign: `${-FOOT_GAP * MARK_EM}em` }}
      />
      <span aria-hidden="true" className="rein-ein" style={{ marginLeft: `${-TUCK * MARK_EM}em` }}>
        ein
      </span>
      <span className="sr-only">Rein</span>
    </span>
  );
}
