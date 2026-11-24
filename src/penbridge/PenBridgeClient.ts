import type { Scheduler } from "../stylus/types";
import {
  CLOSE,
  fingerprint,
  newNonce,
  parseServerFrame,
  proof,
  safeEqual,
  type ButtonFrame,
  type HelloFrame,
  type ReadyFrame,
  type SourceFrame,
} from "./protocol";

export type PenBridgeStatus =
  | { state: "off" }
  | { state: "connecting" }
  | { state: "authenticating" }
  | {
      state: "ready";
      source: SourceFrame["state"];
      reason?: string;
      name?: string;
      node?: string;
      fingerprint: string;
    }
  | { state: "failed"; code: number; reason: string };

export interface PenButtonSignal {
  down: boolean;
  seq: number;
  pressedAtPerf: number;
  latencyMs: number | null;
}

export interface BridgeSocket {
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface VisibilitySource {
  state(): "visible" | "hidden";
  subscribe(listener: () => void): () => void;
}

export interface PenBridgeSnapshot {
  status: PenBridgeStatus;
  heartbeatAgeMs: number | null;
  reconnectAttempts: number;
  nextRetryInMs: number | null;
  lastCloseCode: number | null;
  lastCloseReason: string;
  lastButton: {
    down: boolean;
    seq: number;
    latencyMs: number | null;
    clock: "bridge" | "receive";
  } | null;
  appVersion: string | null;
  proto: number | null;
  fingerprint: string | null;
  url: string;
}

export interface PenBridgeClientOptions {
  url: string;
  secret: () => Uint8Array | null;
  clientVersion: string;
  wsFactory?: (url: string) => BridgeSocket;
  now?: () => number;
  perfNow?: () => number;
  scheduler?: Scheduler;
  random?: () => number;
  nonce?: () => string;
  visibility?: VisibilitySource;
  onStatus: (status: PenBridgeStatus) => void;
  onButton: (button: PenButtonSignal) => void;
  onCommand?: (action: "open-menu") => void;
  debug?: (message: string) => void;
}

const BACKOFF_MS = [250, 500, 1000, 2000, 5000];
const WATCHDOG_MS = 3000;

function defaultVisibility(): VisibilitySource {
  return {
    state: () => {
      if (typeof document === "undefined") return "visible";
      return document.visibilityState === "hidden" ? "hidden" : "visible";
    },
    subscribe: (listener) => {
      if (typeof document === "undefined") return () => undefined;
      document.addEventListener("visibilitychange", listener);
      return () => document.removeEventListener("visibilitychange", listener);
    },
  };
}

/** One plugin-wide client for ws://127.0.0.1:<port>/v1/pen. */
export class PenBridgeClient {
  private url: string;
  private demanded = false;
  private failed = false;
  private disposed = false;
  private socket: BridgeSocket | null = null;
  private connection = 0;
  private levelDown = false;
  private lastSeq = -1;
  private attempt = 0;
  private retryTimer: unknown | null = null;
  private watchdog: unknown | null = null;
  private lastFrameAt: number | null = null;
  private reconnectAttempts = 0;
  private nextRetryAt: number | null = null;
  private lastCloseCode: number | null = null;
  private lastCloseReason = "";
  private status: PenBridgeStatus = { state: "off" };
  private hello: HelloFrame | null = null;
  private pendingNonce: string | null = null;
  private fingerprintValue: string | null = null;
  private appVersion: string | null = null;
  private proto: number | null = null;
  private sourceName: string | undefined;
  private sourceNode: string | undefined;
  private sourceReason: string | undefined;
  private sourceState: SourceFrame["state"] | null = null;
  private lastButton: PenBridgeSnapshot["lastButton"] = null;
  private readonly unlisten: () => void;
  private readonly now: () => number;
  private readonly perfNow: () => number;
  private readonly scheduler: Scheduler;
  private readonly random: () => number;
  private readonly nonce: () => string;
  private readonly visibility: VisibilitySource;
  private readonly wsFactory: (url: string) => BridgeSocket;

