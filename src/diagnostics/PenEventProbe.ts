import { formatProbeSummary, summarizeProbe, type ProbeEvent } from "./probeSummary";

const EVENT_TYPES = [
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointercancel",
  "contextmenu",
] as const;

/** Settings-pane pad. It keeps the last 50 pointer events and never stores coordinates. */
export class PenEventProbe {
  private readonly events: ProbeEvent[] = [];
  private readonly started = performance.now();
  private readonly box: HTMLElement;
  private readonly summary: HTMLElement;
  private readonly listeners: Array<[string, EventListener]> = [];

  constructor(
    parent: HTMLElement,
    private readonly onChange?: () => void
  ) {
    this.box = parent.createDiv({ cls: "excalidraw-stylus-probe" });
    this.box.setText(
      "Hover the S Pen here, press and release the side button, then touch and draw while pressing it"
    );
    this.summary = parent.createDiv({ cls: "excalidraw-stylus-probe-summary" });
    for (const type of EVENT_TYPES) {
      const listener: EventListener = (event) => this.record(event as PointerEvent);
      this.box.addEventListener(type, listener);
      this.listeners.push([type, listener]);
    }
    this.render();
  }

  snapshot(): ProbeEvent[] {
    return this.events.map((event) => ({ ...event }));
  }

  dispose(): void {
    for (const [type, listener] of this.listeners) this.box.removeEventListener(type, listener);
    this.listeners.length = 0;
    this.box.remove();
    this.summary.remove();
  }

  private record(event: PointerEvent): void {
    if (event.type === "contextmenu") event.preventDefault();
    this.events.push({
      t: Math.max(0, Math.round(performance.now() - this.started)),
      type: event.type,
      pointerType: event.pointerType || "mouse",
      button: event.button,
      buttons: event.buttons,
      pressure: Math.round(event.pressure * 100) / 100,
      phase: event.pressure > 0 ? "contact" : "hover",
    });
    if (this.events.length > 50) this.events.shift();
    this.render();
    this.onChange?.();
  }

  private render(): void {
    this.summary.setText(formatProbeSummary(summarizeProbe(this.events)));
  }
}
