import { afterEach, describe, expect, it, vi } from "vitest";
import { DebugLogger } from "../../src/debug/DebugLogger";
import type { NormalizedStylusEvent } from "../../src/stylus/types";

const event = (timestamp: number): NormalizedStylusEvent => ({
  kind: "move",
  pointerType: "pen",
  pointerId: 1,
  buttons: 2,
  button: -1,
  pressure: 0,
  tangentialPressure: 0,
  tiltX: 0,
  tiltY: 0,
  twist: 0,
  width: 1,
  height: 1,
  x: 0,
  y: 0,
  timestamp,
  isCanvasTarget: true,
});

describe("DebugLogger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("retains rapid raw pen events while applying its bounded buffer", () => {
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const logger = new DebugLogger(() => true);
    logger.event(event(0));
    logger.event(event(1));
    expect(JSON.parse(logger.exportTrace())).toHaveLength(2);

    for (let timestamp = 2; timestamp <= 101; timestamp += 1) logger.event(event(timestamp));
    const trace = JSON.parse(logger.exportTrace()) as NormalizedStylusEvent[];
    expect(trace).toHaveLength(100);
    expect(trace[0]?.timestamp).toBe(2);
    expect(trace.at(-1)?.timestamp).toBe(101);
  });
});
