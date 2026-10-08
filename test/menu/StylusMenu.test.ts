import { afterEach, describe, expect, it, vi } from "vitest";
import { clampMenuPosition, StylusMenu } from "../../src/menu/StylusMenu";

class FakeElement {
  readonly children: FakeElement[] = [];
  readonly listeners = new Map<string, Array<(event: PointerEvent) => void>>();
  readonly css = new Map<string, string>();
  removed = false;
  offsetWidth = 172;
  offsetHeight = 300;

  createEl(..._args: unknown[]): FakeElement {
    void _args;
    const child = new FakeElement();
    this.children.push(child);
    return child;
  }
  createDiv(..._args: unknown[]): FakeElement {
    void _args;
    return this.createEl();
  }
  addEventListener(type: string, listener: (event: PointerEvent) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  setCssProps(values: Record<string, string>): void {
    for (const [key, value] of Object.entries(values)) this.css.set(key, value);
  }
  contains(target: unknown): boolean {
    return target === this || this.children.some((child) => child.contains(target));
  }
  remove(): void {
    this.removed = true;
  }
  dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({
        stopPropagation: () => undefined,
        preventDefault: () => undefined,
      } as PointerEvent);
    }
  }
}

function setupDom() {
  const body = new FakeElement();
  const listeners = new Map<string, EventListener[]>();
  const timers: Array<() => void> = [];
  vi.stubGlobal("document", {
    body,
    addEventListener: (type: string, listener: EventListener) =>
      listeners.set(type, [...(listeners.get(type) ?? []), listener]),
    removeEventListener: (type: string, listener: EventListener) =>
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((candidate) => candidate !== listener)
      ),
  });
  vi.stubGlobal("window", {
    innerWidth: 320,
    innerHeight: 500,
    setTimeout: (callback: () => void) => timers.push(callback),
  });
  return { body, listeners, timers };
}

afterEach(() => vi.unstubAllGlobals());

describe("StylusMenu positioning", () => {
  const viewport = { width: 320, height: 500 };
  const menu = { width: 172, height: 300 };

  it("keeps a menu at an in-bounds stylus point", () => {
    expect(clampMenuPosition({ x: 100, y: 100 }, viewport, menu)).toEqual({ x: 100, y: 100 });
  });

  it("clamps a menu away from every viewport edge", () => {
    expect(clampMenuPosition({ x: -10, y: -20 }, viewport, menu)).toEqual({ x: 8, y: 8 });
    expect(clampMenuPosition({ x: 1000, y: 1000 }, viewport, menu)).toEqual({ x: 140, y: 192 });
  });

  it("uses the minimum margin when the viewport is narrower than the menu", () => {
    expect(clampMenuPosition({ x: 20, y: 20 }, { width: 100, height: 100 }, menu)).toEqual({
      x: 8,
      y: 8,
    });
  });

  it("runs a selected tool action and dismisses the menu", () => {
    const { body, listeners, timers } = setupDom();
    const setTool = vi.fn();
    const menu = new StylusMenu();
    menu.open({ x: 100, y: 100 }, { setTool } as never);
    timers.shift()?.();
    expect(body.children[0].css.get("left")).toBe("100px");
    expect(body.children[0].css.get("top")).toBe("100px");
    body.children[0].children[0].dispatch("pointerup");
    expect(setTool).toHaveBeenCalledWith("selection");
    expect(body.children[0].removed).toBe(true);
    expect(listeners.get("pointerdown")).toEqual([]);
  });

  it("dismisses only for a pointer event outside the menu", () => {
    const { body, listeners, timers } = setupDom();
    const menu = new StylusMenu();
    menu.open({ x: 100, y: 100 }, {} as never);
    timers.shift()?.();
    listeners.get("pointerdown")?.[0]({ target: body.children[0] } as unknown as PointerEvent);
    expect(body.children[0].removed).toBe(false);
    listeners.get("pointerdown")?.[0]({ target: new FakeElement() } as unknown as PointerEvent);
    expect(body.children[0].removed).toBe(true);
  });

  it("does not attach an outside listener after a menu closes before its timer fires", () => {
    const { listeners, timers } = setupDom();
    const menu = new StylusMenu();
    menu.open({ x: 100, y: 100 }, {} as never);
    menu.close();
    timers.shift()?.();
    expect(listeners.get("pointerdown") ?? []).toEqual([]);
  });
});
