import { Notice, Plugin } from "obsidian";
import { DebugLogger } from "./debug/DebugLogger";
import { DiagnosticsService } from "./diagnostics/DiagnosticsService";
import type { ProbeEvent } from "./diagnostics/probeSummary";
import { formatBridgeStatus, isDiagnosticBuild } from "./diagnostics/report";
import { StylusMenu } from "./menu/StylusMenu";
import { PenBridgeClient, type PenBridgeStatus } from "./penbridge/PenBridgeClient";
import { PairingStore } from "./penbridge/pairingStore";
import { PenSignalHub } from "./penbridge/PenSignalHub";
import { decodePairingCode, fingerprint } from "./penbridge/protocol";
import { SettingsTab } from "./settings/SettingsTab";
import {
  DEFAULT_SETTINGS,
  describeBarrelSource,
  normalizeSettings,
  type EraserStrategy,
  type StylusControlsSettings,
} from "./settings/settings";
import { StylusViewRegistry } from "./stylus/StylusViewRegistry";
import type { Point } from "./stylus/types";

export default class StylusControlsPlugin extends Plugin {
  settings: StylusControlsSettings = DEFAULT_SETTINGS;
  pairingFingerprint = "";
  temporaryEraserNote = "not checked";
  private registry: StylusViewRegistry | null = null;
  private readonly menu = new StylusMenu();
  private pairing!: PairingStore;
  private client!: PenBridgeClient;
  private hub!: PenSignalHub;
  private bridgeLog!: DebugLogger;
  private diagnostics!: DiagnosticsService;
  private probeRing: ProbeEvent[] = [];
  private sessionEraserStrategy: EraserStrategy | null = null;
  private readonly bridgeListeners = new Set<() => void>();

