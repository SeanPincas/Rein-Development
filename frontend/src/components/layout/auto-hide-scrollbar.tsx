"use client";

import { useEffect } from "react";

const IDLE_AFTER_MS = 1200;
/** Pointer this close to the scroll area's right edge reveals the bar, so it can be grabbed. */
const EDGE_PX = 24;

/**
 * Fades out the scrollbar of `#<targetId>` while the page isn't scrolling: marks it
 * `.scroll-autohide` and toggles `.scroll-idle` (both styled in globals.css). Scrolling, or moving the pointer to the
 * scrollbar edge, shows it again; it hides once both stop for IDLE_AFTER_MS.
 */
export function AutoHideScrollbar({ targetId }: { targetId: string }) {
  useEffect(() => {
    const element = document.getElementById(targetId);
    if (!element) return;
    let timer = 0;
    let nearEdge = false;

    const hideLater = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!nearEdge) element.classList.add("scroll-idle");
      }, IDLE_AFTER_MS);
    };
    const show = () => {
      element.classList.remove("scroll-idle");
      hideLater();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = element.getBoundingClientRect();
      const wasNear = nearEdge;
      nearEdge = event.clientX >= rect.right - EDGE_PX && event.clientX <= rect.right;
      if (nearEdge && !wasNear) show();
      else if (!nearEdge && wasNear) hideLater();
    };
    const onPointerLeave = () => {
      nearEdge = false;
      hideLater();
    };

    element.classList.add("scroll-autohide", "scroll-idle");
    element.addEventListener("scroll", show, { passive: true });
    element.addEventListener("pointermove", onPointerMove, { passive: true });
    element.addEventListener("pointerleave", onPointerLeave);
    return () => {
      window.clearTimeout(timer);
      element.classList.remove("scroll-autohide", "scroll-idle");
      element.removeEventListener("scroll", show);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [targetId]);

  return null;
}
