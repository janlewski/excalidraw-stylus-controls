export type StylusEventKind = "down" | "move" | "up" | "cancel" | "contextmenu";

export interface Point {
  x: number;
  y: number;
}

export interface NormalizedStylusEvent extends Point {
  kind: StylusEventKind;
  pointerType: string;
  pointerId: number;
  buttons: number;
  button: number;
  pressure: number;
  tangentialPressure: number;
  tiltX: number;
  tiltY: number;
  twist: number;
  width: number;
  height: number;
  timestamp: number;
  isCanvasTarget: boolean;
}

export type GestureEffect =
  | { type: "button-tap"; point: Point }
  | { type: "button-double-tap"; point: Point }
  | { type: "button-hold"; point: Point }
  | { type: "temporary-tool-start"; point: Point }
  | { type: "temporary-tool-end" }
  | { type: "suppress-context-menu" }
  | { type: "debug"; message: string };

export interface GestureSettings {
  buttonContactAction: "eraser" | "none";
  doubleTapMs: number;
  longPressMs: number;
  movementThresholdPx: number;
  barrelButtonMask: 1 | 2 | 32;
}

export interface GestureStateSnapshot {
  barrelButtonHeld: boolean;
  penContact: boolean;
  gestureConsumed: boolean;
  temporaryToolActive: boolean;
  hoverGestureMoved: boolean;
  longPressFired: boolean;
  activePointerId: number | null;
}

export interface Scheduler {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}
