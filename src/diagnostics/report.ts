import type { BridgeCheckResult } from "./verdict";
import { verdict } from "./verdict";
import type { ProbeEvent, ProbeSummary } from "./probeSummary";
import { summarizeProbe } from "./probeSummary";
import type { PenBridgeSnapshot } from "../penbridge/PenBridgeClient";

export interface ReportSettings {
  barrelButtonMask: number;
  primaryContactMode: string;
  eraserStrategy: string;
  effectiveEraserStrategy: string;
  lateWindowMs: number;
  midStrokePress: string;
  penBridgeEnabled: boolean;
  penBridgePort: number;
  suppressHoverButtonEvents: boolean;
  buttonContactAction: string;
}

export interface ReportEnvironment {
  obsidianVersion: string;
  android: boolean;
  tablet: boolean;
  pluginVersion: string;
  chrome: string | null;
  screen: { width: number; height: number };
  settings: ReportSettings;
}

export interface ReportExcalidraw {
  installed: boolean;
  enabled: boolean;
  version: string | null;
  automate: boolean;
  canReadActiveTool: boolean;
  canSetActiveTool: boolean;
  deleteViewElements: boolean;
  newElement: boolean | null;
  temporaryEraser: string;
}

export interface DiagnosticsReport {
  report: "excalidraw-stylus-controls-diag";
  schema: 1;
  verdict: string;
  environment: ReportEnvironment;
  bridgeCheck: BridgeCheckResult | null;
  live: PenBridgeSnapshot | null;
  barrelSource: string;
  probe: { summary: ProbeSummary; events: ProbeEvent[] };
  excalidraw: ReportExcalidraw;
  log: string[];
}

export interface ReportInput {
  environment: ReportEnvironment;
  bridgeCheck: BridgeCheckResult | null;
  live: PenBridgeSnapshot | null;
  barrelSource: string;
  probeEvents: Array<ProbeEvent & { x?: number; y?: number }>;
  excalidraw: ReportExcalidraw;
  log: string[];
  pairingCode?: string;
  vaultName?: string;
  notePath?: string;
}

export function isDiagnosticBuild(version: string): boolean {
  return version.includes("-diag");
}

export function chromeVersion(userAgent: string): string | null {
  return userAgent.match(/Chrome\/([\d.]+)/u)?.[1] ?? null;
}

export function buildReport(input: ReportInput): DiagnosticsReport {
  const events = input.probeEvents.slice(-50).map((event) => ({
    t: event.t,
    type: event.type,
    pointerType: event.pointerType,
    button: event.button,
    buttons: event.buttons,
    pressure: event.pressure,
    phase: event.phase,
  }));
  const bridgeCheck = input.bridgeCheck;
  return {
    report: "excalidraw-stylus-controls-diag",
    schema: 1,
    verdict: bridgeCheck ? verdict(bridgeCheck) : "Bridge has not been checked in this session",
    environment: input.environment,
    bridgeCheck,
    live: input.live,
    barrelSource: input.barrelSource,
    probe: { summary: summarizeProbe(events), events },
    excalidraw: input.excalidraw,
    log: input.log.slice(-100),
  };
}

export function toJSON(report: DiagnosticsReport): string {
  return JSON.stringify(report, null, 2);
}

export function toText(report: DiagnosticsReport): string {
  const settings = report.environment.settings;
  const lines = [
    `Excalidraw Stylus Controls ${report.environment.pluginVersion}`,
    `Obsidian ${report.environment.obsidianVersion} · Android ${report.environment.android ? "yes" : "no"} · tablet ${report.environment.tablet ? "yes" : "no"}`,
    `Chrome ${report.environment.chrome ?? "unknown"} · screen ${report.environment.screen.width}×${report.environment.screen.height}`,
    `Excalidraw ${report.excalidraw.version ?? "not installed"} · temp eraser: ${report.excalidraw.temporaryEraser}`,
    `Barrel source: ${report.barrelSource}`,
    `Bridge enabled: ${settings.penBridgeEnabled ? "yes" : "no"} · port ${settings.penBridgePort} · mask ${settings.barrelButtonMask} · ${settings.primaryContactMode}`,
    `Strategy ${report.environment.settings.effectiveEraserStrategy} · late window ${settings.lateWindowMs} ms · mid-stroke ${settings.midStrokePress}`,
    report.verdict,
    "",
    "```json",
    toJSON(report),
    "```",
  ];
  return lines.join("\n");
}

export function formatBridgeStatus(snapshot: PenBridgeSnapshot): string {
  const status = snapshot.status;
  if (status.state === "off") return "off";
  if (status.state === "connecting") {
    const retry = snapshot.nextRetryInMs === null ? "" : ` · retry in ${snapshot.nextRetryInMs} ms`;
    return `connecting${retry}`;
  }
  if (status.state === "authenticating") return "authenticating";
  if (status.state === "failed") return `failed: ${status.reason || status.code}`;
  const pen =
    status.source === "ok"
      ? `pen ok${status.name ? ` (${status.name})` : ""}`
      : `pen unavailable: ${status.reason ?? "unknown"}`;
  const latency =
    snapshot.lastButton === null
      ? "no button yet"
      : snapshot.lastButton.latencyMs === null
        ? "receive-time only"
        : `latency ${Math.round(snapshot.lastButton.latencyMs)} ms`;
  const heartbeat =
    snapshot.heartbeatAgeMs === null
      ? "no heartbeat yet"
      : `heartbeat ${snapshot.heartbeatAgeMs} ms`;
  const fingerprint = snapshot.fingerprint ? ` · ${snapshot.fingerprint}` : "";
  return `ready · ${pen} · ${latency} · ${heartbeat}${fingerprint}`;
}
