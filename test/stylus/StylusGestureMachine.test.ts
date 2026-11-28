import { describe, expect, it } from "vitest";
import { StylusGestureMachine } from "../../src/stylus/StylusGestureMachine";
import type {
  GestureEffect,
  GestureSettings,
  NormalizedStylusEvent,
  Scheduler,
} from "../../src/stylus/types";

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
  pointerType = "pen",
  point = { x: 10, y: 12 },
  timestamp = 0
): NormalizedStylusEvent => ({
  kind,
  // Existing test calls use 1 as a shorthand for “barrel held”. Encode the
  // actual PointerEvent bitfield here: barrel is 2, tip + barrel is 3.
  buttons: buttons === 1 ? (kind === "down" ? 3 : 2) : buttons,
  pointerType,
  pointerId: 1,
  button: 0,
  pressure: 0,
  tangentialPressure: 0,
  tiltX: 0,
  tiltY: 0,
  twist: 0,
  width: 1,
  height: 1,
  x: point.x,
  y: point.y,
  timestamp,
  isCanvasTarget: true,
});
const create = (
  barrelButtonMask: GestureSettings["barrelButtonMask"] = 2,
  primaryContactMode: GestureSettings["primaryContactMode"] = "hover-only",
  extra: Partial<
    Pick<GestureSettings, "lateWindowMs" | "midStrokePress" | "buttonContactAction">
  > = {}
) => {
  const scheduler = new FakeScheduler();
  const machine = new StylusGestureMachine(
    {
      buttonContactAction: "eraser",
      doubleTapMs: 300,
      longPressMs: 450,
      movementThresholdPx: 8,
      barrelButtonMask,
      primaryContactMode,
      lateWindowMs: 40,
      midStrokePress: "split",
      ...extra,
    },
    scheduler
  );
  const effects: GestureEffect[] = [];
  machine.setEffectSink((effect) => effects.push(effect));
  return { scheduler, machine, effects };
};

