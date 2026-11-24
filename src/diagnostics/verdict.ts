export interface HttpCheck {
  ok: boolean;
  status: number | null;
  body: string | null;
  error: string | null;
}

export interface SocketCheck {
  ok: boolean;
  openMs: number | null;
  error: string | null;
  closeCode: number | null;
  closeReason: string | null;
  wasClean: boolean | null;
}

export interface HelloCheck {
  proto: number;
  app: string;
  appVersion: string;
  caps: string[];
}

export interface SourceCheck {
  state: "ok" | "unavailable";
  reason?: string;
  node?: string;
  name?: string;
}

export type HandshakeCheck = "skipped" | "ready" | "wrong-code" | "protocol" | "failed" | "not-run";
export type ServerProofCheck = "ok" | "bad" | "skipped" | "not-run";

export interface BridgeCheckResult {
  http: HttpCheck;
  websocket: SocketCheck;
  hello: HelloCheck | null;
  handshake: HandshakeCheck;
  serverProof: ServerProofCheck;
  source: SourceCheck | null;
}

export function verdict(checks: BridgeCheckResult): string {
  if (!checks.http.ok) return "Bridge app not running";
  if (!checks.websocket.ok) {
    return "Obsidian blocks ws://127.0.0.1 (HTTP ok, WebSocket failed)";
  }
  if (!checks.hello) return "Bridge WebSocket opened but no hello frame arrived";
  if (checks.serverProof === "bad") return "Bridge identity check failed (server proof)";
  if (checks.handshake === "wrong-code") return "Wrong pairing code";
  if (checks.handshake === "protocol") return "Bridge protocol error";
  if (checks.source?.state === "unavailable") {
    return `Bridge running but pen input unavailable: ${checks.source.reason ?? "unknown"}`;
  }
  if (
    checks.handshake === "ready" &&
    checks.serverProof === "ok" &&
    checks.source?.state === "ok"
  ) {
    return "Bridge reachable and paired: mid-stroke erase ON";
  }
  if (checks.handshake === "skipped") {
    return "Bridge reachable. Paste a pairing code to turn on mid-stroke erase.";
  }
  if (checks.handshake === "failed") return "Bridge handshake failed";
  return "Bridge check incomplete";
}

export function formatCheckLines(checks: BridgeCheckResult): string[] {
  const http = checks.http.ok
    ? `✅ Native HTTP: ${checks.http.status ?? ""} ${checks.http.body ?? ""}`.trim()
    : `❌ Native HTTP: ${checks.http.error ?? `status ${checks.http.status ?? "unknown"}`}`;
  const socket = checks.websocket.ok
    ? `✅ WebSocket open: ${checks.websocket.openMs ?? "?"} ms`
    : `❌ WebSocket open: ${checks.websocket.error ?? "failed"}${
        checks.websocket.closeCode === null ? "" : ` close ${checks.websocket.closeCode}`
      }${checks.websocket.closeReason ? ` ${checks.websocket.closeReason}` : ""}`;
  const hello = checks.hello
    ? `✅ hello: proto ${checks.hello.proto} ${checks.hello.app} ${checks.hello.appVersion} caps ${checks.hello.caps.join(",")}`
    : "❌ hello: not received";
  const handshake =
    checks.handshake === "ready"
      ? "✅ Handshake: ready"
      : checks.handshake === "skipped"
        ? "Handshake: skipped (no pairing code)"
        : checks.handshake === "not-run"
          ? "Handshake: not run"
          : `❌ Handshake: ${checks.handshake}`;
  const proof =
    checks.serverProof === "ok"
      ? "✅ Server proof"
      : checks.serverProof === "bad"
        ? "❌ Server proof"
        : `Server proof: ${checks.serverProof}`;
  const source = !checks.source
    ? "Source: not received"
    : checks.source.state === "ok"
      ? `✅ Source: ok ${checks.source.name ?? ""} ${checks.source.node ?? ""}`.trim()
      : `❌ Source: unavailable ${checks.source.reason ?? ""}`.trim();
  return [http, socket, hello, handshake, proof, source, verdict(checks)];
}
