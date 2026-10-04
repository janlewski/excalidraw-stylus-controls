import type {
    GestureEffect,
    GestureSettings,
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

    constructor(
        private readonly settings: GestureSettings,
        private readonly scheduler: Scheduler,
    ) {}

    handle(event: NormalizedStylusEvent): GestureEffect[] {
        if (event.pointerType !== "pen") return [];
        const effects: GestureEffect[] = [];
        if (event.kind === "contextmenu") {
            if (this.temporaryToolActive || (this.barrelButtonHeld && this.penContact))
                effects.push({ type: "suppress-context-menu" });
            return effects;
        }

        if (event.kind === "down") {
            this.penContact = true;
            this.activePointerId = event.pointerId;
            if (this.barrelButtonHeld) this.consumeForContact(event, effects);
            return effects;
        }

        if (event.kind === "up" || event.kind === "cancel") {
            if (this.activePointerId !== null && event.pointerId !== this.activePointerId)
                return effects;
            this.penContact = false;
            this.activePointerId = null;
            if (this.temporaryToolActive) {
                this.temporaryToolActive = false;
                effects.push({ type: "temporary-tool-end" });
            }
            if (event.kind === "cancel") this.cancelPress();
            return effects;
        }

        // Hover movement is the only evidence used to interpret buttons as barrel state.
        if (this.penContact) return effects;
        const heldNow = (event.buttons & 1) !== 0;
        if (!this.barrelButtonHeld && heldNow) this.startPress(event);
        if (this.barrelButtonHeld && heldNow) this.trackHoverMovement(event);
        if (this.barrelButtonHeld && !heldNow) this.releasePress(effects);
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

    private startPress(event: NormalizedStylusEvent): void {
        this.barrelButtonHeld = true;
        this.consumed = false;
        this.moved = false;
        this.holdFired = false;
        this.pressOrigin = { x: event.x, y: event.y };
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
}