  constructor(private readonly opts: PenBridgeClientOptions) {
    this.url = opts.url;
    this.now = opts.now ?? (() => Date.now());
    this.perfNow = opts.perfNow ?? (() => performance.now());
    this.scheduler = opts.scheduler ?? {
      setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
      clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
    };
    this.random = opts.random ?? (() => Math.random());
    this.nonce = opts.nonce ?? newNonce;
    this.visibility = opts.visibility ?? defaultVisibility();
    this.wsFactory = opts.wsFactory ?? ((url) => new WebSocket(url) as unknown as BridgeSocket);
    this.unlisten = this.visibility.subscribe(() => this.onVisibility());
  }

  setDemand(wanted: boolean): void {
    this.demanded = wanted;
    if (!wanted) {
      this.clearRetry();
      this.forceUp();
      this.closeSocket(CLOSE.NORMAL, "idle");
      if (!this.failed) this.emitStatus({ state: "off" });
      return;
    }
    if (this.failed || this.hidden() || this.socket) return;
    this.open();
  }

  reconnectNow(): void {
    this.failed = false;
    this.attempt = 0;
    this.clearRetry();
    this.forceUp();
    this.closeSocket(CLOSE.NORMAL, "reconnect");
    if (this.demanded && !this.hidden()) this.open();
  }

  setUrl(url: string): void {
    this.url = url;
  }

  isDown(): boolean {
    return this.status.state === "ready" && this.levelDown;
  }

  isReady(): boolean {
    return this.status.state === "ready";
  }

  snapshot(): PenBridgeSnapshot {
    const now = this.now();
    return {
      status: this.status,
      heartbeatAgeMs:
        this.lastFrameAt === null ? null : Math.max(0, Math.round(now - this.lastFrameAt)),
      reconnectAttempts: this.reconnectAttempts,
      nextRetryInMs:
        this.nextRetryAt === null ? null : Math.max(0, Math.round(this.nextRetryAt - now)),
      lastCloseCode: this.lastCloseCode,
      lastCloseReason: this.lastCloseReason,
      lastButton: this.lastButton,
      appVersion: this.appVersion,
      proto: this.proto,
      fingerprint: this.fingerprintValue,
      url: this.url,
    };
  }

  dispose(): void {
    this.disposed = true;
    this.demanded = false;
    this.clearRetry();
    this.forceUp();
    this.closeSocket(CLOSE.NORMAL, "dispose");
    this.unlisten();
  }

  private hidden(): boolean {
    return this.visibility.state() === "hidden";
  }

  private onVisibility(): void {
    if (this.hidden()) {
      this.clearRetry();
      this.forceUp();
      this.closeSocket(CLOSE.NORMAL, "hidden");
      if (!this.failed) this.emitStatus({ state: "off" });
      return;
    }
    if (!this.demanded || this.failed || this.socket) return;
    this.attempt = 0;
    this.clearRetry();
    this.open();
  }

  private open(): void {
    if (this.socket || this.disposed || !this.demanded || this.failed || this.hidden()) return;
    const connection = ++this.connection;
    this.hello = null;
    this.pendingNonce = null;
    this.emitStatus({ state: "connecting" });
    let socket: BridgeSocket;
    try {
      socket = this.wsFactory(this.url);
    } catch (error) {
      this.opts.debug?.(
        `bridge: socket failed ${error instanceof Error ? error.message : "error"}`
      );
      this.scheduleRetry();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      if (connection !== this.connection) return;
      this.armWatchdog(connection);
    };
    socket.onmessage = (event) => {
      if (connection !== this.connection) return;
      void this.onMessage(connection, event.data);
    };
    socket.onerror = () => {
      if (connection !== this.connection) return;
      this.opts.debug?.("bridge: error event");
    };
    socket.onclose = (event) => {
      if (connection !== this.connection) return;
      this.socket = null;
      this.clearWatchdog();
      this.handleClose(event.code, event.reason);
    };
  }

