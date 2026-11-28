import type { WorkspaceLeaf } from "obsidian";
import type { ExcalidrawBridge, ActiveToolSnapshot } from "../excalidraw/ExcalidrawBridge";
import type { DebugLogger } from "../debug/DebugLogger";
import { DebugOverlay } from "../debug/DebugOverlay";
import type { PenButtonSignal } from "../penbridge/PenBridgeClient";
import type { PenSignalHub } from "../penbridge/PenSignalHub";
import {
  describeBarrelSource,
  type StylusAction,
  type StylusControlsSettings,
} from "../settings/settings";
import { isSynthetic } from "../excalidraw/syntheticPointer";
import { classifyPenEvent, normalizePointerEvent } from "./normalizePointerEvent";
import { StylusGestureMachine } from "./StylusGestureMachine";
import type { GestureEffect, NormalizedStylusEvent, Point, Scheduler } from "./types";

export type ActionHandler = (action: StylusAction, point: Point, bridge: ExcalidrawBridge) => void;

export class StylusController {
  private readonly machine: StylusGestureMachine;
  private savedTool: ActiveToolSnapshot | null = null;
  private disposed = false;
  private attached = false;
  private readonly listeners: Array<[keyof HTMLElementEventMap, EventListener]> = [];
  private readonly overlay: DebugOverlay;
  private latestEvent: NormalizedStylusEvent | null = null;
  private lastPenEvent: PointerEvent | null = null;
  private lastPointerWasPen = false;
  private priorSceneIds: ReadonlySet<string> | null = null;
  lastPenActivityAt = 0;
  private lastLatency: string | null = null;

  constructor(
    private readonly leaf: WorkspaceLeaf,
    private readonly bridge: ExcalidrawBridge,
    private readonly settings: () => StylusControlsSettings,
    private readonly debug: DebugLogger,
    private readonly dispatchAction: ActionHandler,
    private readonly scheduler: Scheduler = window,
    private readonly pen: PenSignalHub | null = null,
    private readonly now: () => number = () => performance.now()
  ) {
    this.machine = new StylusGestureMachine(this.gestureSettings(), scheduler);
    this.machine.setEffectSink((effect) => this.applyEffect(effect));
    this.overlay = new DebugOverlay(
      this.leaf.view.containerEl,
      () => this.settings().debugMode && this.settings().debugOverlay
    );
  }

