import type { NormalizedStylusEvent } from "../stylus/types";

export class DebugLogger {
  private trace: NormalizedStylusEvent[] = [];
  private lastMoveLogAt = -Infinity;
  constructor(private readonly enabled: () => boolean) {}

  event(event: NormalizedStylusEvent): void {
    if (!this.enabled()) return;
    if (event.kind === "move" && event.timestamp - this.lastMoveLogAt < 100) return;
    if (event.kind === "move") this.lastMoveLogAt = event.timestamp;
    this.trace.push(event);
    if (this.trace.length > 100) this.trace.shift();
    console.debug("[Excalidraw Stylus Controls]", event);
  }
  message(message: string): void {
    if (this.enabled()) console.debug("[Excalidraw Stylus Controls]", message);
  }
  exportTrace(): string {
    return JSON.stringify(this.trace, null, 2);
  }
  clear(): void {
    this.trace = [];
  }
}
