/**
 * Pure maths for the square avatar cropper. The image is shown inside a square
 * viewport of `viewport` px; `offset` is how far the image centre sits from the
 * viewport centre (viewport px), `zoom` multiplies the cover-fit scale (1 = the
 * image's short side exactly fills the viewport).
 */

export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const clampZoom = (zoom: number) => clamp(zoom, MIN_ZOOM, MAX_ZOOM);

/** Display scale at zoom 1: the image just covers the square viewport. */
export function coverScale(image: Size, viewport: number): number {
  return viewport / Math.min(image.width, image.height);
}

/** Keeps the image covering the whole viewport: no empty edges at any zoom. */
export function clampOffset(offset: Point, image: Size, viewport: number, zoom: number): Point {
  const scale = coverScale(image, viewport) * zoom;
  const maxX = Math.max(0, (image.width * scale - viewport) / 2);
  const maxY = Math.max(0, (image.height * scale - viewport) / 2);
  return { x: clamp(offset.x, -maxX, maxX), y: clamp(offset.y, -maxY, maxY) };
}

/**
 * New offset after zooming from `fromZoom` to `toZoom` around `point` (viewport px
 * from the centre), so the image spot under the pointer stays put.
 */
export function zoomAt(offset: Point, point: Point, fromZoom: number, toZoom: number): Point {
  const ratio = toZoom / fromZoom;
  return { x: point.x - (point.x - offset.x) * ratio, y: point.y - (point.y - offset.y) * ratio };
}

/** The square of the original image (in image pixels) that the viewport shows. */
export function cropRect(image: Size, viewport: number, zoom: number, offset: Point): { x: number; y: number; size: number } {
  const scale = coverScale(image, viewport) * zoom;
  const size = viewport / scale;
  const centerX = image.width / 2 - offset.x / scale;
  const centerY = image.height / 2 - offset.y / scale;
  return {
    x: clamp(centerX - size / 2, 0, image.width - size),
    y: clamp(centerY - size / 2, 0, image.height - size),
    size,
  };
}