  attach(): void {
    if (this.disposed || this.attached) return;
    this.attached = true;
    this.pen?.register(this);
    const element = this.leaf.view.containerEl;
    for (const type of [
      "pointerdown",
      "pointermove",
      "pointerup",
      "pointercancel",
      "contextmenu",
    ] as const) {
      const listener: EventListener = (raw) => this.onPointerEvent(raw as PointerEvent);
      element.addEventListener(type, listener, true);
      this.listeners.push([type, listener]);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.attached = false;
    this.pen?.unregister(this);
    for (const [type, listener] of this.listeners)
      this.leaf.view.containerEl.removeEventListener(type, listener, true);
    this.listeners.length = 0;
    for (const effect of this.machine.dispose()) this.applyEffect(effect);
    this.overlay.close();
  }
  getTrace(): string {
    return this.debug.exportTrace();
  }
  recentMessages(): string[] {
    return this.debug.recentMessages();
  }
  lastPenPoint(): Point | null {
    if (!this.latestEvent) return null;
    return { x: this.latestEvent.x, y: this.latestEvent.y };
  }
  bridgeForMenu(): ExcalidrawBridge {
    return this.bridge;
  }

  onExternalButton(signal: PenButtonSignal): void {
    const latency =
      signal.latencyMs === null ? "receive-time" : `${Math.round(signal.latencyMs)}ms`;
    this.lastLatency = latency;
    this.debug.message(
      `bridge: ${signal.down ? "down" : "up"} seq=${signal.seq} latency=${latency}`
    );
    this.machine.setBarrelSource("bridge");
    for (const effect of this.machine.handleExternalButton({
      down: signal.down,
      pressedAt: signal.pressedAtPerf,
    })) {
      this.applyEffect(effect);
    }
    this.refreshOverlay();
  }

  private onPointerEvent(raw: PointerEvent): void {
    if (isSynthetic(raw)) return;
    if (raw.type === "contextmenu") {
      this.onContextMenu(raw);
      return;
    }
    if (raw.pointerType !== "pen") {
      this.lastPointerWasPen = false;
      return;
    }
    this.lastPointerWasPen = true;
    this.lastPenEvent = raw;
    this.lastPenActivityAt = this.now();
    const held = this.barrelBelievedHeld(raw);
    const phase = classifyPenEvent(raw, held);
    if (phase === "hover-button" && this.settings().suppressHoverButtonEvents) {
      if (typeof raw.stopImmediatePropagation === "function") raw.stopImmediatePropagation();
      raw.preventDefault();
    }
    const event = normalizePointerEvent(
      raw,
      this.leaf.view.containerEl.contains(raw.target as Node)
    );
    if (phase === "hover-button") event.kind = "move";
    this.latestEvent = event;
    this.debug.event(event);
    if (event.kind === "down") this.priorSceneIds = this.bridge.currentSceneIds();
    this.machine.setBarrelSource(this.pen?.isReady() ? "bridge" : "pointer");
    const effects = this.machine.handle(event);
    if (effects.length === 0) this.refreshOverlay(event);
    for (const effect of effects) this.applyEffect(effect, raw);
  }

  /**
   * Android delivers the barrel button as a MouseEvent contextmenu, often with
   * no pointerType. That is the right-click Samsung Notes does not use for erase.
   */
  private onContextMenu(raw: PointerEvent): void {
    const pointerType = raw.pointerType;
    if (pointerType === "mouse" || pointerType === "touch") return;
    if (pointerType !== "pen" && !this.lastPointerWasPen) return;
    const event = normalizePointerEvent(
      raw,
      this.leaf.view.containerEl.contains(raw.target as Node)
    );
    event.pointerType = "pen";
    event.kind = "contextmenu";
    this.machine.setBarrelSource(this.pen?.isReady() ? "bridge" : "pointer");
    for (const effect of this.machine.handle(event)) {
      if (effect.type === "suppress-context-menu") this.blockContextMenu(raw);
      this.applyEffect(effect, raw);
    }
  }

  private blockContextMenu(raw: Event): void {
    raw.preventDefault();
    raw.stopPropagation();
    if (typeof raw.stopImmediatePropagation === "function") raw.stopImmediatePropagation();
  }

  private applyEffect(effect: GestureEffect, raw?: PointerEvent): void {
    this.debug.message(`effect: ${effect.type}`);
    if (this.settings().stylusTestMode) {
      this.debug.message(`test mode suppressed: ${effect.type}`);
      this.refreshOverlay();
      return;
    }
    switch (effect.type) {
      case "temporary-tool-start":
        if (!this.savedTool) {
          const synthetic =
            this.settings().eraserStrategy === "synthetic-button5" && raw?.type === "pointerdown";
          const result =
            synthetic && raw
              ? this.bridge.beginMomentaryEraser(raw)
              : this.bridge.startTemporaryEraser();
          if (result.ok) this.savedTool = result.value;
          else this.machine.temporaryToolDidNotStart();
        }
        break;
      case "temporary-tool-split": {
        const event = this.lastPenEvent ?? raw;
        if (!event) break;
        const result =
          this.settings().eraserStrategy === "synthetic-button5"
            ? this.bridge.splitStrokeToEraser(event, effect.discardStroke)
            : this.bridge.splitStrokeWithActiveTool(event);
        if (result.ok) this.savedTool = result.value;
        else this.machine.temporaryToolDidNotStart();
        break;
      }
      case "temporary-tool-end":
        if (this.savedTool) {
          if (this.settings().eraserStrategy === "synthetic-button5") {
            this.bridge.endMomentaryEraser(this.savedTool);
          } else this.bridge.restoreTool(this.savedTool);
        }
        this.savedTool = null;
        break;
      case "erase-tap": {
        const prior = this.priorSceneIds;
        const point = effect.point;
        this.scheduler.setTimeout(() => {
          if (this.disposed) return;
          this.bridge.eraseStrokeAt(point, prior);
        }, 0);
        break;
      }
      case "button-tap":
        this.dispatchAction(this.settings().buttonTapAction, effect.point, this.bridge);
        break;
      case "button-double-tap":
        this.dispatchAction(this.settings().buttonDoubleTapAction, effect.point, this.bridge);
        break;
      case "button-hold":
        this.dispatchAction(this.settings().buttonHoldAction, effect.point, this.bridge);
        break;
      default:
        break;
    }
    this.refreshOverlay(this.latestEvent, effect);
  }

  private refreshOverlay(
    event: NormalizedStylusEvent | null = this.latestEvent,
    effect?: GestureEffect
  ): void {
    if (!event) return;
    this.overlay.update(event, this.machine.snapshot(), effect, this.statusLine());
  }

  private statusLine(): string {
    const source = describeBarrelSource(this.settings(), this.pen?.isReady() === true);
    const down = this.pen?.isDown() === true;
    const latency = this.lastLatency ? ` latency:${this.lastLatency}` : "";
    return `source:${source} down:${String(down)}${latency}`;
  }

  private barrelBelievedHeld(raw: PointerEvent): boolean {
    if (this.pen?.isReady()) return this.pen.isDown();
    if (this.machine.snapshot().barrelButtonHeld) return true;
    const settings = this.settings();
    return (
      settings.barrelButtonMask === 1 &&
      settings.primaryContactMode === "hover-only" &&
      raw.pressure < 0.01 &&
      (raw.buttons & 1) !== 0
    );
  }

  private gestureSettings() {
    const value = this.settings();
    return {
      buttonContactAction: value.buttonContactAction,
      doubleTapMs: value.doubleTapMs,
      longPressMs: value.longPressMs,
      movementThresholdPx: value.movementThresholdPx,
      barrelButtonMask: value.barrelButtonMask,
      primaryContactMode: value.primaryContactMode,
      lateWindowMs: value.lateWindowMs,
      midStrokePress: value.midStrokePress,
    } as const;
  }
}
