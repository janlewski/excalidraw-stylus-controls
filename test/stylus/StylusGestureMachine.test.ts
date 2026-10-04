import { describe, expect, it } from "vitest";
import { StylusGestureMachine } from "../../src/stylus/StylusGestureMachine";
import type { GestureEffect, NormalizedStylusEvent, Scheduler } from "../../src/stylus/types";

class FakeScheduler implements Scheduler {
  now = 0;
  private id = 0;
  private timers = new Map<number, { at: number; callback: () => void }>();
  setTimeout(callback: () => void, delayMs: number): number {
    const id = ++this.id;
    this.timers.set(id, { at: this.now + delayMs, callback });
    return id;
  }
  clearTimeout(handle: unknown): void {
    this.timers.delete(handle as number);
  }
  advance(ms: number): void {
    this.now += ms;
    for (;;) {
      const ready = [...this.timers]
        .filter(([, timer]) => timer.at <= this.now)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!ready) break;
      this.timers.delete(ready[0]);
      ready[1].callback();
    }
  }
}

const event = (
  kind: NormalizedStylusEvent["kind"],
  buttons: number,
  pointerType = "pen"
): NormalizedStylusEvent => ({
  kind,
  buttons,
  pointerType,
  pointerId: 1,
  button: 0,
  pressure: 0,
  x: 10,
  y: 12,
  timestamp: 0,
  isCanvasTarget: true,
});
const create = () => {
  const scheduler = new FakeScheduler();
  const machine = new StylusGestureMachine(
    {
      buttonContactAction: "eraser",
      doubleTapMs: 300,
      longPressMs: 450,
      movementThresholdPx: 8,
    },
    scheduler
  );
  const effects: GestureEffect[] = [];
  machine.setEffectSink((effect) => effects.push(effect));
  return { scheduler, machine, effects };
};

describe("StylusGestureMachine", () => {
  it("delays a normal hover button tap", () => {
    const { machine, scheduler, effects } = create();
    expect(machine.handle(event("move", 1))).toEqual([]);
    machine.handle(event("move", 0));
    scheduler.advance(299);
    expect(effects).toEqual([]);
    scheduler.advance(1);
    expect(effects).toEqual([{ type: "button-tap", point: { x: 10, y: 12 } }]);
  });
  it("resolves two hover presses as a double tap", () => {
    const { machine, effects } = create();
    machine.handle(event("move", 1));
    machine.handle(event("move", 0));
    machine.handle(event("move", 1));
    expect(machine.handle(event("move", 0))).toEqual([
      { type: "button-double-tap", point: { x: 10, y: 12 } },
    ]);
    expect(effects).toEqual([]);
  });
  it("fires a hold once and never later emits a tap", () => {
    const { machine, scheduler, effects } = create();
    machine.handle(event("move", 1));
    scheduler.advance(450);
    machine.handle(event("move", 0));
    expect(effects).toEqual([{ type: "button-hold", point: { x: 10, y: 12 } }]);
  });
  it("starts eraser on contact, ends it on lift, and consumes release", () => {
    const { machine } = create();
    machine.handle(event("move", 1));
    expect(machine.handle(event("down", 1))).toEqual([
      { type: "temporary-tool-start", point: { x: 10, y: 12 } },
    ]);
    expect(machine.handle(event("up", 0))).toEqual([{ type: "temporary-tool-end" }]);
    expect(machine.handle(event("move", 0))).toEqual([]);
  });
  it("supports repeated contact strokes in one held press", () => {
    const { machine } = create();
    machine.handle(event("move", 1));
    expect(machine.handle(event("down", 1)).map((x) => x.type)).toEqual(["temporary-tool-start"]);
    expect(machine.handle(event("up", 0)).map((x) => x.type)).toEqual(["temporary-tool-end"]);
    expect(machine.handle(event("down", 1)).map((x) => x.type)).toEqual(["temporary-tool-start"]);
    expect(machine.handle(event("up", 0)).map((x) => x.type)).toEqual(["temporary-tool-end"]);
  });
  it("cancels hold when contact arrives first and ignores mouse/touch", () => {
    const { machine, scheduler, effects } = create();
    machine.handle(event("move", 1));
    machine.handle(event("down", 1));
    scheduler.advance(500);
    expect(effects).toEqual([]);
    expect(machine.handle(event("move", 1, "mouse"))).toEqual([]);
    expect(machine.handle(event("move", 1, "touch"))).toEqual([]);
  });
  it("ends an active temporary tool on pointer cancel", () => {
    const { machine } = create();
    machine.handle(event("move", 1));
    machine.handle(event("down", 1));
    expect(machine.handle(event("cancel", 0))).toEqual([{ type: "temporary-tool-end" }]);
  });
});
