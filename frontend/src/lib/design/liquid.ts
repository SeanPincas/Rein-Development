/**
 * Liquid marble backdrop: a WebGL fragment shader that domain-warps fractal noise
 * (one noise field bent by another, twice), then draws contour bands along the warped
 * flow to get swirling, spilled-paint shapes.
 * Black stays dominant so text remains readable; purple fills the folds and thin
 * lilac streaks trace the edges of each swirl.
 */

export type Rgb = readonly [number, number, number];

export type LiquidPreset = {
  /** Fill of the deepest folds. */
  deep: string;
  /** Main body of the liquid. */
  mid: string;
  /** Thin highlight streaks. */
  light: string;
  /** 0–1 strength of the purple liquid bodies. */
  intensity: number;
  /** 0–1 final brightness of everything, highlight streaks included. Lower is dimmer. */
  brightness: number;
  /** Pattern zoom; higher packs more swirls on screen. */
  scale: number;
  /** Flow speed multiplier. */
  speed: number;
  /** Render resolution relative to CSS pixels (blurry by design, so 0.5 is plenty). */
  resolution: number;
  /** Frame cap; slow liquid looks identical at 30fps and costs half. */
  fps: number;
};

export const liquidPresets = {
  hero: {
    deep: "#2e1065",
    mid: "#6d28d9",
    light: "#c4b5fd",
    intensity: 0.75,
    brightness: 0.7,
    scale: 1.05,
    speed: 0.02,
    resolution: 0.5,
    fps: 30,
  },
  subtle: {
    deep: "#1e0b4b",
    mid: "#5b21b6",
    light: "#a78bfa",
    intensity: 0.45,
    brightness: 0.65,
    scale: 0.95,
    speed: 0.015,
    resolution: 0.4,
    fps: 24,
  },
} satisfies Record<string, LiquidPreset>;

export type LiquidPresetName = keyof typeof liquidPresets;

/** "#6d28d9" -> [0.427, 0.157, 0.851] for shader uniforms. */
export function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Invalid hex colour: ${hex}`);
  const n = Number.parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const liquidVertexShader = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const liquidFragmentShader = `
precision mediump float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uScale;
uniform float uIntensity;
uniform float uBrightness;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uLight;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Four smooth octaves: enough for organic flow without speckle.
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotate = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = rotate * p * 1.9 + 7.3;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y) * uScale;
  float t = uTime;

  // Domain warping: each field bends the next, folding straight noise into swirls.
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(
    fbm(p + 3.0 * q + vec2(1.7, 9.2) + 0.6 * t),
    fbm(p + 3.0 * q + vec2(8.3, 2.8) - 0.5 * t)
  );
  float f = fbm(p + 3.5 * r);

  // Marbling: many thin contour bands that follow the warped flow.
  float flow = f * 9.0 + length(r) * 5.0;
  float band = 0.5 + 0.5 * sin(flow * 3.14159);

  // Purple bodies with black channels between them.
  float body = smoothstep(0.25, 0.75, band);
  vec3 color = mix(uDeep, uMid, smoothstep(0.3, 0.8, f + 0.25 * q.x));
  color *= body * uIntensity;

  // Bright ribbons where bands crest, like light on poured paint.
  float crest = smoothstep(0.9, 0.995, band);
  color = mix(color, uLight, crest * smoothstep(0.3, 0.7, r.y) * 0.85);

  // Let some regions sink fully to black so the pattern breathes.
  color *= smoothstep(0.18, 0.55, f + 0.15 * r.x);

  float vignette = smoothstep(1.3, 0.2, length(uv - 0.5) * 1.6);
  color *= mix(0.5, 1.0, vignette) * uBrightness;

  gl_FragColor = vec4(color, 1.0);
}
`;

/** Compile and link the liquid shader program. Returns null if WebGL refuses it. */
export function createLiquidProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vertex = compile(gl.VERTEX_SHADER, liquidVertexShader);
  const fragment = compile(gl.FRAGMENT_SHADER, liquidFragmentShader);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}
