import type { GestureEffect, GestureStateSnapshot, NormalizedStylusEvent } from "../stylus/types";

/** A diagnostic-only, non-interactive overlay local to one Excalidraw view. */
export class DebugOverlay {
  private element: HTMLElement | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly enabled: () => boolean
  ) {}

  update(event: NormalizedStylusEvent, state: GestureStateSnapshot, effect?: GestureEffect): void {
    if (!this.enabled()) {
      this.close();
      return;
    }
    const overlay = this.ensureElement();
    const stateSummary = [
      `hover:${String(!state.penContact)}`,
      `barrel:${String(state.barrelButtonHeld)}`,
      `consumed:${String(state.gestureConsumed)}`,
      `temp:${String(state.temporaryToolActive)}`,
    ].join(" · ");
    overlay.setText(
      [
        `S Pen ${event.kind} id:${event.pointerId} button:${event.button} buttons:${event.buttons} pressure:${event.pressure.toFixed(2)}`,
        `tilt:${event.tiltX},${event.tiltY} twist:${event.twist} tangential:${event.tangentialPressure.toFixed(2)} size:${event.width}x${event.height}`,
        stateSummary,
        `effect:${effect?.type ?? "none"}`,
      ].join("\n")
    );
  }

  close(): void {
    this.element?.remove();
    this.element = null;
  }

  private ensureElement(): HTMLElement {
    if (this.element) return this.element;
    this.element = this.container.createDiv({ cls: "excalidraw-stylus-debug-overlay" });
    return this.element;
  }
}
