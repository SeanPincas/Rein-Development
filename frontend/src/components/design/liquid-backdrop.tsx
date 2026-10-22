"use client";

import { useEffect, useRef, useState } from "react";
import { GridGlow } from "@/components/design/grid-glow";
import { LavaBackdrop } from "@/components/design/lava-backdrop";
import { createLiquidProgram, cx, hexToRgb, liquidPresets, type LiquidPresetName } from "@/lib/design";

type LiquidBackdropProps = {
  preset?: LiquidPresetName;
  /** Light up grid lines around the cursor (default on). */
  gridGlow?: boolean;
  className?: string;
};

/**
 * Marbled purple liquid behind the blueprint grid, fixed to the viewport.
 * Usage: <LiquidBackdrop /> inside any `relative isolate` page root.
 */
export function LiquidBackdrop({ preset = "hero", gridGlow = true, className }: LiquidBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const config = liquidPresets[preset];

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    const program = gl ? createLiquidProgram(gl) : null;
    if (!canvas || !gl || !program) {
      setWebglFailed(true);
      return;
    }

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const uResolution = uniform("uResolution");
    const uTime = uniform("uTime");
    gl.uniform1f(uniform("uScale"), config.scale);
    gl.uniform1f(uniform("uIntensity"), config.intensity);
    gl.uniform1f(uniform("uBrightness"), config.brightness);
    gl.uniform3fv(uniform("uDeep"), hexToRgb(config.deep));
    gl.uniform3fv(uniform("uMid"), hexToRgb(config.mid));
    gl.uniform3fv(uniform("uLight"), hexToRgb(config.light));

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frameInterval = 1000 / config.fps;
    // Random start so every visit pours a different pattern.
    const timeOffset = Math.random() * 200;
    let frame = 0;
    let lastDraw = 0;
    let revealed = false;

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2) * config.resolution;
      canvas.width = Math.max(1, Math.round(window.innerWidth * scale));
      canvas.height = Math.max(1, Math.round(window.innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
    };

    const draw = (now: number) => {
      gl.uniform1f(uTime, timeOffset + (now / 1000) * config.speed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // Fade the liquid in only once a real frame exists (CSS transition on the canvas).
      if (!revealed) {
        revealed = true;
        requestAnimationFrame(() => {
          canvas.style.opacity = "1";
        });
      }
    };

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - lastDraw < frameInterval) return;
      lastDraw = now;
      draw(now);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      if (document.hidden) return;
      if (reducedMotion.matches) {
        draw(0);
        return;
      }
      frame = requestAnimationFrame(loop);
    };

    const onResize = () => {
      resize();
      if (reducedMotion.matches) draw(0);
    };

    resize();
    start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", start);
    reducedMotion.addEventListener("change", start);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", start);
      reducedMotion.removeEventListener("change", start);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [config]);

  return (
    <div aria-hidden="true" className={cx("pointer-events-none fixed inset-0 -z-10", className)}>
      {webglFailed ? (
        <LavaBackdrop preset={preset} position="absolute" />
      ) : (
        // Starts transparent; the first drawn frame sets opacity 1 and it slowly pours in.
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-[2400ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:duration-700"
        />
      )}
      {/* Grid lines drawn over the liquid so the blueprint reads through it. */}
      <div className="blueprint-lines absolute inset-0" />
      {gridGlow && <GridGlow preset={preset === "hero" ? "default" : "soft"} />}
    </div>
  );
}
