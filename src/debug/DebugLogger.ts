import type { NormalizedStylusEvent } from "../stylus/types";

export class DebugLogger {
  private trace: NormalizedStylusEvent[] = [];
  constructor(private readonly enabled: () => boolean) {}

  event(event: NormalizedStylusEvent): void {
    if (!this.enabled()) return;
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
