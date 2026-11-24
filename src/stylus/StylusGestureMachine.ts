import type {
  BarrelSource,
  ExternalButtonInput,
  GestureEffect,
  GestureSettings,
  GestureStateSnapshot,
  NormalizedStylusEvent,
  Point,
  Scheduler,
} from "./types";

interface PendingTap {
  point: Point;
  timer: unknown;
}

/** Pure per-view S Pen gesture policy. It never touches the DOM or Excalidraw. */
export class StylusGestureMachine {
  private barrelButtonHeld = false;
  private penContact = false;
  private consumed = false;
  private moved = false;
  private holdFired = false;
  private temporaryToolActive = false;
  private pressOrigin: Point | null = null;
  private holdTimer: unknown | null = null;
  private pendingTap: PendingTap | null = null;
  private activePointerId: number | null = null;
  private barrelSource: BarrelSource = "pointer";
  private contactStartedAt: number | null = null;
  private lastPoint: Point | null = null;
  private releaseAfterContact = false;

  constructor(
    private readonly settings: GestureSettings,
    private readonly scheduler: Scheduler
  ) {}

  /** Switching sources must not turn a held barrel into a tap. */
  setBarrelSource(source: BarrelSource): void {
    if (source === this.barrelSource) return;
    if (this.barrelButtonHeld) this.cancelPress();
    this.barrelSource = source;
    this.releaseAfterContact = false;
  }

  handle(event: NormalizedStylusEvent): GestureEffect[] {
    if (event.pointerType !== "pen") return [];
    this.lastPoint = { x: event.x, y: event.y };
    const effects: GestureEffect[] = [];
    if (event.kind === "contextmenu") {
      if (this.temporaryToolActive || (this.barrelButtonHeld && this.penContact))
        effects.push({ type: "suppress-context-menu" });
      return effects;
    }

    if (event.kind === "down") {
      this.contactStartedAt = event.timestamp;
      if (this.barrelSource !== "bridge") {
        if (!this.barrelButtonHeld && this.canRecognizeBarrelOnContact(event))
          this.startPress(event);
      }
      this.penContact = true;
      this.activePointerId = event.pointerId;
      if (this.barrelButtonHeld) this.consumeForContact(event, effects);
      return effects;
    }

    if (event.kind === "up" || event.kind === "cancel") {
      if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return effects;
      this.penContact = false;
      this.activePointerId = null;
      this.contactStartedAt = null;
      if (this.temporaryToolActive) {
        this.temporaryToolActive = false;
        effects.push({ type: "temporary-tool-end" });
      }
      if (event.kind === "cancel") this.cancelPress();
      else if (this.barrelSource === "bridge") {
        if (this.releaseAfterContact) {
          this.releaseAfterContact = false;
          this.releasePress(effects);
        }
      } else if (!this.hoverLatch() && !this.isBarrelHeld(event)) this.releasePress(effects);
      return effects;
    }

    if (this.penContact) return effects;
    if (this.barrelSource === "bridge") {
      if (this.barrelButtonHeld) this.trackHoverMovement(event);
      return effects;
    }
    const heldNow = this.isBarrelHeld(event);
    if (!this.barrelButtonHeld && heldNow) this.startPress(event);
    if (this.barrelButtonHeld && heldNow) this.trackHoverMovement(event);
    if (this.barrelButtonHeld && !heldNow) this.releasePress(effects);
    return effects;
  }

  handleExternalButton(input: ExternalButtonInput): GestureEffect[] {
    if (this.barrelSource !== "bridge") return [];
    if (input.down) {
      if (this.barrelButtonHeld) return [];
      if (!this.penContact) {
        this.startPress(this.pointOf(this.lastPoint));
        return [];
      }
      this.barrelButtonHeld = true;
      this.consumed = true;
      this.cancelTimer("hold");
      this.cancelPendingTap();
      if (this.settings.buttonContactAction !== "eraser" || this.temporaryToolActive) return [];
      if (this.settings.midStrokePress === "next-contact") return [];
      const late =
        this.contactStartedAt !== null &&
        input.pressedAt <= this.contactStartedAt + this.settings.lateWindowMs;
      this.temporaryToolActive = true;
      return [
        {
          type: "temporary-tool-split",
          point: this.pointOf(this.lastPoint),
          discardStroke: late,
        },
      ];
    }
    if (!this.barrelButtonHeld) return [];
    if (this.penContact) {
      this.releaseAfterContact = true;
      return [];
    }
    const effects: GestureEffect[] = [];
    this.releasePress(effects);
    return effects;
  }

