import { describe, expect, it } from "vitest";
import type { ActiveToolSnapshot, BridgeResult } from "../../src/excalidraw/ExcalidrawBridge";
import { DebugLogger } from "../../src/debug/DebugLogger";
import { DEFAULT_SETTINGS } from "../../src/settings/settings";
import { StylusController } from "../../src/stylus/StylusController";

const scheduler = {
  setTimeout: () => 1,
  clearTimeout: () => undefined,
};

class FakeContainer {
  readonly listeners = new Map<string, EventListener[]>();
  addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((candidate) => candidate !== listener)
    );
  }
  contains(): boolean {
    return true;
  }
  createDiv(): HTMLElement {
    throw new Error("The debug overlay must stay disabled in this test.");
  }
}

class FakeBridge {
  readonly savedTool: ActiveToolSnapshot = { type: "freedraw", lastActiveTool: "selection" };
  startCalls = 0;
  restoreCalls: ActiveToolSnapshot[] = [];
  startResult: BridgeResult<ActiveToolSnapshot> = { ok: true, value: this.savedTool };

  startTemporaryEraser(): BridgeResult<ActiveToolSnapshot> {
    this.startCalls += 1;
    return this.startResult;
  }
  restoreTool(tool: ActiveToolSnapshot): BridgeResult<void> {
    this.restoreCalls.push(tool);
    return { ok: true, value: undefined };
  }
}

function create() {
  const container = new FakeContainer();
  const bridge = new FakeBridge();
  const leaf = { view: { containerEl: container } };
  const controller = new StylusController(
    leaf as never,
    bridge as never,
    () => DEFAULT_SETTINGS,
    new DebugLogger(() => false),
    () => undefined,
    scheduler
  );
  return { bridge, container, controller };
}

function pen(type: "pointermove" | "pointerdown" | "pointerup" | "pointercancel", buttons: number) {
  return {
    type,
    pointerType: "pen",
    pointerId: 1,
    buttons,
    button: 0,
    pressure: 0.5,
    clientX: 12,
    clientY: 18,
    timeStamp: 1,
    target: null,
    preventDefault: () => undefined,
  } as unknown as PointerEvent;
}

describe("StylusController lifecycle", () => {
  it("attaches one capture watcher set and removes it on disposal", () => {
    const { container, controller } = create();
    controller.attach();
    controller.attach();
    expect([...container.listeners.values()].map((listeners) => listeners.length)).toEqual([
      1, 1, 1, 1, 1,
    ]);
    controller.dispose();
    expect([...container.listeners.values()].map((listeners) => listeners.length)).toEqual([
      0, 0, 0, 0, 0,
    ]);
  });

  it.each(["pointerup", "pointercancel"] as const)("restores once on %s", (endEvent) => {
    const { bridge, controller } = create();
    controller["onPointerEvent"](pen("pointermove", 1));
    controller["onPointerEvent"](pen("pointerdown", 1));
    controller["onPointerEvent"](pen(endEvent, 0));
    controller["onPointerEvent"](pen(endEvent, 0));
    expect(bridge.startCalls).toBe(1);
    expect(bridge.restoreCalls).toEqual([bridge.savedTool]);
  });

  it("restores once when disposed during a temporary eraser stroke", () => {
    const { bridge, controller } = create();
    controller["onPointerEvent"](pen("pointermove", 1));
    controller["onPointerEvent"](pen("pointerdown", 1));
    controller.dispose();
    controller.dispose();
    expect(bridge.restoreCalls).toEqual([bridge.savedTool]);
  });

  it("does not restore when the bridge rejects the temporary switch", () => {
    const { bridge, controller } = create();
    bridge.startResult = { ok: false, code: "failed", message: "switch failed" };
    controller["onPointerEvent"](pen("pointermove", 1));
    controller["onPointerEvent"](pen("pointerdown", 1));
    controller["onPointerEvent"](pen("pointerup", 0));
    expect(bridge.startCalls).toBe(1);
    expect(bridge.restoreCalls).toEqual([]);
  });

  it("keeps temporary tools independent across two views", () => {
    const first = create();
    const second = create();
    first.controller["onPointerEvent"](pen("pointermove", 1));
    first.controller["onPointerEvent"](pen("pointerdown", 1));
    second.controller["onPointerEvent"](pen("pointermove", 1));
    second.controller["onPointerEvent"](pen("pointerdown", 1));
    first.controller["onPointerEvent"](pen("pointerup", 0));
    expect(first.bridge.restoreCalls).toEqual([first.bridge.savedTool]);
    expect(second.bridge.restoreCalls).toEqual([]);
    second.controller.dispose();
    expect(second.bridge.restoreCalls).toEqual([second.bridge.savedTool]);
  });
});
