import type { WorkspaceLeaf } from "obsidian";
import type { ExcalidrawBridge, ActiveToolSnapshot } from "../excalidraw/ExcalidrawBridge";
import type { DebugLogger } from "../debug/DebugLogger";
import { DebugOverlay } from "../debug/DebugOverlay";
import type { StylusControlsSettings } from "../settings/settings";
import { normalizePointerEvent } from "./normalizePointerEvent";
import { StylusGestureMachine } from "./StylusGestureMachine";
import type { GestureEffect, NormalizedStylusEvent, Point, Scheduler } from "./types";

export type ActionHandler = (
  action: "menu" | "copy" | "paste" | "none",
  point: Point,
  bridge: ExcalidrawBridge
) => void;

export class StylusController {
  private readonly machine: StylusGestureMachine;
  private savedTool: ActiveToolSnapshot | null = null;
  private disposed = false;
  private attached = false;
  private readonly listeners: Array<[keyof HTMLElementEventMap, EventListener]> = [];
  private readonly overlay: DebugOverlay;
  private latestEvent: NormalizedStylusEvent | null = null;

  constructor(
    private readonly leaf: WorkspaceLeaf,
    private readonly bridge: ExcalidrawBridge,
    private readonly settings: () => StylusControlsSettings,
    private readonly debug: DebugLogger,
    private readonly dispatchAction: ActionHandler,
    scheduler: Scheduler = window
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
    for (const [type, listener] of this.listeners)
      this.leaf.view.containerEl.removeEventListener(type, listener, true);
    this.listeners.length = 0;
    for (const effect of this.machine.dispose()) this.applyEffect(effect);
    this.overlay.close();
  }
  getTrace(): string {
    return this.debug.exportTrace();
  }

  private onPointerEvent(raw: PointerEvent): void {
    if (raw.pointerType !== "pen") return;
    const event = normalizePointerEvent(
      raw,
      this.leaf.view.containerEl.contains(raw.target as Node)
    );
    this.latestEvent = event;
    this.debug.event(event);
    const effects = this.machine.handle(event);
    if (effects.length === 0) this.overlay.update(event, this.machine.snapshot());
    for (const effect of effects) {
      if (effect.type === "suppress-context-menu") raw.preventDefault();
      this.applyEffect(effect);
    }
  }

  private applyEffect(effect: GestureEffect): void {
    this.debug.message(`effect: ${effect.type}`);
    switch (effect.type) {
      case "temporary-tool-start":
        if (!this.savedTool) {
          const result = this.bridge.startTemporaryEraser();
          if (result.ok) this.savedTool = result.value;
          else this.machine.temporaryToolDidNotStart();
        }
        break;
      case "temporary-tool-end":
        if (this.savedTool) this.bridge.restoreTool(this.savedTool);
        this.savedTool = null;
        break;
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
    if (this.latestEvent) this.overlay.update(this.latestEvent, this.machine.snapshot(), effect);
  }

  private gestureSettings() {
    const value = this.settings();
    return {
      buttonContactAction: value.buttonContactAction,
      doubleTapMs: value.doubleTapMs,
      longPressMs: value.longPressMs,
      movementThresholdPx: value.movementThresholdPx,
    } as const;
  }
}
