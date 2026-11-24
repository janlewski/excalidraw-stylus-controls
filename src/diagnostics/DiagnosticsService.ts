import { Modal, Notice, Platform, apiVersion, requestUrl, type App } from "obsidian";
import { ExcalidrawBridge } from "../excalidraw/ExcalidrawBridge";
import {
  getGlobalAutomate,
  getLeafApi,
  hasNewElementField,
  readActiveTool,
  readInstalledExcalidraw,
  toolCapabilities,
} from "../excalidraw/compatibility";
import type { PenBridgeSnapshot } from "../penbridge/PenBridgeClient";
import {
  CLOSE,
  decodePairingCode,
  newNonce,
  parseServerFrame,
  proof,
  safeEqual,
  type HelloFrame,
} from "../penbridge/protocol";
import {
  describeBarrelSource,
  type EraserStrategy,
  type StylusControlsSettings,
} from "../settings/settings";
import type { ProbeEvent } from "./probeSummary";
import {
  buildReport,
  chromeVersion,
  toText,
  type DiagnosticsReport,
  type ReportExcalidraw,
} from "./report";
import {
  formatCheckLines,
  type BridgeCheckResult,
  type HandshakeCheck,
  type HelloCheck,
  type HttpCheck,
  type ServerProofCheck,
  type SourceCheck,
} from "./verdict";

export interface DiagnosticsHost {
  app: App;
  manifest: { version: string };
  settings: StylusControlsSettings;
  effectiveEraserStrategy(): EraserStrategy;
  pairingCode(): string;
  bridgeSnapshot(): PenBridgeSnapshot | null;
  probeEvents(): ProbeEvent[];
  logLines(): string[];
  temporaryEraserNote: string;
  bridgeReady(): boolean;
  setTemporaryEraser(note: string, strategy: EraserStrategy | null): void;
}

export class DiagnosticsService {
  lastCheck: BridgeCheckResult | null = null;

  constructor(private readonly host: DiagnosticsHost) {}

  async checkBridge(): Promise<BridgeCheckResult> {
    const http = await this.checkHttp(this.host.settings.penBridgePort);
    const result = await this.checkSocket(this.host.settings.penBridgePort, http);
    this.lastCheck = result;
    return result;
  }

  report(): DiagnosticsReport {
    const settings = this.host.settings;
    return buildReport({
      environment: {
        obsidianVersion: apiVersion,
        android: Platform.isAndroidApp,
        tablet: Platform.isTablet,
        pluginVersion: this.host.manifest.version,
        chrome: chromeVersion(navigator.userAgent),
        screen: {
          width: Math.round(window.innerWidth),
          height: Math.round(window.innerHeight),
        },
        settings: {
          barrelButtonMask: settings.barrelButtonMask,
          primaryContactMode: settings.primaryContactMode,
          eraserStrategy: settings.eraserStrategy,
          effectiveEraserStrategy: this.host.effectiveEraserStrategy(),
          lateWindowMs: settings.lateWindowMs,
          midStrokePress: settings.midStrokePress,
          penBridgeEnabled: settings.penBridgeEnabled,
          penBridgePort: settings.penBridgePort,
          suppressHoverButtonEvents: settings.suppressHoverButtonEvents,
          buttonContactAction: settings.buttonContactAction,
        },
      },
      bridgeCheck: this.lastCheck,
      live: this.host.bridgeSnapshot(),
      barrelSource: describeBarrelSource(settings, this.host.bridgeReady()),
      probeEvents: this.host.probeEvents(),
      excalidraw: this.excalidraw(),
      log: this.host.logLines(),
    });
  }

  async copyReport(): Promise<void> {
    const text = toText(this.report());
    try {
      await navigator.clipboard.writeText(text);
      new Notice("Diagnostics report copied.");
    } catch {
      const modal = new Modal(this.host.app);
      modal.titleEl.setText("Diagnostics report");
      const area = modal.contentEl.createEl("textarea");
      area.value = text;
      area.style.width = "100%";
      area.style.minHeight = "240px";
      modal.open();
      area.focus();
      area.select();
    }
  }

  checkLines(): string[] {
    return this.lastCheck
      ? formatCheckLines(this.lastCheck)
      : ["Bridge has not been checked in this session."];
  }

