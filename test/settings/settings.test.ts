import { describe, expect, it } from "vitest";
import { normalizeSettings, parseNumericSetting } from "../../src/settings/settings";

describe("numeric stylus settings", () => {
  it.each([
    ["doubleTapMs", "100", 100],
    ["longPressMs", "2000", 2000],
    ["movementThresholdPx", "8", 8],
  ] as const)("accepts an in-range whole %s value", (key, input, expected) => {
    expect(parseNumericSetting(key, input)).toBe(expected);
  });

  it.each([
    ["doubleTapMs", "99"],
    ["longPressMs", "3000"],
    ["movementThresholdPx", "2.5"],
    ["movementThresholdPx", "not a number"],
  ] as const)("rejects an invalid %s value", (key, input) => {
    expect(parseNumericSetting(key, input)).toBeNull();
  });
});

describe("barrel button signal setting", () => {
  it("defaults to the standard barrel bit and permits diagnostic overrides", () => {
    expect(normalizeSettings({}).barrelButtonMask).toBe(2);
    expect(normalizeSettings({ barrelButtonMask: 1 }).barrelButtonMask).toBe(1);
    expect(normalizeSettings({ barrelButtonMask: 4 }).barrelButtonMask).toBe(4);
    expect(normalizeSettings({ barrelButtonMask: 8 }).barrelButtonMask).toBe(8);
    expect(normalizeSettings({ barrelButtonMask: 16 }).barrelButtonMask).toBe(16);
    expect(normalizeSettings({ barrelButtonMask: 32 }).barrelButtonMask).toBe(32);
    expect(normalizeSettings({ barrelButtonMask: 64 as never }).barrelButtonMask).toBe(2);
    expect(normalizeSettings({ primaryContactMode: "experimental" }).primaryContactMode).toBe(
      "experimental"
    );
    expect(normalizeSettings({ stylusTestMode: true }).stylusTestMode).toBe(true);
  });
});
