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

interface RecentContact {
  startedAt: number;
  endedAt: number;
  point: Point;
  moved: boolean;
  barrel: boolean;
}

const CONTEXT_MENU_GRACE_MS = 500;
/** A barrel press this long before the tap still belongs to that tap when the packet is late. */
const LATE_PRESS_LEAD_MS = 300;
const CLOCK_SKEW_MS = 20;

/** Pure per-view S Pen gesture policy. It never touches the DOM or Excalidraw. */
export class StylusGestureMachine {
  private barrelButtonHeld = false;
  private penContact = false;
  private consumed = false;
  private moved = false;
  private holdFired = false;
  private temporaryToolActive = false;
  private pressOrigin: Point | null = null;
  private pendingTap: PendingTap | null = null;
  private activePointerId: number | null = null;
  private barrelSource: BarrelSource = "pointer";
  private contactStartedAt: number | null = null;
  private contactOrigin: Point | null = null;
  private contactMoved = false;
  private barrelContact = false;
  private barrelAtDown = false;
  private contextMenuUntil = -1;
  private pressStartedAt: number | null = null;
  private lastPoint: Point | null = null;
  private releaseAfterContact = false;
  private recentContact: RecentContact | null = null;

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
      if (this.shouldSwallowContextMenu(event)) effects.push({ type: "suppress-context-menu" });
      return effects;
    }

    if (event.kind === "down") {
      this.contactStartedAt = event.timestamp;
      this.contactOrigin = { x: event.x, y: event.y };
      this.contactMoved = false;
      this.barrelContact = false;
      if (this.barrelSource !== "bridge") {
        if (!this.barrelButtonHeld && this.canRecognizeBarrelOnContact(event))
          this.startPress(event, event.timestamp);
      }
      this.barrelAtDown = this.barrelButtonHeld;
      this.penContact = true;
      this.activePointerId = event.pointerId;
      if (this.barrelButtonHeld) this.consumeForContact(event, effects);
      return effects;
    }

    if (event.kind === "up" || event.kind === "cancel") {
      if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return effects;
      const startedAt = this.contactStartedAt ?? event.timestamp;
      const point = this.contactOrigin ?? { x: event.x, y: event.y };
      const moved = this.contactMoved;
      const barrelContact = this.barrelContact;
      const barrelAtDown = this.barrelAtDown;
      this.penContact = false;
      this.activePointerId = null;
      this.contactStartedAt = null;
      this.contactOrigin = null;
      this.contactMoved = false;
      this.barrelContact = false;
      this.barrelAtDown = false;
      if (this.temporaryToolActive) {
        this.temporaryToolActive = false;
        effects.push({ type: "temporary-tool-end" });
      }
      const eraseThisContact =
        barrelAtDown || (barrelContact && this.settings.midStrokePress !== "next-contact");
      if (
        event.kind === "up" &&
        eraseThisContact &&
        !moved &&
        this.settings.buttonContactAction === "eraser"
      ) {
        effects.push({ type: "erase-tap", point });
      }
      if (event.kind === "up" && barrelContact) this.armContextMenu(event.timestamp);
      if (event.kind === "up") {
        this.recentContact = {
          startedAt,
          endedAt: event.timestamp,
          point,
          moved,
          barrel: barrelContact,
        };
      }
      if (event.kind === "cancel") this.cancelPress();
      else if (this.barrelSource === "bridge") {
        if (this.releaseAfterContact) {
          this.releaseAfterContact = false;
          this.releasePress(effects, event.timestamp);
        }
      } else if (!this.hoverLatch() && !this.isBarrelHeld(event))
        this.releasePress(effects, event.timestamp);
      return effects;
    }

    if (this.penContact) {
      this.trackContactMovement(event);
      return effects;
    }
    if (this.barrelSource === "bridge") {
      if (this.barrelButtonHeld) this.trackHoverMovement(event);
      return effects;
    }
    const heldNow = this.isBarrelHeld(event);
    if (!this.barrelButtonHeld && heldNow) this.startPress(event, event.timestamp);
    if (this.barrelButtonHeld && heldNow) this.trackHoverMovement(event);
    if (this.barrelButtonHeld && !heldNow) this.releasePress(effects, event.timestamp);
    return effects;
  }

  handleExternalButton(input: ExternalButtonInput): GestureEffect[] {
    if (this.barrelSource !== "bridge") return [];
    if (input.down) {
      if (this.barrelButtonHeld) return [];
      if (!this.penContact) {
        const late = this.claimLateTap(input.pressedAt);
        if (late) return late;
        this.startPress(this.pointOf(this.lastPoint), input.pressedAt);
        return [];
      }
      this.barrelButtonHeld = true;
      this.consumed = true;
      this.barrelContact = this.settings.buttonContactAction === "eraser";
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
    this.releasePress(effects, input.pressedAt);
    return effects;
  }

  dispose(): GestureEffect[] {
    const effects: GestureEffect[] = [];
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

  private startPress(origin: NormalizedStylusEvent | Point, at: number): void {
    const point = "kind" in origin ? { x: origin.x, y: origin.y } : origin;
    this.barrelButtonHeld = true;
    this.consumed = false;
    this.moved = false;
    this.holdFired = false;
    this.pressOrigin = point;
    this.pressStartedAt = at;
  }

  /** Controller registers this so scheduler callbacks retain pure semantic output. */
  private onEffect: ((effect: GestureEffect) => void) | null = null;
  setEffectSink(sink: (effect: GestureEffect) => void): void {
    this.onEffect = sink;
  }

  private trackContactMovement(event: NormalizedStylusEvent): void {
    if (!this.contactOrigin || this.contactMoved) return;
    const dx = event.x - this.contactOrigin.x;
    const dy = event.y - this.contactOrigin.y;
    if (Math.hypot(dx, dy) > this.settings.movementThresholdPx) this.contactMoved = true;
  }

  private trackHoverMovement(event: NormalizedStylusEvent): void {
    if (!this.pressOrigin || this.moved) return;
    const dx = event.x - this.pressOrigin.x;
    const dy = event.y - this.pressOrigin.y;
    if (Math.hypot(dx, dy) > this.settings.movementThresholdPx) this.moved = true;
  }

  private consumeForContact(event: NormalizedStylusEvent, effects: GestureEffect[]): void {
    this.consumed = true;
    this.barrelContact = this.settings.buttonContactAction === "eraser";
    this.cancelPendingTap();
    if (this.settings.buttonContactAction === "eraser" && !this.temporaryToolActive) {
      this.temporaryToolActive = true;
      effects.push({ type: "temporary-tool-start", point: { x: event.x, y: event.y } });
    }
  }

  private releasePress(effects: GestureEffect[], at: number): void {
    const elapsed = this.pressStartedAt === null ? 0 : at - this.pressStartedAt;
    const heldLong = elapsed >= this.settings.longPressMs;
    this.barrelButtonHeld = false;
    this.pressStartedAt = null;
    if (!this.consumed && !this.moved && !this.holdFired && this.pressOrigin && heldLong) {
      this.holdFired = true;
      this.consumed = true;
      this.cancelPendingTap();
      effects.push({ type: "button-hold", point: this.pressOrigin });
    } else if (!this.consumed && !this.moved && !this.holdFired && this.pressOrigin) {
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
    this.barrelButtonHeld = false;
    this.penContact = false;
    this.consumed = false;
    this.moved = false;
    this.holdFired = false;
    this.pressOrigin = null;
    this.pressStartedAt = null;
    this.contactOrigin = null;
    this.contactMoved = false;
    this.barrelContact = false;
    this.barrelAtDown = false;
    this.recentContact = null;
    this.activePointerId = null;
    this.releaseAfterContact = false;
  }

  /**
   * A barrel packet can arrive after the tap it belongs to. Claim it only when
   * the press time overlaps that contact, so a later hover click still opens
   * the menu.
   */
  private claimLateTap(pressedAt: number): GestureEffect[] | null {
    const recent = this.recentContact;
    if (!recent || recent.barrel) return null;
    if (pressedAt < recent.startedAt - LATE_PRESS_LEAD_MS) return null;
    if (pressedAt > recent.endedAt + CLOCK_SKEW_MS) return null;
    recent.barrel = true;
    this.barrelButtonHeld = true;
    this.consumed = true;
    this.pressOrigin = recent.point;
    this.pressStartedAt = pressedAt;
    this.cancelPendingTap();
    this.armContextMenu(recent.endedAt);
    if (recent.moved || this.settings.buttonContactAction !== "eraser") return [];
    return [{ type: "erase-tap", point: recent.point }];
  }

  private shouldSwallowContextMenu(event: NormalizedStylusEvent): boolean {
    if (event.button === 2) return true;
    if (this.temporaryToolActive || this.barrelContact) return true;
    if (this.barrelButtonHeld && this.penContact) return true;
    return event.timestamp <= this.contextMenuUntil;
  }

  private armContextMenu(at: number): void {
    this.contextMenuUntil = Math.max(this.contextMenuUntil, at + CONTEXT_MENU_GRACE_MS);
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