  private async onMessage(connection: number, data: unknown): Promise<void> {
    if (connection !== this.connection) return;
    this.armWatchdog(connection);
    if (typeof data !== "string") {
      this.opts.debug?.("bridge: ignored non-text frame");
      return;
    }
    const frame = parseServerFrame(data);
    if (!frame) {
      this.opts.debug?.("bridge: ignored malformed frame");
      return;
    }
    if (frame.type === "unknown") return;
    if (frame.type === "hello") {
      await this.onHello(connection, frame);
      return;
    }
    if (frame.type === "ready") {
      await this.onReady(connection, frame);
      return;
    }
    if (this.status.state !== "ready") return;
    if (frame.type === "button") this.onButtonFrame(frame);
    else if (frame.type === "ping") this.onPing(frame.seq, frame.down, frame.sent);
    else if (frame.type === "source") this.onSource(frame);
    else if (frame.type === "command" && frame.action === "open-menu")
      this.opts.onCommand?.("open-menu");
  }

  private async onHello(connection: number, frame: HelloFrame): Promise<void> {
    if (connection !== this.connection) return;
    this.hello = frame;
    this.proto = frame.proto;
    this.appVersion = frame.appVersion;
    this.opts.debug?.(`bridge: hello proto=${frame.proto} app=${frame.appVersion}`);
    if (frame.proto !== 1) {
      this.fail(CLOSE.PROTOCOL, "protocol error");
      return;
    }
    const secret = this.opts.secret();
    if (!secret) {
      this.fail(CLOSE.AUTH, "wrong pairing code");
      return;
    }
    const clientNonce = this.nonce();
    this.pendingNonce = clientNonce;
    const [clientProof, finger] = await Promise.all([
      proof(secret, frame.nonce, clientNonce, "client"),
      fingerprint(secret),
    ]);
    if (connection !== this.connection) return;
    this.fingerprintValue = finger;
    this.emitStatus({ state: "authenticating" });
    this.socket?.send(
      JSON.stringify({
        type: "auth",
        proto: 1,
        client: "excalidraw-stylus-controls",
        clientVersion: this.opts.clientVersion,
        clientNonce,
        proof: clientProof,
      })
    );
  }

  private async onReady(connection: number, frame: ReadyFrame): Promise<void> {
    if (connection !== this.connection || !this.hello || !this.pendingNonce) return;
    const secret = this.opts.secret();
    if (!secret) {
      this.fail(CLOSE.AUTH, "wrong pairing code");
      return;
    }
    const expected = await proof(secret, this.hello.nonce, this.pendingNonce, "server");
    if (connection !== this.connection) return;
    if (!safeEqual(expected, frame.serverProof)) {
      this.opts.debug?.("bridge: bad server proof");
      this.fail(CLOSE.AUTH, "wrong pairing code");
      return;
    }
    this.attempt = 0;
    this.reconnectAttempts = 0;
    this.nextRetryAt = null;
    this.sourceState = frame.source.state;
    this.sourceReason = frame.source.reason;
    this.sourceName = frame.source.name;
    this.sourceNode = frame.source.node;
    this.opts.debug?.(`bridge: ready source=${frame.source.state}`);
    this.emitStatus({
      state: "ready",
      source: frame.source.state,
      reason: frame.source.reason,
      name: frame.source.name,
      node: frame.source.node,
      fingerprint: this.fingerprintValue ?? "",
    });
    this.applyLevel(frame.button.down, frame.button.seq, frame.button.t, true);
    if (frame.source.state === "unavailable") this.forceUp();
  }

  private onButtonFrame(frame: ButtonFrame): void {
    if (frame.seq <= this.lastSeq) return;
    this.applyLevel(frame.down, frame.seq, frame.t, true);
  }

  private onPing(seq: number, down: boolean, sent: number): void {
    this.socket?.send(JSON.stringify({ type: "pong", sent }));
    if (seq > this.lastSeq) this.lastSeq = seq;
    if (down !== this.levelDown) this.applyLevel(down, seq, null, false);
  }

  private onSource(frame: SourceFrame): void {
    this.sourceState = frame.state;
    this.sourceReason = frame.reason;
    this.sourceName = frame.name;
    this.sourceNode = frame.node;
    if (this.status.state === "ready") {
      this.emitStatus({
        state: "ready",
        source: frame.state,
        reason: frame.reason,
        name: frame.name,
        node: frame.node,
        fingerprint: this.fingerprintValue ?? "",
      });
    }
    if (frame.state === "unavailable") this.forceUp();
    this.opts.debug?.(`bridge: source ${frame.state}${frame.reason ? ` ${frame.reason}` : ""}`);
  }

