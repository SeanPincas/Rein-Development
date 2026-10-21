import { LiquidBackdrop } from "@/components/design/liquid-backdrop";
import type { LiquidPresetName } from "@/lib/design";

/** Marbled purple liquid with blueprint grid lines on top. */
export function BlueprintBackdrop({ preset = "hero" }: { preset?: LiquidPresetName }) {
  return <LiquidBackdrop preset={preset} />;
}
