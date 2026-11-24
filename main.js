"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => StylusControlsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/debug/DebugLogger.ts
var DebugLogger = class {
  constructor(enabled, retainMessages = false) {
    this.enabled = enabled;
    this.retainMessages = retainMessages;
  }
  trace = [];
  messages = [];
  event(event) {
    if (!this.enabled()) return;
    this.trace.push(event);
    if (this.trace.length > 100) this.trace.shift();
    console.debug("[Excalidraw Stylus Controls]", event);
  }
  message(message) {
    if (this.retainMessages || this.enabled()) {
      this.messages.push(message);
      if (this.messages.length > 200) this.messages.shift();
    }
    if (this.enabled()) console.debug("[Excalidraw Stylus Controls]", message);
  }
  recentMessages(limit = 100) {
    return this.messages.slice(-limit);
  }
  exportTrace() {
    return JSON.stringify(this.trace, null, 2);
  }
  clear() {
    this.trace = [];
  }
};

// src/diagnostics/DiagnosticsService.ts
var import_obsidian3 = require("obsidian");

// src/excalidraw/ExcalidrawBridge.ts
var import_obsidian = require("obsidian");

// src/excalidraw/compatibility.ts
function toolCapabilities(api) {
  return {
    canReadActiveTool: typeof api?.getAppState === "function",
    canSetActiveTool: typeof api?.setActiveTool === "function"
  };
}
function readActiveTool(api) {
  const activeTool = api.getAppState?.().activeTool;
  return activeTool ? { ...activeTool } : null;
}
function readNewElementId(api) {
  const state = api.getAppState?.();
  const id = state?.newElement?.id ?? state?.draggingElement?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}
function hasNewElementField(state) {
  return !!state && typeof state === "object" && ("newElement" in state || "draggingElement" in state);
}
function readInstalledExcalidraw(app) {
  const host = app;
  const plugin = host.plugins?.plugins?.["obsidian-excalidraw-plugin"];
  return {
    installed: Boolean(plugin),
    enabled: host.plugins?.enabledPlugins?.has?.("obsidian-excalidraw-plugin") === true,
    version: plugin?.manifest?.version ?? null
  };
}
function getLeafApi(view, automate = getGlobalAutomate()) {
  if (!view || typeof view !== "object") {
    return {
      ok: false,
      code: "unavailable",
      message: "This leaf does not expose an Excalidraw view."
    };
  }
  if (automate) {
    try {
      automate.setView(view);
      return validateImperativeApi(automate.getExcalidrawAPI());
    } catch {
      return {
        ok: false,
        code: "failed",
        message: "Excalidraw could not target this leaf's canvas."
      };
    }
  }
  const api = view.excalidrawAPI;
  return validateImperativeApi(api);
}
function getGlobalAutomate() {
  const candidate = globalThis.ExcalidrawAutomate;
  if (candidate && typeof candidate === "object" && typeof candidate.setView === "function" && typeof candidate.getExcalidrawAPI === "function") {
    return candidate;
  }
  return null;
}
function validateImperativeApi(api) {
  if (!api || typeof api !== "object") {
    return {
      ok: false,
      code: "unavailable",
      message: "Excalidraw has not made an API available for this leaf."
    };
  }
  const capabilities = toolCapabilities(api);
  if (!capabilities.canReadActiveTool || !capabilities.canSetActiveTool) {
    return {
      ok: false,
      code: "incompatible",
      message: "This Excalidraw API does not support active-tool read and write operations."
    };
  }
  return { ok: true, value: api };
}

// src/excalidraw/syntheticPointer.ts
var synthetic = /* @__PURE__ */ new WeakSet();
var isSynthetic = (event) => synthetic.has(event);
function dispatchPointer(target, type, from, over) {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: from.pointerId ?? 1,
    pointerType: "pen",
    isPrimary: true,
    clientX: from.clientX ?? 0,
    clientY: from.clientY ?? 0,
    screenX: from.screenX ?? 0,
    screenY: from.screenY ?? 0,
    pressure: from.pressure ?? 0,
    tiltX: from.tiltX ?? 0,
    tiltY: from.tiltY ?? 0,
    twist: from.twist ?? 0,
    width: from.width ?? 1,
    height: from.height ?? 1,
    ...over
  });
  synthetic.add(event);
  target.dispatchEvent(event);
  return event;
}

// src/excalidraw/ExcalidrawBridge.ts
var ExcalidrawBridge = class {
  constructor(leaf) {
    this.leaf = leaf;
  }
  warned = false;
  beginMomentaryEraser(raw) {
    const apiResult = this.getApi();
    if (!apiResult.ok) return this.report(apiResult);
    const tool = readActiveTool(apiResult.value);
    if (!tool) {
      return this.failure(
        "incompatible",
        "Temporary eraser could not read the current active tool."
      );
    }
    if (typeof raw.stopImmediatePropagation === "function") raw.stopImmediatePropagation();
    raw.preventDefault();
    const target = eventTarget(raw);
    if (!target) {
      return this.failure("failed", "Temporary eraser could not find the pointer target.");
    }
    dispatchPointer(target, "pointerdown", raw, { button: 5, buttons: 32 });
    const api = apiResult.value;
    nextFrame(() => {
      if (readActiveTool(api)?.type === "eraser") return;
      try {
        api.setActiveTool({ type: "eraser" });
      } catch {
        this.unsupported("Temporary eraser could not switch tools.");
        return;
      }
      this.unsupported("Fork temp-eraser is not available; using setActiveTool.");
    });
    return { ok: true, value: tool };
  }
  splitStrokeToEraser(last, discardStroke) {
    const apiResult = this.getApi();
    if (!apiResult.ok) return this.report(apiResult);
    const tool = readActiveTool(apiResult.value);
    if (!tool) {
      return this.failure(
        "incompatible",
        "Temporary eraser could not read the current active tool."
      );
    }
    const target = eventTarget(last);
    if (!target) return this.failure("failed", "Stroke split could not find the pointer target.");
    const id = discardStroke ? readNewElementId(apiResult.value) : null;
    dispatchPointer(target, "pointerup", last, { button: 0, buttons: 0, pressure: 0 });
    dispatchPointer(target, "pointerdown", last, { button: 5, buttons: 32 });
    if (id) nextFrame(() => this.deleteElement(apiResult.value, id));
    return { ok: true, value: tool };
  }
  splitStrokeWithActiveTool(last) {
    const target = eventTarget(last);
    if (target) dispatchPointer(target, "pointerup", last, { button: 0, buttons: 0, pressure: 0 });
    const started = this.startTemporaryEraser();
    if (target) {
      dispatchPointer(target, "pointerdown", last, {
        button: 0,
        buttons: 1,
        pressure: last.pressure
      });
    }
    return started;
  }
  endMomentaryEraser(saved) {
    const apiResult = this.getApi();
    if (!apiResult.ok) return this.report(apiResult);
    const api = apiResult.value;
    nextFrame(() => {
      if (readActiveTool(api)?.type === "eraser") this.restoreTool(saved);
    });
    return { ok: true, value: void 0 };
  }
  startTemporaryEraser() {
    const apiResult = this.getApi();
    if (!apiResult.ok) return this.report(apiResult);
    try {
      const tool = readActiveTool(apiResult.value);
      if (!tool) {
        return this.failure(
          "incompatible",
          "Temporary eraser could not read the current active tool."
        );
      }
      apiResult.value.setActiveTool({ type: "eraser" });
      return { ok: true, value: tool };
    } catch {
      return this.failure("failed", "Temporary eraser is unavailable in this Excalidraw view.");
    }
  }
  restoreTool(tool) {
    const apiResult = this.getApi();
    if (!apiResult.ok) return this.report(apiResult);
    try {
      apiResult.value.setActiveTool(tool);
      return { ok: true, value: void 0 };
    } catch {
      return this.failure(
        "failed",
        "The previous tool could not be restored in this Excalidraw view."
      );
    }
  }
  setTool(type) {
    const apiResult = this.getApi();
    if (!apiResult.ok) return this.report(apiResult);
    try {
      apiResult.value.setActiveTool({ type });
      return { ok: true, value: void 0 };
    } catch {
      return this.failure("failed", "Tool switching is unavailable in this Excalidraw view.");
    }
  }
  copySelectedElements() {
    return this.failure("unavailable", "Copy requires a compatible Excalidraw API.");
  }
  pasteAt(point) {
    return this.failure("unavailable", "Paste requires a compatible Excalidraw API.");
  }
  getApi() {
    try {
      return getLeafApi(this.leaf.view);
    } catch {
      return {
        ok: false,
        code: "failed",
        message: "Excalidraw API lookup failed for this leaf."
      };
    }
  }
  report(result) {
    this.unsupported(result.message);
    return result;
  }
  failure(code, message) {
    this.unsupported(message);
    return { ok: false, code, message };
  }
  unsupported(message) {
    if (!this.warned) {
      new import_obsidian.Notice(`Excalidraw Stylus Controls: ${message}`);
      this.warned = true;
    }
  }
  deleteElement(api, id) {
    const automate = getGlobalAutomate();
    const elements = api.getSceneElements?.() ?? [];
    const element = elements.find((candidate) => candidate.id === id);
    if (!element || typeof automate?.deleteViewElements !== "function") {
      this.unsupported("The late-press ink dot could not be deleted in this Excalidraw build.");
      return;
    }
    try {
      automate.setView(this.leaf.view);
      automate.deleteViewElements([element]);
    } catch {
      this.unsupported("The late-press ink dot could not be deleted in this Excalidraw build.");
    }
  }
};
function eventTarget(event) {
  return event.target ?? event.currentTarget;
}
function nextFrame(callback) {
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => callback());
  else setTimeout(callback, 0);
}

// src/penbridge/protocol.ts
var CLOSE = {
  NORMAL: 1e3,
  GOING_AWAY: 1001,
  PROTOCOL: 4400,
  AUTH: 4401,
  ORIGIN: 4403,
  AUTH_TIMEOUT: 4408
};
var textEncoder = new TextEncoder();
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stringField(record, key) {
  const value = record[key];
  return typeof value === "string" ? value : null;
}
function booleanField(record, key) {
  const value = record[key];
  return typeof value === "boolean" ? value : null;
}
function numberField(record, key) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function integerField(record, key) {
  const value = numberField(record, key);
  return value !== null && Number.isInteger(value) ? value : null;
}
function optionalString(record, key) {
  if (!(key in record) || record[key] === void 0) return void 0;
  const value = stringField(record, key);
  return value === null ? void 0 : value;
}
function sourceBody(value) {
  if (!isRecord(value)) return null;
  const state = stringField(value, "state");
  if (state !== "ok" && state !== "unavailable") return null;
  const reason = optionalString(value, "reason");
  const node = optionalString(value, "node");
  const name = optionalString(value, "name");
  if ("reason" in value && value.reason !== void 0 && reason === void 0 || "node" in value && value.node !== void 0 && node === void 0 || "name" in value && value.name !== void 0 && name === void 0) {
    return null;
  }
  return { state, reason, node, name };
}
function parseHello(record) {
  const proto = integerField(record, "proto");
  const app = stringField(record, "app");
  const appVersion = stringField(record, "appVersion");
  const nonce = stringField(record, "nonce");
  const caps = record.caps;
  if (proto === null || app === null || appVersion === null || nonce === null) return null;
  if (!Array.isArray(caps) || caps.some((item) => typeof item !== "string")) return null;
  return { type: "hello", proto, app, appVersion, nonce, caps };
}
function parseReady(record) {
  const session = stringField(record, "session");
  const serverProof = stringField(record, "serverProof");
  const heartbeatMs = integerField(record, "heartbeatMs");
  const source = sourceBody(record.source);
  if (session === null || serverProof === null || heartbeatMs === null || !source) return null;
  if (!isRecord(record.button)) return null;
  const button = stringField(record.button, "button");
  const down = booleanField(record.button, "down");
  const seq = integerField(record.button, "seq");
  const t = numberField(record.button, "t");
  if (button !== "primary" || down === null || seq === null || t === null) return null;
  return {
    type: "ready",
    session,
    serverProof,
    heartbeatMs,
    source,
    button: { button, down, seq, t }
  };
}
function parseButton(record) {
  const button = stringField(record, "button");
  const down = booleanField(record, "down");
  const seq = integerField(record, "seq");
  const t = numberField(record, "t");
  const sent = numberField(record, "sent");
  if (button !== "primary" || down === null || seq === null || t === null || sent === null)
    return null;
  return { type: "button", button, down, seq, t, sent };
}
function parsePing(record) {
  const seq = integerField(record, "seq");
  const down = booleanField(record, "down");
  const sent = numberField(record, "sent");
  if (seq === null || down === null || sent === null) return null;
  return { type: "ping", seq, down, sent };
}
function parseSource(record) {
  const source = sourceBody(record);
  if (!source) return null;
  return { type: "source", ...source };
}
function parseCommand(record) {
  const action = stringField(record, "action");
  const seq = integerField(record, "seq");
  const sent = numberField(record, "sent");
  if (action !== "open-menu" || seq === null || sent === null) return null;
  return { type: "command", action, seq, sent };
}
function parseServerFrame(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value) || typeof value.type !== "string") return null;
  switch (value.type) {
    case "hello":
      return parseHello(value);
    case "ready":
      return parseReady(value);
    case "button":
      return parseButton(value);
    case "ping":
      return parsePing(value);
    case "source":
      return parseSource(value);
    case "command":
      return parseCommand(value);
    default:
      return { type: "unknown", rawType: value.type };
  }
}
function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
function decodePairingCode(code) {
  const trimmed = code.trim();
  if (!/^[A-Za-z0-9_-]+$/u.test(trimmed)) return null;
  const padded = trimmed + "=".repeat((4 - trimmed.length % 4) % 4);
  const encoded = padded.replaceAll("-", "+").replaceAll("_", "/");
  let binary;
  try {
    binary = atob(encoded);
  } catch {
    return null;
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.length === 32 ? bytes : null;
}
function newNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}
async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    copyBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(message));
  return new Uint8Array(signature);
}
function copyBytes(bytes) {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}
async function proof(secret, nonce, clientNonce, role) {
  const digest = await hmac(secret, `spen-bridge/1|${role}|${nonce}|${clientNonce}`);
  return base64url(digest);
}
var BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32(bytes) {
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = buffer << 8 | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += BASE32[buffer >> bits & 31];
    }
  }
  if (bits > 0) output += BASE32[buffer << 5 - bits & 31];
  return output;
}
async function fingerprint(secret) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", copyBytes(secret)));
  const encoded = base32(digest);
  return `${encoded.slice(0, 4)}-${encoded.slice(4, 8)}`;
}
function safeEqual(left, right) {
  const a = textEncoder.encode(left);
  const b = textEncoder.encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return diff === 0;
}

// src/settings/settings.ts
var import_obsidian2 = require("obsidian");
var DEFAULT_SETTINGS = {
  buttonTapAction: "menu",
  buttonDoubleTapAction: "copy",
  buttonHoldAction: "paste",
  buttonContactAction: "eraser",
  doubleTapMs: 300,
  longPressMs: 450,
  movementThresholdPx: 8,
  // Pointer Events specifies bit 2 for a pen barrel button. Bit 1 is the tip.
  barrelButtonMask: 2,
  primaryContactMode: "hover-only",
  stylusTestMode: false,
  debugMode: false,
  debugOverlay: false,
  penBridgeEnabled: false,
  penBridgePort: 47631,
  lateWindowMs: 40,
  midStrokePress: "split",
  eraserStrategy: "synthetic-button5",
  suppressHoverButtonEvents: true
};
var NUMERIC_SETTING_LIMITS = {
  doubleTapMs: { min: 100, max: 1e3 },
  longPressMs: { min: 150, max: 2e3 },
  movementThresholdPx: { min: 1, max: 100 },
  lateWindowMs: { min: 0, max: 100 }
};
var BARREL_MASKS = [1, 2, 4, 8, 16, 32];
function parseNumericSetting(key, value) {
  const parsed = Number(value);
  const { min, max } = NUMERIC_SETTING_LIMITS[key];
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}
function describeBarrelSource(settings, bridgeReady) {
  if (bridgeReady) return "bridge";
  if (settings.barrelButtonMask === 1 && settings.primaryContactMode === "hover-only") {
    return "hover-latch";
  }
  return `pointer mask ${settings.barrelButtonMask}`;
}
function normalizeSettings(value, platform = { android: import_obsidian2.Platform.isAndroidApp }) {
  const action = (candidate, fallback) => candidate === "menu" || candidate === "copy" || candidate === "paste" || candidate === "none" ? candidate : fallback;
  const number = (candidate, fallback, min, max) => typeof candidate === "number" && Number.isFinite(candidate) ? Math.min(max, Math.max(min, Math.round(candidate))) : fallback;
  const maskWasUnset = value.barrelButtonMask === void 0;
  const explicitMask = BARREL_MASKS.find((mask) => mask === value.barrelButtonMask);
  return {
    buttonTapAction: action(value.buttonTapAction, DEFAULT_SETTINGS.buttonTapAction),
    buttonDoubleTapAction: action(
      value.buttonDoubleTapAction,
      DEFAULT_SETTINGS.buttonDoubleTapAction
    ),
    buttonHoldAction: action(value.buttonHoldAction, DEFAULT_SETTINGS.buttonHoldAction),
    buttonContactAction: value.buttonContactAction === "none" ? "none" : "eraser",
    doubleTapMs: number(
      value.doubleTapMs,
      300,
      NUMERIC_SETTING_LIMITS.doubleTapMs.min,
      NUMERIC_SETTING_LIMITS.doubleTapMs.max
    ),
    longPressMs: number(
      value.longPressMs,
      450,
      NUMERIC_SETTING_LIMITS.longPressMs.min,
      NUMERIC_SETTING_LIMITS.longPressMs.max
    ),
    movementThresholdPx: number(
      value.movementThresholdPx,
      8,
      NUMERIC_SETTING_LIMITS.movementThresholdPx.min,
      NUMERIC_SETTING_LIMITS.movementThresholdPx.max
    ),
    barrelButtonMask: explicitMask ?? (platform.android && maskWasUnset ? 1 : DEFAULT_SETTINGS.barrelButtonMask),
    primaryContactMode: value.primaryContactMode === "experimental" ? "experimental" : "hover-only",
    stylusTestMode: value.stylusTestMode === true,
    debugMode: value.debugMode === true,
    debugOverlay: value.debugOverlay === true,
    penBridgeEnabled: value.penBridgeEnabled === true,
    penBridgePort: number(value.penBridgePort, 47631, 1024, 65535),
    lateWindowMs: number(
      value.lateWindowMs,
      40,
      NUMERIC_SETTING_LIMITS.lateWindowMs.min,
      NUMERIC_SETTING_LIMITS.lateWindowMs.max
    ),
    midStrokePress: value.midStrokePress === "next-contact" ? "next-contact" : "split",
    eraserStrategy: value.eraserStrategy === "set-active-tool" ? "set-active-tool" : "synthetic-button5",
    suppressHoverButtonEvents: value.suppressHoverButtonEvents !== false
  };
}

// src/diagnostics/verdict.ts
function verdict(checks) {
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
  if (checks.handshake === "ready" && checks.serverProof === "ok" && checks.source?.state === "ok") {
    return "Bridge reachable and paired: mid-stroke erase ON";
  }
  if (checks.handshake === "skipped") {
    return "Bridge reachable. Paste a pairing code to turn on mid-stroke erase.";
  }
  if (checks.handshake === "failed") return "Bridge handshake failed";
  return "Bridge check incomplete";
}
function formatCheckLines(checks) {
  const http = checks.http.ok ? `\u2705 Native HTTP: ${checks.http.status ?? ""} ${checks.http.body ?? ""}`.trim() : `\u274C Native HTTP: ${checks.http.error ?? `status ${checks.http.status ?? "unknown"}`}`;
  const socket = checks.websocket.ok ? `\u2705 WebSocket open: ${checks.websocket.openMs ?? "?"} ms` : `\u274C WebSocket open: ${checks.websocket.error ?? "failed"}${checks.websocket.closeCode === null ? "" : ` close ${checks.websocket.closeCode}`}${checks.websocket.closeReason ? ` ${checks.websocket.closeReason}` : ""}`;
  const hello = checks.hello ? `\u2705 hello: proto ${checks.hello.proto} ${checks.hello.app} ${checks.hello.appVersion} caps ${checks.hello.caps.join(",")}` : "\u274C hello: not received";
  const handshake = checks.handshake === "ready" ? "\u2705 Handshake: ready" : checks.handshake === "skipped" ? "Handshake: skipped (no pairing code)" : checks.handshake === "not-run" ? "Handshake: not run" : `\u274C Handshake: ${checks.handshake}`;
  const proof2 = checks.serverProof === "ok" ? "\u2705 Server proof" : checks.serverProof === "bad" ? "\u274C Server proof" : `Server proof: ${checks.serverProof}`;
  const source = !checks.source ? "Source: not received" : checks.source.state === "ok" ? `\u2705 Source: ok ${checks.source.name ?? ""} ${checks.source.node ?? ""}`.trim() : `\u274C Source: unavailable ${checks.source.reason ?? ""}`.trim();
  return [http, socket, hello, handshake, proof2, source, verdict(checks)];
}

// src/diagnostics/probeSummary.ts
function unique(values) {
  return [...new Set(values)].sort((left, right) => left - right);
}
function summarizeProbe(events) {
  const pen = events.filter((event) => event.pointerType === "pen");
  return {
    penSeen: pen.length > 0,
    hoverButtons: unique(
      pen.filter((event) => event.phase === "hover").map((event) => event.buttons)
    ),
    contactButtons: unique(
      pen.filter((event) => event.phase === "contact").map((event) => event.buttons)
    ),
    downButtons: unique(
      pen.filter((event) => event.type === "pointerdown").map((event) => event.button)
    ),
    eraserSeen: pen.some((event) => event.button === 5 || (event.buttons & 32) !== 0),
    contextMenuFromPen: pen.some((event) => event.type === "contextmenu")
  };
}
function brace(values) {
  return `{${values.join(", ")}}`;
}
function formatProbeSummary(summary) {
  return [
    `Pen seen: ${summary.penSeen ? "yes" : "no"}`,
    `buttons values while hovering: ${brace(summary.hoverButtons)}`,
    `buttons values while touching: ${brace(summary.contactButtons)}`,
    `button values on down: ${brace(summary.downButtons)}`,
    `eraser end (button 5 / buttons 32) seen: ${summary.eraserSeen ? "yes" : "no"}`,
    `context menu from pen: ${summary.contextMenuFromPen ? "yes" : "no"}`
  ].join("\n");
}

// src/diagnostics/report.ts
function isDiagnosticBuild(version) {
  return version.includes("-diag");
}
function chromeVersion(userAgent) {
  return userAgent.match(/Chrome\/([\d.]+)/u)?.[1] ?? null;
}
function buildReport(input) {
  const events = input.probeEvents.slice(-50).map((event) => ({
    t: event.t,
    type: event.type,
    pointerType: event.pointerType,
    button: event.button,
    buttons: event.buttons,
    pressure: event.pressure,
    phase: event.phase
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
    log: input.log.slice(-100)
  };
}
function toJSON(report) {
  return JSON.stringify(report, null, 2);
}
function toText(report) {
  const settings = report.environment.settings;
  const lines = [
    `Excalidraw Stylus Controls ${report.environment.pluginVersion}`,
    `Obsidian ${report.environment.obsidianVersion} \xB7 Android ${report.environment.android ? "yes" : "no"} \xB7 tablet ${report.environment.tablet ? "yes" : "no"}`,
    `Chrome ${report.environment.chrome ?? "unknown"} \xB7 screen ${report.environment.screen.width}\xD7${report.environment.screen.height}`,
    `Excalidraw ${report.excalidraw.version ?? "not installed"} \xB7 temp eraser: ${report.excalidraw.temporaryEraser}`,
    `Barrel source: ${report.barrelSource}`,
    `Bridge enabled: ${settings.penBridgeEnabled ? "yes" : "no"} \xB7 port ${settings.penBridgePort} \xB7 mask ${settings.barrelButtonMask} \xB7 ${settings.primaryContactMode}`,
    `Strategy ${report.environment.settings.effectiveEraserStrategy} \xB7 late window ${settings.lateWindowMs} ms \xB7 mid-stroke ${settings.midStrokePress}`,
    report.verdict,
    "",
    "```json",
    toJSON(report),
    "```"
  ];
  return lines.join("\n");
}
function formatBridgeStatus(snapshot) {
  const status = snapshot.status;
  if (status.state === "off") return "off";
  if (status.state === "connecting") {
    const retry = snapshot.nextRetryInMs === null ? "" : ` \xB7 retry in ${snapshot.nextRetryInMs} ms`;
    return `connecting${retry}`;
  }
  if (status.state === "authenticating") return "authenticating";
  if (status.state === "failed") return `failed: ${status.reason || status.code}`;
  const pen = status.source === "ok" ? `pen ok${status.name ? ` (${status.name})` : ""}` : `pen unavailable: ${status.reason ?? "unknown"}`;
  const latency = snapshot.lastButton === null ? "no button yet" : snapshot.lastButton.latencyMs === null ? "receive-time only" : `latency ${Math.round(snapshot.lastButton.latencyMs)} ms`;
  const heartbeat = snapshot.heartbeatAgeMs === null ? "no heartbeat yet" : `heartbeat ${snapshot.heartbeatAgeMs} ms`;
  const fingerprint2 = snapshot.fingerprint ? ` \xB7 ${snapshot.fingerprint}` : "";
  return `ready \xB7 ${pen} \xB7 ${latency} \xB7 ${heartbeat}${fingerprint2}`;
}

// src/diagnostics/DiagnosticsService.ts
var DiagnosticsService = class {
  constructor(host) {
    this.host = host;
  }
  lastCheck = null;
  async checkBridge() {
    const http = await this.checkHttp(this.host.settings.penBridgePort);
    const result = await this.checkSocket(this.host.settings.penBridgePort, http);
    this.lastCheck = result;
    return result;
  }
  report() {
    const settings = this.host.settings;
    return buildReport({
      environment: {
        obsidianVersion: import_obsidian3.apiVersion,
        android: import_obsidian3.Platform.isAndroidApp,
        tablet: import_obsidian3.Platform.isTablet,
        pluginVersion: this.host.manifest.version,
        chrome: chromeVersion(navigator.userAgent),
        screen: {
          width: Math.round(window.innerWidth),
          height: Math.round(window.innerHeight)
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
          buttonContactAction: settings.buttonContactAction
        }
      },
      bridgeCheck: this.lastCheck,
      live: this.host.bridgeSnapshot(),
      barrelSource: describeBarrelSource(settings, this.host.bridgeReady()),
      probeEvents: this.host.probeEvents(),
      excalidraw: this.excalidraw(),
      log: this.host.logLines()
    });
  }
  async copyReport() {
    const text = toText(this.report());
    try {
      await navigator.clipboard.writeText(text);
      new import_obsidian3.Notice("Diagnostics report copied.");
    } catch {
      const modal = new import_obsidian3.Modal(this.host.app);
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
  checkLines() {
    return this.lastCheck ? formatCheckLines(this.lastCheck) : ["Bridge has not been checked in this session."];
  }
  async runTemporaryEraserTest() {
    const leaf = this.host.app.workspace.activeLeaf;
    if (!leaf || leaf.view.getViewType() !== "excalidraw") {
      const note2 = "Open a new, empty drawing first";
      this.host.setTemporaryEraser(note2, null);
      return note2;
    }
    if (typeof window.confirm === "function" && !window.confirm("Run the temporary eraser test on this drawing? Use a new, empty drawing.")) {
      return "Cancelled";
    }
    const canvas = leaf.view.containerEl.querySelector("canvas") ?? leaf.view.containerEl;
    const rect = canvas.getBoundingClientRect();
    const bridge = new ExcalidrawBridge(leaf);
    const center = {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    };
    let began = false;
    canvas.addEventListener(
      "pointerdown",
      (event) => {
        began = bridge.beginMomentaryEraser(event).ok;
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
    const note = available ? "fork temp-eraser: available" : "not available \u2192 using setActiveTool fallback";
    this.host.setTemporaryEraser(note, available ? "synthetic-button5" : "set-active-tool");
    return note;
  }
  excalidraw() {
    const installed = readInstalledExcalidraw(this.host.app);
    const automate = getGlobalAutomate();
    const view = this.host.app.workspace.activeLeaf?.view;
    let canReadActiveTool = false;
    let canSetActiveTool = false;
    let newElement = null;
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
      temporaryEraser: this.host.temporaryEraserNote
    };
  }
  async checkHttp(port) {
    try {
      const response = await (0, import_obsidian3.requestUrl)({ url: `http://127.0.0.1:${port}/health`, throw: false });
      return {
        ok: response.status === 200,
        status: response.status,
        body: response.text.slice(0, 200),
        error: null
      };
    } catch (error) {
      return {
        ok: false,
        status: null,
        body: null,
        error: (error instanceof Error ? error.message : "request failed").slice(0, 300)
      };
    }
  }
  checkSocket(port, http) {
    const secret = decodePairingCode(this.host.pairingCode());
    return new Promise((resolve) => {
      let settled = false;
      let opened = false;
      let hello = null;
      let helloFrame = null;
      let clientNonce = "";
      let handshake = "not-run";
      let serverProof = "not-run";
      let source = null;
      const started = performance.now();
      const socket = new WebSocket(`ws://127.0.0.1:${port}/v1/pen`);
      const finish = (closeCode, closeReason, wasClean, error) => {
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
            wasClean
          },
          hello,
          handshake,
          serverProof,
          source
        });
        try {
          socket.close();
        } catch {
        }
      };
      const timer = window.setTimeout(
        () => finish(null, "timeout", false, opened ? null : "timeout"),
        3e3
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
            caps: frame.caps
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
                proof: clientProof
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
            name: ready.source.name
          };
          finish(null, null, true, null);
        });
      });
    });
  }
};
function readTool(view) {
  const api = getLeafApi(view);
  if (!api.ok) return null;
  return readActiveTool(api.value)?.type ?? null;
}
function waitFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}
function penEvent(type, center, over) {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: 1,
    pointerType: "pen",
    isPrimary: true,
    clientX: center.clientX,
    clientY: center.clientY,
    ...over
  });
}

// src/menu/StylusMenu.ts
var MENU_MARGIN_PX = 8;
var FALLBACK_MENU_SIZE = { width: 172, height: 300 };
function clampMenuPosition(point, viewport, menu) {
  return {
    x: Math.max(MENU_MARGIN_PX, Math.min(point.x, viewport.width - menu.width - MENU_MARGIN_PX)),
    y: Math.max(MENU_MARGIN_PX, Math.min(point.y, viewport.height - menu.height - MENU_MARGIN_PX))
  };
}
var StylusMenu = class {
  element = null;
  outsideListener = null;
  openGeneration = 0;
  open(point, bridge) {
    this.close();
    const generation = this.openGeneration;
    const menu = document.body.createDiv({ cls: "excalidraw-stylus-menu" });
    const actions2 = [
      ["Selection", () => bridge.setTool("selection")],
      ["Free draw", () => bridge.setTool("freedraw")],
      ["Eraser", () => bridge.setTool("eraser")],
      ["Rectangle", () => bridge.setTool("rectangle")],
      ["Arrow", () => bridge.setTool("arrow")],
      ["Copy", () => bridge.copySelectedElements()],
      ["Paste", () => bridge.pasteAt(point)]
    ];
    for (const [name, callback] of actions2) {
      const button = menu.createEl("button", {
        text: name,
        cls: "excalidraw-stylus-menu__item"
      });
      button.addEventListener("pointerup", (event) => {
        event.stopPropagation();
        event.preventDefault();
        callback();
        this.close();
      });
    }
    this.element = menu;
    const position = clampMenuPosition(
      point,
      { width: window.innerWidth, height: window.innerHeight },
      {
        width: menu.offsetWidth || FALLBACK_MENU_SIZE.width,
        height: menu.offsetHeight || FALLBACK_MENU_SIZE.height
      }
    );
    menu.setCssProps({ left: `${position.x}px`, top: `${position.y}px` });
    window.setTimeout(() => {
      if (generation !== this.openGeneration || !this.element) return;
      this.outsideListener = (event) => {
        if (!this.element?.contains(event.target)) this.close();
      };
      document.addEventListener("pointerdown", this.outsideListener, true);
    }, 0);
  }
  close = () => {
    this.openGeneration += 1;
    if (this.outsideListener)
      document.removeEventListener("pointerdown", this.outsideListener, true);
    this.outsideListener = null;
    this.element?.remove();
    this.element = null;
  };
};

// src/penbridge/PenBridgeClient.ts
var BACKOFF_MS = [250, 500, 1e3, 2e3, 5e3];
var WATCHDOG_MS = 3e3;
function defaultVisibility() {
  return {
    state: () => {
      if (typeof document === "undefined") return "visible";
      return document.visibilityState === "hidden" ? "hidden" : "visible";
    },
    subscribe: (listener) => {
      if (typeof document === "undefined") return () => void 0;
      document.addEventListener("visibilitychange", listener);
      return () => document.removeEventListener("visibilitychange", listener);
    }
  };
}
var PenBridgeClient = class {
  constructor(opts) {
    this.opts = opts;
    this.url = opts.url;
    this.now = opts.now ?? (() => Date.now());
    this.perfNow = opts.perfNow ?? (() => performance.now());
    this.scheduler = opts.scheduler ?? {
      setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
      clearTimeout: (handle) => globalThis.clearTimeout(handle)
    };
    this.random = opts.random ?? (() => Math.random());
    this.nonce = opts.nonce ?? newNonce;
    this.visibility = opts.visibility ?? defaultVisibility();
    this.wsFactory = opts.wsFactory ?? ((url) => new WebSocket(url));
    this.unlisten = this.visibility.subscribe(() => this.onVisibility());
  }
  url;
  demanded = false;
  failed = false;
  disposed = false;
  socket = null;
  connection = 0;
  levelDown = false;
  lastSeq = -1;
  attempt = 0;
  retryTimer = null;
  watchdog = null;
  lastFrameAt = null;
  reconnectAttempts = 0;
  nextRetryAt = null;
  lastCloseCode = null;
  lastCloseReason = "";
  status = { state: "off" };
  hello = null;
  pendingNonce = null;
  fingerprintValue = null;
  appVersion = null;
  proto = null;
  sourceName;
  sourceNode;
  sourceReason;
  sourceState = null;
  lastButton = null;
  unlisten;
  now;
  perfNow;
  scheduler;
  random;
  nonce;
  visibility;
  wsFactory;
  setDemand(wanted) {
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
  reconnectNow() {
    this.failed = false;
    this.attempt = 0;
    this.clearRetry();
    this.forceUp();
    this.closeSocket(CLOSE.NORMAL, "reconnect");
    if (this.demanded && !this.hidden()) this.open();
  }
  setUrl(url) {
    this.url = url;
  }
  isDown() {
    return this.status.state === "ready" && this.levelDown;
  }
  isReady() {
    return this.status.state === "ready";
  }
  snapshot() {
    const now = this.now();
    return {
      status: this.status,
      heartbeatAgeMs: this.lastFrameAt === null ? null : Math.max(0, Math.round(now - this.lastFrameAt)),
      reconnectAttempts: this.reconnectAttempts,
      nextRetryInMs: this.nextRetryAt === null ? null : Math.max(0, Math.round(this.nextRetryAt - now)),
      lastCloseCode: this.lastCloseCode,
      lastCloseReason: this.lastCloseReason,
      lastButton: this.lastButton,
      appVersion: this.appVersion,
      proto: this.proto,
      fingerprint: this.fingerprintValue,
      url: this.url
    };
  }
  dispose() {
    this.disposed = true;
    this.demanded = false;
    this.clearRetry();
    this.forceUp();
    this.closeSocket(CLOSE.NORMAL, "dispose");
    this.unlisten();
  }
  hidden() {
    return this.visibility.state() === "hidden";
  }
  onVisibility() {
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
  open() {
    if (this.socket || this.disposed || !this.demanded || this.failed || this.hidden()) return;
    const connection = ++this.connection;
    this.hello = null;
    this.pendingNonce = null;
    this.emitStatus({ state: "connecting" });
    let socket;
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
  async onMessage(connection, data) {
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
  async onHello(connection, frame) {
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
      fingerprint(secret)
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
        proof: clientProof
      })
    );
  }
  async onReady(connection, frame) {
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
      fingerprint: this.fingerprintValue ?? ""
    });
    this.applyLevel(frame.button.down, frame.button.seq, frame.button.t, true);
    if (frame.source.state === "unavailable") this.forceUp();
  }
  onButtonFrame(frame) {
    if (frame.seq <= this.lastSeq) return;
    this.applyLevel(frame.down, frame.seq, frame.t, true);
  }
  onPing(seq, down, sent) {
    this.socket?.send(JSON.stringify({ type: "pong", sent }));
    if (seq > this.lastSeq) this.lastSeq = seq;
    if (down !== this.levelDown) this.applyLevel(down, seq, null, false);
  }
  onSource(frame) {
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
        fingerprint: this.fingerprintValue ?? ""
      });
    }
    if (frame.state === "unavailable") this.forceUp();
    this.opts.debug?.(`bridge: source ${frame.state}${frame.reason ? ` ${frame.reason}` : ""}`);
  }
  applyLevel(down, seq, kernelTime, fromButton) {
    if (fromButton && seq <= this.lastSeq) return;
    if (fromButton) this.lastSeq = seq;
    const now = this.now();
    const perf = this.perfNow();
    const reliable = kernelTime !== null && Math.abs(now - kernelTime) <= 1e3;
    const signal = {
      down,
      seq,
      pressedAtPerf: reliable && kernelTime !== null ? perf - (now - kernelTime) : perf,
      latencyMs: reliable && kernelTime !== null ? now - kernelTime : null
    };
    this.levelDown = down;
    this.lastButton = {
      down,
      seq,
      latencyMs: signal.latencyMs,
      clock: signal.latencyMs === null ? "receive" : "bridge"
    };
    this.opts.onButton(signal);
  }
  forceUp() {
    if (!this.levelDown) return;
    this.levelDown = false;
    const signal = {
      down: false,
      seq: this.lastSeq,
      pressedAtPerf: this.perfNow(),
      latencyMs: null
    };
    this.lastButton = { down: false, seq: this.lastSeq, latencyMs: null, clock: "receive" };
    this.opts.onButton(signal);
  }
  armWatchdog(connection) {
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
  handleClose(code, reason) {
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
        reason: code === CLOSE.AUTH ? "wrong pairing code" : reason || "protocol error"
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
  fail(code, reason) {
    this.failed = true;
    this.forceUp();
    this.clearRetry();
    this.lastCloseCode = code;
    this.lastCloseReason = reason;
    this.closeSocket(code, reason);
    this.emitStatus({ state: "failed", code, reason });
  }
  scheduleRetry() {
    if (!this.demanded || this.failed || this.disposed || this.hidden()) return;
    this.clearRetry();
    const base = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)] ?? 5e3;
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
  closeSocket(code, reason) {
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
  clearRetry() {
    if (this.retryTimer !== null) this.scheduler.clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.nextRetryAt = null;
  }
  clearWatchdog() {
    if (this.watchdog !== null) this.scheduler.clearTimeout(this.watchdog);
    this.watchdog = null;
  }
  emitStatus(status) {
    this.status = status;
    this.opts.onStatus(status);
  }
};

// src/penbridge/pairingStore.ts
var STORAGE_KEY = "excalidraw-stylus-controls:pairing";
var PairingStore = class {
  constructor(app) {
    this.app = app;
  }
  load() {
    if (typeof this.app.loadLocalStorage === "function") {
      const value = this.app.loadLocalStorage(STORAGE_KEY);
      return typeof value === "string" ? value : "";
    }
    return this.storage().getItem(this.fallbackKey()) ?? "";
  }
  save(code) {
    if (typeof this.app.saveLocalStorage === "function") {
      this.app.saveLocalStorage(STORAGE_KEY, code);
      return;
    }
    this.storage().setItem(this.fallbackKey(), code);
  }
  clear() {
    if (typeof this.app.saveLocalStorage === "function") {
      this.app.saveLocalStorage(STORAGE_KEY, null);
      return;
    }
    this.storage().removeItem(this.fallbackKey());
  }
  fallbackKey() {
    return `excalidraw-stylus-controls:${this.app.vault.getName()}:pairing`;
  }
  storage() {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    throw new Error("Local pairing storage is unavailable.");
  }
};

// src/penbridge/PenSignalHub.ts
var RECENT_MS = 5e3;
var PenSignalHub = class {
  constructor(client, now = () => performance.now()) {
    this.client = client;
    this.now = now;
  }
  targets = /* @__PURE__ */ new Set();
  fallback = () => null;
  setFallback(fallback) {
    this.fallback = fallback;
  }
  register(target) {
    this.targets.add(target);
  }
  unregister(target) {
    this.targets.delete(target);
  }
  isReady() {
    return this.client()?.isReady() ?? false;
  }
  isDown() {
    return this.client()?.isDown() ?? false;
  }
  dispatch(signal) {
    this.route()?.onExternalButton(signal);
  }
  route() {
    const now = this.now();
    let best = null;
    for (const target of this.targets) {
      if (now - target.lastPenActivityAt > RECENT_MS) continue;
      if (!best || target.lastPenActivityAt > best.lastPenActivityAt) best = target;
    }
    return best ?? this.fallback();
  }
};

// src/settings/SettingsTab.ts
var import_obsidian4 = require("obsidian");

// src/diagnostics/PenEventProbe.ts
var EVENT_TYPES = [
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointercancel",
  "contextmenu"
];
var PenEventProbe = class {
  constructor(parent, onChange) {
    this.onChange = onChange;
    this.box = parent.createDiv({ cls: "excalidraw-stylus-probe" });
    this.box.setText(
      "Hover the S Pen here, press and release the side button, then touch and draw while pressing it"
    );
    this.summary = parent.createDiv({ cls: "excalidraw-stylus-probe-summary" });
    for (const type of EVENT_TYPES) {
      const listener = (event) => this.record(event);
      this.box.addEventListener(type, listener);
      this.listeners.push([type, listener]);
    }
    this.render();
  }
  events = [];
  started = performance.now();
  box;
  summary;
  listeners = [];
  snapshot() {
    return this.events.map((event) => ({ ...event }));
  }
  dispose() {
    for (const [type, listener] of this.listeners) this.box.removeEventListener(type, listener);
    this.listeners.length = 0;
    this.box.remove();
    this.summary.remove();
  }
  record(event) {
    if (event.type === "contextmenu") event.preventDefault();
    this.events.push({
      t: Math.max(0, Math.round(performance.now() - this.started)),
      type: event.type,
      pointerType: event.pointerType || "mouse",
      button: event.button,
      buttons: event.buttons,
      pressure: Math.round(event.pressure * 100) / 100,
      phase: event.pressure > 0 ? "contact" : "hover"
    });
    if (this.events.length > 50) this.events.shift();
    this.render();
    this.onChange?.();
  }
  render() {
    this.summary.setText(formatProbeSummary(summarizeProbe(this.events)));
  }
};

// src/settings/SettingsTab.ts
var actions = {
  menu: "Open menu",
  copy: "Copy",
  paste: "Paste",
  none: "Do nothing"
};
var testProfiles = {
  "standard": {
    label: "Standard barrel \u2014 buttons: 2",
    mask: 2,
    primaryContactMode: "hover-only"
  },
  "android-hover": {
    label: "Android/WebView primary \u2014 buttons: 1, hover only",
    mask: 1,
    primaryContactMode: "hover-only"
  },
  "android-contact": {
    label: "Android/WebView primary \u2014 buttons: 1, contact experiment",
    mask: 1,
    primaryContactMode: "experimental"
  },
  "auxiliary": {
    label: "Auxiliary/middle \u2014 buttons: 4",
    mask: 4,
    primaryContactMode: "hover-only"
  },
  "back": { label: "Back \u2014 buttons: 8", mask: 8, primaryContactMode: "hover-only" },
  "forward": { label: "Forward \u2014 buttons: 16", mask: 16, primaryContactMode: "hover-only" },
  "eraser": { label: "Pen eraser \u2014 buttons: 32", mask: 32, primaryContactMode: "hover-only" }
};
var TESTER_GUIDE = "https://github.com/janlewski/excalidraw-stylus-controls/blob/main/docs/TESTER-GUIDE.md";
var SettingsTab = class extends import_obsidian4.PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  probe = null;
  unwatch = null;
  liveStatus = null;
  checkResults = null;
  fingerprintEl = null;
  eraserResult = null;
  display() {
    this.teardown();
    const { containerEl } = this;
    containerEl.empty();
    const diagnostic = isDiagnosticBuild(this.plugin.manifest.version);
    if (diagnostic) this.renderDiagnostics();
    containerEl.createEl("p", {
      text: "Requires the Excalidraw community plugin. Copy and paste await a compatible Excalidraw integration and are currently unavailable."
    });
    this.action("Tap", "buttonTapAction");
    this.action("Double tap", "buttonDoubleTapAction");
    this.action("Hold", "buttonHoldAction");
    new import_obsidian4.Setting(containerEl).setName("Button + pen contact").setDesc("Temporary tool while the side button is held during pen contact.").addDropdown(
      (dropdown) => dropdown.addOption("eraser", "Temporary eraser").addOption("none", "Do nothing").setValue(this.plugin.settings.buttonContactAction).onChange(
        async (value) => this.plugin.updateSettings({
          buttonContactAction: value
        })
      )
    );
    this.number("Double-tap interval (ms)", "doubleTapMs");
    this.number("Long-press delay (ms)", "longPressMs");
    this.number("Movement threshold (px)", "movementThresholdPx");
    new import_obsidian4.Setting(containerEl).setName("S Pen test mode").setDesc(
      "Suppresses menu, clipboard, and temporary-tool changes while still showing recognized state and effects in the debug overlay. Use this while trying signal profiles."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.stylusTestMode).onChange(async (value) => this.plugin.updateSettings({ stylusTestMode: value }))
    );
    new import_obsidian4.Setting(containerEl).setName("S Pen signal test profile").setDesc(
      "Try one profile at a time with test mode enabled, then export the trace. The Android contact experiment may recognize every ordinary pen stroke; use it only in a disposable drawing."
    ).addDropdown((dropdown) => {
      for (const [value, profile] of Object.entries(testProfiles))
        dropdown.addOption(value, profile.label);
      dropdown.setValue(this.currentTestProfile()).onChange(async (value) => {
        const profile = testProfiles[value];
        if (!profile) return;
        await this.plugin.updateSettings({
          barrelButtonMask: profile.mask,
          primaryContactMode: profile.primaryContactMode,
          stylusTestMode: true
        });
        this.display();
      });
    });
    this.renderBridge();
    new import_obsidian4.Setting(containerEl).setName("Debug logging").setDesc("Logs bounded raw pen event traces to the developer console.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.debugMode).onChange(async (value) => this.plugin.updateSettings({ debugMode: value }))
    );
    new import_obsidian4.Setting(containerEl).setName("Debug overlay").setDesc(
      "Shows the latest pen event and stylus state in the Excalidraw view. Requires debug logging."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.debugOverlay).onChange(async (value) => this.plugin.updateSettings({ debugOverlay: value }))
    );
    new import_obsidian4.Setting(containerEl).setName("Export debug trace").setDesc(
      "Copies buffered pen events from every open Excalidraw view as JSON, ready to attach to a bug report."
    ).addButton(
      (button) => button.setButtonText("Copy trace").onClick(() => this.plugin.copyStylusEventTrace())
    );
    if (!diagnostic) this.renderDiagnostics();
    this.unwatch = this.plugin.watchBridge(() => this.refreshLive());
  }
  hide() {
    this.teardown();
    super.hide();
  }
  teardown() {
    this.unwatch?.();
    this.unwatch = null;
    this.probe?.dispose();
    this.probe = null;
    this.liveStatus = null;
    this.checkResults = null;
    this.fingerprintEl = null;
    this.eraserResult = null;
  }
  renderDiagnostics() {
    const { containerEl } = this;
    containerEl.createEl("h3", { text: "Diagnostics" });
    containerEl.createEl("p", {
      text: "How to test: docs/TESTER-GUIDE.md. The report never includes the pairing code, vault name, note text, or pointer coordinates."
    });
    containerEl.createEl("a", { text: "How to test", href: TESTER_GUIDE });
    containerEl.createEl("p", {
      text: `Plugin ${this.plugin.manifest.version}. Open a new empty drawing before the eraser test.`
    });
    new import_obsidian4.Setting(containerEl).setName("Check bridge connection").setDesc(
      "Tries HTTP, WebSocket, hello, pairing, and the pen source. Nothing else needs to be open."
    ).addButton(
      (button) => button.setButtonText("Check").onClick(() => {
        button.setDisabled(true);
        if (this.checkResults) this.checkResults.setText("Checking\u2026");
        void this.plugin.checkBridge().then((checks) => {
          button.setDisabled(false);
          if (this.checkResults)
            this.checkResults.setText(this.plugin.bridgeCheckLines().join("\n"));
        });
      })
    );
    this.checkResults = containerEl.createEl("pre");
    this.checkResults.setText(this.plugin.bridgeCheckLines().join("\n"));
    containerEl.createEl("h4", { text: "Live bridge status" });
    this.liveStatus = containerEl.createEl("p");
    this.refreshLive();
    containerEl.createEl("h4", { text: "Pen event probe" });
    this.probe = new PenEventProbe(containerEl, () => {
      if (this.probe) this.plugin.setProbeEvents(this.probe.snapshot());
    });
    containerEl.createEl("h4", { text: "Excalidraw check" });
    this.eraserResult = containerEl.createEl("p", { text: this.plugin.temporaryEraserNote });
    new import_obsidian4.Setting(containerEl).setName("Test temporary eraser").setDesc(
      'Shows "Open a new, empty drawing first" unless an Excalidraw view is active, then asks before running.'
    ).addButton(
      (button) => button.setButtonText("Test temporary eraser").onClick(() => {
        void this.plugin.runTemporaryEraserTest().then((note) => {
          if (this.eraserResult) this.eraserResult.setText(note);
        });
      })
    );
    new import_obsidian4.Setting(containerEl).setName("Copy report").setDesc(
      "Copies a short summary and a JSON block. You can also run \u201CCopy diagnostics report\u201D from the command palette."
    ).addButton(
      (button) => button.setButtonText("Copy report").onClick(() => void this.plugin.copyDiagnosticsReport())
    );
  }
  renderBridge() {
    const { containerEl } = this;
    containerEl.createEl("h3", { text: "S Pen bridge (Android companion)" });
    containerEl.createEl("p", {
      text: "Turn off Samsung Air command, or a hover press can open that panel instead of reaching Obsidian. Without the bridge, Android uses the hover-latch fallback."
    });
    new import_obsidian4.Setting(containerEl).setName("Enable bridge").setDesc("Connects while an Excalidraw view is open and this note is visible.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.penBridgeEnabled).onChange(async (value) => this.plugin.updateSettings({ penBridgeEnabled: value }))
    );
    new import_obsidian4.Setting(containerEl).setName("Pairing code").setDesc(
      "Paste the code from the bridge app. It is stored on this device only, not in the vault."
    ).addText((text) => {
      text.inputEl.type = "password";
      text.setPlaceholder("Pairing code");
      text.setValue(this.plugin.pairingCode());
      text.onChange((value) => void this.commitPairing(value));
    }).addButton(
      (button) => button.setButtonText("Paste").onClick(() => {
        void navigator.clipboard.readText().then((value) => {
          void this.commitPairing(value);
          this.display();
        });
      })
    );
    this.fingerprintEl = containerEl.createEl("p", { text: this.fingerprintLabel() });
    new import_obsidian4.Setting(containerEl).setName("Status").setDesc(
      "Ready means mid-stroke erase can use the bridge. Reconnect after a wrong code or a protocol error."
    ).addButton(
      (button) => button.setButtonText("Reconnect").onClick(() => this.plugin.reconnectBridge())
    );
    this.number(
      "Late press window (ms)",
      "lateWindowMs",
      "Whole milliseconds from 0 to 100. Presses inside this window delete the tiny ink dot."
    );
    new import_obsidian4.Setting(containerEl).setName("Mid-stroke press").setDesc(
      "Split turns the rest of the current stroke into the eraser. Next contact waits until you lift."
    ).addDropdown(
      (dropdown) => dropdown.addOption("split", "Split this stroke").addOption("next-contact", "Erase the next contact").setValue(this.plugin.settings.midStrokePress).onChange(
        async (value) => this.plugin.updateSettings({ midStrokePress: value })
      )
    );
    new import_obsidian4.Setting(containerEl).setName("Eraser method").setDesc(
      "Synthetic button 5 uses Excalidraw's momentary eraser. Set active tool is the fallback."
    ).addDropdown(
      (dropdown) => dropdown.addOption("synthetic-button5", "Synthetic button 5").addOption("set-active-tool", "Set active tool").setValue(this.plugin.settings.eraserStrategy).onChange(
        async (value) => this.plugin.updateSettings({ eraserStrategy: value })
      )
    );
    new import_obsidian4.Setting(containerEl).setName("Suppress hover button events").setDesc(
      "Stops a zero-pressure pen event with buttons 1 from starting a stroke in mid-air while the barrel is held."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.suppressHoverButtonEvents).onChange(
        async (value) => this.plugin.updateSettings({ suppressHoverButtonEvents: value })
      )
    );
  }
  async commitPairing(value) {
    const trimmed = value.trim();
    if (!trimmed) await this.plugin.clearPairingCode();
    else if (decodePairingCode(trimmed)) await this.plugin.setPairingCode(trimmed);
    if (this.fingerprintEl) this.fingerprintEl.setText(this.fingerprintLabel());
    this.refreshLive();
  }
  fingerprintLabel() {
    return this.plugin.pairingFingerprint ? `Fingerprint ${this.plugin.pairingFingerprint} (must match the bridge app)` : "Fingerprint: paste a valid pairing code. It must match the bridge app.";
  }
  refreshLive() {
    if (this.liveStatus) this.liveStatus.setText(this.plugin.bridgeStatusText());
  }
  action(name, key) {
    new import_obsidian4.Setting(this.containerEl).setName(`S Pen side button: ${name}`).addDropdown((dropdown) => {
      for (const [value, label] of Object.entries(actions)) dropdown.addOption(value, label);
      dropdown.setValue(this.plugin.settings[key]).onChange(async (value) => this.plugin.updateSettings({ [key]: value }));
    });
  }
  number(name, key, desc) {
    const { min, max } = NUMERIC_SETTING_LIMITS[key];
    new import_obsidian4.Setting(this.containerEl).setName(name).setDesc(desc ?? `Whole milliseconds/pixels from ${min} to ${max}.`).addText(
      (text) => text.setValue(String(this.plugin.settings[key])).onChange(async (value) => {
        const parsed = parseNumericSetting(key, value);
        text.inputEl.setCustomValidity(
          parsed === null ? `Enter a whole number from ${min} to ${max}.` : ""
        );
        if (parsed === null) return;
        await this.plugin.updateSettings({ [key]: parsed });
      })
    );
  }
  currentTestProfile() {
    const { barrelButtonMask, primaryContactMode } = this.plugin.settings;
    return Object.entries(testProfiles).find(
      ([, profile]) => profile.mask === barrelButtonMask && profile.primaryContactMode === primaryContactMode
    )?.[0] ?? "standard";
  }
};

// src/debug/DebugOverlay.ts
var DebugOverlay = class {
  constructor(container, enabled) {
    this.container = container;
    this.enabled = enabled;
  }
  element = null;
  update(event, state, effect, statusLine) {
    if (!this.enabled()) {
      this.close();
      return;
    }
    const overlay = this.ensureElement();
    const stateSummary = [
      `hover:${String(!state.penContact)}`,
      `barrel:${String(state.barrelButtonHeld)}`,
      `consumed:${String(state.gestureConsumed)}`,
      `temp:${String(state.temporaryToolActive)}`
    ].join(" \xB7 ");
    overlay.setText(
      [
        `S Pen ${event.kind} id:${event.pointerId} button:${event.button} buttons:${event.buttons} pressure:${event.pressure.toFixed(2)}`,
        `tilt:${event.tiltX},${event.tiltY} twist:${event.twist} tangential:${event.tangentialPressure.toFixed(2)} size:${event.width}x${event.height}`,
        stateSummary,
        `effect:${effect?.type ?? "none"}`,
        statusLine ?? ""
      ].filter((line) => line.length > 0).join("\n")
    );
  }
  close() {
    this.element?.remove();
    this.element = null;
  }
  ensureElement() {
    if (this.element) return this.element;
    this.element = this.container.createDiv({ cls: "excalidraw-stylus-debug-overlay" });
    return this.element;
  }
};

// src/stylus/normalizePointerEvent.ts
function classifyPenEvent(event, held) {
  const hoverPressure = event.pressure < 0.01;
  const buttonType = event.type === "pointerdown" || event.type === "pointermove" || event.type === "pointerup";
  if (event.pointerType === "pen" && hoverPressure && (event.buttons & 1) !== 0 && buttonType && held) {
    return "hover-button";
  }
  if (event.pointerType === "pen" && (event.type === "pointerdown" || event.pressure >= 0.01)) {
    return "contact";
  }
  return "hover";
}
var eventKinds = {
  pointerdown: "down",
  pointermove: "move",
  pointerup: "up",
  pointercancel: "cancel",
  contextmenu: "contextmenu"
};
function normalizePointerEvent(event, isCanvasTarget) {
  return {
    kind: eventKinds[event.type] ?? "move",
    pointerType: event.pointerType,
    pointerId: event.pointerId,
    buttons: event.buttons,
    button: event.button,
    pressure: event.pressure,
    tangentialPressure: event.tangentialPressure,
    tiltX: event.tiltX,
    tiltY: event.tiltY,
    twist: event.twist,
    width: event.width,
    height: event.height,
    x: event.clientX,
    y: event.clientY,
    timestamp: event.timeStamp,
    isCanvasTarget
  };
}

// src/stylus/StylusGestureMachine.ts
var StylusGestureMachine = class {
  constructor(settings, scheduler) {
    this.settings = settings;
    this.scheduler = scheduler;
  }
  barrelButtonHeld = false;
  penContact = false;
  consumed = false;
  moved = false;
  holdFired = false;
  temporaryToolActive = false;
  pressOrigin = null;
  holdTimer = null;
  pendingTap = null;
  activePointerId = null;
  barrelSource = "pointer";
  contactStartedAt = null;
  lastPoint = null;
  releaseAfterContact = false;
  /** Switching sources must not turn a held barrel into a tap. */
  setBarrelSource(source) {
    if (source === this.barrelSource) return;
    if (this.barrelButtonHeld) this.cancelPress();
    this.barrelSource = source;
    this.releaseAfterContact = false;
  }
  handle(event) {
    if (event.pointerType !== "pen") return [];
    this.lastPoint = { x: event.x, y: event.y };
    const effects = [];
    if (event.kind === "contextmenu") {
      if (this.temporaryToolActive || this.barrelButtonHeld && this.penContact)
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
  handleExternalButton(input) {
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
      const late = this.contactStartedAt !== null && input.pressedAt <= this.contactStartedAt + this.settings.lateWindowMs;
      this.temporaryToolActive = true;
      return [
        {
          type: "temporary-tool-split",
          point: this.pointOf(this.lastPoint),
          discardStroke: late
        }
      ];
    }
    if (!this.barrelButtonHeld) return [];
    if (this.penContact) {
      this.releaseAfterContact = true;
      return [];
    }
    const effects = [];
    this.releasePress(effects);
    return effects;
  }
  dispose() {
    const effects = [];
    this.cancelTimer("hold");
    this.cancelPendingTap();
    if (this.temporaryToolActive) effects.push({ type: "temporary-tool-end" });
    this.temporaryToolActive = false;
    this.cancelPress();
    return effects;
  }
  snapshot() {
    return {
      barrelButtonHeld: this.barrelButtonHeld,
      penContact: this.penContact,
      gestureConsumed: this.consumed,
      temporaryToolActive: this.temporaryToolActive,
      hoverGestureMoved: this.moved,
      longPressFired: this.holdFired,
      activePointerId: this.activePointerId
    };
  }
  /** The controller calls this when the optional Excalidraw bridge rejects a start request. */
  temporaryToolDidNotStart() {
    this.temporaryToolActive = false;
  }
  startPress(origin) {
    const point = "kind" in origin ? { x: origin.x, y: origin.y } : origin;
    this.barrelButtonHeld = true;
    this.consumed = false;
    this.moved = false;
    this.holdFired = false;
    this.pressOrigin = point;
    this.holdTimer = this.scheduler.setTimeout(() => {
      if (!this.barrelButtonHeld || this.penContact || this.moved || this.consumed || !this.pressOrigin)
        return;
      this.holdFired = true;
      this.consumed = true;
      this.cancelPendingTap();
      this.onEffect?.({ type: "button-hold", point: this.pressOrigin });
    }, this.settings.longPressMs);
  }
  /** Controller registers this so scheduler callbacks retain pure semantic output. */
  onEffect = null;
  setEffectSink(sink) {
    this.onEffect = sink;
  }
  trackHoverMovement(event) {
    if (!this.pressOrigin || this.moved) return;
    const dx = event.x - this.pressOrigin.x;
    const dy = event.y - this.pressOrigin.y;
    if (Math.hypot(dx, dy) > this.settings.movementThresholdPx) {
      this.moved = true;
      this.cancelTimer("hold");
    }
  }
  consumeForContact(event, effects) {
    this.consumed = true;
    this.cancelTimer("hold");
    this.cancelPendingTap();
    if (this.settings.buttonContactAction === "eraser" && !this.temporaryToolActive) {
      this.temporaryToolActive = true;
      effects.push({ type: "temporary-tool-start", point: { x: event.x, y: event.y } });
    }
  }
  releasePress(effects) {
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
  cancelPress() {
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
  cancelTimer(which) {
    if (which === "hold" && this.holdTimer !== null) {
      this.scheduler.clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }
  cancelPendingTap() {
    if (this.pendingTap) this.scheduler.clearTimeout(this.pendingTap.timer);
    this.pendingTap = null;
  }
  isBarrelHeld(event) {
    return (event.buttons & this.settings.barrelButtonMask) !== 0;
  }
  canRecognizeBarrelOnContact(event) {
    return (this.settings.barrelButtonMask !== 1 || this.settings.primaryContactMode === "experimental") && this.isBarrelHeld(event);
  }
  hoverLatch() {
    return this.barrelSource === "pointer" && this.settings.barrelButtonMask === 1 && this.settings.primaryContactMode === "hover-only";
  }
  pointOf(point) {
    return point ? { x: point.x, y: point.y } : { x: 0, y: 0 };
  }
};

// src/stylus/StylusController.ts
var StylusController = class {
  constructor(leaf, bridge, settings, debug, dispatchAction, scheduler = window, pen = null, now = () => performance.now()) {
    this.leaf = leaf;
    this.bridge = bridge;
    this.settings = settings;
    this.debug = debug;
    this.dispatchAction = dispatchAction;
    this.pen = pen;
    this.now = now;
    this.machine = new StylusGestureMachine(this.gestureSettings(), scheduler);
    this.machine.setEffectSink((effect) => this.applyEffect(effect));
    this.overlay = new DebugOverlay(
      this.leaf.view.containerEl,
      () => this.settings().debugMode && this.settings().debugOverlay
    );
  }
  machine;
  savedTool = null;
  disposed = false;
  attached = false;
  listeners = [];
  overlay;
  latestEvent = null;
  lastPenEvent = null;
  lastPenActivityAt = 0;
  lastLatency = null;
  attach() {
    if (this.disposed || this.attached) return;
    this.attached = true;
    this.pen?.register(this);
    const element = this.leaf.view.containerEl;
    for (const type of [
      "pointerdown",
      "pointermove",
      "pointerup",
      "pointercancel",
      "contextmenu"
    ]) {
      const listener = (raw) => this.onPointerEvent(raw);
      element.addEventListener(type, listener, true);
      this.listeners.push([type, listener]);
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.attached = false;
    this.pen?.unregister(this);
    for (const [type, listener] of this.listeners)
      this.leaf.view.containerEl.removeEventListener(type, listener, true);
    this.listeners.length = 0;
    for (const effect of this.machine.dispose()) this.applyEffect(effect);
    this.overlay.close();
  }
  getTrace() {
    return this.debug.exportTrace();
  }
  recentMessages() {
    return this.debug.recentMessages();
  }
  lastPenPoint() {
    if (!this.latestEvent) return null;
    return { x: this.latestEvent.x, y: this.latestEvent.y };
  }
  bridgeForMenu() {
    return this.bridge;
  }
  onExternalButton(signal) {
    const latency = signal.latencyMs === null ? "receive-time" : `${Math.round(signal.latencyMs)}ms`;
    this.lastLatency = latency;
    this.debug.message(
      `bridge: ${signal.down ? "down" : "up"} seq=${signal.seq} latency=${latency}`
    );
    this.machine.setBarrelSource("bridge");
    for (const effect of this.machine.handleExternalButton({
      down: signal.down,
      pressedAt: signal.pressedAtPerf
    })) {
      this.applyEffect(effect);
    }
    this.refreshOverlay();
  }
  onPointerEvent(raw) {
    if (isSynthetic(raw)) return;
    if (raw.pointerType !== "pen") return;
    this.lastPenEvent = raw;
    this.lastPenActivityAt = this.now();
    const held = this.barrelBelievedHeld(raw);
    const phase = classifyPenEvent(raw, held);
    if (phase === "hover-button" && this.settings().suppressHoverButtonEvents) {
      if (typeof raw.stopImmediatePropagation === "function") raw.stopImmediatePropagation();
      raw.preventDefault();
    }
    const event = normalizePointerEvent(
      raw,
      this.leaf.view.containerEl.contains(raw.target)
    );
    if (phase === "hover-button") event.kind = "move";
    this.latestEvent = event;
    this.debug.event(event);
    this.machine.setBarrelSource(this.pen?.isReady() ? "bridge" : "pointer");
    const effects = this.machine.handle(event);
    if (effects.length === 0) this.refreshOverlay(event);
    for (const effect of effects) {
      if (effect.type === "suppress-context-menu") raw.preventDefault();
      this.applyEffect(effect, raw);
    }
  }
  applyEffect(effect, raw) {
    this.debug.message(`effect: ${effect.type}`);
    if (this.settings().stylusTestMode) {
      this.debug.message(`test mode suppressed: ${effect.type}`);
      this.refreshOverlay();
      return;
    }
    switch (effect.type) {
      case "temporary-tool-start":
        if (!this.savedTool) {
          const synthetic2 = this.settings().eraserStrategy === "synthetic-button5" && raw?.type === "pointerdown";
          const result = synthetic2 && raw ? this.bridge.beginMomentaryEraser(raw) : this.bridge.startTemporaryEraser();
          if (result.ok) this.savedTool = result.value;
          else this.machine.temporaryToolDidNotStart();
        }
        break;
      case "temporary-tool-split": {
        const event = this.lastPenEvent ?? raw;
        if (!event) break;
        const result = this.settings().eraserStrategy === "synthetic-button5" ? this.bridge.splitStrokeToEraser(event, effect.discardStroke) : this.bridge.splitStrokeWithActiveTool(event);
        if (result.ok) this.savedTool = result.value;
        else this.machine.temporaryToolDidNotStart();
        break;
      }
      case "temporary-tool-end":
        if (this.savedTool) {
          if (this.settings().eraserStrategy === "synthetic-button5") {
            this.bridge.endMomentaryEraser(this.savedTool);
          } else this.bridge.restoreTool(this.savedTool);
        }
        this.savedTool = null;
        break;
      case "button-tap":
        this.dispatchAction(this.settings().buttonTapAction, effect.point, this.bridge);
        break;
      case "button-double-tap":
        this.dispatchAction(this.settings().buttonDoubleTapAction, effect.point, this.bridge);
        break;
      case "button-hold":
        this.dispatchAction(this.settings().buttonHoldAction, effect.point, this.bridge);
        break;
      default:
        break;
    }
    this.refreshOverlay(this.latestEvent, effect);
  }
  refreshOverlay(event = this.latestEvent, effect) {
    if (!event) return;
    this.overlay.update(event, this.machine.snapshot(), effect, this.statusLine());
  }
  statusLine() {
    const source = describeBarrelSource(this.settings(), this.pen?.isReady() === true);
    const down = this.pen?.isDown() === true;
    const latency = this.lastLatency ? ` latency:${this.lastLatency}` : "";
    return `source:${source} down:${String(down)}${latency}`;
  }
  barrelBelievedHeld(raw) {
    if (this.pen?.isReady()) return this.pen.isDown();
    if (this.machine.snapshot().barrelButtonHeld) return true;
    const settings = this.settings();
    return settings.barrelButtonMask === 1 && settings.primaryContactMode === "hover-only" && raw.pressure < 0.01 && (raw.buttons & 1) !== 0;
  }
  gestureSettings() {
    const value = this.settings();
    return {
      buttonContactAction: value.buttonContactAction,
      doubleTapMs: value.doubleTapMs,
      longPressMs: value.longPressMs,
      movementThresholdPx: value.movementThresholdPx,
      barrelButtonMask: value.barrelButtonMask,
      primaryContactMode: value.primaryContactMode,
      lateWindowMs: value.lateWindowMs,
      midStrokePress: value.midStrokePress
    };
  }
};

// src/stylus/StylusViewRegistry.ts
var StylusViewRegistry = class {
  constructor(app, settings, actionHandler, createController, hooks) {
    this.app = app;
    this.settings = settings;
    this.actionHandler = actionHandler;
    this.hooks = hooks;
    this.createController = createController ?? ((leaf) => {
      const debug = new DebugLogger(() => this.settings().debugMode, hooks?.diagnostic === true);
      return new StylusController(
        leaf,
        new ExcalidrawBridge(leaf),
        this.settings,
        debug,
        this.actionHandler,
        window,
        hooks?.pen ?? null
      );
    });
  }
  controllers = /* @__PURE__ */ new Map();
  createController;
  sync() {
    const leaves = new Set(this.app.workspace.getLeavesOfType("excalidraw"));
    for (const leaf of leaves)
      if (!this.controllers.has(leaf)) {
        const controller = this.createController(leaf);
        controller.attach();
        this.controllers.set(leaf, controller);
      }
    for (const [leaf, controller] of this.controllers)
      if (!leaves.has(leaf)) {
        controller.dispose();
        this.controllers.delete(leaf);
      }
    this.hooks?.onSync?.();
  }
  size() {
    return this.controllers.size;
  }
  fallbackTarget() {
    const active = this.app.workspace.activeLeaf;
    const controller = active ? this.controllers.get(active) : void 0;
    if (controller && "onExternalButton" in controller && "lastPenPoint" in controller) {
      return controller;
    }
    return null;
  }
  recentMessages() {
    return [...this.controllers.values()].flatMap(
      (controller) => controller.recentMessages?.() ?? []
    );
  }
  dispose() {
    for (const controller of this.controllers.values()) controller.dispose();
    this.controllers.clear();
  }
  refresh() {
    this.dispose();
    this.sync();
  }
  exportTraces() {
    return JSON.stringify(
      [...this.controllers.entries()].map(([leaf, controller]) => ({
        leaf: leaf.getDisplayText(),
        events: JSON.parse(controller.getTrace())
      })),
      null,
      2
    );
  }
};

// src/main.ts
var StylusControlsPlugin = class extends import_obsidian5.Plugin {
  settings = DEFAULT_SETTINGS;
  pairingFingerprint = "";
  temporaryEraserNote = "not checked";
  registry = null;
  menu = new StylusMenu();
  pairing;
  client;
  hub;
  bridgeLog;
  diagnostics;
  probeRing = [];
  sessionEraserStrategy = null;
  bridgeListeners = /* @__PURE__ */ new Set();
  async onload() {
    this.settings = normalizeSettings(await this.loadData() ?? {});
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
      debug: (message) => this.bridgeLog.message(message)
    });
    this.registry = new StylusViewRegistry(
      this.app,
      () => this.effectiveSettings(),
      (action, point, bridge) => {
        if (action === "menu") this.menu.open(point, bridge);
        else if (action === "copy") bridge.copySelectedElements();
        else if (action === "paste") bridge.pasteAt(point);
      },
      void 0,
      {
        pen: this.hub,
        diagnostic: isDiagnosticBuild(this.manifest.version),
        onSync: () => this.updatePenDemand()
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
      callback: () => void this.copyStylusEventTrace()
    });
    this.addCommand({
      id: "copy-diagnostics-report",
      name: "Copy diagnostics report",
      callback: () => void this.copyDiagnosticsReport()
    });
    this.addCommand({
      id: "reconnect-spen-bridge",
      name: "Reconnect S Pen bridge",
      callback: () => this.reconnectBridge()
    });
    void this.refreshFingerprint();
    this.updatePenDemand();
  }
  onunload() {
    this.client.dispose();
    this.menu.close();
    this.registry?.dispose();
    this.registry = null;
  }
  async updateSettings(patch) {
    if (patch.eraserStrategy) this.sessionEraserStrategy = null;
    const previous = this.settings;
    this.settings = normalizeSettings({ ...this.settings, ...patch });
    await this.saveData(this.settings);
    this.registry?.refresh();
    if (previous.penBridgeEnabled !== this.settings.penBridgeEnabled || previous.penBridgePort !== this.settings.penBridgePort) {
      this.client.setUrl(this.bridgeUrl());
      this.client.reconnectNow();
    }
    this.updatePenDemand();
  }
  effectiveEraserStrategy() {
    return this.sessionEraserStrategy ?? this.settings.eraserStrategy;
  }
  effectiveSettings() {
    return { ...this.settings, eraserStrategy: this.effectiveEraserStrategy() };
  }
  pairingCode() {
    return this.pairing.load();
  }
  async setPairingCode(code) {
    const trimmed = code.trim();
    if (!decodePairingCode(trimmed)) {
      new import_obsidian5.Notice("Pairing code must decode to 32 bytes.");
      return;
    }
    this.pairing.save(trimmed);
    await this.refreshFingerprint();
    this.client.reconnectNow();
    this.updatePenDemand();
    this.notifyBridge();
  }
  async clearPairingCode() {
    this.pairing.clear();
    this.pairingFingerprint = "";
    this.client.reconnectNow();
    this.updatePenDemand();
    this.notifyBridge();
  }
  bridgeSnapshot() {
    return this.client.snapshot();
  }
  bridgeReady() {
    return this.client.isReady();
  }
  bridgeStatusText() {
    const snapshot = this.client.snapshot();
    const source = describeBarrelSource(this.effectiveSettings(), this.client.isReady());
    return `${formatBridgeStatus(snapshot)} \xB7 ${source}`;
  }
  watchBridge(listener) {
    this.bridgeListeners.add(listener);
    return () => this.bridgeListeners.delete(listener);
  }
  setProbeEvents(events) {
    this.probeRing = events;
  }
  probeEvents() {
    return this.probeRing;
  }
  logLines() {
    return [...this.bridgeLog.recentMessages(), ...this.registry?.recentMessages() ?? []].slice(
      -100
    );
  }
  setTemporaryEraser(note, strategy) {
    this.temporaryEraserNote = note;
    if (strategy) this.sessionEraserStrategy = strategy;
    this.registry?.refresh();
  }
  checkBridge() {
    return this.diagnostics.checkBridge();
  }
  bridgeCheckLines() {
    return this.diagnostics.checkLines();
  }
  copyDiagnosticsReport() {
    return this.diagnostics.copyReport();
  }
  runTemporaryEraserTest() {
    return this.diagnostics.runTemporaryEraserTest();
  }
  reconnectBridge() {
    this.client.setUrl(this.bridgeUrl());
    this.client.reconnectNow();
    this.updatePenDemand();
  }
  async copyStylusEventTrace() {
    const trace = this.registry?.exportTraces() ?? "[]";
    try {
      await navigator.clipboard.writeText(trace);
      new import_obsidian5.Notice("Stylus event trace copied as JSON.");
    } catch {
      new import_obsidian5.Notice("Unable to copy the stylus trace. Check the developer console.");
    }
  }
  publishStatus(status) {
    this.bridgeLog.message(`bridge status: ${status.state}`);
    this.notifyBridge();
  }
  notifyBridge() {
    for (const listener of this.bridgeListeners) listener();
  }
  async refreshFingerprint() {
    const secret = decodePairingCode(this.pairing.load());
    this.pairingFingerprint = secret ? await fingerprint(secret) : "";
  }
  updatePenDemand() {
    const visible = typeof document === "undefined" || document.visibilityState !== "hidden";
    this.client.setDemand(
      this.settings.penBridgeEnabled && decodePairingCode(this.pairing.load()) !== null && (this.registry?.size() ?? 0) > 0 && visible
    );
  }
  openMenuFromBridge() {
    const target = this.hub.route();
    if (!target) {
      new import_obsidian5.Notice("Open an Excalidraw drawing first.");
      return;
    }
    const point = target.lastPenPoint() ?? viewportCenter();
    this.menu.open(point, target.bridgeForMenu());
  }
  bridgeUrl() {
    return `ws://127.0.0.1:${this.settings.penBridgePort}/v1/pen`;
  }
};
function viewportCenter() {
  return {
    x: Math.round(window.innerWidth / 2),
    y: Math.round(window.innerHeight / 2)
  };
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2RlYnVnL0RlYnVnTG9nZ2VyLnRzIiwgInNyYy9kaWFnbm9zdGljcy9EaWFnbm9zdGljc1NlcnZpY2UudHMiLCAic3JjL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZS50cyIsICJzcmMvZXhjYWxpZHJhdy9jb21wYXRpYmlsaXR5LnRzIiwgInNyYy9leGNhbGlkcmF3L3N5bnRoZXRpY1BvaW50ZXIudHMiLCAic3JjL3BlbmJyaWRnZS9wcm90b2NvbC50cyIsICJzcmMvc2V0dGluZ3Mvc2V0dGluZ3MudHMiLCAic3JjL2RpYWdub3N0aWNzL3ZlcmRpY3QudHMiLCAic3JjL2RpYWdub3N0aWNzL3Byb2JlU3VtbWFyeS50cyIsICJzcmMvZGlhZ25vc3RpY3MvcmVwb3J0LnRzIiwgInNyYy9tZW51L1N0eWx1c01lbnUudHMiLCAic3JjL3BlbmJyaWRnZS9QZW5CcmlkZ2VDbGllbnQudHMiLCAic3JjL3BlbmJyaWRnZS9wYWlyaW5nU3RvcmUudHMiLCAic3JjL3BlbmJyaWRnZS9QZW5TaWduYWxIdWIudHMiLCAic3JjL3NldHRpbmdzL1NldHRpbmdzVGFiLnRzIiwgInNyYy9kaWFnbm9zdGljcy9QZW5FdmVudFByb2JlLnRzIiwgInNyYy9kZWJ1Zy9EZWJ1Z092ZXJsYXkudHMiLCAic3JjL3N0eWx1cy9ub3JtYWxpemVQb2ludGVyRXZlbnQudHMiLCAic3JjL3N0eWx1cy9TdHlsdXNHZXN0dXJlTWFjaGluZS50cyIsICJzcmMvc3R5bHVzL1N0eWx1c0NvbnRyb2xsZXIudHMiLCAic3JjL3N0eWx1cy9TdHlsdXNWaWV3UmVnaXN0cnkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IE5vdGljZSwgUGx1Z2luIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBEZWJ1Z0xvZ2dlciB9IGZyb20gXCIuL2RlYnVnL0RlYnVnTG9nZ2VyXCI7XG5pbXBvcnQgeyBEaWFnbm9zdGljc1NlcnZpY2UgfSBmcm9tIFwiLi9kaWFnbm9zdGljcy9EaWFnbm9zdGljc1NlcnZpY2VcIjtcbmltcG9ydCB0eXBlIHsgUHJvYmVFdmVudCB9IGZyb20gXCIuL2RpYWdub3N0aWNzL3Byb2JlU3VtbWFyeVwiO1xuaW1wb3J0IHsgZm9ybWF0QnJpZGdlU3RhdHVzLCBpc0RpYWdub3N0aWNCdWlsZCB9IGZyb20gXCIuL2RpYWdub3N0aWNzL3JlcG9ydFwiO1xuaW1wb3J0IHsgU3R5bHVzTWVudSB9IGZyb20gXCIuL21lbnUvU3R5bHVzTWVudVwiO1xuaW1wb3J0IHsgUGVuQnJpZGdlQ2xpZW50LCB0eXBlIFBlbkJyaWRnZVN0YXR1cyB9IGZyb20gXCIuL3BlbmJyaWRnZS9QZW5CcmlkZ2VDbGllbnRcIjtcbmltcG9ydCB7IFBhaXJpbmdTdG9yZSB9IGZyb20gXCIuL3BlbmJyaWRnZS9wYWlyaW5nU3RvcmVcIjtcbmltcG9ydCB7IFBlblNpZ25hbEh1YiB9IGZyb20gXCIuL3BlbmJyaWRnZS9QZW5TaWduYWxIdWJcIjtcbmltcG9ydCB7IGRlY29kZVBhaXJpbmdDb2RlLCBmaW5nZXJwcmludCB9IGZyb20gXCIuL3BlbmJyaWRnZS9wcm90b2NvbFwiO1xuaW1wb3J0IHsgU2V0dGluZ3NUYWIgfSBmcm9tIFwiLi9zZXR0aW5ncy9TZXR0aW5nc1RhYlwiO1xuaW1wb3J0IHtcbiAgREVGQVVMVF9TRVRUSU5HUyxcbiAgZGVzY3JpYmVCYXJyZWxTb3VyY2UsXG4gIG5vcm1hbGl6ZVNldHRpbmdzLFxuICB0eXBlIEVyYXNlclN0cmF0ZWd5LFxuICB0eXBlIFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MsXG59IGZyb20gXCIuL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBTdHlsdXNWaWV3UmVnaXN0cnkgfSBmcm9tIFwiLi9zdHlsdXMvU3R5bHVzVmlld1JlZ2lzdHJ5XCI7XG5pbXBvcnQgdHlwZSB7IFBvaW50IH0gZnJvbSBcIi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0eWx1c0NvbnRyb2xzUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuICBwYWlyaW5nRmluZ2VycHJpbnQgPSBcIlwiO1xuICB0ZW1wb3JhcnlFcmFzZXJOb3RlID0gXCJub3QgY2hlY2tlZFwiO1xuICBwcml2YXRlIHJlZ2lzdHJ5OiBTdHlsdXNWaWV3UmVnaXN0cnkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByZWFkb25seSBtZW51ID0gbmV3IFN0eWx1c01lbnUoKTtcbiAgcHJpdmF0ZSBwYWlyaW5nITogUGFpcmluZ1N0b3JlO1xuICBwcml2YXRlIGNsaWVudCE6IFBlbkJyaWRnZUNsaWVudDtcbiAgcHJpdmF0ZSBodWIhOiBQZW5TaWduYWxIdWI7XG4gIHByaXZhdGUgYnJpZGdlTG9nITogRGVidWdMb2dnZXI7XG4gIHByaXZhdGUgZGlhZ25vc3RpY3MhOiBEaWFnbm9zdGljc1NlcnZpY2U7XG4gIHByaXZhdGUgcHJvYmVSaW5nOiBQcm9iZUV2ZW50W10gPSBbXTtcbiAgcHJpdmF0ZSBzZXNzaW9uRXJhc2VyU3RyYXRlZ3k6IEVyYXNlclN0cmF0ZWd5IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcmVhZG9ubHkgYnJpZGdlTGlzdGVuZXJzID0gbmV3IFNldDwoKSA9PiB2b2lkPigpO1xuXG4gIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnNldHRpbmdzID0gbm9ybWFsaXplU2V0dGluZ3MoKGF3YWl0IHRoaXMubG9hZERhdGEoKSkgPz8ge30pO1xuICAgIHRoaXMucGFpcmluZyA9IG5ldyBQYWlyaW5nU3RvcmUodGhpcy5hcHApO1xuICAgIHRoaXMuYnJpZGdlTG9nID0gbmV3IERlYnVnTG9nZ2VyKFxuICAgICAgKCkgPT4gdGhpcy5zZXR0aW5ncy5kZWJ1Z01vZGUsXG4gICAgICBpc0RpYWdub3N0aWNCdWlsZCh0aGlzLm1hbmlmZXN0LnZlcnNpb24pXG4gICAgKTtcbiAgICB0aGlzLmh1YiA9IG5ldyBQZW5TaWduYWxIdWIoKCkgPT4gdGhpcy5jbGllbnQpO1xuICAgIHRoaXMuY2xpZW50ID0gbmV3IFBlbkJyaWRnZUNsaWVudCh7XG4gICAgICB1cmw6IHRoaXMuYnJpZGdlVXJsKCksXG4gICAgICBzZWNyZXQ6ICgpID0+IGRlY29kZVBhaXJpbmdDb2RlKHRoaXMucGFpcmluZy5sb2FkKCkpLFxuICAgICAgY2xpZW50VmVyc2lvbjogdGhpcy5tYW5pZmVzdC52ZXJzaW9uLFxuICAgICAgb25TdGF0dXM6IChzdGF0dXMpID0+IHRoaXMucHVibGlzaFN0YXR1cyhzdGF0dXMpLFxuICAgICAgb25CdXR0b246IChzaWduYWwpID0+IHRoaXMuaHViLmRpc3BhdGNoKHNpZ25hbCksXG4gICAgICBvbkNvbW1hbmQ6IChhY3Rpb24pID0+IHtcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJvcGVuLW1lbnVcIikgdGhpcy5vcGVuTWVudUZyb21CcmlkZ2UoKTtcbiAgICAgIH0sXG4gICAgICBkZWJ1ZzogKG1lc3NhZ2UpID0+IHRoaXMuYnJpZGdlTG9nLm1lc3NhZ2UobWVzc2FnZSksXG4gICAgfSk7XG4gICAgdGhpcy5yZWdpc3RyeSA9IG5ldyBTdHlsdXNWaWV3UmVnaXN0cnkoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgICgpID0+IHRoaXMuZWZmZWN0aXZlU2V0dGluZ3MoKSxcbiAgICAgIChhY3Rpb24sIHBvaW50LCBicmlkZ2UpID0+IHtcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJtZW51XCIpIHRoaXMubWVudS5vcGVuKHBvaW50LCBicmlkZ2UpO1xuICAgICAgICBlbHNlIGlmIChhY3Rpb24gPT09IFwiY29weVwiKSBicmlkZ2UuY29weVNlbGVjdGVkRWxlbWVudHMoKTtcbiAgICAgICAgZWxzZSBpZiAoYWN0aW9uID09PSBcInBhc3RlXCIpIGJyaWRnZS5wYXN0ZUF0KHBvaW50KTtcbiAgICAgIH0sXG4gICAgICB1bmRlZmluZWQsXG4gICAgICB7XG4gICAgICAgIHBlbjogdGhpcy5odWIsXG4gICAgICAgIGRpYWdub3N0aWM6IGlzRGlhZ25vc3RpY0J1aWxkKHRoaXMubWFuaWZlc3QudmVyc2lvbiksXG4gICAgICAgIG9uU3luYzogKCkgPT4gdGhpcy51cGRhdGVQZW5EZW1hbmQoKSxcbiAgICAgIH1cbiAgICApO1xuICAgIHRoaXMuaHViLnNldEZhbGxiYWNrKCgpID0+IHRoaXMucmVnaXN0cnk/LmZhbGxiYWNrVGFyZ2V0KCkgPz8gbnVsbCk7XG4gICAgdGhpcy5kaWFnbm9zdGljcyA9IG5ldyBEaWFnbm9zdGljc1NlcnZpY2UodGhpcyk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTZXR0aW5nc1RhYih0aGlzKSk7XG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbihcImxheW91dC1jaGFuZ2VcIiwgKCkgPT4gdGhpcy5yZWdpc3RyeT8uc3luYygpKSk7XG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGRvY3VtZW50LCBcInZpc2liaWxpdHljaGFuZ2VcIiwgKCkgPT4gdGhpcy51cGRhdGVQZW5EZW1hbmQoKSk7XG4gICAgdGhpcy5hcHAud29ya3NwYWNlLm9uTGF5b3V0UmVhZHkoKCkgPT4gdGhpcy5yZWdpc3RyeT8uc3luYygpKTtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwiY29weS1zdHlsdXMtZXZlbnQtdHJhY2VcIixcbiAgICAgIG5hbWU6IFwiQ29weSBsYXRlc3Qgc3R5bHVzIGV2ZW50IHRyYWNlXCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLmNvcHlTdHlsdXNFdmVudFRyYWNlKCksXG4gICAgfSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImNvcHktZGlhZ25vc3RpY3MtcmVwb3J0XCIsXG4gICAgICBuYW1lOiBcIkNvcHkgZGlhZ25vc3RpY3MgcmVwb3J0XCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLmNvcHlEaWFnbm9zdGljc1JlcG9ydCgpLFxuICAgIH0pO1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJyZWNvbm5lY3Qtc3Blbi1icmlkZ2VcIixcbiAgICAgIG5hbWU6IFwiUmVjb25uZWN0IFMgUGVuIGJyaWRnZVwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMucmVjb25uZWN0QnJpZGdlKCksXG4gICAgfSk7XG4gICAgdm9pZCB0aGlzLnJlZnJlc2hGaW5nZXJwcmludCgpO1xuICAgIHRoaXMudXBkYXRlUGVuRGVtYW5kKCk7XG4gIH1cblxuICBvbnVubG9hZCgpOiB2b2lkIHtcbiAgICB0aGlzLmNsaWVudC5kaXNwb3NlKCk7XG4gICAgdGhpcy5tZW51LmNsb3NlKCk7XG4gICAgdGhpcy5yZWdpc3RyeT8uZGlzcG9zZSgpO1xuICAgIHRoaXMucmVnaXN0cnkgPSBudWxsO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlU2V0dGluZ3MocGF0Y2g6IFBhcnRpYWw8U3R5bHVzQ29udHJvbHNTZXR0aW5ncz4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAocGF0Y2guZXJhc2VyU3RyYXRlZ3kpIHRoaXMuc2Vzc2lvbkVyYXNlclN0cmF0ZWd5ID0gbnVsbDtcbiAgICBjb25zdCBwcmV2aW91cyA9IHRoaXMuc2V0dGluZ3M7XG4gICAgdGhpcy5zZXR0aW5ncyA9IG5vcm1hbGl6ZVNldHRpbmdzKHsgLi4udGhpcy5zZXR0aW5ncywgLi4ucGF0Y2ggfSk7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgICB0aGlzLnJlZ2lzdHJ5Py5yZWZyZXNoKCk7XG4gICAgaWYgKFxuICAgICAgcHJldmlvdXMucGVuQnJpZGdlRW5hYmxlZCAhPT0gdGhpcy5zZXR0aW5ncy5wZW5CcmlkZ2VFbmFibGVkIHx8XG4gICAgICBwcmV2aW91cy5wZW5CcmlkZ2VQb3J0ICE9PSB0aGlzLnNldHRpbmdzLnBlbkJyaWRnZVBvcnRcbiAgICApIHtcbiAgICAgIHRoaXMuY2xpZW50LnNldFVybCh0aGlzLmJyaWRnZVVybCgpKTtcbiAgICAgIHRoaXMuY2xpZW50LnJlY29ubmVjdE5vdygpO1xuICAgIH1cbiAgICB0aGlzLnVwZGF0ZVBlbkRlbWFuZCgpO1xuICB9XG5cbiAgZWZmZWN0aXZlRXJhc2VyU3RyYXRlZ3koKTogRXJhc2VyU3RyYXRlZ3kge1xuICAgIHJldHVybiB0aGlzLnNlc3Npb25FcmFzZXJTdHJhdGVneSA/PyB0aGlzLnNldHRpbmdzLmVyYXNlclN0cmF0ZWd5O1xuICB9XG5cbiAgZWZmZWN0aXZlU2V0dGluZ3MoKTogU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB7XG4gICAgcmV0dXJuIHsgLi4udGhpcy5zZXR0aW5ncywgZXJhc2VyU3RyYXRlZ3k6IHRoaXMuZWZmZWN0aXZlRXJhc2VyU3RyYXRlZ3koKSB9O1xuICB9XG5cbiAgcGFpcmluZ0NvZGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5wYWlyaW5nLmxvYWQoKTtcbiAgfVxuXG4gIGFzeW5jIHNldFBhaXJpbmdDb2RlKGNvZGU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHRyaW1tZWQgPSBjb2RlLnRyaW0oKTtcbiAgICBpZiAoIWRlY29kZVBhaXJpbmdDb2RlKHRyaW1tZWQpKSB7XG4gICAgICBuZXcgTm90aWNlKFwiUGFpcmluZyBjb2RlIG11c3QgZGVjb2RlIHRvIDMyIGJ5dGVzLlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5wYWlyaW5nLnNhdmUodHJpbW1lZCk7XG4gICAgYXdhaXQgdGhpcy5yZWZyZXNoRmluZ2VycHJpbnQoKTtcbiAgICB0aGlzLmNsaWVudC5yZWNvbm5lY3ROb3coKTtcbiAgICB0aGlzLnVwZGF0ZVBlbkRlbWFuZCgpO1xuICAgIHRoaXMubm90aWZ5QnJpZGdlKCk7XG4gIH1cblxuICBhc3luYyBjbGVhclBhaXJpbmdDb2RlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMucGFpcmluZy5jbGVhcigpO1xuICAgIHRoaXMucGFpcmluZ0ZpbmdlcnByaW50ID0gXCJcIjtcbiAgICB0aGlzLmNsaWVudC5yZWNvbm5lY3ROb3coKTtcbiAgICB0aGlzLnVwZGF0ZVBlbkRlbWFuZCgpO1xuICAgIHRoaXMubm90aWZ5QnJpZGdlKCk7XG4gIH1cblxuICBicmlkZ2VTbmFwc2hvdCgpIHtcbiAgICByZXR1cm4gdGhpcy5jbGllbnQuc25hcHNob3QoKTtcbiAgfVxuXG4gIGJyaWRnZVJlYWR5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNsaWVudC5pc1JlYWR5KCk7XG4gIH1cblxuICBicmlkZ2VTdGF0dXNUZXh0KCk6IHN0cmluZyB7XG4gICAgY29uc3Qgc25hcHNob3QgPSB0aGlzLmNsaWVudC5zbmFwc2hvdCgpO1xuICAgIGNvbnN0IHNvdXJjZSA9IGRlc2NyaWJlQmFycmVsU291cmNlKHRoaXMuZWZmZWN0aXZlU2V0dGluZ3MoKSwgdGhpcy5jbGllbnQuaXNSZWFkeSgpKTtcbiAgICByZXR1cm4gYCR7Zm9ybWF0QnJpZGdlU3RhdHVzKHNuYXBzaG90KX0gXHUwMEI3ICR7c291cmNlfWA7XG4gIH1cblxuICB3YXRjaEJyaWRnZShsaXN0ZW5lcjogKCkgPT4gdm9pZCk6ICgpID0+IHZvaWQge1xuICAgIHRoaXMuYnJpZGdlTGlzdGVuZXJzLmFkZChsaXN0ZW5lcik7XG4gICAgcmV0dXJuICgpID0+IHRoaXMuYnJpZGdlTGlzdGVuZXJzLmRlbGV0ZShsaXN0ZW5lcik7XG4gIH1cblxuICBzZXRQcm9iZUV2ZW50cyhldmVudHM6IFByb2JlRXZlbnRbXSk6IHZvaWQge1xuICAgIHRoaXMucHJvYmVSaW5nID0gZXZlbnRzO1xuICB9XG5cbiAgcHJvYmVFdmVudHMoKTogUHJvYmVFdmVudFtdIHtcbiAgICByZXR1cm4gdGhpcy5wcm9iZVJpbmc7XG4gIH1cblxuICBsb2dMaW5lcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLmJyaWRnZUxvZy5yZWNlbnRNZXNzYWdlcygpLCAuLi4odGhpcy5yZWdpc3RyeT8ucmVjZW50TWVzc2FnZXMoKSA/PyBbXSldLnNsaWNlKFxuICAgICAgLTEwMFxuICAgICk7XG4gIH1cblxuICBzZXRUZW1wb3JhcnlFcmFzZXIobm90ZTogc3RyaW5nLCBzdHJhdGVneTogRXJhc2VyU3RyYXRlZ3kgfCBudWxsKTogdm9pZCB7XG4gICAgdGhpcy50ZW1wb3JhcnlFcmFzZXJOb3RlID0gbm90ZTtcbiAgICBpZiAoc3RyYXRlZ3kpIHRoaXMuc2Vzc2lvbkVyYXNlclN0cmF0ZWd5ID0gc3RyYXRlZ3k7XG4gICAgdGhpcy5yZWdpc3RyeT8ucmVmcmVzaCgpO1xuICB9XG5cbiAgY2hlY2tCcmlkZ2UoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlhZ25vc3RpY3MuY2hlY2tCcmlkZ2UoKTtcbiAgfVxuXG4gIGJyaWRnZUNoZWNrTGluZXMoKTogc3RyaW5nW10ge1xuICAgIHJldHVybiB0aGlzLmRpYWdub3N0aWNzLmNoZWNrTGluZXMoKTtcbiAgfVxuXG4gIGNvcHlEaWFnbm9zdGljc1JlcG9ydCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5kaWFnbm9zdGljcy5jb3B5UmVwb3J0KCk7XG4gIH1cblxuICBydW5UZW1wb3JhcnlFcmFzZXJUZXN0KCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHRoaXMuZGlhZ25vc3RpY3MucnVuVGVtcG9yYXJ5RXJhc2VyVGVzdCgpO1xuICB9XG5cbiAgcmVjb25uZWN0QnJpZGdlKCk6IHZvaWQge1xuICAgIHRoaXMuY2xpZW50LnNldFVybCh0aGlzLmJyaWRnZVVybCgpKTtcbiAgICB0aGlzLmNsaWVudC5yZWNvbm5lY3ROb3coKTtcbiAgICB0aGlzLnVwZGF0ZVBlbkRlbWFuZCgpO1xuICB9XG5cbiAgYXN5bmMgY29weVN0eWx1c0V2ZW50VHJhY2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdHJhY2UgPSB0aGlzLnJlZ2lzdHJ5Py5leHBvcnRUcmFjZXMoKSA/PyBcIltdXCI7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHRyYWNlKTtcbiAgICAgIG5ldyBOb3RpY2UoXCJTdHlsdXMgZXZlbnQgdHJhY2UgY29waWVkIGFzIEpTT04uXCIpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgbmV3IE5vdGljZShcIlVuYWJsZSB0byBjb3B5IHRoZSBzdHlsdXMgdHJhY2UuIENoZWNrIHRoZSBkZXZlbG9wZXIgY29uc29sZS5cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaXNoU3RhdHVzKHN0YXR1czogUGVuQnJpZGdlU3RhdHVzKTogdm9pZCB7XG4gICAgdGhpcy5icmlkZ2VMb2cubWVzc2FnZShgYnJpZGdlIHN0YXR1czogJHtzdGF0dXMuc3RhdGV9YCk7XG4gICAgdGhpcy5ub3RpZnlCcmlkZ2UoKTtcbiAgfVxuXG4gIHByaXZhdGUgbm90aWZ5QnJpZGdlKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgdGhpcy5icmlkZ2VMaXN0ZW5lcnMpIGxpc3RlbmVyKCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlZnJlc2hGaW5nZXJwcmludCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBzZWNyZXQgPSBkZWNvZGVQYWlyaW5nQ29kZSh0aGlzLnBhaXJpbmcubG9hZCgpKTtcbiAgICB0aGlzLnBhaXJpbmdGaW5nZXJwcmludCA9IHNlY3JldCA/IGF3YWl0IGZpbmdlcnByaW50KHNlY3JldCkgOiBcIlwiO1xuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGVQZW5EZW1hbmQoKTogdm9pZCB7XG4gICAgY29uc3QgdmlzaWJsZSA9IHR5cGVvZiBkb2N1bWVudCA9PT0gXCJ1bmRlZmluZWRcIiB8fCBkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUgIT09IFwiaGlkZGVuXCI7XG4gICAgdGhpcy5jbGllbnQuc2V0RGVtYW5kKFxuICAgICAgdGhpcy5zZXR0aW5ncy5wZW5CcmlkZ2VFbmFibGVkICYmXG4gICAgICAgIGRlY29kZVBhaXJpbmdDb2RlKHRoaXMucGFpcmluZy5sb2FkKCkpICE9PSBudWxsICYmXG4gICAgICAgICh0aGlzLnJlZ2lzdHJ5Py5zaXplKCkgPz8gMCkgPiAwICYmXG4gICAgICAgIHZpc2libGVcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBvcGVuTWVudUZyb21CcmlkZ2UoKTogdm9pZCB7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5odWIucm91dGUoKTtcbiAgICBpZiAoIXRhcmdldCkge1xuICAgICAgbmV3IE5vdGljZShcIk9wZW4gYW4gRXhjYWxpZHJhdyBkcmF3aW5nIGZpcnN0LlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcG9pbnQgPSB0YXJnZXQubGFzdFBlblBvaW50KCkgPz8gdmlld3BvcnRDZW50ZXIoKTtcbiAgICB0aGlzLm1lbnUub3Blbihwb2ludCwgdGFyZ2V0LmJyaWRnZUZvck1lbnUoKSk7XG4gIH1cblxuICBwcml2YXRlIGJyaWRnZVVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgd3M6Ly8xMjcuMC4wLjE6JHt0aGlzLnNldHRpbmdzLnBlbkJyaWRnZVBvcnR9L3YxL3BlbmA7XG4gIH1cbn1cblxuZnVuY3Rpb24gdmlld3BvcnRDZW50ZXIoKTogUG9pbnQge1xuICByZXR1cm4ge1xuICAgIHg6IE1hdGgucm91bmQod2luZG93LmlubmVyV2lkdGggLyAyKSxcbiAgICB5OiBNYXRoLnJvdW5kKHdpbmRvdy5pbm5lckhlaWdodCAvIDIpLFxuICB9O1xufVxuIiwgImltcG9ydCB0eXBlIHsgTm9ybWFsaXplZFN0eWx1c0V2ZW50IH0gZnJvbSBcIi4uL3N0eWx1cy90eXBlc1wiO1xuXG5leHBvcnQgY2xhc3MgRGVidWdMb2dnZXIge1xuICBwcml2YXRlIHRyYWNlOiBOb3JtYWxpemVkU3R5bHVzRXZlbnRbXSA9IFtdO1xuICBwcml2YXRlIG1lc3NhZ2VzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVuYWJsZWQ6ICgpID0+IGJvb2xlYW4sXG4gICAgcHJpdmF0ZSByZWFkb25seSByZXRhaW5NZXNzYWdlcyA9IGZhbHNlXG4gICkge31cblxuICBldmVudChldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZWQoKSkgcmV0dXJuO1xuICAgIHRoaXMudHJhY2UucHVzaChldmVudCk7XG4gICAgaWYgKHRoaXMudHJhY2UubGVuZ3RoID4gMTAwKSB0aGlzLnRyYWNlLnNoaWZ0KCk7XG4gICAgY29uc29sZS5kZWJ1ZyhcIltFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9sc11cIiwgZXZlbnQpO1xuICB9XG4gIG1lc3NhZ2UobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucmV0YWluTWVzc2FnZXMgfHwgdGhpcy5lbmFibGVkKCkpIHtcbiAgICAgIHRoaXMubWVzc2FnZXMucHVzaChtZXNzYWdlKTtcbiAgICAgIGlmICh0aGlzLm1lc3NhZ2VzLmxlbmd0aCA+IDIwMCkgdGhpcy5tZXNzYWdlcy5zaGlmdCgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbmFibGVkKCkpIGNvbnNvbGUuZGVidWcoXCJbRXhjYWxpZHJhdyBTdHlsdXMgQ29udHJvbHNdXCIsIG1lc3NhZ2UpO1xuICB9XG4gIHJlY2VudE1lc3NhZ2VzKGxpbWl0ID0gMTAwKTogc3RyaW5nW10ge1xuICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzLnNsaWNlKC1saW1pdCk7XG4gIH1cbiAgZXhwb3J0VHJhY2UoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy50cmFjZSwgbnVsbCwgMik7XG4gIH1cbiAgY2xlYXIoKTogdm9pZCB7XG4gICAgdGhpcy50cmFjZSA9IFtdO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgTW9kYWwsIE5vdGljZSwgUGxhdGZvcm0sIGFwaVZlcnNpb24sIHJlcXVlc3RVcmwsIHR5cGUgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBFeGNhbGlkcmF3QnJpZGdlIH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZVwiO1xuaW1wb3J0IHtcbiAgZ2V0R2xvYmFsQXV0b21hdGUsXG4gIGdldExlYWZBcGksXG4gIGhhc05ld0VsZW1lbnRGaWVsZCxcbiAgcmVhZEFjdGl2ZVRvb2wsXG4gIHJlYWRJbnN0YWxsZWRFeGNhbGlkcmF3LFxuICB0b29sQ2FwYWJpbGl0aWVzLFxufSBmcm9tIFwiLi4vZXhjYWxpZHJhdy9jb21wYXRpYmlsaXR5XCI7XG5pbXBvcnQgdHlwZSB7IFBlbkJyaWRnZVNuYXBzaG90IH0gZnJvbSBcIi4uL3BlbmJyaWRnZS9QZW5CcmlkZ2VDbGllbnRcIjtcbmltcG9ydCB7XG4gIENMT1NFLFxuICBkZWNvZGVQYWlyaW5nQ29kZSxcbiAgbmV3Tm9uY2UsXG4gIHBhcnNlU2VydmVyRnJhbWUsXG4gIHByb29mLFxuICBzYWZlRXF1YWwsXG4gIHR5cGUgSGVsbG9GcmFtZSxcbn0gZnJvbSBcIi4uL3BlbmJyaWRnZS9wcm90b2NvbFwiO1xuaW1wb3J0IHtcbiAgZGVzY3JpYmVCYXJyZWxTb3VyY2UsXG4gIHR5cGUgRXJhc2VyU3RyYXRlZ3ksXG4gIHR5cGUgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyxcbn0gZnJvbSBcIi4uL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgdHlwZSB7IFByb2JlRXZlbnQgfSBmcm9tIFwiLi9wcm9iZVN1bW1hcnlcIjtcbmltcG9ydCB7XG4gIGJ1aWxkUmVwb3J0LFxuICBjaHJvbWVWZXJzaW9uLFxuICB0b1RleHQsXG4gIHR5cGUgRGlhZ25vc3RpY3NSZXBvcnQsXG4gIHR5cGUgUmVwb3J0RXhjYWxpZHJhdyxcbn0gZnJvbSBcIi4vcmVwb3J0XCI7XG5pbXBvcnQge1xuICBmb3JtYXRDaGVja0xpbmVzLFxuICB0eXBlIEJyaWRnZUNoZWNrUmVzdWx0LFxuICB0eXBlIEhhbmRzaGFrZUNoZWNrLFxuICB0eXBlIEhlbGxvQ2hlY2ssXG4gIHR5cGUgSHR0cENoZWNrLFxuICB0eXBlIFNlcnZlclByb29mQ2hlY2ssXG4gIHR5cGUgU291cmNlQ2hlY2ssXG59IGZyb20gXCIuL3ZlcmRpY3RcIjtcblxuZXhwb3J0IGludGVyZmFjZSBEaWFnbm9zdGljc0hvc3Qge1xuICBhcHA6IEFwcDtcbiAgbWFuaWZlc3Q6IHsgdmVyc2lvbjogc3RyaW5nIH07XG4gIHNldHRpbmdzOiBTdHlsdXNDb250cm9sc1NldHRpbmdzO1xuICBlZmZlY3RpdmVFcmFzZXJTdHJhdGVneSgpOiBFcmFzZXJTdHJhdGVneTtcbiAgcGFpcmluZ0NvZGUoKTogc3RyaW5nO1xuICBicmlkZ2VTbmFwc2hvdCgpOiBQZW5CcmlkZ2VTbmFwc2hvdCB8IG51bGw7XG4gIHByb2JlRXZlbnRzKCk6IFByb2JlRXZlbnRbXTtcbiAgbG9nTGluZXMoKTogc3RyaW5nW107XG4gIHRlbXBvcmFyeUVyYXNlck5vdGU6IHN0cmluZztcbiAgYnJpZGdlUmVhZHkoKTogYm9vbGVhbjtcbiAgc2V0VGVtcG9yYXJ5RXJhc2VyKG5vdGU6IHN0cmluZywgc3RyYXRlZ3k6IEVyYXNlclN0cmF0ZWd5IHwgbnVsbCk6IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBEaWFnbm9zdGljc1NlcnZpY2Uge1xuICBsYXN0Q2hlY2s6IEJyaWRnZUNoZWNrUmVzdWx0IHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBob3N0OiBEaWFnbm9zdGljc0hvc3QpIHt9XG5cbiAgYXN5bmMgY2hlY2tCcmlkZ2UoKTogUHJvbWlzZTxCcmlkZ2VDaGVja1Jlc3VsdD4ge1xuICAgIGNvbnN0IGh0dHAgPSBhd2FpdCB0aGlzLmNoZWNrSHR0cCh0aGlzLmhvc3Quc2V0dGluZ3MucGVuQnJpZGdlUG9ydCk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5jaGVja1NvY2tldCh0aGlzLmhvc3Quc2V0dGluZ3MucGVuQnJpZGdlUG9ydCwgaHR0cCk7XG4gICAgdGhpcy5sYXN0Q2hlY2sgPSByZXN1bHQ7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHJlcG9ydCgpOiBEaWFnbm9zdGljc1JlcG9ydCB7XG4gICAgY29uc3Qgc2V0dGluZ3MgPSB0aGlzLmhvc3Quc2V0dGluZ3M7XG4gICAgcmV0dXJuIGJ1aWxkUmVwb3J0KHtcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIG9ic2lkaWFuVmVyc2lvbjogYXBpVmVyc2lvbixcbiAgICAgICAgYW5kcm9pZDogUGxhdGZvcm0uaXNBbmRyb2lkQXBwLFxuICAgICAgICB0YWJsZXQ6IFBsYXRmb3JtLmlzVGFibGV0LFxuICAgICAgICBwbHVnaW5WZXJzaW9uOiB0aGlzLmhvc3QubWFuaWZlc3QudmVyc2lvbixcbiAgICAgICAgY2hyb21lOiBjaHJvbWVWZXJzaW9uKG5hdmlnYXRvci51c2VyQWdlbnQpLFxuICAgICAgICBzY3JlZW46IHtcbiAgICAgICAgICB3aWR0aDogTWF0aC5yb3VuZCh3aW5kb3cuaW5uZXJXaWR0aCksXG4gICAgICAgICAgaGVpZ2h0OiBNYXRoLnJvdW5kKHdpbmRvdy5pbm5lckhlaWdodCksXG4gICAgICAgIH0sXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgYmFycmVsQnV0dG9uTWFzazogc2V0dGluZ3MuYmFycmVsQnV0dG9uTWFzayxcbiAgICAgICAgICBwcmltYXJ5Q29udGFjdE1vZGU6IHNldHRpbmdzLnByaW1hcnlDb250YWN0TW9kZSxcbiAgICAgICAgICBlcmFzZXJTdHJhdGVneTogc2V0dGluZ3MuZXJhc2VyU3RyYXRlZ3ksXG4gICAgICAgICAgZWZmZWN0aXZlRXJhc2VyU3RyYXRlZ3k6IHRoaXMuaG9zdC5lZmZlY3RpdmVFcmFzZXJTdHJhdGVneSgpLFxuICAgICAgICAgIGxhdGVXaW5kb3dNczogc2V0dGluZ3MubGF0ZVdpbmRvd01zLFxuICAgICAgICAgIG1pZFN0cm9rZVByZXNzOiBzZXR0aW5ncy5taWRTdHJva2VQcmVzcyxcbiAgICAgICAgICBwZW5CcmlkZ2VFbmFibGVkOiBzZXR0aW5ncy5wZW5CcmlkZ2VFbmFibGVkLFxuICAgICAgICAgIHBlbkJyaWRnZVBvcnQ6IHNldHRpbmdzLnBlbkJyaWRnZVBvcnQsXG4gICAgICAgICAgc3VwcHJlc3NIb3ZlckJ1dHRvbkV2ZW50czogc2V0dGluZ3Muc3VwcHJlc3NIb3ZlckJ1dHRvbkV2ZW50cyxcbiAgICAgICAgICBidXR0b25Db250YWN0QWN0aW9uOiBzZXR0aW5ncy5idXR0b25Db250YWN0QWN0aW9uLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGJyaWRnZUNoZWNrOiB0aGlzLmxhc3RDaGVjayxcbiAgICAgIGxpdmU6IHRoaXMuaG9zdC5icmlkZ2VTbmFwc2hvdCgpLFxuICAgICAgYmFycmVsU291cmNlOiBkZXNjcmliZUJhcnJlbFNvdXJjZShzZXR0aW5ncywgdGhpcy5ob3N0LmJyaWRnZVJlYWR5KCkpLFxuICAgICAgcHJvYmVFdmVudHM6IHRoaXMuaG9zdC5wcm9iZUV2ZW50cygpLFxuICAgICAgZXhjYWxpZHJhdzogdGhpcy5leGNhbGlkcmF3KCksXG4gICAgICBsb2c6IHRoaXMuaG9zdC5sb2dMaW5lcygpLFxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgY29weVJlcG9ydCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB0ZXh0ID0gdG9UZXh0KHRoaXMucmVwb3J0KCkpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCh0ZXh0KTtcbiAgICAgIG5ldyBOb3RpY2UoXCJEaWFnbm9zdGljcyByZXBvcnQgY29waWVkLlwiKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnN0IG1vZGFsID0gbmV3IE1vZGFsKHRoaXMuaG9zdC5hcHApO1xuICAgICAgbW9kYWwudGl0bGVFbC5zZXRUZXh0KFwiRGlhZ25vc3RpY3MgcmVwb3J0XCIpO1xuICAgICAgY29uc3QgYXJlYSA9IG1vZGFsLmNvbnRlbnRFbC5jcmVhdGVFbChcInRleHRhcmVhXCIpO1xuICAgICAgYXJlYS52YWx1ZSA9IHRleHQ7XG4gICAgICBhcmVhLnN0eWxlLndpZHRoID0gXCIxMDAlXCI7XG4gICAgICBhcmVhLnN0eWxlLm1pbkhlaWdodCA9IFwiMjQwcHhcIjtcbiAgICAgIG1vZGFsLm9wZW4oKTtcbiAgICAgIGFyZWEuZm9jdXMoKTtcbiAgICAgIGFyZWEuc2VsZWN0KCk7XG4gICAgfVxuICB9XG5cbiAgY2hlY2tMaW5lcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMubGFzdENoZWNrXG4gICAgICA/IGZvcm1hdENoZWNrTGluZXModGhpcy5sYXN0Q2hlY2spXG4gICAgICA6IFtcIkJyaWRnZSBoYXMgbm90IGJlZW4gY2hlY2tlZCBpbiB0aGlzIHNlc3Npb24uXCJdO1xuICB9XG5cbiAgYXN5bmMgcnVuVGVtcG9yYXJ5RXJhc2VyVGVzdCgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IGxlYWYgPSB0aGlzLmhvc3QuYXBwLndvcmtzcGFjZS5hY3RpdmVMZWFmO1xuICAgIGlmICghbGVhZiB8fCBsZWFmLnZpZXcuZ2V0Vmlld1R5cGUoKSAhPT0gXCJleGNhbGlkcmF3XCIpIHtcbiAgICAgIGNvbnN0IG5vdGUgPSBcIk9wZW4gYSBuZXcsIGVtcHR5IGRyYXdpbmcgZmlyc3RcIjtcbiAgICAgIHRoaXMuaG9zdC5zZXRUZW1wb3JhcnlFcmFzZXIobm90ZSwgbnVsbCk7XG4gICAgICByZXR1cm4gbm90ZTtcbiAgICB9XG4gICAgaWYgKFxuICAgICAgdHlwZW9mIHdpbmRvdy5jb25maXJtID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICF3aW5kb3cuY29uZmlybShcIlJ1biB0aGUgdGVtcG9yYXJ5IGVyYXNlciB0ZXN0IG9uIHRoaXMgZHJhd2luZz8gVXNlIGEgbmV3LCBlbXB0eSBkcmF3aW5nLlwiKVxuICAgICkge1xuICAgICAgcmV0dXJuIFwiQ2FuY2VsbGVkXCI7XG4gICAgfVxuICAgIGNvbnN0IGNhbnZhcyA9IGxlYWYudmlldy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFwiY2FudmFzXCIpID8/IGxlYWYudmlldy5jb250YWluZXJFbDtcbiAgICBjb25zdCByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IGJyaWRnZSA9IG5ldyBFeGNhbGlkcmF3QnJpZGdlKGxlYWYpO1xuICAgIGNvbnN0IGNlbnRlciA9IHtcbiAgICAgIGNsaWVudFg6IHJlY3QubGVmdCArIHJlY3Qud2lkdGggLyAyLFxuICAgICAgY2xpZW50WTogcmVjdC50b3AgKyByZWN0LmhlaWdodCAvIDIsXG4gICAgfTtcbiAgICBsZXQgYmVnYW4gPSBmYWxzZTtcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwicG9pbnRlcmRvd25cIixcbiAgICAgIChldmVudCkgPT4ge1xuICAgICAgICBiZWdhbiA9IGJyaWRnZS5iZWdpbk1vbWVudGFyeUVyYXNlcihldmVudCBhcyBQb2ludGVyRXZlbnQpLm9rO1xuICAgICAgfSxcbiAgICAgIHsgY2FwdHVyZTogdHJ1ZSwgb25jZTogdHJ1ZSB9XG4gICAgKTtcbiAgICBjYW52YXMuZGlzcGF0Y2hFdmVudChwZW5FdmVudChcInBvaW50ZXJkb3duXCIsIGNlbnRlciwgeyBidXR0b246IDAsIGJ1dHRvbnM6IDEsIHByZXNzdXJlOiAwLjUgfSkpO1xuICAgIGF3YWl0IHdhaXRGcmFtZSgpO1xuICAgIGNvbnN0IGR1cmluZyA9IHJlYWRUb29sKGxlYWYudmlldyk7XG4gICAgY2FudmFzLmRpc3BhdGNoRXZlbnQocGVuRXZlbnQoXCJwb2ludGVydXBcIiwgY2VudGVyLCB7IGJ1dHRvbjogMCwgYnV0dG9uczogMCwgcHJlc3N1cmU6IDAgfSkpO1xuICAgIGF3YWl0IHdhaXRGcmFtZSgpO1xuICAgIGNvbnN0IGFmdGVyID0gcmVhZFRvb2wobGVhZi52aWV3KTtcbiAgICBjb25zdCBhdmFpbGFibGUgPSBiZWdhbiAmJiBkdXJpbmcgPT09IFwiZXJhc2VyXCIgJiYgYWZ0ZXIgIT09IFwiZXJhc2VyXCI7XG4gICAgY29uc3Qgbm90ZSA9IGF2YWlsYWJsZVxuICAgICAgPyBcImZvcmsgdGVtcC1lcmFzZXI6IGF2YWlsYWJsZVwiXG4gICAgICA6IFwibm90IGF2YWlsYWJsZSBcdTIxOTIgdXNpbmcgc2V0QWN0aXZlVG9vbCBmYWxsYmFja1wiO1xuICAgIHRoaXMuaG9zdC5zZXRUZW1wb3JhcnlFcmFzZXIobm90ZSwgYXZhaWxhYmxlID8gXCJzeW50aGV0aWMtYnV0dG9uNVwiIDogXCJzZXQtYWN0aXZlLXRvb2xcIik7XG4gICAgcmV0dXJuIG5vdGU7XG4gIH1cblxuICBwcml2YXRlIGV4Y2FsaWRyYXcoKTogUmVwb3J0RXhjYWxpZHJhdyB7XG4gICAgY29uc3QgaW5zdGFsbGVkID0gcmVhZEluc3RhbGxlZEV4Y2FsaWRyYXcodGhpcy5ob3N0LmFwcCk7XG4gICAgY29uc3QgYXV0b21hdGUgPSBnZXRHbG9iYWxBdXRvbWF0ZSgpO1xuICAgIGNvbnN0IHZpZXcgPSB0aGlzLmhvc3QuYXBwLndvcmtzcGFjZS5hY3RpdmVMZWFmPy52aWV3O1xuICAgIGxldCBjYW5SZWFkQWN0aXZlVG9vbCA9IGZhbHNlO1xuICAgIGxldCBjYW5TZXRBY3RpdmVUb29sID0gZmFsc2U7XG4gICAgbGV0IG5ld0VsZW1lbnQ6IGJvb2xlYW4gfCBudWxsID0gbnVsbDtcbiAgICBpZiAodmlldz8uZ2V0Vmlld1R5cGUoKSA9PT0gXCJleGNhbGlkcmF3XCIpIHtcbiAgICAgIGNvbnN0IGFwaSA9IGdldExlYWZBcGkodmlldyk7XG4gICAgICBpZiAoYXBpLm9rKSB7XG4gICAgICAgIGNvbnN0IGNhcGFiaWxpdGllcyA9IHRvb2xDYXBhYmlsaXRpZXMoYXBpLnZhbHVlKTtcbiAgICAgICAgY2FuUmVhZEFjdGl2ZVRvb2wgPSBjYXBhYmlsaXRpZXMuY2FuUmVhZEFjdGl2ZVRvb2w7XG4gICAgICAgIGNhblNldEFjdGl2ZVRvb2wgPSBjYXBhYmlsaXRpZXMuY2FuU2V0QWN0aXZlVG9vbDtcbiAgICAgICAgbmV3RWxlbWVudCA9IGhhc05ld0VsZW1lbnRGaWVsZChhcGkudmFsdWUuZ2V0QXBwU3RhdGUoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBpbnN0YWxsZWQ6IGluc3RhbGxlZC5pbnN0YWxsZWQsXG4gICAgICBlbmFibGVkOiBpbnN0YWxsZWQuZW5hYmxlZCxcbiAgICAgIHZlcnNpb246IGluc3RhbGxlZC52ZXJzaW9uLFxuICAgICAgYXV0b21hdGU6IGF1dG9tYXRlICE9PSBudWxsLFxuICAgICAgY2FuUmVhZEFjdGl2ZVRvb2wsXG4gICAgICBjYW5TZXRBY3RpdmVUb29sLFxuICAgICAgZGVsZXRlVmlld0VsZW1lbnRzOiB0eXBlb2YgYXV0b21hdGU/LmRlbGV0ZVZpZXdFbGVtZW50cyA9PT0gXCJmdW5jdGlvblwiLFxuICAgICAgbmV3RWxlbWVudCxcbiAgICAgIHRlbXBvcmFyeUVyYXNlcjogdGhpcy5ob3N0LnRlbXBvcmFyeUVyYXNlck5vdGUsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tIdHRwKHBvcnQ6IG51bWJlcik6IFByb21pc2U8SHR0cENoZWNrPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7IHVybDogYGh0dHA6Ly8xMjcuMC4wLjE6JHtwb3J0fS9oZWFsdGhgLCB0aHJvdzogZmFsc2UgfSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvazogcmVzcG9uc2Uuc3RhdHVzID09PSAyMDAsXG4gICAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgICBib2R5OiByZXNwb25zZS50ZXh0LnNsaWNlKDAsIDIwMCksXG4gICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb2s6IGZhbHNlLFxuICAgICAgICBzdGF0dXM6IG51bGwsXG4gICAgICAgIGJvZHk6IG51bGwsXG4gICAgICAgIGVycm9yOiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcInJlcXVlc3QgZmFpbGVkXCIpLnNsaWNlKDAsIDMwMCksXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tTb2NrZXQocG9ydDogbnVtYmVyLCBodHRwOiBIdHRwQ2hlY2spOiBQcm9taXNlPEJyaWRnZUNoZWNrUmVzdWx0PiB7XG4gICAgY29uc3Qgc2VjcmV0ID0gZGVjb2RlUGFpcmluZ0NvZGUodGhpcy5ob3N0LnBhaXJpbmdDb2RlKCkpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICAgIGxldCBvcGVuZWQgPSBmYWxzZTtcbiAgICAgIGxldCBoZWxsbzogSGVsbG9DaGVjayB8IG51bGwgPSBudWxsO1xuICAgICAgbGV0IGhlbGxvRnJhbWU6IEhlbGxvRnJhbWUgfCBudWxsID0gbnVsbDtcbiAgICAgIGxldCBjbGllbnROb25jZSA9IFwiXCI7XG4gICAgICBsZXQgaGFuZHNoYWtlOiBIYW5kc2hha2VDaGVjayA9IFwibm90LXJ1blwiO1xuICAgICAgbGV0IHNlcnZlclByb29mOiBTZXJ2ZXJQcm9vZkNoZWNrID0gXCJub3QtcnVuXCI7XG4gICAgICBsZXQgc291cmNlOiBTb3VyY2VDaGVjayB8IG51bGwgPSBudWxsO1xuICAgICAgY29uc3Qgc3RhcnRlZCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgY29uc3Qgc29ja2V0ID0gbmV3IFdlYlNvY2tldChgd3M6Ly8xMjcuMC4wLjE6JHtwb3J0fS92MS9wZW5gKTtcbiAgICAgIGNvbnN0IGZpbmlzaCA9IChcbiAgICAgICAgY2xvc2VDb2RlOiBudW1iZXIgfCBudWxsLFxuICAgICAgICBjbG9zZVJlYXNvbjogc3RyaW5nIHwgbnVsbCxcbiAgICAgICAgd2FzQ2xlYW46IGJvb2xlYW4gfCBudWxsLFxuICAgICAgICBlcnJvcjogc3RyaW5nIHwgbnVsbFxuICAgICAgKSA9PiB7XG4gICAgICAgIGlmIChzZXR0bGVkKSByZXR1cm47XG4gICAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgaHR0cCxcbiAgICAgICAgICB3ZWJzb2NrZXQ6IHtcbiAgICAgICAgICAgIG9rOiBvcGVuZWQsXG4gICAgICAgICAgICBvcGVuTXM6IG9wZW5lZCA/IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydGVkKSA6IG51bGwsXG4gICAgICAgICAgICBlcnJvcixcbiAgICAgICAgICAgIGNsb3NlQ29kZSxcbiAgICAgICAgICAgIGNsb3NlUmVhc29uLFxuICAgICAgICAgICAgd2FzQ2xlYW4sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBoZWxsbyxcbiAgICAgICAgICBoYW5kc2hha2UsXG4gICAgICAgICAgc2VydmVyUHJvb2YsXG4gICAgICAgICAgc291cmNlLFxuICAgICAgICB9KTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gQWxyZWFkeSBjbG9zZWQuXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBjb25zdCB0aW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KFxuICAgICAgICAoKSA9PiBmaW5pc2gobnVsbCwgXCJ0aW1lb3V0XCIsIGZhbHNlLCBvcGVuZWQgPyBudWxsIDogXCJ0aW1lb3V0XCIpLFxuICAgICAgICAzMDAwXG4gICAgICApO1xuICAgICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoXCJvcGVuXCIsICgpID0+IHtcbiAgICAgICAgb3BlbmVkID0gdHJ1ZTtcbiAgICAgIH0pO1xuICAgICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCAoKSA9PiB7XG4gICAgICAgIGlmICghb3BlbmVkKSBmaW5pc2gobnVsbCwgbnVsbCwgZmFsc2UsIFwiZXJyb3IgZXZlbnRcIik7XG4gICAgICB9KTtcbiAgICAgIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKFwiY2xvc2VcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgIGlmIChoYW5kc2hha2UgPT09IFwibm90LXJ1blwiICYmIGV2ZW50LmNvZGUgPT09IENMT1NFLkFVVEgpIGhhbmRzaGFrZSA9IFwid3JvbmctY29kZVwiO1xuICAgICAgICBlbHNlIGlmIChoYW5kc2hha2UgPT09IFwibm90LXJ1blwiICYmIGV2ZW50LmNvZGUgPT09IENMT1NFLlBST1RPQ09MKSBoYW5kc2hha2UgPSBcInByb3RvY29sXCI7XG4gICAgICAgIGVsc2UgaWYgKGhhbmRzaGFrZSA9PT0gXCJub3QtcnVuXCIpIGhhbmRzaGFrZSA9IHNlY3JldCA/IFwiZmFpbGVkXCIgOiBcInNraXBwZWRcIjtcbiAgICAgICAgZmluaXNoKGV2ZW50LmNvZGUsIGV2ZW50LnJlYXNvbiwgZXZlbnQud2FzQ2xlYW4sIG9wZW5lZCA/IG51bGwgOiBcImVycm9yIGV2ZW50XCIpO1xuICAgICAgfSk7XG4gICAgICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgZXZlbnQuZGF0YSAhPT0gXCJzdHJpbmdcIikgcmV0dXJuO1xuICAgICAgICBjb25zdCBmcmFtZSA9IHBhcnNlU2VydmVyRnJhbWUoZXZlbnQuZGF0YSk7XG4gICAgICAgIGlmICghZnJhbWUgfHwgZnJhbWUudHlwZSA9PT0gXCJ1bmtub3duXCIpIHJldHVybjtcbiAgICAgICAgaWYgKGZyYW1lLnR5cGUgPT09IFwiaGVsbG9cIikge1xuICAgICAgICAgIGhlbGxvRnJhbWUgPSBmcmFtZTtcbiAgICAgICAgICBoZWxsbyA9IHtcbiAgICAgICAgICAgIHByb3RvOiBmcmFtZS5wcm90byxcbiAgICAgICAgICAgIGFwcDogZnJhbWUuYXBwLFxuICAgICAgICAgICAgYXBwVmVyc2lvbjogZnJhbWUuYXBwVmVyc2lvbixcbiAgICAgICAgICAgIGNhcHM6IGZyYW1lLmNhcHMsXG4gICAgICAgICAgfTtcbiAgICAgICAgICBpZiAoIXNlY3JldCkge1xuICAgICAgICAgICAgaGFuZHNoYWtlID0gXCJza2lwcGVkXCI7XG4gICAgICAgICAgICBzZXJ2ZXJQcm9vZiA9IFwic2tpcHBlZFwiO1xuICAgICAgICAgICAgZmluaXNoKG51bGwsIG51bGwsIHRydWUsIG51bGwpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjbGllbnROb25jZSA9IG5ld05vbmNlKCk7XG4gICAgICAgICAgY29uc3Qgbm9uY2UgPSBmcmFtZS5ub25jZTtcbiAgICAgICAgICB2b2lkIHByb29mKHNlY3JldCwgbm9uY2UsIGNsaWVudE5vbmNlLCBcImNsaWVudFwiKS50aGVuKChjbGllbnRQcm9vZikgPT4ge1xuICAgICAgICAgICAgaWYgKHNldHRsZWQpIHJldHVybjtcbiAgICAgICAgICAgIHNvY2tldC5zZW5kKFxuICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJhdXRoXCIsXG4gICAgICAgICAgICAgICAgcHJvdG86IDEsXG4gICAgICAgICAgICAgICAgY2xpZW50OiBcImV4Y2FsaWRyYXctc3R5bHVzLWNvbnRyb2xzXCIsXG4gICAgICAgICAgICAgICAgY2xpZW50VmVyc2lvbjogdGhpcy5ob3N0Lm1hbmlmZXN0LnZlcnNpb24sXG4gICAgICAgICAgICAgICAgY2xpZW50Tm9uY2UsXG4gICAgICAgICAgICAgICAgcHJvb2Y6IGNsaWVudFByb29mLFxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZyYW1lLnR5cGUgIT09IFwicmVhZHlcIiB8fCAhaGVsbG9GcmFtZSB8fCAhc2VjcmV0IHx8ICFjbGllbnROb25jZSkgcmV0dXJuO1xuICAgICAgICBjb25zdCByZWFkeSA9IGZyYW1lO1xuICAgICAgICB2b2lkIHByb29mKHNlY3JldCwgaGVsbG9GcmFtZS5ub25jZSwgY2xpZW50Tm9uY2UsIFwic2VydmVyXCIpLnRoZW4oKGV4cGVjdGVkKSA9PiB7XG4gICAgICAgICAgaWYgKHNldHRsZWQpIHJldHVybjtcbiAgICAgICAgICBzZXJ2ZXJQcm9vZiA9IHNhZmVFcXVhbChleHBlY3RlZCwgcmVhZHkuc2VydmVyUHJvb2YpID8gXCJva1wiIDogXCJiYWRcIjtcbiAgICAgICAgICBoYW5kc2hha2UgPSBzZXJ2ZXJQcm9vZiA9PT0gXCJva1wiID8gXCJyZWFkeVwiIDogXCJ3cm9uZy1jb2RlXCI7XG4gICAgICAgICAgc291cmNlID0ge1xuICAgICAgICAgICAgc3RhdGU6IHJlYWR5LnNvdXJjZS5zdGF0ZSxcbiAgICAgICAgICAgIHJlYXNvbjogcmVhZHkuc291cmNlLnJlYXNvbixcbiAgICAgICAgICAgIG5vZGU6IHJlYWR5LnNvdXJjZS5ub2RlLFxuICAgICAgICAgICAgbmFtZTogcmVhZHkuc291cmNlLm5hbWUsXG4gICAgICAgICAgfTtcbiAgICAgICAgICBmaW5pc2gobnVsbCwgbnVsbCwgdHJ1ZSwgbnVsbCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZFRvb2wodmlldzogdW5rbm93bik6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBhcGkgPSBnZXRMZWFmQXBpKHZpZXcpO1xuICBpZiAoIWFwaS5vaykgcmV0dXJuIG51bGw7XG4gIHJldHVybiByZWFkQWN0aXZlVG9vbChhcGkudmFsdWUpPy50eXBlID8/IG51bGw7XG59XG5cbmZ1bmN0aW9uIHdhaXRGcmFtZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgaWYgKHR5cGVvZiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPT09IFwiZnVuY3Rpb25cIikgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHJlc29sdmUoKSk7XG4gICAgZWxzZSBzZXRUaW1lb3V0KHJlc29sdmUsIDApO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcGVuRXZlbnQoXG4gIHR5cGU6IHN0cmluZyxcbiAgY2VudGVyOiB7IGNsaWVudFg6IG51bWJlcjsgY2xpZW50WTogbnVtYmVyIH0sXG4gIG92ZXI6IFBvaW50ZXJFdmVudEluaXRcbik6IFBvaW50ZXJFdmVudCB7XG4gIHJldHVybiBuZXcgUG9pbnRlckV2ZW50KHR5cGUsIHtcbiAgICBidWJibGVzOiB0cnVlLFxuICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgY29tcG9zZWQ6IHRydWUsXG4gICAgcG9pbnRlcklkOiAxLFxuICAgIHBvaW50ZXJUeXBlOiBcInBlblwiLFxuICAgIGlzUHJpbWFyeTogdHJ1ZSxcbiAgICBjbGllbnRYOiBjZW50ZXIuY2xpZW50WCxcbiAgICBjbGllbnRZOiBjZW50ZXIuY2xpZW50WSxcbiAgICAuLi5vdmVyLFxuICB9KTtcbn1cbiIsICJpbXBvcnQgeyBOb3RpY2UsIHR5cGUgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgeyBQb2ludCB9IGZyb20gXCIuLi9zdHlsdXMvdHlwZXNcIjtcbmltcG9ydCB7XG4gIGdldEdsb2JhbEF1dG9tYXRlLFxuICBnZXRMZWFmQXBpLFxuICByZWFkQWN0aXZlVG9vbCxcbiAgcmVhZE5ld0VsZW1lbnRJZCxcbiAgdHlwZSBBY3RpdmVUb29sU25hcHNob3QsXG4gIHR5cGUgQnJpZGdlT3BlcmF0aW9uUmVzdWx0LFxuICB0eXBlIEJyaWRnZVJlc3VsdCxcbiAgdHlwZSBDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaSxcbn0gZnJvbSBcIi4vY29tcGF0aWJpbGl0eVwiO1xuaW1wb3J0IHsgZGlzcGF0Y2hQb2ludGVyIH0gZnJvbSBcIi4vc3ludGhldGljUG9pbnRlclwiO1xuXG5leHBvcnQgdHlwZSB7XG4gIEFjdGl2ZVRvb2xTbmFwc2hvdCxcbiAgQnJpZGdlRmFpbHVyZUNvZGUsXG4gIEJyaWRnZU9wZXJhdGlvblJlc3VsdCxcbiAgQnJpZGdlUmVzdWx0LFxufSBmcm9tIFwiLi9jb21wYXRpYmlsaXR5XCI7XG5cbi8qKiBDb21wYXRpYmlsaXR5IGJvdW5kYXJ5IGZvciB0aGUgb3B0aW9uYWwgRXhjYWxpZHJhdyBwbHVnaW4uICovXG5leHBvcnQgY2xhc3MgRXhjYWxpZHJhd0JyaWRnZSB7XG4gIHByaXZhdGUgd2FybmVkID0gZmFsc2U7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgbGVhZjogV29ya3NwYWNlTGVhZikge31cblxuICBiZWdpbk1vbWVudGFyeUVyYXNlcihyYXc6IFBvaW50ZXJFdmVudCk6IEJyaWRnZVJlc3VsdDxBY3RpdmVUb29sU25hcHNob3Q+IHtcbiAgICBjb25zdCBhcGlSZXN1bHQgPSB0aGlzLmdldEFwaSgpO1xuICAgIGlmICghYXBpUmVzdWx0Lm9rKSByZXR1cm4gdGhpcy5yZXBvcnQoYXBpUmVzdWx0KTtcbiAgICBjb25zdCB0b29sID0gcmVhZEFjdGl2ZVRvb2woYXBpUmVzdWx0LnZhbHVlKTtcbiAgICBpZiAoIXRvb2wpIHtcbiAgICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXG4gICAgICAgIFwiaW5jb21wYXRpYmxlXCIsXG4gICAgICAgIFwiVGVtcG9yYXJ5IGVyYXNlciBjb3VsZCBub3QgcmVhZCB0aGUgY3VycmVudCBhY3RpdmUgdG9vbC5cIlxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiByYXcuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uID09PSBcImZ1bmN0aW9uXCIpIHJhdy5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICByYXcucHJldmVudERlZmF1bHQoKTtcbiAgICBjb25zdCB0YXJnZXQgPSBldmVudFRhcmdldChyYXcpO1xuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwiZmFpbGVkXCIsIFwiVGVtcG9yYXJ5IGVyYXNlciBjb3VsZCBub3QgZmluZCB0aGUgcG9pbnRlciB0YXJnZXQuXCIpO1xuICAgIH1cbiAgICBkaXNwYXRjaFBvaW50ZXIodGFyZ2V0LCBcInBvaW50ZXJkb3duXCIsIHJhdywgeyBidXR0b246IDUsIGJ1dHRvbnM6IDMyIH0pO1xuICAgIGNvbnN0IGFwaSA9IGFwaVJlc3VsdC52YWx1ZTtcbiAgICBuZXh0RnJhbWUoKCkgPT4ge1xuICAgICAgaWYgKHJlYWRBY3RpdmVUb29sKGFwaSk/LnR5cGUgPT09IFwiZXJhc2VyXCIpIHJldHVybjtcbiAgICAgIHRyeSB7XG4gICAgICAgIGFwaS5zZXRBY3RpdmVUb29sKHsgdHlwZTogXCJlcmFzZXJcIiB9KTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICB0aGlzLnVuc3VwcG9ydGVkKFwiVGVtcG9yYXJ5IGVyYXNlciBjb3VsZCBub3Qgc3dpdGNoIHRvb2xzLlwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy51bnN1cHBvcnRlZChcIkZvcmsgdGVtcC1lcmFzZXIgaXMgbm90IGF2YWlsYWJsZTsgdXNpbmcgc2V0QWN0aXZlVG9vbC5cIik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiB0b29sIH07XG4gIH1cblxuICBzcGxpdFN0cm9rZVRvRXJhc2VyKFxuICAgIGxhc3Q6IFBvaW50ZXJFdmVudCxcbiAgICBkaXNjYXJkU3Ryb2tlOiBib29sZWFuXG4gICk6IEJyaWRnZVJlc3VsdDxBY3RpdmVUb29sU25hcHNob3Q+IHtcbiAgICBjb25zdCBhcGlSZXN1bHQgPSB0aGlzLmdldEFwaSgpO1xuICAgIGlmICghYXBpUmVzdWx0Lm9rKSByZXR1cm4gdGhpcy5yZXBvcnQoYXBpUmVzdWx0KTtcbiAgICBjb25zdCB0b29sID0gcmVhZEFjdGl2ZVRvb2woYXBpUmVzdWx0LnZhbHVlKTtcbiAgICBpZiAoIXRvb2wpIHtcbiAgICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXG4gICAgICAgIFwiaW5jb21wYXRpYmxlXCIsXG4gICAgICAgIFwiVGVtcG9yYXJ5IGVyYXNlciBjb3VsZCBub3QgcmVhZCB0aGUgY3VycmVudCBhY3RpdmUgdG9vbC5cIlxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgdGFyZ2V0ID0gZXZlbnRUYXJnZXQobGFzdCk7XG4gICAgaWYgKCF0YXJnZXQpIHJldHVybiB0aGlzLmZhaWx1cmUoXCJmYWlsZWRcIiwgXCJTdHJva2Ugc3BsaXQgY291bGQgbm90IGZpbmQgdGhlIHBvaW50ZXIgdGFyZ2V0LlwiKTtcbiAgICBjb25zdCBpZCA9IGRpc2NhcmRTdHJva2UgPyByZWFkTmV3RWxlbWVudElkKGFwaVJlc3VsdC52YWx1ZSkgOiBudWxsO1xuICAgIGRpc3BhdGNoUG9pbnRlcih0YXJnZXQsIFwicG9pbnRlcnVwXCIsIGxhc3QsIHsgYnV0dG9uOiAwLCBidXR0b25zOiAwLCBwcmVzc3VyZTogMCB9KTtcbiAgICBkaXNwYXRjaFBvaW50ZXIodGFyZ2V0LCBcInBvaW50ZXJkb3duXCIsIGxhc3QsIHsgYnV0dG9uOiA1LCBidXR0b25zOiAzMiB9KTtcbiAgICBpZiAoaWQpIG5leHRGcmFtZSgoKSA9PiB0aGlzLmRlbGV0ZUVsZW1lbnQoYXBpUmVzdWx0LnZhbHVlLCBpZCkpO1xuICAgIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogdG9vbCB9O1xuICB9XG5cbiAgc3BsaXRTdHJva2VXaXRoQWN0aXZlVG9vbChsYXN0OiBQb2ludGVyRXZlbnQpOiBCcmlkZ2VSZXN1bHQ8QWN0aXZlVG9vbFNuYXBzaG90PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZXZlbnRUYXJnZXQobGFzdCk7XG4gICAgaWYgKHRhcmdldCkgZGlzcGF0Y2hQb2ludGVyKHRhcmdldCwgXCJwb2ludGVydXBcIiwgbGFzdCwgeyBidXR0b246IDAsIGJ1dHRvbnM6IDAsIHByZXNzdXJlOiAwIH0pO1xuICAgIGNvbnN0IHN0YXJ0ZWQgPSB0aGlzLnN0YXJ0VGVtcG9yYXJ5RXJhc2VyKCk7XG4gICAgaWYgKHRhcmdldCkge1xuICAgICAgZGlzcGF0Y2hQb2ludGVyKHRhcmdldCwgXCJwb2ludGVyZG93blwiLCBsYXN0LCB7XG4gICAgICAgIGJ1dHRvbjogMCxcbiAgICAgICAgYnV0dG9uczogMSxcbiAgICAgICAgcHJlc3N1cmU6IGxhc3QucHJlc3N1cmUsXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHN0YXJ0ZWQ7XG4gIH1cblxuICBlbmRNb21lbnRhcnlFcmFzZXIoc2F2ZWQ6IEFjdGl2ZVRvb2xTbmFwc2hvdCk6IEJyaWRnZU9wZXJhdGlvblJlc3VsdCB7XG4gICAgY29uc3QgYXBpUmVzdWx0ID0gdGhpcy5nZXRBcGkoKTtcbiAgICBpZiAoIWFwaVJlc3VsdC5vaykgcmV0dXJuIHRoaXMucmVwb3J0KGFwaVJlc3VsdCk7XG4gICAgY29uc3QgYXBpID0gYXBpUmVzdWx0LnZhbHVlO1xuICAgIG5leHRGcmFtZSgoKSA9PiB7XG4gICAgICBpZiAocmVhZEFjdGl2ZVRvb2woYXBpKT8udHlwZSA9PT0gXCJlcmFzZXJcIikgdGhpcy5yZXN0b3JlVG9vbChzYXZlZCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiB1bmRlZmluZWQgfTtcbiAgfVxuXG4gIHN0YXJ0VGVtcG9yYXJ5RXJhc2VyKCk6IEJyaWRnZVJlc3VsdDxBY3RpdmVUb29sU25hcHNob3Q+IHtcbiAgICBjb25zdCBhcGlSZXN1bHQgPSB0aGlzLmdldEFwaSgpO1xuICAgIGlmICghYXBpUmVzdWx0Lm9rKSByZXR1cm4gdGhpcy5yZXBvcnQoYXBpUmVzdWx0KTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdG9vbCA9IHJlYWRBY3RpdmVUb29sKGFwaVJlc3VsdC52YWx1ZSk7XG4gICAgICBpZiAoIXRvb2wpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmFpbHVyZShcbiAgICAgICAgICBcImluY29tcGF0aWJsZVwiLFxuICAgICAgICAgIFwiVGVtcG9yYXJ5IGVyYXNlciBjb3VsZCBub3QgcmVhZCB0aGUgY3VycmVudCBhY3RpdmUgdG9vbC5cIlxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgYXBpUmVzdWx0LnZhbHVlLnNldEFjdGl2ZVRvb2woeyB0eXBlOiBcImVyYXNlclwiIH0pO1xuICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiB0b29sIH07XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwiZmFpbGVkXCIsIFwiVGVtcG9yYXJ5IGVyYXNlciBpcyB1bmF2YWlsYWJsZSBpbiB0aGlzIEV4Y2FsaWRyYXcgdmlldy5cIik7XG4gICAgfVxuICB9XG4gIHJlc3RvcmVUb29sKHRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCk6IEJyaWRnZU9wZXJhdGlvblJlc3VsdCB7XG4gICAgY29uc3QgYXBpUmVzdWx0ID0gdGhpcy5nZXRBcGkoKTtcbiAgICBpZiAoIWFwaVJlc3VsdC5vaykgcmV0dXJuIHRoaXMucmVwb3J0KGFwaVJlc3VsdCk7XG4gICAgdHJ5IHtcbiAgICAgIGFwaVJlc3VsdC52YWx1ZS5zZXRBY3RpdmVUb29sKHRvb2wpO1xuICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiB1bmRlZmluZWQgfTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXG4gICAgICAgIFwiZmFpbGVkXCIsXG4gICAgICAgIFwiVGhlIHByZXZpb3VzIHRvb2wgY291bGQgbm90IGJlIHJlc3RvcmVkIGluIHRoaXMgRXhjYWxpZHJhdyB2aWV3LlwiXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBzZXRUb29sKHR5cGU6IHN0cmluZyk6IEJyaWRnZU9wZXJhdGlvblJlc3VsdCB7XG4gICAgY29uc3QgYXBpUmVzdWx0ID0gdGhpcy5nZXRBcGkoKTtcbiAgICBpZiAoIWFwaVJlc3VsdC5vaykgcmV0dXJuIHRoaXMucmVwb3J0KGFwaVJlc3VsdCk7XG4gICAgdHJ5IHtcbiAgICAgIGFwaVJlc3VsdC52YWx1ZS5zZXRBY3RpdmVUb29sKHsgdHlwZSB9KTtcbiAgICAgIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogdW5kZWZpbmVkIH07XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwiZmFpbGVkXCIsIFwiVG9vbCBzd2l0Y2hpbmcgaXMgdW5hdmFpbGFibGUgaW4gdGhpcyBFeGNhbGlkcmF3IHZpZXcuXCIpO1xuICAgIH1cbiAgfVxuICBjb3B5U2VsZWN0ZWRFbGVtZW50cygpOiBCcmlkZ2VPcGVyYXRpb25SZXN1bHQge1xuICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXCJ1bmF2YWlsYWJsZVwiLCBcIkNvcHkgcmVxdWlyZXMgYSBjb21wYXRpYmxlIEV4Y2FsaWRyYXcgQVBJLlwiKTtcbiAgfVxuICBwYXN0ZUF0KHBvaW50OiBQb2ludCk6IEJyaWRnZU9wZXJhdGlvblJlc3VsdCB7XG4gICAgdm9pZCBwb2ludDtcbiAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwidW5hdmFpbGFibGVcIiwgXCJQYXN0ZSByZXF1aXJlcyBhIGNvbXBhdGlibGUgRXhjYWxpZHJhdyBBUEkuXCIpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRBcGkoKTogQnJpZGdlUmVzdWx0PENvbXBhdGlibGVJbXBlcmF0aXZlQXBpPiB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBnZXRMZWFmQXBpKHRoaXMubGVhZi52aWV3KTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgY29kZTogXCJmYWlsZWRcIixcbiAgICAgICAgbWVzc2FnZTogXCJFeGNhbGlkcmF3IEFQSSBsb29rdXAgZmFpbGVkIGZvciB0aGlzIGxlYWYuXCIsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVwb3J0PFQ+KHJlc3VsdDogRXhjbHVkZTxCcmlkZ2VSZXN1bHQ8VD4sIHsgb2s6IHRydWUgfT4pOiBCcmlkZ2VSZXN1bHQ8bmV2ZXI+IHtcbiAgICB0aGlzLnVuc3VwcG9ydGVkKHJlc3VsdC5tZXNzYWdlKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHByaXZhdGUgZmFpbHVyZShcbiAgICBjb2RlOiBcInVuYXZhaWxhYmxlXCIgfCBcImluY29tcGF0aWJsZVwiIHwgXCJmYWlsZWRcIixcbiAgICBtZXNzYWdlOiBzdHJpbmdcbiAgKTogQnJpZGdlUmVzdWx0PG5ldmVyPiB7XG4gICAgdGhpcy51bnN1cHBvcnRlZChtZXNzYWdlKTtcbiAgICByZXR1cm4geyBvazogZmFsc2UsIGNvZGUsIG1lc3NhZ2UgfTtcbiAgfVxuICBwcml2YXRlIHVuc3VwcG9ydGVkKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy53YXJuZWQpIHtcbiAgICAgIG5ldyBOb3RpY2UoYEV4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzOiAke21lc3NhZ2V9YCk7XG4gICAgICB0aGlzLndhcm5lZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBkZWxldGVFbGVtZW50KGFwaTogQ29tcGF0aWJsZUltcGVyYXRpdmVBcGksIGlkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBhdXRvbWF0ZSA9IGdldEdsb2JhbEF1dG9tYXRlKCk7XG4gICAgY29uc3QgZWxlbWVudHMgPSBhcGkuZ2V0U2NlbmVFbGVtZW50cz8uKCkgPz8gW107XG4gICAgY29uc3QgZWxlbWVudCA9IGVsZW1lbnRzLmZpbmQoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmlkID09PSBpZCk7XG4gICAgaWYgKCFlbGVtZW50IHx8IHR5cGVvZiBhdXRvbWF0ZT8uZGVsZXRlVmlld0VsZW1lbnRzICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHRoaXMudW5zdXBwb3J0ZWQoXCJUaGUgbGF0ZS1wcmVzcyBpbmsgZG90IGNvdWxkIG5vdCBiZSBkZWxldGVkIGluIHRoaXMgRXhjYWxpZHJhdyBidWlsZC5cIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBhdXRvbWF0ZS5zZXRWaWV3KHRoaXMubGVhZi52aWV3KTtcbiAgICAgIGF1dG9tYXRlLmRlbGV0ZVZpZXdFbGVtZW50cyhbZWxlbWVudF0pO1xuICAgIH0gY2F0Y2gge1xuICAgICAgdGhpcy51bnN1cHBvcnRlZChcIlRoZSBsYXRlLXByZXNzIGluayBkb3QgY291bGQgbm90IGJlIGRlbGV0ZWQgaW4gdGhpcyBFeGNhbGlkcmF3IGJ1aWxkLlwiKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZXZlbnRUYXJnZXQoZXZlbnQ6IFBvaW50ZXJFdmVudCk6IEV2ZW50VGFyZ2V0IHwgbnVsbCB7XG4gIHJldHVybiBldmVudC50YXJnZXQgPz8gZXZlbnQuY3VycmVudFRhcmdldDtcbn1cblxuZnVuY3Rpb24gbmV4dEZyYW1lKGNhbGxiYWNrOiAoKSA9PiB2b2lkKTogdm9pZCB7XG4gIGlmICh0eXBlb2YgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID09PSBcImZ1bmN0aW9uXCIpIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBjYWxsYmFjaygpKTtcbiAgZWxzZSBzZXRUaW1lb3V0KGNhbGxiYWNrLCAwKTtcbn1cbiIsICJleHBvcnQgaW50ZXJmYWNlIEFjdGl2ZVRvb2xTbmFwc2hvdCB7XG4gIHR5cGU6IHN0cmluZztcbiAgW2tleTogc3RyaW5nXTogdW5rbm93bjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTY2VuZUVsZW1lbnRMaWtlIHtcbiAgaWQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXBwU3RhdGVMaWtlIHtcbiAgYWN0aXZlVG9vbD86IEFjdGl2ZVRvb2xTbmFwc2hvdDtcbiAgbmV3RWxlbWVudD86IHsgaWQ/OiBzdHJpbmcgfSB8IG51bGw7XG4gIGRyYWdnaW5nRWxlbWVudD86IHsgaWQ/OiBzdHJpbmcgfSB8IG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1wZXJhdGl2ZUFwaSB7XG4gIGdldEFwcFN0YXRlPzogKCkgPT4gQXBwU3RhdGVMaWtlO1xuICBzZXRBY3RpdmVUb29sPzogKHRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCkgPT4gdm9pZDtcbiAgZ2V0U2NlbmVFbGVtZW50cz86ICgpID0+IFNjZW5lRWxlbWVudExpa2VbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaSBleHRlbmRzIEltcGVyYXRpdmVBcGkge1xuICBnZXRBcHBTdGF0ZTogKCkgPT4gQXBwU3RhdGVMaWtlO1xuICBzZXRBY3RpdmVUb29sOiAodG9vbDogQWN0aXZlVG9vbFNuYXBzaG90KSA9PiB2b2lkO1xufVxuXG5leHBvcnQgdHlwZSBCcmlkZ2VGYWlsdXJlQ29kZSA9IFwidW5hdmFpbGFibGVcIiB8IFwiaW5jb21wYXRpYmxlXCIgfCBcImZhaWxlZFwiO1xuXG5leHBvcnQgdHlwZSBCcmlkZ2VSZXN1bHQ8VD4gPVxuICB7IG9rOiB0cnVlOyB2YWx1ZTogVCB9IHwgeyBvazogZmFsc2U7IGNvZGU6IEJyaWRnZUZhaWx1cmVDb2RlOyBtZXNzYWdlOiBzdHJpbmcgfTtcblxuZXhwb3J0IHR5cGUgQnJpZGdlT3BlcmF0aW9uUmVzdWx0ID0gQnJpZGdlUmVzdWx0PHZvaWQ+O1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4Y2FsaWRyYXdMZWFmU3VyZmFjZSB7XG4gIC8qKlxuICAgKiBUaGlzIGlzIGEgY29tcGF0aWJpbGl0eSBmYWxsYmFjaywgbm90IGEgZG9jdW1lbnRlZCBFeGNhbGlkcmF3IHBsdWdpbiBBUEkuXG4gICAqIEtlZXAgYWNjZXNzIHRvIGl0IGhlcmUgdW50aWwgRXhjYWxpZHJhdyBwdWJsaXNoZXMgYSB0aGlyZC1wYXJ0eSwgbGVhZi1zY29wZWRcbiAgICogaW50ZWdyYXRpb24gcG9pbnQuXG4gICAqL1xuICBleGNhbGlkcmF3QVBJPzogdW5rbm93bjtcbn1cblxuLyoqIFRoZSBkb2N1bWVudGVkLCB2aWV3LXRhcmdldGVkIHBvcnRpb24gb2YgRXhjYWxpZHJhd0F1dG9tYXRlIHVzZWQgYnkgdGhpcyBwbHVnaW4uICovXG5leHBvcnQgaW50ZXJmYWNlIEV4Y2FsaWRyYXdBdXRvbWF0ZVN1cmZhY2Uge1xuICBzZXRWaWV3OiAodmlldzogdW5rbm93bikgPT4gdW5rbm93bjtcbiAgZ2V0RXhjYWxpZHJhd0FQSTogKCkgPT4gdW5rbm93bjtcbiAgZGVsZXRlVmlld0VsZW1lbnRzPzogKGVsZW1lbnRzOiB1bmtub3duW10pID0+IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVG9vbENhcGFiaWxpdGllcyB7XG4gIGNhblJlYWRBY3RpdmVUb29sOiBib29sZWFuO1xuICBjYW5TZXRBY3RpdmVUb29sOiBib29sZWFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9vbENhcGFiaWxpdGllcyhhcGk6IEltcGVyYXRpdmVBcGkgfCBudWxsKTogVG9vbENhcGFiaWxpdGllcyB7XG4gIHJldHVybiB7XG4gICAgY2FuUmVhZEFjdGl2ZVRvb2w6IHR5cGVvZiBhcGk/LmdldEFwcFN0YXRlID09PSBcImZ1bmN0aW9uXCIsXG4gICAgY2FuU2V0QWN0aXZlVG9vbDogdHlwZW9mIGFwaT8uc2V0QWN0aXZlVG9vbCA9PT0gXCJmdW5jdGlvblwiLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFjdGl2ZVRvb2woYXBpOiBJbXBlcmF0aXZlQXBpKTogQWN0aXZlVG9vbFNuYXBzaG90IHwgbnVsbCB7XG4gIGNvbnN0IGFjdGl2ZVRvb2wgPSBhcGkuZ2V0QXBwU3RhdGU/LigpLmFjdGl2ZVRvb2w7XG4gIHJldHVybiBhY3RpdmVUb29sID8geyAuLi5hY3RpdmVUb29sIH0gOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZE5ld0VsZW1lbnRJZChhcGk6IEltcGVyYXRpdmVBcGkpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3Qgc3RhdGUgPSBhcGkuZ2V0QXBwU3RhdGU/LigpO1xuICBjb25zdCBpZCA9IHN0YXRlPy5uZXdFbGVtZW50Py5pZCA/PyBzdGF0ZT8uZHJhZ2dpbmdFbGVtZW50Py5pZDtcbiAgcmV0dXJuIHR5cGVvZiBpZCA9PT0gXCJzdHJpbmdcIiAmJiBpZC5sZW5ndGggPiAwID8gaWQgOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzTmV3RWxlbWVudEZpZWxkKHN0YXRlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgISFzdGF0ZSAmJiB0eXBlb2Ygc3RhdGUgPT09IFwib2JqZWN0XCIgJiYgKFwibmV3RWxlbWVudFwiIGluIHN0YXRlIHx8IFwiZHJhZ2dpbmdFbGVtZW50XCIgaW4gc3RhdGUpXG4gICk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5zdGFsbGVkRXhjYWxpZHJhdyB7XG4gIGluc3RhbGxlZDogYm9vbGVhbjtcbiAgZW5hYmxlZDogYm9vbGVhbjtcbiAgdmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbn1cblxuaW50ZXJmYWNlIFBsdWdpbkhvc3Qge1xuICBwbHVnaW5zPzogUmVjb3JkPHN0cmluZywgeyBtYW5pZmVzdD86IHsgdmVyc2lvbj86IHN0cmluZyB9IH0gfCB1bmRlZmluZWQ+O1xuICBlbmFibGVkUGx1Z2lucz86IHsgaGFzPzogKGlkOiBzdHJpbmcpID0+IGJvb2xlYW4gfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRJbnN0YWxsZWRFeGNhbGlkcmF3KGFwcDogb2JqZWN0KTogSW5zdGFsbGVkRXhjYWxpZHJhdyB7XG4gIGNvbnN0IGhvc3QgPSBhcHAgYXMgeyBwbHVnaW5zPzogUGx1Z2luSG9zdCB9O1xuICBjb25zdCBwbHVnaW4gPSBob3N0LnBsdWdpbnM/LnBsdWdpbnM/LltcIm9ic2lkaWFuLWV4Y2FsaWRyYXctcGx1Z2luXCJdO1xuICByZXR1cm4ge1xuICAgIGluc3RhbGxlZDogQm9vbGVhbihwbHVnaW4pLFxuICAgIGVuYWJsZWQ6IGhvc3QucGx1Z2lucz8uZW5hYmxlZFBsdWdpbnM/Lmhhcz8uKFwib2JzaWRpYW4tZXhjYWxpZHJhdy1wbHVnaW5cIikgPT09IHRydWUsXG4gICAgdmVyc2lvbjogcGx1Z2luPy5tYW5pZmVzdD8udmVyc2lvbiA/PyBudWxsLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TGVhZkFwaShcbiAgdmlldzogdW5rbm93bixcbiAgYXV0b21hdGUgPSBnZXRHbG9iYWxBdXRvbWF0ZSgpXG4pOiBCcmlkZ2VSZXN1bHQ8Q29tcGF0aWJsZUltcGVyYXRpdmVBcGk+IHtcbiAgaWYgKCF2aWV3IHx8IHR5cGVvZiB2aWV3ICE9PSBcIm9iamVjdFwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiBmYWxzZSxcbiAgICAgIGNvZGU6IFwidW5hdmFpbGFibGVcIixcbiAgICAgIG1lc3NhZ2U6IFwiVGhpcyBsZWFmIGRvZXMgbm90IGV4cG9zZSBhbiBFeGNhbGlkcmF3IHZpZXcuXCIsXG4gICAgfTtcbiAgfVxuICBpZiAoYXV0b21hdGUpIHtcbiAgICB0cnkge1xuICAgICAgLy8gRXhjYWxpZHJhd0F1dG9tYXRlIGRvY3VtZW50cyBzZXRWaWV3KHZpZXcpIHNwZWNpZmljYWxseSBzbyBvcGVyYXRpb25zXG4gICAgICAvLyBhcmUgc2NvcGVkIHRvIHRoYXQgdmlldy4gTmV2ZXIgcGFzcyBcImFjdGl2ZVwiIGhlcmUuXG4gICAgICBhdXRvbWF0ZS5zZXRWaWV3KHZpZXcpO1xuICAgICAgcmV0dXJuIHZhbGlkYXRlSW1wZXJhdGl2ZUFwaShhdXRvbWF0ZS5nZXRFeGNhbGlkcmF3QVBJKCkpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb2s6IGZhbHNlLFxuICAgICAgICBjb2RlOiBcImZhaWxlZFwiLFxuICAgICAgICBtZXNzYWdlOiBcIkV4Y2FsaWRyYXcgY291bGQgbm90IHRhcmdldCB0aGlzIGxlYWYncyBjYW52YXMuXCIsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8vIFRoaXMgZmFsbGJhY2sgaXMgZGVsaWJlcmF0ZWx5IGlzb2xhdGVkOiBpdCBpcyBub3QgcGFydCBvZiBFeGNhbGlkcmF3J3NcbiAgLy8gZG9jdW1lbnRlZCB0aGlyZC1wYXJ0eSBBUEkgc3VyZmFjZS5cbiAgY29uc3QgYXBpID0gKHZpZXcgYXMgRXhjYWxpZHJhd0xlYWZTdXJmYWNlKS5leGNhbGlkcmF3QVBJO1xuICByZXR1cm4gdmFsaWRhdGVJbXBlcmF0aXZlQXBpKGFwaSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWxBdXRvbWF0ZSgpOiBFeGNhbGlkcmF3QXV0b21hdGVTdXJmYWNlIHwgbnVsbCB7XG4gIGNvbnN0IGNhbmRpZGF0ZSA9IChnbG9iYWxUaGlzIGFzIHsgRXhjYWxpZHJhd0F1dG9tYXRlPzogdW5rbm93biB9KS5FeGNhbGlkcmF3QXV0b21hdGU7XG4gIGlmIChcbiAgICBjYW5kaWRhdGUgJiZcbiAgICB0eXBlb2YgY2FuZGlkYXRlID09PSBcIm9iamVjdFwiICYmXG4gICAgdHlwZW9mIChjYW5kaWRhdGUgYXMgRXhjYWxpZHJhd0F1dG9tYXRlU3VyZmFjZSkuc2V0VmlldyA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgdHlwZW9mIChjYW5kaWRhdGUgYXMgRXhjYWxpZHJhd0F1dG9tYXRlU3VyZmFjZSkuZ2V0RXhjYWxpZHJhd0FQSSA9PT0gXCJmdW5jdGlvblwiXG4gICkge1xuICAgIHJldHVybiBjYW5kaWRhdGUgYXMgRXhjYWxpZHJhd0F1dG9tYXRlU3VyZmFjZTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVJbXBlcmF0aXZlQXBpKGFwaTogdW5rbm93bik6IEJyaWRnZVJlc3VsdDxDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaT4ge1xuICBpZiAoIWFwaSB8fCB0eXBlb2YgYXBpICE9PSBcIm9iamVjdFwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiBmYWxzZSxcbiAgICAgIGNvZGU6IFwidW5hdmFpbGFibGVcIixcbiAgICAgIG1lc3NhZ2U6IFwiRXhjYWxpZHJhdyBoYXMgbm90IG1hZGUgYW4gQVBJIGF2YWlsYWJsZSBmb3IgdGhpcyBsZWFmLlwiLFxuICAgIH07XG4gIH1cbiAgY29uc3QgY2FwYWJpbGl0aWVzID0gdG9vbENhcGFiaWxpdGllcyhhcGkgYXMgSW1wZXJhdGl2ZUFwaSk7XG4gIGlmICghY2FwYWJpbGl0aWVzLmNhblJlYWRBY3RpdmVUb29sIHx8ICFjYXBhYmlsaXRpZXMuY2FuU2V0QWN0aXZlVG9vbCkge1xuICAgIHJldHVybiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBjb2RlOiBcImluY29tcGF0aWJsZVwiLFxuICAgICAgbWVzc2FnZTogXCJUaGlzIEV4Y2FsaWRyYXcgQVBJIGRvZXMgbm90IHN1cHBvcnQgYWN0aXZlLXRvb2wgcmVhZCBhbmQgd3JpdGUgb3BlcmF0aW9ucy5cIixcbiAgICB9O1xuICB9XG4gIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogYXBpIGFzIENvbXBhdGlibGVJbXBlcmF0aXZlQXBpIH07XG59XG4iLCAiY29uc3Qgc3ludGhldGljID0gbmV3IFdlYWtTZXQ8RXZlbnQ+KCk7XG5cbmV4cG9ydCBjb25zdCBpc1N5bnRoZXRpYyA9IChldmVudDogRXZlbnQpOiBib29sZWFuID0+IHN5bnRoZXRpYy5oYXMoZXZlbnQpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBvaW50ZXJJbml0TGlrZSB7XG4gIHBvaW50ZXJJZD86IG51bWJlcjtcbiAgY2xpZW50WD86IG51bWJlcjtcbiAgY2xpZW50WT86IG51bWJlcjtcbiAgc2NyZWVuWD86IG51bWJlcjtcbiAgc2NyZWVuWT86IG51bWJlcjtcbiAgcHJlc3N1cmU/OiBudW1iZXI7XG4gIHRpbHRYPzogbnVtYmVyO1xuICB0aWx0WT86IG51bWJlcjtcbiAgdHdpc3Q/OiBudW1iZXI7XG4gIHdpZHRoPzogbnVtYmVyO1xuICBoZWlnaHQ/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaXNwYXRjaFBvaW50ZXIoXG4gIHRhcmdldDogRXZlbnRUYXJnZXQsXG4gIHR5cGU6IHN0cmluZyxcbiAgZnJvbTogUG9pbnRlckluaXRMaWtlLFxuICBvdmVyOiBQb2ludGVyRXZlbnRJbml0XG4pOiBQb2ludGVyRXZlbnQge1xuICBjb25zdCBldmVudCA9IG5ldyBQb2ludGVyRXZlbnQodHlwZSwge1xuICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICBjb21wb3NlZDogdHJ1ZSxcbiAgICBwb2ludGVySWQ6IGZyb20ucG9pbnRlcklkID8/IDEsXG4gICAgcG9pbnRlclR5cGU6IFwicGVuXCIsXG4gICAgaXNQcmltYXJ5OiB0cnVlLFxuICAgIGNsaWVudFg6IGZyb20uY2xpZW50WCA/PyAwLFxuICAgIGNsaWVudFk6IGZyb20uY2xpZW50WSA/PyAwLFxuICAgIHNjcmVlblg6IGZyb20uc2NyZWVuWCA/PyAwLFxuICAgIHNjcmVlblk6IGZyb20uc2NyZWVuWSA/PyAwLFxuICAgIHByZXNzdXJlOiBmcm9tLnByZXNzdXJlID8/IDAsXG4gICAgdGlsdFg6IGZyb20udGlsdFggPz8gMCxcbiAgICB0aWx0WTogZnJvbS50aWx0WSA/PyAwLFxuICAgIHR3aXN0OiBmcm9tLnR3aXN0ID8/IDAsXG4gICAgd2lkdGg6IGZyb20ud2lkdGggPz8gMSxcbiAgICBoZWlnaHQ6IGZyb20uaGVpZ2h0ID8/IDEsXG4gICAgLi4ub3ZlcixcbiAgfSk7XG4gIHN5bnRoZXRpYy5hZGQoZXZlbnQpO1xuICB0YXJnZXQuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gIHJldHVybiBldmVudDtcbn1cbiIsICJleHBvcnQgY29uc3QgQ0xPU0UgPSB7XG4gIE5PUk1BTDogMTAwMCxcbiAgR09JTkdfQVdBWTogMTAwMSxcbiAgUFJPVE9DT0w6IDQ0MDAsXG4gIEFVVEg6IDQ0MDEsXG4gIE9SSUdJTjogNDQwMyxcbiAgQVVUSF9USU1FT1VUOiA0NDA4LFxufSBhcyBjb25zdDtcblxuY29uc3QgdGV4dEVuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcblxuZXhwb3J0IGludGVyZmFjZSBIZWxsb0ZyYW1lIHtcbiAgdHlwZTogXCJoZWxsb1wiO1xuICBwcm90bzogbnVtYmVyO1xuICBhcHA6IHN0cmluZztcbiAgYXBwVmVyc2lvbjogc3RyaW5nO1xuICBub25jZTogc3RyaW5nO1xuICBjYXBzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWFkeUZyYW1lIHtcbiAgdHlwZTogXCJyZWFkeVwiO1xuICBzZXNzaW9uOiBzdHJpbmc7XG4gIHNlcnZlclByb29mOiBzdHJpbmc7XG4gIGhlYXJ0YmVhdE1zOiBudW1iZXI7XG4gIHNvdXJjZTogU291cmNlQm9keTtcbiAgYnV0dG9uOiB7IGJ1dHRvbjogXCJwcmltYXJ5XCI7IGRvd246IGJvb2xlYW47IHNlcTogbnVtYmVyOyB0OiBudW1iZXIgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCdXR0b25GcmFtZSB7XG4gIHR5cGU6IFwiYnV0dG9uXCI7XG4gIGJ1dHRvbjogXCJwcmltYXJ5XCI7XG4gIGRvd246IGJvb2xlYW47XG4gIHNlcTogbnVtYmVyO1xuICB0OiBudW1iZXI7XG4gIHNlbnQ6IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQaW5nRnJhbWUge1xuICB0eXBlOiBcInBpbmdcIjtcbiAgc2VxOiBudW1iZXI7XG4gIGRvd246IGJvb2xlYW47XG4gIHNlbnQ6IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTb3VyY2VGcmFtZSB7XG4gIHR5cGU6IFwic291cmNlXCI7XG4gIHN0YXRlOiBcIm9rXCIgfCBcInVuYXZhaWxhYmxlXCI7XG4gIHJlYXNvbj86IHN0cmluZztcbiAgbm9kZT86IHN0cmluZztcbiAgbmFtZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kRnJhbWUge1xuICB0eXBlOiBcImNvbW1hbmRcIjtcbiAgYWN0aW9uOiBcIm9wZW4tbWVudVwiO1xuICBzZXE6IG51bWJlcjtcbiAgc2VudDogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFVua25vd25GcmFtZSB7XG4gIHR5cGU6IFwidW5rbm93blwiO1xuICByYXdUeXBlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCB0eXBlIFNlcnZlckZyYW1lID1cbiAgSGVsbG9GcmFtZSB8IFJlYWR5RnJhbWUgfCBCdXR0b25GcmFtZSB8IFBpbmdGcmFtZSB8IFNvdXJjZUZyYW1lIHwgQ29tbWFuZEZyYW1lIHwgVW5rbm93bkZyYW1lO1xuXG5pbnRlcmZhY2UgU291cmNlQm9keSB7XG4gIHN0YXRlOiBcIm9rXCIgfCBcInVuYXZhaWxhYmxlXCI7XG4gIHJlYXNvbj86IHN0cmluZztcbiAgbm9kZT86IHN0cmluZztcbiAgbmFtZT86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gaXNSZWNvcmQodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgdmFsdWUgIT09IG51bGwgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBzdHJpbmdGaWVsZChyZWNvcmQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LCBrZXk6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCB2YWx1ZSA9IHJlY29yZFtrZXldO1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gdmFsdWUgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBib29sZWFuRmllbGQocmVjb3JkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiwga2V5OiBzdHJpbmcpOiBib29sZWFuIHwgbnVsbCB7XG4gIGNvbnN0IHZhbHVlID0gcmVjb3JkW2tleV07XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwiYm9vbGVhblwiID8gdmFsdWUgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBudW1iZXJGaWVsZChyZWNvcmQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LCBrZXk6IHN0cmluZyk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCB2YWx1ZSA9IHJlY29yZFtrZXldO1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiICYmIE51bWJlci5pc0Zpbml0ZSh2YWx1ZSkgPyB2YWx1ZSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIGludGVnZXJGaWVsZChyZWNvcmQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LCBrZXk6IHN0cmluZyk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCB2YWx1ZSA9IG51bWJlckZpZWxkKHJlY29yZCwga2V5KTtcbiAgcmV0dXJuIHZhbHVlICE9PSBudWxsICYmIE51bWJlci5pc0ludGVnZXIodmFsdWUpID8gdmFsdWUgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBvcHRpb25hbFN0cmluZyhyZWNvcmQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LCBrZXk6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmICghKGtleSBpbiByZWNvcmQpIHx8IHJlY29yZFtrZXldID09PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWQ7XG4gIGNvbnN0IHZhbHVlID0gc3RyaW5nRmllbGQocmVjb3JkLCBrZXkpO1xuICByZXR1cm4gdmFsdWUgPT09IG51bGwgPyB1bmRlZmluZWQgOiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gc291cmNlQm9keSh2YWx1ZTogdW5rbm93bik6IFNvdXJjZUJvZHkgfCBudWxsIHtcbiAgaWYgKCFpc1JlY29yZCh2YWx1ZSkpIHJldHVybiBudWxsO1xuICBjb25zdCBzdGF0ZSA9IHN0cmluZ0ZpZWxkKHZhbHVlLCBcInN0YXRlXCIpO1xuICBpZiAoc3RhdGUgIT09IFwib2tcIiAmJiBzdGF0ZSAhPT0gXCJ1bmF2YWlsYWJsZVwiKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgcmVhc29uID0gb3B0aW9uYWxTdHJpbmcodmFsdWUsIFwicmVhc29uXCIpO1xuICBjb25zdCBub2RlID0gb3B0aW9uYWxTdHJpbmcodmFsdWUsIFwibm9kZVwiKTtcbiAgY29uc3QgbmFtZSA9IG9wdGlvbmFsU3RyaW5nKHZhbHVlLCBcIm5hbWVcIik7XG4gIGlmIChcbiAgICAoXCJyZWFzb25cIiBpbiB2YWx1ZSAmJiB2YWx1ZS5yZWFzb24gIT09IHVuZGVmaW5lZCAmJiByZWFzb24gPT09IHVuZGVmaW5lZCkgfHxcbiAgICAoXCJub2RlXCIgaW4gdmFsdWUgJiYgdmFsdWUubm9kZSAhPT0gdW5kZWZpbmVkICYmIG5vZGUgPT09IHVuZGVmaW5lZCkgfHxcbiAgICAoXCJuYW1lXCIgaW4gdmFsdWUgJiYgdmFsdWUubmFtZSAhPT0gdW5kZWZpbmVkICYmIG5hbWUgPT09IHVuZGVmaW5lZClcbiAgKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHsgc3RhdGUsIHJlYXNvbiwgbm9kZSwgbmFtZSB9O1xufVxuXG5mdW5jdGlvbiBwYXJzZUhlbGxvKHJlY29yZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBIZWxsb0ZyYW1lIHwgbnVsbCB7XG4gIGNvbnN0IHByb3RvID0gaW50ZWdlckZpZWxkKHJlY29yZCwgXCJwcm90b1wiKTtcbiAgY29uc3QgYXBwID0gc3RyaW5nRmllbGQocmVjb3JkLCBcImFwcFwiKTtcbiAgY29uc3QgYXBwVmVyc2lvbiA9IHN0cmluZ0ZpZWxkKHJlY29yZCwgXCJhcHBWZXJzaW9uXCIpO1xuICBjb25zdCBub25jZSA9IHN0cmluZ0ZpZWxkKHJlY29yZCwgXCJub25jZVwiKTtcbiAgY29uc3QgY2FwcyA9IHJlY29yZC5jYXBzO1xuICBpZiAocHJvdG8gPT09IG51bGwgfHwgYXBwID09PSBudWxsIHx8IGFwcFZlcnNpb24gPT09IG51bGwgfHwgbm9uY2UgPT09IG51bGwpIHJldHVybiBudWxsO1xuICBpZiAoIUFycmF5LmlzQXJyYXkoY2FwcykgfHwgY2Fwcy5zb21lKChpdGVtKSA9PiB0eXBlb2YgaXRlbSAhPT0gXCJzdHJpbmdcIikpIHJldHVybiBudWxsO1xuICByZXR1cm4geyB0eXBlOiBcImhlbGxvXCIsIHByb3RvLCBhcHAsIGFwcFZlcnNpb24sIG5vbmNlLCBjYXBzIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlUmVhZHkocmVjb3JkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IFJlYWR5RnJhbWUgfCBudWxsIHtcbiAgY29uc3Qgc2Vzc2lvbiA9IHN0cmluZ0ZpZWxkKHJlY29yZCwgXCJzZXNzaW9uXCIpO1xuICBjb25zdCBzZXJ2ZXJQcm9vZiA9IHN0cmluZ0ZpZWxkKHJlY29yZCwgXCJzZXJ2ZXJQcm9vZlwiKTtcbiAgY29uc3QgaGVhcnRiZWF0TXMgPSBpbnRlZ2VyRmllbGQocmVjb3JkLCBcImhlYXJ0YmVhdE1zXCIpO1xuICBjb25zdCBzb3VyY2UgPSBzb3VyY2VCb2R5KHJlY29yZC5zb3VyY2UpO1xuICBpZiAoc2Vzc2lvbiA9PT0gbnVsbCB8fCBzZXJ2ZXJQcm9vZiA9PT0gbnVsbCB8fCBoZWFydGJlYXRNcyA9PT0gbnVsbCB8fCAhc291cmNlKSByZXR1cm4gbnVsbDtcbiAgaWYgKCFpc1JlY29yZChyZWNvcmQuYnV0dG9uKSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGJ1dHRvbiA9IHN0cmluZ0ZpZWxkKHJlY29yZC5idXR0b24sIFwiYnV0dG9uXCIpO1xuICBjb25zdCBkb3duID0gYm9vbGVhbkZpZWxkKHJlY29yZC5idXR0b24sIFwiZG93blwiKTtcbiAgY29uc3Qgc2VxID0gaW50ZWdlckZpZWxkKHJlY29yZC5idXR0b24sIFwic2VxXCIpO1xuICBjb25zdCB0ID0gbnVtYmVyRmllbGQocmVjb3JkLmJ1dHRvbiwgXCJ0XCIpO1xuICBpZiAoYnV0dG9uICE9PSBcInByaW1hcnlcIiB8fCBkb3duID09PSBudWxsIHx8IHNlcSA9PT0gbnVsbCB8fCB0ID09PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiBcInJlYWR5XCIsXG4gICAgc2Vzc2lvbixcbiAgICBzZXJ2ZXJQcm9vZixcbiAgICBoZWFydGJlYXRNcyxcbiAgICBzb3VyY2UsXG4gICAgYnV0dG9uOiB7IGJ1dHRvbiwgZG93biwgc2VxLCB0IH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlQnV0dG9uKHJlY29yZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBCdXR0b25GcmFtZSB8IG51bGwge1xuICBjb25zdCBidXR0b24gPSBzdHJpbmdGaWVsZChyZWNvcmQsIFwiYnV0dG9uXCIpO1xuICBjb25zdCBkb3duID0gYm9vbGVhbkZpZWxkKHJlY29yZCwgXCJkb3duXCIpO1xuICBjb25zdCBzZXEgPSBpbnRlZ2VyRmllbGQocmVjb3JkLCBcInNlcVwiKTtcbiAgY29uc3QgdCA9IG51bWJlckZpZWxkKHJlY29yZCwgXCJ0XCIpO1xuICBjb25zdCBzZW50ID0gbnVtYmVyRmllbGQocmVjb3JkLCBcInNlbnRcIik7XG4gIGlmIChidXR0b24gIT09IFwicHJpbWFyeVwiIHx8IGRvd24gPT09IG51bGwgfHwgc2VxID09PSBudWxsIHx8IHQgPT09IG51bGwgfHwgc2VudCA9PT0gbnVsbClcbiAgICByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHsgdHlwZTogXCJidXR0b25cIiwgYnV0dG9uLCBkb3duLCBzZXEsIHQsIHNlbnQgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VQaW5nKHJlY29yZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBQaW5nRnJhbWUgfCBudWxsIHtcbiAgY29uc3Qgc2VxID0gaW50ZWdlckZpZWxkKHJlY29yZCwgXCJzZXFcIik7XG4gIGNvbnN0IGRvd24gPSBib29sZWFuRmllbGQocmVjb3JkLCBcImRvd25cIik7XG4gIGNvbnN0IHNlbnQgPSBudW1iZXJGaWVsZChyZWNvcmQsIFwic2VudFwiKTtcbiAgaWYgKHNlcSA9PT0gbnVsbCB8fCBkb3duID09PSBudWxsIHx8IHNlbnQgPT09IG51bGwpIHJldHVybiBudWxsO1xuICByZXR1cm4geyB0eXBlOiBcInBpbmdcIiwgc2VxLCBkb3duLCBzZW50IH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlU291cmNlKHJlY29yZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBTb3VyY2VGcmFtZSB8IG51bGwge1xuICBjb25zdCBzb3VyY2UgPSBzb3VyY2VCb2R5KHJlY29yZCk7XG4gIGlmICghc291cmNlKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHsgdHlwZTogXCJzb3VyY2VcIiwgLi4uc291cmNlIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlQ29tbWFuZChyZWNvcmQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogQ29tbWFuZEZyYW1lIHwgbnVsbCB7XG4gIGNvbnN0IGFjdGlvbiA9IHN0cmluZ0ZpZWxkKHJlY29yZCwgXCJhY3Rpb25cIik7XG4gIGNvbnN0IHNlcSA9IGludGVnZXJGaWVsZChyZWNvcmQsIFwic2VxXCIpO1xuICBjb25zdCBzZW50ID0gbnVtYmVyRmllbGQocmVjb3JkLCBcInNlbnRcIik7XG4gIGlmIChhY3Rpb24gIT09IFwib3Blbi1tZW51XCIgfHwgc2VxID09PSBudWxsIHx8IHNlbnQgPT09IG51bGwpIHJldHVybiBudWxsO1xuICByZXR1cm4geyB0eXBlOiBcImNvbW1hbmRcIiwgYWN0aW9uLCBzZXEsIHNlbnQgfTtcbn1cblxuLyoqIFN0cmljdCBmcmFtZSBwYXJzZXIuIFVua25vd24gdHlwZXMgYXJlIGlnbm9yZWQgYnkgY2FsbGVycy4gTWFsZm9ybWVkIEpTT04gcmV0dXJucyBudWxsLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU2VydmVyRnJhbWUodGV4dDogc3RyaW5nKTogU2VydmVyRnJhbWUgfCBudWxsIHtcbiAgbGV0IHZhbHVlOiB1bmtub3duO1xuICB0cnkge1xuICAgIHZhbHVlID0gSlNPTi5wYXJzZSh0ZXh0KTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKCFpc1JlY29yZCh2YWx1ZSkgfHwgdHlwZW9mIHZhbHVlLnR5cGUgIT09IFwic3RyaW5nXCIpIHJldHVybiBudWxsO1xuICBzd2l0Y2ggKHZhbHVlLnR5cGUpIHtcbiAgICBjYXNlIFwiaGVsbG9cIjpcbiAgICAgIHJldHVybiBwYXJzZUhlbGxvKHZhbHVlKTtcbiAgICBjYXNlIFwicmVhZHlcIjpcbiAgICAgIHJldHVybiBwYXJzZVJlYWR5KHZhbHVlKTtcbiAgICBjYXNlIFwiYnV0dG9uXCI6XG4gICAgICByZXR1cm4gcGFyc2VCdXR0b24odmFsdWUpO1xuICAgIGNhc2UgXCJwaW5nXCI6XG4gICAgICByZXR1cm4gcGFyc2VQaW5nKHZhbHVlKTtcbiAgICBjYXNlIFwic291cmNlXCI6XG4gICAgICByZXR1cm4gcGFyc2VTb3VyY2UodmFsdWUpO1xuICAgIGNhc2UgXCJjb21tYW5kXCI6XG4gICAgICByZXR1cm4gcGFyc2VDb21tYW5kKHZhbHVlKTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHsgdHlwZTogXCJ1bmtub3duXCIsIHJhd1R5cGU6IHZhbHVlLnR5cGUgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0dXJsKGJ5dGVzOiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgbGV0IGJpbmFyeSA9IFwiXCI7XG4gIGZvciAoY29uc3QgYnl0ZSBvZiBieXRlcykgYmluYXJ5ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZSk7XG4gIHJldHVybiBidG9hKGJpbmFyeSkucmVwbGFjZUFsbChcIitcIiwgXCItXCIpLnJlcGxhY2VBbGwoXCIvXCIsIFwiX1wiKS5yZXBsYWNlKC89KyQvdSwgXCJcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWNvZGVQYWlyaW5nQ29kZShjb2RlOiBzdHJpbmcpOiBVaW50OEFycmF5IHwgbnVsbCB7XG4gIGNvbnN0IHRyaW1tZWQgPSBjb2RlLnRyaW0oKTtcbiAgaWYgKCEvXltBLVphLXowLTlfLV0rJC91LnRlc3QodHJpbW1lZCkpIHJldHVybiBudWxsO1xuICBjb25zdCBwYWRkZWQgPSB0cmltbWVkICsgXCI9XCIucmVwZWF0KCg0IC0gKHRyaW1tZWQubGVuZ3RoICUgNCkpICUgNCk7XG4gIGNvbnN0IGVuY29kZWQgPSBwYWRkZWQucmVwbGFjZUFsbChcIi1cIiwgXCIrXCIpLnJlcGxhY2VBbGwoXCJfXCIsIFwiL1wiKTtcbiAgbGV0IGJpbmFyeTogc3RyaW5nO1xuICB0cnkge1xuICAgIGJpbmFyeSA9IGF0b2IoZW5jb2RlZCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYmluYXJ5Lmxlbmd0aCk7XG4gIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBiaW5hcnkubGVuZ3RoOyBpbmRleCArPSAxKSBieXRlc1tpbmRleF0gPSBiaW5hcnkuY2hhckNvZGVBdChpbmRleCk7XG4gIHJldHVybiBieXRlcy5sZW5ndGggPT09IDMyID8gYnl0ZXMgOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbmV3Tm9uY2UoKTogc3RyaW5nIHtcbiAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheSgxNik7XG4gIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMoYnl0ZXMpO1xuICByZXR1cm4gYmFzZTY0dXJsKGJ5dGVzKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaG1hYyhzZWNyZXQ6IFVpbnQ4QXJyYXksIG1lc3NhZ2U6IHN0cmluZyk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICBjb25zdCBrZXkgPSBhd2FpdCBjcnlwdG8uc3VidGxlLmltcG9ydEtleShcbiAgICBcInJhd1wiLFxuICAgIGNvcHlCeXRlcyhzZWNyZXQpLFxuICAgIHsgbmFtZTogXCJITUFDXCIsIGhhc2g6IFwiU0hBLTI1NlwiIH0sXG4gICAgZmFsc2UsXG4gICAgW1wic2lnblwiXVxuICApO1xuICBjb25zdCBzaWduYXR1cmUgPSBhd2FpdCBjcnlwdG8uc3VidGxlLnNpZ24oXCJITUFDXCIsIGtleSwgdGV4dEVuY29kZXIuZW5jb2RlKG1lc3NhZ2UpKTtcbiAgcmV0dXJuIG5ldyBVaW50OEFycmF5KHNpZ25hdHVyZSk7XG59XG5cbmZ1bmN0aW9uIGNvcHlCeXRlcyhieXRlczogVWludDhBcnJheSk6IEFycmF5QnVmZmVyIHtcbiAgY29uc3QgY29weSA9IG5ldyBBcnJheUJ1ZmZlcihieXRlcy5ieXRlTGVuZ3RoKTtcbiAgbmV3IFVpbnQ4QXJyYXkoY29weSkuc2V0KGJ5dGVzKTtcbiAgcmV0dXJuIGNvcHk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm9vZihcbiAgc2VjcmV0OiBVaW50OEFycmF5LFxuICBub25jZTogc3RyaW5nLFxuICBjbGllbnROb25jZTogc3RyaW5nLFxuICByb2xlOiBcImNsaWVudFwiIHwgXCJzZXJ2ZXJcIlxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZGlnZXN0ID0gYXdhaXQgaG1hYyhzZWNyZXQsIGBzcGVuLWJyaWRnZS8xfCR7cm9sZX18JHtub25jZX18JHtjbGllbnROb25jZX1gKTtcbiAgcmV0dXJuIGJhc2U2NHVybChkaWdlc3QpO1xufVxuXG5jb25zdCBCQVNFMzIgPSBcIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaMjM0NTY3XCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBiYXNlMzIoYnl0ZXM6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICBsZXQgb3V0cHV0ID0gXCJcIjtcbiAgbGV0IGJ1ZmZlciA9IDA7XG4gIGxldCBiaXRzID0gMDtcbiAgZm9yIChjb25zdCBieXRlIG9mIGJ5dGVzKSB7XG4gICAgYnVmZmVyID0gKGJ1ZmZlciA8PCA4KSB8IGJ5dGU7XG4gICAgYml0cyArPSA4O1xuICAgIHdoaWxlIChiaXRzID49IDUpIHtcbiAgICAgIGJpdHMgLT0gNTtcbiAgICAgIG91dHB1dCArPSBCQVNFMzJbKGJ1ZmZlciA+PiBiaXRzKSAmIDMxXTtcbiAgICB9XG4gIH1cbiAgaWYgKGJpdHMgPiAwKSBvdXRwdXQgKz0gQkFTRTMyWyhidWZmZXIgPDwgKDUgLSBiaXRzKSkgJiAzMV07XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaW5nZXJwcmludChzZWNyZXQ6IFVpbnQ4QXJyYXkpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBkaWdlc3QgPSBuZXcgVWludDhBcnJheShhd2FpdCBjcnlwdG8uc3VidGxlLmRpZ2VzdChcIlNIQS0yNTZcIiwgY29weUJ5dGVzKHNlY3JldCkpKTtcbiAgY29uc3QgZW5jb2RlZCA9IGJhc2UzMihkaWdlc3QpO1xuICByZXR1cm4gYCR7ZW5jb2RlZC5zbGljZSgwLCA0KX0tJHtlbmNvZGVkLnNsaWNlKDQsIDgpfWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYWZlRXF1YWwobGVmdDogc3RyaW5nLCByaWdodDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IGEgPSB0ZXh0RW5jb2Rlci5lbmNvZGUobGVmdCk7XG4gIGNvbnN0IGIgPSB0ZXh0RW5jb2Rlci5lbmNvZGUocmlnaHQpO1xuICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gIGxldCBkaWZmID0gMDtcbiAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGEubGVuZ3RoOyBpbmRleCArPSAxKSBkaWZmIHw9IChhW2luZGV4XSA/PyAwKSBeIChiW2luZGV4XSA/PyAwKTtcbiAgcmV0dXJuIGRpZmYgPT09IDA7XG59XG4iLCAiaW1wb3J0IHsgUGxhdGZvcm0gfSBmcm9tIFwib2JzaWRpYW5cIjtcblxuZXhwb3J0IHR5cGUgU3R5bHVzQWN0aW9uID0gXCJtZW51XCIgfCBcImNvcHlcIiB8IFwicGFzdGVcIiB8IFwibm9uZVwiO1xuZXhwb3J0IHR5cGUgQmFycmVsQnV0dG9uTWFzayA9IDEgfCAyIHwgNCB8IDggfCAxNiB8IDMyO1xuZXhwb3J0IHR5cGUgUHJpbWFyeUNvbnRhY3RNb2RlID0gXCJob3Zlci1vbmx5XCIgfCBcImV4cGVyaW1lbnRhbFwiO1xuZXhwb3J0IHR5cGUgTWlkU3Ryb2tlUHJlc3MgPSBcInNwbGl0XCIgfCBcIm5leHQtY29udGFjdFwiO1xuZXhwb3J0IHR5cGUgRXJhc2VyU3RyYXRlZ3kgPSBcInN5bnRoZXRpYy1idXR0b241XCIgfCBcInNldC1hY3RpdmUtdG9vbFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFN0eWx1c0NvbnRyb2xzU2V0dGluZ3Mge1xuICBidXR0b25UYXBBY3Rpb246IFN0eWx1c0FjdGlvbjtcbiAgYnV0dG9uRG91YmxlVGFwQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gIGJ1dHRvbkhvbGRBY3Rpb246IFN0eWx1c0FjdGlvbjtcbiAgYnV0dG9uQ29udGFjdEFjdGlvbjogXCJlcmFzZXJcIiB8IFwibm9uZVwiO1xuICBkb3VibGVUYXBNczogbnVtYmVyO1xuICBsb25nUHJlc3NNczogbnVtYmVyO1xuICBtb3ZlbWVudFRocmVzaG9sZFB4OiBudW1iZXI7XG4gIC8qKiBQb2ludGVyRXZlbnQuYnV0dG9ucyBiaXQgdXNlZCBieSB0aGUgZGV2aWNlIGZvciB0aGUgYmFycmVsIGJ1dHRvbi4gKi9cbiAgYmFycmVsQnV0dG9uTWFzazogQmFycmVsQnV0dG9uTWFzaztcbiAgLyoqIFByZXZlbnQgdGhlIEFuZHJvaWQvV2ViVmlldyBwcmltYXJ5IGJpdCBmcm9tIG1hdGNoaW5nIG9yZGluYXJ5IHBlbiBjb250YWN0IGJ5IGRlZmF1bHQuICovXG4gIHByaW1hcnlDb250YWN0TW9kZTogUHJpbWFyeUNvbnRhY3RNb2RlO1xuICAvKiogQWxsb3cgYSB0ZXN0ZXIgdG8gaW5zcGVjdCByZWNvZ25pdGlvbiB3aXRob3V0IGNoYW5naW5nIHRoZSBkcmF3aW5nIG9yIG9wZW5pbmcgYWN0aW9ucy4gKi9cbiAgc3R5bHVzVGVzdE1vZGU6IGJvb2xlYW47XG4gIGRlYnVnTW9kZTogYm9vbGVhbjtcbiAgZGVidWdPdmVybGF5OiBib29sZWFuO1xuICBwZW5CcmlkZ2VFbmFibGVkOiBib29sZWFuO1xuICBwZW5CcmlkZ2VQb3J0OiBudW1iZXI7XG4gIGxhdGVXaW5kb3dNczogbnVtYmVyO1xuICBtaWRTdHJva2VQcmVzczogTWlkU3Ryb2tlUHJlc3M7XG4gIGVyYXNlclN0cmF0ZWd5OiBFcmFzZXJTdHJhdGVneTtcbiAgc3VwcHJlc3NIb3ZlckJ1dHRvbkV2ZW50czogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgPSB7XG4gIGJ1dHRvblRhcEFjdGlvbjogXCJtZW51XCIsXG4gIGJ1dHRvbkRvdWJsZVRhcEFjdGlvbjogXCJjb3B5XCIsXG4gIGJ1dHRvbkhvbGRBY3Rpb246IFwicGFzdGVcIixcbiAgYnV0dG9uQ29udGFjdEFjdGlvbjogXCJlcmFzZXJcIixcbiAgZG91YmxlVGFwTXM6IDMwMCxcbiAgbG9uZ1ByZXNzTXM6IDQ1MCxcbiAgbW92ZW1lbnRUaHJlc2hvbGRQeDogOCxcbiAgLy8gUG9pbnRlciBFdmVudHMgc3BlY2lmaWVzIGJpdCAyIGZvciBhIHBlbiBiYXJyZWwgYnV0dG9uLiBCaXQgMSBpcyB0aGUgdGlwLlxuICBiYXJyZWxCdXR0b25NYXNrOiAyLFxuICBwcmltYXJ5Q29udGFjdE1vZGU6IFwiaG92ZXItb25seVwiLFxuICBzdHlsdXNUZXN0TW9kZTogZmFsc2UsXG4gIGRlYnVnTW9kZTogZmFsc2UsXG4gIGRlYnVnT3ZlcmxheTogZmFsc2UsXG4gIHBlbkJyaWRnZUVuYWJsZWQ6IGZhbHNlLFxuICBwZW5CcmlkZ2VQb3J0OiA0NzYzMSxcbiAgbGF0ZVdpbmRvd01zOiA0MCxcbiAgbWlkU3Ryb2tlUHJlc3M6IFwic3BsaXRcIixcbiAgZXJhc2VyU3RyYXRlZ3k6IFwic3ludGhldGljLWJ1dHRvbjVcIixcbiAgc3VwcHJlc3NIb3ZlckJ1dHRvbkV2ZW50czogdHJ1ZSxcbn07XG5cbmV4cG9ydCBjb25zdCBOVU1FUklDX1NFVFRJTkdfTElNSVRTID0ge1xuICBkb3VibGVUYXBNczogeyBtaW46IDEwMCwgbWF4OiAxMDAwIH0sXG4gIGxvbmdQcmVzc01zOiB7IG1pbjogMTUwLCBtYXg6IDIwMDAgfSxcbiAgbW92ZW1lbnRUaHJlc2hvbGRQeDogeyBtaW46IDEsIG1heDogMTAwIH0sXG4gIGxhdGVXaW5kb3dNczogeyBtaW46IDAsIG1heDogMTAwIH0sXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBOdW1lcmljU2V0dGluZ0tleSA9IGtleW9mIHR5cGVvZiBOVU1FUklDX1NFVFRJTkdfTElNSVRTO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNldHRpbmdzUGxhdGZvcm0ge1xuICBhbmRyb2lkOiBib29sZWFuO1xufVxuXG5jb25zdCBCQVJSRUxfTUFTS1M6IHJlYWRvbmx5IEJhcnJlbEJ1dHRvbk1hc2tbXSA9IFsxLCAyLCA0LCA4LCAxNiwgMzJdO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VOdW1lcmljU2V0dGluZyhrZXk6IE51bWVyaWNTZXR0aW5nS2V5LCB2YWx1ZTogc3RyaW5nKTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IHBhcnNlZCA9IE51bWJlcih2YWx1ZSk7XG4gIGNvbnN0IHsgbWluLCBtYXggfSA9IE5VTUVSSUNfU0VUVElOR19MSU1JVFNba2V5XTtcbiAgcmV0dXJuIE51bWJlci5pc0ludGVnZXIocGFyc2VkKSAmJiBwYXJzZWQgPj0gbWluICYmIHBhcnNlZCA8PSBtYXggPyBwYXJzZWQgOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVCYXJyZWxTb3VyY2UoXG4gIHNldHRpbmdzOiB7IGJhcnJlbEJ1dHRvbk1hc2s6IG51bWJlcjsgcHJpbWFyeUNvbnRhY3RNb2RlOiBzdHJpbmcgfSxcbiAgYnJpZGdlUmVhZHk6IGJvb2xlYW5cbik6IHN0cmluZyB7XG4gIGlmIChicmlkZ2VSZWFkeSkgcmV0dXJuIFwiYnJpZGdlXCI7XG4gIGlmIChzZXR0aW5ncy5iYXJyZWxCdXR0b25NYXNrID09PSAxICYmIHNldHRpbmdzLnByaW1hcnlDb250YWN0TW9kZSA9PT0gXCJob3Zlci1vbmx5XCIpIHtcbiAgICByZXR1cm4gXCJob3Zlci1sYXRjaFwiO1xuICB9XG4gIHJldHVybiBgcG9pbnRlciBtYXNrICR7c2V0dGluZ3MuYmFycmVsQnV0dG9uTWFza31gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU2V0dGluZ3MoXG4gIHZhbHVlOiBQYXJ0aWFsPFN0eWx1c0NvbnRyb2xzU2V0dGluZ3M+LFxuICBwbGF0Zm9ybTogU2V0dGluZ3NQbGF0Zm9ybSA9IHsgYW5kcm9pZDogUGxhdGZvcm0uaXNBbmRyb2lkQXBwIH1cbik6IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3Mge1xuICBjb25zdCBhY3Rpb24gPSAoY2FuZGlkYXRlOiB1bmtub3duLCBmYWxsYmFjazogU3R5bHVzQWN0aW9uKTogU3R5bHVzQWN0aW9uID0+XG4gICAgY2FuZGlkYXRlID09PSBcIm1lbnVcIiB8fCBjYW5kaWRhdGUgPT09IFwiY29weVwiIHx8IGNhbmRpZGF0ZSA9PT0gXCJwYXN0ZVwiIHx8IGNhbmRpZGF0ZSA9PT0gXCJub25lXCJcbiAgICAgID8gY2FuZGlkYXRlXG4gICAgICA6IGZhbGxiYWNrO1xuICBjb25zdCBudW1iZXIgPSAoY2FuZGlkYXRlOiB1bmtub3duLCBmYWxsYmFjazogbnVtYmVyLCBtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXIgPT5cbiAgICB0eXBlb2YgY2FuZGlkYXRlID09PSBcIm51bWJlclwiICYmIE51bWJlci5pc0Zpbml0ZShjYW5kaWRhdGUpXG4gICAgICA/IE1hdGgubWluKG1heCwgTWF0aC5tYXgobWluLCBNYXRoLnJvdW5kKGNhbmRpZGF0ZSkpKVxuICAgICAgOiBmYWxsYmFjaztcbiAgY29uc3QgbWFza1dhc1Vuc2V0ID0gdmFsdWUuYmFycmVsQnV0dG9uTWFzayA9PT0gdW5kZWZpbmVkO1xuICBjb25zdCBleHBsaWNpdE1hc2sgPSBCQVJSRUxfTUFTS1MuZmluZCgobWFzaykgPT4gbWFzayA9PT0gdmFsdWUuYmFycmVsQnV0dG9uTWFzayk7XG4gIHJldHVybiB7XG4gICAgYnV0dG9uVGFwQWN0aW9uOiBhY3Rpb24odmFsdWUuYnV0dG9uVGFwQWN0aW9uLCBERUZBVUxUX1NFVFRJTkdTLmJ1dHRvblRhcEFjdGlvbiksXG4gICAgYnV0dG9uRG91YmxlVGFwQWN0aW9uOiBhY3Rpb24oXG4gICAgICB2YWx1ZS5idXR0b25Eb3VibGVUYXBBY3Rpb24sXG4gICAgICBERUZBVUxUX1NFVFRJTkdTLmJ1dHRvbkRvdWJsZVRhcEFjdGlvblxuICAgICksXG4gICAgYnV0dG9uSG9sZEFjdGlvbjogYWN0aW9uKHZhbHVlLmJ1dHRvbkhvbGRBY3Rpb24sIERFRkFVTFRfU0VUVElOR1MuYnV0dG9uSG9sZEFjdGlvbiksXG4gICAgYnV0dG9uQ29udGFjdEFjdGlvbjogdmFsdWUuYnV0dG9uQ29udGFjdEFjdGlvbiA9PT0gXCJub25lXCIgPyBcIm5vbmVcIiA6IFwiZXJhc2VyXCIsXG4gICAgZG91YmxlVGFwTXM6IG51bWJlcihcbiAgICAgIHZhbHVlLmRvdWJsZVRhcE1zLFxuICAgICAgMzAwLFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5kb3VibGVUYXBNcy5taW4sXG4gICAgICBOVU1FUklDX1NFVFRJTkdfTElNSVRTLmRvdWJsZVRhcE1zLm1heFxuICAgICksXG4gICAgbG9uZ1ByZXNzTXM6IG51bWJlcihcbiAgICAgIHZhbHVlLmxvbmdQcmVzc01zLFxuICAgICAgNDUwLFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5sb25nUHJlc3NNcy5taW4sXG4gICAgICBOVU1FUklDX1NFVFRJTkdfTElNSVRTLmxvbmdQcmVzc01zLm1heFxuICAgICksXG4gICAgbW92ZW1lbnRUaHJlc2hvbGRQeDogbnVtYmVyKFxuICAgICAgdmFsdWUubW92ZW1lbnRUaHJlc2hvbGRQeCxcbiAgICAgIDgsXG4gICAgICBOVU1FUklDX1NFVFRJTkdfTElNSVRTLm1vdmVtZW50VGhyZXNob2xkUHgubWluLFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5tb3ZlbWVudFRocmVzaG9sZFB4Lm1heFxuICAgICksXG4gICAgYmFycmVsQnV0dG9uTWFzazpcbiAgICAgIGV4cGxpY2l0TWFzayA/PyAocGxhdGZvcm0uYW5kcm9pZCAmJiBtYXNrV2FzVW5zZXQgPyAxIDogREVGQVVMVF9TRVRUSU5HUy5iYXJyZWxCdXR0b25NYXNrKSxcbiAgICBwcmltYXJ5Q29udGFjdE1vZGU6IHZhbHVlLnByaW1hcnlDb250YWN0TW9kZSA9PT0gXCJleHBlcmltZW50YWxcIiA/IFwiZXhwZXJpbWVudGFsXCIgOiBcImhvdmVyLW9ubHlcIixcbiAgICBzdHlsdXNUZXN0TW9kZTogdmFsdWUuc3R5bHVzVGVzdE1vZGUgPT09IHRydWUsXG4gICAgZGVidWdNb2RlOiB2YWx1ZS5kZWJ1Z01vZGUgPT09IHRydWUsXG4gICAgZGVidWdPdmVybGF5OiB2YWx1ZS5kZWJ1Z092ZXJsYXkgPT09IHRydWUsXG4gICAgcGVuQnJpZGdlRW5hYmxlZDogdmFsdWUucGVuQnJpZGdlRW5hYmxlZCA9PT0gdHJ1ZSxcbiAgICBwZW5CcmlkZ2VQb3J0OiBudW1iZXIodmFsdWUucGVuQnJpZGdlUG9ydCwgNDc2MzEsIDEwMjQsIDY1NTM1KSxcbiAgICBsYXRlV2luZG93TXM6IG51bWJlcihcbiAgICAgIHZhbHVlLmxhdGVXaW5kb3dNcyxcbiAgICAgIDQwLFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5sYXRlV2luZG93TXMubWluLFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5sYXRlV2luZG93TXMubWF4XG4gICAgKSxcbiAgICBtaWRTdHJva2VQcmVzczogdmFsdWUubWlkU3Ryb2tlUHJlc3MgPT09IFwibmV4dC1jb250YWN0XCIgPyBcIm5leHQtY29udGFjdFwiIDogXCJzcGxpdFwiLFxuICAgIGVyYXNlclN0cmF0ZWd5OlxuICAgICAgdmFsdWUuZXJhc2VyU3RyYXRlZ3kgPT09IFwic2V0LWFjdGl2ZS10b29sXCIgPyBcInNldC1hY3RpdmUtdG9vbFwiIDogXCJzeW50aGV0aWMtYnV0dG9uNVwiLFxuICAgIHN1cHByZXNzSG92ZXJCdXR0b25FdmVudHM6IHZhbHVlLnN1cHByZXNzSG92ZXJCdXR0b25FdmVudHMgIT09IGZhbHNlLFxuICB9O1xufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgSHR0cENoZWNrIHtcbiAgb2s6IGJvb2xlYW47XG4gIHN0YXR1czogbnVtYmVyIHwgbnVsbDtcbiAgYm9keTogc3RyaW5nIHwgbnVsbDtcbiAgZXJyb3I6IHN0cmluZyB8IG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU29ja2V0Q2hlY2sge1xuICBvazogYm9vbGVhbjtcbiAgb3Blbk1zOiBudW1iZXIgfCBudWxsO1xuICBlcnJvcjogc3RyaW5nIHwgbnVsbDtcbiAgY2xvc2VDb2RlOiBudW1iZXIgfCBudWxsO1xuICBjbG9zZVJlYXNvbjogc3RyaW5nIHwgbnVsbDtcbiAgd2FzQ2xlYW46IGJvb2xlYW4gfCBudWxsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEhlbGxvQ2hlY2sge1xuICBwcm90bzogbnVtYmVyO1xuICBhcHA6IHN0cmluZztcbiAgYXBwVmVyc2lvbjogc3RyaW5nO1xuICBjYXBzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTb3VyY2VDaGVjayB7XG4gIHN0YXRlOiBcIm9rXCIgfCBcInVuYXZhaWxhYmxlXCI7XG4gIHJlYXNvbj86IHN0cmluZztcbiAgbm9kZT86IHN0cmluZztcbiAgbmFtZT86IHN0cmluZztcbn1cblxuZXhwb3J0IHR5cGUgSGFuZHNoYWtlQ2hlY2sgPSBcInNraXBwZWRcIiB8IFwicmVhZHlcIiB8IFwid3JvbmctY29kZVwiIHwgXCJwcm90b2NvbFwiIHwgXCJmYWlsZWRcIiB8IFwibm90LXJ1blwiO1xuZXhwb3J0IHR5cGUgU2VydmVyUHJvb2ZDaGVjayA9IFwib2tcIiB8IFwiYmFkXCIgfCBcInNraXBwZWRcIiB8IFwibm90LXJ1blwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJyaWRnZUNoZWNrUmVzdWx0IHtcbiAgaHR0cDogSHR0cENoZWNrO1xuICB3ZWJzb2NrZXQ6IFNvY2tldENoZWNrO1xuICBoZWxsbzogSGVsbG9DaGVjayB8IG51bGw7XG4gIGhhbmRzaGFrZTogSGFuZHNoYWtlQ2hlY2s7XG4gIHNlcnZlclByb29mOiBTZXJ2ZXJQcm9vZkNoZWNrO1xuICBzb3VyY2U6IFNvdXJjZUNoZWNrIHwgbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZlcmRpY3QoY2hlY2tzOiBCcmlkZ2VDaGVja1Jlc3VsdCk6IHN0cmluZyB7XG4gIGlmICghY2hlY2tzLmh0dHAub2spIHJldHVybiBcIkJyaWRnZSBhcHAgbm90IHJ1bm5pbmdcIjtcbiAgaWYgKCFjaGVja3Mud2Vic29ja2V0Lm9rKSB7XG4gICAgcmV0dXJuIFwiT2JzaWRpYW4gYmxvY2tzIHdzOi8vMTI3LjAuMC4xIChIVFRQIG9rLCBXZWJTb2NrZXQgZmFpbGVkKVwiO1xuICB9XG4gIGlmICghY2hlY2tzLmhlbGxvKSByZXR1cm4gXCJCcmlkZ2UgV2ViU29ja2V0IG9wZW5lZCBidXQgbm8gaGVsbG8gZnJhbWUgYXJyaXZlZFwiO1xuICBpZiAoY2hlY2tzLnNlcnZlclByb29mID09PSBcImJhZFwiKSByZXR1cm4gXCJCcmlkZ2UgaWRlbnRpdHkgY2hlY2sgZmFpbGVkIChzZXJ2ZXIgcHJvb2YpXCI7XG4gIGlmIChjaGVja3MuaGFuZHNoYWtlID09PSBcIndyb25nLWNvZGVcIikgcmV0dXJuIFwiV3JvbmcgcGFpcmluZyBjb2RlXCI7XG4gIGlmIChjaGVja3MuaGFuZHNoYWtlID09PSBcInByb3RvY29sXCIpIHJldHVybiBcIkJyaWRnZSBwcm90b2NvbCBlcnJvclwiO1xuICBpZiAoY2hlY2tzLnNvdXJjZT8uc3RhdGUgPT09IFwidW5hdmFpbGFibGVcIikge1xuICAgIHJldHVybiBgQnJpZGdlIHJ1bm5pbmcgYnV0IHBlbiBpbnB1dCB1bmF2YWlsYWJsZTogJHtjaGVja3Muc291cmNlLnJlYXNvbiA/PyBcInVua25vd25cIn1gO1xuICB9XG4gIGlmIChcbiAgICBjaGVja3MuaGFuZHNoYWtlID09PSBcInJlYWR5XCIgJiZcbiAgICBjaGVja3Muc2VydmVyUHJvb2YgPT09IFwib2tcIiAmJlxuICAgIGNoZWNrcy5zb3VyY2U/LnN0YXRlID09PSBcIm9rXCJcbiAgKSB7XG4gICAgcmV0dXJuIFwiQnJpZGdlIHJlYWNoYWJsZSBhbmQgcGFpcmVkOiBtaWQtc3Ryb2tlIGVyYXNlIE9OXCI7XG4gIH1cbiAgaWYgKGNoZWNrcy5oYW5kc2hha2UgPT09IFwic2tpcHBlZFwiKSB7XG4gICAgcmV0dXJuIFwiQnJpZGdlIHJlYWNoYWJsZS4gUGFzdGUgYSBwYWlyaW5nIGNvZGUgdG8gdHVybiBvbiBtaWQtc3Ryb2tlIGVyYXNlLlwiO1xuICB9XG4gIGlmIChjaGVja3MuaGFuZHNoYWtlID09PSBcImZhaWxlZFwiKSByZXR1cm4gXCJCcmlkZ2UgaGFuZHNoYWtlIGZhaWxlZFwiO1xuICByZXR1cm4gXCJCcmlkZ2UgY2hlY2sgaW5jb21wbGV0ZVwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0Q2hlY2tMaW5lcyhjaGVja3M6IEJyaWRnZUNoZWNrUmVzdWx0KTogc3RyaW5nW10ge1xuICBjb25zdCBodHRwID0gY2hlY2tzLmh0dHAub2tcbiAgICA/IGBcdTI3MDUgTmF0aXZlIEhUVFA6ICR7Y2hlY2tzLmh0dHAuc3RhdHVzID8/IFwiXCJ9ICR7Y2hlY2tzLmh0dHAuYm9keSA/PyBcIlwifWAudHJpbSgpXG4gICAgOiBgXHUyNzRDIE5hdGl2ZSBIVFRQOiAke2NoZWNrcy5odHRwLmVycm9yID8/IGBzdGF0dXMgJHtjaGVja3MuaHR0cC5zdGF0dXMgPz8gXCJ1bmtub3duXCJ9YH1gO1xuICBjb25zdCBzb2NrZXQgPSBjaGVja3Mud2Vic29ja2V0Lm9rXG4gICAgPyBgXHUyNzA1IFdlYlNvY2tldCBvcGVuOiAke2NoZWNrcy53ZWJzb2NrZXQub3Blbk1zID8/IFwiP1wifSBtc2BcbiAgICA6IGBcdTI3NEMgV2ViU29ja2V0IG9wZW46ICR7Y2hlY2tzLndlYnNvY2tldC5lcnJvciA/PyBcImZhaWxlZFwifSR7XG4gICAgICAgIGNoZWNrcy53ZWJzb2NrZXQuY2xvc2VDb2RlID09PSBudWxsID8gXCJcIiA6IGAgY2xvc2UgJHtjaGVja3Mud2Vic29ja2V0LmNsb3NlQ29kZX1gXG4gICAgICB9JHtjaGVja3Mud2Vic29ja2V0LmNsb3NlUmVhc29uID8gYCAke2NoZWNrcy53ZWJzb2NrZXQuY2xvc2VSZWFzb259YCA6IFwiXCJ9YDtcbiAgY29uc3QgaGVsbG8gPSBjaGVja3MuaGVsbG9cbiAgICA/IGBcdTI3MDUgaGVsbG86IHByb3RvICR7Y2hlY2tzLmhlbGxvLnByb3RvfSAke2NoZWNrcy5oZWxsby5hcHB9ICR7Y2hlY2tzLmhlbGxvLmFwcFZlcnNpb259IGNhcHMgJHtjaGVja3MuaGVsbG8uY2Fwcy5qb2luKFwiLFwiKX1gXG4gICAgOiBcIlx1Mjc0QyBoZWxsbzogbm90IHJlY2VpdmVkXCI7XG4gIGNvbnN0IGhhbmRzaGFrZSA9XG4gICAgY2hlY2tzLmhhbmRzaGFrZSA9PT0gXCJyZWFkeVwiXG4gICAgICA/IFwiXHUyNzA1IEhhbmRzaGFrZTogcmVhZHlcIlxuICAgICAgOiBjaGVja3MuaGFuZHNoYWtlID09PSBcInNraXBwZWRcIlxuICAgICAgICA/IFwiSGFuZHNoYWtlOiBza2lwcGVkIChubyBwYWlyaW5nIGNvZGUpXCJcbiAgICAgICAgOiBjaGVja3MuaGFuZHNoYWtlID09PSBcIm5vdC1ydW5cIlxuICAgICAgICAgID8gXCJIYW5kc2hha2U6IG5vdCBydW5cIlxuICAgICAgICAgIDogYFx1Mjc0QyBIYW5kc2hha2U6ICR7Y2hlY2tzLmhhbmRzaGFrZX1gO1xuICBjb25zdCBwcm9vZiA9XG4gICAgY2hlY2tzLnNlcnZlclByb29mID09PSBcIm9rXCJcbiAgICAgID8gXCJcdTI3MDUgU2VydmVyIHByb29mXCJcbiAgICAgIDogY2hlY2tzLnNlcnZlclByb29mID09PSBcImJhZFwiXG4gICAgICAgID8gXCJcdTI3NEMgU2VydmVyIHByb29mXCJcbiAgICAgICAgOiBgU2VydmVyIHByb29mOiAke2NoZWNrcy5zZXJ2ZXJQcm9vZn1gO1xuICBjb25zdCBzb3VyY2UgPSAhY2hlY2tzLnNvdXJjZVxuICAgID8gXCJTb3VyY2U6IG5vdCByZWNlaXZlZFwiXG4gICAgOiBjaGVja3Muc291cmNlLnN0YXRlID09PSBcIm9rXCJcbiAgICAgID8gYFx1MjcwNSBTb3VyY2U6IG9rICR7Y2hlY2tzLnNvdXJjZS5uYW1lID8/IFwiXCJ9ICR7Y2hlY2tzLnNvdXJjZS5ub2RlID8/IFwiXCJ9YC50cmltKClcbiAgICAgIDogYFx1Mjc0QyBTb3VyY2U6IHVuYXZhaWxhYmxlICR7Y2hlY2tzLnNvdXJjZS5yZWFzb24gPz8gXCJcIn1gLnRyaW0oKTtcbiAgcmV0dXJuIFtodHRwLCBzb2NrZXQsIGhlbGxvLCBoYW5kc2hha2UsIHByb29mLCBzb3VyY2UsIHZlcmRpY3QoY2hlY2tzKV07XG59XG4iLCAiZXhwb3J0IGludGVyZmFjZSBQcm9iZUV2ZW50IHtcbiAgdDogbnVtYmVyO1xuICB0eXBlOiBzdHJpbmc7XG4gIHBvaW50ZXJUeXBlOiBzdHJpbmc7XG4gIGJ1dHRvbjogbnVtYmVyO1xuICBidXR0b25zOiBudW1iZXI7XG4gIHByZXNzdXJlOiBudW1iZXI7XG4gIHBoYXNlOiBcImNvbnRhY3RcIiB8IFwiaG92ZXJcIjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcm9iZVN1bW1hcnkge1xuICBwZW5TZWVuOiBib29sZWFuO1xuICBob3ZlckJ1dHRvbnM6IG51bWJlcltdO1xuICBjb250YWN0QnV0dG9uczogbnVtYmVyW107XG4gIGRvd25CdXR0b25zOiBudW1iZXJbXTtcbiAgZXJhc2VyU2VlbjogYm9vbGVhbjtcbiAgY29udGV4dE1lbnVGcm9tUGVuOiBib29sZWFuO1xufVxuXG5mdW5jdGlvbiB1bmlxdWUodmFsdWVzOiBudW1iZXJbXSk6IG51bWJlcltdIHtcbiAgcmV0dXJuIFsuLi5uZXcgU2V0KHZhbHVlcyldLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0IC0gcmlnaHQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3VtbWFyaXplUHJvYmUoZXZlbnRzOiByZWFkb25seSBQcm9iZUV2ZW50W10pOiBQcm9iZVN1bW1hcnkge1xuICBjb25zdCBwZW4gPSBldmVudHMuZmlsdGVyKChldmVudCkgPT4gZXZlbnQucG9pbnRlclR5cGUgPT09IFwicGVuXCIpO1xuICByZXR1cm4ge1xuICAgIHBlblNlZW46IHBlbi5sZW5ndGggPiAwLFxuICAgIGhvdmVyQnV0dG9uczogdW5pcXVlKFxuICAgICAgcGVuLmZpbHRlcigoZXZlbnQpID0+IGV2ZW50LnBoYXNlID09PSBcImhvdmVyXCIpLm1hcCgoZXZlbnQpID0+IGV2ZW50LmJ1dHRvbnMpXG4gICAgKSxcbiAgICBjb250YWN0QnV0dG9uczogdW5pcXVlKFxuICAgICAgcGVuLmZpbHRlcigoZXZlbnQpID0+IGV2ZW50LnBoYXNlID09PSBcImNvbnRhY3RcIikubWFwKChldmVudCkgPT4gZXZlbnQuYnV0dG9ucylcbiAgICApLFxuICAgIGRvd25CdXR0b25zOiB1bmlxdWUoXG4gICAgICBwZW4uZmlsdGVyKChldmVudCkgPT4gZXZlbnQudHlwZSA9PT0gXCJwb2ludGVyZG93blwiKS5tYXAoKGV2ZW50KSA9PiBldmVudC5idXR0b24pXG4gICAgKSxcbiAgICBlcmFzZXJTZWVuOiBwZW4uc29tZSgoZXZlbnQpID0+IGV2ZW50LmJ1dHRvbiA9PT0gNSB8fCAoZXZlbnQuYnV0dG9ucyAmIDMyKSAhPT0gMCksXG4gICAgY29udGV4dE1lbnVGcm9tUGVuOiBwZW4uc29tZSgoZXZlbnQpID0+IGV2ZW50LnR5cGUgPT09IFwiY29udGV4dG1lbnVcIiksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGJyYWNlKHZhbHVlczogbnVtYmVyW10pOiBzdHJpbmcge1xuICByZXR1cm4gYHske3ZhbHVlcy5qb2luKFwiLCBcIil9fWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRQcm9iZVN1bW1hcnkoc3VtbWFyeTogUHJvYmVTdW1tYXJ5KTogc3RyaW5nIHtcbiAgcmV0dXJuIFtcbiAgICBgUGVuIHNlZW46ICR7c3VtbWFyeS5wZW5TZWVuID8gXCJ5ZXNcIiA6IFwibm9cIn1gLFxuICAgIGBidXR0b25zIHZhbHVlcyB3aGlsZSBob3ZlcmluZzogJHticmFjZShzdW1tYXJ5LmhvdmVyQnV0dG9ucyl9YCxcbiAgICBgYnV0dG9ucyB2YWx1ZXMgd2hpbGUgdG91Y2hpbmc6ICR7YnJhY2Uoc3VtbWFyeS5jb250YWN0QnV0dG9ucyl9YCxcbiAgICBgYnV0dG9uIHZhbHVlcyBvbiBkb3duOiAke2JyYWNlKHN1bW1hcnkuZG93bkJ1dHRvbnMpfWAsXG4gICAgYGVyYXNlciBlbmQgKGJ1dHRvbiA1IC8gYnV0dG9ucyAzMikgc2VlbjogJHtzdW1tYXJ5LmVyYXNlclNlZW4gPyBcInllc1wiIDogXCJub1wifWAsXG4gICAgYGNvbnRleHQgbWVudSBmcm9tIHBlbjogJHtzdW1tYXJ5LmNvbnRleHRNZW51RnJvbVBlbiA/IFwieWVzXCIgOiBcIm5vXCJ9YCxcbiAgXS5qb2luKFwiXFxuXCIpO1xufVxuIiwgImltcG9ydCB0eXBlIHsgQnJpZGdlQ2hlY2tSZXN1bHQgfSBmcm9tIFwiLi92ZXJkaWN0XCI7XG5pbXBvcnQgeyB2ZXJkaWN0IH0gZnJvbSBcIi4vdmVyZGljdFwiO1xuaW1wb3J0IHR5cGUgeyBQcm9iZUV2ZW50LCBQcm9iZVN1bW1hcnkgfSBmcm9tIFwiLi9wcm9iZVN1bW1hcnlcIjtcbmltcG9ydCB7IHN1bW1hcml6ZVByb2JlIH0gZnJvbSBcIi4vcHJvYmVTdW1tYXJ5XCI7XG5pbXBvcnQgdHlwZSB7IFBlbkJyaWRnZVNuYXBzaG90IH0gZnJvbSBcIi4uL3BlbmJyaWRnZS9QZW5CcmlkZ2VDbGllbnRcIjtcblxuZXhwb3J0IGludGVyZmFjZSBSZXBvcnRTZXR0aW5ncyB7XG4gIGJhcnJlbEJ1dHRvbk1hc2s6IG51bWJlcjtcbiAgcHJpbWFyeUNvbnRhY3RNb2RlOiBzdHJpbmc7XG4gIGVyYXNlclN0cmF0ZWd5OiBzdHJpbmc7XG4gIGVmZmVjdGl2ZUVyYXNlclN0cmF0ZWd5OiBzdHJpbmc7XG4gIGxhdGVXaW5kb3dNczogbnVtYmVyO1xuICBtaWRTdHJva2VQcmVzczogc3RyaW5nO1xuICBwZW5CcmlkZ2VFbmFibGVkOiBib29sZWFuO1xuICBwZW5CcmlkZ2VQb3J0OiBudW1iZXI7XG4gIHN1cHByZXNzSG92ZXJCdXR0b25FdmVudHM6IGJvb2xlYW47XG4gIGJ1dHRvbkNvbnRhY3RBY3Rpb246IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXBvcnRFbnZpcm9ubWVudCB7XG4gIG9ic2lkaWFuVmVyc2lvbjogc3RyaW5nO1xuICBhbmRyb2lkOiBib29sZWFuO1xuICB0YWJsZXQ6IGJvb2xlYW47XG4gIHBsdWdpblZlcnNpb246IHN0cmluZztcbiAgY2hyb21lOiBzdHJpbmcgfCBudWxsO1xuICBzY3JlZW46IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfTtcbiAgc2V0dGluZ3M6IFJlcG9ydFNldHRpbmdzO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlcG9ydEV4Y2FsaWRyYXcge1xuICBpbnN0YWxsZWQ6IGJvb2xlYW47XG4gIGVuYWJsZWQ6IGJvb2xlYW47XG4gIHZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIGF1dG9tYXRlOiBib29sZWFuO1xuICBjYW5SZWFkQWN0aXZlVG9vbDogYm9vbGVhbjtcbiAgY2FuU2V0QWN0aXZlVG9vbDogYm9vbGVhbjtcbiAgZGVsZXRlVmlld0VsZW1lbnRzOiBib29sZWFuO1xuICBuZXdFbGVtZW50OiBib29sZWFuIHwgbnVsbDtcbiAgdGVtcG9yYXJ5RXJhc2VyOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGlhZ25vc3RpY3NSZXBvcnQge1xuICByZXBvcnQ6IFwiZXhjYWxpZHJhdy1zdHlsdXMtY29udHJvbHMtZGlhZ1wiO1xuICBzY2hlbWE6IDE7XG4gIHZlcmRpY3Q6IHN0cmluZztcbiAgZW52aXJvbm1lbnQ6IFJlcG9ydEVudmlyb25tZW50O1xuICBicmlkZ2VDaGVjazogQnJpZGdlQ2hlY2tSZXN1bHQgfCBudWxsO1xuICBsaXZlOiBQZW5CcmlkZ2VTbmFwc2hvdCB8IG51bGw7XG4gIGJhcnJlbFNvdXJjZTogc3RyaW5nO1xuICBwcm9iZTogeyBzdW1tYXJ5OiBQcm9iZVN1bW1hcnk7IGV2ZW50czogUHJvYmVFdmVudFtdIH07XG4gIGV4Y2FsaWRyYXc6IFJlcG9ydEV4Y2FsaWRyYXc7XG4gIGxvZzogc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVwb3J0SW5wdXQge1xuICBlbnZpcm9ubWVudDogUmVwb3J0RW52aXJvbm1lbnQ7XG4gIGJyaWRnZUNoZWNrOiBCcmlkZ2VDaGVja1Jlc3VsdCB8IG51bGw7XG4gIGxpdmU6IFBlbkJyaWRnZVNuYXBzaG90IHwgbnVsbDtcbiAgYmFycmVsU291cmNlOiBzdHJpbmc7XG4gIHByb2JlRXZlbnRzOiBBcnJheTxQcm9iZUV2ZW50ICYgeyB4PzogbnVtYmVyOyB5PzogbnVtYmVyIH0+O1xuICBleGNhbGlkcmF3OiBSZXBvcnRFeGNhbGlkcmF3O1xuICBsb2c6IHN0cmluZ1tdO1xuICBwYWlyaW5nQ29kZT86IHN0cmluZztcbiAgdmF1bHROYW1lPzogc3RyaW5nO1xuICBub3RlUGF0aD86IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRGlhZ25vc3RpY0J1aWxkKHZlcnNpb246IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gdmVyc2lvbi5pbmNsdWRlcyhcIi1kaWFnXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2hyb21lVmVyc2lvbih1c2VyQWdlbnQ6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICByZXR1cm4gdXNlckFnZW50Lm1hdGNoKC9DaHJvbWVcXC8oW1xcZC5dKykvdSk/LlsxXSA/PyBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRSZXBvcnQoaW5wdXQ6IFJlcG9ydElucHV0KTogRGlhZ25vc3RpY3NSZXBvcnQge1xuICBjb25zdCBldmVudHMgPSBpbnB1dC5wcm9iZUV2ZW50cy5zbGljZSgtNTApLm1hcCgoZXZlbnQpID0+ICh7XG4gICAgdDogZXZlbnQudCxcbiAgICB0eXBlOiBldmVudC50eXBlLFxuICAgIHBvaW50ZXJUeXBlOiBldmVudC5wb2ludGVyVHlwZSxcbiAgICBidXR0b246IGV2ZW50LmJ1dHRvbixcbiAgICBidXR0b25zOiBldmVudC5idXR0b25zLFxuICAgIHByZXNzdXJlOiBldmVudC5wcmVzc3VyZSxcbiAgICBwaGFzZTogZXZlbnQucGhhc2UsXG4gIH0pKTtcbiAgY29uc3QgYnJpZGdlQ2hlY2sgPSBpbnB1dC5icmlkZ2VDaGVjaztcbiAgcmV0dXJuIHtcbiAgICByZXBvcnQ6IFwiZXhjYWxpZHJhdy1zdHlsdXMtY29udHJvbHMtZGlhZ1wiLFxuICAgIHNjaGVtYTogMSxcbiAgICB2ZXJkaWN0OiBicmlkZ2VDaGVjayA/IHZlcmRpY3QoYnJpZGdlQ2hlY2spIDogXCJCcmlkZ2UgaGFzIG5vdCBiZWVuIGNoZWNrZWQgaW4gdGhpcyBzZXNzaW9uXCIsXG4gICAgZW52aXJvbm1lbnQ6IGlucHV0LmVudmlyb25tZW50LFxuICAgIGJyaWRnZUNoZWNrLFxuICAgIGxpdmU6IGlucHV0LmxpdmUsXG4gICAgYmFycmVsU291cmNlOiBpbnB1dC5iYXJyZWxTb3VyY2UsXG4gICAgcHJvYmU6IHsgc3VtbWFyeTogc3VtbWFyaXplUHJvYmUoZXZlbnRzKSwgZXZlbnRzIH0sXG4gICAgZXhjYWxpZHJhdzogaW5wdXQuZXhjYWxpZHJhdyxcbiAgICBsb2c6IGlucHV0LmxvZy5zbGljZSgtMTAwKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvSlNPTihyZXBvcnQ6IERpYWdub3N0aWNzUmVwb3J0KTogc3RyaW5nIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHJlcG9ydCwgbnVsbCwgMik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1RleHQocmVwb3J0OiBEaWFnbm9zdGljc1JlcG9ydCk6IHN0cmluZyB7XG4gIGNvbnN0IHNldHRpbmdzID0gcmVwb3J0LmVudmlyb25tZW50LnNldHRpbmdzO1xuICBjb25zdCBsaW5lcyA9IFtcbiAgICBgRXhjYWxpZHJhdyBTdHlsdXMgQ29udHJvbHMgJHtyZXBvcnQuZW52aXJvbm1lbnQucGx1Z2luVmVyc2lvbn1gLFxuICAgIGBPYnNpZGlhbiAke3JlcG9ydC5lbnZpcm9ubWVudC5vYnNpZGlhblZlcnNpb259IFx1MDBCNyBBbmRyb2lkICR7cmVwb3J0LmVudmlyb25tZW50LmFuZHJvaWQgPyBcInllc1wiIDogXCJub1wifSBcdTAwQjcgdGFibGV0ICR7cmVwb3J0LmVudmlyb25tZW50LnRhYmxldCA/IFwieWVzXCIgOiBcIm5vXCJ9YCxcbiAgICBgQ2hyb21lICR7cmVwb3J0LmVudmlyb25tZW50LmNocm9tZSA/PyBcInVua25vd25cIn0gXHUwMEI3IHNjcmVlbiAke3JlcG9ydC5lbnZpcm9ubWVudC5zY3JlZW4ud2lkdGh9XHUwMEQ3JHtyZXBvcnQuZW52aXJvbm1lbnQuc2NyZWVuLmhlaWdodH1gLFxuICAgIGBFeGNhbGlkcmF3ICR7cmVwb3J0LmV4Y2FsaWRyYXcudmVyc2lvbiA/PyBcIm5vdCBpbnN0YWxsZWRcIn0gXHUwMEI3IHRlbXAgZXJhc2VyOiAke3JlcG9ydC5leGNhbGlkcmF3LnRlbXBvcmFyeUVyYXNlcn1gLFxuICAgIGBCYXJyZWwgc291cmNlOiAke3JlcG9ydC5iYXJyZWxTb3VyY2V9YCxcbiAgICBgQnJpZGdlIGVuYWJsZWQ6ICR7c2V0dGluZ3MucGVuQnJpZGdlRW5hYmxlZCA/IFwieWVzXCIgOiBcIm5vXCJ9IFx1MDBCNyBwb3J0ICR7c2V0dGluZ3MucGVuQnJpZGdlUG9ydH0gXHUwMEI3IG1hc2sgJHtzZXR0aW5ncy5iYXJyZWxCdXR0b25NYXNrfSBcdTAwQjcgJHtzZXR0aW5ncy5wcmltYXJ5Q29udGFjdE1vZGV9YCxcbiAgICBgU3RyYXRlZ3kgJHtyZXBvcnQuZW52aXJvbm1lbnQuc2V0dGluZ3MuZWZmZWN0aXZlRXJhc2VyU3RyYXRlZ3l9IFx1MDBCNyBsYXRlIHdpbmRvdyAke3NldHRpbmdzLmxhdGVXaW5kb3dNc30gbXMgXHUwMEI3IG1pZC1zdHJva2UgJHtzZXR0aW5ncy5taWRTdHJva2VQcmVzc31gLFxuICAgIHJlcG9ydC52ZXJkaWN0LFxuICAgIFwiXCIsXG4gICAgXCJgYGBqc29uXCIsXG4gICAgdG9KU09OKHJlcG9ydCksXG4gICAgXCJgYGBcIixcbiAgXTtcbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRCcmlkZ2VTdGF0dXMoc25hcHNob3Q6IFBlbkJyaWRnZVNuYXBzaG90KTogc3RyaW5nIHtcbiAgY29uc3Qgc3RhdHVzID0gc25hcHNob3Quc3RhdHVzO1xuICBpZiAoc3RhdHVzLnN0YXRlID09PSBcIm9mZlwiKSByZXR1cm4gXCJvZmZcIjtcbiAgaWYgKHN0YXR1cy5zdGF0ZSA9PT0gXCJjb25uZWN0aW5nXCIpIHtcbiAgICBjb25zdCByZXRyeSA9IHNuYXBzaG90Lm5leHRSZXRyeUluTXMgPT09IG51bGwgPyBcIlwiIDogYCBcdTAwQjcgcmV0cnkgaW4gJHtzbmFwc2hvdC5uZXh0UmV0cnlJbk1zfSBtc2A7XG4gICAgcmV0dXJuIGBjb25uZWN0aW5nJHtyZXRyeX1gO1xuICB9XG4gIGlmIChzdGF0dXMuc3RhdGUgPT09IFwiYXV0aGVudGljYXRpbmdcIikgcmV0dXJuIFwiYXV0aGVudGljYXRpbmdcIjtcbiAgaWYgKHN0YXR1cy5zdGF0ZSA9PT0gXCJmYWlsZWRcIikgcmV0dXJuIGBmYWlsZWQ6ICR7c3RhdHVzLnJlYXNvbiB8fCBzdGF0dXMuY29kZX1gO1xuICBjb25zdCBwZW4gPVxuICAgIHN0YXR1cy5zb3VyY2UgPT09IFwib2tcIlxuICAgICAgPyBgcGVuIG9rJHtzdGF0dXMubmFtZSA/IGAgKCR7c3RhdHVzLm5hbWV9KWAgOiBcIlwifWBcbiAgICAgIDogYHBlbiB1bmF2YWlsYWJsZTogJHtzdGF0dXMucmVhc29uID8/IFwidW5rbm93blwifWA7XG4gIGNvbnN0IGxhdGVuY3kgPVxuICAgIHNuYXBzaG90Lmxhc3RCdXR0b24gPT09IG51bGxcbiAgICAgID8gXCJubyBidXR0b24geWV0XCJcbiAgICAgIDogc25hcHNob3QubGFzdEJ1dHRvbi5sYXRlbmN5TXMgPT09IG51bGxcbiAgICAgICAgPyBcInJlY2VpdmUtdGltZSBvbmx5XCJcbiAgICAgICAgOiBgbGF0ZW5jeSAke01hdGgucm91bmQoc25hcHNob3QubGFzdEJ1dHRvbi5sYXRlbmN5TXMpfSBtc2A7XG4gIGNvbnN0IGhlYXJ0YmVhdCA9XG4gICAgc25hcHNob3QuaGVhcnRiZWF0QWdlTXMgPT09IG51bGxcbiAgICAgID8gXCJubyBoZWFydGJlYXQgeWV0XCJcbiAgICAgIDogYGhlYXJ0YmVhdCAke3NuYXBzaG90LmhlYXJ0YmVhdEFnZU1zfSBtc2A7XG4gIGNvbnN0IGZpbmdlcnByaW50ID0gc25hcHNob3QuZmluZ2VycHJpbnQgPyBgIFx1MDBCNyAke3NuYXBzaG90LmZpbmdlcnByaW50fWAgOiBcIlwiO1xuICByZXR1cm4gYHJlYWR5IFx1MDBCNyAke3Blbn0gXHUwMEI3ICR7bGF0ZW5jeX0gXHUwMEI3ICR7aGVhcnRiZWF0fSR7ZmluZ2VycHJpbnR9YDtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IEV4Y2FsaWRyYXdCcmlkZ2UgfSBmcm9tIFwiLi4vZXhjYWxpZHJhdy9FeGNhbGlkcmF3QnJpZGdlXCI7XG5pbXBvcnQgdHlwZSB7IFBvaW50IH0gZnJvbSBcIi4uL3N0eWx1cy90eXBlc1wiO1xuXG5jb25zdCBNRU5VX01BUkdJTl9QWCA9IDg7XG5jb25zdCBGQUxMQkFDS19NRU5VX1NJWkUgPSB7IHdpZHRoOiAxNzIsIGhlaWdodDogMzAwIH07XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGFtcE1lbnVQb3NpdGlvbihcbiAgcG9pbnQ6IFBvaW50LFxuICB2aWV3cG9ydDogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9LFxuICBtZW51OiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH1cbik6IFBvaW50IHtcbiAgcmV0dXJuIHtcbiAgICB4OiBNYXRoLm1heChNRU5VX01BUkdJTl9QWCwgTWF0aC5taW4ocG9pbnQueCwgdmlld3BvcnQud2lkdGggLSBtZW51LndpZHRoIC0gTUVOVV9NQVJHSU5fUFgpKSxcbiAgICB5OiBNYXRoLm1heChNRU5VX01BUkdJTl9QWCwgTWF0aC5taW4ocG9pbnQueSwgdmlld3BvcnQuaGVpZ2h0IC0gbWVudS5oZWlnaHQgLSBNRU5VX01BUkdJTl9QWCkpLFxuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgU3R5bHVzTWVudSB7XG4gIHByaXZhdGUgZWxlbWVudDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBvdXRzaWRlTGlzdGVuZXI6ICgoZXZlbnQ6IFBvaW50ZXJFdmVudCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBvcGVuR2VuZXJhdGlvbiA9IDA7XG5cbiAgb3Blbihwb2ludDogUG9pbnQsIGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZSk6IHZvaWQge1xuICAgIHRoaXMuY2xvc2UoKTtcbiAgICBjb25zdCBnZW5lcmF0aW9uID0gdGhpcy5vcGVuR2VuZXJhdGlvbjtcbiAgICBjb25zdCBtZW51ID0gZG9jdW1lbnQuYm9keS5jcmVhdGVEaXYoeyBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtbWVudVwiIH0pO1xuICAgIGNvbnN0IGFjdGlvbnM6IEFycmF5PFtzdHJpbmcsICgpID0+IHZvaWRdPiA9IFtcbiAgICAgIFtcIlNlbGVjdGlvblwiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcInNlbGVjdGlvblwiKV0sXG4gICAgICBbXCJGcmVlIGRyYXdcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJmcmVlZHJhd1wiKV0sXG4gICAgICBbXCJFcmFzZXJcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJlcmFzZXJcIildLFxuICAgICAgW1wiUmVjdGFuZ2xlXCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwicmVjdGFuZ2xlXCIpXSxcbiAgICAgIFtcIkFycm93XCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiYXJyb3dcIildLFxuICAgICAgW1wiQ29weVwiLCAoKSA9PiBicmlkZ2UuY29weVNlbGVjdGVkRWxlbWVudHMoKV0sXG4gICAgICBbXCJQYXN0ZVwiLCAoKSA9PiBicmlkZ2UucGFzdGVBdChwb2ludCldLFxuICAgIF07XG4gICAgZm9yIChjb25zdCBbbmFtZSwgY2FsbGJhY2tdIG9mIGFjdGlvbnMpIHtcbiAgICAgIGNvbnN0IGJ1dHRvbiA9IG1lbnUuY3JlYXRlRWwoXCJidXR0b25cIiwge1xuICAgICAgICB0ZXh0OiBuYW1lLFxuICAgICAgICBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtbWVudV9faXRlbVwiLFxuICAgICAgfSk7XG4gICAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJ1cFwiLCAoZXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLmVsZW1lbnQgPSBtZW51O1xuICAgIGNvbnN0IHBvc2l0aW9uID0gY2xhbXBNZW51UG9zaXRpb24oXG4gICAgICBwb2ludCxcbiAgICAgIHsgd2lkdGg6IHdpbmRvdy5pbm5lcldpZHRoLCBoZWlnaHQ6IHdpbmRvdy5pbm5lckhlaWdodCB9LFxuICAgICAge1xuICAgICAgICB3aWR0aDogbWVudS5vZmZzZXRXaWR0aCB8fCBGQUxMQkFDS19NRU5VX1NJWkUud2lkdGgsXG4gICAgICAgIGhlaWdodDogbWVudS5vZmZzZXRIZWlnaHQgfHwgRkFMTEJBQ0tfTUVOVV9TSVpFLmhlaWdodCxcbiAgICAgIH1cbiAgICApO1xuICAgIG1lbnUuc2V0Q3NzUHJvcHMoeyBsZWZ0OiBgJHtwb3NpdGlvbi54fXB4YCwgdG9wOiBgJHtwb3NpdGlvbi55fXB4YCB9KTtcbiAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAoZ2VuZXJhdGlvbiAhPT0gdGhpcy5vcGVuR2VuZXJhdGlvbiB8fCAhdGhpcy5lbGVtZW50KSByZXR1cm47XG4gICAgICB0aGlzLm91dHNpZGVMaXN0ZW5lciA9IChldmVudCkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMuZWxlbWVudD8uY29udGFpbnMoZXZlbnQudGFyZ2V0IGFzIE5vZGUpKSB0aGlzLmNsb3NlKCk7XG4gICAgICB9O1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIHRoaXMub3V0c2lkZUxpc3RlbmVyLCB0cnVlKTtcbiAgICB9LCAwKTtcbiAgfVxuICBjbG9zZSA9ICgpOiB2b2lkID0+IHtcbiAgICB0aGlzLm9wZW5HZW5lcmF0aW9uICs9IDE7XG4gICAgaWYgKHRoaXMub3V0c2lkZUxpc3RlbmVyKVxuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIHRoaXMub3V0c2lkZUxpc3RlbmVyLCB0cnVlKTtcbiAgICB0aGlzLm91dHNpZGVMaXN0ZW5lciA9IG51bGw7XG4gICAgdGhpcy5lbGVtZW50Py5yZW1vdmUoKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xuICB9O1xufVxuIiwgImltcG9ydCB0eXBlIHsgU2NoZWR1bGVyIH0gZnJvbSBcIi4uL3N0eWx1cy90eXBlc1wiO1xuaW1wb3J0IHtcbiAgQ0xPU0UsXG4gIGZpbmdlcnByaW50LFxuICBuZXdOb25jZSxcbiAgcGFyc2VTZXJ2ZXJGcmFtZSxcbiAgcHJvb2YsXG4gIHNhZmVFcXVhbCxcbiAgdHlwZSBCdXR0b25GcmFtZSxcbiAgdHlwZSBIZWxsb0ZyYW1lLFxuICB0eXBlIFJlYWR5RnJhbWUsXG4gIHR5cGUgU291cmNlRnJhbWUsXG59IGZyb20gXCIuL3Byb3RvY29sXCI7XG5cbmV4cG9ydCB0eXBlIFBlbkJyaWRnZVN0YXR1cyA9XG4gIHwgeyBzdGF0ZTogXCJvZmZcIiB9XG4gIHwgeyBzdGF0ZTogXCJjb25uZWN0aW5nXCIgfVxuICB8IHsgc3RhdGU6IFwiYXV0aGVudGljYXRpbmdcIiB9XG4gIHwge1xuICAgICAgc3RhdGU6IFwicmVhZHlcIjtcbiAgICAgIHNvdXJjZTogU291cmNlRnJhbWVbXCJzdGF0ZVwiXTtcbiAgICAgIHJlYXNvbj86IHN0cmluZztcbiAgICAgIG5hbWU/OiBzdHJpbmc7XG4gICAgICBub2RlPzogc3RyaW5nO1xuICAgICAgZmluZ2VycHJpbnQ6IHN0cmluZztcbiAgICB9XG4gIHwgeyBzdGF0ZTogXCJmYWlsZWRcIjsgY29kZTogbnVtYmVyOyByZWFzb246IHN0cmluZyB9O1xuXG5leHBvcnQgaW50ZXJmYWNlIFBlbkJ1dHRvblNpZ25hbCB7XG4gIGRvd246IGJvb2xlYW47XG4gIHNlcTogbnVtYmVyO1xuICBwcmVzc2VkQXRQZXJmOiBudW1iZXI7XG4gIGxhdGVuY3lNczogbnVtYmVyIHwgbnVsbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VTb2NrZXQge1xuICByZWFkeVN0YXRlOiBudW1iZXI7XG4gIG9ub3BlbjogKChldmVudDogRXZlbnQpID0+IHZvaWQpIHwgbnVsbDtcbiAgb25tZXNzYWdlOiAoKGV2ZW50OiB7IGRhdGE6IHVua25vd24gfSkgPT4gdm9pZCkgfCBudWxsO1xuICBvbmVycm9yOiAoKGV2ZW50OiBFdmVudCkgPT4gdm9pZCkgfCBudWxsO1xuICBvbmNsb3NlOiAoKGV2ZW50OiBDbG9zZUV2ZW50KSA9PiB2b2lkKSB8IG51bGw7XG4gIHNlbmQoZGF0YTogc3RyaW5nKTogdm9pZDtcbiAgY2xvc2UoY29kZT86IG51bWJlciwgcmVhc29uPzogc3RyaW5nKTogdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWaXNpYmlsaXR5U291cmNlIHtcbiAgc3RhdGUoKTogXCJ2aXNpYmxlXCIgfCBcImhpZGRlblwiO1xuICBzdWJzY3JpYmUobGlzdGVuZXI6ICgpID0+IHZvaWQpOiAoKSA9PiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBlbkJyaWRnZVNuYXBzaG90IHtcbiAgc3RhdHVzOiBQZW5CcmlkZ2VTdGF0dXM7XG4gIGhlYXJ0YmVhdEFnZU1zOiBudW1iZXIgfCBudWxsO1xuICByZWNvbm5lY3RBdHRlbXB0czogbnVtYmVyO1xuICBuZXh0UmV0cnlJbk1zOiBudW1iZXIgfCBudWxsO1xuICBsYXN0Q2xvc2VDb2RlOiBudW1iZXIgfCBudWxsO1xuICBsYXN0Q2xvc2VSZWFzb246IHN0cmluZztcbiAgbGFzdEJ1dHRvbjoge1xuICAgIGRvd246IGJvb2xlYW47XG4gICAgc2VxOiBudW1iZXI7XG4gICAgbGF0ZW5jeU1zOiBudW1iZXIgfCBudWxsO1xuICAgIGNsb2NrOiBcImJyaWRnZVwiIHwgXCJyZWNlaXZlXCI7XG4gIH0gfCBudWxsO1xuICBhcHBWZXJzaW9uOiBzdHJpbmcgfCBudWxsO1xuICBwcm90bzogbnVtYmVyIHwgbnVsbDtcbiAgZmluZ2VycHJpbnQ6IHN0cmluZyB8IG51bGw7XG4gIHVybDogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBlbkJyaWRnZUNsaWVudE9wdGlvbnMge1xuICB1cmw6IHN0cmluZztcbiAgc2VjcmV0OiAoKSA9PiBVaW50OEFycmF5IHwgbnVsbDtcbiAgY2xpZW50VmVyc2lvbjogc3RyaW5nO1xuICB3c0ZhY3Rvcnk/OiAodXJsOiBzdHJpbmcpID0+IEJyaWRnZVNvY2tldDtcbiAgbm93PzogKCkgPT4gbnVtYmVyO1xuICBwZXJmTm93PzogKCkgPT4gbnVtYmVyO1xuICBzY2hlZHVsZXI/OiBTY2hlZHVsZXI7XG4gIHJhbmRvbT86ICgpID0+IG51bWJlcjtcbiAgbm9uY2U/OiAoKSA9PiBzdHJpbmc7XG4gIHZpc2liaWxpdHk/OiBWaXNpYmlsaXR5U291cmNlO1xuICBvblN0YXR1czogKHN0YXR1czogUGVuQnJpZGdlU3RhdHVzKSA9PiB2b2lkO1xuICBvbkJ1dHRvbjogKGJ1dHRvbjogUGVuQnV0dG9uU2lnbmFsKSA9PiB2b2lkO1xuICBvbkNvbW1hbmQ/OiAoYWN0aW9uOiBcIm9wZW4tbWVudVwiKSA9PiB2b2lkO1xuICBkZWJ1Zz86IChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQ7XG59XG5cbmNvbnN0IEJBQ0tPRkZfTVMgPSBbMjUwLCA1MDAsIDEwMDAsIDIwMDAsIDUwMDBdO1xuY29uc3QgV0FUQ0hET0dfTVMgPSAzMDAwO1xuXG5mdW5jdGlvbiBkZWZhdWx0VmlzaWJpbGl0eSgpOiBWaXNpYmlsaXR5U291cmNlIHtcbiAgcmV0dXJuIHtcbiAgICBzdGF0ZTogKCkgPT4ge1xuICAgICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIFwidmlzaWJsZVwiO1xuICAgICAgcmV0dXJuIGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSA9PT0gXCJoaWRkZW5cIiA/IFwiaGlkZGVuXCIgOiBcInZpc2libGVcIjtcbiAgICB9LFxuICAgIHN1YnNjcmliZTogKGxpc3RlbmVyKSA9PiB7XG4gICAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gKCkgPT4gdW5kZWZpbmVkO1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInZpc2liaWxpdHljaGFuZ2VcIiwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuICgpID0+IGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ2aXNpYmlsaXR5Y2hhbmdlXCIsIGxpc3RlbmVyKTtcbiAgICB9LFxuICB9O1xufVxuXG4vKiogT25lIHBsdWdpbi13aWRlIGNsaWVudCBmb3Igd3M6Ly8xMjcuMC4wLjE6PHBvcnQ+L3YxL3Blbi4gKi9cbmV4cG9ydCBjbGFzcyBQZW5CcmlkZ2VDbGllbnQge1xuICBwcml2YXRlIHVybDogc3RyaW5nO1xuICBwcml2YXRlIGRlbWFuZGVkID0gZmFsc2U7XG4gIHByaXZhdGUgZmFpbGVkID0gZmFsc2U7XG4gIHByaXZhdGUgZGlzcG9zZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBzb2NrZXQ6IEJyaWRnZVNvY2tldCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGNvbm5lY3Rpb24gPSAwO1xuICBwcml2YXRlIGxldmVsRG93biA9IGZhbHNlO1xuICBwcml2YXRlIGxhc3RTZXEgPSAtMTtcbiAgcHJpdmF0ZSBhdHRlbXB0ID0gMDtcbiAgcHJpdmF0ZSByZXRyeVRpbWVyOiB1bmtub3duIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgd2F0Y2hkb2c6IHVua25vd24gfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBsYXN0RnJhbWVBdDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcmVjb25uZWN0QXR0ZW1wdHMgPSAwO1xuICBwcml2YXRlIG5leHRSZXRyeUF0OiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBsYXN0Q2xvc2VDb2RlOiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBsYXN0Q2xvc2VSZWFzb24gPSBcIlwiO1xuICBwcml2YXRlIHN0YXR1czogUGVuQnJpZGdlU3RhdHVzID0geyBzdGF0ZTogXCJvZmZcIiB9O1xuICBwcml2YXRlIGhlbGxvOiBIZWxsb0ZyYW1lIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGVuZGluZ05vbmNlOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBmaW5nZXJwcmludFZhbHVlOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBhcHBWZXJzaW9uOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwcm90bzogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgc291cmNlTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIHNvdXJjZU5vZGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBzb3VyY2VSZWFzb246IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBzb3VyY2VTdGF0ZTogU291cmNlRnJhbWVbXCJzdGF0ZVwiXSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGxhc3RCdXR0b246IFBlbkJyaWRnZVNuYXBzaG90W1wibGFzdEJ1dHRvblwiXSA9IG51bGw7XG4gIHByaXZhdGUgcmVhZG9ubHkgdW5saXN0ZW46ICgpID0+IHZvaWQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgbm93OiAoKSA9PiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgcGVyZk5vdzogKCkgPT4gbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IHNjaGVkdWxlcjogU2NoZWR1bGVyO1xuICBwcml2YXRlIHJlYWRvbmx5IHJhbmRvbTogKCkgPT4gbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IG5vbmNlOiAoKSA9PiBzdHJpbmc7XG4gIHByaXZhdGUgcmVhZG9ubHkgdmlzaWJpbGl0eTogVmlzaWJpbGl0eVNvdXJjZTtcbiAgcHJpdmF0ZSByZWFkb25seSB3c0ZhY3Rvcnk6ICh1cmw6IHN0cmluZykgPT4gQnJpZGdlU29ja2V0O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgb3B0czogUGVuQnJpZGdlQ2xpZW50T3B0aW9ucykge1xuICAgIHRoaXMudXJsID0gb3B0cy51cmw7XG4gICAgdGhpcy5ub3cgPSBvcHRzLm5vdyA/PyAoKCkgPT4gRGF0ZS5ub3coKSk7XG4gICAgdGhpcy5wZXJmTm93ID0gb3B0cy5wZXJmTm93ID8/ICgoKSA9PiBwZXJmb3JtYW5jZS5ub3coKSk7XG4gICAgdGhpcy5zY2hlZHVsZXIgPSBvcHRzLnNjaGVkdWxlciA/PyB7XG4gICAgICBzZXRUaW1lb3V0OiAoY2FsbGJhY2ssIGRlbGF5TXMpID0+IGdsb2JhbFRoaXMuc2V0VGltZW91dChjYWxsYmFjaywgZGVsYXlNcyksXG4gICAgICBjbGVhclRpbWVvdXQ6IChoYW5kbGUpID0+IGdsb2JhbFRoaXMuY2xlYXJUaW1lb3V0KGhhbmRsZSBhcyBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiksXG4gICAgfTtcbiAgICB0aGlzLnJhbmRvbSA9IG9wdHMucmFuZG9tID8/ICgoKSA9PiBNYXRoLnJhbmRvbSgpKTtcbiAgICB0aGlzLm5vbmNlID0gb3B0cy5ub25jZSA/PyBuZXdOb25jZTtcbiAgICB0aGlzLnZpc2liaWxpdHkgPSBvcHRzLnZpc2liaWxpdHkgPz8gZGVmYXVsdFZpc2liaWxpdHkoKTtcbiAgICB0aGlzLndzRmFjdG9yeSA9IG9wdHMud3NGYWN0b3J5ID8/ICgodXJsKSA9PiBuZXcgV2ViU29ja2V0KHVybCkgYXMgdW5rbm93biBhcyBCcmlkZ2VTb2NrZXQpO1xuICAgIHRoaXMudW5saXN0ZW4gPSB0aGlzLnZpc2liaWxpdHkuc3Vic2NyaWJlKCgpID0+IHRoaXMub25WaXNpYmlsaXR5KCkpO1xuICB9XG5cbiAgc2V0RGVtYW5kKHdhbnRlZDogYm9vbGVhbik6IHZvaWQge1xuICAgIHRoaXMuZGVtYW5kZWQgPSB3YW50ZWQ7XG4gICAgaWYgKCF3YW50ZWQpIHtcbiAgICAgIHRoaXMuY2xlYXJSZXRyeSgpO1xuICAgICAgdGhpcy5mb3JjZVVwKCk7XG4gICAgICB0aGlzLmNsb3NlU29ja2V0KENMT1NFLk5PUk1BTCwgXCJpZGxlXCIpO1xuICAgICAgaWYgKCF0aGlzLmZhaWxlZCkgdGhpcy5lbWl0U3RhdHVzKHsgc3RhdGU6IFwib2ZmXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLmZhaWxlZCB8fCB0aGlzLmhpZGRlbigpIHx8IHRoaXMuc29ja2V0KSByZXR1cm47XG4gICAgdGhpcy5vcGVuKCk7XG4gIH1cblxuICByZWNvbm5lY3ROb3coKTogdm9pZCB7XG4gICAgdGhpcy5mYWlsZWQgPSBmYWxzZTtcbiAgICB0aGlzLmF0dGVtcHQgPSAwO1xuICAgIHRoaXMuY2xlYXJSZXRyeSgpO1xuICAgIHRoaXMuZm9yY2VVcCgpO1xuICAgIHRoaXMuY2xvc2VTb2NrZXQoQ0xPU0UuTk9STUFMLCBcInJlY29ubmVjdFwiKTtcbiAgICBpZiAodGhpcy5kZW1hbmRlZCAmJiAhdGhpcy5oaWRkZW4oKSkgdGhpcy5vcGVuKCk7XG4gIH1cblxuICBzZXRVcmwodXJsOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLnVybCA9IHVybDtcbiAgfVxuXG4gIGlzRG93bigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0dXMuc3RhdGUgPT09IFwicmVhZHlcIiAmJiB0aGlzLmxldmVsRG93bjtcbiAgfVxuXG4gIGlzUmVhZHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdHVzLnN0YXRlID09PSBcInJlYWR5XCI7XG4gIH1cblxuICBzbmFwc2hvdCgpOiBQZW5CcmlkZ2VTbmFwc2hvdCB7XG4gICAgY29uc3Qgbm93ID0gdGhpcy5ub3coKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcbiAgICAgIGhlYXJ0YmVhdEFnZU1zOlxuICAgICAgICB0aGlzLmxhc3RGcmFtZUF0ID09PSBudWxsID8gbnVsbCA6IE1hdGgubWF4KDAsIE1hdGgucm91bmQobm93IC0gdGhpcy5sYXN0RnJhbWVBdCkpLFxuICAgICAgcmVjb25uZWN0QXR0ZW1wdHM6IHRoaXMucmVjb25uZWN0QXR0ZW1wdHMsXG4gICAgICBuZXh0UmV0cnlJbk1zOlxuICAgICAgICB0aGlzLm5leHRSZXRyeUF0ID09PSBudWxsID8gbnVsbCA6IE1hdGgubWF4KDAsIE1hdGgucm91bmQodGhpcy5uZXh0UmV0cnlBdCAtIG5vdykpLFxuICAgICAgbGFzdENsb3NlQ29kZTogdGhpcy5sYXN0Q2xvc2VDb2RlLFxuICAgICAgbGFzdENsb3NlUmVhc29uOiB0aGlzLmxhc3RDbG9zZVJlYXNvbixcbiAgICAgIGxhc3RCdXR0b246IHRoaXMubGFzdEJ1dHRvbixcbiAgICAgIGFwcFZlcnNpb246IHRoaXMuYXBwVmVyc2lvbixcbiAgICAgIHByb3RvOiB0aGlzLnByb3RvLFxuICAgICAgZmluZ2VycHJpbnQ6IHRoaXMuZmluZ2VycHJpbnRWYWx1ZSxcbiAgICAgIHVybDogdGhpcy51cmwsXG4gICAgfTtcbiAgfVxuXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5kaXNwb3NlZCA9IHRydWU7XG4gICAgdGhpcy5kZW1hbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuY2xlYXJSZXRyeSgpO1xuICAgIHRoaXMuZm9yY2VVcCgpO1xuICAgIHRoaXMuY2xvc2VTb2NrZXQoQ0xPU0UuTk9STUFMLCBcImRpc3Bvc2VcIik7XG4gICAgdGhpcy51bmxpc3RlbigpO1xuICB9XG5cbiAgcHJpdmF0ZSBoaWRkZW4oKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMudmlzaWJpbGl0eS5zdGF0ZSgpID09PSBcImhpZGRlblwiO1xuICB9XG5cbiAgcHJpdmF0ZSBvblZpc2liaWxpdHkoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGlkZGVuKCkpIHtcbiAgICAgIHRoaXMuY2xlYXJSZXRyeSgpO1xuICAgICAgdGhpcy5mb3JjZVVwKCk7XG4gICAgICB0aGlzLmNsb3NlU29ja2V0KENMT1NFLk5PUk1BTCwgXCJoaWRkZW5cIik7XG4gICAgICBpZiAoIXRoaXMuZmFpbGVkKSB0aGlzLmVtaXRTdGF0dXMoeyBzdGF0ZTogXCJvZmZcIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmRlbWFuZGVkIHx8IHRoaXMuZmFpbGVkIHx8IHRoaXMuc29ja2V0KSByZXR1cm47XG4gICAgdGhpcy5hdHRlbXB0ID0gMDtcbiAgICB0aGlzLmNsZWFyUmV0cnkoKTtcbiAgICB0aGlzLm9wZW4oKTtcbiAgfVxuXG4gIHByaXZhdGUgb3BlbigpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zb2NrZXQgfHwgdGhpcy5kaXNwb3NlZCB8fCAhdGhpcy5kZW1hbmRlZCB8fCB0aGlzLmZhaWxlZCB8fCB0aGlzLmhpZGRlbigpKSByZXR1cm47XG4gICAgY29uc3QgY29ubmVjdGlvbiA9ICsrdGhpcy5jb25uZWN0aW9uO1xuICAgIHRoaXMuaGVsbG8gPSBudWxsO1xuICAgIHRoaXMucGVuZGluZ05vbmNlID0gbnVsbDtcbiAgICB0aGlzLmVtaXRTdGF0dXMoeyBzdGF0ZTogXCJjb25uZWN0aW5nXCIgfSk7XG4gICAgbGV0IHNvY2tldDogQnJpZGdlU29ja2V0O1xuICAgIHRyeSB7XG4gICAgICBzb2NrZXQgPSB0aGlzLndzRmFjdG9yeSh0aGlzLnVybCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMub3B0cy5kZWJ1Zz8uKFxuICAgICAgICBgYnJpZGdlOiBzb2NrZXQgZmFpbGVkICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcImVycm9yXCJ9YFxuICAgICAgKTtcbiAgICAgIHRoaXMuc2NoZWR1bGVSZXRyeSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcbiAgICBzb2NrZXQub25vcGVuID0gKCkgPT4ge1xuICAgICAgaWYgKGNvbm5lY3Rpb24gIT09IHRoaXMuY29ubmVjdGlvbikgcmV0dXJuO1xuICAgICAgdGhpcy5hcm1XYXRjaGRvZyhjb25uZWN0aW9uKTtcbiAgICB9O1xuICAgIHNvY2tldC5vbm1lc3NhZ2UgPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmIChjb25uZWN0aW9uICE9PSB0aGlzLmNvbm5lY3Rpb24pIHJldHVybjtcbiAgICAgIHZvaWQgdGhpcy5vbk1lc3NhZ2UoY29ubmVjdGlvbiwgZXZlbnQuZGF0YSk7XG4gICAgfTtcbiAgICBzb2NrZXQub25lcnJvciA9ICgpID0+IHtcbiAgICAgIGlmIChjb25uZWN0aW9uICE9PSB0aGlzLmNvbm5lY3Rpb24pIHJldHVybjtcbiAgICAgIHRoaXMub3B0cy5kZWJ1Zz8uKFwiYnJpZGdlOiBlcnJvciBldmVudFwiKTtcbiAgICB9O1xuICAgIHNvY2tldC5vbmNsb3NlID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoY29ubmVjdGlvbiAhPT0gdGhpcy5jb25uZWN0aW9uKSByZXR1cm47XG4gICAgICB0aGlzLnNvY2tldCA9IG51bGw7XG4gICAgICB0aGlzLmNsZWFyV2F0Y2hkb2coKTtcbiAgICAgIHRoaXMuaGFuZGxlQ2xvc2UoZXZlbnQuY29kZSwgZXZlbnQucmVhc29uKTtcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBvbk1lc3NhZ2UoY29ubmVjdGlvbjogbnVtYmVyLCBkYXRhOiB1bmtub3duKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGNvbm5lY3Rpb24gIT09IHRoaXMuY29ubmVjdGlvbikgcmV0dXJuO1xuICAgIHRoaXMuYXJtV2F0Y2hkb2coY29ubmVjdGlvbik7XG4gICAgaWYgKHR5cGVvZiBkYXRhICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aGlzLm9wdHMuZGVidWc/LihcImJyaWRnZTogaWdub3JlZCBub24tdGV4dCBmcmFtZVwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZnJhbWUgPSBwYXJzZVNlcnZlckZyYW1lKGRhdGEpO1xuICAgIGlmICghZnJhbWUpIHtcbiAgICAgIHRoaXMub3B0cy5kZWJ1Zz8uKFwiYnJpZGdlOiBpZ25vcmVkIG1hbGZvcm1lZCBmcmFtZVwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGZyYW1lLnR5cGUgPT09IFwidW5rbm93blwiKSByZXR1cm47XG4gICAgaWYgKGZyYW1lLnR5cGUgPT09IFwiaGVsbG9cIikge1xuICAgICAgYXdhaXQgdGhpcy5vbkhlbGxvKGNvbm5lY3Rpb24sIGZyYW1lKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGZyYW1lLnR5cGUgPT09IFwicmVhZHlcIikge1xuICAgICAgYXdhaXQgdGhpcy5vblJlYWR5KGNvbm5lY3Rpb24sIGZyYW1lKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3RhdHVzLnN0YXRlICE9PSBcInJlYWR5XCIpIHJldHVybjtcbiAgICBpZiAoZnJhbWUudHlwZSA9PT0gXCJidXR0b25cIikgdGhpcy5vbkJ1dHRvbkZyYW1lKGZyYW1lKTtcbiAgICBlbHNlIGlmIChmcmFtZS50eXBlID09PSBcInBpbmdcIikgdGhpcy5vblBpbmcoZnJhbWUuc2VxLCBmcmFtZS5kb3duLCBmcmFtZS5zZW50KTtcbiAgICBlbHNlIGlmIChmcmFtZS50eXBlID09PSBcInNvdXJjZVwiKSB0aGlzLm9uU291cmNlKGZyYW1lKTtcbiAgICBlbHNlIGlmIChmcmFtZS50eXBlID09PSBcImNvbW1hbmRcIiAmJiBmcmFtZS5hY3Rpb24gPT09IFwib3Blbi1tZW51XCIpXG4gICAgICB0aGlzLm9wdHMub25Db21tYW5kPy4oXCJvcGVuLW1lbnVcIik7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG9uSGVsbG8oY29ubmVjdGlvbjogbnVtYmVyLCBmcmFtZTogSGVsbG9GcmFtZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmIChjb25uZWN0aW9uICE9PSB0aGlzLmNvbm5lY3Rpb24pIHJldHVybjtcbiAgICB0aGlzLmhlbGxvID0gZnJhbWU7XG4gICAgdGhpcy5wcm90byA9IGZyYW1lLnByb3RvO1xuICAgIHRoaXMuYXBwVmVyc2lvbiA9IGZyYW1lLmFwcFZlcnNpb247XG4gICAgdGhpcy5vcHRzLmRlYnVnPy4oYGJyaWRnZTogaGVsbG8gcHJvdG89JHtmcmFtZS5wcm90b30gYXBwPSR7ZnJhbWUuYXBwVmVyc2lvbn1gKTtcbiAgICBpZiAoZnJhbWUucHJvdG8gIT09IDEpIHtcbiAgICAgIHRoaXMuZmFpbChDTE9TRS5QUk9UT0NPTCwgXCJwcm90b2NvbCBlcnJvclwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgc2VjcmV0ID0gdGhpcy5vcHRzLnNlY3JldCgpO1xuICAgIGlmICghc2VjcmV0KSB7XG4gICAgICB0aGlzLmZhaWwoQ0xPU0UuQVVUSCwgXCJ3cm9uZyBwYWlyaW5nIGNvZGVcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGNsaWVudE5vbmNlID0gdGhpcy5ub25jZSgpO1xuICAgIHRoaXMucGVuZGluZ05vbmNlID0gY2xpZW50Tm9uY2U7XG4gICAgY29uc3QgW2NsaWVudFByb29mLCBmaW5nZXJdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgcHJvb2Yoc2VjcmV0LCBmcmFtZS5ub25jZSwgY2xpZW50Tm9uY2UsIFwiY2xpZW50XCIpLFxuICAgICAgZmluZ2VycHJpbnQoc2VjcmV0KSxcbiAgICBdKTtcbiAgICBpZiAoY29ubmVjdGlvbiAhPT0gdGhpcy5jb25uZWN0aW9uKSByZXR1cm47XG4gICAgdGhpcy5maW5nZXJwcmludFZhbHVlID0gZmluZ2VyO1xuICAgIHRoaXMuZW1pdFN0YXR1cyh7IHN0YXRlOiBcImF1dGhlbnRpY2F0aW5nXCIgfSk7XG4gICAgdGhpcy5zb2NrZXQ/LnNlbmQoXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHR5cGU6IFwiYXV0aFwiLFxuICAgICAgICBwcm90bzogMSxcbiAgICAgICAgY2xpZW50OiBcImV4Y2FsaWRyYXctc3R5bHVzLWNvbnRyb2xzXCIsXG4gICAgICAgIGNsaWVudFZlcnNpb246IHRoaXMub3B0cy5jbGllbnRWZXJzaW9uLFxuICAgICAgICBjbGllbnROb25jZSxcbiAgICAgICAgcHJvb2Y6IGNsaWVudFByb29mLFxuICAgICAgfSlcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBvblJlYWR5KGNvbm5lY3Rpb246IG51bWJlciwgZnJhbWU6IFJlYWR5RnJhbWUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoY29ubmVjdGlvbiAhPT0gdGhpcy5jb25uZWN0aW9uIHx8ICF0aGlzLmhlbGxvIHx8ICF0aGlzLnBlbmRpbmdOb25jZSkgcmV0dXJuO1xuICAgIGNvbnN0IHNlY3JldCA9IHRoaXMub3B0cy5zZWNyZXQoKTtcbiAgICBpZiAoIXNlY3JldCkge1xuICAgICAgdGhpcy5mYWlsKENMT1NFLkFVVEgsIFwid3JvbmcgcGFpcmluZyBjb2RlXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBleHBlY3RlZCA9IGF3YWl0IHByb29mKHNlY3JldCwgdGhpcy5oZWxsby5ub25jZSwgdGhpcy5wZW5kaW5nTm9uY2UsIFwic2VydmVyXCIpO1xuICAgIGlmIChjb25uZWN0aW9uICE9PSB0aGlzLmNvbm5lY3Rpb24pIHJldHVybjtcbiAgICBpZiAoIXNhZmVFcXVhbChleHBlY3RlZCwgZnJhbWUuc2VydmVyUHJvb2YpKSB7XG4gICAgICB0aGlzLm9wdHMuZGVidWc/LihcImJyaWRnZTogYmFkIHNlcnZlciBwcm9vZlwiKTtcbiAgICAgIHRoaXMuZmFpbChDTE9TRS5BVVRILCBcIndyb25nIHBhaXJpbmcgY29kZVwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5hdHRlbXB0ID0gMDtcbiAgICB0aGlzLnJlY29ubmVjdEF0dGVtcHRzID0gMDtcbiAgICB0aGlzLm5leHRSZXRyeUF0ID0gbnVsbDtcbiAgICB0aGlzLnNvdXJjZVN0YXRlID0gZnJhbWUuc291cmNlLnN0YXRlO1xuICAgIHRoaXMuc291cmNlUmVhc29uID0gZnJhbWUuc291cmNlLnJlYXNvbjtcbiAgICB0aGlzLnNvdXJjZU5hbWUgPSBmcmFtZS5zb3VyY2UubmFtZTtcbiAgICB0aGlzLnNvdXJjZU5vZGUgPSBmcmFtZS5zb3VyY2Uubm9kZTtcbiAgICB0aGlzLm9wdHMuZGVidWc/LihgYnJpZGdlOiByZWFkeSBzb3VyY2U9JHtmcmFtZS5zb3VyY2Uuc3RhdGV9YCk7XG4gICAgdGhpcy5lbWl0U3RhdHVzKHtcbiAgICAgIHN0YXRlOiBcInJlYWR5XCIsXG4gICAgICBzb3VyY2U6IGZyYW1lLnNvdXJjZS5zdGF0ZSxcbiAgICAgIHJlYXNvbjogZnJhbWUuc291cmNlLnJlYXNvbixcbiAgICAgIG5hbWU6IGZyYW1lLnNvdXJjZS5uYW1lLFxuICAgICAgbm9kZTogZnJhbWUuc291cmNlLm5vZGUsXG4gICAgICBmaW5nZXJwcmludDogdGhpcy5maW5nZXJwcmludFZhbHVlID8/IFwiXCIsXG4gICAgfSk7XG4gICAgdGhpcy5hcHBseUxldmVsKGZyYW1lLmJ1dHRvbi5kb3duLCBmcmFtZS5idXR0b24uc2VxLCBmcmFtZS5idXR0b24udCwgdHJ1ZSk7XG4gICAgaWYgKGZyYW1lLnNvdXJjZS5zdGF0ZSA9PT0gXCJ1bmF2YWlsYWJsZVwiKSB0aGlzLmZvcmNlVXAoKTtcbiAgfVxuXG4gIHByaXZhdGUgb25CdXR0b25GcmFtZShmcmFtZTogQnV0dG9uRnJhbWUpOiB2b2lkIHtcbiAgICBpZiAoZnJhbWUuc2VxIDw9IHRoaXMubGFzdFNlcSkgcmV0dXJuO1xuICAgIHRoaXMuYXBwbHlMZXZlbChmcmFtZS5kb3duLCBmcmFtZS5zZXEsIGZyYW1lLnQsIHRydWUpO1xuICB9XG5cbiAgcHJpdmF0ZSBvblBpbmcoc2VxOiBudW1iZXIsIGRvd246IGJvb2xlYW4sIHNlbnQ6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMuc29ja2V0Py5zZW5kKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogXCJwb25nXCIsIHNlbnQgfSkpO1xuICAgIGlmIChzZXEgPiB0aGlzLmxhc3RTZXEpIHRoaXMubGFzdFNlcSA9IHNlcTtcbiAgICBpZiAoZG93biAhPT0gdGhpcy5sZXZlbERvd24pIHRoaXMuYXBwbHlMZXZlbChkb3duLCBzZXEsIG51bGwsIGZhbHNlKTtcbiAgfVxuXG4gIHByaXZhdGUgb25Tb3VyY2UoZnJhbWU6IFNvdXJjZUZyYW1lKTogdm9pZCB7XG4gICAgdGhpcy5zb3VyY2VTdGF0ZSA9IGZyYW1lLnN0YXRlO1xuICAgIHRoaXMuc291cmNlUmVhc29uID0gZnJhbWUucmVhc29uO1xuICAgIHRoaXMuc291cmNlTmFtZSA9IGZyYW1lLm5hbWU7XG4gICAgdGhpcy5zb3VyY2VOb2RlID0gZnJhbWUubm9kZTtcbiAgICBpZiAodGhpcy5zdGF0dXMuc3RhdGUgPT09IFwicmVhZHlcIikge1xuICAgICAgdGhpcy5lbWl0U3RhdHVzKHtcbiAgICAgICAgc3RhdGU6IFwicmVhZHlcIixcbiAgICAgICAgc291cmNlOiBmcmFtZS5zdGF0ZSxcbiAgICAgICAgcmVhc29uOiBmcmFtZS5yZWFzb24sXG4gICAgICAgIG5hbWU6IGZyYW1lLm5hbWUsXG4gICAgICAgIG5vZGU6IGZyYW1lLm5vZGUsXG4gICAgICAgIGZpbmdlcnByaW50OiB0aGlzLmZpbmdlcnByaW50VmFsdWUgPz8gXCJcIixcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoZnJhbWUuc3RhdGUgPT09IFwidW5hdmFpbGFibGVcIikgdGhpcy5mb3JjZVVwKCk7XG4gICAgdGhpcy5vcHRzLmRlYnVnPy4oYGJyaWRnZTogc291cmNlICR7ZnJhbWUuc3RhdGV9JHtmcmFtZS5yZWFzb24gPyBgICR7ZnJhbWUucmVhc29ufWAgOiBcIlwifWApO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBseUxldmVsKFxuICAgIGRvd246IGJvb2xlYW4sXG4gICAgc2VxOiBudW1iZXIsXG4gICAga2VybmVsVGltZTogbnVtYmVyIHwgbnVsbCxcbiAgICBmcm9tQnV0dG9uOiBib29sZWFuXG4gICk6IHZvaWQge1xuICAgIGlmIChmcm9tQnV0dG9uICYmIHNlcSA8PSB0aGlzLmxhc3RTZXEpIHJldHVybjtcbiAgICBpZiAoZnJvbUJ1dHRvbikgdGhpcy5sYXN0U2VxID0gc2VxO1xuICAgIGNvbnN0IG5vdyA9IHRoaXMubm93KCk7XG4gICAgY29uc3QgcGVyZiA9IHRoaXMucGVyZk5vdygpO1xuICAgIGNvbnN0IHJlbGlhYmxlID0ga2VybmVsVGltZSAhPT0gbnVsbCAmJiBNYXRoLmFicyhub3cgLSBrZXJuZWxUaW1lKSA8PSAxMDAwO1xuICAgIGNvbnN0IHNpZ25hbDogUGVuQnV0dG9uU2lnbmFsID0ge1xuICAgICAgZG93bixcbiAgICAgIHNlcSxcbiAgICAgIHByZXNzZWRBdFBlcmY6IHJlbGlhYmxlICYmIGtlcm5lbFRpbWUgIT09IG51bGwgPyBwZXJmIC0gKG5vdyAtIGtlcm5lbFRpbWUpIDogcGVyZixcbiAgICAgIGxhdGVuY3lNczogcmVsaWFibGUgJiYga2VybmVsVGltZSAhPT0gbnVsbCA/IG5vdyAtIGtlcm5lbFRpbWUgOiBudWxsLFxuICAgIH07XG4gICAgdGhpcy5sZXZlbERvd24gPSBkb3duO1xuICAgIHRoaXMubGFzdEJ1dHRvbiA9IHtcbiAgICAgIGRvd24sXG4gICAgICBzZXEsXG4gICAgICBsYXRlbmN5TXM6IHNpZ25hbC5sYXRlbmN5TXMsXG4gICAgICBjbG9jazogc2lnbmFsLmxhdGVuY3lNcyA9PT0gbnVsbCA/IFwicmVjZWl2ZVwiIDogXCJicmlkZ2VcIixcbiAgICB9O1xuICAgIHRoaXMub3B0cy5vbkJ1dHRvbihzaWduYWwpO1xuICB9XG5cbiAgcHJpdmF0ZSBmb3JjZVVwKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5sZXZlbERvd24pIHJldHVybjtcbiAgICB0aGlzLmxldmVsRG93biA9IGZhbHNlO1xuICAgIGNvbnN0IHNpZ25hbDogUGVuQnV0dG9uU2lnbmFsID0ge1xuICAgICAgZG93bjogZmFsc2UsXG4gICAgICBzZXE6IHRoaXMubGFzdFNlcSxcbiAgICAgIHByZXNzZWRBdFBlcmY6IHRoaXMucGVyZk5vdygpLFxuICAgICAgbGF0ZW5jeU1zOiBudWxsLFxuICAgIH07XG4gICAgdGhpcy5sYXN0QnV0dG9uID0geyBkb3duOiBmYWxzZSwgc2VxOiB0aGlzLmxhc3RTZXEsIGxhdGVuY3lNczogbnVsbCwgY2xvY2s6IFwicmVjZWl2ZVwiIH07XG4gICAgdGhpcy5vcHRzLm9uQnV0dG9uKHNpZ25hbCk7XG4gIH1cblxuICBwcml2YXRlIGFybVdhdGNoZG9nKGNvbm5lY3Rpb246IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMubGFzdEZyYW1lQXQgPSB0aGlzLm5vdygpO1xuICAgIHRoaXMuY2xlYXJXYXRjaGRvZygpO1xuICAgIHRoaXMud2F0Y2hkb2cgPSB0aGlzLnNjaGVkdWxlci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmIChjb25uZWN0aW9uICE9PSB0aGlzLmNvbm5lY3Rpb24pIHJldHVybjtcbiAgICAgIHRoaXMub3B0cy5kZWJ1Zz8uKFwiYnJpZGdlOiB3YXRjaGRvZyB0aW1lb3V0XCIpO1xuICAgICAgdGhpcy5mb3JjZVVwKCk7XG4gICAgICB0aGlzLmNsb3NlU29ja2V0KENMT1NFLk5PUk1BTCwgXCJ3YXRjaGRvZ1wiKTtcbiAgICAgIGlmICh0aGlzLmRlbWFuZGVkICYmICF0aGlzLmZhaWxlZCkgdGhpcy5lbWl0U3RhdHVzKHsgc3RhdGU6IFwiY29ubmVjdGluZ1wiIH0pO1xuICAgICAgdGhpcy5zY2hlZHVsZVJldHJ5KCk7XG4gICAgfSwgV0FUQ0hET0dfTVMpO1xuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVDbG9zZShjb2RlOiBudW1iZXIsIHJlYXNvbjogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5sYXN0Q2xvc2VDb2RlID0gY29kZTtcbiAgICB0aGlzLmxhc3RDbG9zZVJlYXNvbiA9IHJlYXNvbjtcbiAgICB0aGlzLmNsZWFyV2F0Y2hkb2coKTtcbiAgICB0aGlzLmhlbGxvID0gbnVsbDtcbiAgICB0aGlzLmZvcmNlVXAoKTtcbiAgICBpZiAoY29kZSA9PT0gQ0xPU0UuUFJPVE9DT0wgfHwgY29kZSA9PT0gQ0xPU0UuQVVUSCkge1xuICAgICAgdGhpcy5mYWlsZWQgPSB0cnVlO1xuICAgICAgdGhpcy5jbGVhclJldHJ5KCk7XG4gICAgICB0aGlzLmVtaXRTdGF0dXMoe1xuICAgICAgICBzdGF0ZTogXCJmYWlsZWRcIixcbiAgICAgICAgY29kZSxcbiAgICAgICAgcmVhc29uOiBjb2RlID09PSBDTE9TRS5BVVRIID8gXCJ3cm9uZyBwYWlyaW5nIGNvZGVcIiA6IHJlYXNvbiB8fCBcInByb3RvY29sIGVycm9yXCIsXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmRlbWFuZGVkIHx8IHRoaXMuZGlzcG9zZWQgfHwgdGhpcy5oaWRkZW4oKSkge1xuICAgICAgaWYgKCF0aGlzLmZhaWxlZCkgdGhpcy5lbWl0U3RhdHVzKHsgc3RhdGU6IFwib2ZmXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZW1pdFN0YXR1cyh7IHN0YXRlOiBcImNvbm5lY3RpbmdcIiB9KTtcbiAgICB0aGlzLnNjaGVkdWxlUmV0cnkoKTtcbiAgfVxuXG4gIHByaXZhdGUgZmFpbChjb2RlOiBudW1iZXIsIHJlYXNvbjogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5mYWlsZWQgPSB0cnVlO1xuICAgIHRoaXMuZm9yY2VVcCgpO1xuICAgIHRoaXMuY2xlYXJSZXRyeSgpO1xuICAgIHRoaXMubGFzdENsb3NlQ29kZSA9IGNvZGU7XG4gICAgdGhpcy5sYXN0Q2xvc2VSZWFzb24gPSByZWFzb247XG4gICAgdGhpcy5jbG9zZVNvY2tldChjb2RlLCByZWFzb24pO1xuICAgIHRoaXMuZW1pdFN0YXR1cyh7IHN0YXRlOiBcImZhaWxlZFwiLCBjb2RlLCByZWFzb24gfSk7XG4gIH1cblxuICBwcml2YXRlIHNjaGVkdWxlUmV0cnkoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmRlbWFuZGVkIHx8IHRoaXMuZmFpbGVkIHx8IHRoaXMuZGlzcG9zZWQgfHwgdGhpcy5oaWRkZW4oKSkgcmV0dXJuO1xuICAgIHRoaXMuY2xlYXJSZXRyeSgpO1xuICAgIGNvbnN0IGJhc2UgPSBCQUNLT0ZGX01TW01hdGgubWluKHRoaXMuYXR0ZW1wdCwgQkFDS09GRl9NUy5sZW5ndGggLSAxKV0gPz8gNTAwMDtcbiAgICB0aGlzLmF0dGVtcHQgKz0gMTtcbiAgICB0aGlzLnJlY29ubmVjdEF0dGVtcHRzICs9IDE7XG4gICAgY29uc3Qgaml0dGVyID0gKHRoaXMucmFuZG9tKCkgKiAyIC0gMSkgKiAwLjI7XG4gICAgY29uc3QgZGVsYXkgPSBNYXRoLm1heCgwLCBNYXRoLnJvdW5kKGJhc2UgKiAoMSArIGppdHRlcikpKTtcbiAgICB0aGlzLm5leHRSZXRyeUF0ID0gdGhpcy5ub3coKSArIGRlbGF5O1xuICAgIHRoaXMub3B0cy5kZWJ1Zz8uKGBicmlkZ2U6IHJldHJ5IGluICR7ZGVsYXl9IG1zYCk7XG4gICAgdGhpcy5yZXRyeVRpbWVyID0gdGhpcy5zY2hlZHVsZXIuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLnJldHJ5VGltZXIgPSBudWxsO1xuICAgICAgdGhpcy5uZXh0UmV0cnlBdCA9IG51bGw7XG4gICAgICB0aGlzLm9wZW4oKTtcbiAgICB9LCBkZWxheSk7XG4gIH1cblxuICBwcml2YXRlIGNsb3NlU29ja2V0KGNvZGU6IG51bWJlciwgcmVhc29uOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBzb2NrZXQgPSB0aGlzLnNvY2tldDtcbiAgICBpZiAoIXNvY2tldCkgcmV0dXJuO1xuICAgIHRoaXMuY29ubmVjdGlvbiArPSAxO1xuICAgIHRoaXMuc29ja2V0ID0gbnVsbDtcbiAgICB0aGlzLmNsZWFyV2F0Y2hkb2coKTtcbiAgICB0aGlzLmhlbGxvID0gbnVsbDtcbiAgICB0cnkge1xuICAgICAgc29ja2V0LmNsb3NlKGNvZGUsIHJlYXNvbik7XG4gICAgfSBjYXRjaCB7XG4gICAgICB0aGlzLm9wdHMuZGVidWc/LihcImJyaWRnZTogY2xvc2UgZmFpbGVkXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2xlYXJSZXRyeSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5yZXRyeVRpbWVyICE9PSBudWxsKSB0aGlzLnNjaGVkdWxlci5jbGVhclRpbWVvdXQodGhpcy5yZXRyeVRpbWVyKTtcbiAgICB0aGlzLnJldHJ5VGltZXIgPSBudWxsO1xuICAgIHRoaXMubmV4dFJldHJ5QXQgPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBjbGVhcldhdGNoZG9nKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLndhdGNoZG9nICE9PSBudWxsKSB0aGlzLnNjaGVkdWxlci5jbGVhclRpbWVvdXQodGhpcy53YXRjaGRvZyk7XG4gICAgdGhpcy53YXRjaGRvZyA9IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGVtaXRTdGF0dXMoc3RhdHVzOiBQZW5CcmlkZ2VTdGF0dXMpOiB2b2lkIHtcbiAgICB0aGlzLnN0YXR1cyA9IHN0YXR1cztcbiAgICB0aGlzLm9wdHMub25TdGF0dXMoc3RhdHVzKTtcbiAgfVxufVxuIiwgImNvbnN0IFNUT1JBR0VfS0VZID0gXCJleGNhbGlkcmF3LXN0eWx1cy1jb250cm9sczpwYWlyaW5nXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFpcmluZ0FwcCB7XG4gIHZhdWx0OiB7IGdldE5hbWUoKTogc3RyaW5nIH07XG4gIHNhdmVMb2NhbFN0b3JhZ2U/OiAoa2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkO1xuICBsb2FkTG9jYWxTdG9yYWdlPzogKGtleTogc3RyaW5nKSA9PiB1bmtub3duO1xufVxuXG4vKiogUGFpcmluZyBjb2RlIHN0YXlzIG91dCBvZiBkYXRhLmpzb24gc28gdmF1bHQgc3luYyBjYW5ub3QgY29weSBpdC4gKi9cbmV4cG9ydCBjbGFzcyBQYWlyaW5nU3RvcmUge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGFwcDogUGFpcmluZ0FwcCkge31cblxuICBsb2FkKCk6IHN0cmluZyB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLmFwcC5sb2FkTG9jYWxTdG9yYWdlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5hcHAubG9hZExvY2FsU3RvcmFnZShTVE9SQUdFX0tFWSk7XG4gICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gdmFsdWUgOiBcIlwiO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdG9yYWdlKCkuZ2V0SXRlbSh0aGlzLmZhbGxiYWNrS2V5KCkpID8/IFwiXCI7XG4gIH1cblxuICBzYXZlKGNvZGU6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICh0eXBlb2YgdGhpcy5hcHAuc2F2ZUxvY2FsU3RvcmFnZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICB0aGlzLmFwcC5zYXZlTG9jYWxTdG9yYWdlKFNUT1JBR0VfS0VZLCBjb2RlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zdG9yYWdlKCkuc2V0SXRlbSh0aGlzLmZhbGxiYWNrS2V5KCksIGNvZGUpO1xuICB9XG5cbiAgY2xlYXIoKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLmFwcC5zYXZlTG9jYWxTdG9yYWdlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHRoaXMuYXBwLnNhdmVMb2NhbFN0b3JhZ2UoU1RPUkFHRV9LRVksIG51bGwpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnN0b3JhZ2UoKS5yZW1vdmVJdGVtKHRoaXMuZmFsbGJhY2tLZXkoKSk7XG4gIH1cblxuICBwcml2YXRlIGZhbGxiYWNrS2V5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBleGNhbGlkcmF3LXN0eWx1cy1jb250cm9sczoke3RoaXMuYXBwLnZhdWx0LmdldE5hbWUoKX06cGFpcmluZ2A7XG4gIH1cblxuICBwcml2YXRlIHN0b3JhZ2UoKTogU3RvcmFnZSB7XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgd2luZG93LmxvY2FsU3RvcmFnZSkgcmV0dXJuIHdpbmRvdy5sb2NhbFN0b3JhZ2U7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTG9jYWwgcGFpcmluZyBzdG9yYWdlIGlzIHVuYXZhaWxhYmxlLlwiKTtcbiAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgRXhjYWxpZHJhd0JyaWRnZSB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5pbXBvcnQgdHlwZSB7IFBlbkJyaWRnZUNsaWVudCwgUGVuQnV0dG9uU2lnbmFsIH0gZnJvbSBcIi4vUGVuQnJpZGdlQ2xpZW50XCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGVkUGVuVGFyZ2V0IHtcbiAgbGFzdFBlbkFjdGl2aXR5QXQ6IG51bWJlcjtcbiAgb25FeHRlcm5hbEJ1dHRvbihzaWduYWw6IFBlbkJ1dHRvblNpZ25hbCk6IHZvaWQ7XG4gIGxhc3RQZW5Qb2ludCgpOiBQb2ludCB8IG51bGw7XG4gIGJyaWRnZUZvck1lbnUoKTogRXhjYWxpZHJhd0JyaWRnZTtcbn1cblxuY29uc3QgUkVDRU5UX01TID0gNTAwMDtcblxuLyoqIFJvdXRlcyBlYWNoIGJhcnJlbCBsZXZlbCB0byB0aGUgRXhjYWxpZHJhdyB2aWV3IHRoZSBwZW4gd2FzIGp1c3Qgb3Zlci4gKi9cbmV4cG9ydCBjbGFzcyBQZW5TaWduYWxIdWIge1xuICBwcml2YXRlIHJlYWRvbmx5IHRhcmdldHMgPSBuZXcgU2V0PFJvdXRlZFBlblRhcmdldD4oKTtcbiAgcHJpdmF0ZSBmYWxsYmFjazogKCkgPT4gUm91dGVkUGVuVGFyZ2V0IHwgbnVsbCA9ICgpID0+IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBjbGllbnQ6ICgpID0+IFBpY2s8UGVuQnJpZGdlQ2xpZW50LCBcImlzUmVhZHlcIiB8IFwiaXNEb3duXCI+IHwgbnVsbCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5vdzogKCkgPT4gbnVtYmVyID0gKCkgPT4gcGVyZm9ybWFuY2Uubm93KClcbiAgKSB7fVxuXG4gIHNldEZhbGxiYWNrKGZhbGxiYWNrOiAoKSA9PiBSb3V0ZWRQZW5UYXJnZXQgfCBudWxsKTogdm9pZCB7XG4gICAgdGhpcy5mYWxsYmFjayA9IGZhbGxiYWNrO1xuICB9XG5cbiAgcmVnaXN0ZXIodGFyZ2V0OiBSb3V0ZWRQZW5UYXJnZXQpOiB2b2lkIHtcbiAgICB0aGlzLnRhcmdldHMuYWRkKHRhcmdldCk7XG4gIH1cblxuICB1bnJlZ2lzdGVyKHRhcmdldDogUm91dGVkUGVuVGFyZ2V0KTogdm9pZCB7XG4gICAgdGhpcy50YXJnZXRzLmRlbGV0ZSh0YXJnZXQpO1xuICB9XG5cbiAgaXNSZWFkeSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jbGllbnQoKT8uaXNSZWFkeSgpID8/IGZhbHNlO1xuICB9XG5cbiAgaXNEb3duKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNsaWVudCgpPy5pc0Rvd24oKSA/PyBmYWxzZTtcbiAgfVxuXG4gIGRpc3BhdGNoKHNpZ25hbDogUGVuQnV0dG9uU2lnbmFsKTogdm9pZCB7XG4gICAgdGhpcy5yb3V0ZSgpPy5vbkV4dGVybmFsQnV0dG9uKHNpZ25hbCk7XG4gIH1cblxuICByb3V0ZSgpOiBSb3V0ZWRQZW5UYXJnZXQgfCBudWxsIHtcbiAgICBjb25zdCBub3cgPSB0aGlzLm5vdygpO1xuICAgIGxldCBiZXN0OiBSb3V0ZWRQZW5UYXJnZXQgfCBudWxsID0gbnVsbDtcbiAgICBmb3IgKGNvbnN0IHRhcmdldCBvZiB0aGlzLnRhcmdldHMpIHtcbiAgICAgIGlmIChub3cgLSB0YXJnZXQubGFzdFBlbkFjdGl2aXR5QXQgPiBSRUNFTlRfTVMpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFiZXN0IHx8IHRhcmdldC5sYXN0UGVuQWN0aXZpdHlBdCA+IGJlc3QubGFzdFBlbkFjdGl2aXR5QXQpIGJlc3QgPSB0YXJnZXQ7XG4gICAgfVxuICAgIHJldHVybiBiZXN0ID8/IHRoaXMuZmFsbGJhY2soKTtcbiAgfVxufVxuIiwgImltcG9ydCB7IFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IFBlbkV2ZW50UHJvYmUgfSBmcm9tIFwiLi4vZGlhZ25vc3RpY3MvUGVuRXZlbnRQcm9iZVwiO1xuaW1wb3J0IHsgaXNEaWFnbm9zdGljQnVpbGQgfSBmcm9tIFwiLi4vZGlhZ25vc3RpY3MvcmVwb3J0XCI7XG5pbXBvcnQgdHlwZSBTdHlsdXNDb250cm9sc1BsdWdpbiBmcm9tIFwiLi4vbWFpblwiO1xuaW1wb3J0IHsgZGVjb2RlUGFpcmluZ0NvZGUgfSBmcm9tIFwiLi4vcGVuYnJpZGdlL3Byb3RvY29sXCI7XG5pbXBvcnQge1xuICBOVU1FUklDX1NFVFRJTkdfTElNSVRTLFxuICBwYXJzZU51bWVyaWNTZXR0aW5nLFxuICB0eXBlIEJhcnJlbEJ1dHRvbk1hc2ssXG4gIHR5cGUgRXJhc2VyU3RyYXRlZ3ksXG4gIHR5cGUgTWlkU3Ryb2tlUHJlc3MsXG4gIHR5cGUgTnVtZXJpY1NldHRpbmdLZXksXG4gIHR5cGUgU3R5bHVzQWN0aW9uLFxufSBmcm9tIFwiLi9zZXR0aW5nc1wiO1xuXG5jb25zdCBhY3Rpb25zOiBSZWNvcmQ8U3R5bHVzQWN0aW9uLCBzdHJpbmc+ID0ge1xuICBtZW51OiBcIk9wZW4gbWVudVwiLFxuICBjb3B5OiBcIkNvcHlcIixcbiAgcGFzdGU6IFwiUGFzdGVcIixcbiAgbm9uZTogXCJEbyBub3RoaW5nXCIsXG59O1xuXG5jb25zdCB0ZXN0UHJvZmlsZXM6IFJlY29yZDxcbiAgc3RyaW5nLFxuICB7IGxhYmVsOiBzdHJpbmc7IG1hc2s6IEJhcnJlbEJ1dHRvbk1hc2s7IHByaW1hcnlDb250YWN0TW9kZTogXCJob3Zlci1vbmx5XCIgfCBcImV4cGVyaW1lbnRhbFwiIH1cbj4gPSB7XG4gIFwic3RhbmRhcmRcIjoge1xuICAgIGxhYmVsOiBcIlN0YW5kYXJkIGJhcnJlbCBcdTIwMTQgYnV0dG9uczogMlwiLFxuICAgIG1hc2s6IDIsXG4gICAgcHJpbWFyeUNvbnRhY3RNb2RlOiBcImhvdmVyLW9ubHlcIixcbiAgfSxcbiAgXCJhbmRyb2lkLWhvdmVyXCI6IHtcbiAgICBsYWJlbDogXCJBbmRyb2lkL1dlYlZpZXcgcHJpbWFyeSBcdTIwMTQgYnV0dG9uczogMSwgaG92ZXIgb25seVwiLFxuICAgIG1hc2s6IDEsXG4gICAgcHJpbWFyeUNvbnRhY3RNb2RlOiBcImhvdmVyLW9ubHlcIixcbiAgfSxcbiAgXCJhbmRyb2lkLWNvbnRhY3RcIjoge1xuICAgIGxhYmVsOiBcIkFuZHJvaWQvV2ViVmlldyBwcmltYXJ5IFx1MjAxNCBidXR0b25zOiAxLCBjb250YWN0IGV4cGVyaW1lbnRcIixcbiAgICBtYXNrOiAxLFxuICAgIHByaW1hcnlDb250YWN0TW9kZTogXCJleHBlcmltZW50YWxcIixcbiAgfSxcbiAgXCJhdXhpbGlhcnlcIjoge1xuICAgIGxhYmVsOiBcIkF1eGlsaWFyeS9taWRkbGUgXHUyMDE0IGJ1dHRvbnM6IDRcIixcbiAgICBtYXNrOiA0LFxuICAgIHByaW1hcnlDb250YWN0TW9kZTogXCJob3Zlci1vbmx5XCIsXG4gIH0sXG4gIFwiYmFja1wiOiB7IGxhYmVsOiBcIkJhY2sgXHUyMDE0IGJ1dHRvbnM6IDhcIiwgbWFzazogOCwgcHJpbWFyeUNvbnRhY3RNb2RlOiBcImhvdmVyLW9ubHlcIiB9LFxuICBcImZvcndhcmRcIjogeyBsYWJlbDogXCJGb3J3YXJkIFx1MjAxNCBidXR0b25zOiAxNlwiLCBtYXNrOiAxNiwgcHJpbWFyeUNvbnRhY3RNb2RlOiBcImhvdmVyLW9ubHlcIiB9LFxuICBcImVyYXNlclwiOiB7IGxhYmVsOiBcIlBlbiBlcmFzZXIgXHUyMDE0IGJ1dHRvbnM6IDMyXCIsIG1hc2s6IDMyLCBwcmltYXJ5Q29udGFjdE1vZGU6IFwiaG92ZXItb25seVwiIH0sXG59O1xuXG5jb25zdCBURVNURVJfR1VJREUgPVxuICBcImh0dHBzOi8vZ2l0aHViLmNvbS9qYW5sZXdza2kvZXhjYWxpZHJhdy1zdHlsdXMtY29udHJvbHMvYmxvYi9tYWluL2RvY3MvVEVTVEVSLUdVSURFLm1kXCI7XG5cbmV4cG9ydCBjbGFzcyBTZXR0aW5nc1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBwcml2YXRlIHByb2JlOiBQZW5FdmVudFByb2JlIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgdW53YXRjaDogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbGl2ZVN0YXR1czogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjaGVja1Jlc3VsdHM6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZmluZ2VycHJpbnRFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBlcmFzZXJSZXN1bHQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbHVnaW46IFN0eWx1c0NvbnRyb2xzUGx1Z2luKSB7XG4gICAgc3VwZXIocGx1Z2luLmFwcCwgcGx1Z2luKTtcbiAgfVxuXG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgdGhpcy50ZWFyZG93bigpO1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb25zdCBkaWFnbm9zdGljID0gaXNEaWFnbm9zdGljQnVpbGQodGhpcy5wbHVnaW4ubWFuaWZlc3QudmVyc2lvbik7XG4gICAgaWYgKGRpYWdub3N0aWMpIHRoaXMucmVuZGVyRGlhZ25vc3RpY3MoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJSZXF1aXJlcyB0aGUgRXhjYWxpZHJhdyBjb21tdW5pdHkgcGx1Z2luLiBDb3B5IGFuZCBwYXN0ZSBhd2FpdCBhIGNvbXBhdGlibGUgRXhjYWxpZHJhdyBpbnRlZ3JhdGlvbiBhbmQgYXJlIGN1cnJlbnRseSB1bmF2YWlsYWJsZS5cIixcbiAgICB9KTtcbiAgICB0aGlzLmFjdGlvbihcIlRhcFwiLCBcImJ1dHRvblRhcEFjdGlvblwiKTtcbiAgICB0aGlzLmFjdGlvbihcIkRvdWJsZSB0YXBcIiwgXCJidXR0b25Eb3VibGVUYXBBY3Rpb25cIik7XG4gICAgdGhpcy5hY3Rpb24oXCJIb2xkXCIsIFwiYnV0dG9uSG9sZEFjdGlvblwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQnV0dG9uICsgcGVuIGNvbnRhY3RcIilcbiAgICAgIC5zZXREZXNjKFwiVGVtcG9yYXJ5IHRvb2wgd2hpbGUgdGhlIHNpZGUgYnV0dG9uIGlzIGhlbGQgZHVyaW5nIHBlbiBjb250YWN0LlwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT5cbiAgICAgICAgZHJvcGRvd25cbiAgICAgICAgICAuYWRkT3B0aW9uKFwiZXJhc2VyXCIsIFwiVGVtcG9yYXJ5IGVyYXNlclwiKVxuICAgICAgICAgIC5hZGRPcHRpb24oXCJub25lXCIsIFwiRG8gbm90aGluZ1wiKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5idXR0b25Db250YWN0QWN0aW9uKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7XG4gICAgICAgICAgICAgIGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlIGFzIFwiZXJhc2VyXCIgfCBcIm5vbmVcIixcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKVxuICAgICAgKTtcbiAgICB0aGlzLm51bWJlcihcIkRvdWJsZS10YXAgaW50ZXJ2YWwgKG1zKVwiLCBcImRvdWJsZVRhcE1zXCIpO1xuICAgIHRoaXMubnVtYmVyKFwiTG9uZy1wcmVzcyBkZWxheSAobXMpXCIsIFwibG9uZ1ByZXNzTXNcIik7XG4gICAgdGhpcy5udW1iZXIoXCJNb3ZlbWVudCB0aHJlc2hvbGQgKHB4KVwiLCBcIm1vdmVtZW50VGhyZXNob2xkUHhcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlMgUGVuIHRlc3QgbW9kZVwiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIFwiU3VwcHJlc3NlcyBtZW51LCBjbGlwYm9hcmQsIGFuZCB0ZW1wb3JhcnktdG9vbCBjaGFuZ2VzIHdoaWxlIHN0aWxsIHNob3dpbmcgcmVjb2duaXplZCBzdGF0ZSBhbmQgZWZmZWN0cyBpbiB0aGUgZGVidWcgb3ZlcmxheS4gVXNlIHRoaXMgd2hpbGUgdHJ5aW5nIHNpZ25hbCBwcm9maWxlcy5cIlxuICAgICAgKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxuICAgICAgICB0b2dnbGVcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Muc3R5bHVzVGVzdE1vZGUpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4gdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBzdHlsdXNUZXN0TW9kZTogdmFsdWUgfSkpXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJTIFBlbiBzaWduYWwgdGVzdCBwcm9maWxlXCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJUcnkgb25lIHByb2ZpbGUgYXQgYSB0aW1lIHdpdGggdGVzdCBtb2RlIGVuYWJsZWQsIHRoZW4gZXhwb3J0IHRoZSB0cmFjZS4gVGhlIEFuZHJvaWQgY29udGFjdCBleHBlcmltZW50IG1heSByZWNvZ25pemUgZXZlcnkgb3JkaW5hcnkgcGVuIHN0cm9rZTsgdXNlIGl0IG9ubHkgaW4gYSBkaXNwb3NhYmxlIGRyYXdpbmcuXCJcbiAgICAgIClcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgZm9yIChjb25zdCBbdmFsdWUsIHByb2ZpbGVdIG9mIE9iamVjdC5lbnRyaWVzKHRlc3RQcm9maWxlcykpXG4gICAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKHZhbHVlLCBwcm9maWxlLmxhYmVsKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUodGhpcy5jdXJyZW50VGVzdFByb2ZpbGUoKSkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uc3QgcHJvZmlsZSA9IHRlc3RQcm9maWxlc1t2YWx1ZV07XG4gICAgICAgICAgaWYgKCFwcm9maWxlKSByZXR1cm47XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3Moe1xuICAgICAgICAgICAgYmFycmVsQnV0dG9uTWFzazogcHJvZmlsZS5tYXNrLFxuICAgICAgICAgICAgcHJpbWFyeUNvbnRhY3RNb2RlOiBwcm9maWxlLnByaW1hcnlDb250YWN0TW9kZSxcbiAgICAgICAgICAgIHN0eWx1c1Rlc3RNb2RlOiB0cnVlLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIHRoaXMucmVuZGVyQnJpZGdlKCk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlYnVnIGxvZ2dpbmdcIilcbiAgICAgIC5zZXREZXNjKFwiTG9ncyBib3VuZGVkIHJhdyBwZW4gZXZlbnQgdHJhY2VzIHRvIHRoZSBkZXZlbG9wZXIgY29uc29sZS5cIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cbiAgICAgICAgdG9nZ2xlXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlYnVnTW9kZSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IGRlYnVnTW9kZTogdmFsdWUgfSkpXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWJ1ZyBvdmVybGF5XCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJTaG93cyB0aGUgbGF0ZXN0IHBlbiBldmVudCBhbmQgc3R5bHVzIHN0YXRlIGluIHRoZSBFeGNhbGlkcmF3IHZpZXcuIFJlcXVpcmVzIGRlYnVnIGxvZ2dpbmcuXCJcbiAgICAgIClcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cbiAgICAgICAgdG9nZ2xlXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlYnVnT3ZlcmxheSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IGRlYnVnT3ZlcmxheTogdmFsdWUgfSkpXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJFeHBvcnQgZGVidWcgdHJhY2VcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIkNvcGllcyBidWZmZXJlZCBwZW4gZXZlbnRzIGZyb20gZXZlcnkgb3BlbiBFeGNhbGlkcmF3IHZpZXcgYXMgSlNPTiwgcmVhZHkgdG8gYXR0YWNoIHRvIGEgYnVnIHJlcG9ydC5cIlxuICAgICAgKVxuICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PlxuICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIkNvcHkgdHJhY2VcIikub25DbGljaygoKSA9PiB0aGlzLnBsdWdpbi5jb3B5U3R5bHVzRXZlbnRUcmFjZSgpKVxuICAgICAgKTtcbiAgICBpZiAoIWRpYWdub3N0aWMpIHRoaXMucmVuZGVyRGlhZ25vc3RpY3MoKTtcbiAgICB0aGlzLnVud2F0Y2ggPSB0aGlzLnBsdWdpbi53YXRjaEJyaWRnZSgoKSA9PiB0aGlzLnJlZnJlc2hMaXZlKCkpO1xuICB9XG5cbiAgaGlkZSgpOiB2b2lkIHtcbiAgICB0aGlzLnRlYXJkb3duKCk7XG4gICAgc3VwZXIuaGlkZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSB0ZWFyZG93bigpOiB2b2lkIHtcbiAgICB0aGlzLnVud2F0Y2g/LigpO1xuICAgIHRoaXMudW53YXRjaCA9IG51bGw7XG4gICAgdGhpcy5wcm9iZT8uZGlzcG9zZSgpO1xuICAgIHRoaXMucHJvYmUgPSBudWxsO1xuICAgIHRoaXMubGl2ZVN0YXR1cyA9IG51bGw7XG4gICAgdGhpcy5jaGVja1Jlc3VsdHMgPSBudWxsO1xuICAgIHRoaXMuZmluZ2VycHJpbnRFbCA9IG51bGw7XG4gICAgdGhpcy5lcmFzZXJSZXN1bHQgPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJEaWFnbm9zdGljcygpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkRpYWdub3N0aWNzXCIgfSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiSG93IHRvIHRlc3Q6IGRvY3MvVEVTVEVSLUdVSURFLm1kLiBUaGUgcmVwb3J0IG5ldmVyIGluY2x1ZGVzIHRoZSBwYWlyaW5nIGNvZGUsIHZhdWx0IG5hbWUsIG5vdGUgdGV4dCwgb3IgcG9pbnRlciBjb29yZGluYXRlcy5cIixcbiAgICB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImFcIiwgeyB0ZXh0OiBcIkhvdyB0byB0ZXN0XCIsIGhyZWY6IFRFU1RFUl9HVUlERSB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogYFBsdWdpbiAke3RoaXMucGx1Z2luLm1hbmlmZXN0LnZlcnNpb259LiBPcGVuIGEgbmV3IGVtcHR5IGRyYXdpbmcgYmVmb3JlIHRoZSBlcmFzZXIgdGVzdC5gLFxuICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJDaGVjayBicmlkZ2UgY29ubmVjdGlvblwiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIFwiVHJpZXMgSFRUUCwgV2ViU29ja2V0LCBoZWxsbywgcGFpcmluZywgYW5kIHRoZSBwZW4gc291cmNlLiBOb3RoaW5nIGVsc2UgbmVlZHMgdG8gYmUgb3Blbi5cIlxuICAgICAgKVxuICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PlxuICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIkNoZWNrXCIpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgIGJ1dHRvbi5zZXREaXNhYmxlZCh0cnVlKTtcbiAgICAgICAgICBpZiAodGhpcy5jaGVja1Jlc3VsdHMpIHRoaXMuY2hlY2tSZXN1bHRzLnNldFRleHQoXCJDaGVja2luZ1x1MjAyNlwiKTtcbiAgICAgICAgICB2b2lkIHRoaXMucGx1Z2luLmNoZWNrQnJpZGdlKCkudGhlbigoY2hlY2tzKSA9PiB7XG4gICAgICAgICAgICBidXR0b24uc2V0RGlzYWJsZWQoZmFsc2UpO1xuICAgICAgICAgICAgaWYgKHRoaXMuY2hlY2tSZXN1bHRzKVxuICAgICAgICAgICAgICB0aGlzLmNoZWNrUmVzdWx0cy5zZXRUZXh0KHRoaXMucGx1Z2luLmJyaWRnZUNoZWNrTGluZXMoKS5qb2luKFwiXFxuXCIpKTtcbiAgICAgICAgICAgIHZvaWQgY2hlY2tzO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB0aGlzLmNoZWNrUmVzdWx0cyA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicHJlXCIpO1xuICAgIHRoaXMuY2hlY2tSZXN1bHRzLnNldFRleHQodGhpcy5wbHVnaW4uYnJpZGdlQ2hlY2tMaW5lcygpLmpvaW4oXCJcXG5cIikpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIkxpdmUgYnJpZGdlIHN0YXR1c1wiIH0pO1xuICAgIHRoaXMubGl2ZVN0YXR1cyA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiKTtcbiAgICB0aGlzLnJlZnJlc2hMaXZlKCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IFwiUGVuIGV2ZW50IHByb2JlXCIgfSk7XG4gICAgdGhpcy5wcm9iZSA9IG5ldyBQZW5FdmVudFByb2JlKGNvbnRhaW5lckVsLCAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5wcm9iZSkgdGhpcy5wbHVnaW4uc2V0UHJvYmVFdmVudHModGhpcy5wcm9iZS5zbmFwc2hvdCgpKTtcbiAgICB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogXCJFeGNhbGlkcmF3IGNoZWNrXCIgfSk7XG4gICAgdGhpcy5lcmFzZXJSZXN1bHQgPSBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiB0aGlzLnBsdWdpbi50ZW1wb3JhcnlFcmFzZXJOb3RlIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJUZXN0IHRlbXBvcmFyeSBlcmFzZXJcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICAnU2hvd3MgXCJPcGVuIGEgbmV3LCBlbXB0eSBkcmF3aW5nIGZpcnN0XCIgdW5sZXNzIGFuIEV4Y2FsaWRyYXcgdmlldyBpcyBhY3RpdmUsIHRoZW4gYXNrcyBiZWZvcmUgcnVubmluZy4nXG4gICAgICApXG4gICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+XG4gICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiVGVzdCB0ZW1wb3JhcnkgZXJhc2VyXCIpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgIHZvaWQgdGhpcy5wbHVnaW4ucnVuVGVtcG9yYXJ5RXJhc2VyVGVzdCgpLnRoZW4oKG5vdGUpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmVyYXNlclJlc3VsdCkgdGhpcy5lcmFzZXJSZXN1bHQuc2V0VGV4dChub3RlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkNvcHkgcmVwb3J0XCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJDb3BpZXMgYSBzaG9ydCBzdW1tYXJ5IGFuZCBhIEpTT04gYmxvY2suIFlvdSBjYW4gYWxzbyBydW4gXHUyMDFDQ29weSBkaWFnbm9zdGljcyByZXBvcnRcdTIwMUQgZnJvbSB0aGUgY29tbWFuZCBwYWxldHRlLlwiXG4gICAgICApXG4gICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+XG4gICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiQ29weSByZXBvcnRcIikub25DbGljaygoKSA9PiB2b2lkIHRoaXMucGx1Z2luLmNvcHlEaWFnbm9zdGljc1JlcG9ydCgpKVxuICAgICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQnJpZGdlKCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiUyBQZW4gYnJpZGdlIChBbmRyb2lkIGNvbXBhbmlvbilcIiB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJUdXJuIG9mZiBTYW1zdW5nIEFpciBjb21tYW5kLCBvciBhIGhvdmVyIHByZXNzIGNhbiBvcGVuIHRoYXQgcGFuZWwgaW5zdGVhZCBvZiByZWFjaGluZyBPYnNpZGlhbi4gV2l0aG91dCB0aGUgYnJpZGdlLCBBbmRyb2lkIHVzZXMgdGhlIGhvdmVyLWxhdGNoIGZhbGxiYWNrLlwiLFxuICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJFbmFibGUgYnJpZGdlXCIpXG4gICAgICAuc2V0RGVzYyhcIkNvbm5lY3RzIHdoaWxlIGFuIEV4Y2FsaWRyYXcgdmlldyBpcyBvcGVuIGFuZCB0aGlzIG5vdGUgaXMgdmlzaWJsZS5cIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cbiAgICAgICAgdG9nZ2xlXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnBlbkJyaWRnZUVuYWJsZWQpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4gdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBwZW5CcmlkZ2VFbmFibGVkOiB2YWx1ZSB9KSlcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlBhaXJpbmcgY29kZVwiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIFwiUGFzdGUgdGhlIGNvZGUgZnJvbSB0aGUgYnJpZGdlIGFwcC4gSXQgaXMgc3RvcmVkIG9uIHRoaXMgZGV2aWNlIG9ubHksIG5vdCBpbiB0aGUgdmF1bHQuXCJcbiAgICAgIClcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuaW5wdXRFbC50eXBlID0gXCJwYXNzd29yZFwiO1xuICAgICAgICB0ZXh0LnNldFBsYWNlaG9sZGVyKFwiUGFpcmluZyBjb2RlXCIpO1xuICAgICAgICB0ZXh0LnNldFZhbHVlKHRoaXMucGx1Z2luLnBhaXJpbmdDb2RlKCkpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4gdm9pZCB0aGlzLmNvbW1pdFBhaXJpbmcodmFsdWUpKTtcbiAgICAgIH0pXG4gICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+XG4gICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiUGFzdGVcIikub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgdm9pZCBuYXZpZ2F0b3IuY2xpcGJvYXJkLnJlYWRUZXh0KCkudGhlbigodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHZvaWQgdGhpcy5jb21taXRQYWlyaW5nKHZhbHVlKTtcbiAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB0aGlzLmZpbmdlcnByaW50RWwgPSBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiB0aGlzLmZpbmdlcnByaW50TGFiZWwoKSB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiU3RhdHVzXCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJSZWFkeSBtZWFucyBtaWQtc3Ryb2tlIGVyYXNlIGNhbiB1c2UgdGhlIGJyaWRnZS4gUmVjb25uZWN0IGFmdGVyIGEgd3JvbmcgY29kZSBvciBhIHByb3RvY29sIGVycm9yLlwiXG4gICAgICApXG4gICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+XG4gICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiUmVjb25uZWN0XCIpLm9uQ2xpY2soKCkgPT4gdGhpcy5wbHVnaW4ucmVjb25uZWN0QnJpZGdlKCkpXG4gICAgICApO1xuICAgIHRoaXMubnVtYmVyKFxuICAgICAgXCJMYXRlIHByZXNzIHdpbmRvdyAobXMpXCIsXG4gICAgICBcImxhdGVXaW5kb3dNc1wiLFxuICAgICAgXCJXaG9sZSBtaWxsaXNlY29uZHMgZnJvbSAwIHRvIDEwMC4gUHJlc3NlcyBpbnNpZGUgdGhpcyB3aW5kb3cgZGVsZXRlIHRoZSB0aW55IGluayBkb3QuXCJcbiAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJNaWQtc3Ryb2tlIHByZXNzXCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJTcGxpdCB0dXJucyB0aGUgcmVzdCBvZiB0aGUgY3VycmVudCBzdHJva2UgaW50byB0aGUgZXJhc2VyLiBOZXh0IGNvbnRhY3Qgd2FpdHMgdW50aWwgeW91IGxpZnQuXCJcbiAgICAgIClcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+XG4gICAgICAgIGRyb3Bkb3duXG4gICAgICAgICAgLmFkZE9wdGlvbihcInNwbGl0XCIsIFwiU3BsaXQgdGhpcyBzdHJva2VcIilcbiAgICAgICAgICAuYWRkT3B0aW9uKFwibmV4dC1jb250YWN0XCIsIFwiRXJhc2UgdGhlIG5leHQgY29udGFjdFwiKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5taWRTdHJva2VQcmVzcylcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PlxuICAgICAgICAgICAgdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBtaWRTdHJva2VQcmVzczogdmFsdWUgYXMgTWlkU3Ryb2tlUHJlc3MgfSlcbiAgICAgICAgICApXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJFcmFzZXIgbWV0aG9kXCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJTeW50aGV0aWMgYnV0dG9uIDUgdXNlcyBFeGNhbGlkcmF3J3MgbW9tZW50YXJ5IGVyYXNlci4gU2V0IGFjdGl2ZSB0b29sIGlzIHRoZSBmYWxsYmFjay5cIlxuICAgICAgKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT5cbiAgICAgICAgZHJvcGRvd25cbiAgICAgICAgICAuYWRkT3B0aW9uKFwic3ludGhldGljLWJ1dHRvbjVcIiwgXCJTeW50aGV0aWMgYnV0dG9uIDVcIilcbiAgICAgICAgICAuYWRkT3B0aW9uKFwic2V0LWFjdGl2ZS10b29sXCIsIFwiU2V0IGFjdGl2ZSB0b29sXCIpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmVyYXNlclN0cmF0ZWd5KVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IGVyYXNlclN0cmF0ZWd5OiB2YWx1ZSBhcyBFcmFzZXJTdHJhdGVneSB9KVxuICAgICAgICAgIClcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlN1cHByZXNzIGhvdmVyIGJ1dHRvbiBldmVudHNcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIlN0b3BzIGEgemVyby1wcmVzc3VyZSBwZW4gZXZlbnQgd2l0aCBidXR0b25zIDEgZnJvbSBzdGFydGluZyBhIHN0cm9rZSBpbiBtaWQtYWlyIHdoaWxlIHRoZSBiYXJyZWwgaXMgaGVsZC5cIlxuICAgICAgKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxuICAgICAgICB0b2dnbGVcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Muc3VwcHJlc3NIb3ZlckJ1dHRvbkV2ZW50cylcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PlxuICAgICAgICAgICAgdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBzdXBwcmVzc0hvdmVyQnV0dG9uRXZlbnRzOiB2YWx1ZSB9KVxuICAgICAgICAgIClcbiAgICAgICk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNvbW1pdFBhaXJpbmcodmFsdWU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHRyaW1tZWQgPSB2YWx1ZS50cmltKCk7XG4gICAgaWYgKCF0cmltbWVkKSBhd2FpdCB0aGlzLnBsdWdpbi5jbGVhclBhaXJpbmdDb2RlKCk7XG4gICAgZWxzZSBpZiAoZGVjb2RlUGFpcmluZ0NvZGUodHJpbW1lZCkpIGF3YWl0IHRoaXMucGx1Z2luLnNldFBhaXJpbmdDb2RlKHRyaW1tZWQpO1xuICAgIGlmICh0aGlzLmZpbmdlcnByaW50RWwpIHRoaXMuZmluZ2VycHJpbnRFbC5zZXRUZXh0KHRoaXMuZmluZ2VycHJpbnRMYWJlbCgpKTtcbiAgICB0aGlzLnJlZnJlc2hMaXZlKCk7XG4gIH1cblxuICBwcml2YXRlIGZpbmdlcnByaW50TGFiZWwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5wbHVnaW4ucGFpcmluZ0ZpbmdlcnByaW50XG4gICAgICA/IGBGaW5nZXJwcmludCAke3RoaXMucGx1Z2luLnBhaXJpbmdGaW5nZXJwcmludH0gKG11c3QgbWF0Y2ggdGhlIGJyaWRnZSBhcHApYFxuICAgICAgOiBcIkZpbmdlcnByaW50OiBwYXN0ZSBhIHZhbGlkIHBhaXJpbmcgY29kZS4gSXQgbXVzdCBtYXRjaCB0aGUgYnJpZGdlIGFwcC5cIjtcbiAgfVxuXG4gIHByaXZhdGUgcmVmcmVzaExpdmUoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubGl2ZVN0YXR1cykgdGhpcy5saXZlU3RhdHVzLnNldFRleHQodGhpcy5wbHVnaW4uYnJpZGdlU3RhdHVzVGV4dCgpKTtcbiAgfVxuXG4gIHByaXZhdGUgYWN0aW9uKFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBrZXk6IFwiYnV0dG9uVGFwQWN0aW9uXCIgfCBcImJ1dHRvbkRvdWJsZVRhcEFjdGlvblwiIHwgXCJidXR0b25Ib2xkQWN0aW9uXCJcbiAgKTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbCkuc2V0TmFtZShgUyBQZW4gc2lkZSBidXR0b246ICR7bmFtZX1gKS5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgIGZvciAoY29uc3QgW3ZhbHVlLCBsYWJlbF0gb2YgT2JqZWN0LmVudHJpZXMoYWN0aW9ucykpIGRyb3Bkb3duLmFkZE9wdGlvbih2YWx1ZSwgbGFiZWwpO1xuICAgICAgZHJvcGRvd25cbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzW2tleV0pXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgW2tleV06IHZhbHVlIGFzIFN0eWx1c0FjdGlvbiB9KSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIG51bWJlcihuYW1lOiBzdHJpbmcsIGtleTogTnVtZXJpY1NldHRpbmdLZXksIGRlc2M/OiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCB7IG1pbiwgbWF4IH0gPSBOVU1FUklDX1NFVFRJTkdfTElNSVRTW2tleV07XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKG5hbWUpXG4gICAgICAuc2V0RGVzYyhkZXNjID8/IGBXaG9sZSBtaWxsaXNlY29uZHMvcGl4ZWxzIGZyb20gJHttaW59IHRvICR7bWF4fS5gKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XG4gICAgICAgIHRleHQuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzW2tleV0pKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZU51bWVyaWNTZXR0aW5nKGtleSwgdmFsdWUpO1xuICAgICAgICAgIHRleHQuaW5wdXRFbC5zZXRDdXN0b21WYWxpZGl0eShcbiAgICAgICAgICAgIHBhcnNlZCA9PT0gbnVsbCA/IGBFbnRlciBhIHdob2xlIG51bWJlciBmcm9tICR7bWlufSB0byAke21heH0uYCA6IFwiXCJcbiAgICAgICAgICApO1xuICAgICAgICAgIGlmIChwYXJzZWQgPT09IG51bGwpIHJldHVybjtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IFtrZXldOiBwYXJzZWQgfSk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBjdXJyZW50VGVzdFByb2ZpbGUoKTogc3RyaW5nIHtcbiAgICBjb25zdCB7IGJhcnJlbEJ1dHRvbk1hc2ssIHByaW1hcnlDb250YWN0TW9kZSB9ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3M7XG4gICAgcmV0dXJuIChcbiAgICAgIE9iamVjdC5lbnRyaWVzKHRlc3RQcm9maWxlcykuZmluZChcbiAgICAgICAgKFssIHByb2ZpbGVdKSA9PlxuICAgICAgICAgIHByb2ZpbGUubWFzayA9PT0gYmFycmVsQnV0dG9uTWFzayAmJiBwcm9maWxlLnByaW1hcnlDb250YWN0TW9kZSA9PT0gcHJpbWFyeUNvbnRhY3RNb2RlXG4gICAgICApPy5bMF0gPz8gXCJzdGFuZGFyZFwiXG4gICAgKTtcbiAgfVxufVxuIiwgImltcG9ydCB7IGZvcm1hdFByb2JlU3VtbWFyeSwgc3VtbWFyaXplUHJvYmUsIHR5cGUgUHJvYmVFdmVudCB9IGZyb20gXCIuL3Byb2JlU3VtbWFyeVwiO1xuXG5jb25zdCBFVkVOVF9UWVBFUyA9IFtcbiAgXCJwb2ludGVyZG93blwiLFxuICBcInBvaW50ZXJtb3ZlXCIsXG4gIFwicG9pbnRlcnVwXCIsXG4gIFwicG9pbnRlcmNhbmNlbFwiLFxuICBcImNvbnRleHRtZW51XCIsXG5dIGFzIGNvbnN0O1xuXG4vKiogU2V0dGluZ3MtcGFuZSBwYWQuIEl0IGtlZXBzIHRoZSBsYXN0IDUwIHBvaW50ZXIgZXZlbnRzIGFuZCBuZXZlciBzdG9yZXMgY29vcmRpbmF0ZXMuICovXG5leHBvcnQgY2xhc3MgUGVuRXZlbnRQcm9iZSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgZXZlbnRzOiBQcm9iZUV2ZW50W10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBzdGFydGVkID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgYm94OiBIVE1MRWxlbWVudDtcbiAgcHJpdmF0ZSByZWFkb25seSBzdW1tYXJ5OiBIVE1MRWxlbWVudDtcbiAgcHJpdmF0ZSByZWFkb25seSBsaXN0ZW5lcnM6IEFycmF5PFtzdHJpbmcsIEV2ZW50TGlzdGVuZXJdPiA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHBhcmVudDogSFRNTEVsZW1lbnQsXG4gICAgcHJpdmF0ZSByZWFkb25seSBvbkNoYW5nZT86ICgpID0+IHZvaWRcbiAgKSB7XG4gICAgdGhpcy5ib3ggPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcImV4Y2FsaWRyYXctc3R5bHVzLXByb2JlXCIgfSk7XG4gICAgdGhpcy5ib3guc2V0VGV4dChcbiAgICAgIFwiSG92ZXIgdGhlIFMgUGVuIGhlcmUsIHByZXNzIGFuZCByZWxlYXNlIHRoZSBzaWRlIGJ1dHRvbiwgdGhlbiB0b3VjaCBhbmQgZHJhdyB3aGlsZSBwcmVzc2luZyBpdFwiXG4gICAgKTtcbiAgICB0aGlzLnN1bW1hcnkgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcImV4Y2FsaWRyYXctc3R5bHVzLXByb2JlLXN1bW1hcnlcIiB9KTtcbiAgICBmb3IgKGNvbnN0IHR5cGUgb2YgRVZFTlRfVFlQRVMpIHtcbiAgICAgIGNvbnN0IGxpc3RlbmVyOiBFdmVudExpc3RlbmVyID0gKGV2ZW50KSA9PiB0aGlzLnJlY29yZChldmVudCBhcyBQb2ludGVyRXZlbnQpO1xuICAgICAgdGhpcy5ib3guYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcik7XG4gICAgICB0aGlzLmxpc3RlbmVycy5wdXNoKFt0eXBlLCBsaXN0ZW5lcl0pO1xuICAgIH1cbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgc25hcHNob3QoKTogUHJvYmVFdmVudFtdIHtcbiAgICByZXR1cm4gdGhpcy5ldmVudHMubWFwKChldmVudCkgPT4gKHsgLi4uZXZlbnQgfSkpO1xuICB9XG5cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IFt0eXBlLCBsaXN0ZW5lcl0gb2YgdGhpcy5saXN0ZW5lcnMpIHRoaXMuYm94LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpO1xuICAgIHRoaXMubGlzdGVuZXJzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5ib3gucmVtb3ZlKCk7XG4gICAgdGhpcy5zdW1tYXJ5LnJlbW92ZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWNvcmQoZXZlbnQ6IFBvaW50ZXJFdmVudCk6IHZvaWQge1xuICAgIGlmIChldmVudC50eXBlID09PSBcImNvbnRleHRtZW51XCIpIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdGhpcy5ldmVudHMucHVzaCh7XG4gICAgICB0OiBNYXRoLm1heCgwLCBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdGhpcy5zdGFydGVkKSksXG4gICAgICB0eXBlOiBldmVudC50eXBlLFxuICAgICAgcG9pbnRlclR5cGU6IGV2ZW50LnBvaW50ZXJUeXBlIHx8IFwibW91c2VcIixcbiAgICAgIGJ1dHRvbjogZXZlbnQuYnV0dG9uLFxuICAgICAgYnV0dG9uczogZXZlbnQuYnV0dG9ucyxcbiAgICAgIHByZXNzdXJlOiBNYXRoLnJvdW5kKGV2ZW50LnByZXNzdXJlICogMTAwKSAvIDEwMCxcbiAgICAgIHBoYXNlOiBldmVudC5wcmVzc3VyZSA+IDAgPyBcImNvbnRhY3RcIiA6IFwiaG92ZXJcIixcbiAgICB9KTtcbiAgICBpZiAodGhpcy5ldmVudHMubGVuZ3RoID4gNTApIHRoaXMuZXZlbnRzLnNoaWZ0KCk7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgICB0aGlzLm9uQ2hhbmdlPy4oKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyKCk6IHZvaWQge1xuICAgIHRoaXMuc3VtbWFyeS5zZXRUZXh0KGZvcm1hdFByb2JlU3VtbWFyeShzdW1tYXJpemVQcm9iZSh0aGlzLmV2ZW50cykpKTtcbiAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgR2VzdHVyZUVmZmVjdCwgR2VzdHVyZVN0YXRlU25hcHNob3QsIE5vcm1hbGl6ZWRTdHlsdXNFdmVudCB9IGZyb20gXCIuLi9zdHlsdXMvdHlwZXNcIjtcblxuLyoqIEEgZGlhZ25vc3RpYy1vbmx5LCBub24taW50ZXJhY3RpdmUgb3ZlcmxheSBsb2NhbCB0byBvbmUgRXhjYWxpZHJhdyB2aWV3LiAqL1xuZXhwb3J0IGNsYXNzIERlYnVnT3ZlcmxheSB7XG4gIHByaXZhdGUgZWxlbWVudDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXG4gICAgcHJpdmF0ZSByZWFkb25seSBlbmFibGVkOiAoKSA9PiBib29sZWFuXG4gICkge31cblxuICB1cGRhdGUoXG4gICAgZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCxcbiAgICBzdGF0ZTogR2VzdHVyZVN0YXRlU25hcHNob3QsXG4gICAgZWZmZWN0PzogR2VzdHVyZUVmZmVjdCxcbiAgICBzdGF0dXNMaW5lPzogc3RyaW5nXG4gICk6IHZvaWQge1xuICAgIGlmICghdGhpcy5lbmFibGVkKCkpIHtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgb3ZlcmxheSA9IHRoaXMuZW5zdXJlRWxlbWVudCgpO1xuICAgIGNvbnN0IHN0YXRlU3VtbWFyeSA9IFtcbiAgICAgIGBob3Zlcjoke1N0cmluZyghc3RhdGUucGVuQ29udGFjdCl9YCxcbiAgICAgIGBiYXJyZWw6JHtTdHJpbmcoc3RhdGUuYmFycmVsQnV0dG9uSGVsZCl9YCxcbiAgICAgIGBjb25zdW1lZDoke1N0cmluZyhzdGF0ZS5nZXN0dXJlQ29uc3VtZWQpfWAsXG4gICAgICBgdGVtcDoke1N0cmluZyhzdGF0ZS50ZW1wb3JhcnlUb29sQWN0aXZlKX1gLFxuICAgIF0uam9pbihcIiBcdTAwQjcgXCIpO1xuICAgIG92ZXJsYXkuc2V0VGV4dChcbiAgICAgIFtcbiAgICAgICAgYFMgUGVuICR7ZXZlbnQua2luZH0gaWQ6JHtldmVudC5wb2ludGVySWR9IGJ1dHRvbjoke2V2ZW50LmJ1dHRvbn0gYnV0dG9uczoke2V2ZW50LmJ1dHRvbnN9IHByZXNzdXJlOiR7ZXZlbnQucHJlc3N1cmUudG9GaXhlZCgyKX1gLFxuICAgICAgICBgdGlsdDoke2V2ZW50LnRpbHRYfSwke2V2ZW50LnRpbHRZfSB0d2lzdDoke2V2ZW50LnR3aXN0fSB0YW5nZW50aWFsOiR7ZXZlbnQudGFuZ2VudGlhbFByZXNzdXJlLnRvRml4ZWQoMil9IHNpemU6JHtldmVudC53aWR0aH14JHtldmVudC5oZWlnaHR9YCxcbiAgICAgICAgc3RhdGVTdW1tYXJ5LFxuICAgICAgICBgZWZmZWN0OiR7ZWZmZWN0Py50eXBlID8/IFwibm9uZVwifWAsXG4gICAgICAgIHN0YXR1c0xpbmUgPz8gXCJcIixcbiAgICAgIF1cbiAgICAgICAgLmZpbHRlcigobGluZSkgPT4gbGluZS5sZW5ndGggPiAwKVxuICAgICAgICAuam9pbihcIlxcblwiKVxuICAgICk7XG4gIH1cblxuICBjbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmVsZW1lbnQ/LnJlbW92ZSgpO1xuICAgIHRoaXMuZWxlbWVudCA9IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUVsZW1lbnQoKTogSFRNTEVsZW1lbnQge1xuICAgIGlmICh0aGlzLmVsZW1lbnQpIHJldHVybiB0aGlzLmVsZW1lbnQ7XG4gICAgdGhpcy5lbGVtZW50ID0gdGhpcy5jb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcImV4Y2FsaWRyYXctc3R5bHVzLWRlYnVnLW92ZXJsYXlcIiB9KTtcbiAgICByZXR1cm4gdGhpcy5lbGVtZW50O1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBOb3JtYWxpemVkU3R5bHVzRXZlbnQsIFN0eWx1c0V2ZW50S2luZCB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCB0eXBlIFBlblBoYXNlID0gXCJjb250YWN0XCIgfCBcImhvdmVyXCIgfCBcImhvdmVyLWJ1dHRvblwiO1xuXG4vKiogSG92ZXItYnV0dG9uIGV2ZW50cyBhcmUgemVyby1wcmVzc3VyZSBwZW4gZXZlbnRzIHdpdGggdGhlIHByaW1hcnkgYml0IHdoaWxlIHRoZSBiYXJyZWwgaXMgaGVsZC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc2lmeVBlbkV2ZW50KFxuICBldmVudDogeyBwb2ludGVyVHlwZTogc3RyaW5nOyBwcmVzc3VyZTogbnVtYmVyOyBidXR0b25zOiBudW1iZXI7IHR5cGU6IHN0cmluZyB9LFxuICBoZWxkOiBib29sZWFuXG4pOiBQZW5QaGFzZSB7XG4gIGNvbnN0IGhvdmVyUHJlc3N1cmUgPSBldmVudC5wcmVzc3VyZSA8IDAuMDE7XG4gIGNvbnN0IGJ1dHRvblR5cGUgPVxuICAgIGV2ZW50LnR5cGUgPT09IFwicG9pbnRlcmRvd25cIiB8fCBldmVudC50eXBlID09PSBcInBvaW50ZXJtb3ZlXCIgfHwgZXZlbnQudHlwZSA9PT0gXCJwb2ludGVydXBcIjtcbiAgaWYgKFxuICAgIGV2ZW50LnBvaW50ZXJUeXBlID09PSBcInBlblwiICYmXG4gICAgaG92ZXJQcmVzc3VyZSAmJlxuICAgIChldmVudC5idXR0b25zICYgMSkgIT09IDAgJiZcbiAgICBidXR0b25UeXBlICYmXG4gICAgaGVsZFxuICApIHtcbiAgICByZXR1cm4gXCJob3Zlci1idXR0b25cIjtcbiAgfVxuICBpZiAoZXZlbnQucG9pbnRlclR5cGUgPT09IFwicGVuXCIgJiYgKGV2ZW50LnR5cGUgPT09IFwicG9pbnRlcmRvd25cIiB8fCBldmVudC5wcmVzc3VyZSA+PSAwLjAxKSkge1xuICAgIHJldHVybiBcImNvbnRhY3RcIjtcbiAgfVxuICByZXR1cm4gXCJob3ZlclwiO1xufVxuXG5jb25zdCBldmVudEtpbmRzOiBSZWNvcmQ8c3RyaW5nLCBTdHlsdXNFdmVudEtpbmQ+ID0ge1xuICBwb2ludGVyZG93bjogXCJkb3duXCIsXG4gIHBvaW50ZXJtb3ZlOiBcIm1vdmVcIixcbiAgcG9pbnRlcnVwOiBcInVwXCIsXG4gIHBvaW50ZXJjYW5jZWw6IFwiY2FuY2VsXCIsXG4gIGNvbnRleHRtZW51OiBcImNvbnRleHRtZW51XCIsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplUG9pbnRlckV2ZW50KFxuICBldmVudDogUG9pbnRlckV2ZW50LFxuICBpc0NhbnZhc1RhcmdldDogYm9vbGVhblxuKTogTm9ybWFsaXplZFN0eWx1c0V2ZW50IHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBldmVudEtpbmRzW2V2ZW50LnR5cGVdID8/IFwibW92ZVwiLFxuICAgIHBvaW50ZXJUeXBlOiBldmVudC5wb2ludGVyVHlwZSxcbiAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICBidXR0b25zOiBldmVudC5idXR0b25zLFxuICAgIGJ1dHRvbjogZXZlbnQuYnV0dG9uLFxuICAgIHByZXNzdXJlOiBldmVudC5wcmVzc3VyZSxcbiAgICB0YW5nZW50aWFsUHJlc3N1cmU6IGV2ZW50LnRhbmdlbnRpYWxQcmVzc3VyZSxcbiAgICB0aWx0WDogZXZlbnQudGlsdFgsXG4gICAgdGlsdFk6IGV2ZW50LnRpbHRZLFxuICAgIHR3aXN0OiBldmVudC50d2lzdCxcbiAgICB3aWR0aDogZXZlbnQud2lkdGgsXG4gICAgaGVpZ2h0OiBldmVudC5oZWlnaHQsXG4gICAgeDogZXZlbnQuY2xpZW50WCxcbiAgICB5OiBldmVudC5jbGllbnRZLFxuICAgIHRpbWVzdGFtcDogZXZlbnQudGltZVN0YW1wLFxuICAgIGlzQ2FudmFzVGFyZ2V0LFxuICB9O1xufVxuIiwgImltcG9ydCB0eXBlIHtcbiAgQmFycmVsU291cmNlLFxuICBFeHRlcm5hbEJ1dHRvbklucHV0LFxuICBHZXN0dXJlRWZmZWN0LFxuICBHZXN0dXJlU2V0dGluZ3MsXG4gIEdlc3R1cmVTdGF0ZVNuYXBzaG90LFxuICBOb3JtYWxpemVkU3R5bHVzRXZlbnQsXG4gIFBvaW50LFxuICBTY2hlZHVsZXIsXG59IGZyb20gXCIuL3R5cGVzXCI7XG5cbmludGVyZmFjZSBQZW5kaW5nVGFwIHtcbiAgcG9pbnQ6IFBvaW50O1xuICB0aW1lcjogdW5rbm93bjtcbn1cblxuLyoqIFB1cmUgcGVyLXZpZXcgUyBQZW4gZ2VzdHVyZSBwb2xpY3kuIEl0IG5ldmVyIHRvdWNoZXMgdGhlIERPTSBvciBFeGNhbGlkcmF3LiAqL1xuZXhwb3J0IGNsYXNzIFN0eWx1c0dlc3R1cmVNYWNoaW5lIHtcbiAgcHJpdmF0ZSBiYXJyZWxCdXR0b25IZWxkID0gZmFsc2U7XG4gIHByaXZhdGUgcGVuQ29udGFjdCA9IGZhbHNlO1xuICBwcml2YXRlIGNvbnN1bWVkID0gZmFsc2U7XG4gIHByaXZhdGUgbW92ZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBob2xkRmlyZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSB0ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gIHByaXZhdGUgcHJlc3NPcmlnaW46IFBvaW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaG9sZFRpbWVyOiB1bmtub3duIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGVuZGluZ1RhcDogUGVuZGluZ1RhcCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGFjdGl2ZVBvaW50ZXJJZDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgYmFycmVsU291cmNlOiBCYXJyZWxTb3VyY2UgPSBcInBvaW50ZXJcIjtcbiAgcHJpdmF0ZSBjb250YWN0U3RhcnRlZEF0OiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBsYXN0UG9pbnQ6IFBvaW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcmVsZWFzZUFmdGVyQ29udGFjdCA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2V0dGluZ3M6IEdlc3R1cmVTZXR0aW5ncyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNjaGVkdWxlcjogU2NoZWR1bGVyXG4gICkge31cblxuICAvKiogU3dpdGNoaW5nIHNvdXJjZXMgbXVzdCBub3QgdHVybiBhIGhlbGQgYmFycmVsIGludG8gYSB0YXAuICovXG4gIHNldEJhcnJlbFNvdXJjZShzb3VyY2U6IEJhcnJlbFNvdXJjZSk6IHZvaWQge1xuICAgIGlmIChzb3VyY2UgPT09IHRoaXMuYmFycmVsU291cmNlKSByZXR1cm47XG4gICAgaWYgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCkgdGhpcy5jYW5jZWxQcmVzcygpO1xuICAgIHRoaXMuYmFycmVsU291cmNlID0gc291cmNlO1xuICAgIHRoaXMucmVsZWFzZUFmdGVyQ29udGFjdCA9IGZhbHNlO1xuICB9XG5cbiAgaGFuZGxlKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiBHZXN0dXJlRWZmZWN0W10ge1xuICAgIGlmIChldmVudC5wb2ludGVyVHlwZSAhPT0gXCJwZW5cIikgcmV0dXJuIFtdO1xuICAgIHRoaXMubGFzdFBvaW50ID0geyB4OiBldmVudC54LCB5OiBldmVudC55IH07XG4gICAgY29uc3QgZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdID0gW107XG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwiY29udGV4dG1lbnVcIikge1xuICAgICAgaWYgKHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSB8fCAodGhpcy5iYXJyZWxCdXR0b25IZWxkICYmIHRoaXMucGVuQ29udGFjdCkpXG4gICAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwic3VwcHJlc3MtY29udGV4dC1tZW51XCIgfSk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJkb3duXCIpIHtcbiAgICAgIHRoaXMuY29udGFjdFN0YXJ0ZWRBdCA9IGV2ZW50LnRpbWVzdGFtcDtcbiAgICAgIGlmICh0aGlzLmJhcnJlbFNvdXJjZSAhPT0gXCJicmlkZ2VcIikge1xuICAgICAgICBpZiAoIXRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiB0aGlzLmNhblJlY29nbml6ZUJhcnJlbE9uQ29udGFjdChldmVudCkpXG4gICAgICAgICAgdGhpcy5zdGFydFByZXNzKGV2ZW50KTtcbiAgICAgIH1cbiAgICAgIHRoaXMucGVuQ29udGFjdCA9IHRydWU7XG4gICAgICB0aGlzLmFjdGl2ZVBvaW50ZXJJZCA9IGV2ZW50LnBvaW50ZXJJZDtcbiAgICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQpIHRoaXMuY29uc3VtZUZvckNvbnRhY3QoZXZlbnQsIGVmZmVjdHMpO1xuICAgICAgcmV0dXJuIGVmZmVjdHM7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwidXBcIiB8fCBldmVudC5raW5kID09PSBcImNhbmNlbFwiKSB7XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVySWQgIT09IG51bGwgJiYgZXZlbnQucG9pbnRlcklkICE9PSB0aGlzLmFjdGl2ZVBvaW50ZXJJZCkgcmV0dXJuIGVmZmVjdHM7XG4gICAgICB0aGlzLnBlbkNvbnRhY3QgPSBmYWxzZTtcbiAgICAgIHRoaXMuYWN0aXZlUG9pbnRlcklkID0gbnVsbDtcbiAgICAgIHRoaXMuY29udGFjdFN0YXJ0ZWRBdCA9IG51bGw7XG4gICAgICBpZiAodGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlKSB7XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICBlZmZlY3RzLnB1c2goeyB0eXBlOiBcInRlbXBvcmFyeS10b29sLWVuZFwiIH0pO1xuICAgICAgfVxuICAgICAgaWYgKGV2ZW50LmtpbmQgPT09IFwiY2FuY2VsXCIpIHRoaXMuY2FuY2VsUHJlc3MoKTtcbiAgICAgIGVsc2UgaWYgKHRoaXMuYmFycmVsU291cmNlID09PSBcImJyaWRnZVwiKSB7XG4gICAgICAgIGlmICh0aGlzLnJlbGVhc2VBZnRlckNvbnRhY3QpIHtcbiAgICAgICAgICB0aGlzLnJlbGVhc2VBZnRlckNvbnRhY3QgPSBmYWxzZTtcbiAgICAgICAgICB0aGlzLnJlbGVhc2VQcmVzcyhlZmZlY3RzKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICghdGhpcy5ob3ZlckxhdGNoKCkgJiYgIXRoaXMuaXNCYXJyZWxIZWxkKGV2ZW50KSkgdGhpcy5yZWxlYXNlUHJlc3MoZWZmZWN0cyk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wZW5Db250YWN0KSByZXR1cm4gZWZmZWN0cztcbiAgICBpZiAodGhpcy5iYXJyZWxTb3VyY2UgPT09IFwiYnJpZGdlXCIpIHtcbiAgICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQpIHRoaXMudHJhY2tIb3Zlck1vdmVtZW50KGV2ZW50KTtcbiAgICAgIHJldHVybiBlZmZlY3RzO1xuICAgIH1cbiAgICBjb25zdCBoZWxkTm93ID0gdGhpcy5pc0JhcnJlbEhlbGQoZXZlbnQpO1xuICAgIGlmICghdGhpcy5iYXJyZWxCdXR0b25IZWxkICYmIGhlbGROb3cpIHRoaXMuc3RhcnRQcmVzcyhldmVudCk7XG4gICAgaWYgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiBoZWxkTm93KSB0aGlzLnRyYWNrSG92ZXJNb3ZlbWVudChldmVudCk7XG4gICAgaWYgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiAhaGVsZE5vdykgdGhpcy5yZWxlYXNlUHJlc3MoZWZmZWN0cyk7XG4gICAgcmV0dXJuIGVmZmVjdHM7XG4gIH1cblxuICBoYW5kbGVFeHRlcm5hbEJ1dHRvbihpbnB1dDogRXh0ZXJuYWxCdXR0b25JbnB1dCk6IEdlc3R1cmVFZmZlY3RbXSB7XG4gICAgaWYgKHRoaXMuYmFycmVsU291cmNlICE9PSBcImJyaWRnZVwiKSByZXR1cm4gW107XG4gICAgaWYgKGlucHV0LmRvd24pIHtcbiAgICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQpIHJldHVybiBbXTtcbiAgICAgIGlmICghdGhpcy5wZW5Db250YWN0KSB7XG4gICAgICAgIHRoaXMuc3RhcnRQcmVzcyh0aGlzLnBvaW50T2YodGhpcy5sYXN0UG9pbnQpKTtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuICAgICAgdGhpcy5iYXJyZWxCdXR0b25IZWxkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY29uc3VtZWQgPSB0cnVlO1xuICAgICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICAgIGlmICh0aGlzLnNldHRpbmdzLmJ1dHRvbkNvbnRhY3RBY3Rpb24gIT09IFwiZXJhc2VyXCIgfHwgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlKSByZXR1cm4gW107XG4gICAgICBpZiAodGhpcy5zZXR0aW5ncy5taWRTdHJva2VQcmVzcyA9PT0gXCJuZXh0LWNvbnRhY3RcIikgcmV0dXJuIFtdO1xuICAgICAgY29uc3QgbGF0ZSA9XG4gICAgICAgIHRoaXMuY29udGFjdFN0YXJ0ZWRBdCAhPT0gbnVsbCAmJlxuICAgICAgICBpbnB1dC5wcmVzc2VkQXQgPD0gdGhpcy5jb250YWN0U3RhcnRlZEF0ICsgdGhpcy5zZXR0aW5ncy5sYXRlV2luZG93TXM7XG4gICAgICB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUgPSB0cnVlO1xuICAgICAgcmV0dXJuIFtcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtc3BsaXRcIixcbiAgICAgICAgICBwb2ludDogdGhpcy5wb2ludE9mKHRoaXMubGFzdFBvaW50KSxcbiAgICAgICAgICBkaXNjYXJkU3Ryb2tlOiBsYXRlLFxuICAgICAgICB9LFxuICAgICAgXTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmJhcnJlbEJ1dHRvbkhlbGQpIHJldHVybiBbXTtcbiAgICBpZiAodGhpcy5wZW5Db250YWN0KSB7XG4gICAgICB0aGlzLnJlbGVhc2VBZnRlckNvbnRhY3QgPSB0cnVlO1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCBlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10gPSBbXTtcbiAgICB0aGlzLnJlbGVhc2VQcmVzcyhlZmZlY3RzKTtcbiAgICByZXR1cm4gZWZmZWN0cztcbiAgfVxuXG4gIGRpc3Bvc2UoKTogR2VzdHVyZUVmZmVjdFtdIHtcbiAgICBjb25zdCBlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10gPSBbXTtcbiAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICBpZiAodGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlKSBlZmZlY3RzLnB1c2goeyB0eXBlOiBcInRlbXBvcmFyeS10b29sLWVuZFwiIH0pO1xuICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcbiAgICByZXR1cm4gZWZmZWN0cztcbiAgfVxuXG4gIHNuYXBzaG90KCk6IEdlc3R1cmVTdGF0ZVNuYXBzaG90IHtcbiAgICByZXR1cm4ge1xuICAgICAgYmFycmVsQnV0dG9uSGVsZDogdGhpcy5iYXJyZWxCdXR0b25IZWxkLFxuICAgICAgcGVuQ29udGFjdDogdGhpcy5wZW5Db250YWN0LFxuICAgICAgZ2VzdHVyZUNvbnN1bWVkOiB0aGlzLmNvbnN1bWVkLFxuICAgICAgdGVtcG9yYXJ5VG9vbEFjdGl2ZTogdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlLFxuICAgICAgaG92ZXJHZXN0dXJlTW92ZWQ6IHRoaXMubW92ZWQsXG4gICAgICBsb25nUHJlc3NGaXJlZDogdGhpcy5ob2xkRmlyZWQsXG4gICAgICBhY3RpdmVQb2ludGVySWQ6IHRoaXMuYWN0aXZlUG9pbnRlcklkLFxuICAgIH07XG4gIH1cblxuICAvKiogVGhlIGNvbnRyb2xsZXIgY2FsbHMgdGhpcyB3aGVuIHRoZSBvcHRpb25hbCBFeGNhbGlkcmF3IGJyaWRnZSByZWplY3RzIGEgc3RhcnQgcmVxdWVzdC4gKi9cbiAgdGVtcG9yYXJ5VG9vbERpZE5vdFN0YXJ0KCk6IHZvaWQge1xuICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGFydFByZXNzKG9yaWdpbjogTm9ybWFsaXplZFN0eWx1c0V2ZW50IHwgUG9pbnQpOiB2b2lkIHtcbiAgICBjb25zdCBwb2ludCA9IFwia2luZFwiIGluIG9yaWdpbiA/IHsgeDogb3JpZ2luLngsIHk6IG9yaWdpbi55IH0gOiBvcmlnaW47XG4gICAgdGhpcy5iYXJyZWxCdXR0b25IZWxkID0gdHJ1ZTtcbiAgICB0aGlzLmNvbnN1bWVkID0gZmFsc2U7XG4gICAgdGhpcy5tb3ZlZCA9IGZhbHNlO1xuICAgIHRoaXMuaG9sZEZpcmVkID0gZmFsc2U7XG4gICAgdGhpcy5wcmVzc09yaWdpbiA9IHBvaW50O1xuICAgIHRoaXMuaG9sZFRpbWVyID0gdGhpcy5zY2hlZHVsZXIuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAoXG4gICAgICAgICF0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgfHxcbiAgICAgICAgdGhpcy5wZW5Db250YWN0IHx8XG4gICAgICAgIHRoaXMubW92ZWQgfHxcbiAgICAgICAgdGhpcy5jb25zdW1lZCB8fFxuICAgICAgICAhdGhpcy5wcmVzc09yaWdpblxuICAgICAgKVxuICAgICAgICByZXR1cm47XG4gICAgICB0aGlzLmhvbGRGaXJlZCA9IHRydWU7XG4gICAgICB0aGlzLmNvbnN1bWVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgICAgdGhpcy5vbkVmZmVjdD8uKHsgdHlwZTogXCJidXR0b24taG9sZFwiLCBwb2ludDogdGhpcy5wcmVzc09yaWdpbiB9KTtcbiAgICB9LCB0aGlzLnNldHRpbmdzLmxvbmdQcmVzc01zKTtcbiAgfVxuXG4gIC8qKiBDb250cm9sbGVyIHJlZ2lzdGVycyB0aGlzIHNvIHNjaGVkdWxlciBjYWxsYmFja3MgcmV0YWluIHB1cmUgc2VtYW50aWMgb3V0cHV0LiAqL1xuICBwcml2YXRlIG9uRWZmZWN0OiAoKGVmZmVjdDogR2VzdHVyZUVmZmVjdCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgc2V0RWZmZWN0U2luayhzaW5rOiAoZWZmZWN0OiBHZXN0dXJlRWZmZWN0KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5vbkVmZmVjdCA9IHNpbms7XG4gIH1cblxuICBwcml2YXRlIHRyYWNrSG92ZXJNb3ZlbWVudChldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnByZXNzT3JpZ2luIHx8IHRoaXMubW92ZWQpIHJldHVybjtcbiAgICBjb25zdCBkeCA9IGV2ZW50LnggLSB0aGlzLnByZXNzT3JpZ2luLng7XG4gICAgY29uc3QgZHkgPSBldmVudC55IC0gdGhpcy5wcmVzc09yaWdpbi55O1xuICAgIGlmIChNYXRoLmh5cG90KGR4LCBkeSkgPiB0aGlzLnNldHRpbmdzLm1vdmVtZW50VGhyZXNob2xkUHgpIHtcbiAgICAgIHRoaXMubW92ZWQgPSB0cnVlO1xuICAgICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjb25zdW1lRm9yQ29udGFjdChldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50LCBlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10pOiB2b2lkIHtcbiAgICB0aGlzLmNvbnN1bWVkID0gdHJ1ZTtcbiAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5idXR0b25Db250YWN0QWN0aW9uID09PSBcImVyYXNlclwiICYmICF0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUpIHtcbiAgICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IHRydWU7XG4gICAgICBlZmZlY3RzLnB1c2goeyB0eXBlOiBcInRlbXBvcmFyeS10b29sLXN0YXJ0XCIsIHBvaW50OiB7IHg6IGV2ZW50LngsIHk6IGV2ZW50LnkgfSB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbGVhc2VQcmVzcyhlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10pOiB2b2lkIHtcbiAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgPSBmYWxzZTtcbiAgICBpZiAoIXRoaXMuY29uc3VtZWQgJiYgIXRoaXMubW92ZWQgJiYgIXRoaXMuaG9sZEZpcmVkICYmIHRoaXMucHJlc3NPcmlnaW4pIHtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdUYXApIHtcbiAgICAgICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwiYnV0dG9uLWRvdWJsZS10YXBcIiwgcG9pbnQ6IHRoaXMucHJlc3NPcmlnaW4gfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwb2ludCA9IHRoaXMucHJlc3NPcmlnaW47XG4gICAgICAgIGNvbnN0IHRpbWVyID0gdGhpcy5zY2hlZHVsZXIuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5wZW5kaW5nVGFwID0gbnVsbDtcbiAgICAgICAgICB0aGlzLm9uRWZmZWN0Py4oeyB0eXBlOiBcImJ1dHRvbi10YXBcIiwgcG9pbnQgfSk7XG4gICAgICAgIH0sIHRoaXMuc2V0dGluZ3MuZG91YmxlVGFwTXMpO1xuICAgICAgICB0aGlzLnBlbmRpbmdUYXAgPSB7IHBvaW50LCB0aW1lciB9O1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnByZXNzT3JpZ2luID0gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgY2FuY2VsUHJlc3MoKTogdm9pZCB7XG4gICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgdGhpcy5iYXJyZWxCdXR0b25IZWxkID0gZmFsc2U7XG4gICAgdGhpcy5wZW5Db250YWN0ID0gZmFsc2U7XG4gICAgdGhpcy5jb25zdW1lZCA9IGZhbHNlO1xuICAgIHRoaXMubW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmhvbGRGaXJlZCA9IGZhbHNlO1xuICAgIHRoaXMucHJlc3NPcmlnaW4gPSBudWxsO1xuICAgIHRoaXMuYWN0aXZlUG9pbnRlcklkID0gbnVsbDtcbiAgICB0aGlzLnJlbGVhc2VBZnRlckNvbnRhY3QgPSBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgY2FuY2VsVGltZXIod2hpY2g6IFwiaG9sZFwiKTogdm9pZCB7XG4gICAgaWYgKHdoaWNoID09PSBcImhvbGRcIiAmJiB0aGlzLmhvbGRUaW1lciAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5zY2hlZHVsZXIuY2xlYXJUaW1lb3V0KHRoaXMuaG9sZFRpbWVyKTtcbiAgICAgIHRoaXMuaG9sZFRpbWVyID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNhbmNlbFBlbmRpbmdUYXAoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucGVuZGluZ1RhcCkgdGhpcy5zY2hlZHVsZXIuY2xlYXJUaW1lb3V0KHRoaXMucGVuZGluZ1RhcC50aW1lcik7XG4gICAgdGhpcy5wZW5kaW5nVGFwID0gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgaXNCYXJyZWxIZWxkKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKGV2ZW50LmJ1dHRvbnMgJiB0aGlzLnNldHRpbmdzLmJhcnJlbEJ1dHRvbk1hc2spICE9PSAwO1xuICB9XG5cbiAgcHJpdmF0ZSBjYW5SZWNvZ25pemVCYXJyZWxPbkNvbnRhY3QoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAoXG4gICAgICAodGhpcy5zZXR0aW5ncy5iYXJyZWxCdXR0b25NYXNrICE9PSAxIHx8XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucHJpbWFyeUNvbnRhY3RNb2RlID09PSBcImV4cGVyaW1lbnRhbFwiKSAmJlxuICAgICAgdGhpcy5pc0JhcnJlbEhlbGQoZXZlbnQpXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgaG92ZXJMYXRjaCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpcy5iYXJyZWxTb3VyY2UgPT09IFwicG9pbnRlclwiICYmXG4gICAgICB0aGlzLnNldHRpbmdzLmJhcnJlbEJ1dHRvbk1hc2sgPT09IDEgJiZcbiAgICAgIHRoaXMuc2V0dGluZ3MucHJpbWFyeUNvbnRhY3RNb2RlID09PSBcImhvdmVyLW9ubHlcIlxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIHBvaW50T2YocG9pbnQ6IFBvaW50IHwgbnVsbCk6IFBvaW50IHtcbiAgICByZXR1cm4gcG9pbnQgPyB7IHg6IHBvaW50LngsIHk6IHBvaW50LnkgfSA6IHsgeDogMCwgeTogMCB9O1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSB7IEV4Y2FsaWRyYXdCcmlkZ2UsIEFjdGl2ZVRvb2xTbmFwc2hvdCB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB0eXBlIHsgRGVidWdMb2dnZXIgfSBmcm9tIFwiLi4vZGVidWcvRGVidWdMb2dnZXJcIjtcbmltcG9ydCB7IERlYnVnT3ZlcmxheSB9IGZyb20gXCIuLi9kZWJ1Zy9EZWJ1Z092ZXJsYXlcIjtcbmltcG9ydCB0eXBlIHsgUGVuQnV0dG9uU2lnbmFsIH0gZnJvbSBcIi4uL3BlbmJyaWRnZS9QZW5CcmlkZ2VDbGllbnRcIjtcbmltcG9ydCB0eXBlIHsgUGVuU2lnbmFsSHViIH0gZnJvbSBcIi4uL3BlbmJyaWRnZS9QZW5TaWduYWxIdWJcIjtcbmltcG9ydCB7IGRlc2NyaWJlQmFycmVsU291cmNlLCB0eXBlIFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgfSBmcm9tIFwiLi4vc2V0dGluZ3Mvc2V0dGluZ3NcIjtcbmltcG9ydCB7IGlzU3ludGhldGljIH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvc3ludGhldGljUG9pbnRlclwiO1xuaW1wb3J0IHsgY2xhc3NpZnlQZW5FdmVudCwgbm9ybWFsaXplUG9pbnRlckV2ZW50IH0gZnJvbSBcIi4vbm9ybWFsaXplUG9pbnRlckV2ZW50XCI7XG5pbXBvcnQgeyBTdHlsdXNHZXN0dXJlTWFjaGluZSB9IGZyb20gXCIuL1N0eWx1c0dlc3R1cmVNYWNoaW5lXCI7XG5pbXBvcnQgdHlwZSB7IEdlc3R1cmVFZmZlY3QsIE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgUG9pbnQsIFNjaGVkdWxlciB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCB0eXBlIEFjdGlvbkhhbmRsZXIgPSAoXG4gIGFjdGlvbjogXCJtZW51XCIgfCBcImNvcHlcIiB8IFwicGFzdGVcIiB8IFwibm9uZVwiLFxuICBwb2ludDogUG9pbnQsXG4gIGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZVxuKSA9PiB2b2lkO1xuXG5leHBvcnQgY2xhc3MgU3R5bHVzQ29udHJvbGxlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWFjaGluZTogU3R5bHVzR2VzdHVyZU1hY2hpbmU7XG4gIHByaXZhdGUgc2F2ZWRUb29sOiBBY3RpdmVUb29sU25hcHNob3QgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBkaXNwb3NlZCA9IGZhbHNlO1xuICBwcml2YXRlIGF0dGFjaGVkID0gZmFsc2U7XG4gIHByaXZhdGUgcmVhZG9ubHkgbGlzdGVuZXJzOiBBcnJheTxba2V5b2YgSFRNTEVsZW1lbnRFdmVudE1hcCwgRXZlbnRMaXN0ZW5lcl0+ID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgb3ZlcmxheTogRGVidWdPdmVybGF5O1xuICBwcml2YXRlIGxhdGVzdEV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBsYXN0UGVuRXZlbnQ6IFBvaW50ZXJFdmVudCB8IG51bGwgPSBudWxsO1xuICBsYXN0UGVuQWN0aXZpdHlBdCA9IDA7XG4gIHByaXZhdGUgbGFzdExhdGVuY3k6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGVhZjogV29ya3NwYWNlTGVhZixcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNldHRpbmdzOiAoKSA9PiBTdHlsdXNDb250cm9sc1NldHRpbmdzLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGVidWc6IERlYnVnTG9nZ2VyLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGlzcGF0Y2hBY3Rpb246IEFjdGlvbkhhbmRsZXIsXG4gICAgc2NoZWR1bGVyOiBTY2hlZHVsZXIgPSB3aW5kb3csXG4gICAgcHJpdmF0ZSByZWFkb25seSBwZW46IFBlblNpZ25hbEh1YiB8IG51bGwgPSBudWxsLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgbm93OiAoKSA9PiBudW1iZXIgPSAoKSA9PiBwZXJmb3JtYW5jZS5ub3coKVxuICApIHtcbiAgICB0aGlzLm1hY2hpbmUgPSBuZXcgU3R5bHVzR2VzdHVyZU1hY2hpbmUodGhpcy5nZXN0dXJlU2V0dGluZ3MoKSwgc2NoZWR1bGVyKTtcbiAgICB0aGlzLm1hY2hpbmUuc2V0RWZmZWN0U2luaygoZWZmZWN0KSA9PiB0aGlzLmFwcGx5RWZmZWN0KGVmZmVjdCkpO1xuICAgIHRoaXMub3ZlcmxheSA9IG5ldyBEZWJ1Z092ZXJsYXkoXG4gICAgICB0aGlzLmxlYWYudmlldy5jb250YWluZXJFbCxcbiAgICAgICgpID0+IHRoaXMuc2V0dGluZ3MoKS5kZWJ1Z01vZGUgJiYgdGhpcy5zZXR0aW5ncygpLmRlYnVnT3ZlcmxheVxuICAgICk7XG4gIH1cblxuICBhdHRhY2goKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZGlzcG9zZWQgfHwgdGhpcy5hdHRhY2hlZCkgcmV0dXJuO1xuICAgIHRoaXMuYXR0YWNoZWQgPSB0cnVlO1xuICAgIHRoaXMucGVuPy5yZWdpc3Rlcih0aGlzKTtcbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWw7XG4gICAgZm9yIChjb25zdCB0eXBlIG9mIFtcbiAgICAgIFwicG9pbnRlcmRvd25cIixcbiAgICAgIFwicG9pbnRlcm1vdmVcIixcbiAgICAgIFwicG9pbnRlcnVwXCIsXG4gICAgICBcInBvaW50ZXJjYW5jZWxcIixcbiAgICAgIFwiY29udGV4dG1lbnVcIixcbiAgICBdIGFzIGNvbnN0KSB7XG4gICAgICBjb25zdCBsaXN0ZW5lcjogRXZlbnRMaXN0ZW5lciA9IChyYXcpID0+IHRoaXMub25Qb2ludGVyRXZlbnQocmF3IGFzIFBvaW50ZXJFdmVudCk7XG4gICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICAgICAgdGhpcy5saXN0ZW5lcnMucHVzaChbdHlwZSwgbGlzdGVuZXJdKTtcbiAgICB9XG4gIH1cblxuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSByZXR1cm47XG4gICAgdGhpcy5kaXNwb3NlZCA9IHRydWU7XG4gICAgdGhpcy5hdHRhY2hlZCA9IGZhbHNlO1xuICAgIHRoaXMucGVuPy51bnJlZ2lzdGVyKHRoaXMpO1xuICAgIGZvciAoY29uc3QgW3R5cGUsIGxpc3RlbmVyXSBvZiB0aGlzLmxpc3RlbmVycylcbiAgICAgIHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICAgIHRoaXMubGlzdGVuZXJzLmxlbmd0aCA9IDA7XG4gICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgdGhpcy5tYWNoaW5lLmRpc3Bvc2UoKSkgdGhpcy5hcHBseUVmZmVjdChlZmZlY3QpO1xuICAgIHRoaXMub3ZlcmxheS5jbG9zZSgpO1xuICB9XG4gIGdldFRyYWNlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVidWcuZXhwb3J0VHJhY2UoKTtcbiAgfVxuICByZWNlbnRNZXNzYWdlcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMuZGVidWcucmVjZW50TWVzc2FnZXMoKTtcbiAgfVxuICBsYXN0UGVuUG9pbnQoKTogUG9pbnQgfCBudWxsIHtcbiAgICBpZiAoIXRoaXMubGF0ZXN0RXZlbnQpIHJldHVybiBudWxsO1xuICAgIHJldHVybiB7IHg6IHRoaXMubGF0ZXN0RXZlbnQueCwgeTogdGhpcy5sYXRlc3RFdmVudC55IH07XG4gIH1cbiAgYnJpZGdlRm9yTWVudSgpOiBFeGNhbGlkcmF3QnJpZGdlIHtcbiAgICByZXR1cm4gdGhpcy5icmlkZ2U7XG4gIH1cblxuICBvbkV4dGVybmFsQnV0dG9uKHNpZ25hbDogUGVuQnV0dG9uU2lnbmFsKTogdm9pZCB7XG4gICAgY29uc3QgbGF0ZW5jeSA9XG4gICAgICBzaWduYWwubGF0ZW5jeU1zID09PSBudWxsID8gXCJyZWNlaXZlLXRpbWVcIiA6IGAke01hdGgucm91bmQoc2lnbmFsLmxhdGVuY3lNcyl9bXNgO1xuICAgIHRoaXMubGFzdExhdGVuY3kgPSBsYXRlbmN5O1xuICAgIHRoaXMuZGVidWcubWVzc2FnZShcbiAgICAgIGBicmlkZ2U6ICR7c2lnbmFsLmRvd24gPyBcImRvd25cIiA6IFwidXBcIn0gc2VxPSR7c2lnbmFsLnNlcX0gbGF0ZW5jeT0ke2xhdGVuY3l9YFxuICAgICk7XG4gICAgdGhpcy5tYWNoaW5lLnNldEJhcnJlbFNvdXJjZShcImJyaWRnZVwiKTtcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiB0aGlzLm1hY2hpbmUuaGFuZGxlRXh0ZXJuYWxCdXR0b24oe1xuICAgICAgZG93bjogc2lnbmFsLmRvd24sXG4gICAgICBwcmVzc2VkQXQ6IHNpZ25hbC5wcmVzc2VkQXRQZXJmLFxuICAgIH0pKSB7XG4gICAgICB0aGlzLmFwcGx5RWZmZWN0KGVmZmVjdCk7XG4gICAgfVxuICAgIHRoaXMucmVmcmVzaE92ZXJsYXkoKTtcbiAgfVxuXG4gIHByaXZhdGUgb25Qb2ludGVyRXZlbnQocmF3OiBQb2ludGVyRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoaXNTeW50aGV0aWMocmF3KSkgcmV0dXJuO1xuICAgIGlmIChyYXcucG9pbnRlclR5cGUgIT09IFwicGVuXCIpIHJldHVybjtcbiAgICB0aGlzLmxhc3RQZW5FdmVudCA9IHJhdztcbiAgICB0aGlzLmxhc3RQZW5BY3Rpdml0eUF0ID0gdGhpcy5ub3coKTtcbiAgICBjb25zdCBoZWxkID0gdGhpcy5iYXJyZWxCZWxpZXZlZEhlbGQocmF3KTtcbiAgICBjb25zdCBwaGFzZSA9IGNsYXNzaWZ5UGVuRXZlbnQocmF3LCBoZWxkKTtcbiAgICBpZiAocGhhc2UgPT09IFwiaG92ZXItYnV0dG9uXCIgJiYgdGhpcy5zZXR0aW5ncygpLnN1cHByZXNzSG92ZXJCdXR0b25FdmVudHMpIHtcbiAgICAgIGlmICh0eXBlb2YgcmF3LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiA9PT0gXCJmdW5jdGlvblwiKSByYXcuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICByYXcucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gICAgY29uc3QgZXZlbnQgPSBub3JtYWxpemVQb2ludGVyRXZlbnQoXG4gICAgICByYXcsXG4gICAgICB0aGlzLmxlYWYudmlldy5jb250YWluZXJFbC5jb250YWlucyhyYXcudGFyZ2V0IGFzIE5vZGUpXG4gICAgKTtcbiAgICBpZiAocGhhc2UgPT09IFwiaG92ZXItYnV0dG9uXCIpIGV2ZW50LmtpbmQgPSBcIm1vdmVcIjtcbiAgICB0aGlzLmxhdGVzdEV2ZW50ID0gZXZlbnQ7XG4gICAgdGhpcy5kZWJ1Zy5ldmVudChldmVudCk7XG4gICAgdGhpcy5tYWNoaW5lLnNldEJhcnJlbFNvdXJjZSh0aGlzLnBlbj8uaXNSZWFkeSgpID8gXCJicmlkZ2VcIiA6IFwicG9pbnRlclwiKTtcbiAgICBjb25zdCBlZmZlY3RzID0gdGhpcy5tYWNoaW5lLmhhbmRsZShldmVudCk7XG4gICAgaWYgKGVmZmVjdHMubGVuZ3RoID09PSAwKSB0aGlzLnJlZnJlc2hPdmVybGF5KGV2ZW50KTtcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiBlZmZlY3RzKSB7XG4gICAgICBpZiAoZWZmZWN0LnR5cGUgPT09IFwic3VwcHJlc3MtY29udGV4dC1tZW51XCIpIHJhdy5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5hcHBseUVmZmVjdChlZmZlY3QsIHJhdyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBseUVmZmVjdChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QsIHJhdz86IFBvaW50ZXJFdmVudCk6IHZvaWQge1xuICAgIHRoaXMuZGVidWcubWVzc2FnZShgZWZmZWN0OiAke2VmZmVjdC50eXBlfWApO1xuICAgIGlmICh0aGlzLnNldHRpbmdzKCkuc3R5bHVzVGVzdE1vZGUpIHtcbiAgICAgIHRoaXMuZGVidWcubWVzc2FnZShgdGVzdCBtb2RlIHN1cHByZXNzZWQ6ICR7ZWZmZWN0LnR5cGV9YCk7XG4gICAgICB0aGlzLnJlZnJlc2hPdmVybGF5KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHN3aXRjaCAoZWZmZWN0LnR5cGUpIHtcbiAgICAgIGNhc2UgXCJ0ZW1wb3JhcnktdG9vbC1zdGFydFwiOlxuICAgICAgICBpZiAoIXRoaXMuc2F2ZWRUb29sKSB7XG4gICAgICAgICAgY29uc3Qgc3ludGhldGljID1cbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MoKS5lcmFzZXJTdHJhdGVneSA9PT0gXCJzeW50aGV0aWMtYnV0dG9uNVwiICYmIHJhdz8udHlwZSA9PT0gXCJwb2ludGVyZG93blwiO1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9XG4gICAgICAgICAgICBzeW50aGV0aWMgJiYgcmF3XG4gICAgICAgICAgICAgID8gdGhpcy5icmlkZ2UuYmVnaW5Nb21lbnRhcnlFcmFzZXIocmF3KVxuICAgICAgICAgICAgICA6IHRoaXMuYnJpZGdlLnN0YXJ0VGVtcG9yYXJ5RXJhc2VyKCk7XG4gICAgICAgICAgaWYgKHJlc3VsdC5vaykgdGhpcy5zYXZlZFRvb2wgPSByZXN1bHQudmFsdWU7XG4gICAgICAgICAgZWxzZSB0aGlzLm1hY2hpbmUudGVtcG9yYXJ5VG9vbERpZE5vdFN0YXJ0KCk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwidGVtcG9yYXJ5LXRvb2wtc3BsaXRcIjoge1xuICAgICAgICBjb25zdCBldmVudCA9IHRoaXMubGFzdFBlbkV2ZW50ID8/IHJhdztcbiAgICAgICAgaWYgKCFldmVudCkgYnJlYWs7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9XG4gICAgICAgICAgdGhpcy5zZXR0aW5ncygpLmVyYXNlclN0cmF0ZWd5ID09PSBcInN5bnRoZXRpYy1idXR0b241XCJcbiAgICAgICAgICAgID8gdGhpcy5icmlkZ2Uuc3BsaXRTdHJva2VUb0VyYXNlcihldmVudCwgZWZmZWN0LmRpc2NhcmRTdHJva2UpXG4gICAgICAgICAgICA6IHRoaXMuYnJpZGdlLnNwbGl0U3Ryb2tlV2l0aEFjdGl2ZVRvb2woZXZlbnQpO1xuICAgICAgICBpZiAocmVzdWx0Lm9rKSB0aGlzLnNhdmVkVG9vbCA9IHJlc3VsdC52YWx1ZTtcbiAgICAgICAgZWxzZSB0aGlzLm1hY2hpbmUudGVtcG9yYXJ5VG9vbERpZE5vdFN0YXJ0KCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSBcInRlbXBvcmFyeS10b29sLWVuZFwiOlxuICAgICAgICBpZiAodGhpcy5zYXZlZFRvb2wpIHtcbiAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncygpLmVyYXNlclN0cmF0ZWd5ID09PSBcInN5bnRoZXRpYy1idXR0b241XCIpIHtcbiAgICAgICAgICAgIHRoaXMuYnJpZGdlLmVuZE1vbWVudGFyeUVyYXNlcih0aGlzLnNhdmVkVG9vbCk7XG4gICAgICAgICAgfSBlbHNlIHRoaXMuYnJpZGdlLnJlc3RvcmVUb29sKHRoaXMuc2F2ZWRUb29sKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNhdmVkVG9vbCA9IG51bGw7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImJ1dHRvbi10YXBcIjpcbiAgICAgICAgdGhpcy5kaXNwYXRjaEFjdGlvbih0aGlzLnNldHRpbmdzKCkuYnV0dG9uVGFwQWN0aW9uLCBlZmZlY3QucG9pbnQsIHRoaXMuYnJpZGdlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiYnV0dG9uLWRvdWJsZS10YXBcIjpcbiAgICAgICAgdGhpcy5kaXNwYXRjaEFjdGlvbih0aGlzLnNldHRpbmdzKCkuYnV0dG9uRG91YmxlVGFwQWN0aW9uLCBlZmZlY3QucG9pbnQsIHRoaXMuYnJpZGdlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiYnV0dG9uLWhvbGRcIjpcbiAgICAgICAgdGhpcy5kaXNwYXRjaEFjdGlvbih0aGlzLnNldHRpbmdzKCkuYnV0dG9uSG9sZEFjdGlvbiwgZWZmZWN0LnBvaW50LCB0aGlzLmJyaWRnZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHRoaXMucmVmcmVzaE92ZXJsYXkodGhpcy5sYXRlc3RFdmVudCwgZWZmZWN0KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVmcmVzaE92ZXJsYXkoXG4gICAgZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCB8IG51bGwgPSB0aGlzLmxhdGVzdEV2ZW50LFxuICAgIGVmZmVjdD86IEdlc3R1cmVFZmZlY3RcbiAgKTogdm9pZCB7XG4gICAgaWYgKCFldmVudCkgcmV0dXJuO1xuICAgIHRoaXMub3ZlcmxheS51cGRhdGUoZXZlbnQsIHRoaXMubWFjaGluZS5zbmFwc2hvdCgpLCBlZmZlY3QsIHRoaXMuc3RhdHVzTGluZSgpKTtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdHVzTGluZSgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHNvdXJjZSA9IGRlc2NyaWJlQmFycmVsU291cmNlKHRoaXMuc2V0dGluZ3MoKSwgdGhpcy5wZW4/LmlzUmVhZHkoKSA9PT0gdHJ1ZSk7XG4gICAgY29uc3QgZG93biA9IHRoaXMucGVuPy5pc0Rvd24oKSA9PT0gdHJ1ZTtcbiAgICBjb25zdCBsYXRlbmN5ID0gdGhpcy5sYXN0TGF0ZW5jeSA/IGAgbGF0ZW5jeToke3RoaXMubGFzdExhdGVuY3l9YCA6IFwiXCI7XG4gICAgcmV0dXJuIGBzb3VyY2U6JHtzb3VyY2V9IGRvd246JHtTdHJpbmcoZG93bil9JHtsYXRlbmN5fWA7XG4gIH1cblxuICBwcml2YXRlIGJhcnJlbEJlbGlldmVkSGVsZChyYXc6IFBvaW50ZXJFdmVudCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLnBlbj8uaXNSZWFkeSgpKSByZXR1cm4gdGhpcy5wZW4uaXNEb3duKCk7XG4gICAgaWYgKHRoaXMubWFjaGluZS5zbmFwc2hvdCgpLmJhcnJlbEJ1dHRvbkhlbGQpIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IHNldHRpbmdzID0gdGhpcy5zZXR0aW5ncygpO1xuICAgIHJldHVybiAoXG4gICAgICBzZXR0aW5ncy5iYXJyZWxCdXR0b25NYXNrID09PSAxICYmXG4gICAgICBzZXR0aW5ncy5wcmltYXJ5Q29udGFjdE1vZGUgPT09IFwiaG92ZXItb25seVwiICYmXG4gICAgICByYXcucHJlc3N1cmUgPCAwLjAxICYmXG4gICAgICAocmF3LmJ1dHRvbnMgJiAxKSAhPT0gMFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIGdlc3R1cmVTZXR0aW5ncygpIHtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMuc2V0dGluZ3MoKTtcbiAgICByZXR1cm4ge1xuICAgICAgYnV0dG9uQ29udGFjdEFjdGlvbjogdmFsdWUuYnV0dG9uQ29udGFjdEFjdGlvbixcbiAgICAgIGRvdWJsZVRhcE1zOiB2YWx1ZS5kb3VibGVUYXBNcyxcbiAgICAgIGxvbmdQcmVzc01zOiB2YWx1ZS5sb25nUHJlc3NNcyxcbiAgICAgIG1vdmVtZW50VGhyZXNob2xkUHg6IHZhbHVlLm1vdmVtZW50VGhyZXNob2xkUHgsXG4gICAgICBiYXJyZWxCdXR0b25NYXNrOiB2YWx1ZS5iYXJyZWxCdXR0b25NYXNrLFxuICAgICAgcHJpbWFyeUNvbnRhY3RNb2RlOiB2YWx1ZS5wcmltYXJ5Q29udGFjdE1vZGUsXG4gICAgICBsYXRlV2luZG93TXM6IHZhbHVlLmxhdGVXaW5kb3dNcyxcbiAgICAgIG1pZFN0cm9rZVByZXNzOiB2YWx1ZS5taWRTdHJva2VQcmVzcyxcbiAgICB9IGFzIGNvbnN0O1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBBcHAsIFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IEV4Y2FsaWRyYXdCcmlkZ2UgfSBmcm9tIFwiLi4vZXhjYWxpZHJhdy9FeGNhbGlkcmF3QnJpZGdlXCI7XG5pbXBvcnQgeyBEZWJ1Z0xvZ2dlciB9IGZyb20gXCIuLi9kZWJ1Zy9EZWJ1Z0xvZ2dlclwiO1xuaW1wb3J0IHR5cGUgeyBQZW5TaWduYWxIdWIsIFJvdXRlZFBlblRhcmdldCB9IGZyb20gXCIuLi9wZW5icmlkZ2UvUGVuU2lnbmFsSHViXCI7XG5pbXBvcnQgdHlwZSB7IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgfSBmcm9tIFwiLi4vc2V0dGluZ3Mvc2V0dGluZ3NcIjtcbmltcG9ydCB7IFN0eWx1c0NvbnRyb2xsZXIsIHR5cGUgQWN0aW9uSGFuZGxlciB9IGZyb20gXCIuL1N0eWx1c0NvbnRyb2xsZXJcIjtcblxuZXhwb3J0IGludGVyZmFjZSBTdHlsdXNDb250cm9sbGVyTGlrZSB7XG4gIGF0dGFjaCgpOiB2b2lkO1xuICBkaXNwb3NlKCk6IHZvaWQ7XG4gIGdldFRyYWNlKCk6IHN0cmluZztcbiAgcmVjZW50TWVzc2FnZXM/KCk6IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgdHlwZSBTdHlsdXNDb250cm9sbGVyRmFjdG9yeSA9IChsZWFmOiBXb3Jrc3BhY2VMZWFmKSA9PiBTdHlsdXNDb250cm9sbGVyTGlrZTtcblxuZXhwb3J0IGNsYXNzIFN0eWx1c1ZpZXdSZWdpc3RyeSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29udHJvbGxlcnMgPSBuZXcgTWFwPFdvcmtzcGFjZUxlYWYsIFN0eWx1c0NvbnRyb2xsZXJMaWtlPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGNyZWF0ZUNvbnRyb2xsZXI6IFN0eWx1c0NvbnRyb2xsZXJGYWN0b3J5O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogKCkgPT4gU3R5bHVzQ29udHJvbHNTZXR0aW5ncyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFjdGlvbkhhbmRsZXI6IEFjdGlvbkhhbmRsZXIsXG4gICAgY3JlYXRlQ29udHJvbGxlcj86IFN0eWx1c0NvbnRyb2xsZXJGYWN0b3J5LFxuICAgIHByaXZhdGUgcmVhZG9ubHkgaG9va3M/OiB7XG4gICAgICBwZW4/OiBQZW5TaWduYWxIdWIgfCBudWxsO1xuICAgICAgZGlhZ25vc3RpYz86IGJvb2xlYW47XG4gICAgICBvblN5bmM/OiAoKSA9PiB2b2lkO1xuICAgIH1cbiAgKSB7XG4gICAgdGhpcy5jcmVhdGVDb250cm9sbGVyID1cbiAgICAgIGNyZWF0ZUNvbnRyb2xsZXIgPz9cbiAgICAgICgobGVhZikgPT4ge1xuICAgICAgICBjb25zdCBkZWJ1ZyA9IG5ldyBEZWJ1Z0xvZ2dlcigoKSA9PiB0aGlzLnNldHRpbmdzKCkuZGVidWdNb2RlLCBob29rcz8uZGlhZ25vc3RpYyA9PT0gdHJ1ZSk7XG4gICAgICAgIHJldHVybiBuZXcgU3R5bHVzQ29udHJvbGxlcihcbiAgICAgICAgICBsZWFmLFxuICAgICAgICAgIG5ldyBFeGNhbGlkcmF3QnJpZGdlKGxlYWYpLFxuICAgICAgICAgIHRoaXMuc2V0dGluZ3MsXG4gICAgICAgICAgZGVidWcsXG4gICAgICAgICAgdGhpcy5hY3Rpb25IYW5kbGVyLFxuICAgICAgICAgIHdpbmRvdyxcbiAgICAgICAgICBob29rcz8ucGVuID8/IG51bGxcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgc3luYygpOiB2b2lkIHtcbiAgICBjb25zdCBsZWF2ZXMgPSBuZXcgU2V0KHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoXCJleGNhbGlkcmF3XCIpKTtcbiAgICBmb3IgKGNvbnN0IGxlYWYgb2YgbGVhdmVzKVxuICAgICAgaWYgKCF0aGlzLmNvbnRyb2xsZXJzLmhhcyhsZWFmKSkge1xuICAgICAgICBjb25zdCBjb250cm9sbGVyID0gdGhpcy5jcmVhdGVDb250cm9sbGVyKGxlYWYpO1xuICAgICAgICBjb250cm9sbGVyLmF0dGFjaCgpO1xuICAgICAgICB0aGlzLmNvbnRyb2xsZXJzLnNldChsZWFmLCBjb250cm9sbGVyKTtcbiAgICAgIH1cbiAgICBmb3IgKGNvbnN0IFtsZWFmLCBjb250cm9sbGVyXSBvZiB0aGlzLmNvbnRyb2xsZXJzKVxuICAgICAgaWYgKCFsZWF2ZXMuaGFzKGxlYWYpKSB7XG4gICAgICAgIGNvbnRyb2xsZXIuZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLmNvbnRyb2xsZXJzLmRlbGV0ZShsZWFmKTtcbiAgICAgIH1cbiAgICB0aGlzLmhvb2tzPy5vblN5bmM/LigpO1xuICB9XG4gIHNpemUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5jb250cm9sbGVycy5zaXplO1xuICB9XG4gIGZhbGxiYWNrVGFyZ2V0KCk6IFJvdXRlZFBlblRhcmdldCB8IG51bGwge1xuICAgIGNvbnN0IGFjdGl2ZSA9ICh0aGlzLmFwcC53b3Jrc3BhY2UgYXMgeyBhY3RpdmVMZWFmPzogV29ya3NwYWNlTGVhZiB9KS5hY3RpdmVMZWFmO1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBhY3RpdmUgPyB0aGlzLmNvbnRyb2xsZXJzLmdldChhY3RpdmUpIDogdW5kZWZpbmVkO1xuICAgIGlmIChjb250cm9sbGVyICYmIFwib25FeHRlcm5hbEJ1dHRvblwiIGluIGNvbnRyb2xsZXIgJiYgXCJsYXN0UGVuUG9pbnRcIiBpbiBjb250cm9sbGVyKSB7XG4gICAgICByZXR1cm4gY29udHJvbGxlciBhcyB1bmtub3duIGFzIFJvdXRlZFBlblRhcmdldDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmVjZW50TWVzc2FnZXMoKTogc3RyaW5nW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5jb250cm9sbGVycy52YWx1ZXMoKV0uZmxhdE1hcChcbiAgICAgIChjb250cm9sbGVyKSA9PiBjb250cm9sbGVyLnJlY2VudE1lc3NhZ2VzPy4oKSA/PyBbXVxuICAgICk7XG4gIH1cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGNvbnRyb2xsZXIgb2YgdGhpcy5jb250cm9sbGVycy52YWx1ZXMoKSkgY29udHJvbGxlci5kaXNwb3NlKCk7XG4gICAgdGhpcy5jb250cm9sbGVycy5jbGVhcigpO1xuICB9XG4gIHJlZnJlc2goKTogdm9pZCB7XG4gICAgdGhpcy5kaXNwb3NlKCk7XG4gICAgdGhpcy5zeW5jKCk7XG4gIH1cbiAgZXhwb3J0VHJhY2VzKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KFxuICAgICAgWy4uLnRoaXMuY29udHJvbGxlcnMuZW50cmllcygpXS5tYXAoKFtsZWFmLCBjb250cm9sbGVyXSkgPT4gKHtcbiAgICAgICAgbGVhZjogbGVhZi5nZXREaXNwbGF5VGV4dCgpLFxuICAgICAgICBldmVudHM6IEpTT04ucGFyc2UoY29udHJvbGxlci5nZXRUcmFjZSgpKSxcbiAgICAgIH0pKSxcbiAgICAgIG51bGwsXG4gICAgICAyXG4gICAgKTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFBQUEsbUJBQStCOzs7QUNFeEIsSUFBTSxjQUFOLE1BQWtCO0FBQUEsRUFHdkIsWUFDbUIsU0FDQSxpQkFBaUIsT0FDbEM7QUFGaUI7QUFDQTtBQUFBLEVBQ2hCO0FBQUEsRUFMSyxRQUFpQyxDQUFDO0FBQUEsRUFDbEMsV0FBcUIsQ0FBQztBQUFBLEVBTTlCLE1BQU0sT0FBb0M7QUFDeEMsUUFBSSxDQUFDLEtBQUssUUFBUSxFQUFHO0FBQ3JCLFNBQUssTUFBTSxLQUFLLEtBQUs7QUFDckIsUUFBSSxLQUFLLE1BQU0sU0FBUyxJQUFLLE1BQUssTUFBTSxNQUFNO0FBQzlDLFlBQVEsTUFBTSxnQ0FBZ0MsS0FBSztBQUFBLEVBQ3JEO0FBQUEsRUFDQSxRQUFRLFNBQXVCO0FBQzdCLFFBQUksS0FBSyxrQkFBa0IsS0FBSyxRQUFRLEdBQUc7QUFDekMsV0FBSyxTQUFTLEtBQUssT0FBTztBQUMxQixVQUFJLEtBQUssU0FBUyxTQUFTLElBQUssTUFBSyxTQUFTLE1BQU07QUFBQSxJQUN0RDtBQUNBLFFBQUksS0FBSyxRQUFRLEVBQUcsU0FBUSxNQUFNLGdDQUFnQyxPQUFPO0FBQUEsRUFDM0U7QUFBQSxFQUNBLGVBQWUsUUFBUSxLQUFlO0FBQ3BDLFdBQU8sS0FBSyxTQUFTLE1BQU0sQ0FBQyxLQUFLO0FBQUEsRUFDbkM7QUFBQSxFQUNBLGNBQXNCO0FBQ3BCLFdBQU8sS0FBSyxVQUFVLEtBQUssT0FBTyxNQUFNLENBQUM7QUFBQSxFQUMzQztBQUFBLEVBQ0EsUUFBYztBQUNaLFNBQUssUUFBUSxDQUFDO0FBQUEsRUFDaEI7QUFDRjs7O0FDaENBLElBQUFDLG1CQUEwRTs7O0FDQTFFLHNCQUEyQzs7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RUFFQSxNQUFNLHVCQUFzQztBQUMxQyxVQUFNLFFBQVEsS0FBSyxVQUFVLGFBQWEsS0FBSztBQUMvQyxRQUFJO0FBQ0YsWUFBTSxVQUFVLFVBQVUsVUFBVSxLQUFLO0FBQ3pDLFVBQUksd0JBQU8sb0NBQW9DO0FBQUEsSUFDakQsUUFBUTtBQUNOLFVBQUksd0JBQU8sK0RBQStEO0FBQUEsSUFDNUU7QUFBQSxFQUNGO0FBQUEsRUFFUSxjQUFjLFFBQStCO0FBQ25ELFNBQUssVUFBVSxRQUFRLGtCQUFrQixPQUFPLEtBQUssRUFBRTtBQUN2RCxTQUFLLGFBQWE7QUFBQSxFQUNwQjtBQUFBLEVBRVEsZUFBcUI7QUFDM0IsZUFBVyxZQUFZLEtBQUssZ0JBQWlCLFVBQVM7QUFBQSxFQUN4RDtBQUFBLEVBRUEsTUFBYyxxQkFBb0M7QUFDaEQsVUFBTSxTQUFTLGtCQUFrQixLQUFLLFFBQVEsS0FBSyxDQUFDO0FBQ3BELFNBQUsscUJBQXFCLFNBQVMsTUFBTSxZQUFZLE1BQU0sSUFBSTtBQUFBLEVBQ2pFO0FBQUEsRUFFUSxrQkFBd0I7QUFDOUIsVUFBTSxVQUFVLE9BQU8sYUFBYSxlQUFlLFNBQVMsb0JBQW9CO0FBQ2hGLFNBQUssT0FBTztBQUFBLE1BQ1YsS0FBSyxTQUFTLG9CQUNaLGtCQUFrQixLQUFLLFFBQVEsS0FBSyxDQUFDLE1BQU0sU0FDMUMsS0FBSyxVQUFVLEtBQUssS0FBSyxLQUFLLEtBQy9CO0FBQUEsSUFDSjtBQUFBLEVBQ0Y7QUFBQSxFQUVRLHFCQUEyQjtBQUNqQyxVQUFNLFNBQVMsS0FBSyxJQUFJLE1BQU07QUFDOUIsUUFBSSxDQUFDLFFBQVE7QUFDWCxVQUFJLHdCQUFPLG1DQUFtQztBQUM5QztBQUFBLElBQ0Y7QUFDQSxVQUFNLFFBQVEsT0FBTyxhQUFhLEtBQUssZUFBZTtBQUN0RCxTQUFLLEtBQUssS0FBSyxPQUFPLE9BQU8sY0FBYyxDQUFDO0FBQUEsRUFDOUM7QUFBQSxFQUVRLFlBQW9CO0FBQzFCLFdBQU8sa0JBQWtCLEtBQUssU0FBUyxhQUFhO0FBQUEsRUFDdEQ7QUFDRjtBQUVBLFNBQVMsaUJBQXdCO0FBQy9CLFNBQU87QUFBQSxJQUNMLEdBQUcsS0FBSyxNQUFNLE9BQU8sYUFBYSxDQUFDO0FBQUEsSUFDbkMsR0FBRyxLQUFLLE1BQU0sT0FBTyxjQUFjLENBQUM7QUFBQSxFQUN0QztBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJwcm9vZiIsICJmaW5nZXJwcmludCIsICJub3RlIiwgImFjdGlvbnMiLCAiaW1wb3J0X29ic2lkaWFuIiwgInN5bnRoZXRpYyJdCn0K
