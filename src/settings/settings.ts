export type StylusAction = "menu" | "copy" | "paste" | "none";
export type BarrelButtonMask = 1 | 2 | 32;

export interface StylusControlsSettings {
  buttonTapAction: StylusAction;
  buttonDoubleTapAction: StylusAction;
  buttonHoldAction: StylusAction;
  buttonContactAction: "eraser" | "none";
  doubleTapMs: number;
  longPressMs: number;
  movementThresholdPx: number;
  /** PointerEvent.buttons bit used by the device for the barrel button. */
  barrelButtonMask: BarrelButtonMask;
  debugMode: boolean;
  debugOverlay: boolean;
}

export const DEFAULT_SETTINGS: StylusControlsSettings = {
  buttonTapAction: "menu",
  buttonDoubleTapAction: "copy",
  buttonHoldAction: "paste",
  buttonContactAction: "eraser",
  doubleTapMs: 300,
  longPressMs: 450,
  movementThresholdPx: 8,
  // Pointer Events specifies bit 2 for a pen barrel button. Bit 1 is the tip.
  barrelButtonMask: 2,
  debugMode: false,
  debugOverlay: false,
};

export const NUMERIC_SETTING_LIMITS = {
  doubleTapMs: { min: 100, max: 1000 },
  longPressMs: { min: 150, max: 2000 },
  movementThresholdPx: { min: 1, max: 100 },
} as const;

export type NumericSettingKey = keyof typeof NUMERIC_SETTING_LIMITS;

export function parseNumericSetting(key: NumericSettingKey, value: string): number | null {
  const parsed = Number(value);
  const { min, max } = NUMERIC_SETTING_LIMITS[key];
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function normalizeSettings(value: Partial<StylusControlsSettings>): StylusControlsSettings {
  const action = (candidate: unknown, fallback: StylusAction): StylusAction =>
    candidate === "menu" || candidate === "copy" || candidate === "paste" || candidate === "none"
      ? candidate
      : fallback;
  const number = (candidate: unknown, fallback: number, min: number, max: number): number =>
    typeof candidate === "number" && Number.isFinite(candidate)
      ? Math.min(max, Math.max(min, Math.round(candidate)))
      : fallback;
  return {
    buttonTapAction: action(value.buttonTapAction, DEFAULT_SETTINGS.buttonTapAction),
    buttonDoubleTapAction: action(
      value.buttonDoubleTapAction,
      DEFAULT_SETTINGS.buttonDoubleTapAction
    ),
    buttonHoldAction: action(value.buttonHoldAction, DEFAULT_SETTINGS.buttonHoldAction),
    buttonContactAction: value.buttonContactAction === "none" ? "none" : "eraser",
    doubleTapMs: number(
      value.doubleTapMs,
      300,
      NUMERIC_SETTING_LIMITS.doubleTapMs.min,
      NUMERIC_SETTING_LIMITS.doubleTapMs.max
    ),
    longPressMs: number(
      value.longPressMs,
      450,
      NUMERIC_SETTING_LIMITS.longPressMs.min,
      NUMERIC_SETTING_LIMITS.longPressMs.max
    ),
    movementThresholdPx: number(
      value.movementThresholdPx,
      8,
      NUMERIC_SETTING_LIMITS.movementThresholdPx.min,
      NUMERIC_SETTING_LIMITS.movementThresholdPx.max
    ),
    barrelButtonMask:
      value.barrelButtonMask === 1 || value.barrelButtonMask === 32
        ? value.barrelButtonMask
        : DEFAULT_SETTINGS.barrelButtonMask,
    debugMode: value.debugMode === true,
    debugOverlay: value.debugOverlay === true,
  };
}
