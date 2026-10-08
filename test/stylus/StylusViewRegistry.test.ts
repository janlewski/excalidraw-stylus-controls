import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "../../src/settings/settings";
import { StylusViewRegistry, type StylusControllerLike } from "../../src/stylus/StylusViewRegistry";

function controller(): StylusControllerLike & { attachCalls: number; disposeCalls: number } {
  return {
    attachCalls: 0,
    disposeCalls: 0,
    attach() {
      this.attachCalls += 1;
    },
    dispose() {
      this.disposeCalls += 1;
    },
    getTrace() {
      return "[]";
    },
  };
}

describe("StylusViewRegistry lifecycle", () => {
  it("creates one watcher controller per leaf and disposes one when a leaf disappears", () => {
    const first = { getDisplayText: () => "first" };
    const second = { getDisplayText: () => "second" };
    let leaves = [first, second];
    const created = new Map<object, ReturnType<typeof controller>>();
    const app = { workspace: { getLeavesOfType: () => leaves } };
    const registry = new StylusViewRegistry(
      app as never,
      () => DEFAULT_SETTINGS,
      () => undefined,
      (leaf) => {
        const value = controller();
        created.set(leaf, value);
        return value;
      }
    );

    registry.sync();
    registry.sync();
    expect(created.get(first)?.attachCalls).toBe(1);
    expect(created.get(second)?.attachCalls).toBe(1);

    leaves = [second];
    registry.sync();
    expect(created.get(first)?.disposeCalls).toBe(1);
    expect(created.get(second)?.disposeCalls).toBe(0);
  });

  it("disposes all remaining controllers once on plugin unload", () => {
    const first = { getDisplayText: () => "first" };
    const second = { getDisplayText: () => "second" };
    const created: ReturnType<typeof controller>[] = [];
    const app = { workspace: { getLeavesOfType: () => [first, second] } };
    const registry = new StylusViewRegistry(
      app as never,
      () => DEFAULT_SETTINGS,
      () => undefined,
      () => {
        const value = controller();
        created.push(value);
        return value;
      }
    );

    registry.sync();
    registry.dispose();
    registry.dispose();
    expect(created.map((value) => value.disposeCalls)).toEqual([1, 1]);
  });
});
