import { Platform } from "obsidian";

export type StylusAction = "menu" | "context-menu" | "copy" | "paste" | "none";
export type BarrelButtonMask = 1 | 2 | 4 | 8 | 16 | 32;
export type PrimaryContactMode = "hover-only" | "experimental";
export type MidStrokePress = "split" | "next-contact";
export type EraserStrategy = "synthetic-button5" | "set-active-tool";

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
  /** Prevent the Android/WebView primary bit from matching ordinary pen contact by default. */
  primaryContactMode: PrimaryContactMode;
  /** Allow a tester to inspect recognition without changing the drawing or opening actions. */
  stylusTestMode: boolean;
  debugMode: boolean;
  debugOverlay: boolean;
  penBridgeEnabled: boolean;
  penBridgePort: number;
  lateWindowMs: number;
  midStrokePress: MidStrokePress;
  eraserStrategy: EraserStrategy;
  suppressHoverButtonEvents: boolean;
  /** Bumped when a default gesture changes, so an older saved mapping can move once. */
  gestureRevision: number;
}

export const DEFAULT_SETTINGS: StylusControlsSettings = {
  buttonTapAction: "menu",
  buttonDoubleTapAction: "context-menu",
  buttonHoldAction: "none",
  buttonContactAction: "eraser",
  doubleTapMs: 300,
  longPressMs: 450,
  movementThresholdPx: 8,
  // Pointer Events specifies bit 2 for a pen barrel button. Bit 1 is the tip.
  barrelButtonMask: 2,
  primaryContactMode: "hover-only",
  stylusTestMode: false,
  debugMode: false,
  debugOverlay: false,
  penBridgeEnabled: false,
  penBridgePort: 47631,
  lateWindowMs: 40,
  midStrokePress: "split",
  eraserStrategy: "synthetic-button5",
  suppressHoverButtonEvents: true,
  gestureRevision: 2,
};

export const NUMERIC_SETTING_LIMITS = {
  doubleTapMs: { min: 100, max: 1000 },
  longPressMs: { min: 150, max: 2000 },
  movementThresholdPx: { min: 1, max: 100 },
  lateWindowMs: { min: 0, max: 100 },
} as const;

export type NumericSettingKey = keyof typeof NUMERIC_SETTING_LIMITS;

export interface SettingsPlatform {
  android: boolean;
}

const BARREL_MASKS: readonly BarrelButtonMask[] = [1, 2, 4, 8, 16, 32];

export function parseNumericSetting(key: NumericSettingKey, value: string): number | null {
  const parsed = Number(value);
  const { min, max } = NUMERIC_SETTING_LIMITS[key];
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function describeBarrelSource(
  settings: { barrelButtonMask: number; primaryContactMode: string },
  bridgeReady: boolean
): string {
  if (bridgeReady) return "bridge";
  if (settings.barrelButtonMask === 1 && settings.primaryContactMode === "hover-only") {
    return "hover-latch";
  }
  return `pointer mask ${settings.barrelButtonMask}`;
}

export function normalizeSettings(
  value: Partial<StylusControlsSettings>,
  platform: SettingsPlatform = { android: Platform.isAndroidApp }
): StylusControlsSettings {
  const action = (candidate: unknown, fallback: StylusAction): StylusAction =>
    candidate === "menu" ||
    candidate === "context-menu" ||
    candidate === "copy" ||
    candidate === "paste" ||
    candidate === "none"
      ? candidate
      : fallback;
  const number = (candidate: unknown, fallback: number, min: number, max: number): number =>
    typeof candidate === "number" && Number.isFinite(candidate)
      ? Math.min(max, Math.max(min, Math.round(candidate)))
      : fallback;
  const maskWasUnset = value.barrelButtonMask === undefined;
  const explicitMask = BARREL_MASKS.find((mask) => mask === value.barrelButtonMask);
  const storedRevision = value.gestureRevision === 2 ? 2 : 0;
  const doubleTap = action(value.buttonDoubleTapAction, DEFAULT_SETTINGS.buttonDoubleTapAction);
  const hold = action(value.buttonHoldAction, DEFAULT_SETTINGS.buttonHoldAction);
  return {
    buttonTapAction: action(value.buttonTapAction, DEFAULT_SETTINGS.buttonTapAction),
    buttonDoubleTapAction:
      storedRevision < 2 &&
      (value.buttonDoubleTapAction === undefined || value.buttonDoubleTapAction === "copy")
        ? "context-menu"
        : doubleTap,
    buttonHoldAction:
      storedRevision < 2 &&
      (value.buttonHoldAction === undefined || value.buttonHoldAction === "paste")
        ? "none"
        : hold,
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
      explicitMask ?? (platform.android && maskWasUnset ? 1 : DEFAULT_SETTINGS.barrelButtonMask),
    primaryContactMode: value.primaryContactMode === "experimental" ? "experimental" : "hover-only",
    stylusTestMode: value.stylusTestMode === true,
    debugMode: value.debugMode === true,
    debugOverlay: value.debugOverlay === true,
    penBridgeEnabled: value.penBridgeEnabled === true,
    penBridgePort: number(value.penBridgePort, 47631, 1024, 65535),
    lateWindowMs: number(
      value.lateWindowMs,
      40,
      NUMERIC_SETTING_LIMITS.lateWindowMs.min,
      NUMERIC_SETTING_LIMITS.lateWindowMs.max
    ),
    midStrokePress: value.midStrokePress === "next-contact" ? "next-contact" : "split",
    eraserStrategy:
      value.eraserStrategy === "set-active-tool" ? "set-active-tool" : "synthetic-button5",
    suppressHoverButtonEvents: value.suppressHoverButtonEvents !== false,
    gestureRevision: 2,
  };
}
