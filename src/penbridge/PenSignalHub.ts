import type { ExcalidrawBridge } from "../excalidraw/ExcalidrawBridge";
import type { Point } from "../stylus/types";
import type { PenBridgeClient, PenButtonSignal } from "./PenBridgeClient";

export interface RoutedPenTarget {
  lastPenActivityAt: number;
  onExternalButton(signal: PenButtonSignal): void;
  lastPenPoint(): Point | null;
  bridgeForMenu(): ExcalidrawBridge;
}

const RECENT_MS = 5000;

/** Routes each barrel level to the Excalidraw view the pen was just over. */
export class PenSignalHub {
  private readonly targets = new Set<RoutedPenTarget>();
  private fallback: () => RoutedPenTarget | null = () => null;

  constructor(
    private readonly client: () => Pick<PenBridgeClient, "isReady" | "isDown"> | null,
    private readonly now: () => number = () => performance.now()
  ) {}

  setFallback(fallback: () => RoutedPenTarget | null): void {
    this.fallback = fallback;
  }

  register(target: RoutedPenTarget): void {
    this.targets.add(target);
  }

  unregister(target: RoutedPenTarget): void {
    this.targets.delete(target);
  }

  isReady(): boolean {
    return this.client()?.isReady() ?? false;
  }

  isDown(): boolean {
    return this.client()?.isDown() ?? false;
  }

  dispatch(signal: PenButtonSignal): void {
    this.route()?.onExternalButton(signal);
  }

  route(): RoutedPenTarget | null {
    const now = this.now();
    let best: RoutedPenTarget | null = null;
    for (const target of this.targets) {
      if (now - target.lastPenActivityAt > RECENT_MS) continue;
      if (!best || target.lastPenActivityAt > best.lastPenActivityAt) best = target;
    }
    return best ?? this.fallback();
  }
}
