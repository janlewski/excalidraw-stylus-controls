const synthetic = new WeakSet<Event>();

export const isSynthetic = (event: Event): boolean => synthetic.has(event);

export interface PointerInitLike {
  pointerId?: number;
  clientX?: number;
  clientY?: number;
  screenX?: number;
  screenY?: number;
  pressure?: number;
  tiltX?: number;
  tiltY?: number;
  twist?: number;
  width?: number;
  height?: number;
}

export function dispatchPointer(
  target: EventTarget,
  type: string,
  from: PointerInitLike,
  over: PointerEventInit
): PointerEvent {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: from.pointerId ?? 1,
    pointerType: "pen",
    isPrimary: true,
    clientX: from.clientX ?? 0,
    clientY: from.clientY ?? 0,
    screenX: from.screenX ?? 0,
    screenY: from.screenY ?? 0,
    pressure: from.pressure ?? 0,
    tiltX: from.tiltX ?? 0,
    tiltY: from.tiltY ?? 0,
    twist: from.twist ?? 0,
    width: from.width ?? 1,
    height: from.height ?? 1,
    ...over,
  });
  synthetic.add(event);
  target.dispatchEvent(event);
  return event;
}
