/**
 * Cursor grid glow: a brighter copy of the blueprint grid (major + minor lines)
 * revealed through a radial mask that follows the pointer. Position is written to
 * CSS custom properties once per animation frame, so React never re-renders.
 *
 * CSS lives in globals.css (`.blueprint-lines-glow`). Framework-agnostic: call
 * `trackGridGlow(element)` on any element with that class and keep the cleanup.
 */

export type GridGlowOptions = {
  /** Radius of the lit circle in px. */
  radius?: number;
  /** Line colours inside the circle. */
  majorColor?: string;
  minorColor?: string;
  /** Element whose pointer movement drives the glow (default: window). */
  target?: Window | HTMLElement;
};

export const gridGlowPresets = {
  default: { radius: 200, majorColor: "rgb(196 181 253 / 0.7)", minorColor: "rgb(196 181 253 / 0.35)" },
  soft: { radius: 160, majorColor: "rgb(167 139 250 / 0.5)", minorColor: "rgb(167 139 250 / 0.22)" },
} satisfies Record<string, Required<Omit<GridGlowOptions, "target">>>;

export type GridGlowPresetName = keyof typeof gridGlowPresets;

/** Static CSS variables for a glow layer's radius and colours. */
export function gridGlowVariables(options: Omit<GridGlowOptions, "target"> = {}) {
  const preset = { ...gridGlowPresets.default, ...options };
  return {
    "--glow-radius": `${preset.radius}px`,
    "--glow-major": preset.majorColor,
    "--glow-minor": preset.minorColor,
  } as Record<string, string>;
}

/** Follow the pointer and light the grid under it. Returns a cleanup function. */
export function trackGridGlow(element: HTMLElement, options: GridGlowOptions = {}): () => void {
  const target = options.target ?? window;
  let frame = 0;
  let x = 0;
  let y = 0;

  const paint = () => {
    frame = 0;
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--glow-x", `${x - rect.left}px`);
    element.style.setProperty("--glow-y", `${y - rect.top}px`);
    element.style.setProperty("--glow-opacity", "1");
  };

  const onMove = (event: Event) => {
    const pointer = event as PointerEvent;
    // Touch has no hover; skip so taps don't leave a stuck glow.
    if (pointer.pointerType === "touch") return;
    x = pointer.clientX;
    y = pointer.clientY;
    if (!frame) frame = requestAnimationFrame(paint);
  };

  const hide = () => element.style.setProperty("--glow-opacity", "0");
  const onLeave = (event: Event) => {
    if (!(event as PointerEvent).relatedTarget) hide();
  };

  target.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerout", onLeave);
  window.addEventListener("blur", hide);

  return () => {
    if (frame) cancelAnimationFrame(frame);
    target.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerout", onLeave);
    window.removeEventListener("blur", hide);
  };
}
