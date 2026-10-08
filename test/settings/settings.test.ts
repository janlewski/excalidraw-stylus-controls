import { describe, expect, it } from "vitest";
import { parseNumericSetting } from "../../src/settings/settings";

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
