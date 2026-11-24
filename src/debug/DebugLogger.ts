import type { NormalizedStylusEvent } from "../stylus/types";

export class DebugLogger {
  private trace: NormalizedStylusEvent[] = [];
  private messages: string[] = [];
  constructor(
    private readonly enabled: () => boolean,
    private readonly retainMessages = false
  ) {}

  event(event: NormalizedStylusEvent): void {
    if (!this.enabled()) return;
    this.trace.push(event);
    if (this.trace.length > 100) this.trace.shift();
    console.debug("[Excalidraw Stylus Controls]", event);
  }
  message(message: string): void {
    if (this.retainMessages || this.enabled()) {
      this.messages.push(message);
      if (this.messages.length > 200) this.messages.shift();
    }
    if (this.enabled()) console.debug("[Excalidraw Stylus Controls]", message);
  }
  recentMessages(limit = 100): string[] {
    return this.messages.slice(-limit);
  }
  exportTrace(): string {
    return JSON.stringify(this.trace, null, 2);
  }
  clear(): void {
    this.trace = [];
  }
}
