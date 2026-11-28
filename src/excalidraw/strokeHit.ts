import type { Point } from "../stylus/types";

export interface HitElement {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  angle?: number;
  isDeleted?: boolean;
  locked?: boolean;
}

export interface SceneViewport {
  left: number;
  top: number;
  scrollX: number;
  scrollY: number;
  zoom: number;
}

/** Screen pixels added around a stroke so a thin line is still a tap target. */
export const STROKE_TAP_SLOP_PX = 12;

export function zoomOf(zoom: unknown): number {
  if (typeof zoom === "number" && Number.isFinite(zoom) && zoom > 0) return zoom;
  if (zoom && typeof zoom === "object" && "value" in zoom) {
    const value = (zoom as { value?: unknown }).value;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return 1;
}

export function clientToScene(client: Point, viewport: SceneViewport): Point {
  const zoom = viewport.zoom > 0 ? viewport.zoom : 1;
  return {
    x: (client.x - viewport.left) / zoom - viewport.scrollX,
    y: (client.y - viewport.top) / zoom - viewport.scrollY,
  };
}

/**
 * Samsung Notes' stroke eraser deletes the whole line under a barrel tap.
 * Fresh elements are ink or eraser specks created by that tap. The target is
 * the topmost stroke that was already on the page.
 */
export function strokesToErase(
  elements: readonly HitElement[],
  scene: Point,
  priorIds: ReadonlySet<string> | null,
  screenPadding = STROKE_TAP_SLOP_PX,
  zoom = 1
): HitElement[] {
  const padding = screenPadding / (zoom > 0 ? zoom : 1);
  const hits = elements.filter(
    (element) => !element.isDeleted && !element.locked && contains(element, scene, padding)
  );
  const fresh =
    priorIds === null
      ? []
      : hits.filter((element) => typeof element.id === "string" && !priorIds.has(element.id));
  const existing = priorIds === null ? hits : hits.filter((element) => !fresh.includes(element));
  const target = existing.length > 0 ? existing[existing.length - 1] : null;
  const doomed = [...fresh];
  if (target && !doomed.includes(target)) doomed.push(target);
  return doomed;
}

function contains(element: HitElement, point: Point, padding: number): boolean {
  const { x, y, width, height } = element;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isFinite(x + y + width + height)
  ) {
    return false;
  }
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const angle = typeof element.angle === "number" ? element.angle : 0;
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  return (
    Math.abs(localX) <= Math.abs(width) / 2 + padding &&
    Math.abs(localY) <= Math.abs(height) / 2 + padding
  );
}
