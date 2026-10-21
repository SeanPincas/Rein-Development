/** Drifting purple shadows. Pure CSS, GPU-friendly, paused for reduced-motion users. */
export function BlueprintBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="rein-glow rein-glow-1 -right-32 -top-40 h-[640px] w-[640px] bg-violet-600/40" />
      <div className="rein-glow rein-glow-2 -left-56 top-[900px] h-[560px] w-[560px] bg-violet-700/30" />
      <div className="rein-glow rein-glow-3 -bottom-32 right-[10%] h-[520px] w-[520px] bg-violet-500/25" />
    </div>
  );
}