  async onload(): Promise<void> {
    this.settings = normalizeSettings((await this.loadData()) ?? {});
    this.pairing = new PairingStore(this.app);
    this.bridgeLog = new DebugLogger(
      () => this.settings.debugMode,
      isDiagnosticBuild(this.manifest.version)
    );
    this.hub = new PenSignalHub(() => this.client);
    this.client = new PenBridgeClient({
      url: this.bridgeUrl(),
      secret: () => decodePairingCode(this.pairing.load()),
      clientVersion: this.manifest.version,
      onStatus: (status) => this.publishStatus(status),
      onButton: (signal) => this.hub.dispatch(signal),
      onCommand: (action) => {
        if (action === "open-menu") this.openMenuFromBridge();
      },
      debug: (message) => this.bridgeLog.message(message),
    });
    this.registry = new StylusViewRegistry(
      this.app,
      () => this.effectiveSettings(),
      (action, point, bridge) => {
        if (action === "menu") this.menu.open(point, bridge);
        else if (action === "copy") bridge.copySelectedElements();
        else if (action === "paste") bridge.pasteAt(point);
      },
      undefined,
      {
        pen: this.hub,
        diagnostic: isDiagnosticBuild(this.manifest.version),
        onSync: () => this.updatePenDemand(),
      }
    );
    this.hub.setFallback(() => this.registry?.fallbackTarget() ?? null);
    this.diagnostics = new DiagnosticsService(this);
    this.addSettingTab(new SettingsTab(this));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.registry?.sync()));
    this.registerDomEvent(document, "visibilitychange", () => this.updatePenDemand());
    this.app.workspace.onLayoutReady(() => this.registry?.sync());
    this.addCommand({
      id: "copy-stylus-event-trace",
      name: "Copy latest stylus event trace",
      callback: () => void this.copyStylusEventTrace(),
    });
    this.addCommand({
      id: "copy-diagnostics-report",
      name: "Copy diagnostics report",
      callback: () => void this.copyDiagnosticsReport(),
    });
    this.addCommand({
      id: "reconnect-spen-bridge",
      name: "Reconnect S Pen bridge",
      callback: () => this.reconnectBridge(),
    });
    void this.refreshFingerprint();
    this.updatePenDemand();
  }

  onunload(): void {
    this.client.dispose();
    this.menu.close();
    this.registry?.dispose();
    this.registry = null;
  }

  async updateSettings(patch: Partial<StylusControlsSettings>): Promise<void> {
    if (patch.eraserStrategy) this.sessionEraserStrategy = null;
    const previous = this.settings;
    this.settings = normalizeSettings({ ...this.settings, ...patch });
    await this.saveData(this.settings);
    this.registry?.refresh();
    if (
      previous.penBridgeEnabled !== this.settings.penBridgeEnabled ||
      previous.penBridgePort !== this.settings.penBridgePort
    ) {
      this.client.setUrl(this.bridgeUrl());
      this.client.reconnectNow();
    }
    this.updatePenDemand();
  }

  effectiveEraserStrategy(): EraserStrategy {
    return this.sessionEraserStrategy ?? this.settings.eraserStrategy;
  }

  effectiveSettings(): StylusControlsSettings {
    return { ...this.settings, eraserStrategy: this.effectiveEraserStrategy() };
  }

  pairingCode(): string {
    return this.pairing.load();
  }

  async setPairingCode(code: string): Promise<void> {
    const trimmed = code.trim();
    if (!decodePairingCode(trimmed)) {
      new Notice("Pairing code must decode to 32 bytes.");
      return;
    }
    this.pairing.save(trimmed);
    await this.refreshFingerprint();
    this.client.reconnectNow();
    this.updatePenDemand();
    this.notifyBridge();
  }

  async clearPairingCode(): Promise<void> {
    this.pairing.clear();
    this.pairingFingerprint = "";
    this.client.reconnectNow();
    this.updatePenDemand();
    this.notifyBridge();
  }

  bridgeSnapshot() {
    return this.client.snapshot();
  }

  bridgeReady(): boolean {
    return this.client.isReady();
  }

  bridgeStatusText(): string {
    const snapshot = this.client.snapshot();
    const source = describeBarrelSource(this.effectiveSettings(), this.client.isReady());
    return `${formatBridgeStatus(snapshot)} · ${source}`;
  }

  watchBridge(listener: () => void): () => void {
    this.bridgeListeners.add(listener);
    return () => this.bridgeListeners.delete(listener);
  }

  setProbeEvents(events: ProbeEvent[]): void {
    this.probeRing = events;
  }

  probeEvents(): ProbeEvent[] {
    return this.probeRing;
  }

  logLines(): string[] {
    return [...this.bridgeLog.recentMessages(), ...(this.registry?.recentMessages() ?? [])].slice(
      -100
    );
  }

  setTemporaryEraser(note: string, strategy: EraserStrategy | null): void {
    this.temporaryEraserNote = note;
    if (strategy) this.sessionEraserStrategy = strategy;
    this.registry?.refresh();
  }

  checkBridge() {
    return this.diagnostics.checkBridge();
  }

  bridgeCheckLines(): string[] {
    return this.diagnostics.checkLines();
  }

  copyDiagnosticsReport(): Promise<void> {
    return this.diagnostics.copyReport();
  }

  runTemporaryEraserTest(): Promise<string> {
    return this.diagnostics.runTemporaryEraserTest();
  }

  reconnectBridge(): void {
    this.client.setUrl(this.bridgeUrl());
    this.client.reconnectNow();
    this.updatePenDemand();
  }

  async copyStylusEventTrace(): Promise<void> {
    const trace = this.registry?.exportTraces() ?? "[]";
    try {
      await navigator.clipboard.writeText(trace);
      new Notice("Stylus event trace copied as JSON.");
    } catch {
      new Notice("Unable to copy the stylus trace. Check the developer console.");
    }
  }

  private publishStatus(status: PenBridgeStatus): void {
    this.bridgeLog.message(`bridge status: ${status.state}`);
    this.notifyBridge();
  }

  private notifyBridge(): void {
    for (const listener of this.bridgeListeners) listener();
  }

  private async refreshFingerprint(): Promise<void> {
    const secret = decodePairingCode(this.pairing.load());
    this.pairingFingerprint = secret ? await fingerprint(secret) : "";
  }

  private updatePenDemand(): void {
    const visible = typeof document === "undefined" || document.visibilityState !== "hidden";
    this.client.setDemand(
      this.settings.penBridgeEnabled &&
        decodePairingCode(this.pairing.load()) !== null &&
        (this.registry?.size() ?? 0) > 0 &&
        visible
    );
  }

  private openMenuFromBridge(): void {
    const target = this.hub.route();
    if (!target) {
      new Notice("Open an Excalidraw drawing first.");
      return;
    }
    const point = target.lastPenPoint() ?? viewportCenter();
    this.menu.open(point, target.bridgeForMenu());
  }

  private bridgeUrl(): string {
    return `ws://127.0.0.1:${this.settings.penBridgePort}/v1/pen`;
  }
}

function viewportCenter(): Point {
  return {
    x: Math.round(window.innerWidth / 2),
    y: Math.round(window.innerHeight / 2),
  };
}