  dispose(): GestureEffect[] {
    const effects: GestureEffect[] = [];
    this.cancelTimer("hold");
    this.cancelPendingTap();
    if (this.temporaryToolActive) effects.push({ type: "temporary-tool-end" });
    this.temporaryToolActive = false;
    this.cancelPress();
    return effects;
  }

  snapshot(): GestureStateSnapshot {
    return {
      barrelButtonHeld: this.barrelButtonHeld,
      penContact: this.penContact,
      gestureConsumed: this.consumed,
      temporaryToolActive: this.temporaryToolActive,
      hoverGestureMoved: this.moved,
      longPressFired: this.holdFired,
      activePointerId: this.activePointerId,
    };
  }

  /** The controller calls this when the optional Excalidraw bridge rejects a start request. */
  temporaryToolDidNotStart(): void {
    this.temporaryToolActive = false;
  }

  private startPress(origin: NormalizedStylusEvent | Point): void {
    const point = "kind" in origin ? { x: origin.x, y: origin.y } : origin;
    this.barrelButtonHeld = true;
    this.consumed = false;
    this.moved = false;
    this.holdFired = false;
    this.pressOrigin = point;
    this.holdTimer = this.scheduler.setTimeout(() => {
      if (
        !this.barrelButtonHeld ||
        this.penContact ||
        this.moved ||
        this.consumed ||
        !this.pressOrigin
      )
        return;
      this.holdFired = true;
      this.consumed = true;
      this.cancelPendingTap();
      this.onEffect?.({ type: "button-hold", point: this.pressOrigin });
    }, this.settings.longPressMs);
  }

  /** Controller registers this so scheduler callbacks retain pure semantic output. */
  private onEffect: ((effect: GestureEffect) => void) | null = null;
  setEffectSink(sink: (effect: GestureEffect) => void): void {
    this.onEffect = sink;
  }

  private trackHoverMovement(event: NormalizedStylusEvent): void {
    if (!this.pressOrigin || this.moved) return;
    const dx = event.x - this.pressOrigin.x;
    const dy = event.y - this.pressOrigin.y;
    if (Math.hypot(dx, dy) > this.settings.movementThresholdPx) {
      this.moved = true;
      this.cancelTimer("hold");
    }
  }

  private consumeForContact(event: NormalizedStylusEvent, effects: GestureEffect[]): void {
    this.consumed = true;
    this.cancelTimer("hold");
    this.cancelPendingTap();
    if (this.settings.buttonContactAction === "eraser" && !this.temporaryToolActive) {
      this.temporaryToolActive = true;
      effects.push({ type: "temporary-tool-start", point: { x: event.x, y: event.y } });
    }
  }

  private releasePress(effects: GestureEffect[]): void {
    this.cancelTimer("hold");
    this.barrelButtonHeld = false;
    if (!this.consumed && !this.moved && !this.holdFired && this.pressOrigin) {
      if (this.pendingTap) {
        this.cancelPendingTap();
        effects.push({ type: "button-double-tap", point: this.pressOrigin });
      } else {
        const point = this.pressOrigin;
        const timer = this.scheduler.setTimeout(() => {
          this.pendingTap = null;
          this.onEffect?.({ type: "button-tap", point });
        }, this.settings.doubleTapMs);
        this.pendingTap = { point, timer };
      }
    }
    this.pressOrigin = null;
  }

  private cancelPress(): void {
    this.cancelTimer("hold");
    this.barrelButtonHeld = false;
    this.penContact = false;
    this.consumed = false;
    this.moved = false;
    this.holdFired = false;
    this.pressOrigin = null;
    this.activePointerId = null;
    this.releaseAfterContact = false;
  }

  private cancelTimer(which: "hold"): void {
    if (which === "hold" && this.holdTimer !== null) {
      this.scheduler.clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  private cancelPendingTap(): void {
    if (this.pendingTap) this.scheduler.clearTimeout(this.pendingTap.timer);
    this.pendingTap = null;
  }

  private isBarrelHeld(event: NormalizedStylusEvent): boolean {
    return (event.buttons & this.settings.barrelButtonMask) !== 0;
  }

  private canRecognizeBarrelOnContact(event: NormalizedStylusEvent): boolean {
    return (
      (this.settings.barrelButtonMask !== 1 ||
        this.settings.primaryContactMode === "experimental") &&
      this.isBarrelHeld(event)
    );
  }

  private hoverLatch(): boolean {
    return (
      this.barrelSource === "pointer" &&
      this.settings.barrelButtonMask === 1 &&
      this.settings.primaryContactMode === "hover-only"
    );
  }

  private pointOf(point: Point | null): Point {
    return point ? { x: point.x, y: point.y } : { x: 0, y: 0 };
  }
}