  async runTemporaryEraserTest(): Promise<string> {
    const leaf = this.host.app.workspace.activeLeaf;
    if (!leaf || leaf.view.getViewType() !== "excalidraw") {
      const note = "Open a new, empty drawing first";
      this.host.setTemporaryEraser(note, null);
      return note;
    }
    if (
      typeof window.confirm === "function" &&
      !window.confirm("Run the temporary eraser test on this drawing? Use a new, empty drawing.")
    ) {
      return "Cancelled";
    }
    const canvas = leaf.view.containerEl.querySelector("canvas") ?? leaf.view.containerEl;
    const rect = canvas.getBoundingClientRect();
    const bridge = new ExcalidrawBridge(leaf);
    const center = {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
    let began = false;
    canvas.addEventListener(
      "pointerdown",
      (event) => {
        began = bridge.beginMomentaryEraser(event as PointerEvent).ok;
      },
      { capture: true, once: true }
    );
    canvas.dispatchEvent(penEvent("pointerdown", center, { button: 0, buttons: 1, pressure: 0.5 }));
    await waitFrame();
    const during = readTool(leaf.view);
    canvas.dispatchEvent(penEvent("pointerup", center, { button: 0, buttons: 0, pressure: 0 }));
    await waitFrame();
    const after = readTool(leaf.view);
    const available = began && during === "eraser" && after !== "eraser";
    const note = available
      ? "fork temp-eraser: available"
      : "not available → using setActiveTool fallback";
    this.host.setTemporaryEraser(note, available ? "synthetic-button5" : "set-active-tool");
    return note;
  }

  private excalidraw(): ReportExcalidraw {
    const installed = readInstalledExcalidraw(this.host.app);
    const automate = getGlobalAutomate();
    const view = this.host.app.workspace.activeLeaf?.view;
    let canReadActiveTool = false;
    let canSetActiveTool = false;
    let newElement: boolean | null = null;
    if (view?.getViewType() === "excalidraw") {
      const api = getLeafApi(view);
      if (api.ok) {
        const capabilities = toolCapabilities(api.value);
        canReadActiveTool = capabilities.canReadActiveTool;
        canSetActiveTool = capabilities.canSetActiveTool;
        newElement = hasNewElementField(api.value.getAppState());
      }
    }
    return {
      installed: installed.installed,
      enabled: installed.enabled,
      version: installed.version,
      automate: automate !== null,
      canReadActiveTool,
      canSetActiveTool,
      deleteViewElements: typeof automate?.deleteViewElements === "function",
      newElement,
      temporaryEraser: this.host.temporaryEraserNote,
    };
  }

  private async checkHttp(port: number): Promise<HttpCheck> {
    try {
      const response = await requestUrl({ url: `http://127.0.0.1:${port}/health`, throw: false });
      return {
        ok: response.status === 200,
        status: response.status,
        body: response.text.slice(0, 200),
        error: null,
      };
    } catch (error) {
      return {
        ok: false,
        status: null,
        body: null,
        error: (error instanceof Error ? error.message : "request failed").slice(0, 300),
      };
    }
  }

  private checkSocket(port: number, http: HttpCheck): Promise<BridgeCheckResult> {
    const secret = decodePairingCode(this.host.pairingCode());
    return new Promise((resolve) => {
      let settled = false;
      let opened = false;
      let hello: HelloCheck | null = null;
      let helloFrame: HelloFrame | null = null;
      let clientNonce = "";
      let handshake: HandshakeCheck = "not-run";
      let serverProof: ServerProofCheck = "not-run";
      let source: SourceCheck | null = null;
      const started = performance.now();
      const socket = new WebSocket(`ws://127.0.0.1:${port}/v1/pen`);
      const finish = (
        closeCode: number | null,
        closeReason: string | null,
        wasClean: boolean | null,
        error: string | null
      ) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve({
          http,
          websocket: {
            ok: opened,
            openMs: opened ? Math.round(performance.now() - started) : null,
            error,
            closeCode,
            closeReason,
            wasClean,
          },
          hello,
          handshake,
          serverProof,
          source,
        });
        try {
          socket.close();
        } catch {
          // Already closed.
        }
      };
      const timer = window.setTimeout(
        () => finish(null, "timeout", false, opened ? null : "timeout"),
        3000
      );
      socket.addEventListener("open", () => {
        opened = true;
      });
      socket.addEventListener("error", () => {
        if (!opened) finish(null, null, false, "error event");
      });
      socket.addEventListener("close", (event) => {
        if (handshake === "not-run" && event.code === CLOSE.AUTH) handshake = "wrong-code";
        else if (handshake === "not-run" && event.code === CLOSE.PROTOCOL) handshake = "protocol";
        else if (handshake === "not-run") handshake = secret ? "failed" : "skipped";
        finish(event.code, event.reason, event.wasClean, opened ? null : "error event");
      });
      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;
        const frame = parseServerFrame(event.data);
        if (!frame || frame.type === "unknown") return;
        if (frame.type === "hello") {
          helloFrame = frame;
          hello = {
            proto: frame.proto,
            app: frame.app,
            appVersion: frame.appVersion,
            caps: frame.caps,
          };
          if (!secret) {
            handshake = "skipped";
            serverProof = "skipped";
            finish(null, null, true, null);
            return;
          }
          clientNonce = newNonce();
          const nonce = frame.nonce;
          void proof(secret, nonce, clientNonce, "client").then((clientProof) => {
            if (settled) return;
            socket.send(
              JSON.stringify({
                type: "auth",
                proto: 1,
                client: "excalidraw-stylus-controls",
                clientVersion: this.host.manifest.version,
                clientNonce,
                proof: clientProof,
              })
            );
          });
          return;
        }
        if (frame.type !== "ready" || !helloFrame || !secret || !clientNonce) return;
        const ready = frame;
        void proof(secret, helloFrame.nonce, clientNonce, "server").then((expected) => {
          if (settled) return;
          serverProof = safeEqual(expected, ready.serverProof) ? "ok" : "bad";
          handshake = serverProof === "ok" ? "ready" : "wrong-code";
          source = {
            state: ready.source.state,
            reason: ready.source.reason,
            node: ready.source.node,
            name: ready.source.name,
          };
          finish(null, null, true, null);
        });
      });
    });
  }
}

function readTool(view: unknown): string | null {
  const api = getLeafApi(view);
  if (!api.ok) return null;
  return readActiveTool(api.value)?.type ?? null;
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

function penEvent(
  type: string,
  center: { clientX: number; clientY: number },
  over: PointerEventInit
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: 1,
    pointerType: "pen",
    isPrimary: true,
    clientX: center.clientX,
    clientY: center.clientY,
    ...over,
  });
}
