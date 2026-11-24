import type { NormalizedStylusEvent, StylusEventKind } from "./types";

export type PenPhase = "contact" | "hover" | "hover-button";

/** Hover-button events are zero-pressure pen events with the primary bit while the barrel is held. */
export function classifyPenEvent(
  event: { pointerType: string; pressure: number; buttons: number; type: string },
  held: boolean
): PenPhase {
  const hoverPressure = event.pressure < 0.01;
  const buttonType =
    event.type === "pointerdown" || event.type === "pointermove" || event.type === "pointerup";
  if (
    event.pointerType === "pen" &&
    hoverPressure &&
    (event.buttons & 1) !== 0 &&
    buttonType &&
    held
  ) {
    return "hover-button";
  }
  if (event.pointerType === "pen" && (event.type === "pointerdown" || event.pressure >= 0.01)) {
    return "contact";
  }
  return "hover";
}

const eventKinds: Record<string, StylusEventKind> = {
  pointerdown: "down",
  pointermove: "move",
  pointerup: "up",
  pointercancel: "cancel",
  contextmenu: "contextmenu",
};

export function normalizePointerEvent(
  event: PointerEvent,
  isCanvasTarget: boolean
): NormalizedStylusEvent {
  return {
    kind: eventKinds[event.type] ?? "move",
    pointerType: event.pointerType,
    pointerId: event.pointerId,
    buttons: event.buttons,
    button: event.button,
    pressure: event.pressure,
    tangentialPressure: event.tangentialPressure,
    tiltX: event.tiltX,
    tiltY: event.tiltY,
    twist: event.twist,
    width: event.width,
    height: event.height,
    x: event.clientX,
    y: event.clientY,
    timestamp: event.timeStamp,
    isCanvasTarget,
  };
}
