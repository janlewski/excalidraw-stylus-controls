import { describe, expect, it } from "vitest";
import { getLeafApi, readActiveTool, toolCapabilities } from "../../src/excalidraw/compatibility";

describe("Excalidraw tool compatibility", () => {
  it("reports active-tool capabilities independently", () => {
    expect(toolCapabilities(null)).toEqual({
      canReadActiveTool: false,
      canSetActiveTool: false,
    });
    expect(toolCapabilities({ getAppState: () => ({}) })).toEqual({
      canReadActiveTool: true,
      canSetActiveTool: false,
    });
    expect(toolCapabilities({ setActiveTool: () => undefined })).toEqual({
      canReadActiveTool: false,
      canSetActiveTool: true,
    });
  });

  it("copies the full active-tool snapshot before a temporary switch", () => {
    const activeTool = { type: "freedraw", lastActiveTool: "selection" };
    const snapshot = readActiveTool({ getAppState: () => ({ activeTool }) });
    expect(snapshot).toEqual(activeTool);
    expect(snapshot).not.toBe(activeTool);
  });

  it("returns null when an API does not expose an active tool", () => {
    expect(readActiveTool({ getAppState: () => ({}) })).toBeNull();
  });

  it("accepts a complete leaf-local API surface", () => {
    const api = { getAppState: () => ({}), setActiveTool: () => undefined };
    expect(getLeafApi({ excalidrawAPI: api })).toEqual({ ok: true, value: api });
  });

  it("distinguishes a missing API from an incompatible one", () => {
    expect(getLeafApi({})).toMatchObject({ ok: false, code: "unavailable" });
    expect(getLeafApi({ excalidrawAPI: { getAppState: () => ({}) } })).toMatchObject({
      ok: false,
      code: "incompatible",
    });
  });
});