describe("StylusGestureMachine", () => {
  it("uses the standard barrel bit rather than the pen-tip bit", () => {
    const { machine } = create();
    machine.handle(event("move", 1));
    expect(machine.snapshot().barrelButtonHeld).toBe(true);

    const { machine: tipOnlyMachine } = create();
    tipOnlyMachine.handle({ ...event("move", 0), buttons: 1 });
    expect(tipOnlyMachine.snapshot().barrelButtonHeld).toBe(false);
  });
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
    machine.handle(event("move", 1, "pen", { x: 10, y: 12 }, 0));
    scheduler.advance(450);
    expect(effects).toEqual([]);
    expect(machine.handle(event("move", 0, "pen", { x: 10, y: 12 }, 450))).toEqual([
      { type: "button-hold", point: { x: 10, y: 12 } },
    ]);
    scheduler.advance(500);
    expect(effects).toEqual([]);
  });
  it("starts eraser on contact, ends it on lift, and consumes release", () => {
    const { machine } = create();
    machine.handle(event("move", 1));
    expect(machine.handle(event("down", 1))).toEqual([
      { type: "temporary-tool-start", point: { x: 10, y: 12 } },
    ]);
    expect(machine.handle(event("up", 0))).toEqual([
      { type: "temporary-tool-end" },
      { type: "erase-tap", point: { x: 10, y: 12 } },
    ]);
    expect(machine.handle(event("move", 0))).toEqual([]);
  });
  it("recognizes a barrel button first reported with pen contact", () => {
    const { machine } = create();
    expect(machine.handle({ ...event("down", 0), buttons: 3 })).toEqual([
      { type: "temporary-tool-start", point: { x: 10, y: 12 } },
    ]);
    expect(machine.snapshot().barrelButtonHeld).toBe(true);
    expect(machine.handle(event("up", 0))).toEqual([
      { type: "temporary-tool-end" },
      { type: "erase-tap", point: { x: 10, y: 12 } },
    ]);
    expect(machine.snapshot().barrelButtonHeld).toBe(false);
  });
  it("does not mistake normal pen contact for an Android-mapped barrel bit", () => {
    const { machine } = create(1);
    expect(machine.handle({ ...event("down", 0), buttons: 1 })).toEqual([]);
    expect(machine.snapshot().barrelButtonHeld).toBe(false);
  });
  it("can intentionally test Android primary-bit contact recognition", () => {
    const { machine } = create(1, "experimental");
    expect(machine.handle({ ...event("down", 0), buttons: 1 })).toEqual([
      { type: "temporary-tool-start", point: { x: 10, y: 12 } },
    ]);
  });
  it("supports repeated contact strokes in one held press", () => {
    const { machine } = create();
    machine.handle(event("move", 1));
    expect(machine.handle(event("down", 1)).map((x) => x.type)).toEqual(["temporary-tool-start"]);
    expect(machine.handle(event("up", 0)).map((x) => x.type)).toEqual([
      "temporary-tool-end",
      "erase-tap",
    ]);
    expect(machine.handle(event("down", 1)).map((x) => x.type)).toEqual(["temporary-tool-start"]);
    expect(machine.handle(event("up", 0)).map((x) => x.type)).toEqual([
      "temporary-tool-end",
      "erase-tap",
    ]);
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
  it("does not turn a moved hover press into a tap or hold", () => {
    const { machine, scheduler, effects } = create();
    machine.handle(event("move", 1));
    machine.handle(event("move", 1, "pen", { x: 19, y: 12 }));
    machine.handle(event("move", 0, "pen", { x: 19, y: 12 }));
    scheduler.advance(500);
    expect(effects).toEqual([]);
  });
  it("suppresses the barrel right-click and the menu that follows an eraser tap", () => {
    const { machine } = create();
    expect(machine.handle(event("contextmenu", 0))).toEqual([]);
    expect(machine.handle({ ...event("contextmenu", 0), button: 2 })).toEqual([
      { type: "suppress-context-menu" },
    ]);
    machine.handle(event("move", 1, "pen", { x: 10, y: 12 }, 1000));
    machine.handle(event("down", 1, "pen", { x: 10, y: 12 }, 1100));
    expect(machine.handle(event("contextmenu", 1, "pen", { x: 10, y: 12 }, 1200))).toEqual([
      { type: "suppress-context-menu" },
    ]);
    machine.handle(event("up", 0, "pen", { x: 10, y: 12 }, 1300));
    expect(machine.handle(event("contextmenu", 0, "pen", { x: 10, y: 12 }, 1400))).toEqual([
      { type: "suppress-context-menu" },
    ]);
    expect(machine.handle(event("contextmenu", 0, "pen", { x: 10, y: 12 }, 2000))).toEqual([]);
  });
  it("ends an active temporary tool and clears timers when disposed", () => {
    const { machine, scheduler, effects } = create();
    machine.handle(event("move", 1));
    machine.handle(event("down", 1));
    expect(machine.dispose()).toEqual([{ type: "temporary-tool-end" }]);
    scheduler.advance(500);
    expect(effects).toEqual([]);
    expect(machine.snapshot()).toEqual({
      barrelButtonHeld: false,
      penContact: false,
      gestureConsumed: false,
      temporaryToolActive: false,
      hoverGestureMoved: false,
      longPressFired: false,
      activePointerId: null,
    });
  });
  it("exposes a serializable state snapshot for diagnostics", () => {
    const { machine } = create();
    machine.handle(event("move", 1));
    machine.handle(event("down", 1));
    expect(machine.snapshot()).toEqual({
      barrelButtonHeld: true,
      penContact: true,
      gestureConsumed: true,
      temporaryToolActive: true,
      hoverGestureMoved: false,
      longPressFired: false,
      activePointerId: 1,
    });
  });
  it("clears temporary state when the controller cannot start the bridge action", () => {
    const { machine } = create();
    machine.handle(event("move", 1));
    machine.handle(event("down", 1));
    machine.temporaryToolDidNotStart();
    expect(machine.snapshot().temporaryToolActive).toBe(false);
    expect(machine.handle(event("up", 0))).toEqual([
      { type: "erase-tap", point: { x: 10, y: 12 } },
    ]);
  });

  it("starts the eraser when the bridge barrel is already down at contact", () => {
    const { machine } = create();
    machine.setBarrelSource("bridge");
    machine.handle(event("move", 0));
    expect(machine.handleExternalButton({ down: true, pressedAt: 0 })).toEqual([]);
    expect(machine.handle(event("down", 0, "pen", { x: 10, y: 12 }, 1000))).toEqual([
      { type: "temporary-tool-start", point: { x: 10, y: 12 } },
    ]);
  });

  it("splits a stroke when the bridge button arrives after the late window", () => {
    const { machine } = create();
    machine.setBarrelSource("bridge");
    machine.handle(event("down", 0, "pen", { x: 4, y: 6 }, 1000));
    expect(machine.handleExternalButton({ down: true, pressedAt: 1200 })).toEqual([
      { type: "temporary-tool-split", point: { x: 4, y: 6 }, discardStroke: false },
    ]);
  });

  it("discards the dot when the press lands inside the late window", () => {
    const { machine } = create();
    machine.setBarrelSource("bridge");
    machine.handle(event("down", 0, "pen", { x: 4, y: 6 }, 1000));
    expect(machine.handleExternalButton({ down: true, pressedAt: 1020 })).toEqual([
      { type: "temporary-tool-split", point: { x: 4, y: 6 }, discardStroke: true },
    ]);
  });

  it("discards the dot when the press time is earlier than contact", () => {
    const { machine } = create();
    machine.setBarrelSource("bridge");
    machine.handle(event("down", 0, "pen", { x: 4, y: 6 }, 1000));
    expect(machine.handleExternalButton({ down: true, pressedAt: 990 })[0]).toMatchObject({
      type: "temporary-tool-split",
      discardStroke: true,
    });
  });

  it("keeps erasing until lift when the barrel is released mid-stroke", () => {
    const { machine, scheduler, effects } = create();
    machine.setBarrelSource("bridge");
    machine.handle(event("move", 0));
    machine.handleExternalButton({ down: true, pressedAt: 0 });
    expect(machine.handle(event("down", 0)).map((effect) => effect.type)).toEqual([
      "temporary-tool-start",
    ]);
    expect(machine.handleExternalButton({ down: false, pressedAt: 80 })).toEqual([]);
    expect(machine.snapshot().temporaryToolActive).toBe(true);
    expect(machine.handle(event("up", 0)).map((effect) => effect.type)).toEqual([
      "temporary-tool-end",
      "erase-tap",
    ]);
    scheduler.advance(500);
    expect(effects).toEqual([]);
  });

  it("repeats eraser strokes while the bridge button stays down and does not tap", () => {
    const { machine, scheduler, effects } = create();
    machine.setBarrelSource("bridge");
    machine.handleExternalButton({ down: true, pressedAt: 0 });
    expect(machine.handle(event("down", 0)).map((effect) => effect.type)).toEqual([
      "temporary-tool-start",
    ]);
    expect(machine.handle(event("up", 0)).map((effect) => effect.type)).toEqual([
      "temporary-tool-end",
      "erase-tap",
    ]);
    expect(machine.handle(event("down", 0)).map((effect) => effect.type)).toEqual([
      "temporary-tool-start",
    ]);
    expect(machine.handle(event("up", 0)).map((effect) => effect.type)).toEqual([
      "temporary-tool-end",
      "erase-tap",
    ]);
    expect(machine.handleExternalButton({ down: false, pressedAt: 500 })).toEqual([]);
    scheduler.advance(500);
    expect(effects).toEqual([]);
  });

  it("emits a hover tap from bridge press and release", () => {
    const { machine, scheduler, effects } = create();
    machine.setBarrelSource("bridge");
    machine.handle(event("move", 0));
    machine.handleExternalButton({ down: true, pressedAt: 0 });
    machine.handleExternalButton({ down: false, pressedAt: 20 });
    scheduler.advance(299);
    expect(effects).toEqual([]);
    scheduler.advance(1);
    expect(effects).toEqual([{ type: "button-tap", point: { x: 10, y: 12 } }]);
  });

  it("waits for the next contact when mid-stroke press is deferred", () => {
    const { machine } = create(2, "hover-only", { midStrokePress: "next-contact" });
    machine.setBarrelSource("bridge");
    machine.handle(event("down", 0, "pen", { x: 1, y: 1 }, 1000));
    expect(machine.handleExternalButton({ down: true, pressedAt: 1200 })).toEqual([]);
    expect(machine.handle(event("up", 0))).toEqual([]);
    expect(machine.handle(event("down", 0)).map((effect) => effect.type)).toEqual([
      "temporary-tool-start",
    ]);
  });

  it("emits nothing when the barrel source changes while the button is held", () => {
    const { machine, scheduler, effects } = create();
    machine.handle(event("move", 1));
    machine.setBarrelSource("bridge");
    scheduler.advance(500);
    expect(effects).toEqual([]);
    expect(machine.snapshot().barrelButtonHeld).toBe(false);
  });

  it("does not tap after repeated mask-1 hover-latch strokes", () => {
    const { machine, scheduler, effects } = create(1);
    const raw = (kind: NormalizedStylusEvent["kind"], buttons: number): NormalizedStylusEvent => ({
      ...event(kind, 0),
      buttons,
    });
    machine.handle(raw("move", 1));
    expect(machine.handle(raw("down", 1)).map((effect) => effect.type)).toEqual([
      "temporary-tool-start",
    ]);
    expect(machine.handle(raw("up", 0)).map((effect) => effect.type)).toEqual([
      "temporary-tool-end",
      "erase-tap",
    ]);
    machine.handle(raw("move", 1));
    expect(machine.handle(raw("down", 1)).map((effect) => effect.type)).toEqual([
      "temporary-tool-start",
    ]);
    expect(machine.handle(raw("up", 0)).map((effect) => effect.type)).toEqual([
      "temporary-tool-end",
      "erase-tap",
    ]);
    expect(machine.handle(raw("move", 0))).toEqual([]);
    scheduler.advance(500);
    expect(effects).toEqual([]);
  });

  it("keeps a barrel drag on the eraser without deleting a whole stroke on lift", () => {
    const { machine } = create();
    machine.setBarrelSource("bridge");
    machine.handleExternalButton({ down: true, pressedAt: 0 });
    machine.handle(event("down", 0, "pen", { x: 4, y: 6 }, 1000));
    machine.handle(event("move", 0, "pen", { x: 40, y: 6 }, 1100));
    expect(
      machine.handle(event("up", 0, "pen", { x: 40, y: 6 }, 1200)).map((effect) => effect.type)
    ).toEqual(["temporary-tool-end"]);
  });

  it("erases a tap when the barrel packet arrives after the pen lifts", () => {
    const { machine, scheduler, effects } = create();
    machine.setBarrelSource("bridge");
    machine.handle(event("down", 0, "pen", { x: 4, y: 6 }, 1000));
    expect(machine.handle(event("up", 0, "pen", { x: 5, y: 6 }, 1080))).toEqual([]);
    expect(machine.handleExternalButton({ down: true, pressedAt: 1020 })).toEqual([
      { type: "erase-tap", point: { x: 4, y: 6 } },
    ]);
    expect(machine.handleExternalButton({ down: false, pressedAt: 1300 })).toEqual([]);
    scheduler.advance(500);
    expect(effects).toEqual([]);
  });

  it("keeps a hover click after a stroke as a button tap", () => {
    const { machine, scheduler, effects } = create();
    machine.setBarrelSource("bridge");
    machine.handle(event("move", 0, "pen", { x: 8, y: 9 }, 900));
    machine.handle(event("down", 0, "pen", { x: 8, y: 9 }, 1000));
    machine.handle(event("up", 0, "pen", { x: 8, y: 9 }, 1100));
    machine.handleExternalButton({ down: true, pressedAt: 2000 });
    machine.handleExternalButton({ down: false, pressedAt: 2040 });
    scheduler.advance(300);
    expect(effects).toEqual([{ type: "button-tap", point: { x: 8, y: 9 } }]);
  });
});
