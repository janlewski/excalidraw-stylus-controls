import { afterEach, describe, expect, it, vi } from "vitest";
import { PairingStore } from "../../src/penbridge/pairingStore";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PairingStore", () => {
  it("uses Obsidian local storage when the app provides it", () => {
    const memory = new Map<string, string>();
    const store = new PairingStore({
      vault: { getName: () => "Secret Vault" },
      saveLocalStorage: (key, value) => {
        if (!value) memory.delete(key);
        else memory.set(key, value);
      },
      loadLocalStorage: (key) => memory.get(key) ?? null,
    });
    store.save("code");
    expect(store.load()).toBe("code");
    expect([...memory.keys()]).toEqual(["excalidraw-stylus-controls:pairing"]);
    store.clear();
    expect(store.load()).toBe("");
  });

  it("falls back to window storage keyed by the vault name", () => {
    const memory = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => memory.set(key, value),
        removeItem: (key: string) => memory.delete(key),
      },
    });
    const store = new PairingStore({ vault: { getName: () => "Secret Vault" } });
    store.save("code");
    expect([...memory.keys()]).toEqual(["excalidraw-stylus-controls:Secret Vault:pairing"]);
    expect(store.load()).toBe("code");
  });
});
