import { describe, expect, it } from "vitest";
import { summarizeProbe, formatProbeSummary } from "../../src/diagnostics/probeSummary";
import { buildReport, toText } from "../../src/diagnostics/report";
import { verdict, type BridgeCheckResult } from "../../src/diagnostics/verdict";
import { classifyPenEvent } from "../../src/stylus/normalizePointerEvent";

const secret = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";

function checks(patch: Partial<BridgeCheckResult> = {}): BridgeCheckResult {
  return {
    http: { ok: true, status: 200, body: '{"ok":true}', error: null },
    websocket: {
      ok: true,
      openMs: 12,
      error: null,
      closeCode: null,
      closeReason: null,
      wasClean: true,
    },
    hello: { proto: 1, app: "excalidraw-spen-bridge", appVersion: "0.2.0-diag", caps: ["button"] },
    handshake: "ready",
    serverProof: "ok",
    source: { state: "ok", node: "/dev/input/event5", name: "sec_e-pen" },
    ...patch,
  };
}

describe("bridge verdict", () => {
  it("names the reason the bridge is or is not used", () => {
    expect(verdict(checks())).toBe("Bridge reachable and paired: mid-stroke erase ON");
    expect(
      verdict(checks({ http: { ok: false, status: null, body: null, error: "failed" } }))
    ).toBe("Bridge app not running");
    expect(
      verdict(
        checks({
          websocket: {
            ok: false,
            openMs: null,
            error: "error event",
            closeCode: null,
            closeReason: null,
            wasClean: false,
          },
        })
      )
    ).toBe("Obsidian blocks ws://127.0.0.1 (HTTP ok, WebSocket failed)");
    expect(verdict(checks({ handshake: "wrong-code" }))).toBe("Wrong pairing code");
    expect(verdict(checks({ serverProof: "bad", handshake: "wrong-code" }))).toBe(
      "Bridge identity check failed (server proof)"
    );
    expect(
      verdict(checks({ source: { state: "unavailable", reason: "shizuku-not-running" } }))
    ).toBe("Bridge running but pen input unavailable: shizuku-not-running");
    expect(verdict(checks({ handshake: "skipped", serverProof: "skipped", source: null }))).toBe(
      "Bridge reachable. Paste a pairing code to turn on mid-stroke erase."
    );
  });
});

describe("pen probe summary", () => {
  it("reports pen buttons without needing coordinates", () => {
    const summary = summarizeProbe([
      {
        t: 0,
        type: "pointermove",
        pointerType: "pen",
        button: 0,
        buttons: 0,
        pressure: 0,
        phase: "hover",
      },
      {
        t: 10,
        type: "pointerdown",
        pointerType: "pen",
        button: 0,
        buttons: 1,
        pressure: 0,
        phase: "hover",
      },
      {
        t: 20,
        type: "pointermove",
        pointerType: "pen",
        button: 0,
        buttons: 1,
        pressure: 0.4,
        phase: "contact",
      },
      {
        t: 30,
        type: "contextmenu",
        pointerType: "pen",
        button: 0,
        buttons: 0,
        pressure: 0,
        phase: "hover",
      },
      {
        t: 40,
        type: "pointerdown",
        pointerType: "mouse",
        button: 0,
        buttons: 1,
        pressure: 0,
        phase: "hover",
      },
    ]);
    expect(summary.penSeen).toBe(true);
    expect(summary.hoverButtons).toEqual([0, 1]);
    expect(summary.contactButtons).toEqual([1]);
    expect(summary.downButtons).toEqual([0]);
    expect(summary.contextMenuFromPen).toBe(true);
    expect(summary.eraserSeen).toBe(false);
    expect(formatProbeSummary(summary)).toContain("Pen seen: yes");
    expect(formatProbeSummary(summary)).toContain("buttons values while hovering: {0, 1}");
  });
});

describe("diagnostics report privacy", () => {
  it("drops the pairing code, vault, paths, and coordinates", () => {
    const report = buildReport({
      pairingCode: secret,
      vaultName: "Secret Vault",
      notePath: "/Users/jan/vault/Drawing.md",
      environment: {
        obsidianVersion: "1.6.0",
        android: true,
        tablet: true,
        pluginVersion: "0.2.0-diag.1",
        chrome: "120.0.0.0",
        screen: { width: 800, height: 600 },
        settings: {
          barrelButtonMask: 1,
          primaryContactMode: "hover-only",
          eraserStrategy: "synthetic-button5",
          effectiveEraserStrategy: "synthetic-button5",
          lateWindowMs: 40,
          midStrokePress: "split",
          penBridgeEnabled: true,
          penBridgePort: 47631,
          suppressHoverButtonEvents: true,
          buttonContactAction: "eraser",
        },
      },
      bridgeCheck: null,
      live: null,
      barrelSource: "hover-latch",
      probeEvents: [
        {
          t: 1,
          type: "pointermove",
          pointerType: "pen",
          button: 0,
          buttons: 1,
          pressure: 0,
          phase: "hover",
          x: 12,
          y: 40,
        },
      ],
      excalidraw: {
        installed: true,
        enabled: true,
        version: "2.0.0",
        automate: true,
        canReadActiveTool: true,
        canSetActiveTool: true,
        deleteViewElements: true,
        newElement: true,
        temporaryEraser: "not checked",
      },
      log: ["bridge: down seq=1 latency=4ms", "note text should not be sourced from here"],
    });
    const text = toText(report);
    expect(text).not.toContain(secret);
    expect(text).not.toContain("Secret Vault");
    expect(text).not.toContain("/Users/jan");
    expect(text).not.toContain('"x"');
    expect(text).not.toContain('"y"');
    expect(text).toContain('"report": "excalidraw-stylus-controls-diag"');
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    expect(JSON.parse(json)).not.toHaveProperty("pairingCode");
  });
});

describe("classifyPenEvent", () => {
  it("marks a held zero-pressure primary pen event as a hover button", () => {
    expect(
      classifyPenEvent({ pointerType: "pen", pressure: 0, buttons: 1, type: "pointerdown" }, true)
    ).toBe("hover-button");
    expect(
      classifyPenEvent(
        { pointerType: "pen", pressure: 0.005, buttons: 1, type: "pointermove" },
        true
      )
    ).toBe("hover-button");
    expect(
      classifyPenEvent({ pointerType: "pen", pressure: 0.5, buttons: 1, type: "pointerdown" }, true)
    ).toBe("contact");
    expect(
      classifyPenEvent({ pointerType: "pen", pressure: 0, buttons: 1, type: "pointerdown" }, false)
    ).toBe("contact");
    expect(
      classifyPenEvent({ pointerType: "mouse", pressure: 0, buttons: 1, type: "pointerdown" }, true)
    ).toBe("hover");
    expect(
      classifyPenEvent(
        { pointerType: "touch", pressure: 0.4, buttons: 1, type: "pointerdown" },
        true
      )
    ).toBe("hover");
  });
});
