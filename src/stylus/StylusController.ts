import type { WorkspaceLeaf } from "obsidian";
import type { ExcalidrawBridge, ActiveToolSnapshot } from "../excalidraw/ExcalidrawBridge";
import type { DebugLogger } from "../debug/DebugLogger";
import type { StylusControlsSettings } from "../settings/settings";
import { normalizePointerEvent } from "./normalizePointerEvent";
import { StylusGestureMachine } from "./StylusGestureMachine";
import type { GestureEffect, Point, Scheduler } from "./types";

export type ActionHandler = (action: "menu" | "copy" | "paste" | "none", point: Point, bridge: ExcalidrawBridge) => void;

export class StylusController {
  private readonly machine: StylusGestureMachine;
  private savedTool: ActiveToolSnapshot | null = null;
  private disposed = false;
  private readonly listeners: Array<[keyof HTMLElementEventMap, EventListener]> = [];

  constructor(
    private readonly leaf: WorkspaceLeaf,
    private readonly bridge: ExcalidrawBridge,
    private readonly settings: () => StylusControlsSettings,
    private readonly debug: DebugLogger,
    private readonly dispatchAction: ActionHandler,
    scheduler: Scheduler = window,
  ) {
    this.machine = new StylusGestureMachine(this.gestureSettings(), scheduler);
    this.machine.setEffectSink((effect) => this.applyEffect(effect));
  }

  attach(): void {
    const element = this.leaf.view.containerEl;
    for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "contextmenu"] as const) {
      const listener: EventListener = (raw) => this.onPointerEvent(raw as PointerEvent);
      element.addEventListener(type, listener, true);
      this.listeners.push([type, listener]);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const [type, listener] of this.listeners) this.leaf.view.containerEl.removeEventListener(type, listener, true);
    this.listeners.length = 0;
    for (const effect of this.machine.dispose()) this.applyEffect(effect);
  }
  getTrace(): string { return this.debug.exportTrace(); }

  private onPointerEvent(raw: PointerEvent): void {
    if (raw.pointerType !== "pen") return;
    const event = normalizePointerEvent(raw, this.leaf.view.containerEl.contains(raw.target as Node));
    this.debug.event(event);
    for (const effect of this.machine.handle(event)) {
      if (effect.type === "suppress-context-menu") raw.preventDefault();
      this.applyEffect(effect);
    }
  }

  private applyEffect(effect: GestureEffect): void {
    switch (effect.type) {
      case "temporary-tool-start":
        if (!this.savedTool) this.savedTool = this.bridge.startTemporaryEraser();
        break;
      case "temporary-tool-end":
        if (this.savedTool) this.bridge.restoreTool(this.savedTool);
        this.savedTool = null;
        break;
      case "button-tap": this.dispatchAction(this.settings().buttonTapAction, effect.point, this.bridge); break;
      case "button-double-tap": this.dispatchAction(this.settings().buttonDoubleTapAction, effect.point, this.bridge); break;
      case "button-hold": this.dispatchAction(this.settings().buttonHoldAction, effect.point, this.bridge); break;
      default: break;
    }
  }

  private gestureSettings() {
    const value = this.settings();
    return { buttonContactAction: value.buttonContactAction, doubleTapMs: value.doubleTapMs, longPressMs: value.longPressMs, movementThresholdPx: value.movementThresholdPx } as const;
  }
}
