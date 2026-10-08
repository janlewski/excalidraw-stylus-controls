import type { NormalizedStylusEvent, StylusEventKind } from "./types";

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
    x: event.clientX,
    y: event.clientY,
    timestamp: event.timeStamp,
    isCanvasTarget,
  };
}
