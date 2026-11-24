import { describe, expect, it } from "vitest";
import { hasNewElementField, readNewElementId } from "../../src/excalidraw/compatibility";

describe("readNewElementId", () => {
  it("reads newElement and falls back to draggingElement", () => {
    expect(readNewElementId({ getAppState: () => ({ newElement: { id: "dot" } }) })).toBe("dot");
    expect(readNewElementId({ getAppState: () => ({ draggingElement: { id: "old" } }) })).toBe(
      "old"
    );
    expect(readNewElementId({ getAppState: () => ({}) })).toBeNull();
    expect(hasNewElementField({ newElement: null })).toBe(true);
    expect(hasNewElementField({})).toBe(false);
  });
});
