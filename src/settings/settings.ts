export type StylusAction = "menu" | "copy" | "paste" | "none";

export interface StylusControlsSettings {
  buttonTapAction: StylusAction;
  buttonDoubleTapAction: StylusAction;
  buttonHoldAction: StylusAction;
  buttonContactAction: "eraser" | "none";
  doubleTapMs: number;
  longPressMs: number;
  movementThresholdPx: number;
  cleanupStrayDot: boolean;
  debugMode: boolean;
  debugOverlay: boolean;
}

export const DEFAULT_SETTINGS: StylusControlsSettings = {
  buttonTapAction: "menu", buttonDoubleTapAction: "copy", buttonHoldAction: "paste",
  buttonContactAction: "eraser", doubleTapMs: 300, longPressMs: 450,
  movementThresholdPx: 8, cleanupStrayDot: true, debugMode: false, debugOverlay: false,
};

export function normalizeSettings(value: Partial<StylusControlsSettings>): StylusControlsSettings {
  const action = (candidate: unknown, fallback: StylusAction): StylusAction =>
    candidate === "menu" || candidate === "copy" || candidate === "paste" || candidate === "none" ? candidate : fallback;
  const number = (candidate: unknown, fallback: number, min: number, max: number): number =>
    typeof candidate === "number" && Number.isFinite(candidate) ? Math.min(max, Math.max(min, Math.round(candidate))) : fallback;
  return {
    buttonTapAction: action(value.buttonTapAction, DEFAULT_SETTINGS.buttonTapAction),
    buttonDoubleTapAction: action(value.buttonDoubleTapAction, DEFAULT_SETTINGS.buttonDoubleTapAction),
    buttonHoldAction: action(value.buttonHoldAction, DEFAULT_SETTINGS.buttonHoldAction),
    buttonContactAction: value.buttonContactAction === "none" ? "none" : "eraser",
    doubleTapMs: number(value.doubleTapMs, 300, 100, 1000),
    longPressMs: number(value.longPressMs, 450, 150, 2000),
    movementThresholdPx: number(value.movementThresholdPx, 8, 1, 100),
    cleanupStrayDot: value.cleanupStrayDot !== false,
    debugMode: value.debugMode === true,
    debugOverlay: value.debugOverlay === true,
  };
}
