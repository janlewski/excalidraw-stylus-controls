import { describe, expect, it } from "vitest";
import { clientToScene, strokesToErase, zoomOf } from "../../src/excalidraw/strokeHit";

const line = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  extra: { angle?: number; locked?: boolean; isDeleted?: boolean } = {}
) => ({ id, x, y, width, height, ...extra });

describe("stroke eraser hit testing", () => {
  it("converts a screen point with zoom and scroll", () => {
    expect(
      clientToScene({ x: 120, y: 80 }, { left: 20, top: 10, scrollX: 5, scrollY: -2, zoom: 2 })
    ).toEqual({ x: 45, y: 37 });
    expect(zoomOf({ value: 1.5 })).toBe(1.5);
    expect(zoomOf(2)).toBe(2);
    expect(zoomOf(undefined)).toBe(1);
  });

  it("deletes the topmost existing stroke and the speck this tap created", () => {
    const shape = line("shape", 0, 0, 100, 20);
    const speck = line("speck", 40, 4, 4, 4);
    expect(
      strokesToErase([shape, speck], { x: 42, y: 6 }, new Set(["shape"])).map((hit) => hit.id)
    ).toEqual(["speck", "shape"]);
  });

  it("uses the topmost stroke when several overlap", () => {
    const lower = line("lower", 0, 0, 80, 40);
    const upper = line("upper", 10, 10, 20, 20);
    expect(strokesToErase([lower, upper], { x: 15, y: 15 }, null).map((hit) => hit.id)).toEqual([
      "upper",
    ]);
  });

  it("skips locked and deleted strokes and still reaches a rotated line", () => {
    const locked = line("locked", 0, 0, 40, 40, { locked: true });
    const gone = line("gone", 0, 0, 40, 40, { isDeleted: true });
    const rotated = line("rotated", 0, 0, 80, 10, { angle: Math.PI / 2 });
    expect(
      strokesToErase([locked, gone, rotated], { x: 40, y: 30 }, new Set(["rotated"])).map(
        (hit) => hit.id
      )
    ).toEqual(["rotated"]);
    expect(strokesToErase([rotated], { x: 40, y: 80 }, new Set(["rotated"]))).toEqual([]);
  });

  it("includes a thin stroke inside the tap slop", () => {
    const thin = line("thin", 0, 10, 100, 1);
    expect(
      strokesToErase([thin], { x: 20, y: 18 }, new Set(["thin"])).map((hit) => hit.id)
    ).toEqual(["thin"]);
  });
});
