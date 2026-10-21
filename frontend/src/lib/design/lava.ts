/**
 * Lava-lamp backdrop utilities.
 *
 * Blobs are soft purple shapes that (1) morph their outline with a CSS border-radius
 * animation so they never read as a perfect circle, and (2) wander to random positions
 * on a timer, each move eased by a CSS transition. Only `transform` and `border-radius`
 * change, so the browser composites the motion cheaply.
 */

export type LavaBlob = {
  /** Fill colour; keep alpha high, the blur and blend mode soften it. */
  color: string;
  /** Diameter in vmax so blobs scale with the screen. */
  size: number;
  /** Anchor position as a percentage of the backdrop. */
  left: number;
  top: number;
  /** Blur radius in px. Lower keeps the liquid outline visible; higher is mistier. */
  blur?: number;
  opacity?: number;
  /** Seconds for one full shape morph. */
  morphSeconds?: number;
};

export type WanderRange = {
  /** Max horizontal drift from the anchor, in vw. */
  x: number;
  /** Max vertical drift from the anchor, in vh. */
  y: number;
  scale: readonly [min: number, max: number];
  rotate: number;
  /** Seconds each move takes. */
  duration: readonly [min: number, max: number];
};

export type LavaPreset = {
  blobs: readonly LavaBlob[];
  wander: WanderRange;
};

export type WanderStep = {
  transform: string;
  durationMs: number;
};

export const reinPurples = {
  violet: "rgb(124 58 237)",
  deep: "rgb(91 33 182)",
  indigo: "rgb(109 40 217)",
  lilac: "rgb(139 92 246)",
  orchid: "rgb(168 85 247)",
} as const;

const defaultWander: WanderRange = {
  x: 28,
  y: 22,
  scale: [0.75, 1.3],
  rotate: 45,
  duration: [9, 18],
};

export const lavaPresets = {
  /** Full-strength backdrop for the landing page. */
  hero: {
    blobs: [
      { color: reinPurples.violet, size: 46, left: 68, top: -12, opacity: 0.55, morphSeconds: 14 },
      { color: reinPurples.deep, size: 40, left: -12, top: 48, opacity: 0.5, morphSeconds: 18 },
      { color: reinPurples.lilac, size: 32, left: 52, top: 66, opacity: 0.4, morphSeconds: 12 },
      { color: reinPurples.orchid, size: 24, left: 24, top: 8, opacity: 0.32, morphSeconds: 16 },
    ],
    wander: defaultWander,
  },
  /** Quieter backdrop for forms and working screens (auth, library). */
  subtle: {
    blobs: [
      { color: reinPurples.violet, size: 40, left: 66, top: -10, opacity: 0.4, morphSeconds: 16 },
      { color: reinPurples.deep, size: 34, left: -10, top: 56, opacity: 0.35, morphSeconds: 20 },
      { color: reinPurples.lilac, size: 26, left: 48, top: 72, opacity: 0.28, morphSeconds: 14 },
    ],
    wander: { ...defaultWander, x: 20, y: 16 },
  },
} satisfies Record<string, LavaPreset>;

export type LavaPresetName = keyof typeof lavaPresets;

export const randomBetween = (min: number, max: number, random: () => number = Math.random) =>
  min + (max - min) * random();

/** Next random destination for one blob. Pass `random` for deterministic tests. */
export function nextWanderStep(range: WanderRange, random: () => number = Math.random): WanderStep {
  const x = randomBetween(-range.x, range.x, random).toFixed(2);
  const y = randomBetween(-range.y, range.y, random).toFixed(2);
  const scale = randomBetween(range.scale[0], range.scale[1], random).toFixed(3);
  const rotate = randomBetween(-range.rotate, range.rotate, random).toFixed(1);
  const seconds = randomBetween(range.duration[0], range.duration[1], random);

  return {
    transform: `translate3d(${x}vw, ${y}vh, 0) scale(${scale}) rotate(${rotate}deg)`,
    durationMs: Math.round(seconds * 1000),
  };
}

/** Inline style for a blob's resting state (server-rendered, no randomness). */
export function blobStyle(blob: LavaBlob, index: number) {
  return {
    width: `${blob.size}vmax`,
    height: `${blob.size}vmax`,
    left: `${blob.left}%`,
    top: `${blob.top}%`,
    background: blob.color,
    opacity: blob.opacity ?? 0.45,
    filter: `blur(${blob.blur ?? 56}px)`,
    animationDuration: `${blob.morphSeconds ?? 15}s`,
    // Offset each blob so the shapes never morph in sync.
    animationDelay: `${index * -3.5}s`,
  } as const;
}
