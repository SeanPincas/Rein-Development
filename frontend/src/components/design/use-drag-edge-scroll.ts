"use client";

import { useEffect } from "react";
import { edgeScrollSpeed } from "@/lib/design/edge-scroll";

/**
 * While `active`, scrolls the page's scroll area (#content) when a native drag is
 * held near its top or bottom edge, so a card can be carried past what's on screen.
 * Browsers only auto-scroll the window, not inner scroll areas, during drag-and-drop.
 */
export function useDragEdgeScroll(active: boolean, targetId = "content") {
  useEffect(() => {
    if (!active) return;
    const element = document.getElementById(targetId);
    if (!element) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let pointerY: number | null = null;
    let frame = 0;

    const tick = () => {
      frame = 0;
      if (pointerY === null) return;
      const rect = element.getBoundingClientRect();
      const speed = edgeScrollSpeed(pointerY, rect, reduceMotion ? { maxSpeed: 10 } : undefined);
      if (speed === 0) return;
      const before = element.scrollTop;
      element.scrollTop += speed;
      // Keep going while the pointer rests in the zone, until the end is reached.
      if (element.scrollTop !== before) frame = requestAnimationFrame(tick);
    };

    const onDragOver = (event: DragEvent) => {
      // Some browsers report 0,0 on the final dragover; ignore it.
      if (event.clientX === 0 && event.clientY === 0) return;
      pointerY = event.clientY;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    document.addEventListener("dragover", onDragOver);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [active, targetId]);
}