  private applyLevel(
    down: boolean,
    seq: number,
    kernelTime: number | null,
    fromButton: boolean
  ): void {
    if (fromButton && seq <= this.lastSeq) return;
    if (fromButton) this.lastSeq = seq;
    const now = this.now();
    const perf = this.perfNow();
    const reliable = kernelTime !== null && Math.abs(now - kernelTime) <= 1000;
    const signal: PenButtonSignal = {
      down,
      seq,
      pressedAtPerf: reliable && kernelTime !== null ? perf - (now - kernelTime) : perf,
      latencyMs: reliable && kernelTime !== null ? now - kernelTime : null,
    };
    this.levelDown = down;
    this.lastButton = {
      down,
      seq,
      latencyMs: signal.latencyMs,
      clock: signal.latencyMs === null ? "receive" : "bridge",
    };
    this.opts.onButton(signal);
  }

  private forceUp(): void {
    if (!this.levelDown) return;
    this.levelDown = false;
    const signal: PenButtonSignal = {
      down: false,
      seq: this.lastSeq,
      pressedAtPerf: this.perfNow(),
      latencyMs: null,
    };
    this.lastButton = { down: false, seq: this.lastSeq, latencyMs: null, clock: "receive" };
    this.opts.onButton(signal);
  }

  private armWatchdog(connection: number): void {
    this.lastFrameAt = this.now();
    this.clearWatchdog();
    this.watchdog = this.scheduler.setTimeout(() => {
      if (connection !== this.connection) return;
      this.opts.debug?.("bridge: watchdog timeout");
      this.forceUp();
      this.closeSocket(CLOSE.NORMAL, "watchdog");
      if (this.demanded && !this.failed) this.emitStatus({ state: "connecting" });
      this.scheduleRetry();
    }, WATCHDOG_MS);
  }

  private handleClose(code: number, reason: string): void {
    this.lastCloseCode = code;
    this.lastCloseReason = reason;
    this.clearWatchdog();
    this.hello = null;
    this.forceUp();
    if (code === CLOSE.PROTOCOL || code === CLOSE.AUTH) {
      this.failed = true;
      this.clearRetry();
      this.emitStatus({
        state: "failed",
        code,
        reason: code === CLOSE.AUTH ? "wrong pairing code" : reason || "protocol error",
      });
      return;
    }
    if (!this.demanded || this.disposed || this.hidden()) {
      if (!this.failed) this.emitStatus({ state: "off" });
      return;
    }
    this.emitStatus({ state: "connecting" });
    this.scheduleRetry();
  }

  private fail(code: number, reason: string): void {
    this.failed = true;
    this.forceUp();
    this.clearRetry();
    this.lastCloseCode = code;
    this.lastCloseReason = reason;
    this.closeSocket(code, reason);
    this.emitStatus({ state: "failed", code, reason });
  }

  private scheduleRetry(): void {
    if (!this.demanded || this.failed || this.disposed || this.hidden()) return;
    this.clearRetry();
    const base = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)] ?? 5000;
    this.attempt += 1;
    this.reconnectAttempts += 1;
    const jitter = (this.random() * 2 - 1) * 0.2;
    const delay = Math.max(0, Math.round(base * (1 + jitter)));
    this.nextRetryAt = this.now() + delay;
    this.opts.debug?.(`bridge: retry in ${delay} ms`);
    this.retryTimer = this.scheduler.setTimeout(() => {
      this.retryTimer = null;
      this.nextRetryAt = null;
      this.open();
    }, delay);
  }

  private closeSocket(code: number, reason: string): void {
    const socket = this.socket;
    if (!socket) return;
    this.connection += 1;
    this.socket = null;
    this.clearWatchdog();
    this.hello = null;
    try {
      socket.close(code, reason);
    } catch {
      this.opts.debug?.("bridge: close failed");
    }
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) this.scheduler.clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.nextRetryAt = null;
  }

  private clearWatchdog(): void {
    if (this.watchdog !== null) this.scheduler.clearTimeout(this.watchdog);
    this.watchdog = null;
  }

  private emitStatus(status: PenBridgeStatus): void {
    this.status = status;
    this.opts.onStatus(status);
  }
}
