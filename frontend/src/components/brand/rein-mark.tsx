import type { CSSProperties } from "react";

type ReinMarkProps = {
  /** px number, or any CSS length (e.g. "1.667em" inside the wordmark). */
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** Accessible name. Omit when the mark sits next to visible "Rein" text. */
  title?: string;
};

/**
 * The Stepped R: three rising rails that become a sharp, chamfered R. The rails and
 * glyph carry class hooks (rein-rail-*, rein-glyph, rein-wave-*) that only animate
 * inside `.rein-wordmark` (see globals.css).
 */
export function ReinMark({ size = 36, className, style, title }: ReinMarkProps) {
  const labelled = Boolean(title);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={className}
      style={style}
      role={labelled ? "img" : undefined}
      aria-label={title}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
    >
      <g className="rein-wave rein-wave-1">
        <path className="rein-rail rein-rail-1" d="M21 78 V46 L27 40 V78 Z" fill="#A78BFA" fillOpacity={0.55} />
      </g>
      <g className="rein-wave rein-wave-2">
        <path className="rein-rail rein-rail-2" d="M31 78 V36 L37 30 V78 Z" fill="#A78BFA" />
      </g>
      <g className="rein-wave rein-wave-3">
        <path
          className="rein-glyph"
          fillRule="evenodd"
          d="M41 78 V26 L47 20 H65 L75 30 V43 L65 53 L78 78 H71 L58 53 H47 V78 Z M47 26 V47 H62 L69 40 V33 L62 26 Z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
}
