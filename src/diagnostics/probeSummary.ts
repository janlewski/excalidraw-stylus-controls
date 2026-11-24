export interface ProbeEvent {
  t: number;
  type: string;
  pointerType: string;
  button: number;
  buttons: number;
  pressure: number;
  phase: "contact" | "hover";
}

export interface ProbeSummary {
  penSeen: boolean;
  hoverButtons: number[];
  contactButtons: number[];
  downButtons: number[];
  eraserSeen: boolean;
  contextMenuFromPen: boolean;
}

function unique(values: number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

export function summarizeProbe(events: readonly ProbeEvent[]): ProbeSummary {
  const pen = events.filter((event) => event.pointerType === "pen");
  return {
    penSeen: pen.length > 0,
    hoverButtons: unique(
      pen.filter((event) => event.phase === "hover").map((event) => event.buttons)
    ),
    contactButtons: unique(
      pen.filter((event) => event.phase === "contact").map((event) => event.buttons)
    ),
    downButtons: unique(
      pen.filter((event) => event.type === "pointerdown").map((event) => event.button)
    ),
    eraserSeen: pen.some((event) => event.button === 5 || (event.buttons & 32) !== 0),
    contextMenuFromPen: pen.some((event) => event.type === "contextmenu"),
  };
}

function brace(values: number[]): string {
  return `{${values.join(", ")}}`;
}

export function formatProbeSummary(summary: ProbeSummary): string {
  return [
    `Pen seen: ${summary.penSeen ? "yes" : "no"}`,
    `buttons values while hovering: ${brace(summary.hoverButtons)}`,
    `buttons values while touching: ${brace(summary.contactButtons)}`,
    `button values on down: ${brace(summary.downButtons)}`,
    `eraser end (button 5 / buttons 32) seen: ${summary.eraserSeen ? "yes" : "no"}`,
    `context menu from pen: ${summary.contextMenuFromPen ? "yes" : "no"}`,
  ].join("\n");
}
