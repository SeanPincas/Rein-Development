import type { ReactNode } from "react";
import { BlueprintBackdrop } from "@/components/landing/blueprint-backdrop";
import { blueprint, cx, type LiquidPresetName } from "@/lib/design";

type AppShellProps = {
  /** Usually <Navbar />. Stays put; it has no fill of its own. */
  nav: ReactNode;
  children: ReactNode;
  backdrop?: LiquidPresetName;
  className?: string;
};

/**
 * Full-height frame: animated backdrop behind everything, navbar on top, and a
 * scroll area below it. Only the scroll area moves, and its top edge fades, so
 * page content never overlaps the navbar.
 */
export function AppShell({ nav, children, backdrop = "hero", className }: AppShellProps) {
  return (
    <div className={blueprint.shell}>
      <BlueprintBackdrop preset={backdrop} />
      {nav}
      <div id="content" className={cx(blueprint.scrollArea, className)}>
        {children}
      </div>
    </div>
  );
}
