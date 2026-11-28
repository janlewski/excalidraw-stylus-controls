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
function dispatchContextMenu(target, point) {
  const event = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    button: 2,
    buttons: 2
  });
  synthetic.add(event);
  target.dispatchEvent(event);
}

// src/excalidraw/strokeHit.ts
var STROKE_TAP_SLOP_PX = 12;
function zoomOf(zoom) {
  if (typeof zoom === "number" && Number.isFinite(zoom) && zoom > 0) return zoom;
  if (zoom && typeof zoom === "object" && "value" in zoom) {
    const value = zoom.value;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return 1;
}
function clientToScene(client, viewport) {
  const zoom = viewport.zoom > 0 ? viewport.zoom : 1;
  return {
    x: (client.x - viewport.left) / zoom - viewport.scrollX,
    y: (client.y - viewport.top) / zoom - viewport.scrollY
  };
}
function strokesToErase(elements, scene, priorIds, screenPadding = STROKE_TAP_SLOP_PX, zoom = 1) {
  const padding = screenPadding / (zoom > 0 ? zoom : 1);
  const hits = elements.filter(
    (element) => !element.isDeleted && !element.locked && contains(element, scene, padding)
  );
  const fresh = priorIds === null ? [] : hits.filter((element) => typeof element.id === "string" && !priorIds.has(element.id));
  const existing = priorIds === null ? hits : hits.filter((element) => !fresh.includes(element));
  const target = existing.length > 0 ? existing[existing.length - 1] : null;
  const doomed = [...fresh];
  if (target && !doomed.includes(target)) doomed.push(target);
  return doomed;
}
function contains(element, point, padding) {
  const { x, y, width, height } = element;
  if (typeof x !== "number" || typeof y !== "number" || typeof width !== "number" || typeof height !== "number" || !Number.isFinite(x + y + width + height)) {
    return false;
  }
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const angle = typeof element.angle === "number" ? element.angle : 0;
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  return Math.abs(localX) <= Math.abs(width) / 2 + padding && Math.abs(localY) <= Math.abs(height) / 2 + padding;
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
  /** Ids present before a pen-down, so a barrel tap can delete that speck and the stroke under it. */
  currentSceneIds() {
    const api = this.tryApi();
    if (!api?.getSceneElements) return null;
    const ids = /* @__PURE__ */ new Set();
    for (const element of api.getSceneElements()) {
      if (typeof element.id === "string") ids.add(element.id);
    }
    return ids;
  }
  eraseStrokeAt(client, priorIds) {
    const api = this.tryApi();
    if (!api?.getSceneElements) {
      return this.failure("unavailable", "Stroke eraser could not read this drawing.");
    }
    const box = this.canvasBox();
    if (!box) return this.failure("failed", "Stroke eraser could not find the canvas.");
    const state = api.getAppState();
    const zoom = zoomOf(state.zoom);
    const scene = clientToScene(client, {
      left: box.left,
      top: box.top,
      scrollX: typeof state.scrollX === "number" ? state.scrollX : 0,
      scrollY: typeof state.scrollY === "number" ? state.scrollY : 0,
      zoom
    });
    const doomed = strokesToErase(api.getSceneElements(), scene, priorIds, void 0, zoom);
    if (doomed.length === 0) return { ok: true, value: void 0 };
    if (!this.deleteElements(doomed)) {
      return this.failure(
        "failed",
        "The tapped stroke could not be erased in this Excalidraw view."
      );
    }
    return { ok: true, value: void 0 };
  }
  openContextMenu(point) {
    const target = typeof document !== "undefined" && document.elementFromPoint(point.x, point.y) || this.leaf.view.containerEl;
    dispatchContextMenu(target, point);
    return { ok: true, value: void 0 };
  }
  tryApi() {
    try {
      const result = getLeafApi(this.leaf.view);
      return result.ok ? result.value : null;
    } catch {
      return null;
    }
  }
  canvasBox() {
    const root = this.leaf.view.containerEl;
    const canvas = root.querySelector("canvas.excalidraw__canvas") ?? root.querySelector(".excalidraw__canvas");
    const rect = (canvas ?? root).getBoundingClientRect?.();
    if (!rect) return null;
    return { left: rect.left, top: rect.top };
  }
  deleteElements(elements) {
    const automate = getGlobalAutomate();
    if (typeof automate?.deleteViewElements !== "function") return false;
    try {
      automate.setView(this.leaf.view);
      return automate.deleteViewElements(elements) !== false;
    } catch {
      return false;
    }
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
  buttonDoubleTapAction: "context-menu",
  buttonHoldAction: "none",
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
  suppressHoverButtonEvents: true,
  gestureRevision: 2
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
  const action = (candidate, fallback) => candidate === "menu" || candidate === "context-menu" || candidate === "copy" || candidate === "paste" || candidate === "none" ? candidate : fallback;
  const number = (candidate, fallback, min, max) => typeof candidate === "number" && Number.isFinite(candidate) ? Math.min(max, Math.max(min, Math.round(candidate))) : fallback;
  const maskWasUnset = value.barrelButtonMask === void 0;
  const explicitMask = BARREL_MASKS.find((mask) => mask === value.barrelButtonMask);
  const storedRevision = value.gestureRevision === 2 ? 2 : 0;
  const doubleTap = action(value.buttonDoubleTapAction, DEFAULT_SETTINGS.buttonDoubleTapAction);
  const hold = action(value.buttonHoldAction, DEFAULT_SETTINGS.buttonHoldAction);
  return {
    buttonTapAction: action(value.buttonTapAction, DEFAULT_SETTINGS.buttonTapAction),
    buttonDoubleTapAction: storedRevision < 2 && (value.buttonDoubleTapAction === void 0 || value.buttonDoubleTapAction === "copy") ? "context-menu" : doubleTap,
    buttonHoldAction: storedRevision < 2 && (value.buttonHoldAction === void 0 || value.buttonHoldAction === "paste") ? "none" : hold,
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
    suppressHoverButtonEvents: value.suppressHoverButtonEvents !== false,
    gestureRevision: 2
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
  "menu": "Open menu",
  "context-menu": "Right-click menu",
  "copy": "Copy",
  "paste": "Paste",
  "none": "Do nothing"
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
      text: "Hold the side button and tap a stroke to erase it. Drag with the button held to erase along the pen. Hover and double-tap the button for Excalidraw's right-click menu. Copy and paste are not available yet."
    });
    this.action("Tap", "buttonTapAction");
    this.action("Double tap", "buttonDoubleTapAction");
    this.action("Hold", "buttonHoldAction");
    new import_obsidian4.Setting(containerEl).setName("Button + pen contact").setDesc(
      "Hold the side button, then tap a stroke to erase the whole stroke, or drag to erase along the pen. This does not open the right-click menu."
    ).addDropdown(
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
var CONTEXT_MENU_GRACE_MS = 500;
var LATE_PRESS_LEAD_MS = 300;
var CLOCK_SKEW_MS = 20;
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
  pendingTap = null;
  activePointerId = null;
  barrelSource = "pointer";
  contactStartedAt = null;
  contactOrigin = null;
  contactMoved = false;
  barrelContact = false;
  barrelAtDown = false;
  contextMenuUntil = -1;
  pressStartedAt = null;
  lastPoint = null;
  releaseAfterContact = false;
  recentContact = null;
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
      const eraseThisContact = barrelAtDown || barrelContact && this.settings.midStrokePress !== "next-contact";
      if (event.kind === "up" && eraseThisContact && !moved && this.settings.buttonContactAction === "eraser") {
        effects.push({ type: "erase-tap", point });
      }
      if (event.kind === "up" && barrelContact) this.armContextMenu(event.timestamp);
      if (event.kind === "up") {
        this.recentContact = {
          startedAt,
          endedAt: event.timestamp,
          point,
          moved,
          barrel: barrelContact
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
  handleExternalButton(input) {
    if (this.barrelSource !== "bridge") return [];
    if (input.down) {
      if (this.barrelButtonHeld) return [];
      if (!this.penContact) {
        const late2 = this.claimLateTap(input.pressedAt);
        if (late2) return late2;
        this.startPress(this.pointOf(this.lastPoint), input.pressedAt);
        return [];
      }
      this.barrelButtonHeld = true;
      this.consumed = true;
      this.barrelContact = this.settings.buttonContactAction === "eraser";
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
    this.releasePress(effects, input.pressedAt);
    return effects;
  }
  dispose() {
    const effects = [];
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
  startPress(origin, at) {
    const point = "kind" in origin ? { x: origin.x, y: origin.y } : origin;
    this.barrelButtonHeld = true;
    this.consumed = false;
    this.moved = false;
    this.holdFired = false;
    this.pressOrigin = point;
    this.pressStartedAt = at;
  }
  /** Controller registers this so scheduler callbacks retain pure semantic output. */
  onEffect = null;
  setEffectSink(sink) {
    this.onEffect = sink;
  }
  trackContactMovement(event) {
    if (!this.contactOrigin || this.contactMoved) return;
    const dx = event.x - this.contactOrigin.x;
    const dy = event.y - this.contactOrigin.y;
    if (Math.hypot(dx, dy) > this.settings.movementThresholdPx) this.contactMoved = true;
  }
  trackHoverMovement(event) {
    if (!this.pressOrigin || this.moved) return;
    const dx = event.x - this.pressOrigin.x;
    const dy = event.y - this.pressOrigin.y;
    if (Math.hypot(dx, dy) > this.settings.movementThresholdPx) this.moved = true;
  }
  consumeForContact(event, effects) {
    this.consumed = true;
    this.barrelContact = this.settings.buttonContactAction === "eraser";
    this.cancelPendingTap();
    if (this.settings.buttonContactAction === "eraser" && !this.temporaryToolActive) {
      this.temporaryToolActive = true;
      effects.push({ type: "temporary-tool-start", point: { x: event.x, y: event.y } });
    }
  }
  releasePress(effects, at) {
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
  cancelPress() {
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
  claimLateTap(pressedAt) {
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
  shouldSwallowContextMenu(event) {
    if (event.button === 2) return true;
    if (this.temporaryToolActive || this.barrelContact) return true;
    if (this.barrelButtonHeld && this.penContact) return true;
    return event.timestamp <= this.contextMenuUntil;
  }
  armContextMenu(at) {
    this.contextMenuUntil = Math.max(this.contextMenuUntil, at + CONTEXT_MENU_GRACE_MS);
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
    this.scheduler = scheduler;
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
  lastPointerWasPen = false;
  priorSceneIds = null;
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
    if (raw.type === "contextmenu") {
      this.onContextMenu(raw);
      return;
    }
    if (raw.pointerType !== "pen") {
      this.lastPointerWasPen = false;
      return;
    }
    this.lastPointerWasPen = true;
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
    if (event.kind === "down") this.priorSceneIds = this.bridge.currentSceneIds();
    this.machine.setBarrelSource(this.pen?.isReady() ? "bridge" : "pointer");
    const effects = this.machine.handle(event);
    if (effects.length === 0) this.refreshOverlay(event);
    for (const effect of effects) this.applyEffect(effect, raw);
  }
  /**
   * Android delivers the barrel button as a MouseEvent contextmenu, often with
   * no pointerType. That is the right-click Samsung Notes does not use for erase.
   */
  onContextMenu(raw) {
    const pointerType = raw.pointerType;
    if (pointerType === "mouse" || pointerType === "touch") return;
    if (pointerType !== "pen" && !this.lastPointerWasPen) return;
    const event = normalizePointerEvent(
      raw,
      this.leaf.view.containerEl.contains(raw.target)
    );
    event.pointerType = "pen";
    event.kind = "contextmenu";
    this.machine.setBarrelSource(this.pen?.isReady() ? "bridge" : "pointer");
    for (const effect of this.machine.handle(event)) {
      if (effect.type === "suppress-context-menu") this.blockContextMenu(raw);
      this.applyEffect(effect, raw);
    }
  }
  blockContextMenu(raw) {
    raw.preventDefault();
    raw.stopPropagation();
    if (typeof raw.stopImmediatePropagation === "function") raw.stopImmediatePropagation();
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
      case "erase-tap": {
        const prior = this.priorSceneIds;
        const point = effect.point;
        this.scheduler.setTimeout(() => {
          if (this.disposed) return;
          this.bridge.eraseStrokeAt(point, prior);
        }, 0);
        break;
      }
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
    const stored = await this.loadData() ?? {};
    this.settings = normalizeSettings(stored);
    if (stored.gestureRevision !== 2) await this.saveData(this.settings);
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
        else if (action === "context-menu") bridge.openContextMenu(point);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2RlYnVnL0RlYnVnTG9nZ2VyLnRzIiwgInNyYy9kaWFnbm9zdGljcy9EaWFnbm9zdGljc1NlcnZpY2UudHMiLCAic3JjL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZS50cyIsICJzcmMvZXhjYWxpZHJhdy9jb21wYXRpYmlsaXR5LnRzIiwgInNyYy9leGNhbGlkcmF3L3N5bnRoZXRpY1BvaW50ZXIudHMiLCAic3JjL2V4Y2FsaWRyYXcvc3Ryb2tlSGl0LnRzIiwgInNyYy9wZW5icmlkZ2UvcHJvdG9jb2wudHMiLCAic3JjL3NldHRpbmdzL3NldHRpbmdzLnRzIiwgInNyYy9kaWFnbm9zdGljcy92ZXJkaWN0LnRzIiwgInNyYy9kaWFnbm9zdGljcy9wcm9iZVN1bW1hcnkudHMiLCAic3JjL2RpYWdub3N0aWNzL3JlcG9ydC50cyIsICJzcmMvbWVudS9TdHlsdXNNZW51LnRzIiwgInNyYy9wZW5icmlkZ2UvUGVuQnJpZGdlQ2xpZW50LnRzIiwgInNyYy9wZW5icmlkZ2UvcGFpcmluZ1N0b3JlLnRzIiwgInNyYy9wZW5icmlkZ2UvUGVuU2lnbmFsSHViLnRzIiwgInNyYy9zZXR0aW5ncy9TZXR0aW5nc1RhYi50cyIsICJzcmMvZGlhZ25vc3RpY3MvUGVuRXZlbnRQcm9iZS50cyIsICJzcmMvZGVidWcvRGVidWdPdmVybGF5LnRzIiwgInNyYy9zdHlsdXMvbm9ybWFsaXplUG9pbnRlckV2ZW50LnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzR2VzdHVyZU1hY2hpbmUudHMiLCAic3JjL3N0eWx1cy9TdHlsdXNDb250cm9sbGVyLnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzVmlld1JlZ2lzdHJ5LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBOb3RpY2UsIFBsdWdpbiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgRGVidWdMb2dnZXIgfSBmcm9tIFwiLi9kZWJ1Zy9EZWJ1Z0xvZ2dlclwiO1xuaW1wb3J0IHsgRGlhZ25vc3RpY3NTZXJ2aWNlIH0gZnJvbSBcIi4vZGlhZ25vc3RpY3MvRGlhZ25vc3RpY3NTZXJ2aWNlXCI7XG5pbXBvcnQgdHlwZSB7IFByb2JlRXZlbnQgfSBmcm9tIFwiLi9kaWFnbm9zdGljcy9wcm9iZVN1bW1hcnlcIjtcbmltcG9ydCB7IGZvcm1hdEJyaWRnZVN0YXR1cywgaXNEaWFnbm9zdGljQnVpbGQgfSBmcm9tIFwiLi9kaWFnbm9zdGljcy9yZXBvcnRcIjtcbmltcG9ydCB7IFN0eWx1c01lbnUgfSBmcm9tIFwiLi9tZW51L1N0eWx1c01lbnVcIjtcbmltcG9ydCB7IFBlbkJyaWRnZUNsaWVudCwgdHlwZSBQZW5CcmlkZ2VTdGF0dXMgfSBmcm9tIFwiLi9wZW5icmlkZ2UvUGVuQnJpZGdlQ2xpZW50XCI7XG5pbXBvcnQgeyBQYWlyaW5nU3RvcmUgfSBmcm9tIFwiLi9wZW5icmlkZ2UvcGFpcmluZ1N0b3JlXCI7XG5pbXBvcnQgeyBQZW5TaWduYWxIdWIgfSBmcm9tIFwiLi9wZW5icmlkZ2UvUGVuU2lnbmFsSHViXCI7XG5pbXBvcnQgeyBkZWNvZGVQYWlyaW5nQ29kZSwgZmluZ2VycHJpbnQgfSBmcm9tIFwiLi9wZW5icmlkZ2UvcHJvdG9jb2xcIjtcbmltcG9ydCB7IFNldHRpbmdzVGFiIH0gZnJvbSBcIi4vc2V0dGluZ3MvU2V0dGluZ3NUYWJcIjtcbmltcG9ydCB7XG4gIERFRkFVTFRfU0VUVElOR1MsXG4gIGRlc2NyaWJlQmFycmVsU291cmNlLFxuICBub3JtYWxpemVTZXR0aW5ncyxcbiAgdHlwZSBFcmFzZXJTdHJhdGVneSxcbiAgdHlwZSBTdHlsdXNDb250cm9sc1NldHRpbmdzLFxufSBmcm9tIFwiLi9zZXR0aW5ncy9zZXR0aW5nc1wiO1xuaW1wb3J0IHsgU3R5bHVzVmlld1JlZ2lzdHJ5IH0gZnJvbSBcIi4vc3R5bHVzL1N0eWx1c1ZpZXdSZWdpc3RyeVwiO1xuaW1wb3J0IHR5cGUgeyBQb2ludCB9IGZyb20gXCIuL3N0eWx1cy90eXBlc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTdHlsdXNDb250cm9sc1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBTdHlsdXNDb250cm9sc1NldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HUztcbiAgcGFpcmluZ0ZpbmdlcnByaW50ID0gXCJcIjtcbiAgdGVtcG9yYXJ5RXJhc2VyTm90ZSA9IFwibm90IGNoZWNrZWRcIjtcbiAgcHJpdmF0ZSByZWdpc3RyeTogU3R5bHVzVmlld1JlZ2lzdHJ5IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWVudSA9IG5ldyBTdHlsdXNNZW51KCk7XG4gIHByaXZhdGUgcGFpcmluZyE6IFBhaXJpbmdTdG9yZTtcbiAgcHJpdmF0ZSBjbGllbnQhOiBQZW5CcmlkZ2VDbGllbnQ7XG4gIHByaXZhdGUgaHViITogUGVuU2lnbmFsSHViO1xuICBwcml2YXRlIGJyaWRnZUxvZyE6IERlYnVnTG9nZ2VyO1xuICBwcml2YXRlIGRpYWdub3N0aWNzITogRGlhZ25vc3RpY3NTZXJ2aWNlO1xuICBwcml2YXRlIHByb2JlUmluZzogUHJvYmVFdmVudFtdID0gW107XG4gIHByaXZhdGUgc2Vzc2lvbkVyYXNlclN0cmF0ZWd5OiBFcmFzZXJTdHJhdGVneSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHJlYWRvbmx5IGJyaWRnZUxpc3RlbmVycyA9IG5ldyBTZXQ8KCkgPT4gdm9pZD4oKTtcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgc3RvcmVkID0gKChhd2FpdCB0aGlzLmxvYWREYXRhKCkpID8/IHt9KSBhcyBQYXJ0aWFsPFN0eWx1c0NvbnRyb2xzU2V0dGluZ3M+O1xuICAgIHRoaXMuc2V0dGluZ3MgPSBub3JtYWxpemVTZXR0aW5ncyhzdG9yZWQpO1xuICAgIGlmIChzdG9yZWQuZ2VzdHVyZVJldmlzaW9uICE9PSAyKSBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICAgIHRoaXMucGFpcmluZyA9IG5ldyBQYWlyaW5nU3RvcmUodGhpcy5hcHApO1xuICAgIHRoaXMuYnJpZGdlTG9nID0gbmV3IERlYnVnTG9nZ2VyKFxuICAgICAgKCkgPT4gdGhpcy5zZXR0aW5ncy5kZWJ1Z01vZGUsXG4gICAgICBpc0RpYWdub3N0aWNCdWlsZCh0aGlzLm1hbmlmZXN0LnZlcnNpb24pXG4gICAgKTtcbiAgICB0aGlzLmh1YiA9IG5ldyBQZW5TaWduYWxIdWIoKCkgPT4gdGhpcy5jbGllbnQpO1xuICAgIHRoaXMuY2xpZW50ID0gbmV3IFBlbkJyaWRnZUNsaWVudCh7XG4gICAgICB1cmw6IHRoaXMuYnJpZGdlVXJsKCksXG4gICAgICBzZWNyZXQ6ICgpID0+IGRlY29kZVBhaXJpbmdDb2RlKHRoaXMucGFpcmluZy5sb2FkKCkpLFxuICAgICAgY2xpZW50VmVyc2lvbjogdGhpcy5tYW5pZmVzdC52ZXJzaW9uLFxuICAgICAgb25TdGF0dXM6IChzdGF0dXMpID0+IHRoaXMucHVibGlzaFN0YXR1cyhzdGF0dXMpLFxuICAgICAgb25CdXR0b246IChzaWduYWwpID0+IHRoaXMuaHViLmRpc3BhdGNoKHNpZ25hbCksXG4gICAgICBvbkNvbW1hbmQ6IChhY3Rpb24pID0+IHtcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJvcGVuLW1lbnVcIikgdGhpcy5vcGVuTWVudUZyb21CcmlkZ2UoKTtcbiAgICAgIH0sXG4gICAgICBkZWJ1ZzogKG1lc3NhZ2UpID0+IHRoaXMuYnJpZGdlTG9nLm1lc3NhZ2UobWVzc2FnZSksXG4gICAgfSk7XG4gICAgdGhpcy5yZWdpc3RyeSA9IG5ldyBTdHlsdXNWaWV3UmVnaXN0cnkoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgICgpID0+IHRoaXMuZWZmZWN0aXZlU2V0dGluZ3MoKSxcbiAgICAgIChhY3Rpb24sIHBvaW50LCBicmlkZ2UpID0+IHtcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJtZW51XCIpIHRoaXMubWVudS5vcGVuKHBvaW50LCBicmlkZ2UpO1xuICAgICAgICBlbHNlIGlmIChhY3Rpb24gPT09IFwiY29udGV4dC1tZW51XCIpIGJyaWRnZS5vcGVuQ29udGV4dE1lbnUocG9pbnQpO1xuICAgICAgICBlbHNlIGlmIChhY3Rpb24gPT09IFwiY29weVwiKSBicmlkZ2UuY29weVNlbGVjdGVkRWxlbWVudHMoKTtcbiAgICAgICAgZWxzZSBpZiAoYWN0aW9uID09PSBcInBhc3RlXCIpIGJyaWRnZS5wYXN0ZUF0KHBvaW50KTtcbiAgICAgIH0sXG4gICAgICB1bmRlZmluZWQsXG4gICAgICB7XG4gICAgICAgIHBlbjogdGhpcy5odWIsXG4gICAgICAgIGRpYWdub3N0aWM6IGlzRGlhZ25vc3RpY0J1aWxkKHRoaXMubWFuaWZlc3QudmVyc2lvbiksXG4gICAgICAgIG9uU3luYzogKCkgPT4gdGhpcy51cGRhdGVQZW5EZW1hbmQoKSxcbiAgICAgIH1cbiAgICApO1xuICAgIHRoaXMuaHViLnNldEZhbGxiYWNrKCgpID0+IHRoaXMucmVnaXN0cnk/LmZhbGxiYWNrVGFyZ2V0KCkgPz8gbnVsbCk7XG4gICAgdGhpcy5kaWFnbm9zdGljcyA9IG5ldyBEaWFnbm9zdGljc1NlcnZpY2UodGhpcyk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTZXR0aW5nc1RhYih0aGlzKSk7XG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbihcImxheW91dC1jaGFuZ2VcIiwgKCkgPT4gdGhpcy5yZWdpc3RyeT8uc3luYygpKSk7XG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGRvY3VtZW50LCBcInZpc2liaWxpdHljaGFuZ2VcIiwgKCkgPT4gdGhpcy51cGRhdGVQZW5EZW1hbmQoKSk7XG4gICAgdGhpcy5hcHAud29ya3NwYWNlLm9uTGF5b3V0UmVhZHkoKCkgPT4gdGhpcy5yZWdpc3RyeT8uc3luYygpKTtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwiY29weS1zdHlsdXMtZXZlbnQtdHJhY2VcIixcbiAgICAgIG5hbWU6IFwiQ29weSBsYXRlc3Qgc3R5bHVzIGV2ZW50IHRyYWNlXCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLmNvcHlTdHlsdXNFdmVudFRyYWNlKCksXG4gICAgfSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImNvcHktZGlhZ25vc3RpY3MtcmVwb3J0XCIsXG4gICAgICBuYW1lOiBcIkNvcHkgZGlhZ25vc3RpY3MgcmVwb3J0XCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLmNvcHlEaWFnbm9zdGljc1JlcG9ydCgpLFxuICAgIH0pO1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJyZWNvbm5lY3Qtc3Blbi1icmlkZ2VcIixcbiAgICAgIG5hbWU6IFwiUmVjb25uZWN0IFMgUGVuIGJyaWRnZVwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMucmVjb25uZWN0QnJpZGdlKCksXG4gICAgfSk7XG4gICAgdm9pZCB0aGlzLnJlZnJlc2hGaW5nZXJwcmludCgpO1xuICAgIHRoaXMudXBkYXRlUGVuRGVtYW5kKCk7XG4gIH1cblxuICBvbnVubG9hZCgpOiB2b2lkIHtcbiAgICB0aGlzLmNsaWVudC5kaXNwb3NlKCk7XG4gICAgdGhpcy5tZW51LmNsb3NlKCk7XG4gICAgdGhpcy5yZWdpc3RyeT8uZGlzcG9zZSgpO1xuICAgIHRoaXMucmVnaXN0cnkgPSBudWxsO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlU2V0dGluZ3MocGF0Y2g6IFBhcnRpYWw8U3R5bHVzQ29udHJvbHNTZXR0aW5ncz4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAocGF0Y2guZXJhc2VyU3RyYXRlZ3kpIHRoaXMuc2Vzc2lvbkVyYXNlclN0cmF0ZWd5ID0gbnVsbDtcbiAgICBjb25zdCBwcmV2aW91cyA9IHRoaXMuc2V0dGluZ3M7XG4gICAgdGhpcy5zZXR0aW5ncyA9IG5vcm1hbGl6ZVNldHRpbmdzKHsgLi4udGhpcy5zZXR0aW5ncywgLi4ucGF0Y2ggfSk7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgICB0aGlzLnJlZ2lzdHJ5Py5yZWZyZXNoKCk7XG4gICAgaWYgKFxuICAgICAgcHJldmlvdXMucGVuQnJpZGdlRW5hYmxlZCAhPT0gdGhpcy5zZXR0aW5ncy5wZW5CcmlkZ2VFbmFibGVkIHx8XG4gICAgICBwcmV2aW91cy5wZW5CcmlkZ2VQb3J0ICE9PSB0aGlzLnNldHRpbmdzLnBlbkJyaWRnZVBvcnRcbiAgICApIHtcbiAgICAgIHRoaXMuY2xpZW50LnNldFVybCh0aGlzLmJyaWRnZVVybCgpKTtcbiAgICAgIHRoaXMuY2xpZW50LnJlY29ubmVjdE5vdygpO1xuICAgIH1cbiAgICB0aGlzLnVwZGF0ZVBlbkRlbWFuZCgpO1xuICB9XG5cbiAgZWZmZWN0aXZlRXJhc2VyU3RyYXRlZ3koKTogRXJhc2VyU3RyYXRlZ3kge1xuICAgIHJldHVybiB0aGlzLnNlc3Npb25FcmFzZXJTdHJhdGVneSA/PyB0aGlzLnNldHRpbmdzLmVyYXNlclN0cmF0ZWd5O1xuICB9XG5cbiAgZWZmZWN0aXZlU2V0dGluZ3MoKTogU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB7XG4gICAgcmV0dXJuIHsgLi4udGhpcy5zZXR0aW5ncywgZXJhc2VyU3RyYXRlZ3k6IHRoaXMuZWZmZWN0aXZlRXJhc2VyU3RyYXRlZ3koKSB9O1xuICB9XG5cbiAgcGFpcmluZ0NvZGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5wYWlyaW5nLmxvYWQoKTtcbiAgfVxuXG4gIGFzeW5jIHNldFBhaXJpbmdDb2RlKGNvZGU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHRyaW1tZWQgPSBjb2RlLnRyaW0oKTtcbiAgICBpZiAoIWRlY29kZVBhaXJpbmdDb2RlKHRyaW1tZWQpKSB7XG4gICAgICBuZXcgTm90aWNlKFwiUGFpcmluZyBjb2RlIG11c3QgZGVjb2RlIHRvIDMyIGJ5dGVzLlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5wYWlyaW5nLnNhdmUodHJpbW1lZCk7XG4gICAgYXdhaXQgdGhpcy5yZWZyZXNoRmluZ2VycHJpbnQoKTtcbiAgICB0aGlzLmNsaWVudC5yZWNvbm5lY3ROb3coKTtcbiAgICB0aGlzLnVwZGF0ZVBlbkRlbWFuZCgpO1xuICAgIHRoaXMubm90aWZ5QnJpZGdlKCk7XG4gIH1cblxuICBhc3luYyBjbGVhclBhaXJpbmdDb2RlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMucGFpcmluZy5jbGVhcigpO1xuICAgIHRoaXMucGFpcmluZ0ZpbmdlcnByaW50ID0gXCJcIjtcbiAgICB0aGlzLmNsaWVudC5yZWNvbm5lY3ROb3coKTtcbiAgICB0aGlzLnVwZGF0ZVBlbkRlbWFuZCgpO1xuICAgIHRoaXMubm90aWZ5QnJpZGdlKCk7XG4gIH1cblxuICBicmlkZ2VTbmFwc2hvdCgpIHtcbiAgICByZXR1cm4gdGhpcy5jbGllbnQuc25hcHNob3QoKTtcbiAgfVxuXG4gIGJyaWRnZVJlYWR5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNsaWVudC5pc1JlYWR5KCk7XG4gIH1cblxuICBicmlkZ2VTdGF0dXNUZXh0KCk6IHN0cmluZyB7XG4gICAgY29uc3Qgc25hcHNob3QgPSB0aGlzLmNsaWVudC5zbmFwc2hvdCgpO1xuICAgIGNvbnN0IHNvdXJjZSA9IGRlc2NyaWJlQmFycmVsU291cmNlKHRoaXMuZWZmZWN0aXZlU2V0dGluZ3MoKSwgdGhpcy5jbGllbnQuaXNSZWFkeSgpKTtcbiAgICByZXR1cm4gYCR7Zm9ybWF0QnJpZGdlU3RhdHVzKHNuYXBzaG90KX0gXHUwMEI3ICR7c291cmNlfWA7XG4gIH1cblxuICB3YXRjaEJyaWRnZShsaXN0ZW5lcjogKCkgPT4gdm9pZCk6ICgpID0+IHZvaWQge1xuICAgIHRoaXMuYnJpZGdlTGlzdGVuZXJzLmFkZChsaXN0ZW5lcik7XG4gICAgcmV0dXJuICgpID0+IHRoaXMuYnJpZGdlTGlzdGVuZXJzLmRlbGV0ZShsaXN0ZW5lcik7XG4gIH1cblxuICBzZXRQcm9iZUV2ZW50cyhldmVudHM6IFByb2JlRXZlbnRbXSk6IHZvaWQge1xuICAgIHRoaXMucHJvYmVSaW5nID0gZXZlbnRzO1xuICB9XG5cbiAgcHJvYmVFdmVudHMoKTogUHJvYmVFdmVudFtdIHtcbiAgICByZXR1cm4gdGhpcy5wcm9iZVJpbmc7XG4gIH1cblxuICBsb2dMaW5lcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLmJyaWRnZUxvZy5yZWNlbnRNZXNzYWdlcygpLCAuLi4odGhpcy5yZWdpc3RyeT8ucmVjZW50TWVzc2FnZXMoKSA/PyBbXSldLnNsaWNlKFxuICAgICAgLTEwMFxuICAgICk7XG4gIH1cblxuICBzZXRUZW1wb3JhcnlFcmFzZXIobm90ZTogc3RyaW5nLCBzdHJhdGVneTogRXJhc2VyU3RyYXRlZ3kgfCBudWxsKTogdm9pZCB7XG4gICAgdGhpcy50ZW1wb3JhcnlFcmFzZXJOb3RlID0gbm90ZTtcbiAgICBpZiAoc3RyYXRlZ3kpIHRoaXMuc2Vzc2lvbkVyYXNlclN0cmF0ZWd5ID0gc3RyYXRlZ3k7XG4gICAgdGhpcy5yZWdpc3RyeT8ucmVmcmVzaCgpO1xuICB9XG5cbiAgY2hlY2tCcmlkZ2UoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlhZ25vc3RpY3MuY2hlY2tCcmlkZ2UoKTtcbiAgfVxuXG4gIGJyaWRnZUNoZWNrTGluZXMoKTogc3RyaW5nW10ge1xuICAgIHJldHVybiB0aGlzLmRpYWdub3N0aWNzLmNoZWNrTGluZXMoKTtcbiAgfVxuXG4gIGNvcHlEaWFnbm9zdGljc1JlcG9ydCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5kaWFnbm9zdGljcy5jb3B5UmVwb3J0KCk7XG4gIH1cblxuICBydW5UZW1wb3JhcnlFcmFzZXJUZXN0KCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHRoaXMuZGlhZ25vc3RpY3MucnVuVGVtcG9yYXJ5RXJhc2VyVGVzdCgpO1xuICB9XG5cbiAgcmVjb25uZWN0QnJpZGdlKCk6IHZvaWQge1xuICAgIHRoaXMuY2xpZW50LnNldFVybCh0aGlzLmJyaWRnZVVybCgpKTtcbiAgICB0aGlzLmNsaWVudC5yZWNvbm5lY3ROb3coKTtcbiAgICB0aGlzLnVwZGF0ZVBlbkRlbWFuZCgpO1xuICB9XG5cbiAgYXN5bmMgY29weVN0eWx1c0V2ZW50VHJhY2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdHJhY2UgPSB0aGlzLnJlZ2lzdHJ5Py5leHBvcnRUcmFjZXMoKSA/PyBcIltdXCI7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHRyYWNlKTtcbiAgICAgIG5ldyBOb3RpY2UoXCJTdHlsdXMgZXZlbnQgdHJhY2UgY29waWVkIGFzIEpTT04uXCIpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgbmV3IE5vdGljZShcIlVuYWJsZSB0byBjb3B5IHRoZSBzdHlsdXMgdHJhY2UuIENoZWNrIHRoZSBkZXZlbG9wZXIgY29uc29sZS5cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaXNoU3RhdHVzKHN0YXR1czogUGVuQnJpZGdlU3RhdHVzKTogdm9pZCB7XG4gICAgdGhpcy5icmlkZ2VMb2cubWVzc2FnZShgYnJpZGdlIHN0YXR1czogJHtzdGF0dXMuc3RhdGV9YCk7XG4gICAgdGhpcy5ub3RpZnlCcmlkZ2UoKTtcbiAgfVxuXG4gIHByaXZhdGUgbm90aWZ5QnJpZGdlKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgdGhpcy5icmlkZ2VMaXN0ZW5lcnMpIGxpc3RlbmVyKCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlZnJlc2hGaW5nZXJwcmludCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBzZWNyZXQgPSBkZWNvZGVQYWlyaW5nQ29kZSh0aGlzLnBhaXJpbmcubG9hZCgpKTtcbiAgICB0aGlzLnBhaXJpbmdGaW5nZXJwcmludCA9IHNlY3JldCA/IGF3YWl0IGZpbmdlcnByaW50KHNlY3JldCkgOiBcIlwiO1xuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGVQZW5EZW1hbmQoKTogdm9pZCB7XG4gICAgY29uc3QgdmlzaWJsZSA9IHR5cGVvZiBkb2N1bWVudCA9PT0gXCJ1bmRlZmluZWRcIiB8fCBkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUgIT09IFwiaGlkZGVuXCI7XG4gICAgdGhpcy5jbGllbnQuc2V0RGVtYW5kKFxuICAgICAgdGhpcy5zZXR0aW5ncy5wZW5CcmlkZ2VFbmFibGVkICYmXG4gICAgICAgIGRlY29kZVBhaXJpbmdDb2RlKHRoaXMucGFpcmluZy5sb2FkKCkpICE9PSBudWxsICYmXG4gICAgICAgICh0aGlzLnJlZ2lzdHJ5Py5zaXplKCkgPz8gMCkgPiAwICYmXG4gICAgICAgIHZpc2libGVcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBvcGVuTWVudUZyb21CcmlkZ2UoKTogdm9pZCB7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5odWIucm91dGUoKTtcbiAgICBpZiAoIXRhcmdldCkge1xuICAgICAgbmV3IE5vdGljZShcIk9wZW4gYW4gRXhjYWxpZHJhdyBkcmF3aW5nIGZpcnN0LlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcG9pbnQgPSB0YXJnZXQubGFzdFBlblBvaW50KCkgPz8gdmlld3BvcnRDZW50ZXIoKTtcbiAgICB0aGlzLm1lbnUub3Blbihwb2ludCwgdGFyZ2V0LmJyaWRnZUZvck1lbnUoKSk7XG4gIH1cblxuICBwcml2YXRlIGJyaWRnZVVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgd3M6Ly8xMjcuMC4wLjE6JHt0aGlzLnNldHRpbmdzLnBlbkJyaWRnZVBvcnR9L3YxL3BlbmA7XG4gIH1cbn1cblxuZnVuY3Rpb24gdmlld3BvcnRDZW50ZXIoKTogUG9pbnQge1xuICByZXR1cm4ge1xuICAgIHg6IE1hdGgucm91bmQod2luZG93LmlubmVyV2lkdGggLyAyKSxcbiAgICB5OiBNYXRoLnJvdW5kKHdpbmRvdy5pbm5lckhlaWdodCAvIDIpLFxuICB9O1xufVxuIiwgImltcG9ydCB0eXBlIHsgTm9ybWFsaXplZFN0eWx1c0V2ZW50IH0gZnJvbSBcIi4uL3N0eWx1cy90eXBlc1wiO1xuXG5leHBvcnQgY2xhc3MgRGVidWdMb2dnZXIge1xuICBwcml2YXRlIHRyYWNlOiBOb3JtYWxpemVkU3R5bHVzRXZlbnRbXSA9IFtdO1xuICBwcml2YXRlIG1lc3NhZ2VzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVuYWJsZWQ6ICgpID0+IGJvb2xlYW4sXG4gICAgcHJpdmF0ZSByZWFkb25seSByZXRhaW5NZXNzYWdlcyA9IGZhbHNlXG4gICkge31cblxuICBldmVudChldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZWQoKSkgcmV0dXJuO1xuICAgIHRoaXMudHJhY2UucHVzaChldmVudCk7XG4gICAgaWYgKHRoaXMudHJhY2UubGVuZ3RoID4gMTAwKSB0aGlzLnRyYWNlLnNoaWZ0KCk7XG4gICAgY29uc29sZS5kZWJ1ZyhcIltFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9sc11cIiwgZXZlbnQpO1xuICB9XG4gIG1lc3NhZ2UobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucmV0YWluTWVzc2FnZXMgfHwgdGhpcy5lbmFibGVkKCkpIHtcbiAgICAgIHRoaXMubWVzc2FnZXMucHVzaChtZXNzYWdlKTtcbiAgICAgIGlmICh0aGlzLm1lc3NhZ2VzLmxlbmd0aCA+IDIwMCkgdGhpcy5tZXNzYWdlcy5zaGlmdCgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbmFibGVkKCkpIGNvbnNvbGUuZGVidWcoXCJbRXhjYWxpZHJhdyBTdHlsdXMgQ29udHJvbHNdXCIsIG1lc3NhZ2UpO1xuICB9XG4gIHJlY2VudE1lc3NhZ2VzKGxpbWl0ID0gMTAwKTogc3RyaW5nW10ge1xuICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzLnNsaWNlKC1saW1pdCk7XG4gIH1cbiAgZXhwb3J0VHJhY2UoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy50cmFjZSwgbnVsbCwgMik7XG4gIH1cbiAgY2xlYXIoKTogdm9pZCB7XG4gICAgdGhpcy50cmFjZSA9IFtdO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgTW9kYWwsIE5vdGljZSwgUGxhdGZvcm0sIGFwaVZlcnNpb24sIHJlcXVlc3RVcmwsIHR5cGUgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBFeGNhbGlkcmF3QnJpZGdlIH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZVwiO1xuaW1wb3J0IHtcbiAgZ2V0R2xvYmFsQXV0b21hdGUsXG4gIGdldExlYWZBcGksXG4gIGhhc05ld0VsZW1lbnRGaWVsZCxcbiAgcmVhZEFjdGl2ZVRvb2wsXG4gIHJlYWRJbnN0YWxsZWRFeGNhbGlkcmF3LFxuICB0b29sQ2FwYWJpbGl0aWVzLFxufSBmcm9tIFwiLi4vZXhjYWxpZHJhdy9jb21wYXRpYmlsaXR5XCI7XG5pbXBvcnQgdHlwZSB7IFBlbkJyaWRnZVNuYXBzaG90IH0gZnJvbSBcIi4uL3BlbmJyaWRnZS9QZW5CcmlkZ2VDbGllbnRcIjtcbmltcG9ydCB7XG4gIENMT1NFLFxuICBkZWNvZGVQYWlyaW5nQ29kZSxcbiAgbmV3Tm9uY2UsXG4gIHBhcnNlU2VydmVyRnJhbWUsXG4gIHByb29mLFxuICBzYWZlRXF1YWwsXG4gIHR5cGUgSGVsbG9GcmFtZSxcbn0gZnJvbSBcIi4uL3BlbmJyaWRnZS9wcm90b2NvbFwiO1xuaW1wb3J0IHtcbiAgZGVzY3JpYmVCYXJyZWxTb3VyY2UsXG4gIHR5cGUgRXJhc2VyU3RyYXRlZ3ksXG4gIHR5cGUgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyxcbn0gZnJvbSBcIi4uL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgdHlwZSB7IFByb2JlRXZlbnQgfSBmcm9tIFwiLi9wcm9iZVN1bW1hcnlcIjtcbmltcG9ydCB7XG4gIGJ1aWxkUmVwb3J0LFxuICBjaHJvbWVWZXJzaW9uLFxuICB0b1RleHQsXG4gIHR5cGUgRGlhZ25vc3RpY3NSZXBvcnQsXG4gIHR5cGUgUmVwb3J0RXhjYWxpZHJhdyxcbn0gZnJvbSBcIi4vcmVwb3J0XCI7XG5pbXBvcnQge1xuICBmb3JtYXRDaGVja0xpbmVzLFxuICB0eXBlIEJyaWRnZUNoZWNrUmVzdWx0LFxuICB0eXBlIEhhbmRzaGFrZUNoZWNrLFxuICB0eXBlIEhlbGxvQ2hlY2ssXG4gIHR5cGUgSHR0cENoZWNrLFxuICB0eXBlIFNlcnZlclByb29mQ2hlY2ssXG4gIHR5cGUgU291cmNlQ2hlY2ssXG59IGZyb20gXCIuL3ZlcmRpY3RcIjtcblxuZXhwb3J0IGludGVyZmFjZSBEaWFnbm9zdGljc0hvc3Qge1xuICBhcHA6IEFwcDtcbiAgbWFuaWZlc3Q6IHsgdmVyc2lvbjogc3RyaW5nIH07XG4gIHNldHRpbmdzOiBTdHlsdXNDb250cm9sc1NldHRpbmdzO1xuICBlZmZlY3RpdmVFcmFzZXJTdHJhdGVneSgpOiBFcmFzZXJTdHJhdGVneTtcbiAgcGFpcmluZ0NvZGUoKTogc3RyaW5nO1xuICBicmlkZ2VTbmFwc2hvdCgpOiBQZW5CcmlkZ2VTbmFwc2hvdCB8IG51bGw7XG4gIHByb2JlRXZlbnRzKCk6IFByb2JlRXZlbnRbXTtcbiAgbG9nTGluZXMoKTogc3RyaW5nW107XG4gIHRlbXBvcmFyeUVyYXNlck5vdGU6IHN0cmluZztcbiAgYnJpZGdlUmVhZHkoKTogYm9vbGVhbjtcbiAgc2V0VGVtcG9yYXJ5RXJhc2VyKG5vdGU6IHN0cmluZywgc3RyYXRlZ3k6IEVyYXNlclN0cmF0ZWd5IHwgbnVsbCk6IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBEaWFnbm9zdGljc1NlcnZpY2Uge1xuICBsYXN0Q2hlY2s6IEJyaWRnZUNoZWNrUmVzdWx0IHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBob3N0OiBEaWFnbm9zdGljc0hvc3QpIHt9XG5cbiAgYXN5bmMgY2hlY2tCcmlkZ2UoKTogUHJvbWlzZTxCcmlkZ2VDaGVja1Jlc3VsdD4ge1xuICAgIGNvbnN0IGh0dHAgPSBhd2FpdCB0aGlzLmNoZWNrSHR0cCh0aGlzLmhvc3Quc2V0dGluZ3MucGVuQnJpZGdlUG9ydCk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5jaGVja1NvY2tldCh0aGlzLmhvc3Quc2V0dGluZ3MucGVuQnJpZGdlUG9ydCwgaHR0cCk7XG4gICAgdGhpcy5sYXN0Q2hlY2sgPSByZXN1bHQ7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHJlcG9ydCgpOiBEaWFnbm9zdGljc1JlcG9ydCB7XG4gICAgY29uc3Qgc2V0dGluZ3MgPSB0aGlzLmhvc3Quc2V0dGluZ3M7XG4gICAgcmV0dXJuIGJ1aWxkUmVwb3J0KHtcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIG9ic2lkaWFuVmVyc2lvbjogYXBpVmVyc2lvbixcbiAgICAgICAgYW5kcm9pZDogUGxhdGZvcm0uaXNBbmRyb2lkQXBwLFxuICAgICAgICB0YWJsZXQ6IFBsYXRmb3JtLmlzVGFibGV0LFxuICAgICAgICBwbHVnaW5WZXJzaW9uOiB0aGlzLmhvc3QubWFuaWZlc3QudmVyc2lvbixcbiAgICAgICAgY2hyb21lOiBjaHJvbWVWZXJzaW9uKG5hdmlnYXRvci51c2VyQWdlbnQpLFxuICAgICAgICBzY3JlZW46IHtcbiAgICAgICAgICB3aWR0aDogTWF0aC5yb3VuZCh3aW5kb3cuaW5uZXJXaWR0aCksXG4gICAgICAgICAgaGVpZ2h0OiBNYXRoLnJvdW5kKHdpbmRvdy5pbm5lckhlaWdodCksXG4gICAgICAgIH0sXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgYmFycmVsQnV0dG9uTWFzazogc2V0dGluZ3MuYmFycmVsQnV0dG9uTWFzayxcbiAgICAgICAgICBwcmltYXJ5Q29udGFjdE1vZGU6IHNldHRpbmdzLnByaW1hcnlDb250YWN0TW9kZSxcbiAgICAgICAgICBlcmFzZXJTdHJhdGVneTogc2V0dGluZ3MuZXJhc2VyU3RyYXRlZ3ksXG4gICAgICAgICAgZWZmZWN0aXZlRXJhc2VyU3RyYXRlZ3k6IHRoaXMuaG9zdC5lZmZlY3RpdmVFcmFzZXJTdHJhdGVneSgpLFxuICAgICAgICAgIGxhdGVXaW5kb3dNczogc2V0dGluZ3MubGF0ZVdpbmRvd01zLFxuICAgICAgICAgIG1pZFN0cm9rZVByZXNzOiBzZXR0aW5ncy5taWRTdHJva2VQcmVzcyxcbiAgICAgICAgICBwZW5CcmlkZ2VFbmFibGVkOiBzZXR0aW5ncy5wZW5CcmlkZ2VFbmFibGVkLFxuICAgICAgICAgIHBlbkJyaWRnZVBvcnQ6IHNldHRpbmdzLnBlbkJyaWRnZVBvcnQsXG4gICAgICAgICAgc3VwcHJlc3NIb3ZlckJ1dHRvbkV2ZW50czogc2V0dGluZ3Muc3VwcHJlc3NIb3ZlckJ1dHRvbkV2ZW50cyxcbiAgICAgICAgICBidXR0b25Db250YWN0QWN0aW9uOiBzZXR0aW5ncy5idXR0b25Db250YWN0QWN0aW9uLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGJyaWRnZUNoZWNrOiB0aGlzLmxhc3RDaGVjayxcbiAgICAgIGxpdmU6IHRoaXMuaG9zdC5icmlkZ2VTbmFwc2hvdCgpLFxuICAgICAgYmFycmVsU291cmNlOiBkZXNjcmliZUJhcnJlbFNvdXJjZShzZXR0aW5ncywgdGhpcy5ob3N0LmJyaWRnZVJlYWR5KCkpLFxuICAgICAgcHJvYmVFdmVudHM6IHRoaXMuaG9zdC5wcm9iZUV2ZW50cygpLFxuICAgICAgZXhjYWxpZHJhdzogdGhpcy5leGNhbGlkcmF3KCksXG4gICAgICBsb2c6IHRoaXMuaG9zdC5sb2dMaW5lcygpLFxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgY29weVJlcG9ydCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB0ZXh0ID0gdG9UZXh0KHRoaXMucmVwb3J0KCkpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCh0ZXh0KTtcbiAgICAgIG5ldyBOb3RpY2UoXCJEaWFnbm9zdGljcyByZXBvcnQgY29waWVkLlwiKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnN0IG1vZGFsID0gbmV3IE1vZGFsKHRoaXMuaG9zdC5hcHApO1xuICAgICAgbW9kYWwudGl0bGVFbC5zZXRUZXh0KFwiRGlhZ25vc3RpY3MgcmVwb3J0XCIpO1xuICAgICAgY29uc3QgYXJlYSA9IG1vZGFsLmNvbnRlbnRFbC5jcmVhdGVFbChcInRleHRhcmVhXCIpO1xuICAgICAgYXJlYS52YWx1ZSA9IHRleHQ7XG4gICAgICBhcmVhLnN0eWxlLndpZHRoID0gXCIxMDAlXCI7XG4gICAgICBhcmVhLnN0eWxlLm1pbkhlaWdodCA9IFwiMjQwcHhcIjtcbiAgICAgIG1vZGFsLm9wZW4oKTtcbiAgICAgIGFyZWEuZm9jdXMoKTtcbiAgICAgIGFyZWEuc2VsZWN0KCk7XG4gICAgfVxuICB9XG5cbiAgY2hlY2tMaW5lcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMubGFzdENoZWNrXG4gICAgICA/IGZvcm1hdENoZWNrTGluZXModGhpcy5sYXN0Q2hlY2spXG4gICAgICA6IFtcIkJyaWRnZSBoYXMgbm90IGJlZW4gY2hlY2tlZCBpbiB0aGlzIHNlc3Npb24uXCJdO1xuICB9XG5cbiAgYXN5bmMgcnVuVGVtcG9yYXJ5RXJhc2VyVGVzdCgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IGxlYWYgPSB0aGlzLmhvc3QuYXBwLndvcmtzcGFjZS5hY3RpdmVMZWFmO1xuICAgIGlmICghbGVhZiB8fCBsZWFmLnZpZXcuZ2V0Vmlld1R5cGUoKSAhPT0gXCJleGNhbGlkcmF3XCIpIHtcbiAgICAgIGNvbnN0IG5vdGUgPSBcIk9wZW4gYSBuZXcsIGVtcHR5IGRyYXdpbmcgZmlyc3RcIjtcbiAgICAgIHRoaXMuaG9zdC5zZXRUZW1wb3JhcnlFcmFzZXIobm90ZSwgbnVsbCk7XG4gICAgICByZXR1cm4gbm90ZTtcbiAgICB9XG4gICAgaWYgKFxuICAgICAgdHlwZW9mIHdpbmRvdy5jb25maXJtID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICF3aW5kb3cuY29uZmlybShcIlJ1biB0aGUgdGVtcG9yYXJ5IGVyYXNlciB0ZXN0IG9uIHRoaXMgZHJhd2luZz8gVXNlIGEgbmV3LCBlbXB0eSBkcmF3aW5nLlwiKVxuICAgICkge1xuICAgICAgcmV0dXJuIFwiQ2FuY2VsbGVkXCI7XG4gICAgfVxuICAgIGNvbnN0IGNhbnZhcyA9IGxlYWYudmlldy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFwiY2FudmFzXCIpID8/IGxlYWYudmlldy5jb250YWluZXJFbDtcbiAgICBjb25zdCByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IGJyaWRnZSA9IG5ldyBFeGNhbGlkcmF3QnJpZGdlKGxlYWYpO1xuICAgIGNvbnN0IGNlbnRlciA9IHtcbiAgICAgIGNsaWVudFg6IHJlY3QubGVmdCArIHJlY3Qud2lkdGggLyAyLFxuICAgICAgY2xpZW50WTogcmVjdC50b3AgKyByZWN0LmhlaWdodCAvIDIsXG4gICAgfTtcbiAgICBsZXQgYmVnYW4gPSBmYWxzZTtcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwicG9pbnRlcmRvd25cIixcbiAgICAgIChldmVudCkgPT4ge1xuICAgICAgICBiZWdhbiA9IGJyaWRnZS5iZWdpbk1vbWVudGFyeUVyYXNlcihldmVudCBhcyBQb2ludGVyRXZlbnQpLm9rO1xuICAgICAgfSxcbiAgICAgIHsgY2FwdHVyZTogdHJ1ZSwgb25jZTogdHJ1ZSB9XG4gICAgKTtcbiAgICBjYW52YXMuZGlzcGF0Y2hFdmVudChwZW5FdmVudChcInBvaW50ZXJkb3duXCIsIGNlbnRlciwgeyBidXR0b246IDAsIGJ1dHRvbnM6IDEsIHByZXNzdXJlOiAwLjUgfSkpO1xuICAgIGF3YWl0IHdhaXRGcmFtZSgpO1xuICAgIGNvbnN0IGR1cmluZyA9IHJlYWRUb29sKGxlYWYudmlldyk7XG4gICAgY2FudmFzLmRpc3BhdGNoRXZlbnQocGVuRXZlbnQoXCJwb2ludGVydXBcIiwgY2VudGVyLCB7IGJ1dHRvbjogMCwgYnV0dG9uczogMCwgcHJlc3N1cmU6IDAgfSkpO1xuICAgIGF3YWl0IHdhaXRGcmFtZSgpO1xuICAgIGNvbnN0IGFmdGVyID0gcmVhZFRvb2wobGVhZi52aWV3KTtcbiAgICBjb25zdCBhdmFpbGFibGUgPSBiZWdhbiAmJiBkdXJpbmcgPT09IFwiZXJhc2VyXCIgJiYgYWZ0ZXIgIT09IFwiZXJhc2VyXCI7XG4gICAgY29uc3Qgbm90ZSA9IGF2YWlsYWJsZVxuICAgICAgPyBcImZvcmsgdGVtcC1lcmFzZXI6IGF2YWlsYWJsZVwiXG4gICAgICA6IFwibm90IGF2YWlsYWJsZSBcdTIxOTIgdXNpbmcgc2V0QWN0aXZlVG9vbCBmYWxsYmFja1wiO1xuICAgIHRoaXMuaG9zdC5zZXRUZW1wb3JhcnlFcmFzZXIobm90ZSwgYXZhaWxhYmxlID8gXCJzeW50aGV0aWMtYnV0dG9uNVwiIDogXCJzZXQtYWN0aXZlLXRvb2xcIik7XG4gICAgcmV0dXJuIG5vdGU7XG4gIH1cblxuICBwcml2YXRlIGV4Y2FsaWRyYXcoKTogUmVwb3J0RXhjYWxpZHJhdyB7XG4gICAgY29uc3QgaW5zdGFsbGVkID0gcmVhZEluc3RhbGxlZEV4Y2FsaWRyYXcodGhpcy5ob3N0LmFwcCk7XG4gICAgY29uc3QgYXV0b21hdGUgPSBnZXRHbG9iYWxBdXRvbWF0ZSgpO1xuICAgIGNvbnN0IHZpZXcgPSB0aGlzLmhvc3QuYXBwLndvcmtzcGFjZS5hY3RpdmVMZWFmPy52aWV3O1xuICAgIGxldCBjYW5SZWFkQWN0aXZlVG9vbCA9IGZhbHNlO1xuICAgIGxldCBjYW5TZXRBY3RpdmVUb29sID0gZmFsc2U7XG4gICAgbGV0IG5ld0VsZW1lbnQ6IGJvb2xlYW4gfCBudWxsID0gbnVsbDtcbiAgICBpZiAodmlldz8uZ2V0Vmlld1R5cGUoKSA9PT0gXCJleGNhbGlkcmF3XCIpIHtcbiAgICAgIGNvbnN0IGFwaSA9IGdldExlYWZBcGkodmlldyk7XG4gICAgICBpZiAoYXBpLm9rKSB7XG4gICAgICAgIGNvbnN0IGNhcGFiaWxpdGllcyA9IHRvb2xDYXBhYmlsaXRpZXMoYXBpLnZhbHVlKTtcbiAgICAgICAgY2FuUmVhZEFjdGl2ZVRvb2wgPSBjYXBhYmlsaXRpZXMuY2FuUmVhZEFjdGl2ZVRvb2w7XG4gICAgICAgIGNhblNldEFjdGl2ZVRvb2wgPSBjYXBhYmlsaXRpZXMuY2FuU2V0QWN0aXZlVG9vbDtcbiAgICAgICAgbmV3RWxlbWVudCA9IGhhc05ld0VsZW1lbnRGaWVsZChhcGkudmFsdWUuZ2V0QXBwU3RhdGUoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBpbnN0YWxsZWQ6IGluc3RhbGxlZC5pbnN0YWxsZWQsXG4gICAgICBlbmFibGVkOiBpbnN0YWxsZWQuZW5hYmxlZCxcbiAgICAgIHZlcnNpb246IGluc3RhbGxlZC52ZXJzaW9uLFxuICAgICAgYXV0b21hdGU6IGF1dG9tYXRlICE9PSBudWxsLFxuICAgICAgY2FuUmVhZEFjdGl2ZVRvb2wsXG4gICAgICBjYW5TZXRBY3RpdmVUb29sLFxuICAgICAgZGVsZXRlVmlld0VsZW1lbnRzOiB0eXBlb2YgYXV0b21hdGU/LmRlbGV0ZVZpZXdFbGVtZW50cyA9PT0gXCJmdW5jdGlvblwiLFxuICAgICAgbmV3RWxlbWVudCxcbiAgICAgIHRlbXBvcmFyeUVyYXNlcjogdGhpcy5ob3N0LnRlbXBvcmFyeUVyYXNlck5vdGUsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tIdHRwKHBvcnQ6IG51bWJlcik6IFByb21pc2U8SHR0cENoZWNrPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7IHVybDogYGh0dHA6Ly8xMjcuMC4wLjE6JHtwb3J0fS9oZWFsdGhgLCB0aHJvdzogZmFsc2UgfSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvazogcmVzcG9uc2Uuc3RhdHVzID09PSAyMDAsXG4gICAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgICBib2R5OiByZXNwb25zZS50ZXh0LnNsaWNlKDAsIDIwMCksXG4gICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb2s6IGZhbHNlLFxuICAgICAgICBzdGF0dXM6IG51bGwsXG4gICAgICAgIGJvZHk6IG51bGwsXG4gICAgICAgIGVycm9yOiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcInJlcXVlc3QgZmFpbGVkXCIpLnNsaWNlKDAsIDMwMCksXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tTb2NrZXQocG9ydDogbnVtYmVyLCBodHRwOiBIdHRwQ2hlY2spOiBQcm9taXNlPEJyaWRnZUNoZWNrUmVzdWx0PiB7XG4gICAgY29uc3Qgc2VjcmV0ID0gZGVjb2RlUGFpcmluZ0NvZGUodGhpcy5ob3N0LnBhaXJpbmdDb2RlKCkpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICAgIGxldCBvcGVuZWQgPSBmYWxzZTtcbiAgICAgIGxldCBoZWxsbzogSGVsbG9DaGVjayB8IG51bGwgPSBudWxsO1xuICAgICAgbGV0IGhlbGxvRnJhbWU6IEhlbGxvRnJhbWUgfCBudWxsID0gbnVsbDtcbiAgICAgIGxldCBjbGllbnROb25jZSA9IFwiXCI7XG4gICAgICBsZXQgaGFuZHNoYWtlOiBIYW5kc2hha2VDaGVjayA9IFwibm90LXJ1blwiO1xuICAgICAgbGV0IHNlcnZlclByb29mOiBTZXJ2ZXJQcm9vZkNoZWNrID0gXCJub3QtcnVuXCI7XG4gICAgICBsZXQgc291cmNlOiBTb3VyY2VDaGVjayB8IG51bGwgPSBudWxsO1xuICAgICAgY29uc3Qgc3RhcnRlZCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgY29uc3Qgc29ja2V0ID0gbmV3IFdlYlNvY2tldChgd3M6Ly8xMjcuMC4wLjE6JHtwb3J0fS92MS9wZW5gKTtcbiAgICAgIGNvbnN0IGZpbmlzaCA9IChcbiAgICAgICAgY2xvc2VDb2RlOiBudW1iZXIgfCBudWxsLFxuICAgICAgICBjbG9zZVJlYXNvbjogc3RyaW5nIHwgbnVsbCxcbiAgICAgICAgd2FzQ2xlYW46IGJvb2xlYW4gfCBudWxsLFxuICAgICAgICBlcnJvcjogc3RyaW5nIHwgbnVsbFxuICAgICAgKSA9PiB7XG4gICAgICAgIGlmIChzZXR0bGVkKSByZXR1cm47XG4gICAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgaHR0cCxcbiAgICAgICAgICB3ZWJzb2NrZXQ6IHtcbiAgICAgICAgICAgIG9rOiBvcGVuZWQsXG4gICAgICAgICAgICBvcGVuTXM6IG9wZW5lZCA/IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydGVkKSA6IG51bGwsXG4gICAgICAgICAgICBlcnJvcixcbiAgICAgICAgICAgIGNsb3NlQ29kZSxcbiAgICAgICAgICAgIGNsb3NlUmVhc29uLFxuICAgICAgICAgICAgd2FzQ2xlYW4sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBoZWxsbyxcbiAgICAgICAgICBoYW5kc2hha2UsXG4gICAgICAgICAgc2VydmVyUHJvb2YsXG4gICAgICAgICAgc291cmNlLFxuICAgICAgICB9KTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gQWxyZWFkeSBjbG9zZWQuXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBjb25zdCB0aW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KFxuICAgICAgICAoKSA9PiBmaW5pc2gobnVsbCwgXCJ0aW1lb3V0XCIsIGZhbHNlLCBvcGVuZWQgPyBudWxsIDogXCJ0aW1lb3V0XCIpLFxuICAgICAgICAzMDAwXG4gICAgICApO1xuICAgICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoXCJvcGVuXCIsICgpID0+IHtcbiAgICAgICAgb3BlbmVkID0gdHJ1ZTtcbiAgICAgIH0pO1xuICAgICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCAoKSA9PiB7XG4gICAgICAgIGlmICghb3BlbmVkKSBmaW5pc2gobnVsbCwgbnVsbCwgZmFsc2UsIFwiZXJyb3IgZXZlbnRcIik7XG4gICAgICB9KTtcbiAgICAgIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKFwiY2xvc2VcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgIGlmIChoYW5kc2hha2UgPT09IFwibm90LXJ1blwiICYmIGV2ZW50LmNvZGUgPT09IENMT1NFLkFVVEgpIGhhbmRzaGFrZSA9IFwid3JvbmctY29kZVwiO1xuICAgICAgICBlbHNlIGlmIChoYW5kc2hha2UgPT09IFwibm90LXJ1blwiICYmIGV2ZW50LmNvZGUgPT09IENMT1NFLlBST1RPQ09MKSBoYW5kc2hha2UgPSBcInByb3RvY29sXCI7XG4gICAgICAgIGVsc2UgaWYgKGhhbmRzaGFrZSA9PT0gXCJub3QtcnVuXCIpIGhhbmRzaGFrZSA9IHNlY3JldCA/IFwiZmFpbGVkXCIgOiBcInNraXBwZWRcIjtcbiAgICAgICAgZmluaXNoKGV2ZW50LmNvZGUsIGV2ZW50LnJlYXNvbiwgZXZlbnQud2FzQ2xlYW4sIG9wZW5lZCA/IG51bGwgOiBcImVycm9yIGV2ZW50XCIpO1xuICAgICAgfSk7XG4gICAgICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgZXZlbnQuZGF0YSAhPT0gXCJzdHJpbmdcIikgcmV0dXJuO1xuICAgICAgICBjb25zdCBmcmFtZSA9IHBhcnNlU2VydmVyRnJhbWUoZXZlbnQuZGF0YSk7XG4gICAgICAgIGlmICghZnJhbWUgfHwgZnJhbWUudHlwZSA9PT0gXCJ1bmtub3duXCIpIHJldHVybjtcbiAgICAgICAgaWYgKGZyYW1lLnR5cGUgPT09IFwiaGVsbG9cIikge1xuICAgICAgICAgIGhlbGxvRnJhbWUgPSBmcmFtZTtcbiAgICAgICAgICBoZWxsbyA9IHtcbiAgICAgICAgICAgIHByb3RvOiBmcmFtZS5wcm90byxcbiAgICAgICAgICAgIGFwcDogZnJhbWUuYXBwLFxuICAgICAgICAgICAgYXBwVmVyc2lvbjogZnJhbWUuYXBwVmVyc2lvbixcbiAgICAgICAgICAgIGNhcHM6IGZyYW1lLmNhcHMsXG4gICAgICAgICAgfTtcbiAgICAgICAgICBpZiAoIXNlY3JldCkge1xuICAgICAgICAgICAgaGFuZHNoYWtlID0gXCJza2lwcGVkXCI7XG4gICAgICAgICAgICBzZXJ2ZXJQcm9vZiA9IFwic2tpcHBlZFwiO1xuICAgICAgICAgICAgZmluaXNoKG51bGwsIG51bGwsIHRydWUsIG51bGwpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjbGllbnROb25jZSA9IG5ld05vbmNlKCk7XG4gICAgICAgICAgY29uc3Qgbm9uY2UgPSBmcmFtZS5ub25jZTtcbiAgICAgICAgICB2b2lkIHByb29mKHNlY3JldCwgbm9uY2UsIGNsaWVudE5vbmNlLCBcImNsaWVudFwiKS50aGVuKChjbGllbnRQcm9vZikgPT4ge1xuICAgICAgICAgICAgaWYgKHNldHRsZWQpIHJldHVybjtcbiAgICAgICAgICAgIHNvY2tldC5zZW5kKFxuICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJhdXRoXCIsXG4gICAgICAgICAgICAgICAgcHJvdG86IDEsXG4gICAgICAgICAgICAgICAgY2xpZW50OiBcImV4Y2FsaWRyYXctc3R5bHVzLWNvbnRyb2xzXCIsXG4gICAgICAgICAgICAgICAgY2xpZW50VmVyc2lvbjogdGhpcy5ob3N0Lm1hbmlmZXN0LnZlcnNpb24sXG4gICAgICAgICAgICAgICAgY2xpZW50Tm9uY2UsXG4gICAgICAgICAgICAgICAgcHJvb2Y6IGNsaWVudFByb29mLFxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZyYW1lLnR5cGUgIT09IFwicmVhZHlcIiB8fCAhaGVsbG9GcmFtZSB8fCAhc2VjcmV0IHx8ICFjbGllbnROb25jZSkgcmV0dXJuO1xuICAgICAgICBjb25zdCByZWFkeSA9IGZyYW1lO1xuICAgICAgICB2b2lkIHByb29mKHNlY3JldCwgaGVsbG9GcmFtZS5ub25jZSwgY2xpZW50Tm9uY2UsIFwic2VydmVyXCIpLnRoZW4oKGV4cGVjdGVkKSA9PiB7XG4gICAgICAgICAgaWYgKHNldHRsZWQpIHJldHVybjtcbiAgICAgICAgICBzZXJ2ZXJQcm9vZiA9IHNhZmVFcXVhbChleHBlY3RlZCwgcmVhZHkuc2VydmVyUHJvb2YpID8gXCJva1wiIDogXCJiYWRcIjtcbiAgICAgICAgICBoYW5kc2hha2UgPSBzZXJ2ZXJQcm9vZiA9PT0gXCJva1wiID8gXCJyZWFkeVwiIDogXCJ3cm9uZy1jb2RlXCI7XG4gICAgICAgICAgc291cmNlID0ge1xuICAgICAgICAgICAgc3RhdGU6IHJlYWR5LnNvdXJjZS5zdGF0ZSxcbiAgICAgICAgICAgIHJlYXNvbjogcmVhZHkuc291cmNlLnJlYXNvbixcbiAgICAgICAgICAgIG5vZGU6IHJlYWR5LnNvdXJjZS5ub2RlLFxuICAgICAgICAgICAgbmFtZTogcmVhZHkuc291cmNlLm5hbWUsXG4gICAgICAgICAgfTtcbiAgICAgICAgICBmaW5pc2gobnVsbCwgbnVsbCwgdHJ1ZSwgbnVsbCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZFRvb2wodmlldzogdW5rbm93bik6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBhcGkgPSBnZXRMZWFmQXBpKHZpZXcpO1xuICBpZiAoIWFwaS5vaykgcmV0dXJuIG51bGw7XG4gIHJldHVybiByZWFkQWN0aXZlVG9vbChhcGkudmFsdWUpPy50eXBlID8/IG51bGw7XG59XG5cbmZ1bmN0aW9uIHdhaXRGcmFtZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgaWYgKHR5cGVvZiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPT09IFwiZnVuY3Rpb25cIikgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHJlc29sdmUoKSk7XG4gICAgZWxzZSBzZXRUaW1lb3V0KHJlc29sdmUsIDApO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcGVuRXZlbnQoXG4gIHR5cGU6IHN0cmluZyxcbiAgY2VudGVyOiB7IGNsaWVudFg6IG51bWJlcjsgY2xpZW50WTogbnVtYmVyIH0sXG4gIG92ZXI6IFBvaW50ZXJFdmVudEluaXRcbik6IFBvaW50ZXJFdmVudCB7XG4gIHJldHVybiBuZXcgUG9pbnRlckV2ZW50KHR5cGUsIHtcbiAgICBidWJibGVzOiB0cnVlLFxuICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgY29tcG9zZWQ6IHRydWUsXG4gICAgcG9pbnRlcklkOiAxLFxuICAgIHBvaW50ZXJUeXBlOiBcInBlblwiLFxuICAgIGlzUHJpbWFyeTogdHJ1ZSxcbiAgICBjbGllbnRYOiBjZW50ZXIuY2xpZW50WCxcbiAgICBjbGllbnRZOiBjZW50ZXIuY2xpZW50WSxcbiAgICAuLi5vdmVyLFxuICB9KTtcbn1cbiIsICJpbXBvcnQgeyBOb3RpY2UsIHR5cGUgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgeyBQb2ludCB9IGZyb20gXCIuLi9zdHlsdXMvdHlwZXNcIjtcbmltcG9ydCB7XG4gIGdldEdsb2JhbEF1dG9tYXRlLFxuICBnZXRMZWFmQXBpLFxuICByZWFkQWN0aXZlVG9vbCxcbiAgcmVhZE5ld0VsZW1lbnRJZCxcbiAgdHlwZSBBY3RpdmVUb29sU25hcHNob3QsXG4gIHR5cGUgQnJpZGdlT3BlcmF0aW9uUmVzdWx0LFxuICB0eXBlIEJyaWRnZVJlc3VsdCxcbiAgdHlwZSBDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaSxcbiAgdHlwZSBTY2VuZUVsZW1lbnRMaWtlLFxufSBmcm9tIFwiLi9jb21wYXRpYmlsaXR5XCI7XG5pbXBvcnQgeyBkaXNwYXRjaENvbnRleHRNZW51LCBkaXNwYXRjaFBvaW50ZXIgfSBmcm9tIFwiLi9zeW50aGV0aWNQb2ludGVyXCI7XG5pbXBvcnQgeyBjbGllbnRUb1NjZW5lLCBzdHJva2VzVG9FcmFzZSwgem9vbU9mIH0gZnJvbSBcIi4vc3Ryb2tlSGl0XCI7XG5cbmV4cG9ydCB0eXBlIHtcbiAgQWN0aXZlVG9vbFNuYXBzaG90LFxuICBCcmlkZ2VGYWlsdXJlQ29kZSxcbiAgQnJpZGdlT3BlcmF0aW9uUmVzdWx0LFxuICBCcmlkZ2VSZXN1bHQsXG59IGZyb20gXCIuL2NvbXBhdGliaWxpdHlcIjtcblxuLyoqIENvbXBhdGliaWxpdHkgYm91bmRhcnkgZm9yIHRoZSBvcHRpb25hbCBFeGNhbGlkcmF3IHBsdWdpbi4gKi9cbmV4cG9ydCBjbGFzcyBFeGNhbGlkcmF3QnJpZGdlIHtcbiAgcHJpdmF0ZSB3YXJuZWQgPSBmYWxzZTtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBsZWFmOiBXb3Jrc3BhY2VMZWFmKSB7fVxuXG4gIGJlZ2luTW9tZW50YXJ5RXJhc2VyKHJhdzogUG9pbnRlckV2ZW50KTogQnJpZGdlUmVzdWx0PEFjdGl2ZVRvb2xTbmFwc2hvdD4ge1xuICAgIGNvbnN0IGFwaVJlc3VsdCA9IHRoaXMuZ2V0QXBpKCk7XG4gICAgaWYgKCFhcGlSZXN1bHQub2spIHJldHVybiB0aGlzLnJlcG9ydChhcGlSZXN1bHQpO1xuICAgIGNvbnN0IHRvb2wgPSByZWFkQWN0aXZlVG9vbChhcGlSZXN1bHQudmFsdWUpO1xuICAgIGlmICghdG9vbCkge1xuICAgICAgcmV0dXJuIHRoaXMuZmFpbHVyZShcbiAgICAgICAgXCJpbmNvbXBhdGlibGVcIixcbiAgICAgICAgXCJUZW1wb3JhcnkgZXJhc2VyIGNvdWxkIG5vdCByZWFkIHRoZSBjdXJyZW50IGFjdGl2ZSB0b29sLlwiXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHJhdy5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24gPT09IFwiZnVuY3Rpb25cIikgcmF3LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgIHJhdy5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGNvbnN0IHRhcmdldCA9IGV2ZW50VGFyZ2V0KHJhdyk7XG4gICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXCJmYWlsZWRcIiwgXCJUZW1wb3JhcnkgZXJhc2VyIGNvdWxkIG5vdCBmaW5kIHRoZSBwb2ludGVyIHRhcmdldC5cIik7XG4gICAgfVxuICAgIGRpc3BhdGNoUG9pbnRlcih0YXJnZXQsIFwicG9pbnRlcmRvd25cIiwgcmF3LCB7IGJ1dHRvbjogNSwgYnV0dG9uczogMzIgfSk7XG4gICAgY29uc3QgYXBpID0gYXBpUmVzdWx0LnZhbHVlO1xuICAgIG5leHRGcmFtZSgoKSA9PiB7XG4gICAgICBpZiAocmVhZEFjdGl2ZVRvb2woYXBpKT8udHlwZSA9PT0gXCJlcmFzZXJcIikgcmV0dXJuO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXBpLnNldEFjdGl2ZVRvb2woeyB0eXBlOiBcImVyYXNlclwiIH0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRoaXMudW5zdXBwb3J0ZWQoXCJUZW1wb3JhcnkgZXJhc2VyIGNvdWxkIG5vdCBzd2l0Y2ggdG9vbHMuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLnVuc3VwcG9ydGVkKFwiRm9yayB0ZW1wLWVyYXNlciBpcyBub3QgYXZhaWxhYmxlOyB1c2luZyBzZXRBY3RpdmVUb29sLlwiKTtcbiAgICB9KTtcbiAgICByZXR1cm4geyBvazogdHJ1ZSwgdmFsdWU6IHRvb2wgfTtcbiAgfVxuXG4gIHNwbGl0U3Ryb2tlVG9FcmFzZXIoXG4gICAgbGFzdDogUG9pbnRlckV2ZW50LFxuICAgIGRpc2NhcmRTdHJva2U6IGJvb2xlYW5cbiAgKTogQnJpZGdlUmVzdWx0PEFjdGl2ZVRvb2xTbmFwc2hvdD4ge1xuICAgIGNvbnN0IGFwaVJlc3VsdCA9IHRoaXMuZ2V0QXBpKCk7XG4gICAgaWYgKCFhcGlSZXN1bHQub2spIHJldHVybiB0aGlzLnJlcG9ydChhcGlSZXN1bHQpO1xuICAgIGNvbnN0IHRvb2wgPSByZWFkQWN0aXZlVG9vbChhcGlSZXN1bHQudmFsdWUpO1xuICAgIGlmICghdG9vbCkge1xuICAgICAgcmV0dXJuIHRoaXMuZmFpbHVyZShcbiAgICAgICAgXCJpbmNvbXBhdGlibGVcIixcbiAgICAgICAgXCJUZW1wb3JhcnkgZXJhc2VyIGNvdWxkIG5vdCByZWFkIHRoZSBjdXJyZW50IGFjdGl2ZSB0b29sLlwiXG4gICAgICApO1xuICAgIH1cbiAgICBjb25zdCB0YXJnZXQgPSBldmVudFRhcmdldChsYXN0KTtcbiAgICBpZiAoIXRhcmdldCkgcmV0dXJuIHRoaXMuZmFpbHVyZShcImZhaWxlZFwiLCBcIlN0cm9rZSBzcGxpdCBjb3VsZCBub3QgZmluZCB0aGUgcG9pbnRlciB0YXJnZXQuXCIpO1xuICAgIGNvbnN0IGlkID0gZGlzY2FyZFN0cm9rZSA/IHJlYWROZXdFbGVtZW50SWQoYXBpUmVzdWx0LnZhbHVlKSA6IG51bGw7XG4gICAgZGlzcGF0Y2hQb2ludGVyKHRhcmdldCwgXCJwb2ludGVydXBcIiwgbGFzdCwgeyBidXR0b246IDAsIGJ1dHRvbnM6IDAsIHByZXNzdXJlOiAwIH0pO1xuICAgIGRpc3BhdGNoUG9pbnRlcih0YXJnZXQsIFwicG9pbnRlcmRvd25cIiwgbGFzdCwgeyBidXR0b246IDUsIGJ1dHRvbnM6IDMyIH0pO1xuICAgIGlmIChpZCkgbmV4dEZyYW1lKCgpID0+IHRoaXMuZGVsZXRlRWxlbWVudChhcGlSZXN1bHQudmFsdWUsIGlkKSk7XG4gICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiB0b29sIH07XG4gIH1cblxuICBzcGxpdFN0cm9rZVdpdGhBY3RpdmVUb29sKGxhc3Q6IFBvaW50ZXJFdmVudCk6IEJyaWRnZVJlc3VsdDxBY3RpdmVUb29sU25hcHNob3Q+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBldmVudFRhcmdldChsYXN0KTtcbiAgICBpZiAodGFyZ2V0KSBkaXNwYXRjaFBvaW50ZXIodGFyZ2V0LCBcInBvaW50ZXJ1cFwiLCBsYXN0LCB7IGJ1dHRvbjogMCwgYnV0dG9uczogMCwgcHJlc3N1cmU6IDAgfSk7XG4gICAgY29uc3Qgc3RhcnRlZCA9IHRoaXMuc3RhcnRUZW1wb3JhcnlFcmFzZXIoKTtcbiAgICBpZiAodGFyZ2V0KSB7XG4gICAgICBkaXNwYXRjaFBvaW50ZXIodGFyZ2V0LCBcInBvaW50ZXJkb3duXCIsIGxhc3QsIHtcbiAgICAgICAgYnV0dG9uOiAwLFxuICAgICAgICBidXR0b25zOiAxLFxuICAgICAgICBwcmVzc3VyZTogbGFzdC5wcmVzc3VyZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc3RhcnRlZDtcbiAgfVxuXG4gIGVuZE1vbWVudGFyeUVyYXNlcihzYXZlZDogQWN0aXZlVG9vbFNuYXBzaG90KTogQnJpZGdlT3BlcmF0aW9uUmVzdWx0IHtcbiAgICBjb25zdCBhcGlSZXN1bHQgPSB0aGlzLmdldEFwaSgpO1xuICAgIGlmICghYXBpUmVzdWx0Lm9rKSByZXR1cm4gdGhpcy5yZXBvcnQoYXBpUmVzdWx0KTtcbiAgICBjb25zdCBhcGkgPSBhcGlSZXN1bHQudmFsdWU7XG4gICAgbmV4dEZyYW1lKCgpID0+IHtcbiAgICAgIGlmIChyZWFkQWN0aXZlVG9vbChhcGkpPy50eXBlID09PSBcImVyYXNlclwiKSB0aGlzLnJlc3RvcmVUb29sKHNhdmVkKTtcbiAgICB9KTtcbiAgICByZXR1cm4geyBvazogdHJ1ZSwgdmFsdWU6IHVuZGVmaW5lZCB9O1xuICB9XG5cbiAgc3RhcnRUZW1wb3JhcnlFcmFzZXIoKTogQnJpZGdlUmVzdWx0PEFjdGl2ZVRvb2xTbmFwc2hvdD4ge1xuICAgIGNvbnN0IGFwaVJlc3VsdCA9IHRoaXMuZ2V0QXBpKCk7XG4gICAgaWYgKCFhcGlSZXN1bHQub2spIHJldHVybiB0aGlzLnJlcG9ydChhcGlSZXN1bHQpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0b29sID0gcmVhZEFjdGl2ZVRvb2woYXBpUmVzdWx0LnZhbHVlKTtcbiAgICAgIGlmICghdG9vbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFxuICAgICAgICAgIFwiaW5jb21wYXRpYmxlXCIsXG4gICAgICAgICAgXCJUZW1wb3JhcnkgZXJhc2VyIGNvdWxkIG5vdCByZWFkIHRoZSBjdXJyZW50IGFjdGl2ZSB0b29sLlwiXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBhcGlSZXN1bHQudmFsdWUuc2V0QWN0aXZlVG9vbCh7IHR5cGU6IFwiZXJhc2VyXCIgfSk7XG4gICAgICByZXR1cm4geyBvazogdHJ1ZSwgdmFsdWU6IHRvb2wgfTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXCJmYWlsZWRcIiwgXCJUZW1wb3JhcnkgZXJhc2VyIGlzIHVuYXZhaWxhYmxlIGluIHRoaXMgRXhjYWxpZHJhdyB2aWV3LlwiKTtcbiAgICB9XG4gIH1cbiAgcmVzdG9yZVRvb2wodG9vbDogQWN0aXZlVG9vbFNuYXBzaG90KTogQnJpZGdlT3BlcmF0aW9uUmVzdWx0IHtcbiAgICBjb25zdCBhcGlSZXN1bHQgPSB0aGlzLmdldEFwaSgpO1xuICAgIGlmICghYXBpUmVzdWx0Lm9rKSByZXR1cm4gdGhpcy5yZXBvcnQoYXBpUmVzdWx0KTtcbiAgICB0cnkge1xuICAgICAgYXBpUmVzdWx0LnZhbHVlLnNldEFjdGl2ZVRvb2wodG9vbCk7XG4gICAgICByZXR1cm4geyBvazogdHJ1ZSwgdmFsdWU6IHVuZGVmaW5lZCB9O1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHRoaXMuZmFpbHVyZShcbiAgICAgICAgXCJmYWlsZWRcIixcbiAgICAgICAgXCJUaGUgcHJldmlvdXMgdG9vbCBjb3VsZCBub3QgYmUgcmVzdG9yZWQgaW4gdGhpcyBFeGNhbGlkcmF3IHZpZXcuXCJcbiAgICAgICk7XG4gICAgfVxuICB9XG4gIHNldFRvb2wodHlwZTogc3RyaW5nKTogQnJpZGdlT3BlcmF0aW9uUmVzdWx0IHtcbiAgICBjb25zdCBhcGlSZXN1bHQgPSB0aGlzLmdldEFwaSgpO1xuICAgIGlmICghYXBpUmVzdWx0Lm9rKSByZXR1cm4gdGhpcy5yZXBvcnQoYXBpUmVzdWx0KTtcbiAgICB0cnkge1xuICAgICAgYXBpUmVzdWx0LnZhbHVlLnNldEFjdGl2ZVRvb2woeyB0eXBlIH0pO1xuICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiB1bmRlZmluZWQgfTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXCJmYWlsZWRcIiwgXCJUb29sIHN3aXRjaGluZyBpcyB1bmF2YWlsYWJsZSBpbiB0aGlzIEV4Y2FsaWRyYXcgdmlldy5cIik7XG4gICAgfVxuICB9XG4gIGNvcHlTZWxlY3RlZEVsZW1lbnRzKCk6IEJyaWRnZU9wZXJhdGlvblJlc3VsdCB7XG4gICAgcmV0dXJuIHRoaXMuZmFpbHVyZShcInVuYXZhaWxhYmxlXCIsIFwiQ29weSByZXF1aXJlcyBhIGNvbXBhdGlibGUgRXhjYWxpZHJhdyBBUEkuXCIpO1xuICB9XG4gIHBhc3RlQXQocG9pbnQ6IFBvaW50KTogQnJpZGdlT3BlcmF0aW9uUmVzdWx0IHtcbiAgICB2b2lkIHBvaW50O1xuICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXCJ1bmF2YWlsYWJsZVwiLCBcIlBhc3RlIHJlcXVpcmVzIGEgY29tcGF0aWJsZSBFeGNhbGlkcmF3IEFQSS5cIik7XG4gIH1cblxuICAvKiogSWRzIHByZXNlbnQgYmVmb3JlIGEgcGVuLWRvd24sIHNvIGEgYmFycmVsIHRhcCBjYW4gZGVsZXRlIHRoYXQgc3BlY2sgYW5kIHRoZSBzdHJva2UgdW5kZXIgaXQuICovXG4gIGN1cnJlbnRTY2VuZUlkcygpOiBSZWFkb25seVNldDxzdHJpbmc+IHwgbnVsbCB7XG4gICAgY29uc3QgYXBpID0gdGhpcy50cnlBcGkoKTtcbiAgICBpZiAoIWFwaT8uZ2V0U2NlbmVFbGVtZW50cykgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgaWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBlbGVtZW50IG9mIGFwaS5nZXRTY2VuZUVsZW1lbnRzKCkpIHtcbiAgICAgIGlmICh0eXBlb2YgZWxlbWVudC5pZCA9PT0gXCJzdHJpbmdcIikgaWRzLmFkZChlbGVtZW50LmlkKTtcbiAgICB9XG4gICAgcmV0dXJuIGlkcztcbiAgfVxuXG4gIGVyYXNlU3Ryb2tlQXQoY2xpZW50OiBQb2ludCwgcHJpb3JJZHM6IFJlYWRvbmx5U2V0PHN0cmluZz4gfCBudWxsKTogQnJpZGdlT3BlcmF0aW9uUmVzdWx0IHtcbiAgICBjb25zdCBhcGkgPSB0aGlzLnRyeUFwaSgpO1xuICAgIGlmICghYXBpPy5nZXRTY2VuZUVsZW1lbnRzKSB7XG4gICAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwidW5hdmFpbGFibGVcIiwgXCJTdHJva2UgZXJhc2VyIGNvdWxkIG5vdCByZWFkIHRoaXMgZHJhd2luZy5cIik7XG4gICAgfVxuICAgIGNvbnN0IGJveCA9IHRoaXMuY2FudmFzQm94KCk7XG4gICAgaWYgKCFib3gpIHJldHVybiB0aGlzLmZhaWx1cmUoXCJmYWlsZWRcIiwgXCJTdHJva2UgZXJhc2VyIGNvdWxkIG5vdCBmaW5kIHRoZSBjYW52YXMuXCIpO1xuICAgIGNvbnN0IHN0YXRlID0gYXBpLmdldEFwcFN0YXRlKCk7XG4gICAgY29uc3Qgem9vbSA9IHpvb21PZihzdGF0ZS56b29tKTtcbiAgICBjb25zdCBzY2VuZSA9IGNsaWVudFRvU2NlbmUoY2xpZW50LCB7XG4gICAgICBsZWZ0OiBib3gubGVmdCxcbiAgICAgIHRvcDogYm94LnRvcCxcbiAgICAgIHNjcm9sbFg6IHR5cGVvZiBzdGF0ZS5zY3JvbGxYID09PSBcIm51bWJlclwiID8gc3RhdGUuc2Nyb2xsWCA6IDAsXG4gICAgICBzY3JvbGxZOiB0eXBlb2Ygc3RhdGUuc2Nyb2xsWSA9PT0gXCJudW1iZXJcIiA/IHN0YXRlLnNjcm9sbFkgOiAwLFxuICAgICAgem9vbSxcbiAgICB9KTtcbiAgICBjb25zdCBkb29tZWQgPSBzdHJva2VzVG9FcmFzZShhcGkuZ2V0U2NlbmVFbGVtZW50cygpLCBzY2VuZSwgcHJpb3JJZHMsIHVuZGVmaW5lZCwgem9vbSk7XG4gICAgaWYgKGRvb21lZC5sZW5ndGggPT09IDApIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogdW5kZWZpbmVkIH07XG4gICAgaWYgKCF0aGlzLmRlbGV0ZUVsZW1lbnRzKGRvb21lZCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXG4gICAgICAgIFwiZmFpbGVkXCIsXG4gICAgICAgIFwiVGhlIHRhcHBlZCBzdHJva2UgY291bGQgbm90IGJlIGVyYXNlZCBpbiB0aGlzIEV4Y2FsaWRyYXcgdmlldy5cIlxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiB1bmRlZmluZWQgfTtcbiAgfVxuXG4gIG9wZW5Db250ZXh0TWVudShwb2ludDogUG9pbnQpOiBCcmlkZ2VPcGVyYXRpb25SZXN1bHQge1xuICAgIGNvbnN0IHRhcmdldCA9XG4gICAgICAodHlwZW9mIGRvY3VtZW50ICE9PSBcInVuZGVmaW5lZFwiICYmIGRvY3VtZW50LmVsZW1lbnRGcm9tUG9pbnQocG9pbnQueCwgcG9pbnQueSkpIHx8XG4gICAgICB0aGlzLmxlYWYudmlldy5jb250YWluZXJFbDtcbiAgICBkaXNwYXRjaENvbnRleHRNZW51KHRhcmdldCwgcG9pbnQpO1xuICAgIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogdW5kZWZpbmVkIH07XG4gIH1cblxuICBwcml2YXRlIHRyeUFwaSgpOiBDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaSB8IG51bGwge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBnZXRMZWFmQXBpKHRoaXMubGVhZi52aWV3KTtcbiAgICAgIHJldHVybiByZXN1bHQub2sgPyByZXN1bHQudmFsdWUgOiBudWxsO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjYW52YXNCb3goKTogeyBsZWZ0OiBudW1iZXI7IHRvcDogbnVtYmVyIH0gfCBudWxsIHtcbiAgICBjb25zdCByb290ID0gdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWw7XG4gICAgY29uc3QgY2FudmFzID1cbiAgICAgIHJvb3QucXVlcnlTZWxlY3RvcihcImNhbnZhcy5leGNhbGlkcmF3X19jYW52YXNcIikgPz8gcm9vdC5xdWVyeVNlbGVjdG9yKFwiLmV4Y2FsaWRyYXdfX2NhbnZhc1wiKTtcbiAgICBjb25zdCByZWN0ID0gKGNhbnZhcyA/PyByb290KS5nZXRCb3VuZGluZ0NsaWVudFJlY3Q/LigpO1xuICAgIGlmICghcmVjdCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHsgbGVmdDogcmVjdC5sZWZ0LCB0b3A6IHJlY3QudG9wIH07XG4gIH1cblxuICBwcml2YXRlIGRlbGV0ZUVsZW1lbnRzKGVsZW1lbnRzOiBTY2VuZUVsZW1lbnRMaWtlW10pOiBib29sZWFuIHtcbiAgICBjb25zdCBhdXRvbWF0ZSA9IGdldEdsb2JhbEF1dG9tYXRlKCk7XG4gICAgaWYgKHR5cGVvZiBhdXRvbWF0ZT8uZGVsZXRlVmlld0VsZW1lbnRzICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybiBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgYXV0b21hdGUuc2V0Vmlldyh0aGlzLmxlYWYudmlldyk7XG4gICAgICByZXR1cm4gYXV0b21hdGUuZGVsZXRlVmlld0VsZW1lbnRzKGVsZW1lbnRzKSAhPT0gZmFsc2U7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRBcGkoKTogQnJpZGdlUmVzdWx0PENvbXBhdGlibGVJbXBlcmF0aXZlQXBpPiB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBnZXRMZWFmQXBpKHRoaXMubGVhZi52aWV3KTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgY29kZTogXCJmYWlsZWRcIixcbiAgICAgICAgbWVzc2FnZTogXCJFeGNhbGlkcmF3IEFQSSBsb29rdXAgZmFpbGVkIGZvciB0aGlzIGxlYWYuXCIsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVwb3J0PFQ+KHJlc3VsdDogRXhjbHVkZTxCcmlkZ2VSZXN1bHQ8VD4sIHsgb2s6IHRydWUgfT4pOiBCcmlkZ2VSZXN1bHQ8bmV2ZXI+IHtcbiAgICB0aGlzLnVuc3VwcG9ydGVkKHJlc3VsdC5tZXNzYWdlKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHByaXZhdGUgZmFpbHVyZShcbiAgICBjb2RlOiBcInVuYXZhaWxhYmxlXCIgfCBcImluY29tcGF0aWJsZVwiIHwgXCJmYWlsZWRcIixcbiAgICBtZXNzYWdlOiBzdHJpbmdcbiAgKTogQnJpZGdlUmVzdWx0PG5ldmVyPiB7XG4gICAgdGhpcy51bnN1cHBvcnRlZChtZXNzYWdlKTtcbiAgICByZXR1cm4geyBvazogZmFsc2UsIGNvZGUsIG1lc3NhZ2UgfTtcbiAgfVxuICBwcml2YXRlIHVuc3VwcG9ydGVkKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy53YXJuZWQpIHtcbiAgICAgIG5ldyBOb3RpY2UoYEV4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzOiAke21lc3NhZ2V9YCk7XG4gICAgICB0aGlzLndhcm5lZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBkZWxldGVFbGVtZW50KGFwaTogQ29tcGF0aWJsZUltcGVyYXRpdmVBcGksIGlkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBhdXRvbWF0ZSA9IGdldEdsb2JhbEF1dG9tYXRlKCk7XG4gICAgY29uc3QgZWxlbWVudHMgPSBhcGkuZ2V0U2NlbmVFbGVtZW50cz8uKCkgPz8gW107XG4gICAgY29uc3QgZWxlbWVudCA9IGVsZW1lbnRzLmZpbmQoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmlkID09PSBpZCk7XG4gICAgaWYgKCFlbGVtZW50IHx8IHR5cGVvZiBhdXRvbWF0ZT8uZGVsZXRlVmlld0VsZW1lbnRzICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHRoaXMudW5zdXBwb3J0ZWQoXCJUaGUgbGF0ZS1wcmVzcyBpbmsgZG90IGNvdWxkIG5vdCBiZSBkZWxldGVkIGluIHRoaXMgRXhjYWxpZHJhdyBidWlsZC5cIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBhdXRvbWF0ZS5zZXRWaWV3KHRoaXMubGVhZi52aWV3KTtcbiAgICAgIGF1dG9tYXRlLmRlbGV0ZVZpZXdFbGVtZW50cyhbZWxlbWVudF0pO1xuICAgIH0gY2F0Y2gge1xuICAgICAgdGhpcy51bnN1cHBvcnRlZChcIlRoZSBsYXRlLXByZXNzIGluayBkb3QgY291bGQgbm90IGJlIGRlbGV0ZWQgaW4gdGhpcyBFeGNhbGlkcmF3IGJ1aWxkLlwiKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZXZlbnRUYXJnZXQoZXZlbnQ6IFBvaW50ZXJFdmVudCk6IEV2ZW50VGFyZ2V0IHwgbnVsbCB7XG4gIHJldHVybiBldmVudC50YXJnZXQgPz8gZXZlbnQuY3VycmVudFRhcmdldDtcbn1cblxuZnVuY3Rpb24gbmV4dEZyYW1lKGNhbGxiYWNrOiAoKSA9PiB2b2lkKTogdm9pZCB7XG4gIGlmICh0eXBlb2YgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID09PSBcImZ1bmN0aW9uXCIpIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBjYWxsYmFjaygpKTtcbiAgZWxzZSBzZXRUaW1lb3V0KGNhbGxiYWNrLCAwKTtcbn1cbiIsICJleHBvcnQgaW50ZXJmYWNlIEFjdGl2ZVRvb2xTbmFwc2hvdCB7XG4gIHR5cGU6IHN0cmluZztcbiAgW2tleTogc3RyaW5nXTogdW5rbm93bjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTY2VuZUVsZW1lbnRMaWtlIHtcbiAgaWQ/OiBzdHJpbmc7XG4gIHg/OiBudW1iZXI7XG4gIHk/OiBudW1iZXI7XG4gIHdpZHRoPzogbnVtYmVyO1xuICBoZWlnaHQ/OiBudW1iZXI7XG4gIGFuZ2xlPzogbnVtYmVyO1xuICBpc0RlbGV0ZWQ/OiBib29sZWFuO1xuICBsb2NrZWQ/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFwcFN0YXRlTGlrZSB7XG4gIGFjdGl2ZVRvb2w/OiBBY3RpdmVUb29sU25hcHNob3Q7XG4gIG5ld0VsZW1lbnQ/OiB7IGlkPzogc3RyaW5nIH0gfCBudWxsO1xuICBkcmFnZ2luZ0VsZW1lbnQ/OiB7IGlkPzogc3RyaW5nIH0gfCBudWxsO1xuICBzY3JvbGxYPzogbnVtYmVyO1xuICBzY3JvbGxZPzogbnVtYmVyO1xuICB6b29tPzogeyB2YWx1ZT86IG51bWJlciB9IHwgbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltcGVyYXRpdmVBcGkge1xuICBnZXRBcHBTdGF0ZT86ICgpID0+IEFwcFN0YXRlTGlrZTtcbiAgc2V0QWN0aXZlVG9vbD86ICh0b29sOiBBY3RpdmVUb29sU25hcHNob3QpID0+IHZvaWQ7XG4gIGdldFNjZW5lRWxlbWVudHM/OiAoKSA9PiBTY2VuZUVsZW1lbnRMaWtlW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGF0aWJsZUltcGVyYXRpdmVBcGkgZXh0ZW5kcyBJbXBlcmF0aXZlQXBpIHtcbiAgZ2V0QXBwU3RhdGU6ICgpID0+IEFwcFN0YXRlTGlrZTtcbiAgc2V0QWN0aXZlVG9vbDogKHRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUgQnJpZGdlRmFpbHVyZUNvZGUgPSBcInVuYXZhaWxhYmxlXCIgfCBcImluY29tcGF0aWJsZVwiIHwgXCJmYWlsZWRcIjtcblxuZXhwb3J0IHR5cGUgQnJpZGdlUmVzdWx0PFQ+ID1cbiAgeyBvazogdHJ1ZTsgdmFsdWU6IFQgfSB8IHsgb2s6IGZhbHNlOyBjb2RlOiBCcmlkZ2VGYWlsdXJlQ29kZTsgbWVzc2FnZTogc3RyaW5nIH07XG5cbmV4cG9ydCB0eXBlIEJyaWRnZU9wZXJhdGlvblJlc3VsdCA9IEJyaWRnZVJlc3VsdDx2b2lkPjtcblxuZXhwb3J0IGludGVyZmFjZSBFeGNhbGlkcmF3TGVhZlN1cmZhY2Uge1xuICAvKipcbiAgICogVGhpcyBpcyBhIGNvbXBhdGliaWxpdHkgZmFsbGJhY2ssIG5vdCBhIGRvY3VtZW50ZWQgRXhjYWxpZHJhdyBwbHVnaW4gQVBJLlxuICAgKiBLZWVwIGFjY2VzcyB0byBpdCBoZXJlIHVudGlsIEV4Y2FsaWRyYXcgcHVibGlzaGVzIGEgdGhpcmQtcGFydHksIGxlYWYtc2NvcGVkXG4gICAqIGludGVncmF0aW9uIHBvaW50LlxuICAgKi9cbiAgZXhjYWxpZHJhd0FQST86IHVua25vd247XG59XG5cbi8qKiBUaGUgZG9jdW1lbnRlZCwgdmlldy10YXJnZXRlZCBwb3J0aW9uIG9mIEV4Y2FsaWRyYXdBdXRvbWF0ZSB1c2VkIGJ5IHRoaXMgcGx1Z2luLiAqL1xuZXhwb3J0IGludGVyZmFjZSBFeGNhbGlkcmF3QXV0b21hdGVTdXJmYWNlIHtcbiAgc2V0VmlldzogKHZpZXc6IHVua25vd24pID0+IHVua25vd247XG4gIGdldEV4Y2FsaWRyYXdBUEk6ICgpID0+IHVua25vd247XG4gIGRlbGV0ZVZpZXdFbGVtZW50cz86IChlbGVtZW50czogdW5rbm93bltdKSA9PiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRvb2xDYXBhYmlsaXRpZXMge1xuICBjYW5SZWFkQWN0aXZlVG9vbDogYm9vbGVhbjtcbiAgY2FuU2V0QWN0aXZlVG9vbDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvb2xDYXBhYmlsaXRpZXMoYXBpOiBJbXBlcmF0aXZlQXBpIHwgbnVsbCk6IFRvb2xDYXBhYmlsaXRpZXMge1xuICByZXR1cm4ge1xuICAgIGNhblJlYWRBY3RpdmVUb29sOiB0eXBlb2YgYXBpPy5nZXRBcHBTdGF0ZSA9PT0gXCJmdW5jdGlvblwiLFxuICAgIGNhblNldEFjdGl2ZVRvb2w6IHR5cGVvZiBhcGk/LnNldEFjdGl2ZVRvb2wgPT09IFwiZnVuY3Rpb25cIixcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBY3RpdmVUb29sKGFwaTogSW1wZXJhdGl2ZUFwaSk6IEFjdGl2ZVRvb2xTbmFwc2hvdCB8IG51bGwge1xuICBjb25zdCBhY3RpdmVUb29sID0gYXBpLmdldEFwcFN0YXRlPy4oKS5hY3RpdmVUb29sO1xuICByZXR1cm4gYWN0aXZlVG9vbCA/IHsgLi4uYWN0aXZlVG9vbCB9IDogbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWROZXdFbGVtZW50SWQoYXBpOiBJbXBlcmF0aXZlQXBpKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IHN0YXRlID0gYXBpLmdldEFwcFN0YXRlPy4oKTtcbiAgY29uc3QgaWQgPSBzdGF0ZT8ubmV3RWxlbWVudD8uaWQgPz8gc3RhdGU/LmRyYWdnaW5nRWxlbWVudD8uaWQ7XG4gIHJldHVybiB0eXBlb2YgaWQgPT09IFwic3RyaW5nXCIgJiYgaWQubGVuZ3RoID4gMCA/IGlkIDogbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc05ld0VsZW1lbnRGaWVsZChzdGF0ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gKFxuICAgICEhc3RhdGUgJiYgdHlwZW9mIHN0YXRlID09PSBcIm9iamVjdFwiICYmIChcIm5ld0VsZW1lbnRcIiBpbiBzdGF0ZSB8fCBcImRyYWdnaW5nRWxlbWVudFwiIGluIHN0YXRlKVxuICApO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEluc3RhbGxlZEV4Y2FsaWRyYXcge1xuICBpbnN0YWxsZWQ6IGJvb2xlYW47XG4gIGVuYWJsZWQ6IGJvb2xlYW47XG4gIHZlcnNpb246IHN0cmluZyB8IG51bGw7XG59XG5cbmludGVyZmFjZSBQbHVnaW5Ib3N0IHtcbiAgcGx1Z2lucz86IFJlY29yZDxzdHJpbmcsIHsgbWFuaWZlc3Q/OiB7IHZlcnNpb24/OiBzdHJpbmcgfSB9IHwgdW5kZWZpbmVkPjtcbiAgZW5hYmxlZFBsdWdpbnM/OiB7IGhhcz86IChpZDogc3RyaW5nKSA9PiBib29sZWFuIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkSW5zdGFsbGVkRXhjYWxpZHJhdyhhcHA6IG9iamVjdCk6IEluc3RhbGxlZEV4Y2FsaWRyYXcge1xuICBjb25zdCBob3N0ID0gYXBwIGFzIHsgcGx1Z2lucz86IFBsdWdpbkhvc3QgfTtcbiAgY29uc3QgcGx1Z2luID0gaG9zdC5wbHVnaW5zPy5wbHVnaW5zPy5bXCJvYnNpZGlhbi1leGNhbGlkcmF3LXBsdWdpblwiXTtcbiAgcmV0dXJuIHtcbiAgICBpbnN0YWxsZWQ6IEJvb2xlYW4ocGx1Z2luKSxcbiAgICBlbmFibGVkOiBob3N0LnBsdWdpbnM/LmVuYWJsZWRQbHVnaW5zPy5oYXM/LihcIm9ic2lkaWFuLWV4Y2FsaWRyYXctcGx1Z2luXCIpID09PSB0cnVlLFxuICAgIHZlcnNpb246IHBsdWdpbj8ubWFuaWZlc3Q/LnZlcnNpb24gPz8gbnVsbCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldExlYWZBcGkoXG4gIHZpZXc6IHVua25vd24sXG4gIGF1dG9tYXRlID0gZ2V0R2xvYmFsQXV0b21hdGUoKVxuKTogQnJpZGdlUmVzdWx0PENvbXBhdGlibGVJbXBlcmF0aXZlQXBpPiB7XG4gIGlmICghdmlldyB8fCB0eXBlb2YgdmlldyAhPT0gXCJvYmplY3RcIikge1xuICAgIHJldHVybiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBjb2RlOiBcInVuYXZhaWxhYmxlXCIsXG4gICAgICBtZXNzYWdlOiBcIlRoaXMgbGVhZiBkb2VzIG5vdCBleHBvc2UgYW4gRXhjYWxpZHJhdyB2aWV3LlwiLFxuICAgIH07XG4gIH1cbiAgaWYgKGF1dG9tYXRlKSB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIEV4Y2FsaWRyYXdBdXRvbWF0ZSBkb2N1bWVudHMgc2V0Vmlldyh2aWV3KSBzcGVjaWZpY2FsbHkgc28gb3BlcmF0aW9uc1xuICAgICAgLy8gYXJlIHNjb3BlZCB0byB0aGF0IHZpZXcuIE5ldmVyIHBhc3MgXCJhY3RpdmVcIiBoZXJlLlxuICAgICAgYXV0b21hdGUuc2V0Vmlldyh2aWV3KTtcbiAgICAgIHJldHVybiB2YWxpZGF0ZUltcGVyYXRpdmVBcGkoYXV0b21hdGUuZ2V0RXhjYWxpZHJhd0FQSSgpKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgY29kZTogXCJmYWlsZWRcIixcbiAgICAgICAgbWVzc2FnZTogXCJFeGNhbGlkcmF3IGNvdWxkIG5vdCB0YXJnZXQgdGhpcyBsZWFmJ3MgY2FudmFzLlwiLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvLyBUaGlzIGZhbGxiYWNrIGlzIGRlbGliZXJhdGVseSBpc29sYXRlZDogaXQgaXMgbm90IHBhcnQgb2YgRXhjYWxpZHJhdydzXG4gIC8vIGRvY3VtZW50ZWQgdGhpcmQtcGFydHkgQVBJIHN1cmZhY2UuXG4gIGNvbnN0IGFwaSA9ICh2aWV3IGFzIEV4Y2FsaWRyYXdMZWFmU3VyZmFjZSkuZXhjYWxpZHJhd0FQSTtcbiAgcmV0dXJuIHZhbGlkYXRlSW1wZXJhdGl2ZUFwaShhcGkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2xvYmFsQXV0b21hdGUoKTogRXhjYWxpZHJhd0F1dG9tYXRlU3VyZmFjZSB8IG51bGwge1xuICBjb25zdCBjYW5kaWRhdGUgPSAoZ2xvYmFsVGhpcyBhcyB7IEV4Y2FsaWRyYXdBdXRvbWF0ZT86IHVua25vd24gfSkuRXhjYWxpZHJhd0F1dG9tYXRlO1xuICBpZiAoXG4gICAgY2FuZGlkYXRlICYmXG4gICAgdHlwZW9mIGNhbmRpZGF0ZSA9PT0gXCJvYmplY3RcIiAmJlxuICAgIHR5cGVvZiAoY2FuZGlkYXRlIGFzIEV4Y2FsaWRyYXdBdXRvbWF0ZVN1cmZhY2UpLnNldFZpZXcgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgIHR5cGVvZiAoY2FuZGlkYXRlIGFzIEV4Y2FsaWRyYXdBdXRvbWF0ZVN1cmZhY2UpLmdldEV4Y2FsaWRyYXdBUEkgPT09IFwiZnVuY3Rpb25cIlxuICApIHtcbiAgICByZXR1cm4gY2FuZGlkYXRlIGFzIEV4Y2FsaWRyYXdBdXRvbWF0ZVN1cmZhY2U7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlSW1wZXJhdGl2ZUFwaShhcGk6IHVua25vd24pOiBCcmlkZ2VSZXN1bHQ8Q29tcGF0aWJsZUltcGVyYXRpdmVBcGk+IHtcbiAgaWYgKCFhcGkgfHwgdHlwZW9mIGFwaSAhPT0gXCJvYmplY3RcIikge1xuICAgIHJldHVybiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBjb2RlOiBcInVuYXZhaWxhYmxlXCIsXG4gICAgICBtZXNzYWdlOiBcIkV4Y2FsaWRyYXcgaGFzIG5vdCBtYWRlIGFuIEFQSSBhdmFpbGFibGUgZm9yIHRoaXMgbGVhZi5cIixcbiAgICB9O1xuICB9XG4gIGNvbnN0IGNhcGFiaWxpdGllcyA9IHRvb2xDYXBhYmlsaXRpZXMoYXBpIGFzIEltcGVyYXRpdmVBcGkpO1xuICBpZiAoIWNhcGFiaWxpdGllcy5jYW5SZWFkQWN0aXZlVG9vbCB8fCAhY2FwYWJpbGl0aWVzLmNhblNldEFjdGl2ZVRvb2wpIHtcbiAgICByZXR1cm4ge1xuICAgICAgb2s6IGZhbHNlLFxuICAgICAgY29kZTogXCJpbmNvbXBhdGlibGVcIixcbiAgICAgIG1lc3NhZ2U6IFwiVGhpcyBFeGNhbGlkcmF3IEFQSSBkb2VzIG5vdCBzdXBwb3J0IGFjdGl2ZS10b29sIHJlYWQgYW5kIHdyaXRlIG9wZXJhdGlvbnMuXCIsXG4gICAgfTtcbiAgfVxuICByZXR1cm4geyBvazogdHJ1ZSwgdmFsdWU6IGFwaSBhcyBDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaSB9O1xufVxuIiwgImltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmNvbnN0IHN5bnRoZXRpYyA9IG5ldyBXZWFrU2V0PEV2ZW50PigpO1xuXG5leHBvcnQgY29uc3QgaXNTeW50aGV0aWMgPSAoZXZlbnQ6IEV2ZW50KTogYm9vbGVhbiA9PiBzeW50aGV0aWMuaGFzKGV2ZW50KTtcblxuZXhwb3J0IGludGVyZmFjZSBQb2ludGVySW5pdExpa2Uge1xuICBwb2ludGVySWQ/OiBudW1iZXI7XG4gIGNsaWVudFg/OiBudW1iZXI7XG4gIGNsaWVudFk/OiBudW1iZXI7XG4gIHNjcmVlblg/OiBudW1iZXI7XG4gIHNjcmVlblk/OiBudW1iZXI7XG4gIHByZXNzdXJlPzogbnVtYmVyO1xuICB0aWx0WD86IG51bWJlcjtcbiAgdGlsdFk/OiBudW1iZXI7XG4gIHR3aXN0PzogbnVtYmVyO1xuICB3aWR0aD86IG51bWJlcjtcbiAgaGVpZ2h0PzogbnVtYmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGlzcGF0Y2hQb2ludGVyKFxuICB0YXJnZXQ6IEV2ZW50VGFyZ2V0LFxuICB0eXBlOiBzdHJpbmcsXG4gIGZyb206IFBvaW50ZXJJbml0TGlrZSxcbiAgb3ZlcjogUG9pbnRlckV2ZW50SW5pdFxuKTogUG9pbnRlckV2ZW50IHtcbiAgY29uc3QgZXZlbnQgPSBuZXcgUG9pbnRlckV2ZW50KHR5cGUsIHtcbiAgICBidWJibGVzOiB0cnVlLFxuICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgY29tcG9zZWQ6IHRydWUsXG4gICAgcG9pbnRlcklkOiBmcm9tLnBvaW50ZXJJZCA/PyAxLFxuICAgIHBvaW50ZXJUeXBlOiBcInBlblwiLFxuICAgIGlzUHJpbWFyeTogdHJ1ZSxcbiAgICBjbGllbnRYOiBmcm9tLmNsaWVudFggPz8gMCxcbiAgICBjbGllbnRZOiBmcm9tLmNsaWVudFkgPz8gMCxcbiAgICBzY3JlZW5YOiBmcm9tLnNjcmVlblggPz8gMCxcbiAgICBzY3JlZW5ZOiBmcm9tLnNjcmVlblkgPz8gMCxcbiAgICBwcmVzc3VyZTogZnJvbS5wcmVzc3VyZSA/PyAwLFxuICAgIHRpbHRYOiBmcm9tLnRpbHRYID8/IDAsXG4gICAgdGlsdFk6IGZyb20udGlsdFkgPz8gMCxcbiAgICB0d2lzdDogZnJvbS50d2lzdCA/PyAwLFxuICAgIHdpZHRoOiBmcm9tLndpZHRoID8/IDEsXG4gICAgaGVpZ2h0OiBmcm9tLmhlaWdodCA/PyAxLFxuICAgIC4uLm92ZXIsXG4gIH0pO1xuICBzeW50aGV0aWMuYWRkKGV2ZW50KTtcbiAgdGFyZ2V0LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICByZXR1cm4gZXZlbnQ7XG59XG5cbi8qKiBPcGVucyBFeGNhbGlkcmF3J3Mgb3duIG1lbnUgYXQgdGhlIHBlbi4gVGhlIGNvbnRyb2xsZXIgaWdub3JlcyB0aGlzIGV2ZW50LiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpc3BhdGNoQ29udGV4dE1lbnUodGFyZ2V0OiBFdmVudFRhcmdldCwgcG9pbnQ6IFBvaW50KTogdm9pZCB7XG4gIGNvbnN0IGV2ZW50ID0gbmV3IE1vdXNlRXZlbnQoXCJjb250ZXh0bWVudVwiLCB7XG4gICAgYnViYmxlczogdHJ1ZSxcbiAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgIGNsaWVudFg6IHBvaW50LngsXG4gICAgY2xpZW50WTogcG9pbnQueSxcbiAgICBidXR0b246IDIsXG4gICAgYnV0dG9uczogMixcbiAgfSk7XG4gIHN5bnRoZXRpYy5hZGQoZXZlbnQpO1xuICB0YXJnZXQuZGlzcGF0Y2hFdmVudChldmVudCk7XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBQb2ludCB9IGZyb20gXCIuLi9zdHlsdXMvdHlwZXNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBIaXRFbGVtZW50IHtcbiAgaWQ/OiBzdHJpbmc7XG4gIHg/OiBudW1iZXI7XG4gIHk/OiBudW1iZXI7XG4gIHdpZHRoPzogbnVtYmVyO1xuICBoZWlnaHQ/OiBudW1iZXI7XG4gIGFuZ2xlPzogbnVtYmVyO1xuICBpc0RlbGV0ZWQ/OiBib29sZWFuO1xuICBsb2NrZWQ/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNjZW5lVmlld3BvcnQge1xuICBsZWZ0OiBudW1iZXI7XG4gIHRvcDogbnVtYmVyO1xuICBzY3JvbGxYOiBudW1iZXI7XG4gIHNjcm9sbFk6IG51bWJlcjtcbiAgem9vbTogbnVtYmVyO1xufVxuXG4vKiogU2NyZWVuIHBpeGVscyBhZGRlZCBhcm91bmQgYSBzdHJva2Ugc28gYSB0aGluIGxpbmUgaXMgc3RpbGwgYSB0YXAgdGFyZ2V0LiAqL1xuZXhwb3J0IGNvbnN0IFNUUk9LRV9UQVBfU0xPUF9QWCA9IDEyO1xuXG5leHBvcnQgZnVuY3Rpb24gem9vbU9mKHpvb206IHVua25vd24pOiBudW1iZXIge1xuICBpZiAodHlwZW9mIHpvb20gPT09IFwibnVtYmVyXCIgJiYgTnVtYmVyLmlzRmluaXRlKHpvb20pICYmIHpvb20gPiAwKSByZXR1cm4gem9vbTtcbiAgaWYgKHpvb20gJiYgdHlwZW9mIHpvb20gPT09IFwib2JqZWN0XCIgJiYgXCJ2YWx1ZVwiIGluIHpvb20pIHtcbiAgICBjb25zdCB2YWx1ZSA9ICh6b29tIGFzIHsgdmFsdWU/OiB1bmtub3duIH0pLnZhbHVlO1xuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgJiYgTnVtYmVyLmlzRmluaXRlKHZhbHVlKSAmJiB2YWx1ZSA+IDApIHJldHVybiB2YWx1ZTtcbiAgfVxuICByZXR1cm4gMTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsaWVudFRvU2NlbmUoY2xpZW50OiBQb2ludCwgdmlld3BvcnQ6IFNjZW5lVmlld3BvcnQpOiBQb2ludCB7XG4gIGNvbnN0IHpvb20gPSB2aWV3cG9ydC56b29tID4gMCA/IHZpZXdwb3J0Lnpvb20gOiAxO1xuICByZXR1cm4ge1xuICAgIHg6IChjbGllbnQueCAtIHZpZXdwb3J0LmxlZnQpIC8gem9vbSAtIHZpZXdwb3J0LnNjcm9sbFgsXG4gICAgeTogKGNsaWVudC55IC0gdmlld3BvcnQudG9wKSAvIHpvb20gLSB2aWV3cG9ydC5zY3JvbGxZLFxuICB9O1xufVxuXG4vKipcbiAqIFNhbXN1bmcgTm90ZXMnIHN0cm9rZSBlcmFzZXIgZGVsZXRlcyB0aGUgd2hvbGUgbGluZSB1bmRlciBhIGJhcnJlbCB0YXAuXG4gKiBGcmVzaCBlbGVtZW50cyBhcmUgaW5rIG9yIGVyYXNlciBzcGVja3MgY3JlYXRlZCBieSB0aGF0IHRhcC4gVGhlIHRhcmdldCBpc1xuICogdGhlIHRvcG1vc3Qgc3Ryb2tlIHRoYXQgd2FzIGFscmVhZHkgb24gdGhlIHBhZ2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJva2VzVG9FcmFzZShcbiAgZWxlbWVudHM6IHJlYWRvbmx5IEhpdEVsZW1lbnRbXSxcbiAgc2NlbmU6IFBvaW50LFxuICBwcmlvcklkczogUmVhZG9ubHlTZXQ8c3RyaW5nPiB8IG51bGwsXG4gIHNjcmVlblBhZGRpbmcgPSBTVFJPS0VfVEFQX1NMT1BfUFgsXG4gIHpvb20gPSAxXG4pOiBIaXRFbGVtZW50W10ge1xuICBjb25zdCBwYWRkaW5nID0gc2NyZWVuUGFkZGluZyAvICh6b29tID4gMCA/IHpvb20gOiAxKTtcbiAgY29uc3QgaGl0cyA9IGVsZW1lbnRzLmZpbHRlcihcbiAgICAoZWxlbWVudCkgPT4gIWVsZW1lbnQuaXNEZWxldGVkICYmICFlbGVtZW50LmxvY2tlZCAmJiBjb250YWlucyhlbGVtZW50LCBzY2VuZSwgcGFkZGluZylcbiAgKTtcbiAgY29uc3QgZnJlc2ggPVxuICAgIHByaW9ySWRzID09PSBudWxsXG4gICAgICA/IFtdXG4gICAgICA6IGhpdHMuZmlsdGVyKChlbGVtZW50KSA9PiB0eXBlb2YgZWxlbWVudC5pZCA9PT0gXCJzdHJpbmdcIiAmJiAhcHJpb3JJZHMuaGFzKGVsZW1lbnQuaWQpKTtcbiAgY29uc3QgZXhpc3RpbmcgPSBwcmlvcklkcyA9PT0gbnVsbCA/IGhpdHMgOiBoaXRzLmZpbHRlcigoZWxlbWVudCkgPT4gIWZyZXNoLmluY2x1ZGVzKGVsZW1lbnQpKTtcbiAgY29uc3QgdGFyZ2V0ID0gZXhpc3RpbmcubGVuZ3RoID4gMCA/IGV4aXN0aW5nW2V4aXN0aW5nLmxlbmd0aCAtIDFdIDogbnVsbDtcbiAgY29uc3QgZG9vbWVkID0gWy4uLmZyZXNoXTtcbiAgaWYgKHRhcmdldCAmJiAhZG9vbWVkLmluY2x1ZGVzKHRhcmdldCkpIGRvb21lZC5wdXNoKHRhcmdldCk7XG4gIHJldHVybiBkb29tZWQ7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zKGVsZW1lbnQ6IEhpdEVsZW1lbnQsIHBvaW50OiBQb2ludCwgcGFkZGluZzogbnVtYmVyKTogYm9vbGVhbiB7XG4gIGNvbnN0IHsgeCwgeSwgd2lkdGgsIGhlaWdodCB9ID0gZWxlbWVudDtcbiAgaWYgKFxuICAgIHR5cGVvZiB4ICE9PSBcIm51bWJlclwiIHx8XG4gICAgdHlwZW9mIHkgIT09IFwibnVtYmVyXCIgfHxcbiAgICB0eXBlb2Ygd2lkdGggIT09IFwibnVtYmVyXCIgfHxcbiAgICB0eXBlb2YgaGVpZ2h0ICE9PSBcIm51bWJlclwiIHx8XG4gICAgIU51bWJlci5pc0Zpbml0ZSh4ICsgeSArIHdpZHRoICsgaGVpZ2h0KVxuICApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgY2VudGVyWCA9IHggKyB3aWR0aCAvIDI7XG4gIGNvbnN0IGNlbnRlclkgPSB5ICsgaGVpZ2h0IC8gMjtcbiAgY29uc3QgYW5nbGUgPSB0eXBlb2YgZWxlbWVudC5hbmdsZSA9PT0gXCJudW1iZXJcIiA/IGVsZW1lbnQuYW5nbGUgOiAwO1xuICBjb25zdCBkeCA9IHBvaW50LnggLSBjZW50ZXJYO1xuICBjb25zdCBkeSA9IHBvaW50LnkgLSBjZW50ZXJZO1xuICBjb25zdCBjb3MgPSBNYXRoLmNvcygtYW5nbGUpO1xuICBjb25zdCBzaW4gPSBNYXRoLnNpbigtYW5nbGUpO1xuICBjb25zdCBsb2NhbFggPSBkeCAqIGNvcyAtIGR5ICogc2luO1xuICBjb25zdCBsb2NhbFkgPSBkeCAqIHNpbiArIGR5ICogY29zO1xuICByZXR1cm4gKFxuICAgIE1hdGguYWJzKGxvY2FsWCkgPD0gTWF0aC5hYnMod2lkdGgpIC8gMiArIHBhZGRpbmcgJiZcbiAgICBNYXRoLmFicyhsb2NhbFkpIDw9IE1hdGguYWJzKGhlaWdodCkgLyAyICsgcGFkZGluZ1xuICApO1xufVxuIiwgImV4cG9ydCBjb25zdCBDTE9TRSA9IHtcbiAgTk9STUFMOiAxMDAwLFxuICBHT0lOR19BV0FZOiAxMDAxLFxuICBQUk9UT0NPTDogNDQwMCxcbiAgQVVUSDogNDQwMSxcbiAgT1JJR0lOOiA0NDAzLFxuICBBVVRIX1RJTUVPVVQ6IDQ0MDgsXG59IGFzIGNvbnN0O1xuXG5jb25zdCB0ZXh0RW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEhlbGxvRnJhbWUge1xuICB0eXBlOiBcImhlbGxvXCI7XG4gIHByb3RvOiBudW1iZXI7XG4gIGFwcDogc3RyaW5nO1xuICBhcHBWZXJzaW9uOiBzdHJpbmc7XG4gIG5vbmNlOiBzdHJpbmc7XG4gIGNhcHM6IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlYWR5RnJhbWUge1xuICB0eXBlOiBcInJlYWR5XCI7XG4gIHNlc3Npb246IHN0cmluZztcbiAgc2VydmVyUHJvb2Y6IHN0cmluZztcbiAgaGVhcnRiZWF0TXM6IG51bWJlcjtcbiAgc291cmNlOiBTb3VyY2VCb2R5O1xuICBidXR0b246IHsgYnV0dG9uOiBcInByaW1hcnlcIjsgZG93bjogYm9vbGVhbjsgc2VxOiBudW1iZXI7IHQ6IG51bWJlciB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJ1dHRvbkZyYW1lIHtcbiAgdHlwZTogXCJidXR0b25cIjtcbiAgYnV0dG9uOiBcInByaW1hcnlcIjtcbiAgZG93bjogYm9vbGVhbjtcbiAgc2VxOiBudW1iZXI7XG4gIHQ6IG51bWJlcjtcbiAgc2VudDogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBpbmdGcmFtZSB7XG4gIHR5cGU6IFwicGluZ1wiO1xuICBzZXE6IG51bWJlcjtcbiAgZG93bjogYm9vbGVhbjtcbiAgc2VudDogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNvdXJjZUZyYW1lIHtcbiAgdHlwZTogXCJzb3VyY2VcIjtcbiAgc3RhdGU6IFwib2tcIiB8IFwidW5hdmFpbGFibGVcIjtcbiAgcmVhc29uPzogc3RyaW5nO1xuICBub2RlPzogc3RyaW5nO1xuICBuYW1lPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRGcmFtZSB7XG4gIHR5cGU6IFwiY29tbWFuZFwiO1xuICBhY3Rpb246IFwib3Blbi1tZW51XCI7XG4gIHNlcTogbnVtYmVyO1xuICBzZW50OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVW5rbm93bkZyYW1lIHtcbiAgdHlwZTogXCJ1bmtub3duXCI7XG4gIHJhd1R5cGU6IHN0cmluZztcbn1cblxuZXhwb3J0IHR5cGUgU2VydmVyRnJhbWUgPVxuICBIZWxsb0ZyYW1lIHwgUmVhZHlGcmFtZSB8IEJ1dHRvbkZyYW1lIHwgUGluZ0ZyYW1lIHwgU291cmNlRnJhbWUgfCBDb21tYW5kRnJhbWUgfCBVbmtub3duRnJhbWU7XG5cbmludGVyZmFjZSBTb3VyY2VCb2R5IHtcbiAgc3RhdGU6IFwib2tcIiB8IFwidW5hdmFpbGFibGVcIjtcbiAgcmVhc29uPzogc3RyaW5nO1xuICBub2RlPzogc3RyaW5nO1xuICBuYW1lPzogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBpc1JlY29yZCh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB2YWx1ZSAhPT0gbnVsbCAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIHN0cmluZ0ZpZWxkKHJlY29yZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sIGtleTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IHZhbHVlID0gcmVjb3JkW2tleV07XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyB2YWx1ZSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIGJvb2xlYW5GaWVsZChyZWNvcmQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LCBrZXk6IHN0cmluZyk6IGJvb2xlYW4gfCBudWxsIHtcbiAgY29uc3QgdmFsdWUgPSByZWNvcmRba2V5XTtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJib29sZWFuXCIgPyB2YWx1ZSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIG51bWJlckZpZWxkKHJlY29yZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sIGtleTogc3RyaW5nKTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IHZhbHVlID0gcmVjb3JkW2tleV07XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgJiYgTnVtYmVyLmlzRmluaXRlKHZhbHVlKSA/IHZhbHVlIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gaW50ZWdlckZpZWxkKHJlY29yZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sIGtleTogc3RyaW5nKTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IHZhbHVlID0gbnVtYmVyRmllbGQocmVjb3JkLCBrZXkpO1xuICByZXR1cm4gdmFsdWUgIT09IG51bGwgJiYgTnVtYmVyLmlzSW50ZWdlcih2YWx1ZSkgPyB2YWx1ZSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIG9wdGlvbmFsU3RyaW5nKHJlY29yZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sIGtleTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKCEoa2V5IGluIHJlY29yZCkgfHwgcmVjb3JkW2tleV0gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgY29uc3QgdmFsdWUgPSBzdHJpbmdGaWVsZChyZWNvcmQsIGtleSk7XG4gIHJldHVybiB2YWx1ZSA9PT0gbnVsbCA/IHVuZGVmaW5lZCA6IHZhbHVlO1xufVxuXG5mdW5jdGlvbiBzb3VyY2VCb2R5KHZhbHVlOiB1bmtub3duKTogU291cmNlQm9keSB8IG51bGwge1xuICBpZiAoIWlzUmVjb3JkKHZhbHVlKSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHN0YXRlID0gc3RyaW5nRmllbGQodmFsdWUsIFwic3RhdGVcIik7XG4gIGlmIChzdGF0ZSAhPT0gXCJva1wiICYmIHN0YXRlICE9PSBcInVuYXZhaWxhYmxlXCIpIHJldHVybiBudWxsO1xuICBjb25zdCByZWFzb24gPSBvcHRpb25hbFN0cmluZyh2YWx1ZSwgXCJyZWFzb25cIik7XG4gIGNvbnN0IG5vZGUgPSBvcHRpb25hbFN0cmluZyh2YWx1ZSwgXCJub2RlXCIpO1xuICBjb25zdCBuYW1lID0gb3B0aW9uYWxTdHJpbmcodmFsdWUsIFwibmFtZVwiKTtcbiAgaWYgKFxuICAgIChcInJlYXNvblwiIGluIHZhbHVlICYmIHZhbHVlLnJlYXNvbiAhPT0gdW5kZWZpbmVkICYmIHJlYXNvbiA9PT0gdW5kZWZpbmVkKSB8fFxuICAgIChcIm5vZGVcIiBpbiB2YWx1ZSAmJiB2YWx1ZS5ub2RlICE9PSB1bmRlZmluZWQgJiYgbm9kZSA9PT0gdW5kZWZpbmVkKSB8fFxuICAgIChcIm5hbWVcIiBpbiB2YWx1ZSAmJiB2YWx1ZS5uYW1lICE9PSB1bmRlZmluZWQgJiYgbmFtZSA9PT0gdW5kZWZpbmVkKVxuICApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4geyBzdGF0ZSwgcmVhc29uLCBub2RlLCBuYW1lIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlSGVsbG8ocmVjb3JkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IEhlbGxvRnJhbWUgfCBudWxsIHtcbiAgY29uc3QgcHJvdG8gPSBpbnRlZ2VyRmllbGQocmVjb3JkLCBcInByb3RvXCIpO1xuICBjb25zdCBhcHAgPSBzdHJpbmdGaWVsZChyZWNvcmQsIFwiYXBwXCIpO1xuICBjb25zdCBhcHBWZXJzaW9uID0gc3RyaW5nRmllbGQocmVjb3JkLCBcImFwcFZlcnNpb25cIik7XG4gIGNvbnN0IG5vbmNlID0gc3RyaW5nRmllbGQocmVjb3JkLCBcIm5vbmNlXCIpO1xuICBjb25zdCBjYXBzID0gcmVjb3JkLmNhcHM7XG4gIGlmIChwcm90byA9PT0gbnVsbCB8fCBhcHAgPT09IG51bGwgfHwgYXBwVmVyc2lvbiA9PT0gbnVsbCB8fCBub25jZSA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gIGlmICghQXJyYXkuaXNBcnJheShjYXBzKSB8fCBjYXBzLnNvbWUoKGl0ZW0pID0+IHR5cGVvZiBpdGVtICE9PSBcInN0cmluZ1wiKSkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7IHR5cGU6IFwiaGVsbG9cIiwgcHJvdG8sIGFwcCwgYXBwVmVyc2lvbiwgbm9uY2UsIGNhcHMgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VSZWFkeShyZWNvcmQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogUmVhZHlGcmFtZSB8IG51bGwge1xuICBjb25zdCBzZXNzaW9uID0gc3RyaW5nRmllbGQocmVjb3JkLCBcInNlc3Npb25cIik7XG4gIGNvbnN0IHNlcnZlclByb29mID0gc3RyaW5nRmllbGQocmVjb3JkLCBcInNlcnZlclByb29mXCIpO1xuICBjb25zdCBoZWFydGJlYXRNcyA9IGludGVnZXJGaWVsZChyZWNvcmQsIFwiaGVhcnRiZWF0TXNcIik7XG4gIGNvbnN0IHNvdXJjZSA9IHNvdXJjZUJvZHkocmVjb3JkLnNvdXJjZSk7XG4gIGlmIChzZXNzaW9uID09PSBudWxsIHx8IHNlcnZlclByb29mID09PSBudWxsIHx8IGhlYXJ0YmVhdE1zID09PSBudWxsIHx8ICFzb3VyY2UpIHJldHVybiBudWxsO1xuICBpZiAoIWlzUmVjb3JkKHJlY29yZC5idXR0b24pKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgYnV0dG9uID0gc3RyaW5nRmllbGQocmVjb3JkLmJ1dHRvbiwgXCJidXR0b25cIik7XG4gIGNvbnN0IGRvd24gPSBib29sZWFuRmllbGQocmVjb3JkLmJ1dHRvbiwgXCJkb3duXCIpO1xuICBjb25zdCBzZXEgPSBpbnRlZ2VyRmllbGQocmVjb3JkLmJ1dHRvbiwgXCJzZXFcIik7XG4gIGNvbnN0IHQgPSBudW1iZXJGaWVsZChyZWNvcmQuYnV0dG9uLCBcInRcIik7XG4gIGlmIChidXR0b24gIT09IFwicHJpbWFyeVwiIHx8IGRvd24gPT09IG51bGwgfHwgc2VxID09PSBudWxsIHx8IHQgPT09IG51bGwpIHJldHVybiBudWxsO1xuICByZXR1cm4ge1xuICAgIHR5cGU6IFwicmVhZHlcIixcbiAgICBzZXNzaW9uLFxuICAgIHNlcnZlclByb29mLFxuICAgIGhlYXJ0YmVhdE1zLFxuICAgIHNvdXJjZSxcbiAgICBidXR0b246IHsgYnV0dG9uLCBkb3duLCBzZXEsIHQgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VCdXR0b24ocmVjb3JkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IEJ1dHRvbkZyYW1lIHwgbnVsbCB7XG4gIGNvbnN0IGJ1dHRvbiA9IHN0cmluZ0ZpZWxkKHJlY29yZCwgXCJidXR0b25cIik7XG4gIGNvbnN0IGRvd24gPSBib29sZWFuRmllbGQocmVjb3JkLCBcImRvd25cIik7XG4gIGNvbnN0IHNlcSA9IGludGVnZXJGaWVsZChyZWNvcmQsIFwic2VxXCIpO1xuICBjb25zdCB0ID0gbnVtYmVyRmllbGQocmVjb3JkLCBcInRcIik7XG4gIGNvbnN0IHNlbnQgPSBudW1iZXJGaWVsZChyZWNvcmQsIFwic2VudFwiKTtcbiAgaWYgKGJ1dHRvbiAhPT0gXCJwcmltYXJ5XCIgfHwgZG93biA9PT0gbnVsbCB8fCBzZXEgPT09IG51bGwgfHwgdCA9PT0gbnVsbCB8fCBzZW50ID09PSBudWxsKVxuICAgIHJldHVybiBudWxsO1xuICByZXR1cm4geyB0eXBlOiBcImJ1dHRvblwiLCBidXR0b24sIGRvd24sIHNlcSwgdCwgc2VudCB9O1xufVxuXG5mdW5jdGlvbiBwYXJzZVBpbmcocmVjb3JkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IFBpbmdGcmFtZSB8IG51bGwge1xuICBjb25zdCBzZXEgPSBpbnRlZ2VyRmllbGQocmVjb3JkLCBcInNlcVwiKTtcbiAgY29uc3QgZG93biA9IGJvb2xlYW5GaWVsZChyZWNvcmQsIFwiZG93blwiKTtcbiAgY29uc3Qgc2VudCA9IG51bWJlckZpZWxkKHJlY29yZCwgXCJzZW50XCIpO1xuICBpZiAoc2VxID09PSBudWxsIHx8IGRvd24gPT09IG51bGwgfHwgc2VudCA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7IHR5cGU6IFwicGluZ1wiLCBzZXEsIGRvd24sIHNlbnQgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VTb3VyY2UocmVjb3JkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IFNvdXJjZUZyYW1lIHwgbnVsbCB7XG4gIGNvbnN0IHNvdXJjZSA9IHNvdXJjZUJvZHkocmVjb3JkKTtcbiAgaWYgKCFzb3VyY2UpIHJldHVybiBudWxsO1xuICByZXR1cm4geyB0eXBlOiBcInNvdXJjZVwiLCAuLi5zb3VyY2UgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VDb21tYW5kKHJlY29yZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBDb21tYW5kRnJhbWUgfCBudWxsIHtcbiAgY29uc3QgYWN0aW9uID0gc3RyaW5nRmllbGQocmVjb3JkLCBcImFjdGlvblwiKTtcbiAgY29uc3Qgc2VxID0gaW50ZWdlckZpZWxkKHJlY29yZCwgXCJzZXFcIik7XG4gIGNvbnN0IHNlbnQgPSBudW1iZXJGaWVsZChyZWNvcmQsIFwic2VudFwiKTtcbiAgaWYgKGFjdGlvbiAhPT0gXCJvcGVuLW1lbnVcIiB8fCBzZXEgPT09IG51bGwgfHwgc2VudCA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7IHR5cGU6IFwiY29tbWFuZFwiLCBhY3Rpb24sIHNlcSwgc2VudCB9O1xufVxuXG4vKiogU3RyaWN0IGZyYW1lIHBhcnNlci4gVW5rbm93biB0eXBlcyBhcmUgaWdub3JlZCBieSBjYWxsZXJzLiBNYWxmb3JtZWQgSlNPTiByZXR1cm5zIG51bGwuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTZXJ2ZXJGcmFtZSh0ZXh0OiBzdHJpbmcpOiBTZXJ2ZXJGcmFtZSB8IG51bGwge1xuICBsZXQgdmFsdWU6IHVua25vd247XG4gIHRyeSB7XG4gICAgdmFsdWUgPSBKU09OLnBhcnNlKHRleHQpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAoIWlzUmVjb3JkKHZhbHVlKSB8fCB0eXBlb2YgdmFsdWUudHlwZSAhPT0gXCJzdHJpbmdcIikgcmV0dXJuIG51bGw7XG4gIHN3aXRjaCAodmFsdWUudHlwZSkge1xuICAgIGNhc2UgXCJoZWxsb1wiOlxuICAgICAgcmV0dXJuIHBhcnNlSGVsbG8odmFsdWUpO1xuICAgIGNhc2UgXCJyZWFkeVwiOlxuICAgICAgcmV0dXJuIHBhcnNlUmVhZHkodmFsdWUpO1xuICAgIGNhc2UgXCJidXR0b25cIjpcbiAgICAgIHJldHVybiBwYXJzZUJ1dHRvbih2YWx1ZSk7XG4gICAgY2FzZSBcInBpbmdcIjpcbiAgICAgIHJldHVybiBwYXJzZVBpbmcodmFsdWUpO1xuICAgIGNhc2UgXCJzb3VyY2VcIjpcbiAgICAgIHJldHVybiBwYXJzZVNvdXJjZSh2YWx1ZSk7XG4gICAgY2FzZSBcImNvbW1hbmRcIjpcbiAgICAgIHJldHVybiBwYXJzZUNvbW1hbmQodmFsdWUpO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4geyB0eXBlOiBcInVua25vd25cIiwgcmF3VHlwZTogdmFsdWUudHlwZSB9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjR1cmwoYnl0ZXM6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICBsZXQgYmluYXJ5ID0gXCJcIjtcbiAgZm9yIChjb25zdCBieXRlIG9mIGJ5dGVzKSBiaW5hcnkgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlKTtcbiAgcmV0dXJuIGJ0b2EoYmluYXJ5KS5yZXBsYWNlQWxsKFwiK1wiLCBcIi1cIikucmVwbGFjZUFsbChcIi9cIiwgXCJfXCIpLnJlcGxhY2UoLz0rJC91LCBcIlwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlY29kZVBhaXJpbmdDb2RlKGNvZGU6IHN0cmluZyk6IFVpbnQ4QXJyYXkgfCBudWxsIHtcbiAgY29uc3QgdHJpbW1lZCA9IGNvZGUudHJpbSgpO1xuICBpZiAoIS9eW0EtWmEtejAtOV8tXSskL3UudGVzdCh0cmltbWVkKSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHBhZGRlZCA9IHRyaW1tZWQgKyBcIj1cIi5yZXBlYXQoKDQgLSAodHJpbW1lZC5sZW5ndGggJSA0KSkgJSA0KTtcbiAgY29uc3QgZW5jb2RlZCA9IHBhZGRlZC5yZXBsYWNlQWxsKFwiLVwiLCBcIitcIikucmVwbGFjZUFsbChcIl9cIiwgXCIvXCIpO1xuICBsZXQgYmluYXJ5OiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgYmluYXJ5ID0gYXRvYihlbmNvZGVkKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShiaW5hcnkubGVuZ3RoKTtcbiAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGJpbmFyeS5sZW5ndGg7IGluZGV4ICs9IDEpIGJ5dGVzW2luZGV4XSA9IGJpbmFyeS5jaGFyQ29kZUF0KGluZGV4KTtcbiAgcmV0dXJuIGJ5dGVzLmxlbmd0aCA9PT0gMzIgPyBieXRlcyA6IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBuZXdOb25jZSgpOiBzdHJpbmcge1xuICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KDE2KTtcbiAgY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhieXRlcyk7XG4gIHJldHVybiBiYXNlNjR1cmwoYnl0ZXMpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBobWFjKHNlY3JldDogVWludDhBcnJheSwgbWVzc2FnZTogc3RyaW5nKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gIGNvbnN0IGtleSA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuaW1wb3J0S2V5KFxuICAgIFwicmF3XCIsXG4gICAgY29weUJ5dGVzKHNlY3JldCksXG4gICAgeyBuYW1lOiBcIkhNQUNcIiwgaGFzaDogXCJTSEEtMjU2XCIgfSxcbiAgICBmYWxzZSxcbiAgICBbXCJzaWduXCJdXG4gICk7XG4gIGNvbnN0IHNpZ25hdHVyZSA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuc2lnbihcIkhNQUNcIiwga2V5LCB0ZXh0RW5jb2Rlci5lbmNvZGUobWVzc2FnZSkpO1xuICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoc2lnbmF0dXJlKTtcbn1cblxuZnVuY3Rpb24gY29weUJ5dGVzKGJ5dGVzOiBVaW50OEFycmF5KTogQXJyYXlCdWZmZXIge1xuICBjb25zdCBjb3B5ID0gbmV3IEFycmF5QnVmZmVyKGJ5dGVzLmJ5dGVMZW5ndGgpO1xuICBuZXcgVWludDhBcnJheShjb3B5KS5zZXQoYnl0ZXMpO1xuICByZXR1cm4gY29weTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByb29mKFxuICBzZWNyZXQ6IFVpbnQ4QXJyYXksXG4gIG5vbmNlOiBzdHJpbmcsXG4gIGNsaWVudE5vbmNlOiBzdHJpbmcsXG4gIHJvbGU6IFwiY2xpZW50XCIgfCBcInNlcnZlclwiXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBkaWdlc3QgPSBhd2FpdCBobWFjKHNlY3JldCwgYHNwZW4tYnJpZGdlLzF8JHtyb2xlfXwke25vbmNlfXwke2NsaWVudE5vbmNlfWApO1xuICByZXR1cm4gYmFzZTY0dXJsKGRpZ2VzdCk7XG59XG5cbmNvbnN0IEJBU0UzMiA9IFwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVoyMzQ1NjdcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGJhc2UzMihieXRlczogVWludDhBcnJheSk6IHN0cmluZyB7XG4gIGxldCBvdXRwdXQgPSBcIlwiO1xuICBsZXQgYnVmZmVyID0gMDtcbiAgbGV0IGJpdHMgPSAwO1xuICBmb3IgKGNvbnN0IGJ5dGUgb2YgYnl0ZXMpIHtcbiAgICBidWZmZXIgPSAoYnVmZmVyIDw8IDgpIHwgYnl0ZTtcbiAgICBiaXRzICs9IDg7XG4gICAgd2hpbGUgKGJpdHMgPj0gNSkge1xuICAgICAgYml0cyAtPSA1O1xuICAgICAgb3V0cHV0ICs9IEJBU0UzMlsoYnVmZmVyID4+IGJpdHMpICYgMzFdO1xuICAgIH1cbiAgfVxuICBpZiAoYml0cyA+IDApIG91dHB1dCArPSBCQVNFMzJbKGJ1ZmZlciA8PCAoNSAtIGJpdHMpKSAmIDMxXTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmdlcnByaW50KHNlY3JldDogVWludDhBcnJheSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGRpZ2VzdCA9IG5ldyBVaW50OEFycmF5KGF3YWl0IGNyeXB0by5zdWJ0bGUuZGlnZXN0KFwiU0hBLTI1NlwiLCBjb3B5Qnl0ZXMoc2VjcmV0KSkpO1xuICBjb25zdCBlbmNvZGVkID0gYmFzZTMyKGRpZ2VzdCk7XG4gIHJldHVybiBgJHtlbmNvZGVkLnNsaWNlKDAsIDQpfS0ke2VuY29kZWQuc2xpY2UoNCwgOCl9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhZmVFcXVhbChsZWZ0OiBzdHJpbmcsIHJpZ2h0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgYSA9IHRleHRFbmNvZGVyLmVuY29kZShsZWZ0KTtcbiAgY29uc3QgYiA9IHRleHRFbmNvZGVyLmVuY29kZShyaWdodCk7XG4gIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgbGV0IGRpZmYgPSAwO1xuICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgYS5sZW5ndGg7IGluZGV4ICs9IDEpIGRpZmYgfD0gKGFbaW5kZXhdID8/IDApIF4gKGJbaW5kZXhdID8/IDApO1xuICByZXR1cm4gZGlmZiA9PT0gMDtcbn1cbiIsICJpbXBvcnQgeyBQbGF0Zm9ybSB9IGZyb20gXCJvYnNpZGlhblwiO1xuXG5leHBvcnQgdHlwZSBTdHlsdXNBY3Rpb24gPSBcIm1lbnVcIiB8IFwiY29udGV4dC1tZW51XCIgfCBcImNvcHlcIiB8IFwicGFzdGVcIiB8IFwibm9uZVwiO1xuZXhwb3J0IHR5cGUgQmFycmVsQnV0dG9uTWFzayA9IDEgfCAyIHwgNCB8IDggfCAxNiB8IDMyO1xuZXhwb3J0IHR5cGUgUHJpbWFyeUNvbnRhY3RNb2RlID0gXCJob3Zlci1vbmx5XCIgfCBcImV4cGVyaW1lbnRhbFwiO1xuZXhwb3J0IHR5cGUgTWlkU3Ryb2tlUHJlc3MgPSBcInNwbGl0XCIgfCBcIm5leHQtY29udGFjdFwiO1xuZXhwb3J0IHR5cGUgRXJhc2VyU3RyYXRlZ3kgPSBcInN5bnRoZXRpYy1idXR0b241XCIgfCBcInNldC1hY3RpdmUtdG9vbFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFN0eWx1c0NvbnRyb2xzU2V0dGluZ3Mge1xuICBidXR0b25UYXBBY3Rpb246IFN0eWx1c0FjdGlvbjtcbiAgYnV0dG9uRG91YmxlVGFwQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gIGJ1dHRvbkhvbGRBY3Rpb246IFN0eWx1c0FjdGlvbjtcbiAgYnV0dG9uQ29udGFjdEFjdGlvbjogXCJlcmFzZXJcIiB8IFwibm9uZVwiO1xuICBkb3VibGVUYXBNczogbnVtYmVyO1xuICBsb25nUHJlc3NNczogbnVtYmVyO1xuICBtb3ZlbWVudFRocmVzaG9sZFB4OiBudW1iZXI7XG4gIC8qKiBQb2ludGVyRXZlbnQuYnV0dG9ucyBiaXQgdXNlZCBieSB0aGUgZGV2aWNlIGZvciB0aGUgYmFycmVsIGJ1dHRvbi4gKi9cbiAgYmFycmVsQnV0dG9uTWFzazogQmFycmVsQnV0dG9uTWFzaztcbiAgLyoqIFByZXZlbnQgdGhlIEFuZHJvaWQvV2ViVmlldyBwcmltYXJ5IGJpdCBmcm9tIG1hdGNoaW5nIG9yZGluYXJ5IHBlbiBjb250YWN0IGJ5IGRlZmF1bHQuICovXG4gIHByaW1hcnlDb250YWN0TW9kZTogUHJpbWFyeUNvbnRhY3RNb2RlO1xuICAvKiogQWxsb3cgYSB0ZXN0ZXIgdG8gaW5zcGVjdCByZWNvZ25pdGlvbiB3aXRob3V0IGNoYW5naW5nIHRoZSBkcmF3aW5nIG9yIG9wZW5pbmcgYWN0aW9ucy4gKi9cbiAgc3R5bHVzVGVzdE1vZGU6IGJvb2xlYW47XG4gIGRlYnVnTW9kZTogYm9vbGVhbjtcbiAgZGVidWdPdmVybGF5OiBib29sZWFuO1xuICBwZW5CcmlkZ2VFbmFibGVkOiBib29sZWFuO1xuICBwZW5CcmlkZ2VQb3J0OiBudW1iZXI7XG4gIGxhdGVXaW5kb3dNczogbnVtYmVyO1xuICBtaWRTdHJva2VQcmVzczogTWlkU3Ryb2tlUHJlc3M7XG4gIGVyYXNlclN0cmF0ZWd5OiBFcmFzZXJTdHJhdGVneTtcbiAgc3VwcHJlc3NIb3ZlckJ1dHRvbkV2ZW50czogYm9vbGVhbjtcbiAgLyoqIEJ1bXBlZCB3aGVuIGEgZGVmYXVsdCBnZXN0dXJlIGNoYW5nZXMsIHNvIGFuIG9sZGVyIHNhdmVkIG1hcHBpbmcgY2FuIG1vdmUgb25jZS4gKi9cbiAgZ2VzdHVyZVJldmlzaW9uOiBudW1iZXI7XG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTdHlsdXNDb250cm9sc1NldHRpbmdzID0ge1xuICBidXR0b25UYXBBY3Rpb246IFwibWVudVwiLFxuICBidXR0b25Eb3VibGVUYXBBY3Rpb246IFwiY29udGV4dC1tZW51XCIsXG4gIGJ1dHRvbkhvbGRBY3Rpb246IFwibm9uZVwiLFxuICBidXR0b25Db250YWN0QWN0aW9uOiBcImVyYXNlclwiLFxuICBkb3VibGVUYXBNczogMzAwLFxuICBsb25nUHJlc3NNczogNDUwLFxuICBtb3ZlbWVudFRocmVzaG9sZFB4OiA4LFxuICAvLyBQb2ludGVyIEV2ZW50cyBzcGVjaWZpZXMgYml0IDIgZm9yIGEgcGVuIGJhcnJlbCBidXR0b24uIEJpdCAxIGlzIHRoZSB0aXAuXG4gIGJhcnJlbEJ1dHRvbk1hc2s6IDIsXG4gIHByaW1hcnlDb250YWN0TW9kZTogXCJob3Zlci1vbmx5XCIsXG4gIHN0eWx1c1Rlc3RNb2RlOiBmYWxzZSxcbiAgZGVidWdNb2RlOiBmYWxzZSxcbiAgZGVidWdPdmVybGF5OiBmYWxzZSxcbiAgcGVuQnJpZGdlRW5hYmxlZDogZmFsc2UsXG4gIHBlbkJyaWRnZVBvcnQ6IDQ3NjMxLFxuICBsYXRlV2luZG93TXM6IDQwLFxuICBtaWRTdHJva2VQcmVzczogXCJzcGxpdFwiLFxuICBlcmFzZXJTdHJhdGVneTogXCJzeW50aGV0aWMtYnV0dG9uNVwiLFxuICBzdXBwcmVzc0hvdmVyQnV0dG9uRXZlbnRzOiB0cnVlLFxuICBnZXN0dXJlUmV2aXNpb246IDIsXG59O1xuXG5leHBvcnQgY29uc3QgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUyA9IHtcbiAgZG91YmxlVGFwTXM6IHsgbWluOiAxMDAsIG1heDogMTAwMCB9LFxuICBsb25nUHJlc3NNczogeyBtaW46IDE1MCwgbWF4OiAyMDAwIH0sXG4gIG1vdmVtZW50VGhyZXNob2xkUHg6IHsgbWluOiAxLCBtYXg6IDEwMCB9LFxuICBsYXRlV2luZG93TXM6IHsgbWluOiAwLCBtYXg6IDEwMCB9LFxufSBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgTnVtZXJpY1NldHRpbmdLZXkgPSBrZXlvZiB0eXBlb2YgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUztcblxuZXhwb3J0IGludGVyZmFjZSBTZXR0aW5nc1BsYXRmb3JtIHtcbiAgYW5kcm9pZDogYm9vbGVhbjtcbn1cblxuY29uc3QgQkFSUkVMX01BU0tTOiByZWFkb25seSBCYXJyZWxCdXR0b25NYXNrW10gPSBbMSwgMiwgNCwgOCwgMTYsIDMyXTtcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTnVtZXJpY1NldHRpbmcoa2V5OiBOdW1lcmljU2V0dGluZ0tleSwgdmFsdWU6IHN0cmluZyk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCBwYXJzZWQgPSBOdW1iZXIodmFsdWUpO1xuICBjb25zdCB7IG1pbiwgbWF4IH0gPSBOVU1FUklDX1NFVFRJTkdfTElNSVRTW2tleV07XG4gIHJldHVybiBOdW1iZXIuaXNJbnRlZ2VyKHBhcnNlZCkgJiYgcGFyc2VkID49IG1pbiAmJiBwYXJzZWQgPD0gbWF4ID8gcGFyc2VkIDogbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlQmFycmVsU291cmNlKFxuICBzZXR0aW5nczogeyBiYXJyZWxCdXR0b25NYXNrOiBudW1iZXI7IHByaW1hcnlDb250YWN0TW9kZTogc3RyaW5nIH0sXG4gIGJyaWRnZVJlYWR5OiBib29sZWFuXG4pOiBzdHJpbmcge1xuICBpZiAoYnJpZGdlUmVhZHkpIHJldHVybiBcImJyaWRnZVwiO1xuICBpZiAoc2V0dGluZ3MuYmFycmVsQnV0dG9uTWFzayA9PT0gMSAmJiBzZXR0aW5ncy5wcmltYXJ5Q29udGFjdE1vZGUgPT09IFwiaG92ZXItb25seVwiKSB7XG4gICAgcmV0dXJuIFwiaG92ZXItbGF0Y2hcIjtcbiAgfVxuICByZXR1cm4gYHBvaW50ZXIgbWFzayAke3NldHRpbmdzLmJhcnJlbEJ1dHRvbk1hc2t9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVNldHRpbmdzKFxuICB2YWx1ZTogUGFydGlhbDxTdHlsdXNDb250cm9sc1NldHRpbmdzPixcbiAgcGxhdGZvcm06IFNldHRpbmdzUGxhdGZvcm0gPSB7IGFuZHJvaWQ6IFBsYXRmb3JtLmlzQW5kcm9pZEFwcCB9XG4pOiBTdHlsdXNDb250cm9sc1NldHRpbmdzIHtcbiAgY29uc3QgYWN0aW9uID0gKGNhbmRpZGF0ZTogdW5rbm93biwgZmFsbGJhY2s6IFN0eWx1c0FjdGlvbik6IFN0eWx1c0FjdGlvbiA9PlxuICAgIGNhbmRpZGF0ZSA9PT0gXCJtZW51XCIgfHxcbiAgICBjYW5kaWRhdGUgPT09IFwiY29udGV4dC1tZW51XCIgfHxcbiAgICBjYW5kaWRhdGUgPT09IFwiY29weVwiIHx8XG4gICAgY2FuZGlkYXRlID09PSBcInBhc3RlXCIgfHxcbiAgICBjYW5kaWRhdGUgPT09IFwibm9uZVwiXG4gICAgICA/IGNhbmRpZGF0ZVxuICAgICAgOiBmYWxsYmFjaztcbiAgY29uc3QgbnVtYmVyID0gKGNhbmRpZGF0ZTogdW5rbm93biwgZmFsbGJhY2s6IG51bWJlciwgbWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyID0+XG4gICAgdHlwZW9mIGNhbmRpZGF0ZSA9PT0gXCJudW1iZXJcIiAmJiBOdW1iZXIuaXNGaW5pdGUoY2FuZGlkYXRlKVxuICAgICAgPyBNYXRoLm1pbihtYXgsIE1hdGgubWF4KG1pbiwgTWF0aC5yb3VuZChjYW5kaWRhdGUpKSlcbiAgICAgIDogZmFsbGJhY2s7XG4gIGNvbnN0IG1hc2tXYXNVbnNldCA9IHZhbHVlLmJhcnJlbEJ1dHRvbk1hc2sgPT09IHVuZGVmaW5lZDtcbiAgY29uc3QgZXhwbGljaXRNYXNrID0gQkFSUkVMX01BU0tTLmZpbmQoKG1hc2spID0+IG1hc2sgPT09IHZhbHVlLmJhcnJlbEJ1dHRvbk1hc2spO1xuICBjb25zdCBzdG9yZWRSZXZpc2lvbiA9IHZhbHVlLmdlc3R1cmVSZXZpc2lvbiA9PT0gMiA/IDIgOiAwO1xuICBjb25zdCBkb3VibGVUYXAgPSBhY3Rpb24odmFsdWUuYnV0dG9uRG91YmxlVGFwQWN0aW9uLCBERUZBVUxUX1NFVFRJTkdTLmJ1dHRvbkRvdWJsZVRhcEFjdGlvbik7XG4gIGNvbnN0IGhvbGQgPSBhY3Rpb24odmFsdWUuYnV0dG9uSG9sZEFjdGlvbiwgREVGQVVMVF9TRVRUSU5HUy5idXR0b25Ib2xkQWN0aW9uKTtcbiAgcmV0dXJuIHtcbiAgICBidXR0b25UYXBBY3Rpb246IGFjdGlvbih2YWx1ZS5idXR0b25UYXBBY3Rpb24sIERFRkFVTFRfU0VUVElOR1MuYnV0dG9uVGFwQWN0aW9uKSxcbiAgICBidXR0b25Eb3VibGVUYXBBY3Rpb246XG4gICAgICBzdG9yZWRSZXZpc2lvbiA8IDIgJiZcbiAgICAgICh2YWx1ZS5idXR0b25Eb3VibGVUYXBBY3Rpb24gPT09IHVuZGVmaW5lZCB8fCB2YWx1ZS5idXR0b25Eb3VibGVUYXBBY3Rpb24gPT09IFwiY29weVwiKVxuICAgICAgICA/IFwiY29udGV4dC1tZW51XCJcbiAgICAgICAgOiBkb3VibGVUYXAsXG4gICAgYnV0dG9uSG9sZEFjdGlvbjpcbiAgICAgIHN0b3JlZFJldmlzaW9uIDwgMiAmJlxuICAgICAgKHZhbHVlLmJ1dHRvbkhvbGRBY3Rpb24gPT09IHVuZGVmaW5lZCB8fCB2YWx1ZS5idXR0b25Ib2xkQWN0aW9uID09PSBcInBhc3RlXCIpXG4gICAgICAgID8gXCJub25lXCJcbiAgICAgICAgOiBob2xkLFxuICAgIGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlLmJ1dHRvbkNvbnRhY3RBY3Rpb24gPT09IFwibm9uZVwiID8gXCJub25lXCIgOiBcImVyYXNlclwiLFxuICAgIGRvdWJsZVRhcE1zOiBudW1iZXIoXG4gICAgICB2YWx1ZS5kb3VibGVUYXBNcyxcbiAgICAgIDMwMCxcbiAgICAgIE5VTUVSSUNfU0VUVElOR19MSU1JVFMuZG91YmxlVGFwTXMubWluLFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5kb3VibGVUYXBNcy5tYXhcbiAgICApLFxuICAgIGxvbmdQcmVzc01zOiBudW1iZXIoXG4gICAgICB2YWx1ZS5sb25nUHJlc3NNcyxcbiAgICAgIDQ1MCxcbiAgICAgIE5VTUVSSUNfU0VUVElOR19MSU1JVFMubG9uZ1ByZXNzTXMubWluLFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5sb25nUHJlc3NNcy5tYXhcbiAgICApLFxuICAgIG1vdmVtZW50VGhyZXNob2xkUHg6IG51bWJlcihcbiAgICAgIHZhbHVlLm1vdmVtZW50VGhyZXNob2xkUHgsXG4gICAgICA4LFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5tb3ZlbWVudFRocmVzaG9sZFB4Lm1pbixcbiAgICAgIE5VTUVSSUNfU0VUVElOR19MSU1JVFMubW92ZW1lbnRUaHJlc2hvbGRQeC5tYXhcbiAgICApLFxuICAgIGJhcnJlbEJ1dHRvbk1hc2s6XG4gICAgICBleHBsaWNpdE1hc2sgPz8gKHBsYXRmb3JtLmFuZHJvaWQgJiYgbWFza1dhc1Vuc2V0ID8gMSA6IERFRkFVTFRfU0VUVElOR1MuYmFycmVsQnV0dG9uTWFzayksXG4gICAgcHJpbWFyeUNvbnRhY3RNb2RlOiB2YWx1ZS5wcmltYXJ5Q29udGFjdE1vZGUgPT09IFwiZXhwZXJpbWVudGFsXCIgPyBcImV4cGVyaW1lbnRhbFwiIDogXCJob3Zlci1vbmx5XCIsXG4gICAgc3R5bHVzVGVzdE1vZGU6IHZhbHVlLnN0eWx1c1Rlc3RNb2RlID09PSB0cnVlLFxuICAgIGRlYnVnTW9kZTogdmFsdWUuZGVidWdNb2RlID09PSB0cnVlLFxuICAgIGRlYnVnT3ZlcmxheTogdmFsdWUuZGVidWdPdmVybGF5ID09PSB0cnVlLFxuICAgIHBlbkJyaWRnZUVuYWJsZWQ6IHZhbHVlLnBlbkJyaWRnZUVuYWJsZWQgPT09IHRydWUsXG4gICAgcGVuQnJpZGdlUG9ydDogbnVtYmVyKHZhbHVlLnBlbkJyaWRnZVBvcnQsIDQ3NjMxLCAxMDI0LCA2NTUzNSksXG4gICAgbGF0ZVdpbmRvd01zOiBudW1iZXIoXG4gICAgICB2YWx1ZS5sYXRlV2luZG93TXMsXG4gICAgICA0MCxcbiAgICAgIE5VTUVSSUNfU0VUVElOR19MSU1JVFMubGF0ZVdpbmRvd01zLm1pbixcbiAgICAgIE5VTUVSSUNfU0VUVElOR19MSU1JVFMubGF0ZVdpbmRvd01zLm1heFxuICAgICksXG4gICAgbWlkU3Ryb2tlUHJlc3M6IHZhbHVlLm1pZFN0cm9rZVByZXNzID09PSBcIm5leHQtY29udGFjdFwiID8gXCJuZXh0LWNvbnRhY3RcIiA6IFwic3BsaXRcIixcbiAgICBlcmFzZXJTdHJhdGVneTpcbiAgICAgIHZhbHVlLmVyYXNlclN0cmF0ZWd5ID09PSBcInNldC1hY3RpdmUtdG9vbFwiID8gXCJzZXQtYWN0aXZlLXRvb2xcIiA6IFwic3ludGhldGljLWJ1dHRvbjVcIixcbiAgICBzdXBwcmVzc0hvdmVyQnV0dG9uRXZlbnRzOiB2YWx1ZS5zdXBwcmVzc0hvdmVyQnV0dG9uRXZlbnRzICE9PSBmYWxzZSxcbiAgICBnZXN0dXJlUmV2aXNpb246IDIsXG4gIH07XG59XG4iLCAiZXhwb3J0IGludGVyZmFjZSBIdHRwQ2hlY2sge1xuICBvazogYm9vbGVhbjtcbiAgc3RhdHVzOiBudW1iZXIgfCBudWxsO1xuICBib2R5OiBzdHJpbmcgfCBudWxsO1xuICBlcnJvcjogc3RyaW5nIHwgbnVsbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTb2NrZXRDaGVjayB7XG4gIG9rOiBib29sZWFuO1xuICBvcGVuTXM6IG51bWJlciB8IG51bGw7XG4gIGVycm9yOiBzdHJpbmcgfCBudWxsO1xuICBjbG9zZUNvZGU6IG51bWJlciB8IG51bGw7XG4gIGNsb3NlUmVhc29uOiBzdHJpbmcgfCBudWxsO1xuICB3YXNDbGVhbjogYm9vbGVhbiB8IG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSGVsbG9DaGVjayB7XG4gIHByb3RvOiBudW1iZXI7XG4gIGFwcDogc3RyaW5nO1xuICBhcHBWZXJzaW9uOiBzdHJpbmc7XG4gIGNhcHM6IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNvdXJjZUNoZWNrIHtcbiAgc3RhdGU6IFwib2tcIiB8IFwidW5hdmFpbGFibGVcIjtcbiAgcmVhc29uPzogc3RyaW5nO1xuICBub2RlPzogc3RyaW5nO1xuICBuYW1lPzogc3RyaW5nO1xufVxuXG5leHBvcnQgdHlwZSBIYW5kc2hha2VDaGVjayA9IFwic2tpcHBlZFwiIHwgXCJyZWFkeVwiIHwgXCJ3cm9uZy1jb2RlXCIgfCBcInByb3RvY29sXCIgfCBcImZhaWxlZFwiIHwgXCJub3QtcnVuXCI7XG5leHBvcnQgdHlwZSBTZXJ2ZXJQcm9vZkNoZWNrID0gXCJva1wiIHwgXCJiYWRcIiB8IFwic2tpcHBlZFwiIHwgXCJub3QtcnVuXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJpZGdlQ2hlY2tSZXN1bHQge1xuICBodHRwOiBIdHRwQ2hlY2s7XG4gIHdlYnNvY2tldDogU29ja2V0Q2hlY2s7XG4gIGhlbGxvOiBIZWxsb0NoZWNrIHwgbnVsbDtcbiAgaGFuZHNoYWtlOiBIYW5kc2hha2VDaGVjaztcbiAgc2VydmVyUHJvb2Y6IFNlcnZlclByb29mQ2hlY2s7XG4gIHNvdXJjZTogU291cmNlQ2hlY2sgfCBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmVyZGljdChjaGVja3M6IEJyaWRnZUNoZWNrUmVzdWx0KTogc3RyaW5nIHtcbiAgaWYgKCFjaGVja3MuaHR0cC5vaykgcmV0dXJuIFwiQnJpZGdlIGFwcCBub3QgcnVubmluZ1wiO1xuICBpZiAoIWNoZWNrcy53ZWJzb2NrZXQub2spIHtcbiAgICByZXR1cm4gXCJPYnNpZGlhbiBibG9ja3Mgd3M6Ly8xMjcuMC4wLjEgKEhUVFAgb2ssIFdlYlNvY2tldCBmYWlsZWQpXCI7XG4gIH1cbiAgaWYgKCFjaGVja3MuaGVsbG8pIHJldHVybiBcIkJyaWRnZSBXZWJTb2NrZXQgb3BlbmVkIGJ1dCBubyBoZWxsbyBmcmFtZSBhcnJpdmVkXCI7XG4gIGlmIChjaGVja3Muc2VydmVyUHJvb2YgPT09IFwiYmFkXCIpIHJldHVybiBcIkJyaWRnZSBpZGVudGl0eSBjaGVjayBmYWlsZWQgKHNlcnZlciBwcm9vZilcIjtcbiAgaWYgKGNoZWNrcy5oYW5kc2hha2UgPT09IFwid3JvbmctY29kZVwiKSByZXR1cm4gXCJXcm9uZyBwYWlyaW5nIGNvZGVcIjtcbiAgaWYgKGNoZWNrcy5oYW5kc2hha2UgPT09IFwicHJvdG9jb2xcIikgcmV0dXJuIFwiQnJpZGdlIHByb3RvY29sIGVycm9yXCI7XG4gIGlmIChjaGVja3Muc291cmNlPy5zdGF0ZSA9PT0gXCJ1bmF2YWlsYWJsZVwiKSB7XG4gICAgcmV0dXJuIGBCcmlkZ2UgcnVubmluZyBidXQgcGVuIGlucHV0IHVuYXZhaWxhYmxlOiAke2NoZWNrcy5zb3VyY2UucmVhc29uID8/IFwidW5rbm93blwifWA7XG4gIH1cbiAgaWYgKFxuICAgIGNoZWNrcy5oYW5kc2hha2UgPT09IFwicmVhZHlcIiAmJlxuICAgIGNoZWNrcy5zZXJ2ZXJQcm9vZiA9PT0gXCJva1wiICYmXG4gICAgY2hlY2tzLnNvdXJjZT8uc3RhdGUgPT09IFwib2tcIlxuICApIHtcbiAgICByZXR1cm4gXCJCcmlkZ2UgcmVhY2hhYmxlIGFuZCBwYWlyZWQ6IG1pZC1zdHJva2UgZXJhc2UgT05cIjtcbiAgfVxuICBpZiAoY2hlY2tzLmhhbmRzaGFrZSA9PT0gXCJza2lwcGVkXCIpIHtcbiAgICByZXR1cm4gXCJCcmlkZ2UgcmVhY2hhYmxlLiBQYXN0ZSBhIHBhaXJpbmcgY29kZSB0byB0dXJuIG9uIG1pZC1zdHJva2UgZXJhc2UuXCI7XG4gIH1cbiAgaWYgKGNoZWNrcy5oYW5kc2hha2UgPT09IFwiZmFpbGVkXCIpIHJldHVybiBcIkJyaWRnZSBoYW5kc2hha2UgZmFpbGVkXCI7XG4gIHJldHVybiBcIkJyaWRnZSBjaGVjayBpbmNvbXBsZXRlXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRDaGVja0xpbmVzKGNoZWNrczogQnJpZGdlQ2hlY2tSZXN1bHQpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGh0dHAgPSBjaGVja3MuaHR0cC5va1xuICAgID8gYFx1MjcwNSBOYXRpdmUgSFRUUDogJHtjaGVja3MuaHR0cC5zdGF0dXMgPz8gXCJcIn0gJHtjaGVja3MuaHR0cC5ib2R5ID8/IFwiXCJ9YC50cmltKClcbiAgICA6IGBcdTI3NEMgTmF0aXZlIEhUVFA6ICR7Y2hlY2tzLmh0dHAuZXJyb3IgPz8gYHN0YXR1cyAke2NoZWNrcy5odHRwLnN0YXR1cyA/PyBcInVua25vd25cIn1gfWA7XG4gIGNvbnN0IHNvY2tldCA9IGNoZWNrcy53ZWJzb2NrZXQub2tcbiAgICA/IGBcdTI3MDUgV2ViU29ja2V0IG9wZW46ICR7Y2hlY2tzLndlYnNvY2tldC5vcGVuTXMgPz8gXCI/XCJ9IG1zYFxuICAgIDogYFx1Mjc0QyBXZWJTb2NrZXQgb3BlbjogJHtjaGVja3Mud2Vic29ja2V0LmVycm9yID8/IFwiZmFpbGVkXCJ9JHtcbiAgICAgICAgY2hlY2tzLndlYnNvY2tldC5jbG9zZUNvZGUgPT09IG51bGwgPyBcIlwiIDogYCBjbG9zZSAke2NoZWNrcy53ZWJzb2NrZXQuY2xvc2VDb2RlfWBcbiAgICAgIH0ke2NoZWNrcy53ZWJzb2NrZXQuY2xvc2VSZWFzb24gPyBgICR7Y2hlY2tzLndlYnNvY2tldC5jbG9zZVJlYXNvbn1gIDogXCJcIn1gO1xuICBjb25zdCBoZWxsbyA9IGNoZWNrcy5oZWxsb1xuICAgID8gYFx1MjcwNSBoZWxsbzogcHJvdG8gJHtjaGVja3MuaGVsbG8ucHJvdG99ICR7Y2hlY2tzLmhlbGxvLmFwcH0gJHtjaGVja3MuaGVsbG8uYXBwVmVyc2lvbn0gY2FwcyAke2NoZWNrcy5oZWxsby5jYXBzLmpvaW4oXCIsXCIpfWBcbiAgICA6IFwiXHUyNzRDIGhlbGxvOiBub3QgcmVjZWl2ZWRcIjtcbiAgY29uc3QgaGFuZHNoYWtlID1cbiAgICBjaGVja3MuaGFuZHNoYWtlID09PSBcInJlYWR5XCJcbiAgICAgID8gXCJcdTI3MDUgSGFuZHNoYWtlOiByZWFkeVwiXG4gICAgICA6IGNoZWNrcy5oYW5kc2hha2UgPT09IFwic2tpcHBlZFwiXG4gICAgICAgID8gXCJIYW5kc2hha2U6IHNraXBwZWQgKG5vIHBhaXJpbmcgY29kZSlcIlxuICAgICAgICA6IGNoZWNrcy5oYW5kc2hha2UgPT09IFwibm90LXJ1blwiXG4gICAgICAgICAgPyBcIkhhbmRzaGFrZTogbm90IHJ1blwiXG4gICAgICAgICAgOiBgXHUyNzRDIEhhbmRzaGFrZTogJHtjaGVja3MuaGFuZHNoYWtlfWA7XG4gIGNvbnN0IHByb29mID1cbiAgICBjaGVja3Muc2VydmVyUHJvb2YgPT09IFwib2tcIlxuICAgICAgPyBcIlx1MjcwNSBTZXJ2ZXIgcHJvb2ZcIlxuICAgICAgOiBjaGVja3Muc2VydmVyUHJvb2YgPT09IFwiYmFkXCJcbiAgICAgICAgPyBcIlx1Mjc0QyBTZXJ2ZXIgcHJvb2ZcIlxuICAgICAgICA6IGBTZXJ2ZXIgcHJvb2Y6ICR7Y2hlY2tzLnNlcnZlclByb29mfWA7XG4gIGNvbnN0IHNvdXJjZSA9ICFjaGVja3Muc291cmNlXG4gICAgPyBcIlNvdXJjZTogbm90IHJlY2VpdmVkXCJcbiAgICA6IGNoZWNrcy5zb3VyY2Uuc3RhdGUgPT09IFwib2tcIlxuICAgICAgPyBgXHUyNzA1IFNvdXJjZTogb2sgJHtjaGVja3Muc291cmNlLm5hbWUgPz8gXCJcIn0gJHtjaGVja3Muc291cmNlLm5vZGUgPz8gXCJcIn1gLnRyaW0oKVxuICAgICAgOiBgXHUyNzRDIFNvdXJjZTogdW5hdmFpbGFibGUgJHtjaGVja3Muc291cmNlLnJlYXNvbiA/PyBcIlwifWAudHJpbSgpO1xuICByZXR1cm4gW2h0dHAsIHNvY2tldCwgaGVsbG8sIGhhbmRzaGFrZSwgcHJvb2YsIHNvdXJjZSwgdmVyZGljdChjaGVja3MpXTtcbn1cbiIsICJleHBvcnQgaW50ZXJmYWNlIFByb2JlRXZlbnQge1xuICB0OiBudW1iZXI7XG4gIHR5cGU6IHN0cmluZztcbiAgcG9pbnRlclR5cGU6IHN0cmluZztcbiAgYnV0dG9uOiBudW1iZXI7XG4gIGJ1dHRvbnM6IG51bWJlcjtcbiAgcHJlc3N1cmU6IG51bWJlcjtcbiAgcGhhc2U6IFwiY29udGFjdFwiIHwgXCJob3ZlclwiO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFByb2JlU3VtbWFyeSB7XG4gIHBlblNlZW46IGJvb2xlYW47XG4gIGhvdmVyQnV0dG9uczogbnVtYmVyW107XG4gIGNvbnRhY3RCdXR0b25zOiBudW1iZXJbXTtcbiAgZG93bkJ1dHRvbnM6IG51bWJlcltdO1xuICBlcmFzZXJTZWVuOiBib29sZWFuO1xuICBjb250ZXh0TWVudUZyb21QZW46IGJvb2xlYW47XG59XG5cbmZ1bmN0aW9uIHVuaXF1ZSh2YWx1ZXM6IG51bWJlcltdKTogbnVtYmVyW10ge1xuICByZXR1cm4gWy4uLm5ldyBTZXQodmFsdWVzKV0uc29ydCgobGVmdCwgcmlnaHQpID0+IGxlZnQgLSByaWdodCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdW1tYXJpemVQcm9iZShldmVudHM6IHJlYWRvbmx5IFByb2JlRXZlbnRbXSk6IFByb2JlU3VtbWFyeSB7XG4gIGNvbnN0IHBlbiA9IGV2ZW50cy5maWx0ZXIoKGV2ZW50KSA9PiBldmVudC5wb2ludGVyVHlwZSA9PT0gXCJwZW5cIik7XG4gIHJldHVybiB7XG4gICAgcGVuU2VlbjogcGVuLmxlbmd0aCA+IDAsXG4gICAgaG92ZXJCdXR0b25zOiB1bmlxdWUoXG4gICAgICBwZW4uZmlsdGVyKChldmVudCkgPT4gZXZlbnQucGhhc2UgPT09IFwiaG92ZXJcIikubWFwKChldmVudCkgPT4gZXZlbnQuYnV0dG9ucylcbiAgICApLFxuICAgIGNvbnRhY3RCdXR0b25zOiB1bmlxdWUoXG4gICAgICBwZW4uZmlsdGVyKChldmVudCkgPT4gZXZlbnQucGhhc2UgPT09IFwiY29udGFjdFwiKS5tYXAoKGV2ZW50KSA9PiBldmVudC5idXR0b25zKVxuICAgICksXG4gICAgZG93bkJ1dHRvbnM6IHVuaXF1ZShcbiAgICAgIHBlbi5maWx0ZXIoKGV2ZW50KSA9PiBldmVudC50eXBlID09PSBcInBvaW50ZXJkb3duXCIpLm1hcCgoZXZlbnQpID0+IGV2ZW50LmJ1dHRvbilcbiAgICApLFxuICAgIGVyYXNlclNlZW46IHBlbi5zb21lKChldmVudCkgPT4gZXZlbnQuYnV0dG9uID09PSA1IHx8IChldmVudC5idXR0b25zICYgMzIpICE9PSAwKSxcbiAgICBjb250ZXh0TWVudUZyb21QZW46IHBlbi5zb21lKChldmVudCkgPT4gZXZlbnQudHlwZSA9PT0gXCJjb250ZXh0bWVudVwiKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYnJhY2UodmFsdWVzOiBudW1iZXJbXSk6IHN0cmluZyB7XG4gIHJldHVybiBgeyR7dmFsdWVzLmpvaW4oXCIsIFwiKX19YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdFByb2JlU3VtbWFyeShzdW1tYXJ5OiBQcm9iZVN1bW1hcnkpOiBzdHJpbmcge1xuICByZXR1cm4gW1xuICAgIGBQZW4gc2VlbjogJHtzdW1tYXJ5LnBlblNlZW4gPyBcInllc1wiIDogXCJub1wifWAsXG4gICAgYGJ1dHRvbnMgdmFsdWVzIHdoaWxlIGhvdmVyaW5nOiAke2JyYWNlKHN1bW1hcnkuaG92ZXJCdXR0b25zKX1gLFxuICAgIGBidXR0b25zIHZhbHVlcyB3aGlsZSB0b3VjaGluZzogJHticmFjZShzdW1tYXJ5LmNvbnRhY3RCdXR0b25zKX1gLFxuICAgIGBidXR0b24gdmFsdWVzIG9uIGRvd246ICR7YnJhY2Uoc3VtbWFyeS5kb3duQnV0dG9ucyl9YCxcbiAgICBgZXJhc2VyIGVuZCAoYnV0dG9uIDUgLyBidXR0b25zIDMyKSBzZWVuOiAke3N1bW1hcnkuZXJhc2VyU2VlbiA/IFwieWVzXCIgOiBcIm5vXCJ9YCxcbiAgICBgY29udGV4dCBtZW51IGZyb20gcGVuOiAke3N1bW1hcnkuY29udGV4dE1lbnVGcm9tUGVuID8gXCJ5ZXNcIiA6IFwibm9cIn1gLFxuICBdLmpvaW4oXCJcXG5cIik7XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBCcmlkZ2VDaGVja1Jlc3VsdCB9IGZyb20gXCIuL3ZlcmRpY3RcIjtcbmltcG9ydCB7IHZlcmRpY3QgfSBmcm9tIFwiLi92ZXJkaWN0XCI7XG5pbXBvcnQgdHlwZSB7IFByb2JlRXZlbnQsIFByb2JlU3VtbWFyeSB9IGZyb20gXCIuL3Byb2JlU3VtbWFyeVwiO1xuaW1wb3J0IHsgc3VtbWFyaXplUHJvYmUgfSBmcm9tIFwiLi9wcm9iZVN1bW1hcnlcIjtcbmltcG9ydCB0eXBlIHsgUGVuQnJpZGdlU25hcHNob3QgfSBmcm9tIFwiLi4vcGVuYnJpZGdlL1BlbkJyaWRnZUNsaWVudFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlcG9ydFNldHRpbmdzIHtcbiAgYmFycmVsQnV0dG9uTWFzazogbnVtYmVyO1xuICBwcmltYXJ5Q29udGFjdE1vZGU6IHN0cmluZztcbiAgZXJhc2VyU3RyYXRlZ3k6IHN0cmluZztcbiAgZWZmZWN0aXZlRXJhc2VyU3RyYXRlZ3k6IHN0cmluZztcbiAgbGF0ZVdpbmRvd01zOiBudW1iZXI7XG4gIG1pZFN0cm9rZVByZXNzOiBzdHJpbmc7XG4gIHBlbkJyaWRnZUVuYWJsZWQ6IGJvb2xlYW47XG4gIHBlbkJyaWRnZVBvcnQ6IG51bWJlcjtcbiAgc3VwcHJlc3NIb3ZlckJ1dHRvbkV2ZW50czogYm9vbGVhbjtcbiAgYnV0dG9uQ29udGFjdEFjdGlvbjogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlcG9ydEVudmlyb25tZW50IHtcbiAgb2JzaWRpYW5WZXJzaW9uOiBzdHJpbmc7XG4gIGFuZHJvaWQ6IGJvb2xlYW47XG4gIHRhYmxldDogYm9vbGVhbjtcbiAgcGx1Z2luVmVyc2lvbjogc3RyaW5nO1xuICBjaHJvbWU6IHN0cmluZyB8IG51bGw7XG4gIHNjcmVlbjogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9O1xuICBzZXR0aW5nczogUmVwb3J0U2V0dGluZ3M7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVwb3J0RXhjYWxpZHJhdyB7XG4gIGluc3RhbGxlZDogYm9vbGVhbjtcbiAgZW5hYmxlZDogYm9vbGVhbjtcbiAgdmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgYXV0b21hdGU6IGJvb2xlYW47XG4gIGNhblJlYWRBY3RpdmVUb29sOiBib29sZWFuO1xuICBjYW5TZXRBY3RpdmVUb29sOiBib29sZWFuO1xuICBkZWxldGVWaWV3RWxlbWVudHM6IGJvb2xlYW47XG4gIG5ld0VsZW1lbnQ6IGJvb2xlYW4gfCBudWxsO1xuICB0ZW1wb3JhcnlFcmFzZXI6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEaWFnbm9zdGljc1JlcG9ydCB7XG4gIHJlcG9ydDogXCJleGNhbGlkcmF3LXN0eWx1cy1jb250cm9scy1kaWFnXCI7XG4gIHNjaGVtYTogMTtcbiAgdmVyZGljdDogc3RyaW5nO1xuICBlbnZpcm9ubWVudDogUmVwb3J0RW52aXJvbm1lbnQ7XG4gIGJyaWRnZUNoZWNrOiBCcmlkZ2VDaGVja1Jlc3VsdCB8IG51bGw7XG4gIGxpdmU6IFBlbkJyaWRnZVNuYXBzaG90IHwgbnVsbDtcbiAgYmFycmVsU291cmNlOiBzdHJpbmc7XG4gIHByb2JlOiB7IHN1bW1hcnk6IFByb2JlU3VtbWFyeTsgZXZlbnRzOiBQcm9iZUV2ZW50W10gfTtcbiAgZXhjYWxpZHJhdzogUmVwb3J0RXhjYWxpZHJhdztcbiAgbG9nOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXBvcnRJbnB1dCB7XG4gIGVudmlyb25tZW50OiBSZXBvcnRFbnZpcm9ubWVudDtcbiAgYnJpZGdlQ2hlY2s6IEJyaWRnZUNoZWNrUmVzdWx0IHwgbnVsbDtcbiAgbGl2ZTogUGVuQnJpZGdlU25hcHNob3QgfCBudWxsO1xuICBiYXJyZWxTb3VyY2U6IHN0cmluZztcbiAgcHJvYmVFdmVudHM6IEFycmF5PFByb2JlRXZlbnQgJiB7IHg/OiBudW1iZXI7IHk/OiBudW1iZXIgfT47XG4gIGV4Y2FsaWRyYXc6IFJlcG9ydEV4Y2FsaWRyYXc7XG4gIGxvZzogc3RyaW5nW107XG4gIHBhaXJpbmdDb2RlPzogc3RyaW5nO1xuICB2YXVsdE5hbWU/OiBzdHJpbmc7XG4gIG5vdGVQYXRoPzogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNEaWFnbm9zdGljQnVpbGQodmVyc2lvbjogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiB2ZXJzaW9uLmluY2x1ZGVzKFwiLWRpYWdcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjaHJvbWVWZXJzaW9uKHVzZXJBZ2VudDogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIHJldHVybiB1c2VyQWdlbnQubWF0Y2goL0Nocm9tZVxcLyhbXFxkLl0rKS91KT8uWzFdID8/IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFJlcG9ydChpbnB1dDogUmVwb3J0SW5wdXQpOiBEaWFnbm9zdGljc1JlcG9ydCB7XG4gIGNvbnN0IGV2ZW50cyA9IGlucHV0LnByb2JlRXZlbnRzLnNsaWNlKC01MCkubWFwKChldmVudCkgPT4gKHtcbiAgICB0OiBldmVudC50LFxuICAgIHR5cGU6IGV2ZW50LnR5cGUsXG4gICAgcG9pbnRlclR5cGU6IGV2ZW50LnBvaW50ZXJUeXBlLFxuICAgIGJ1dHRvbjogZXZlbnQuYnV0dG9uLFxuICAgIGJ1dHRvbnM6IGV2ZW50LmJ1dHRvbnMsXG4gICAgcHJlc3N1cmU6IGV2ZW50LnByZXNzdXJlLFxuICAgIHBoYXNlOiBldmVudC5waGFzZSxcbiAgfSkpO1xuICBjb25zdCBicmlkZ2VDaGVjayA9IGlucHV0LmJyaWRnZUNoZWNrO1xuICByZXR1cm4ge1xuICAgIHJlcG9ydDogXCJleGNhbGlkcmF3LXN0eWx1cy1jb250cm9scy1kaWFnXCIsXG4gICAgc2NoZW1hOiAxLFxuICAgIHZlcmRpY3Q6IGJyaWRnZUNoZWNrID8gdmVyZGljdChicmlkZ2VDaGVjaykgOiBcIkJyaWRnZSBoYXMgbm90IGJlZW4gY2hlY2tlZCBpbiB0aGlzIHNlc3Npb25cIixcbiAgICBlbnZpcm9ubWVudDogaW5wdXQuZW52aXJvbm1lbnQsXG4gICAgYnJpZGdlQ2hlY2ssXG4gICAgbGl2ZTogaW5wdXQubGl2ZSxcbiAgICBiYXJyZWxTb3VyY2U6IGlucHV0LmJhcnJlbFNvdXJjZSxcbiAgICBwcm9iZTogeyBzdW1tYXJ5OiBzdW1tYXJpemVQcm9iZShldmVudHMpLCBldmVudHMgfSxcbiAgICBleGNhbGlkcmF3OiBpbnB1dC5leGNhbGlkcmF3LFxuICAgIGxvZzogaW5wdXQubG9nLnNsaWNlKC0xMDApLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9KU09OKHJlcG9ydDogRGlhZ25vc3RpY3NSZXBvcnQpOiBzdHJpbmcge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocmVwb3J0LCBudWxsLCAyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvVGV4dChyZXBvcnQ6IERpYWdub3N0aWNzUmVwb3J0KTogc3RyaW5nIHtcbiAgY29uc3Qgc2V0dGluZ3MgPSByZXBvcnQuZW52aXJvbm1lbnQuc2V0dGluZ3M7XG4gIGNvbnN0IGxpbmVzID0gW1xuICAgIGBFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9scyAke3JlcG9ydC5lbnZpcm9ubWVudC5wbHVnaW5WZXJzaW9ufWAsXG4gICAgYE9ic2lkaWFuICR7cmVwb3J0LmVudmlyb25tZW50Lm9ic2lkaWFuVmVyc2lvbn0gXHUwMEI3IEFuZHJvaWQgJHtyZXBvcnQuZW52aXJvbm1lbnQuYW5kcm9pZCA/IFwieWVzXCIgOiBcIm5vXCJ9IFx1MDBCNyB0YWJsZXQgJHtyZXBvcnQuZW52aXJvbm1lbnQudGFibGV0ID8gXCJ5ZXNcIiA6IFwibm9cIn1gLFxuICAgIGBDaHJvbWUgJHtyZXBvcnQuZW52aXJvbm1lbnQuY2hyb21lID8/IFwidW5rbm93blwifSBcdTAwQjcgc2NyZWVuICR7cmVwb3J0LmVudmlyb25tZW50LnNjcmVlbi53aWR0aH1cdTAwRDcke3JlcG9ydC5lbnZpcm9ubWVudC5zY3JlZW4uaGVpZ2h0fWAsXG4gICAgYEV4Y2FsaWRyYXcgJHtyZXBvcnQuZXhjYWxpZHJhdy52ZXJzaW9uID8/IFwibm90IGluc3RhbGxlZFwifSBcdTAwQjcgdGVtcCBlcmFzZXI6ICR7cmVwb3J0LmV4Y2FsaWRyYXcudGVtcG9yYXJ5RXJhc2VyfWAsXG4gICAgYEJhcnJlbCBzb3VyY2U6ICR7cmVwb3J0LmJhcnJlbFNvdXJjZX1gLFxuICAgIGBCcmlkZ2UgZW5hYmxlZDogJHtzZXR0aW5ncy5wZW5CcmlkZ2VFbmFibGVkID8gXCJ5ZXNcIiA6IFwibm9cIn0gXHUwMEI3IHBvcnQgJHtzZXR0aW5ncy5wZW5CcmlkZ2VQb3J0fSBcdTAwQjcgbWFzayAke3NldHRpbmdzLmJhcnJlbEJ1dHRvbk1hc2t9IFx1MDBCNyAke3NldHRpbmdzLnByaW1hcnlDb250YWN0TW9kZX1gLFxuICAgIGBTdHJhdGVneSAke3JlcG9ydC5lbnZpcm9ubWVudC5zZXR0aW5ncy5lZmZlY3RpdmVFcmFzZXJTdHJhdGVneX0gXHUwMEI3IGxhdGUgd2luZG93ICR7c2V0dGluZ3MubGF0ZVdpbmRvd01zfSBtcyBcdTAwQjcgbWlkLXN0cm9rZSAke3NldHRpbmdzLm1pZFN0cm9rZVByZXNzfWAsXG4gICAgcmVwb3J0LnZlcmRpY3QsXG4gICAgXCJcIixcbiAgICBcImBgYGpzb25cIixcbiAgICB0b0pTT04ocmVwb3J0KSxcbiAgICBcImBgYFwiLFxuICBdO1xuICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEJyaWRnZVN0YXR1cyhzbmFwc2hvdDogUGVuQnJpZGdlU25hcHNob3QpOiBzdHJpbmcge1xuICBjb25zdCBzdGF0dXMgPSBzbmFwc2hvdC5zdGF0dXM7XG4gIGlmIChzdGF0dXMuc3RhdGUgPT09IFwib2ZmXCIpIHJldHVybiBcIm9mZlwiO1xuICBpZiAoc3RhdHVzLnN0YXRlID09PSBcImNvbm5lY3RpbmdcIikge1xuICAgIGNvbnN0IHJldHJ5ID0gc25hcHNob3QubmV4dFJldHJ5SW5NcyA9PT0gbnVsbCA/IFwiXCIgOiBgIFx1MDBCNyByZXRyeSBpbiAke3NuYXBzaG90Lm5leHRSZXRyeUluTXN9IG1zYDtcbiAgICByZXR1cm4gYGNvbm5lY3Rpbmcke3JldHJ5fWA7XG4gIH1cbiAgaWYgKHN0YXR1cy5zdGF0ZSA9PT0gXCJhdXRoZW50aWNhdGluZ1wiKSByZXR1cm4gXCJhdXRoZW50aWNhdGluZ1wiO1xuICBpZiAoc3RhdHVzLnN0YXRlID09PSBcImZhaWxlZFwiKSByZXR1cm4gYGZhaWxlZDogJHtzdGF0dXMucmVhc29uIHx8IHN0YXR1cy5jb2RlfWA7XG4gIGNvbnN0IHBlbiA9XG4gICAgc3RhdHVzLnNvdXJjZSA9PT0gXCJva1wiXG4gICAgICA/IGBwZW4gb2ske3N0YXR1cy5uYW1lID8gYCAoJHtzdGF0dXMubmFtZX0pYCA6IFwiXCJ9YFxuICAgICAgOiBgcGVuIHVuYXZhaWxhYmxlOiAke3N0YXR1cy5yZWFzb24gPz8gXCJ1bmtub3duXCJ9YDtcbiAgY29uc3QgbGF0ZW5jeSA9XG4gICAgc25hcHNob3QubGFzdEJ1dHRvbiA9PT0gbnVsbFxuICAgICAgPyBcIm5vIGJ1dHRvbiB5ZXRcIlxuICAgICAgOiBzbmFwc2hvdC5sYXN0QnV0dG9uLmxhdGVuY3lNcyA9PT0gbnVsbFxuICAgICAgICA/IFwicmVjZWl2ZS10aW1lIG9ubHlcIlxuICAgICAgICA6IGBsYXRlbmN5ICR7TWF0aC5yb3VuZChzbmFwc2hvdC5sYXN0QnV0dG9uLmxhdGVuY3lNcyl9IG1zYDtcbiAgY29uc3QgaGVhcnRiZWF0ID1cbiAgICBzbmFwc2hvdC5oZWFydGJlYXRBZ2VNcyA9PT0gbnVsbFxuICAgICAgPyBcIm5vIGhlYXJ0YmVhdCB5ZXRcIlxuICAgICAgOiBgaGVhcnRiZWF0ICR7c25hcHNob3QuaGVhcnRiZWF0QWdlTXN9IG1zYDtcbiAgY29uc3QgZmluZ2VycHJpbnQgPSBzbmFwc2hvdC5maW5nZXJwcmludCA/IGAgXHUwMEI3ICR7c25hcHNob3QuZmluZ2VycHJpbnR9YCA6IFwiXCI7XG4gIHJldHVybiBgcmVhZHkgXHUwMEI3ICR7cGVufSBcdTAwQjcgJHtsYXRlbmN5fSBcdTAwQjcgJHtoZWFydGJlYXR9JHtmaW5nZXJwcmludH1gO1xufVxuIiwgImltcG9ydCB0eXBlIHsgRXhjYWxpZHJhd0JyaWRnZSB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmNvbnN0IE1FTlVfTUFSR0lOX1BYID0gODtcbmNvbnN0IEZBTExCQUNLX01FTlVfU0laRSA9IHsgd2lkdGg6IDE3MiwgaGVpZ2h0OiAzMDAgfTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNsYW1wTWVudVBvc2l0aW9uKFxuICBwb2ludDogUG9pbnQsXG4gIHZpZXdwb3J0OiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH0sXG4gIG1lbnU6IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfVxuKTogUG9pbnQge1xuICByZXR1cm4ge1xuICAgIHg6IE1hdGgubWF4KE1FTlVfTUFSR0lOX1BYLCBNYXRoLm1pbihwb2ludC54LCB2aWV3cG9ydC53aWR0aCAtIG1lbnUud2lkdGggLSBNRU5VX01BUkdJTl9QWCkpLFxuICAgIHk6IE1hdGgubWF4KE1FTlVfTUFSR0lOX1BYLCBNYXRoLm1pbihwb2ludC55LCB2aWV3cG9ydC5oZWlnaHQgLSBtZW51LmhlaWdodCAtIE1FTlVfTUFSR0lOX1BYKSksXG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBTdHlsdXNNZW51IHtcbiAgcHJpdmF0ZSBlbGVtZW50OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIG91dHNpZGVMaXN0ZW5lcjogKChldmVudDogUG9pbnRlckV2ZW50KSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIG9wZW5HZW5lcmF0aW9uID0gMDtcblxuICBvcGVuKHBvaW50OiBQb2ludCwgYnJpZGdlOiBFeGNhbGlkcmF3QnJpZGdlKTogdm9pZCB7XG4gICAgdGhpcy5jbG9zZSgpO1xuICAgIGNvbnN0IGdlbmVyYXRpb24gPSB0aGlzLm9wZW5HZW5lcmF0aW9uO1xuICAgIGNvbnN0IG1lbnUgPSBkb2N1bWVudC5ib2R5LmNyZWF0ZURpdih7IGNsczogXCJleGNhbGlkcmF3LXN0eWx1cy1tZW51XCIgfSk7XG4gICAgY29uc3QgYWN0aW9uczogQXJyYXk8W3N0cmluZywgKCkgPT4gdm9pZF0+ID0gW1xuICAgICAgW1wiU2VsZWN0aW9uXCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwic2VsZWN0aW9uXCIpXSxcbiAgICAgIFtcIkZyZWUgZHJhd1wiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcImZyZWVkcmF3XCIpXSxcbiAgICAgIFtcIkVyYXNlclwiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcImVyYXNlclwiKV0sXG4gICAgICBbXCJSZWN0YW5nbGVcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJyZWN0YW5nbGVcIildLFxuICAgICAgW1wiQXJyb3dcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJhcnJvd1wiKV0sXG4gICAgICBbXCJDb3B5XCIsICgpID0+IGJyaWRnZS5jb3B5U2VsZWN0ZWRFbGVtZW50cygpXSxcbiAgICAgIFtcIlBhc3RlXCIsICgpID0+IGJyaWRnZS5wYXN0ZUF0KHBvaW50KV0sXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBjYWxsYmFja10gb2YgYWN0aW9ucykge1xuICAgICAgY29uc3QgYnV0dG9uID0gbWVudS5jcmVhdGVFbChcImJ1dHRvblwiLCB7XG4gICAgICAgIHRleHQ6IG5hbWUsXG4gICAgICAgIGNsczogXCJleGNhbGlkcmF3LXN0eWx1cy1tZW51X19pdGVtXCIsXG4gICAgICB9KTtcbiAgICAgIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcnVwXCIsIChldmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHRoaXMuZWxlbWVudCA9IG1lbnU7XG4gICAgY29uc3QgcG9zaXRpb24gPSBjbGFtcE1lbnVQb3NpdGlvbihcbiAgICAgIHBvaW50LFxuICAgICAgeyB3aWR0aDogd2luZG93LmlubmVyV2lkdGgsIGhlaWdodDogd2luZG93LmlubmVySGVpZ2h0IH0sXG4gICAgICB7XG4gICAgICAgIHdpZHRoOiBtZW51Lm9mZnNldFdpZHRoIHx8IEZBTExCQUNLX01FTlVfU0laRS53aWR0aCxcbiAgICAgICAgaGVpZ2h0OiBtZW51Lm9mZnNldEhlaWdodCB8fCBGQUxMQkFDS19NRU5VX1NJWkUuaGVpZ2h0LFxuICAgICAgfVxuICAgICk7XG4gICAgbWVudS5zZXRDc3NQcm9wcyh7IGxlZnQ6IGAke3Bvc2l0aW9uLnh9cHhgLCB0b3A6IGAke3Bvc2l0aW9uLnl9cHhgIH0pO1xuICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmIChnZW5lcmF0aW9uICE9PSB0aGlzLm9wZW5HZW5lcmF0aW9uIHx8ICF0aGlzLmVsZW1lbnQpIHJldHVybjtcbiAgICAgIHRoaXMub3V0c2lkZUxpc3RlbmVyID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIGlmICghdGhpcy5lbGVtZW50Py5jb250YWlucyhldmVudC50YXJnZXQgYXMgTm9kZSkpIHRoaXMuY2xvc2UoKTtcbiAgICAgIH07XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmRvd25cIiwgdGhpcy5vdXRzaWRlTGlzdGVuZXIsIHRydWUpO1xuICAgIH0sIDApO1xuICB9XG4gIGNsb3NlID0gKCk6IHZvaWQgPT4ge1xuICAgIHRoaXMub3BlbkdlbmVyYXRpb24gKz0gMTtcbiAgICBpZiAodGhpcy5vdXRzaWRlTGlzdGVuZXIpXG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwicG9pbnRlcmRvd25cIiwgdGhpcy5vdXRzaWRlTGlzdGVuZXIsIHRydWUpO1xuICAgIHRoaXMub3V0c2lkZUxpc3RlbmVyID0gbnVsbDtcbiAgICB0aGlzLmVsZW1lbnQ/LnJlbW92ZSgpO1xuICAgIHRoaXMuZWxlbWVudCA9IG51bGw7XG4gIH07XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBTY2hlZHVsZXIgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5pbXBvcnQge1xuICBDTE9TRSxcbiAgZmluZ2VycHJpbnQsXG4gIG5ld05vbmNlLFxuICBwYXJzZVNlcnZlckZyYW1lLFxuICBwcm9vZixcbiAgc2FmZUVxdWFsLFxuICB0eXBlIEJ1dHRvbkZyYW1lLFxuICB0eXBlIEhlbGxvRnJhbWUsXG4gIHR5cGUgUmVhZHlGcmFtZSxcbiAgdHlwZSBTb3VyY2VGcmFtZSxcbn0gZnJvbSBcIi4vcHJvdG9jb2xcIjtcblxuZXhwb3J0IHR5cGUgUGVuQnJpZGdlU3RhdHVzID1cbiAgfCB7IHN0YXRlOiBcIm9mZlwiIH1cbiAgfCB7IHN0YXRlOiBcImNvbm5lY3RpbmdcIiB9XG4gIHwgeyBzdGF0ZTogXCJhdXRoZW50aWNhdGluZ1wiIH1cbiAgfCB7XG4gICAgICBzdGF0ZTogXCJyZWFkeVwiO1xuICAgICAgc291cmNlOiBTb3VyY2VGcmFtZVtcInN0YXRlXCJdO1xuICAgICAgcmVhc29uPzogc3RyaW5nO1xuICAgICAgbmFtZT86IHN0cmluZztcbiAgICAgIG5vZGU/OiBzdHJpbmc7XG4gICAgICBmaW5nZXJwcmludDogc3RyaW5nO1xuICAgIH1cbiAgfCB7IHN0YXRlOiBcImZhaWxlZFwiOyBjb2RlOiBudW1iZXI7IHJlYXNvbjogc3RyaW5nIH07XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGVuQnV0dG9uU2lnbmFsIHtcbiAgZG93bjogYm9vbGVhbjtcbiAgc2VxOiBudW1iZXI7XG4gIHByZXNzZWRBdFBlcmY6IG51bWJlcjtcbiAgbGF0ZW5jeU1zOiBudW1iZXIgfCBudWxsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJyaWRnZVNvY2tldCB7XG4gIHJlYWR5U3RhdGU6IG51bWJlcjtcbiAgb25vcGVuOiAoKGV2ZW50OiBFdmVudCkgPT4gdm9pZCkgfCBudWxsO1xuICBvbm1lc3NhZ2U6ICgoZXZlbnQ6IHsgZGF0YTogdW5rbm93biB9KSA9PiB2b2lkKSB8IG51bGw7XG4gIG9uZXJyb3I6ICgoZXZlbnQ6IEV2ZW50KSA9PiB2b2lkKSB8IG51bGw7XG4gIG9uY2xvc2U6ICgoZXZlbnQ6IENsb3NlRXZlbnQpID0+IHZvaWQpIHwgbnVsbDtcbiAgc2VuZChkYXRhOiBzdHJpbmcpOiB2b2lkO1xuICBjbG9zZShjb2RlPzogbnVtYmVyLCByZWFzb24/OiBzdHJpbmcpOiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFZpc2liaWxpdHlTb3VyY2Uge1xuICBzdGF0ZSgpOiBcInZpc2libGVcIiB8IFwiaGlkZGVuXCI7XG4gIHN1YnNjcmliZShsaXN0ZW5lcjogKCkgPT4gdm9pZCk6ICgpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGVuQnJpZGdlU25hcHNob3Qge1xuICBzdGF0dXM6IFBlbkJyaWRnZVN0YXR1cztcbiAgaGVhcnRiZWF0QWdlTXM6IG51bWJlciB8IG51bGw7XG4gIHJlY29ubmVjdEF0dGVtcHRzOiBudW1iZXI7XG4gIG5leHRSZXRyeUluTXM6IG51bWJlciB8IG51bGw7XG4gIGxhc3RDbG9zZUNvZGU6IG51bWJlciB8IG51bGw7XG4gIGxhc3RDbG9zZVJlYXNvbjogc3RyaW5nO1xuICBsYXN0QnV0dG9uOiB7XG4gICAgZG93bjogYm9vbGVhbjtcbiAgICBzZXE6IG51bWJlcjtcbiAgICBsYXRlbmN5TXM6IG51bWJlciB8IG51bGw7XG4gICAgY2xvY2s6IFwiYnJpZGdlXCIgfCBcInJlY2VpdmVcIjtcbiAgfSB8IG51bGw7XG4gIGFwcFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIHByb3RvOiBudW1iZXIgfCBudWxsO1xuICBmaW5nZXJwcmludDogc3RyaW5nIHwgbnVsbDtcbiAgdXJsOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGVuQnJpZGdlQ2xpZW50T3B0aW9ucyB7XG4gIHVybDogc3RyaW5nO1xuICBzZWNyZXQ6ICgpID0+IFVpbnQ4QXJyYXkgfCBudWxsO1xuICBjbGllbnRWZXJzaW9uOiBzdHJpbmc7XG4gIHdzRmFjdG9yeT86ICh1cmw6IHN0cmluZykgPT4gQnJpZGdlU29ja2V0O1xuICBub3c/OiAoKSA9PiBudW1iZXI7XG4gIHBlcmZOb3c/OiAoKSA9PiBudW1iZXI7XG4gIHNjaGVkdWxlcj86IFNjaGVkdWxlcjtcbiAgcmFuZG9tPzogKCkgPT4gbnVtYmVyO1xuICBub25jZT86ICgpID0+IHN0cmluZztcbiAgdmlzaWJpbGl0eT86IFZpc2liaWxpdHlTb3VyY2U7XG4gIG9uU3RhdHVzOiAoc3RhdHVzOiBQZW5CcmlkZ2VTdGF0dXMpID0+IHZvaWQ7XG4gIG9uQnV0dG9uOiAoYnV0dG9uOiBQZW5CdXR0b25TaWduYWwpID0+IHZvaWQ7XG4gIG9uQ29tbWFuZD86IChhY3Rpb246IFwib3Blbi1tZW51XCIpID0+IHZvaWQ7XG4gIGRlYnVnPzogKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZDtcbn1cblxuY29uc3QgQkFDS09GRl9NUyA9IFsyNTAsIDUwMCwgMTAwMCwgMjAwMCwgNTAwMF07XG5jb25zdCBXQVRDSERPR19NUyA9IDMwMDA7XG5cbmZ1bmN0aW9uIGRlZmF1bHRWaXNpYmlsaXR5KCk6IFZpc2liaWxpdHlTb3VyY2Uge1xuICByZXR1cm4ge1xuICAgIHN0YXRlOiAoKSA9PiB7XG4gICAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gXCJ2aXNpYmxlXCI7XG4gICAgICByZXR1cm4gZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlID09PSBcImhpZGRlblwiID8gXCJoaWRkZW5cIiA6IFwidmlzaWJsZVwiO1xuICAgIH0sXG4gICAgc3Vic2NyaWJlOiAobGlzdGVuZXIpID0+IHtcbiAgICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09IFwidW5kZWZpbmVkXCIpIHJldHVybiAoKSA9PiB1bmRlZmluZWQ7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwidmlzaWJpbGl0eWNoYW5nZVwiLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gKCkgPT4gZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInZpc2liaWxpdHljaGFuZ2VcIiwgbGlzdGVuZXIpO1xuICAgIH0sXG4gIH07XG59XG5cbi8qKiBPbmUgcGx1Z2luLXdpZGUgY2xpZW50IGZvciB3czovLzEyNy4wLjAuMTo8cG9ydD4vdjEvcGVuLiAqL1xuZXhwb3J0IGNsYXNzIFBlbkJyaWRnZUNsaWVudCB7XG4gIHByaXZhdGUgdXJsOiBzdHJpbmc7XG4gIHByaXZhdGUgZGVtYW5kZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBmYWlsZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBkaXNwb3NlZCA9IGZhbHNlO1xuICBwcml2YXRlIHNvY2tldDogQnJpZGdlU29ja2V0IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY29ubmVjdGlvbiA9IDA7XG4gIHByaXZhdGUgbGV2ZWxEb3duID0gZmFsc2U7XG4gIHByaXZhdGUgbGFzdFNlcSA9IC0xO1xuICBwcml2YXRlIGF0dGVtcHQgPSAwO1xuICBwcml2YXRlIHJldHJ5VGltZXI6IHVua25vd24gfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSB3YXRjaGRvZzogdW5rbm93biB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGxhc3RGcmFtZUF0OiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByZWNvbm5lY3RBdHRlbXB0cyA9IDA7XG4gIHByaXZhdGUgbmV4dFJldHJ5QXQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGxhc3RDbG9zZUNvZGU6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGxhc3RDbG9zZVJlYXNvbiA9IFwiXCI7XG4gIHByaXZhdGUgc3RhdHVzOiBQZW5CcmlkZ2VTdGF0dXMgPSB7IHN0YXRlOiBcIm9mZlwiIH07XG4gIHByaXZhdGUgaGVsbG86IEhlbGxvRnJhbWUgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwZW5kaW5nTm9uY2U6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGZpbmdlcnByaW50VmFsdWU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGFwcFZlcnNpb246IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHByb3RvOiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBzb3VyY2VOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgc291cmNlTm9kZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIHNvdXJjZVJlYXNvbjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIHNvdXJjZVN0YXRlOiBTb3VyY2VGcmFtZVtcInN0YXRlXCJdIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbGFzdEJ1dHRvbjogUGVuQnJpZGdlU25hcHNob3RbXCJsYXN0QnV0dG9uXCJdID0gbnVsbDtcbiAgcHJpdmF0ZSByZWFkb25seSB1bmxpc3RlbjogKCkgPT4gdm9pZDtcbiAgcHJpdmF0ZSByZWFkb25seSBub3c6ICgpID0+IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBwZXJmTm93OiAoKSA9PiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgc2NoZWR1bGVyOiBTY2hlZHVsZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgcmFuZG9tOiAoKSA9PiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgbm9uY2U6ICgpID0+IHN0cmluZztcbiAgcHJpdmF0ZSByZWFkb25seSB2aXNpYmlsaXR5OiBWaXNpYmlsaXR5U291cmNlO1xuICBwcml2YXRlIHJlYWRvbmx5IHdzRmFjdG9yeTogKHVybDogc3RyaW5nKSA9PiBCcmlkZ2VTb2NrZXQ7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBvcHRzOiBQZW5CcmlkZ2VDbGllbnRPcHRpb25zKSB7XG4gICAgdGhpcy51cmwgPSBvcHRzLnVybDtcbiAgICB0aGlzLm5vdyA9IG9wdHMubm93ID8/ICgoKSA9PiBEYXRlLm5vdygpKTtcbiAgICB0aGlzLnBlcmZOb3cgPSBvcHRzLnBlcmZOb3cgPz8gKCgpID0+IHBlcmZvcm1hbmNlLm5vdygpKTtcbiAgICB0aGlzLnNjaGVkdWxlciA9IG9wdHMuc2NoZWR1bGVyID8/IHtcbiAgICAgIHNldFRpbWVvdXQ6IChjYWxsYmFjaywgZGVsYXlNcykgPT4gZ2xvYmFsVGhpcy5zZXRUaW1lb3V0KGNhbGxiYWNrLCBkZWxheU1zKSxcbiAgICAgIGNsZWFyVGltZW91dDogKGhhbmRsZSkgPT4gZ2xvYmFsVGhpcy5jbGVhclRpbWVvdXQoaGFuZGxlIGFzIFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+KSxcbiAgICB9O1xuICAgIHRoaXMucmFuZG9tID0gb3B0cy5yYW5kb20gPz8gKCgpID0+IE1hdGgucmFuZG9tKCkpO1xuICAgIHRoaXMubm9uY2UgPSBvcHRzLm5vbmNlID8/IG5ld05vbmNlO1xuICAgIHRoaXMudmlzaWJpbGl0eSA9IG9wdHMudmlzaWJpbGl0eSA/PyBkZWZhdWx0VmlzaWJpbGl0eSgpO1xuICAgIHRoaXMud3NGYWN0b3J5ID0gb3B0cy53c0ZhY3RvcnkgPz8gKCh1cmwpID0+IG5ldyBXZWJTb2NrZXQodXJsKSBhcyB1bmtub3duIGFzIEJyaWRnZVNvY2tldCk7XG4gICAgdGhpcy51bmxpc3RlbiA9IHRoaXMudmlzaWJpbGl0eS5zdWJzY3JpYmUoKCkgPT4gdGhpcy5vblZpc2liaWxpdHkoKSk7XG4gIH1cblxuICBzZXREZW1hbmQod2FudGVkOiBib29sZWFuKTogdm9pZCB7XG4gICAgdGhpcy5kZW1hbmRlZCA9IHdhbnRlZDtcbiAgICBpZiAoIXdhbnRlZCkge1xuICAgICAgdGhpcy5jbGVhclJldHJ5KCk7XG4gICAgICB0aGlzLmZvcmNlVXAoKTtcbiAgICAgIHRoaXMuY2xvc2VTb2NrZXQoQ0xPU0UuTk9STUFMLCBcImlkbGVcIik7XG4gICAgICBpZiAoIXRoaXMuZmFpbGVkKSB0aGlzLmVtaXRTdGF0dXMoeyBzdGF0ZTogXCJvZmZcIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmFpbGVkIHx8IHRoaXMuaGlkZGVuKCkgfHwgdGhpcy5zb2NrZXQpIHJldHVybjtcbiAgICB0aGlzLm9wZW4oKTtcbiAgfVxuXG4gIHJlY29ubmVjdE5vdygpOiB2b2lkIHtcbiAgICB0aGlzLmZhaWxlZCA9IGZhbHNlO1xuICAgIHRoaXMuYXR0ZW1wdCA9IDA7XG4gICAgdGhpcy5jbGVhclJldHJ5KCk7XG4gICAgdGhpcy5mb3JjZVVwKCk7XG4gICAgdGhpcy5jbG9zZVNvY2tldChDTE9TRS5OT1JNQUwsIFwicmVjb25uZWN0XCIpO1xuICAgIGlmICh0aGlzLmRlbWFuZGVkICYmICF0aGlzLmhpZGRlbigpKSB0aGlzLm9wZW4oKTtcbiAgfVxuXG4gIHNldFVybCh1cmw6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMudXJsID0gdXJsO1xuICB9XG5cbiAgaXNEb3duKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXR1cy5zdGF0ZSA9PT0gXCJyZWFkeVwiICYmIHRoaXMubGV2ZWxEb3duO1xuICB9XG5cbiAgaXNSZWFkeSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0dXMuc3RhdGUgPT09IFwicmVhZHlcIjtcbiAgfVxuXG4gIHNuYXBzaG90KCk6IFBlbkJyaWRnZVNuYXBzaG90IHtcbiAgICBjb25zdCBub3cgPSB0aGlzLm5vdygpO1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgaGVhcnRiZWF0QWdlTXM6XG4gICAgICAgIHRoaXMubGFzdEZyYW1lQXQgPT09IG51bGwgPyBudWxsIDogTWF0aC5tYXgoMCwgTWF0aC5yb3VuZChub3cgLSB0aGlzLmxhc3RGcmFtZUF0KSksXG4gICAgICByZWNvbm5lY3RBdHRlbXB0czogdGhpcy5yZWNvbm5lY3RBdHRlbXB0cyxcbiAgICAgIG5leHRSZXRyeUluTXM6XG4gICAgICAgIHRoaXMubmV4dFJldHJ5QXQgPT09IG51bGwgPyBudWxsIDogTWF0aC5tYXgoMCwgTWF0aC5yb3VuZCh0aGlzLm5leHRSZXRyeUF0IC0gbm93KSksXG4gICAgICBsYXN0Q2xvc2VDb2RlOiB0aGlzLmxhc3RDbG9zZUNvZGUsXG4gICAgICBsYXN0Q2xvc2VSZWFzb246IHRoaXMubGFzdENsb3NlUmVhc29uLFxuICAgICAgbGFzdEJ1dHRvbjogdGhpcy5sYXN0QnV0dG9uLFxuICAgICAgYXBwVmVyc2lvbjogdGhpcy5hcHBWZXJzaW9uLFxuICAgICAgcHJvdG86IHRoaXMucHJvdG8sXG4gICAgICBmaW5nZXJwcmludDogdGhpcy5maW5nZXJwcmludFZhbHVlLFxuICAgICAgdXJsOiB0aGlzLnVybCxcbiAgICB9O1xuICB9XG5cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmRpc3Bvc2VkID0gdHJ1ZTtcbiAgICB0aGlzLmRlbWFuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5jbGVhclJldHJ5KCk7XG4gICAgdGhpcy5mb3JjZVVwKCk7XG4gICAgdGhpcy5jbG9zZVNvY2tldChDTE9TRS5OT1JNQUwsIFwiZGlzcG9zZVwiKTtcbiAgICB0aGlzLnVubGlzdGVuKCk7XG4gIH1cblxuICBwcml2YXRlIGhpZGRlbigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy52aXNpYmlsaXR5LnN0YXRlKCkgPT09IFwiaGlkZGVuXCI7XG4gIH1cblxuICBwcml2YXRlIG9uVmlzaWJpbGl0eSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oaWRkZW4oKSkge1xuICAgICAgdGhpcy5jbGVhclJldHJ5KCk7XG4gICAgICB0aGlzLmZvcmNlVXAoKTtcbiAgICAgIHRoaXMuY2xvc2VTb2NrZXQoQ0xPU0UuTk9STUFMLCBcImhpZGRlblwiKTtcbiAgICAgIGlmICghdGhpcy5mYWlsZWQpIHRoaXMuZW1pdFN0YXR1cyh7IHN0YXRlOiBcIm9mZlwiIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZGVtYW5kZWQgfHwgdGhpcy5mYWlsZWQgfHwgdGhpcy5zb2NrZXQpIHJldHVybjtcbiAgICB0aGlzLmF0dGVtcHQgPSAwO1xuICAgIHRoaXMuY2xlYXJSZXRyeSgpO1xuICAgIHRoaXMub3BlbigpO1xuICB9XG5cbiAgcHJpdmF0ZSBvcGVuKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnNvY2tldCB8fCB0aGlzLmRpc3Bvc2VkIHx8ICF0aGlzLmRlbWFuZGVkIHx8IHRoaXMuZmFpbGVkIHx8IHRoaXMuaGlkZGVuKCkpIHJldHVybjtcbiAgICBjb25zdCBjb25uZWN0aW9uID0gKyt0aGlzLmNvbm5lY3Rpb247XG4gICAgdGhpcy5oZWxsbyA9IG51bGw7XG4gICAgdGhpcy5wZW5kaW5nTm9uY2UgPSBudWxsO1xuICAgIHRoaXMuZW1pdFN0YXR1cyh7IHN0YXRlOiBcImNvbm5lY3RpbmdcIiB9KTtcbiAgICBsZXQgc29ja2V0OiBCcmlkZ2VTb2NrZXQ7XG4gICAgdHJ5IHtcbiAgICAgIHNvY2tldCA9IHRoaXMud3NGYWN0b3J5KHRoaXMudXJsKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5vcHRzLmRlYnVnPy4oXG4gICAgICAgIGBicmlkZ2U6IHNvY2tldCBmYWlsZWQgJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiZXJyb3JcIn1gXG4gICAgICApO1xuICAgICAgdGhpcy5zY2hlZHVsZVJldHJ5KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xuICAgIHNvY2tldC5vbm9wZW4gPSAoKSA9PiB7XG4gICAgICBpZiAoY29ubmVjdGlvbiAhPT0gdGhpcy5jb25uZWN0aW9uKSByZXR1cm47XG4gICAgICB0aGlzLmFybVdhdGNoZG9nKGNvbm5lY3Rpb24pO1xuICAgIH07XG4gICAgc29ja2V0Lm9ubWVzc2FnZSA9IChldmVudCkgPT4ge1xuICAgICAgaWYgKGNvbm5lY3Rpb24gIT09IHRoaXMuY29ubmVjdGlvbikgcmV0dXJuO1xuICAgICAgdm9pZCB0aGlzLm9uTWVzc2FnZShjb25uZWN0aW9uLCBldmVudC5kYXRhKTtcbiAgICB9O1xuICAgIHNvY2tldC5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgaWYgKGNvbm5lY3Rpb24gIT09IHRoaXMuY29ubmVjdGlvbikgcmV0dXJuO1xuICAgICAgdGhpcy5vcHRzLmRlYnVnPy4oXCJicmlkZ2U6IGVycm9yIGV2ZW50XCIpO1xuICAgIH07XG4gICAgc29ja2V0Lm9uY2xvc2UgPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmIChjb25uZWN0aW9uICE9PSB0aGlzLmNvbm5lY3Rpb24pIHJldHVybjtcbiAgICAgIHRoaXMuc29ja2V0ID0gbnVsbDtcbiAgICAgIHRoaXMuY2xlYXJXYXRjaGRvZygpO1xuICAgICAgdGhpcy5oYW5kbGVDbG9zZShldmVudC5jb2RlLCBldmVudC5yZWFzb24pO1xuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG9uTWVzc2FnZShjb25uZWN0aW9uOiBudW1iZXIsIGRhdGE6IHVua25vd24pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoY29ubmVjdGlvbiAhPT0gdGhpcy5jb25uZWN0aW9uKSByZXR1cm47XG4gICAgdGhpcy5hcm1XYXRjaGRvZyhjb25uZWN0aW9uKTtcbiAgICBpZiAodHlwZW9mIGRhdGEgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHRoaXMub3B0cy5kZWJ1Zz8uKFwiYnJpZGdlOiBpZ25vcmVkIG5vbi10ZXh0IGZyYW1lXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmcmFtZSA9IHBhcnNlU2VydmVyRnJhbWUoZGF0YSk7XG4gICAgaWYgKCFmcmFtZSkge1xuICAgICAgdGhpcy5vcHRzLmRlYnVnPy4oXCJicmlkZ2U6IGlnbm9yZWQgbWFsZm9ybWVkIGZyYW1lXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZnJhbWUudHlwZSA9PT0gXCJ1bmtub3duXCIpIHJldHVybjtcbiAgICBpZiAoZnJhbWUudHlwZSA9PT0gXCJoZWxsb1wiKSB7XG4gICAgICBhd2FpdCB0aGlzLm9uSGVsbG8oY29ubmVjdGlvbiwgZnJhbWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZnJhbWUudHlwZSA9PT0gXCJyZWFkeVwiKSB7XG4gICAgICBhd2FpdCB0aGlzLm9uUmVhZHkoY29ubmVjdGlvbiwgZnJhbWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdGF0dXMuc3RhdGUgIT09IFwicmVhZHlcIikgcmV0dXJuO1xuICAgIGlmIChmcmFtZS50eXBlID09PSBcImJ1dHRvblwiKSB0aGlzLm9uQnV0dG9uRnJhbWUoZnJhbWUpO1xuICAgIGVsc2UgaWYgKGZyYW1lLnR5cGUgPT09IFwicGluZ1wiKSB0aGlzLm9uUGluZyhmcmFtZS5zZXEsIGZyYW1lLmRvd24sIGZyYW1lLnNlbnQpO1xuICAgIGVsc2UgaWYgKGZyYW1lLnR5cGUgPT09IFwic291cmNlXCIpIHRoaXMub25Tb3VyY2UoZnJhbWUpO1xuICAgIGVsc2UgaWYgKGZyYW1lLnR5cGUgPT09IFwiY29tbWFuZFwiICYmIGZyYW1lLmFjdGlvbiA9PT0gXCJvcGVuLW1lbnVcIilcbiAgICAgIHRoaXMub3B0cy5vbkNvbW1hbmQ/LihcIm9wZW4tbWVudVwiKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgb25IZWxsbyhjb25uZWN0aW9uOiBudW1iZXIsIGZyYW1lOiBIZWxsb0ZyYW1lKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGNvbm5lY3Rpb24gIT09IHRoaXMuY29ubmVjdGlvbikgcmV0dXJuO1xuICAgIHRoaXMuaGVsbG8gPSBmcmFtZTtcbiAgICB0aGlzLnByb3RvID0gZnJhbWUucHJvdG87XG4gICAgdGhpcy5hcHBWZXJzaW9uID0gZnJhbWUuYXBwVmVyc2lvbjtcbiAgICB0aGlzLm9wdHMuZGVidWc/LihgYnJpZGdlOiBoZWxsbyBwcm90bz0ke2ZyYW1lLnByb3RvfSBhcHA9JHtmcmFtZS5hcHBWZXJzaW9ufWApO1xuICAgIGlmIChmcmFtZS5wcm90byAhPT0gMSkge1xuICAgICAgdGhpcy5mYWlsKENMT1NFLlBST1RPQ09MLCBcInByb3RvY29sIGVycm9yXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBzZWNyZXQgPSB0aGlzLm9wdHMuc2VjcmV0KCk7XG4gICAgaWYgKCFzZWNyZXQpIHtcbiAgICAgIHRoaXMuZmFpbChDTE9TRS5BVVRILCBcIndyb25nIHBhaXJpbmcgY29kZVwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgY2xpZW50Tm9uY2UgPSB0aGlzLm5vbmNlKCk7XG4gICAgdGhpcy5wZW5kaW5nTm9uY2UgPSBjbGllbnROb25jZTtcbiAgICBjb25zdCBbY2xpZW50UHJvb2YsIGZpbmdlcl0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICBwcm9vZihzZWNyZXQsIGZyYW1lLm5vbmNlLCBjbGllbnROb25jZSwgXCJjbGllbnRcIiksXG4gICAgICBmaW5nZXJwcmludChzZWNyZXQpLFxuICAgIF0pO1xuICAgIGlmIChjb25uZWN0aW9uICE9PSB0aGlzLmNvbm5lY3Rpb24pIHJldHVybjtcbiAgICB0aGlzLmZpbmdlcnByaW50VmFsdWUgPSBmaW5nZXI7XG4gICAgdGhpcy5lbWl0U3RhdHVzKHsgc3RhdGU6IFwiYXV0aGVudGljYXRpbmdcIiB9KTtcbiAgICB0aGlzLnNvY2tldD8uc2VuZChcbiAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgdHlwZTogXCJhdXRoXCIsXG4gICAgICAgIHByb3RvOiAxLFxuICAgICAgICBjbGllbnQ6IFwiZXhjYWxpZHJhdy1zdHlsdXMtY29udHJvbHNcIixcbiAgICAgICAgY2xpZW50VmVyc2lvbjogdGhpcy5vcHRzLmNsaWVudFZlcnNpb24sXG4gICAgICAgIGNsaWVudE5vbmNlLFxuICAgICAgICBwcm9vZjogY2xpZW50UHJvb2YsXG4gICAgICB9KVxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG9uUmVhZHkoY29ubmVjdGlvbjogbnVtYmVyLCBmcmFtZTogUmVhZHlGcmFtZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmIChjb25uZWN0aW9uICE9PSB0aGlzLmNvbm5lY3Rpb24gfHwgIXRoaXMuaGVsbG8gfHwgIXRoaXMucGVuZGluZ05vbmNlKSByZXR1cm47XG4gICAgY29uc3Qgc2VjcmV0ID0gdGhpcy5vcHRzLnNlY3JldCgpO1xuICAgIGlmICghc2VjcmV0KSB7XG4gICAgICB0aGlzLmZhaWwoQ0xPU0UuQVVUSCwgXCJ3cm9uZyBwYWlyaW5nIGNvZGVcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGV4cGVjdGVkID0gYXdhaXQgcHJvb2Yoc2VjcmV0LCB0aGlzLmhlbGxvLm5vbmNlLCB0aGlzLnBlbmRpbmdOb25jZSwgXCJzZXJ2ZXJcIik7XG4gICAgaWYgKGNvbm5lY3Rpb24gIT09IHRoaXMuY29ubmVjdGlvbikgcmV0dXJuO1xuICAgIGlmICghc2FmZUVxdWFsKGV4cGVjdGVkLCBmcmFtZS5zZXJ2ZXJQcm9vZikpIHtcbiAgICAgIHRoaXMub3B0cy5kZWJ1Zz8uKFwiYnJpZGdlOiBiYWQgc2VydmVyIHByb29mXCIpO1xuICAgICAgdGhpcy5mYWlsKENMT1NFLkFVVEgsIFwid3JvbmcgcGFpcmluZyBjb2RlXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmF0dGVtcHQgPSAwO1xuICAgIHRoaXMucmVjb25uZWN0QXR0ZW1wdHMgPSAwO1xuICAgIHRoaXMubmV4dFJldHJ5QXQgPSBudWxsO1xuICAgIHRoaXMuc291cmNlU3RhdGUgPSBmcmFtZS5zb3VyY2Uuc3RhdGU7XG4gICAgdGhpcy5zb3VyY2VSZWFzb24gPSBmcmFtZS5zb3VyY2UucmVhc29uO1xuICAgIHRoaXMuc291cmNlTmFtZSA9IGZyYW1lLnNvdXJjZS5uYW1lO1xuICAgIHRoaXMuc291cmNlTm9kZSA9IGZyYW1lLnNvdXJjZS5ub2RlO1xuICAgIHRoaXMub3B0cy5kZWJ1Zz8uKGBicmlkZ2U6IHJlYWR5IHNvdXJjZT0ke2ZyYW1lLnNvdXJjZS5zdGF0ZX1gKTtcbiAgICB0aGlzLmVtaXRTdGF0dXMoe1xuICAgICAgc3RhdGU6IFwicmVhZHlcIixcbiAgICAgIHNvdXJjZTogZnJhbWUuc291cmNlLnN0YXRlLFxuICAgICAgcmVhc29uOiBmcmFtZS5zb3VyY2UucmVhc29uLFxuICAgICAgbmFtZTogZnJhbWUuc291cmNlLm5hbWUsXG4gICAgICBub2RlOiBmcmFtZS5zb3VyY2Uubm9kZSxcbiAgICAgIGZpbmdlcnByaW50OiB0aGlzLmZpbmdlcnByaW50VmFsdWUgPz8gXCJcIixcbiAgICB9KTtcbiAgICB0aGlzLmFwcGx5TGV2ZWwoZnJhbWUuYnV0dG9uLmRvd24sIGZyYW1lLmJ1dHRvbi5zZXEsIGZyYW1lLmJ1dHRvbi50LCB0cnVlKTtcbiAgICBpZiAoZnJhbWUuc291cmNlLnN0YXRlID09PSBcInVuYXZhaWxhYmxlXCIpIHRoaXMuZm9yY2VVcCgpO1xuICB9XG5cbiAgcHJpdmF0ZSBvbkJ1dHRvbkZyYW1lKGZyYW1lOiBCdXR0b25GcmFtZSk6IHZvaWQge1xuICAgIGlmIChmcmFtZS5zZXEgPD0gdGhpcy5sYXN0U2VxKSByZXR1cm47XG4gICAgdGhpcy5hcHBseUxldmVsKGZyYW1lLmRvd24sIGZyYW1lLnNlcSwgZnJhbWUudCwgdHJ1ZSk7XG4gIH1cblxuICBwcml2YXRlIG9uUGluZyhzZXE6IG51bWJlciwgZG93bjogYm9vbGVhbiwgc2VudDogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5zb2NrZXQ/LnNlbmQoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiBcInBvbmdcIiwgc2VudCB9KSk7XG4gICAgaWYgKHNlcSA+IHRoaXMubGFzdFNlcSkgdGhpcy5sYXN0U2VxID0gc2VxO1xuICAgIGlmIChkb3duICE9PSB0aGlzLmxldmVsRG93bikgdGhpcy5hcHBseUxldmVsKGRvd24sIHNlcSwgbnVsbCwgZmFsc2UpO1xuICB9XG5cbiAgcHJpdmF0ZSBvblNvdXJjZShmcmFtZTogU291cmNlRnJhbWUpOiB2b2lkIHtcbiAgICB0aGlzLnNvdXJjZVN0YXRlID0gZnJhbWUuc3RhdGU7XG4gICAgdGhpcy5zb3VyY2VSZWFzb24gPSBmcmFtZS5yZWFzb247XG4gICAgdGhpcy5zb3VyY2VOYW1lID0gZnJhbWUubmFtZTtcbiAgICB0aGlzLnNvdXJjZU5vZGUgPSBmcmFtZS5ub2RlO1xuICAgIGlmICh0aGlzLnN0YXR1cy5zdGF0ZSA9PT0gXCJyZWFkeVwiKSB7XG4gICAgICB0aGlzLmVtaXRTdGF0dXMoe1xuICAgICAgICBzdGF0ZTogXCJyZWFkeVwiLFxuICAgICAgICBzb3VyY2U6IGZyYW1lLnN0YXRlLFxuICAgICAgICByZWFzb246IGZyYW1lLnJlYXNvbixcbiAgICAgICAgbmFtZTogZnJhbWUubmFtZSxcbiAgICAgICAgbm9kZTogZnJhbWUubm9kZSxcbiAgICAgICAgZmluZ2VycHJpbnQ6IHRoaXMuZmluZ2VycHJpbnRWYWx1ZSA/PyBcIlwiLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChmcmFtZS5zdGF0ZSA9PT0gXCJ1bmF2YWlsYWJsZVwiKSB0aGlzLmZvcmNlVXAoKTtcbiAgICB0aGlzLm9wdHMuZGVidWc/LihgYnJpZGdlOiBzb3VyY2UgJHtmcmFtZS5zdGF0ZX0ke2ZyYW1lLnJlYXNvbiA/IGAgJHtmcmFtZS5yZWFzb259YCA6IFwiXCJ9YCk7XG4gIH1cblxuICBwcml2YXRlIGFwcGx5TGV2ZWwoXG4gICAgZG93bjogYm9vbGVhbixcbiAgICBzZXE6IG51bWJlcixcbiAgICBrZXJuZWxUaW1lOiBudW1iZXIgfCBudWxsLFxuICAgIGZyb21CdXR0b246IGJvb2xlYW5cbiAgKTogdm9pZCB7XG4gICAgaWYgKGZyb21CdXR0b24gJiYgc2VxIDw9IHRoaXMubGFzdFNlcSkgcmV0dXJuO1xuICAgIGlmIChmcm9tQnV0dG9uKSB0aGlzLmxhc3RTZXEgPSBzZXE7XG4gICAgY29uc3Qgbm93ID0gdGhpcy5ub3coKTtcbiAgICBjb25zdCBwZXJmID0gdGhpcy5wZXJmTm93KCk7XG4gICAgY29uc3QgcmVsaWFibGUgPSBrZXJuZWxUaW1lICE9PSBudWxsICYmIE1hdGguYWJzKG5vdyAtIGtlcm5lbFRpbWUpIDw9IDEwMDA7XG4gICAgY29uc3Qgc2lnbmFsOiBQZW5CdXR0b25TaWduYWwgPSB7XG4gICAgICBkb3duLFxuICAgICAgc2VxLFxuICAgICAgcHJlc3NlZEF0UGVyZjogcmVsaWFibGUgJiYga2VybmVsVGltZSAhPT0gbnVsbCA/IHBlcmYgLSAobm93IC0ga2VybmVsVGltZSkgOiBwZXJmLFxuICAgICAgbGF0ZW5jeU1zOiByZWxpYWJsZSAmJiBrZXJuZWxUaW1lICE9PSBudWxsID8gbm93IC0ga2VybmVsVGltZSA6IG51bGwsXG4gICAgfTtcbiAgICB0aGlzLmxldmVsRG93biA9IGRvd247XG4gICAgdGhpcy5sYXN0QnV0dG9uID0ge1xuICAgICAgZG93bixcbiAgICAgIHNlcSxcbiAgICAgIGxhdGVuY3lNczogc2lnbmFsLmxhdGVuY3lNcyxcbiAgICAgIGNsb2NrOiBzaWduYWwubGF0ZW5jeU1zID09PSBudWxsID8gXCJyZWNlaXZlXCIgOiBcImJyaWRnZVwiLFxuICAgIH07XG4gICAgdGhpcy5vcHRzLm9uQnV0dG9uKHNpZ25hbCk7XG4gIH1cblxuICBwcml2YXRlIGZvcmNlVXAoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmxldmVsRG93bikgcmV0dXJuO1xuICAgIHRoaXMubGV2ZWxEb3duID0gZmFsc2U7XG4gICAgY29uc3Qgc2lnbmFsOiBQZW5CdXR0b25TaWduYWwgPSB7XG4gICAgICBkb3duOiBmYWxzZSxcbiAgICAgIHNlcTogdGhpcy5sYXN0U2VxLFxuICAgICAgcHJlc3NlZEF0UGVyZjogdGhpcy5wZXJmTm93KCksXG4gICAgICBsYXRlbmN5TXM6IG51bGwsXG4gICAgfTtcbiAgICB0aGlzLmxhc3RCdXR0b24gPSB7IGRvd246IGZhbHNlLCBzZXE6IHRoaXMubGFzdFNlcSwgbGF0ZW5jeU1zOiBudWxsLCBjbG9jazogXCJyZWNlaXZlXCIgfTtcbiAgICB0aGlzLm9wdHMub25CdXR0b24oc2lnbmFsKTtcbiAgfVxuXG4gIHByaXZhdGUgYXJtV2F0Y2hkb2coY29ubmVjdGlvbjogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5sYXN0RnJhbWVBdCA9IHRoaXMubm93KCk7XG4gICAgdGhpcy5jbGVhcldhdGNoZG9nKCk7XG4gICAgdGhpcy53YXRjaGRvZyA9IHRoaXMuc2NoZWR1bGVyLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKGNvbm5lY3Rpb24gIT09IHRoaXMuY29ubmVjdGlvbikgcmV0dXJuO1xuICAgICAgdGhpcy5vcHRzLmRlYnVnPy4oXCJicmlkZ2U6IHdhdGNoZG9nIHRpbWVvdXRcIik7XG4gICAgICB0aGlzLmZvcmNlVXAoKTtcbiAgICAgIHRoaXMuY2xvc2VTb2NrZXQoQ0xPU0UuTk9STUFMLCBcIndhdGNoZG9nXCIpO1xuICAgICAgaWYgKHRoaXMuZGVtYW5kZWQgJiYgIXRoaXMuZmFpbGVkKSB0aGlzLmVtaXRTdGF0dXMoeyBzdGF0ZTogXCJjb25uZWN0aW5nXCIgfSk7XG4gICAgICB0aGlzLnNjaGVkdWxlUmV0cnkoKTtcbiAgICB9LCBXQVRDSERPR19NUyk7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZUNsb3NlKGNvZGU6IG51bWJlciwgcmVhc29uOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmxhc3RDbG9zZUNvZGUgPSBjb2RlO1xuICAgIHRoaXMubGFzdENsb3NlUmVhc29uID0gcmVhc29uO1xuICAgIHRoaXMuY2xlYXJXYXRjaGRvZygpO1xuICAgIHRoaXMuaGVsbG8gPSBudWxsO1xuICAgIHRoaXMuZm9yY2VVcCgpO1xuICAgIGlmIChjb2RlID09PSBDTE9TRS5QUk9UT0NPTCB8fCBjb2RlID09PSBDTE9TRS5BVVRIKSB7XG4gICAgICB0aGlzLmZhaWxlZCA9IHRydWU7XG4gICAgICB0aGlzLmNsZWFyUmV0cnkoKTtcbiAgICAgIHRoaXMuZW1pdFN0YXR1cyh7XG4gICAgICAgIHN0YXRlOiBcImZhaWxlZFwiLFxuICAgICAgICBjb2RlLFxuICAgICAgICByZWFzb246IGNvZGUgPT09IENMT1NFLkFVVEggPyBcIndyb25nIHBhaXJpbmcgY29kZVwiIDogcmVhc29uIHx8IFwicHJvdG9jb2wgZXJyb3JcIixcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZGVtYW5kZWQgfHwgdGhpcy5kaXNwb3NlZCB8fCB0aGlzLmhpZGRlbigpKSB7XG4gICAgICBpZiAoIXRoaXMuZmFpbGVkKSB0aGlzLmVtaXRTdGF0dXMoeyBzdGF0ZTogXCJvZmZcIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5lbWl0U3RhdHVzKHsgc3RhdGU6IFwiY29ubmVjdGluZ1wiIH0pO1xuICAgIHRoaXMuc2NoZWR1bGVSZXRyeSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBmYWlsKGNvZGU6IG51bWJlciwgcmVhc29uOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmZhaWxlZCA9IHRydWU7XG4gICAgdGhpcy5mb3JjZVVwKCk7XG4gICAgdGhpcy5jbGVhclJldHJ5KCk7XG4gICAgdGhpcy5sYXN0Q2xvc2VDb2RlID0gY29kZTtcbiAgICB0aGlzLmxhc3RDbG9zZVJlYXNvbiA9IHJlYXNvbjtcbiAgICB0aGlzLmNsb3NlU29ja2V0KGNvZGUsIHJlYXNvbik7XG4gICAgdGhpcy5lbWl0U3RhdHVzKHsgc3RhdGU6IFwiZmFpbGVkXCIsIGNvZGUsIHJlYXNvbiB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2NoZWR1bGVSZXRyeSgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuZGVtYW5kZWQgfHwgdGhpcy5mYWlsZWQgfHwgdGhpcy5kaXNwb3NlZCB8fCB0aGlzLmhpZGRlbigpKSByZXR1cm47XG4gICAgdGhpcy5jbGVhclJldHJ5KCk7XG4gICAgY29uc3QgYmFzZSA9IEJBQ0tPRkZfTVNbTWF0aC5taW4odGhpcy5hdHRlbXB0LCBCQUNLT0ZGX01TLmxlbmd0aCAtIDEpXSA/PyA1MDAwO1xuICAgIHRoaXMuYXR0ZW1wdCArPSAxO1xuICAgIHRoaXMucmVjb25uZWN0QXR0ZW1wdHMgKz0gMTtcbiAgICBjb25zdCBqaXR0ZXIgPSAodGhpcy5yYW5kb20oKSAqIDIgLSAxKSAqIDAuMjtcbiAgICBjb25zdCBkZWxheSA9IE1hdGgubWF4KDAsIE1hdGgucm91bmQoYmFzZSAqICgxICsgaml0dGVyKSkpO1xuICAgIHRoaXMubmV4dFJldHJ5QXQgPSB0aGlzLm5vdygpICsgZGVsYXk7XG4gICAgdGhpcy5vcHRzLmRlYnVnPy4oYGJyaWRnZTogcmV0cnkgaW4gJHtkZWxheX0gbXNgKTtcbiAgICB0aGlzLnJldHJ5VGltZXIgPSB0aGlzLnNjaGVkdWxlci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMucmV0cnlUaW1lciA9IG51bGw7XG4gICAgICB0aGlzLm5leHRSZXRyeUF0ID0gbnVsbDtcbiAgICAgIHRoaXMub3BlbigpO1xuICAgIH0sIGRlbGF5KTtcbiAgfVxuXG4gIHByaXZhdGUgY2xvc2VTb2NrZXQoY29kZTogbnVtYmVyLCByZWFzb246IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IHNvY2tldCA9IHRoaXMuc29ja2V0O1xuICAgIGlmICghc29ja2V0KSByZXR1cm47XG4gICAgdGhpcy5jb25uZWN0aW9uICs9IDE7XG4gICAgdGhpcy5zb2NrZXQgPSBudWxsO1xuICAgIHRoaXMuY2xlYXJXYXRjaGRvZygpO1xuICAgIHRoaXMuaGVsbG8gPSBudWxsO1xuICAgIHRyeSB7XG4gICAgICBzb2NrZXQuY2xvc2UoY29kZSwgcmVhc29uKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHRoaXMub3B0cy5kZWJ1Zz8uKFwiYnJpZGdlOiBjbG9zZSBmYWlsZWRcIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjbGVhclJldHJ5KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnJldHJ5VGltZXIgIT09IG51bGwpIHRoaXMuc2NoZWR1bGVyLmNsZWFyVGltZW91dCh0aGlzLnJldHJ5VGltZXIpO1xuICAgIHRoaXMucmV0cnlUaW1lciA9IG51bGw7XG4gICAgdGhpcy5uZXh0UmV0cnlBdCA9IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGNsZWFyV2F0Y2hkb2coKTogdm9pZCB7XG4gICAgaWYgKHRoaXMud2F0Y2hkb2cgIT09IG51bGwpIHRoaXMuc2NoZWR1bGVyLmNsZWFyVGltZW91dCh0aGlzLndhdGNoZG9nKTtcbiAgICB0aGlzLndhdGNoZG9nID0gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZW1pdFN0YXR1cyhzdGF0dXM6IFBlbkJyaWRnZVN0YXR1cyk6IHZvaWQge1xuICAgIHRoaXMuc3RhdHVzID0gc3RhdHVzO1xuICAgIHRoaXMub3B0cy5vblN0YXR1cyhzdGF0dXMpO1xuICB9XG59XG4iLCAiY29uc3QgU1RPUkFHRV9LRVkgPSBcImV4Y2FsaWRyYXctc3R5bHVzLWNvbnRyb2xzOnBhaXJpbmdcIjtcblxuZXhwb3J0IGludGVyZmFjZSBQYWlyaW5nQXBwIHtcbiAgdmF1bHQ6IHsgZ2V0TmFtZSgpOiBzdHJpbmcgfTtcbiAgc2F2ZUxvY2FsU3RvcmFnZT86IChrZXk6IHN0cmluZywgdmFsdWU6IHN0cmluZyB8IG51bGwpID0+IHZvaWQ7XG4gIGxvYWRMb2NhbFN0b3JhZ2U/OiAoa2V5OiBzdHJpbmcpID0+IHVua25vd247XG59XG5cbi8qKiBQYWlyaW5nIGNvZGUgc3RheXMgb3V0IG9mIGRhdGEuanNvbiBzbyB2YXVsdCBzeW5jIGNhbm5vdCBjb3B5IGl0LiAqL1xuZXhwb3J0IGNsYXNzIFBhaXJpbmdTdG9yZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgYXBwOiBQYWlyaW5nQXBwKSB7fVxuXG4gIGxvYWQoKTogc3RyaW5nIHtcbiAgICBpZiAodHlwZW9mIHRoaXMuYXBwLmxvYWRMb2NhbFN0b3JhZ2UgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmFwcC5sb2FkTG9jYWxTdG9yYWdlKFNUT1JBR0VfS0VZKTtcbiAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyB2YWx1ZSA6IFwiXCI7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnN0b3JhZ2UoKS5nZXRJdGVtKHRoaXMuZmFsbGJhY2tLZXkoKSkgPz8gXCJcIjtcbiAgfVxuXG4gIHNhdmUoY29kZTogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLmFwcC5zYXZlTG9jYWxTdG9yYWdlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHRoaXMuYXBwLnNhdmVMb2NhbFN0b3JhZ2UoU1RPUkFHRV9LRVksIGNvZGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnN0b3JhZ2UoKS5zZXRJdGVtKHRoaXMuZmFsbGJhY2tLZXkoKSwgY29kZSk7XG4gIH1cblxuICBjbGVhcigpOiB2b2lkIHtcbiAgICBpZiAodHlwZW9mIHRoaXMuYXBwLnNhdmVMb2NhbFN0b3JhZ2UgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhpcy5hcHAuc2F2ZUxvY2FsU3RvcmFnZShTVE9SQUdFX0tFWSwgbnVsbCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc3RvcmFnZSgpLnJlbW92ZUl0ZW0odGhpcy5mYWxsYmFja0tleSgpKTtcbiAgfVxuXG4gIHByaXZhdGUgZmFsbGJhY2tLZXkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYGV4Y2FsaWRyYXctc3R5bHVzLWNvbnRyb2xzOiR7dGhpcy5hcHAudmF1bHQuZ2V0TmFtZSgpfTpwYWlyaW5nYDtcbiAgfVxuXG4gIHByaXZhdGUgc3RvcmFnZSgpOiBTdG9yYWdlIHtcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB3aW5kb3cubG9jYWxTdG9yYWdlKSByZXR1cm4gd2luZG93LmxvY2FsU3RvcmFnZTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJMb2NhbCBwYWlyaW5nIHN0b3JhZ2UgaXMgdW5hdmFpbGFibGUuXCIpO1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBFeGNhbGlkcmF3QnJpZGdlIH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZVwiO1xuaW1wb3J0IHR5cGUgeyBQb2ludCB9IGZyb20gXCIuLi9zdHlsdXMvdHlwZXNcIjtcbmltcG9ydCB0eXBlIHsgUGVuQnJpZGdlQ2xpZW50LCBQZW5CdXR0b25TaWduYWwgfSBmcm9tIFwiLi9QZW5CcmlkZ2VDbGllbnRcIjtcblxuZXhwb3J0IGludGVyZmFjZSBSb3V0ZWRQZW5UYXJnZXQge1xuICBsYXN0UGVuQWN0aXZpdHlBdDogbnVtYmVyO1xuICBvbkV4dGVybmFsQnV0dG9uKHNpZ25hbDogUGVuQnV0dG9uU2lnbmFsKTogdm9pZDtcbiAgbGFzdFBlblBvaW50KCk6IFBvaW50IHwgbnVsbDtcbiAgYnJpZGdlRm9yTWVudSgpOiBFeGNhbGlkcmF3QnJpZGdlO1xufVxuXG5jb25zdCBSRUNFTlRfTVMgPSA1MDAwO1xuXG4vKiogUm91dGVzIGVhY2ggYmFycmVsIGxldmVsIHRvIHRoZSBFeGNhbGlkcmF3IHZpZXcgdGhlIHBlbiB3YXMganVzdCBvdmVyLiAqL1xuZXhwb3J0IGNsYXNzIFBlblNpZ25hbEh1YiB7XG4gIHByaXZhdGUgcmVhZG9ubHkgdGFyZ2V0cyA9IG5ldyBTZXQ8Um91dGVkUGVuVGFyZ2V0PigpO1xuICBwcml2YXRlIGZhbGxiYWNrOiAoKSA9PiBSb3V0ZWRQZW5UYXJnZXQgfCBudWxsID0gKCkgPT4gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNsaWVudDogKCkgPT4gUGljazxQZW5CcmlkZ2VDbGllbnQsIFwiaXNSZWFkeVwiIHwgXCJpc0Rvd25cIj4gfCBudWxsLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgbm93OiAoKSA9PiBudW1iZXIgPSAoKSA9PiBwZXJmb3JtYW5jZS5ub3coKVxuICApIHt9XG5cbiAgc2V0RmFsbGJhY2soZmFsbGJhY2s6ICgpID0+IFJvdXRlZFBlblRhcmdldCB8IG51bGwpOiB2b2lkIHtcbiAgICB0aGlzLmZhbGxiYWNrID0gZmFsbGJhY2s7XG4gIH1cblxuICByZWdpc3Rlcih0YXJnZXQ6IFJvdXRlZFBlblRhcmdldCk6IHZvaWQge1xuICAgIHRoaXMudGFyZ2V0cy5hZGQodGFyZ2V0KTtcbiAgfVxuXG4gIHVucmVnaXN0ZXIodGFyZ2V0OiBSb3V0ZWRQZW5UYXJnZXQpOiB2b2lkIHtcbiAgICB0aGlzLnRhcmdldHMuZGVsZXRlKHRhcmdldCk7XG4gIH1cblxuICBpc1JlYWR5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNsaWVudCgpPy5pc1JlYWR5KCkgPz8gZmFsc2U7XG4gIH1cblxuICBpc0Rvd24oKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2xpZW50KCk/LmlzRG93bigpID8/IGZhbHNlO1xuICB9XG5cbiAgZGlzcGF0Y2goc2lnbmFsOiBQZW5CdXR0b25TaWduYWwpOiB2b2lkIHtcbiAgICB0aGlzLnJvdXRlKCk/Lm9uRXh0ZXJuYWxCdXR0b24oc2lnbmFsKTtcbiAgfVxuXG4gIHJvdXRlKCk6IFJvdXRlZFBlblRhcmdldCB8IG51bGwge1xuICAgIGNvbnN0IG5vdyA9IHRoaXMubm93KCk7XG4gICAgbGV0IGJlc3Q6IFJvdXRlZFBlblRhcmdldCB8IG51bGwgPSBudWxsO1xuICAgIGZvciAoY29uc3QgdGFyZ2V0IG9mIHRoaXMudGFyZ2V0cykge1xuICAgICAgaWYgKG5vdyAtIHRhcmdldC5sYXN0UGVuQWN0aXZpdHlBdCA+IFJFQ0VOVF9NUykgY29udGludWU7XG4gICAgICBpZiAoIWJlc3QgfHwgdGFyZ2V0Lmxhc3RQZW5BY3Rpdml0eUF0ID4gYmVzdC5sYXN0UGVuQWN0aXZpdHlBdCkgYmVzdCA9IHRhcmdldDtcbiAgICB9XG4gICAgcmV0dXJuIGJlc3QgPz8gdGhpcy5mYWxsYmFjaygpO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgUGVuRXZlbnRQcm9iZSB9IGZyb20gXCIuLi9kaWFnbm9zdGljcy9QZW5FdmVudFByb2JlXCI7XG5pbXBvcnQgeyBpc0RpYWdub3N0aWNCdWlsZCB9IGZyb20gXCIuLi9kaWFnbm9zdGljcy9yZXBvcnRcIjtcbmltcG9ydCB0eXBlIFN0eWx1c0NvbnRyb2xzUGx1Z2luIGZyb20gXCIuLi9tYWluXCI7XG5pbXBvcnQgeyBkZWNvZGVQYWlyaW5nQ29kZSB9IGZyb20gXCIuLi9wZW5icmlkZ2UvcHJvdG9jb2xcIjtcbmltcG9ydCB7XG4gIE5VTUVSSUNfU0VUVElOR19MSU1JVFMsXG4gIHBhcnNlTnVtZXJpY1NldHRpbmcsXG4gIHR5cGUgQmFycmVsQnV0dG9uTWFzayxcbiAgdHlwZSBFcmFzZXJTdHJhdGVneSxcbiAgdHlwZSBNaWRTdHJva2VQcmVzcyxcbiAgdHlwZSBOdW1lcmljU2V0dGluZ0tleSxcbiAgdHlwZSBTdHlsdXNBY3Rpb24sXG59IGZyb20gXCIuL3NldHRpbmdzXCI7XG5cbmNvbnN0IGFjdGlvbnM6IFJlY29yZDxTdHlsdXNBY3Rpb24sIHN0cmluZz4gPSB7XG4gIFwibWVudVwiOiBcIk9wZW4gbWVudVwiLFxuICBcImNvbnRleHQtbWVudVwiOiBcIlJpZ2h0LWNsaWNrIG1lbnVcIixcbiAgXCJjb3B5XCI6IFwiQ29weVwiLFxuICBcInBhc3RlXCI6IFwiUGFzdGVcIixcbiAgXCJub25lXCI6IFwiRG8gbm90aGluZ1wiLFxufTtcblxuY29uc3QgdGVzdFByb2ZpbGVzOiBSZWNvcmQ8XG4gIHN0cmluZyxcbiAgeyBsYWJlbDogc3RyaW5nOyBtYXNrOiBCYXJyZWxCdXR0b25NYXNrOyBwcmltYXJ5Q29udGFjdE1vZGU6IFwiaG92ZXItb25seVwiIHwgXCJleHBlcmltZW50YWxcIiB9XG4+ID0ge1xuICBcInN0YW5kYXJkXCI6IHtcbiAgICBsYWJlbDogXCJTdGFuZGFyZCBiYXJyZWwgXHUyMDE0IGJ1dHRvbnM6IDJcIixcbiAgICBtYXNrOiAyLFxuICAgIHByaW1hcnlDb250YWN0TW9kZTogXCJob3Zlci1vbmx5XCIsXG4gIH0sXG4gIFwiYW5kcm9pZC1ob3ZlclwiOiB7XG4gICAgbGFiZWw6IFwiQW5kcm9pZC9XZWJWaWV3IHByaW1hcnkgXHUyMDE0IGJ1dHRvbnM6IDEsIGhvdmVyIG9ubHlcIixcbiAgICBtYXNrOiAxLFxuICAgIHByaW1hcnlDb250YWN0TW9kZTogXCJob3Zlci1vbmx5XCIsXG4gIH0sXG4gIFwiYW5kcm9pZC1jb250YWN0XCI6IHtcbiAgICBsYWJlbDogXCJBbmRyb2lkL1dlYlZpZXcgcHJpbWFyeSBcdTIwMTQgYnV0dG9uczogMSwgY29udGFjdCBleHBlcmltZW50XCIsXG4gICAgbWFzazogMSxcbiAgICBwcmltYXJ5Q29udGFjdE1vZGU6IFwiZXhwZXJpbWVudGFsXCIsXG4gIH0sXG4gIFwiYXV4aWxpYXJ5XCI6IHtcbiAgICBsYWJlbDogXCJBdXhpbGlhcnkvbWlkZGxlIFx1MjAxNCBidXR0b25zOiA0XCIsXG4gICAgbWFzazogNCxcbiAgICBwcmltYXJ5Q29udGFjdE1vZGU6IFwiaG92ZXItb25seVwiLFxuICB9LFxuICBcImJhY2tcIjogeyBsYWJlbDogXCJCYWNrIFx1MjAxNCBidXR0b25zOiA4XCIsIG1hc2s6IDgsIHByaW1hcnlDb250YWN0TW9kZTogXCJob3Zlci1vbmx5XCIgfSxcbiAgXCJmb3J3YXJkXCI6IHsgbGFiZWw6IFwiRm9yd2FyZCBcdTIwMTQgYnV0dG9uczogMTZcIiwgbWFzazogMTYsIHByaW1hcnlDb250YWN0TW9kZTogXCJob3Zlci1vbmx5XCIgfSxcbiAgXCJlcmFzZXJcIjogeyBsYWJlbDogXCJQZW4gZXJhc2VyIFx1MjAxNCBidXR0b25zOiAzMlwiLCBtYXNrOiAzMiwgcHJpbWFyeUNvbnRhY3RNb2RlOiBcImhvdmVyLW9ubHlcIiB9LFxufTtcblxuY29uc3QgVEVTVEVSX0dVSURFID1cbiAgXCJodHRwczovL2dpdGh1Yi5jb20vamFubGV3c2tpL2V4Y2FsaWRyYXctc3R5bHVzLWNvbnRyb2xzL2Jsb2IvbWFpbi9kb2NzL1RFU1RFUi1HVUlERS5tZFwiO1xuXG5leHBvcnQgY2xhc3MgU2V0dGluZ3NUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcHJpdmF0ZSBwcm9iZTogUGVuRXZlbnRQcm9iZSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHVud2F0Y2g6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGxpdmVTdGF0dXM6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY2hlY2tSZXN1bHRzOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGZpbmdlcnByaW50RWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZXJhc2VyUmVzdWx0OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBTdHlsdXNDb250cm9sc1BsdWdpbikge1xuICAgIHN1cGVyKHBsdWdpbi5hcHAsIHBsdWdpbik7XG4gIH1cblxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIHRoaXMudGVhcmRvd24oKTtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgY29uc3QgZGlhZ25vc3RpYyA9IGlzRGlhZ25vc3RpY0J1aWxkKHRoaXMucGx1Z2luLm1hbmlmZXN0LnZlcnNpb24pO1xuICAgIGlmIChkaWFnbm9zdGljKSB0aGlzLnJlbmRlckRpYWdub3N0aWNzKCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiSG9sZCB0aGUgc2lkZSBidXR0b24gYW5kIHRhcCBhIHN0cm9rZSB0byBlcmFzZSBpdC4gRHJhZyB3aXRoIHRoZSBidXR0b24gaGVsZCB0byBlcmFzZSBhbG9uZyB0aGUgcGVuLiBIb3ZlciBhbmQgZG91YmxlLXRhcCB0aGUgYnV0dG9uIGZvciBFeGNhbGlkcmF3J3MgcmlnaHQtY2xpY2sgbWVudS4gQ29weSBhbmQgcGFzdGUgYXJlIG5vdCBhdmFpbGFibGUgeWV0LlwiLFxuICAgIH0pO1xuICAgIHRoaXMuYWN0aW9uKFwiVGFwXCIsIFwiYnV0dG9uVGFwQWN0aW9uXCIpO1xuICAgIHRoaXMuYWN0aW9uKFwiRG91YmxlIHRhcFwiLCBcImJ1dHRvbkRvdWJsZVRhcEFjdGlvblwiKTtcbiAgICB0aGlzLmFjdGlvbihcIkhvbGRcIiwgXCJidXR0b25Ib2xkQWN0aW9uXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJCdXR0b24gKyBwZW4gY29udGFjdFwiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIFwiSG9sZCB0aGUgc2lkZSBidXR0b24sIHRoZW4gdGFwIGEgc3Ryb2tlIHRvIGVyYXNlIHRoZSB3aG9sZSBzdHJva2UsIG9yIGRyYWcgdG8gZXJhc2UgYWxvbmcgdGhlIHBlbi4gVGhpcyBkb2VzIG5vdCBvcGVuIHRoZSByaWdodC1jbGljayBtZW51LlwiXG4gICAgICApXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PlxuICAgICAgICBkcm9wZG93blxuICAgICAgICAgIC5hZGRPcHRpb24oXCJlcmFzZXJcIiwgXCJUZW1wb3JhcnkgZXJhc2VyXCIpXG4gICAgICAgICAgLmFkZE9wdGlvbihcIm5vbmVcIiwgXCJEbyBub3RoaW5nXCIpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmJ1dHRvbkNvbnRhY3RBY3Rpb24pXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT5cbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHtcbiAgICAgICAgICAgICAgYnV0dG9uQ29udGFjdEFjdGlvbjogdmFsdWUgYXMgXCJlcmFzZXJcIiB8IFwibm9uZVwiLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICApXG4gICAgICApO1xuICAgIHRoaXMubnVtYmVyKFwiRG91YmxlLXRhcCBpbnRlcnZhbCAobXMpXCIsIFwiZG91YmxlVGFwTXNcIik7XG4gICAgdGhpcy5udW1iZXIoXCJMb25nLXByZXNzIGRlbGF5IChtcylcIiwgXCJsb25nUHJlc3NNc1wiKTtcbiAgICB0aGlzLm51bWJlcihcIk1vdmVtZW50IHRocmVzaG9sZCAocHgpXCIsIFwibW92ZW1lbnRUaHJlc2hvbGRQeFwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiUyBQZW4gdGVzdCBtb2RlXCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJTdXBwcmVzc2VzIG1lbnUsIGNsaXBib2FyZCwgYW5kIHRlbXBvcmFyeS10b29sIGNoYW5nZXMgd2hpbGUgc3RpbGwgc2hvd2luZyByZWNvZ25pemVkIHN0YXRlIGFuZCBlZmZlY3RzIGluIHRoZSBkZWJ1ZyBvdmVybGF5LiBVc2UgdGhpcyB3aGlsZSB0cnlpbmcgc2lnbmFsIHByb2ZpbGVzLlwiXG4gICAgICApXG4gICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XG4gICAgICAgIHRvZ2dsZVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zdHlsdXNUZXN0TW9kZSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IHN0eWx1c1Rlc3RNb2RlOiB2YWx1ZSB9KSlcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlMgUGVuIHNpZ25hbCB0ZXN0IHByb2ZpbGVcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIlRyeSBvbmUgcHJvZmlsZSBhdCBhIHRpbWUgd2l0aCB0ZXN0IG1vZGUgZW5hYmxlZCwgdGhlbiBleHBvcnQgdGhlIHRyYWNlLiBUaGUgQW5kcm9pZCBjb250YWN0IGV4cGVyaW1lbnQgbWF5IHJlY29nbml6ZSBldmVyeSBvcmRpbmFyeSBwZW4gc3Ryb2tlOyB1c2UgaXQgb25seSBpbiBhIGRpc3Bvc2FibGUgZHJhd2luZy5cIlxuICAgICAgKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IFt2YWx1ZSwgcHJvZmlsZV0gb2YgT2JqZWN0LmVudHJpZXModGVzdFByb2ZpbGVzKSlcbiAgICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24odmFsdWUsIHByb2ZpbGUubGFiZWwpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZSh0aGlzLmN1cnJlbnRUZXN0UHJvZmlsZSgpKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25zdCBwcm9maWxlID0gdGVzdFByb2ZpbGVzW3ZhbHVlXTtcbiAgICAgICAgICBpZiAoIXByb2ZpbGUpIHJldHVybjtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7XG4gICAgICAgICAgICBiYXJyZWxCdXR0b25NYXNrOiBwcm9maWxlLm1hc2ssXG4gICAgICAgICAgICBwcmltYXJ5Q29udGFjdE1vZGU6IHByb2ZpbGUucHJpbWFyeUNvbnRhY3RNb2RlLFxuICAgICAgICAgICAgc3R5bHVzVGVzdE1vZGU6IHRydWUsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgdGhpcy5yZW5kZXJCcmlkZ2UoKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVidWcgbG9nZ2luZ1wiKVxuICAgICAgLnNldERlc2MoXCJMb2dzIGJvdW5kZWQgcmF3IHBlbiBldmVudCB0cmFjZXMgdG8gdGhlIGRldmVsb3BlciBjb25zb2xlLlwiKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxuICAgICAgICB0b2dnbGVcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVidWdNb2RlKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgZGVidWdNb2RlOiB2YWx1ZSB9KSlcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlYnVnIG92ZXJsYXlcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIlNob3dzIHRoZSBsYXRlc3QgcGVuIGV2ZW50IGFuZCBzdHlsdXMgc3RhdGUgaW4gdGhlIEV4Y2FsaWRyYXcgdmlldy4gUmVxdWlyZXMgZGVidWcgbG9nZ2luZy5cIlxuICAgICAgKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxuICAgICAgICB0b2dnbGVcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVidWdPdmVybGF5KVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgZGVidWdPdmVybGF5OiB2YWx1ZSB9KSlcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkV4cG9ydCBkZWJ1ZyB0cmFjZVwiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIFwiQ29waWVzIGJ1ZmZlcmVkIHBlbiBldmVudHMgZnJvbSBldmVyeSBvcGVuIEV4Y2FsaWRyYXcgdmlldyBhcyBKU09OLCByZWFkeSB0byBhdHRhY2ggdG8gYSBidWcgcmVwb3J0LlwiXG4gICAgICApXG4gICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+XG4gICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiQ29weSB0cmFjZVwiKS5vbkNsaWNrKCgpID0+IHRoaXMucGx1Z2luLmNvcHlTdHlsdXNFdmVudFRyYWNlKCkpXG4gICAgICApO1xuICAgIGlmICghZGlhZ25vc3RpYykgdGhpcy5yZW5kZXJEaWFnbm9zdGljcygpO1xuICAgIHRoaXMudW53YXRjaCA9IHRoaXMucGx1Z2luLndhdGNoQnJpZGdlKCgpID0+IHRoaXMucmVmcmVzaExpdmUoKSk7XG4gIH1cblxuICBoaWRlKCk6IHZvaWQge1xuICAgIHRoaXMudGVhcmRvd24oKTtcbiAgICBzdXBlci5oaWRlKCk7XG4gIH1cblxuICBwcml2YXRlIHRlYXJkb3duKCk6IHZvaWQge1xuICAgIHRoaXMudW53YXRjaD8uKCk7XG4gICAgdGhpcy51bndhdGNoID0gbnVsbDtcbiAgICB0aGlzLnByb2JlPy5kaXNwb3NlKCk7XG4gICAgdGhpcy5wcm9iZSA9IG51bGw7XG4gICAgdGhpcy5saXZlU3RhdHVzID0gbnVsbDtcbiAgICB0aGlzLmNoZWNrUmVzdWx0cyA9IG51bGw7XG4gICAgdGhpcy5maW5nZXJwcmludEVsID0gbnVsbDtcbiAgICB0aGlzLmVyYXNlclJlc3VsdCA9IG51bGw7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckRpYWdub3N0aWNzKCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiRGlhZ25vc3RpY3NcIiB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJIb3cgdG8gdGVzdDogZG9jcy9URVNURVItR1VJREUubWQuIFRoZSByZXBvcnQgbmV2ZXIgaW5jbHVkZXMgdGhlIHBhaXJpbmcgY29kZSwgdmF1bHQgbmFtZSwgbm90ZSB0ZXh0LCBvciBwb2ludGVyIGNvb3JkaW5hdGVzLlwiLFxuICAgIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiYVwiLCB7IHRleHQ6IFwiSG93IHRvIHRlc3RcIiwgaHJlZjogVEVTVEVSX0dVSURFIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBgUGx1Z2luICR7dGhpcy5wbHVnaW4ubWFuaWZlc3QudmVyc2lvbn0uIE9wZW4gYSBuZXcgZW1wdHkgZHJhd2luZyBiZWZvcmUgdGhlIGVyYXNlciB0ZXN0LmAsXG4gICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkNoZWNrIGJyaWRnZSBjb25uZWN0aW9uXCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJUcmllcyBIVFRQLCBXZWJTb2NrZXQsIGhlbGxvLCBwYWlyaW5nLCBhbmQgdGhlIHBlbiBzb3VyY2UuIE5vdGhpbmcgZWxzZSBuZWVkcyB0byBiZSBvcGVuLlwiXG4gICAgICApXG4gICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+XG4gICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiQ2hlY2tcIikub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgYnV0dG9uLnNldERpc2FibGVkKHRydWUpO1xuICAgICAgICAgIGlmICh0aGlzLmNoZWNrUmVzdWx0cykgdGhpcy5jaGVja1Jlc3VsdHMuc2V0VGV4dChcIkNoZWNraW5nXHUyMDI2XCIpO1xuICAgICAgICAgIHZvaWQgdGhpcy5wbHVnaW4uY2hlY2tCcmlkZ2UoKS50aGVuKChjaGVja3MpID0+IHtcbiAgICAgICAgICAgIGJ1dHRvbi5zZXREaXNhYmxlZChmYWxzZSk7XG4gICAgICAgICAgICBpZiAodGhpcy5jaGVja1Jlc3VsdHMpXG4gICAgICAgICAgICAgIHRoaXMuY2hlY2tSZXN1bHRzLnNldFRleHQodGhpcy5wbHVnaW4uYnJpZGdlQ2hlY2tMaW5lcygpLmpvaW4oXCJcXG5cIikpO1xuICAgICAgICAgICAgdm9pZCBjaGVja3M7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIHRoaXMuY2hlY2tSZXN1bHRzID0gY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwcmVcIik7XG4gICAgdGhpcy5jaGVja1Jlc3VsdHMuc2V0VGV4dCh0aGlzLnBsdWdpbi5icmlkZ2VDaGVja0xpbmVzKCkuam9pbihcIlxcblwiKSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IFwiTGl2ZSBicmlkZ2Ugc3RhdHVzXCIgfSk7XG4gICAgdGhpcy5saXZlU3RhdHVzID0gY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIpO1xuICAgIHRoaXMucmVmcmVzaExpdmUoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogXCJQZW4gZXZlbnQgcHJvYmVcIiB9KTtcbiAgICB0aGlzLnByb2JlID0gbmV3IFBlbkV2ZW50UHJvYmUoY29udGFpbmVyRWwsICgpID0+IHtcbiAgICAgIGlmICh0aGlzLnByb2JlKSB0aGlzLnBsdWdpbi5zZXRQcm9iZUV2ZW50cyh0aGlzLnByb2JlLnNuYXBzaG90KCkpO1xuICAgIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIkV4Y2FsaWRyYXcgY2hlY2tcIiB9KTtcbiAgICB0aGlzLmVyYXNlclJlc3VsdCA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IHRoaXMucGx1Z2luLnRlbXBvcmFyeUVyYXNlck5vdGUgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlRlc3QgdGVtcG9yYXJ5IGVyYXNlclwiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgICdTaG93cyBcIk9wZW4gYSBuZXcsIGVtcHR5IGRyYXdpbmcgZmlyc3RcIiB1bmxlc3MgYW4gRXhjYWxpZHJhdyB2aWV3IGlzIGFjdGl2ZSwgdGhlbiBhc2tzIGJlZm9yZSBydW5uaW5nLidcbiAgICAgIClcbiAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT5cbiAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJUZXN0IHRlbXBvcmFyeSBlcmFzZXJcIikub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgdm9pZCB0aGlzLnBsdWdpbi5ydW5UZW1wb3JhcnlFcmFzZXJUZXN0KCkudGhlbigobm90ZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuZXJhc2VyUmVzdWx0KSB0aGlzLmVyYXNlclJlc3VsdC5zZXRUZXh0KG5vdGUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQ29weSByZXBvcnRcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIkNvcGllcyBhIHNob3J0IHN1bW1hcnkgYW5kIGEgSlNPTiBibG9jay4gWW91IGNhbiBhbHNvIHJ1biBcdTIwMUNDb3B5IGRpYWdub3N0aWNzIHJlcG9ydFx1MjAxRCBmcm9tIHRoZSBjb21tYW5kIHBhbGV0dGUuXCJcbiAgICAgIClcbiAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT5cbiAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJDb3B5IHJlcG9ydFwiKS5vbkNsaWNrKCgpID0+IHZvaWQgdGhpcy5wbHVnaW4uY29weURpYWdub3N0aWNzUmVwb3J0KCkpXG4gICAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJCcmlkZ2UoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJTIFBlbiBicmlkZ2UgKEFuZHJvaWQgY29tcGFuaW9uKVwiIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlR1cm4gb2ZmIFNhbXN1bmcgQWlyIGNvbW1hbmQsIG9yIGEgaG92ZXIgcHJlc3MgY2FuIG9wZW4gdGhhdCBwYW5lbCBpbnN0ZWFkIG9mIHJlYWNoaW5nIE9ic2lkaWFuLiBXaXRob3V0IHRoZSBicmlkZ2UsIEFuZHJvaWQgdXNlcyB0aGUgaG92ZXItbGF0Y2ggZmFsbGJhY2suXCIsXG4gICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkVuYWJsZSBicmlkZ2VcIilcbiAgICAgIC5zZXREZXNjKFwiQ29ubmVjdHMgd2hpbGUgYW4gRXhjYWxpZHJhdyB2aWV3IGlzIG9wZW4gYW5kIHRoaXMgbm90ZSBpcyB2aXNpYmxlLlwiKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxuICAgICAgICB0b2dnbGVcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MucGVuQnJpZGdlRW5hYmxlZClcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IHBlbkJyaWRnZUVuYWJsZWQ6IHZhbHVlIH0pKVxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiUGFpcmluZyBjb2RlXCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJQYXN0ZSB0aGUgY29kZSBmcm9tIHRoZSBicmlkZ2UgYXBwLiBJdCBpcyBzdG9yZWQgb24gdGhpcyBkZXZpY2Ugb25seSwgbm90IGluIHRoZSB2YXVsdC5cIlxuICAgICAgKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5pbnB1dEVsLnR5cGUgPSBcInBhc3N3b3JkXCI7XG4gICAgICAgIHRleHQuc2V0UGxhY2Vob2xkZXIoXCJQYWlyaW5nIGNvZGVcIik7XG4gICAgICAgIHRleHQuc2V0VmFsdWUodGhpcy5wbHVnaW4ucGFpcmluZ0NvZGUoKSk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoKHZhbHVlKSA9PiB2b2lkIHRoaXMuY29tbWl0UGFpcmluZyh2YWx1ZSkpO1xuICAgICAgfSlcbiAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT5cbiAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJQYXN0ZVwiKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICB2b2lkIG5hdmlnYXRvci5jbGlwYm9hcmQucmVhZFRleHQoKS50aGVuKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgdm9pZCB0aGlzLmNvbW1pdFBhaXJpbmcodmFsdWUpO1xuICAgICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIHRoaXMuZmluZ2VycHJpbnRFbCA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IHRoaXMuZmluZ2VycHJpbnRMYWJlbCgpIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJTdGF0dXNcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIlJlYWR5IG1lYW5zIG1pZC1zdHJva2UgZXJhc2UgY2FuIHVzZSB0aGUgYnJpZGdlLiBSZWNvbm5lY3QgYWZ0ZXIgYSB3cm9uZyBjb2RlIG9yIGEgcHJvdG9jb2wgZXJyb3IuXCJcbiAgICAgIClcbiAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT5cbiAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJSZWNvbm5lY3RcIikub25DbGljaygoKSA9PiB0aGlzLnBsdWdpbi5yZWNvbm5lY3RCcmlkZ2UoKSlcbiAgICAgICk7XG4gICAgdGhpcy5udW1iZXIoXG4gICAgICBcIkxhdGUgcHJlc3Mgd2luZG93IChtcylcIixcbiAgICAgIFwibGF0ZVdpbmRvd01zXCIsXG4gICAgICBcIldob2xlIG1pbGxpc2Vjb25kcyBmcm9tIDAgdG8gMTAwLiBQcmVzc2VzIGluc2lkZSB0aGlzIHdpbmRvdyBkZWxldGUgdGhlIHRpbnkgaW5rIGRvdC5cIlxuICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIk1pZC1zdHJva2UgcHJlc3NcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIlNwbGl0IHR1cm5zIHRoZSByZXN0IG9mIHRoZSBjdXJyZW50IHN0cm9rZSBpbnRvIHRoZSBlcmFzZXIuIE5leHQgY29udGFjdCB3YWl0cyB1bnRpbCB5b3UgbGlmdC5cIlxuICAgICAgKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT5cbiAgICAgICAgZHJvcGRvd25cbiAgICAgICAgICAuYWRkT3B0aW9uKFwic3BsaXRcIiwgXCJTcGxpdCB0aGlzIHN0cm9rZVwiKVxuICAgICAgICAgIC5hZGRPcHRpb24oXCJuZXh0LWNvbnRhY3RcIiwgXCJFcmFzZSB0aGUgbmV4dCBjb250YWN0XCIpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm1pZFN0cm9rZVByZXNzKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IG1pZFN0cm9rZVByZXNzOiB2YWx1ZSBhcyBNaWRTdHJva2VQcmVzcyB9KVxuICAgICAgICAgIClcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkVyYXNlciBtZXRob2RcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIlN5bnRoZXRpYyBidXR0b24gNSB1c2VzIEV4Y2FsaWRyYXcncyBtb21lbnRhcnkgZXJhc2VyLiBTZXQgYWN0aXZlIHRvb2wgaXMgdGhlIGZhbGxiYWNrLlwiXG4gICAgICApXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PlxuICAgICAgICBkcm9wZG93blxuICAgICAgICAgIC5hZGRPcHRpb24oXCJzeW50aGV0aWMtYnV0dG9uNVwiLCBcIlN5bnRoZXRpYyBidXR0b24gNVwiKVxuICAgICAgICAgIC5hZGRPcHRpb24oXCJzZXQtYWN0aXZlLXRvb2xcIiwgXCJTZXQgYWN0aXZlIHRvb2xcIilcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZXJhc2VyU3RyYXRlZ3kpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT5cbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgZXJhc2VyU3RyYXRlZ3k6IHZhbHVlIGFzIEVyYXNlclN0cmF0ZWd5IH0pXG4gICAgICAgICAgKVxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiU3VwcHJlc3MgaG92ZXIgYnV0dG9uIGV2ZW50c1wiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIFwiU3RvcHMgYSB6ZXJvLXByZXNzdXJlIHBlbiBldmVudCB3aXRoIGJ1dHRvbnMgMSBmcm9tIHN0YXJ0aW5nIGEgc3Ryb2tlIGluIG1pZC1haXIgd2hpbGUgdGhlIGJhcnJlbCBpcyBoZWxkLlwiXG4gICAgICApXG4gICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XG4gICAgICAgIHRvZ2dsZVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zdXBwcmVzc0hvdmVyQnV0dG9uRXZlbnRzKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IHN1cHByZXNzSG92ZXJCdXR0b25FdmVudHM6IHZhbHVlIH0pXG4gICAgICAgICAgKVxuICAgICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY29tbWl0UGFpcmluZyh2YWx1ZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdHJpbW1lZCA9IHZhbHVlLnRyaW0oKTtcbiAgICBpZiAoIXRyaW1tZWQpIGF3YWl0IHRoaXMucGx1Z2luLmNsZWFyUGFpcmluZ0NvZGUoKTtcbiAgICBlbHNlIGlmIChkZWNvZGVQYWlyaW5nQ29kZSh0cmltbWVkKSkgYXdhaXQgdGhpcy5wbHVnaW4uc2V0UGFpcmluZ0NvZGUodHJpbW1lZCk7XG4gICAgaWYgKHRoaXMuZmluZ2VycHJpbnRFbCkgdGhpcy5maW5nZXJwcmludEVsLnNldFRleHQodGhpcy5maW5nZXJwcmludExhYmVsKCkpO1xuICAgIHRoaXMucmVmcmVzaExpdmUoKTtcbiAgfVxuXG4gIHByaXZhdGUgZmluZ2VycHJpbnRMYWJlbCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnBsdWdpbi5wYWlyaW5nRmluZ2VycHJpbnRcbiAgICAgID8gYEZpbmdlcnByaW50ICR7dGhpcy5wbHVnaW4ucGFpcmluZ0ZpbmdlcnByaW50fSAobXVzdCBtYXRjaCB0aGUgYnJpZGdlIGFwcClgXG4gICAgICA6IFwiRmluZ2VycHJpbnQ6IHBhc3RlIGEgdmFsaWQgcGFpcmluZyBjb2RlLiBJdCBtdXN0IG1hdGNoIHRoZSBicmlkZ2UgYXBwLlwiO1xuICB9XG5cbiAgcHJpdmF0ZSByZWZyZXNoTGl2ZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5saXZlU3RhdHVzKSB0aGlzLmxpdmVTdGF0dXMuc2V0VGV4dCh0aGlzLnBsdWdpbi5icmlkZ2VTdGF0dXNUZXh0KCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBhY3Rpb24oXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIGtleTogXCJidXR0b25UYXBBY3Rpb25cIiB8IFwiYnV0dG9uRG91YmxlVGFwQWN0aW9uXCIgfCBcImJ1dHRvbkhvbGRBY3Rpb25cIlxuICApOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRhaW5lckVsKS5zZXROYW1lKGBTIFBlbiBzaWRlIGJ1dHRvbjogJHtuYW1lfWApLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgZm9yIChjb25zdCBbdmFsdWUsIGxhYmVsXSBvZiBPYmplY3QuZW50cmllcyhhY3Rpb25zKSkgZHJvcGRvd24uYWRkT3B0aW9uKHZhbHVlLCBsYWJlbCk7XG4gICAgICBkcm9wZG93blxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Nba2V5XSlcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4gdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBba2V5XTogdmFsdWUgYXMgU3R5bHVzQWN0aW9uIH0pKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgbnVtYmVyKG5hbWU6IHN0cmluZywga2V5OiBOdW1lcmljU2V0dGluZ0tleSwgZGVzYz86IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IHsgbWluLCBtYXggfSA9IE5VTUVSSUNfU0VUVElOR19MSU1JVFNba2V5XTtcbiAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUobmFtZSlcbiAgICAgIC5zZXREZXNjKGRlc2MgPz8gYFdob2xlIG1pbGxpc2Vjb25kcy9waXhlbHMgZnJvbSAke21pbn0gdG8gJHttYXh9LmApXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgICAgdGV4dC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3Nba2V5XSkpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlTnVtZXJpY1NldHRpbmcoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgdGV4dC5pbnB1dEVsLnNldEN1c3RvbVZhbGlkaXR5KFxuICAgICAgICAgICAgcGFyc2VkID09PSBudWxsID8gYEVudGVyIGEgd2hvbGUgbnVtYmVyIGZyb20gJHttaW59IHRvICR7bWF4fS5gIDogXCJcIlxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKHBhcnNlZCA9PT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgW2tleV06IHBhcnNlZCB9KTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gIH1cblxuICBwcml2YXRlIGN1cnJlbnRUZXN0UHJvZmlsZSgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHsgYmFycmVsQnV0dG9uTWFzaywgcHJpbWFyeUNvbnRhY3RNb2RlIH0gPSB0aGlzLnBsdWdpbi5zZXR0aW5ncztcbiAgICByZXR1cm4gKFxuICAgICAgT2JqZWN0LmVudHJpZXModGVzdFByb2ZpbGVzKS5maW5kKFxuICAgICAgICAoWywgcHJvZmlsZV0pID0+XG4gICAgICAgICAgcHJvZmlsZS5tYXNrID09PSBiYXJyZWxCdXR0b25NYXNrICYmIHByb2ZpbGUucHJpbWFyeUNvbnRhY3RNb2RlID09PSBwcmltYXJ5Q29udGFjdE1vZGVcbiAgICAgICk/LlswXSA/PyBcInN0YW5kYXJkXCJcbiAgICApO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgZm9ybWF0UHJvYmVTdW1tYXJ5LCBzdW1tYXJpemVQcm9iZSwgdHlwZSBQcm9iZUV2ZW50IH0gZnJvbSBcIi4vcHJvYmVTdW1tYXJ5XCI7XG5cbmNvbnN0IEVWRU5UX1RZUEVTID0gW1xuICBcInBvaW50ZXJkb3duXCIsXG4gIFwicG9pbnRlcm1vdmVcIixcbiAgXCJwb2ludGVydXBcIixcbiAgXCJwb2ludGVyY2FuY2VsXCIsXG4gIFwiY29udGV4dG1lbnVcIixcbl0gYXMgY29uc3Q7XG5cbi8qKiBTZXR0aW5ncy1wYW5lIHBhZC4gSXQga2VlcHMgdGhlIGxhc3QgNTAgcG9pbnRlciBldmVudHMgYW5kIG5ldmVyIHN0b3JlcyBjb29yZGluYXRlcy4gKi9cbmV4cG9ydCBjbGFzcyBQZW5FdmVudFByb2JlIHtcbiAgcHJpdmF0ZSByZWFkb25seSBldmVudHM6IFByb2JlRXZlbnRbXSA9IFtdO1xuICBwcml2YXRlIHJlYWRvbmx5IHN0YXJ0ZWQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgcHJpdmF0ZSByZWFkb25seSBib3g6IEhUTUxFbGVtZW50O1xuICBwcml2YXRlIHJlYWRvbmx5IHN1bW1hcnk6IEhUTUxFbGVtZW50O1xuICBwcml2YXRlIHJlYWRvbmx5IGxpc3RlbmVyczogQXJyYXk8W3N0cmluZywgRXZlbnRMaXN0ZW5lcl0+ID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcGFyZW50OiBIVE1MRWxlbWVudCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uQ2hhbmdlPzogKCkgPT4gdm9pZFxuICApIHtcbiAgICB0aGlzLmJveCA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtcHJvYmVcIiB9KTtcbiAgICB0aGlzLmJveC5zZXRUZXh0KFxuICAgICAgXCJIb3ZlciB0aGUgUyBQZW4gaGVyZSwgcHJlc3MgYW5kIHJlbGVhc2UgdGhlIHNpZGUgYnV0dG9uLCB0aGVuIHRvdWNoIGFuZCBkcmF3IHdoaWxlIHByZXNzaW5nIGl0XCJcbiAgICApO1xuICAgIHRoaXMuc3VtbWFyeSA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtcHJvYmUtc3VtbWFyeVwiIH0pO1xuICAgIGZvciAoY29uc3QgdHlwZSBvZiBFVkVOVF9UWVBFUykge1xuICAgICAgY29uc3QgbGlzdGVuZXI6IEV2ZW50TGlzdGVuZXIgPSAoZXZlbnQpID0+IHRoaXMucmVjb3JkKGV2ZW50IGFzIFBvaW50ZXJFdmVudCk7XG4gICAgICB0aGlzLmJveC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIHRoaXMubGlzdGVuZXJzLnB1c2goW3R5cGUsIGxpc3RlbmVyXSk7XG4gICAgfVxuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBzbmFwc2hvdCgpOiBQcm9iZUV2ZW50W10ge1xuICAgIHJldHVybiB0aGlzLmV2ZW50cy5tYXAoKGV2ZW50KSA9PiAoeyAuLi5ldmVudCB9KSk7XG4gIH1cblxuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgW3R5cGUsIGxpc3RlbmVyXSBvZiB0aGlzLmxpc3RlbmVycykgdGhpcy5ib3gucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcik7XG4gICAgdGhpcy5saXN0ZW5lcnMubGVuZ3RoID0gMDtcbiAgICB0aGlzLmJveC5yZW1vdmUoKTtcbiAgICB0aGlzLnN1bW1hcnkucmVtb3ZlKCk7XG4gIH1cblxuICBwcml2YXRlIHJlY29yZChldmVudDogUG9pbnRlckV2ZW50KTogdm9pZCB7XG4gICAgaWYgKGV2ZW50LnR5cGUgPT09IFwiY29udGV4dG1lbnVcIikgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB0aGlzLmV2ZW50cy5wdXNoKHtcbiAgICAgIHQ6IE1hdGgubWF4KDAsIE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSB0aGlzLnN0YXJ0ZWQpKSxcbiAgICAgIHR5cGU6IGV2ZW50LnR5cGUsXG4gICAgICBwb2ludGVyVHlwZTogZXZlbnQucG9pbnRlclR5cGUgfHwgXCJtb3VzZVwiLFxuICAgICAgYnV0dG9uOiBldmVudC5idXR0b24sXG4gICAgICBidXR0b25zOiBldmVudC5idXR0b25zLFxuICAgICAgcHJlc3N1cmU6IE1hdGgucm91bmQoZXZlbnQucHJlc3N1cmUgKiAxMDApIC8gMTAwLFxuICAgICAgcGhhc2U6IGV2ZW50LnByZXNzdXJlID4gMCA/IFwiY29udGFjdFwiIDogXCJob3ZlclwiLFxuICAgIH0pO1xuICAgIGlmICh0aGlzLmV2ZW50cy5sZW5ndGggPiA1MCkgdGhpcy5ldmVudHMuc2hpZnQoKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICAgIHRoaXMub25DaGFuZ2U/LigpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXIoKTogdm9pZCB7XG4gICAgdGhpcy5zdW1tYXJ5LnNldFRleHQoZm9ybWF0UHJvYmVTdW1tYXJ5KHN1bW1hcml6ZVByb2JlKHRoaXMuZXZlbnRzKSkpO1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBHZXN0dXJlRWZmZWN0LCBHZXN0dXJlU3RhdGVTbmFwc2hvdCwgTm9ybWFsaXplZFN0eWx1c0V2ZW50IH0gZnJvbSBcIi4uL3N0eWx1cy90eXBlc1wiO1xuXG4vKiogQSBkaWFnbm9zdGljLW9ubHksIG5vbi1pbnRlcmFjdGl2ZSBvdmVybGF5IGxvY2FsIHRvIG9uZSBFeGNhbGlkcmF3IHZpZXcuICovXG5leHBvcnQgY2xhc3MgRGVidWdPdmVybGF5IHtcbiAgcHJpdmF0ZSBlbGVtZW50OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29udGFpbmVyOiBIVE1MRWxlbWVudCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVuYWJsZWQ6ICgpID0+IGJvb2xlYW5cbiAgKSB7fVxuXG4gIHVwZGF0ZShcbiAgICBldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50LFxuICAgIHN0YXRlOiBHZXN0dXJlU3RhdGVTbmFwc2hvdCxcbiAgICBlZmZlY3Q/OiBHZXN0dXJlRWZmZWN0LFxuICAgIHN0YXR1c0xpbmU/OiBzdHJpbmdcbiAgKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZWQoKSkge1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBvdmVybGF5ID0gdGhpcy5lbnN1cmVFbGVtZW50KCk7XG4gICAgY29uc3Qgc3RhdGVTdW1tYXJ5ID0gW1xuICAgICAgYGhvdmVyOiR7U3RyaW5nKCFzdGF0ZS5wZW5Db250YWN0KX1gLFxuICAgICAgYGJhcnJlbDoke1N0cmluZyhzdGF0ZS5iYXJyZWxCdXR0b25IZWxkKX1gLFxuICAgICAgYGNvbnN1bWVkOiR7U3RyaW5nKHN0YXRlLmdlc3R1cmVDb25zdW1lZCl9YCxcbiAgICAgIGB0ZW1wOiR7U3RyaW5nKHN0YXRlLnRlbXBvcmFyeVRvb2xBY3RpdmUpfWAsXG4gICAgXS5qb2luKFwiIFx1MDBCNyBcIik7XG4gICAgb3ZlcmxheS5zZXRUZXh0KFxuICAgICAgW1xuICAgICAgICBgUyBQZW4gJHtldmVudC5raW5kfSBpZDoke2V2ZW50LnBvaW50ZXJJZH0gYnV0dG9uOiR7ZXZlbnQuYnV0dG9ufSBidXR0b25zOiR7ZXZlbnQuYnV0dG9uc30gcHJlc3N1cmU6JHtldmVudC5wcmVzc3VyZS50b0ZpeGVkKDIpfWAsXG4gICAgICAgIGB0aWx0OiR7ZXZlbnQudGlsdFh9LCR7ZXZlbnQudGlsdFl9IHR3aXN0OiR7ZXZlbnQudHdpc3R9IHRhbmdlbnRpYWw6JHtldmVudC50YW5nZW50aWFsUHJlc3N1cmUudG9GaXhlZCgyKX0gc2l6ZToke2V2ZW50LndpZHRofXgke2V2ZW50LmhlaWdodH1gLFxuICAgICAgICBzdGF0ZVN1bW1hcnksXG4gICAgICAgIGBlZmZlY3Q6JHtlZmZlY3Q/LnR5cGUgPz8gXCJub25lXCJ9YCxcbiAgICAgICAgc3RhdHVzTGluZSA/PyBcIlwiLFxuICAgICAgXVxuICAgICAgICAuZmlsdGVyKChsaW5lKSA9PiBsaW5lLmxlbmd0aCA+IDApXG4gICAgICAgIC5qb2luKFwiXFxuXCIpXG4gICAgKTtcbiAgfVxuXG4gIGNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuZWxlbWVudD8ucmVtb3ZlKCk7XG4gICAgdGhpcy5lbGVtZW50ID0gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlRWxlbWVudCgpOiBIVE1MRWxlbWVudCB7XG4gICAgaWYgKHRoaXMuZWxlbWVudCkgcmV0dXJuIHRoaXMuZWxlbWVudDtcbiAgICB0aGlzLmVsZW1lbnQgPSB0aGlzLmNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtZGVidWctb3ZlcmxheVwiIH0pO1xuICAgIHJldHVybiB0aGlzLmVsZW1lbnQ7XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgU3R5bHVzRXZlbnRLaW5kIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IHR5cGUgUGVuUGhhc2UgPSBcImNvbnRhY3RcIiB8IFwiaG92ZXJcIiB8IFwiaG92ZXItYnV0dG9uXCI7XG5cbi8qKiBIb3Zlci1idXR0b24gZXZlbnRzIGFyZSB6ZXJvLXByZXNzdXJlIHBlbiBldmVudHMgd2l0aCB0aGUgcHJpbWFyeSBiaXQgd2hpbGUgdGhlIGJhcnJlbCBpcyBoZWxkLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzaWZ5UGVuRXZlbnQoXG4gIGV2ZW50OiB7IHBvaW50ZXJUeXBlOiBzdHJpbmc7IHByZXNzdXJlOiBudW1iZXI7IGJ1dHRvbnM6IG51bWJlcjsgdHlwZTogc3RyaW5nIH0sXG4gIGhlbGQ6IGJvb2xlYW5cbik6IFBlblBoYXNlIHtcbiAgY29uc3QgaG92ZXJQcmVzc3VyZSA9IGV2ZW50LnByZXNzdXJlIDwgMC4wMTtcbiAgY29uc3QgYnV0dG9uVHlwZSA9XG4gICAgZXZlbnQudHlwZSA9PT0gXCJwb2ludGVyZG93blwiIHx8IGV2ZW50LnR5cGUgPT09IFwicG9pbnRlcm1vdmVcIiB8fCBldmVudC50eXBlID09PSBcInBvaW50ZXJ1cFwiO1xuICBpZiAoXG4gICAgZXZlbnQucG9pbnRlclR5cGUgPT09IFwicGVuXCIgJiZcbiAgICBob3ZlclByZXNzdXJlICYmXG4gICAgKGV2ZW50LmJ1dHRvbnMgJiAxKSAhPT0gMCAmJlxuICAgIGJ1dHRvblR5cGUgJiZcbiAgICBoZWxkXG4gICkge1xuICAgIHJldHVybiBcImhvdmVyLWJ1dHRvblwiO1xuICB9XG4gIGlmIChldmVudC5wb2ludGVyVHlwZSA9PT0gXCJwZW5cIiAmJiAoZXZlbnQudHlwZSA9PT0gXCJwb2ludGVyZG93blwiIHx8IGV2ZW50LnByZXNzdXJlID49IDAuMDEpKSB7XG4gICAgcmV0dXJuIFwiY29udGFjdFwiO1xuICB9XG4gIHJldHVybiBcImhvdmVyXCI7XG59XG5cbmNvbnN0IGV2ZW50S2luZHM6IFJlY29yZDxzdHJpbmcsIFN0eWx1c0V2ZW50S2luZD4gPSB7XG4gIHBvaW50ZXJkb3duOiBcImRvd25cIixcbiAgcG9pbnRlcm1vdmU6IFwibW92ZVwiLFxuICBwb2ludGVydXA6IFwidXBcIixcbiAgcG9pbnRlcmNhbmNlbDogXCJjYW5jZWxcIixcbiAgY29udGV4dG1lbnU6IFwiY29udGV4dG1lbnVcIixcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVQb2ludGVyRXZlbnQoXG4gIGV2ZW50OiBQb2ludGVyRXZlbnQsXG4gIGlzQ2FudmFzVGFyZ2V0OiBib29sZWFuXG4pOiBOb3JtYWxpemVkU3R5bHVzRXZlbnQge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IGV2ZW50S2luZHNbZXZlbnQudHlwZV0gPz8gXCJtb3ZlXCIsXG4gICAgcG9pbnRlclR5cGU6IGV2ZW50LnBvaW50ZXJUeXBlLFxuICAgIHBvaW50ZXJJZDogZXZlbnQucG9pbnRlcklkLFxuICAgIGJ1dHRvbnM6IGV2ZW50LmJ1dHRvbnMsXG4gICAgYnV0dG9uOiBldmVudC5idXR0b24sXG4gICAgcHJlc3N1cmU6IGV2ZW50LnByZXNzdXJlLFxuICAgIHRhbmdlbnRpYWxQcmVzc3VyZTogZXZlbnQudGFuZ2VudGlhbFByZXNzdXJlLFxuICAgIHRpbHRYOiBldmVudC50aWx0WCxcbiAgICB0aWx0WTogZXZlbnQudGlsdFksXG4gICAgdHdpc3Q6IGV2ZW50LnR3aXN0LFxuICAgIHdpZHRoOiBldmVudC53aWR0aCxcbiAgICBoZWlnaHQ6IGV2ZW50LmhlaWdodCxcbiAgICB4OiBldmVudC5jbGllbnRYLFxuICAgIHk6IGV2ZW50LmNsaWVudFksXG4gICAgdGltZXN0YW1wOiBldmVudC50aW1lU3RhbXAsXG4gICAgaXNDYW52YXNUYXJnZXQsXG4gIH07XG59XG4iLCAiaW1wb3J0IHR5cGUge1xuICBCYXJyZWxTb3VyY2UsXG4gIEV4dGVybmFsQnV0dG9uSW5wdXQsXG4gIEdlc3R1cmVFZmZlY3QsXG4gIEdlc3R1cmVTZXR0aW5ncyxcbiAgR2VzdHVyZVN0YXRlU25hcHNob3QsXG4gIE5vcm1hbGl6ZWRTdHlsdXNFdmVudCxcbiAgUG9pbnQsXG4gIFNjaGVkdWxlcixcbn0gZnJvbSBcIi4vdHlwZXNcIjtcblxuaW50ZXJmYWNlIFBlbmRpbmdUYXAge1xuICBwb2ludDogUG9pbnQ7XG4gIHRpbWVyOiB1bmtub3duO1xufVxuXG5pbnRlcmZhY2UgUmVjZW50Q29udGFjdCB7XG4gIHN0YXJ0ZWRBdDogbnVtYmVyO1xuICBlbmRlZEF0OiBudW1iZXI7XG4gIHBvaW50OiBQb2ludDtcbiAgbW92ZWQ6IGJvb2xlYW47XG4gIGJhcnJlbDogYm9vbGVhbjtcbn1cblxuY29uc3QgQ09OVEVYVF9NRU5VX0dSQUNFX01TID0gNTAwO1xuLyoqIEEgYmFycmVsIHByZXNzIHRoaXMgbG9uZyBiZWZvcmUgdGhlIHRhcCBzdGlsbCBiZWxvbmdzIHRvIHRoYXQgdGFwIHdoZW4gdGhlIHBhY2tldCBpcyBsYXRlLiAqL1xuY29uc3QgTEFURV9QUkVTU19MRUFEX01TID0gMzAwO1xuY29uc3QgQ0xPQ0tfU0tFV19NUyA9IDIwO1xuXG4vKiogUHVyZSBwZXItdmlldyBTIFBlbiBnZXN0dXJlIHBvbGljeS4gSXQgbmV2ZXIgdG91Y2hlcyB0aGUgRE9NIG9yIEV4Y2FsaWRyYXcuICovXG5leHBvcnQgY2xhc3MgU3R5bHVzR2VzdHVyZU1hY2hpbmUge1xuICBwcml2YXRlIGJhcnJlbEJ1dHRvbkhlbGQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBwZW5Db250YWN0ID0gZmFsc2U7XG4gIHByaXZhdGUgY29uc3VtZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBtb3ZlZCA9IGZhbHNlO1xuICBwcml2YXRlIGhvbGRGaXJlZCA9IGZhbHNlO1xuICBwcml2YXRlIHRlbXBvcmFyeVRvb2xBY3RpdmUgPSBmYWxzZTtcbiAgcHJpdmF0ZSBwcmVzc09yaWdpbjogUG9pbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwZW5kaW5nVGFwOiBQZW5kaW5nVGFwIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgYWN0aXZlUG9pbnRlcklkOiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBiYXJyZWxTb3VyY2U6IEJhcnJlbFNvdXJjZSA9IFwicG9pbnRlclwiO1xuICBwcml2YXRlIGNvbnRhY3RTdGFydGVkQXQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGNvbnRhY3RPcmlnaW46IFBvaW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY29udGFjdE1vdmVkID0gZmFsc2U7XG4gIHByaXZhdGUgYmFycmVsQ29udGFjdCA9IGZhbHNlO1xuICBwcml2YXRlIGJhcnJlbEF0RG93biA9IGZhbHNlO1xuICBwcml2YXRlIGNvbnRleHRNZW51VW50aWwgPSAtMTtcbiAgcHJpdmF0ZSBwcmVzc1N0YXJ0ZWRBdDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbGFzdFBvaW50OiBQb2ludCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHJlbGVhc2VBZnRlckNvbnRhY3QgPSBmYWxzZTtcbiAgcHJpdmF0ZSByZWNlbnRDb250YWN0OiBSZWNlbnRDb250YWN0IHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogR2VzdHVyZVNldHRpbmdzLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2NoZWR1bGVyOiBTY2hlZHVsZXJcbiAgKSB7fVxuXG4gIC8qKiBTd2l0Y2hpbmcgc291cmNlcyBtdXN0IG5vdCB0dXJuIGEgaGVsZCBiYXJyZWwgaW50byBhIHRhcC4gKi9cbiAgc2V0QmFycmVsU291cmNlKHNvdXJjZTogQmFycmVsU291cmNlKTogdm9pZCB7XG4gICAgaWYgKHNvdXJjZSA9PT0gdGhpcy5iYXJyZWxTb3VyY2UpIHJldHVybjtcbiAgICBpZiAodGhpcy5iYXJyZWxCdXR0b25IZWxkKSB0aGlzLmNhbmNlbFByZXNzKCk7XG4gICAgdGhpcy5iYXJyZWxTb3VyY2UgPSBzb3VyY2U7XG4gICAgdGhpcy5yZWxlYXNlQWZ0ZXJDb250YWN0ID0gZmFsc2U7XG4gIH1cblxuICBoYW5kbGUoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IEdlc3R1cmVFZmZlY3RbXSB7XG4gICAgaWYgKGV2ZW50LnBvaW50ZXJUeXBlICE9PSBcInBlblwiKSByZXR1cm4gW107XG4gICAgdGhpcy5sYXN0UG9pbnQgPSB7IHg6IGV2ZW50LngsIHk6IGV2ZW50LnkgfTtcbiAgICBjb25zdCBlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10gPSBbXTtcbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJjb250ZXh0bWVudVwiKSB7XG4gICAgICBpZiAodGhpcy5zaG91bGRTd2FsbG93Q29udGV4dE1lbnUoZXZlbnQpKSBlZmZlY3RzLnB1c2goeyB0eXBlOiBcInN1cHByZXNzLWNvbnRleHQtbWVudVwiIH0pO1xuICAgICAgcmV0dXJuIGVmZmVjdHM7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwiZG93blwiKSB7XG4gICAgICB0aGlzLmNvbnRhY3RTdGFydGVkQXQgPSBldmVudC50aW1lc3RhbXA7XG4gICAgICB0aGlzLmNvbnRhY3RPcmlnaW4gPSB7IHg6IGV2ZW50LngsIHk6IGV2ZW50LnkgfTtcbiAgICAgIHRoaXMuY29udGFjdE1vdmVkID0gZmFsc2U7XG4gICAgICB0aGlzLmJhcnJlbENvbnRhY3QgPSBmYWxzZTtcbiAgICAgIGlmICh0aGlzLmJhcnJlbFNvdXJjZSAhPT0gXCJicmlkZ2VcIikge1xuICAgICAgICBpZiAoIXRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiB0aGlzLmNhblJlY29nbml6ZUJhcnJlbE9uQ29udGFjdChldmVudCkpXG4gICAgICAgICAgdGhpcy5zdGFydFByZXNzKGV2ZW50LCBldmVudC50aW1lc3RhbXApO1xuICAgICAgfVxuICAgICAgdGhpcy5iYXJyZWxBdERvd24gPSB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQ7XG4gICAgICB0aGlzLnBlbkNvbnRhY3QgPSB0cnVlO1xuICAgICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBldmVudC5wb2ludGVySWQ7XG4gICAgICBpZiAodGhpcy5iYXJyZWxCdXR0b25IZWxkKSB0aGlzLmNvbnN1bWVGb3JDb250YWN0KGV2ZW50LCBlZmZlY3RzKTtcbiAgICAgIHJldHVybiBlZmZlY3RzO1xuICAgIH1cblxuICAgIGlmIChldmVudC5raW5kID09PSBcInVwXCIgfHwgZXZlbnQua2luZCA9PT0gXCJjYW5jZWxcIikge1xuICAgICAgaWYgKHRoaXMuYWN0aXZlUG9pbnRlcklkICE9PSBudWxsICYmIGV2ZW50LnBvaW50ZXJJZCAhPT0gdGhpcy5hY3RpdmVQb2ludGVySWQpIHJldHVybiBlZmZlY3RzO1xuICAgICAgY29uc3Qgc3RhcnRlZEF0ID0gdGhpcy5jb250YWN0U3RhcnRlZEF0ID8/IGV2ZW50LnRpbWVzdGFtcDtcbiAgICAgIGNvbnN0IHBvaW50ID0gdGhpcy5jb250YWN0T3JpZ2luID8/IHsgeDogZXZlbnQueCwgeTogZXZlbnQueSB9O1xuICAgICAgY29uc3QgbW92ZWQgPSB0aGlzLmNvbnRhY3RNb3ZlZDtcbiAgICAgIGNvbnN0IGJhcnJlbENvbnRhY3QgPSB0aGlzLmJhcnJlbENvbnRhY3Q7XG4gICAgICBjb25zdCBiYXJyZWxBdERvd24gPSB0aGlzLmJhcnJlbEF0RG93bjtcbiAgICAgIHRoaXMucGVuQ29udGFjdCA9IGZhbHNlO1xuICAgICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBudWxsO1xuICAgICAgdGhpcy5jb250YWN0U3RhcnRlZEF0ID0gbnVsbDtcbiAgICAgIHRoaXMuY29udGFjdE9yaWdpbiA9IG51bGw7XG4gICAgICB0aGlzLmNvbnRhY3RNb3ZlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5iYXJyZWxDb250YWN0ID0gZmFsc2U7XG4gICAgICB0aGlzLmJhcnJlbEF0RG93biA9IGZhbHNlO1xuICAgICAgaWYgKHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkge1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJ0ZW1wb3JhcnktdG9vbC1lbmRcIiB9KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGVyYXNlVGhpc0NvbnRhY3QgPVxuICAgICAgICBiYXJyZWxBdERvd24gfHwgKGJhcnJlbENvbnRhY3QgJiYgdGhpcy5zZXR0aW5ncy5taWRTdHJva2VQcmVzcyAhPT0gXCJuZXh0LWNvbnRhY3RcIik7XG4gICAgICBpZiAoXG4gICAgICAgIGV2ZW50LmtpbmQgPT09IFwidXBcIiAmJlxuICAgICAgICBlcmFzZVRoaXNDb250YWN0ICYmXG4gICAgICAgICFtb3ZlZCAmJlxuICAgICAgICB0aGlzLnNldHRpbmdzLmJ1dHRvbkNvbnRhY3RBY3Rpb24gPT09IFwiZXJhc2VyXCJcbiAgICAgICkge1xuICAgICAgICBlZmZlY3RzLnB1c2goeyB0eXBlOiBcImVyYXNlLXRhcFwiLCBwb2ludCB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChldmVudC5raW5kID09PSBcInVwXCIgJiYgYmFycmVsQ29udGFjdCkgdGhpcy5hcm1Db250ZXh0TWVudShldmVudC50aW1lc3RhbXApO1xuICAgICAgaWYgKGV2ZW50LmtpbmQgPT09IFwidXBcIikge1xuICAgICAgICB0aGlzLnJlY2VudENvbnRhY3QgPSB7XG4gICAgICAgICAgc3RhcnRlZEF0LFxuICAgICAgICAgIGVuZGVkQXQ6IGV2ZW50LnRpbWVzdGFtcCxcbiAgICAgICAgICBwb2ludCxcbiAgICAgICAgICBtb3ZlZCxcbiAgICAgICAgICBiYXJyZWw6IGJhcnJlbENvbnRhY3QsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJjYW5jZWxcIikgdGhpcy5jYW5jZWxQcmVzcygpO1xuICAgICAgZWxzZSBpZiAodGhpcy5iYXJyZWxTb3VyY2UgPT09IFwiYnJpZGdlXCIpIHtcbiAgICAgICAgaWYgKHRoaXMucmVsZWFzZUFmdGVyQ29udGFjdCkge1xuICAgICAgICAgIHRoaXMucmVsZWFzZUFmdGVyQ29udGFjdCA9IGZhbHNlO1xuICAgICAgICAgIHRoaXMucmVsZWFzZVByZXNzKGVmZmVjdHMsIGV2ZW50LnRpbWVzdGFtcCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMuaG92ZXJMYXRjaCgpICYmICF0aGlzLmlzQmFycmVsSGVsZChldmVudCkpXG4gICAgICAgIHRoaXMucmVsZWFzZVByZXNzKGVmZmVjdHMsIGV2ZW50LnRpbWVzdGFtcCk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wZW5Db250YWN0KSB7XG4gICAgICB0aGlzLnRyYWNrQ29udGFjdE1vdmVtZW50KGV2ZW50KTtcbiAgICAgIHJldHVybiBlZmZlY3RzO1xuICAgIH1cbiAgICBpZiAodGhpcy5iYXJyZWxTb3VyY2UgPT09IFwiYnJpZGdlXCIpIHtcbiAgICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQpIHRoaXMudHJhY2tIb3Zlck1vdmVtZW50KGV2ZW50KTtcbiAgICAgIHJldHVybiBlZmZlY3RzO1xuICAgIH1cbiAgICBjb25zdCBoZWxkTm93ID0gdGhpcy5pc0JhcnJlbEhlbGQoZXZlbnQpO1xuICAgIGlmICghdGhpcy5iYXJyZWxCdXR0b25IZWxkICYmIGhlbGROb3cpIHRoaXMuc3RhcnRQcmVzcyhldmVudCwgZXZlbnQudGltZXN0YW1wKTtcbiAgICBpZiAodGhpcy5iYXJyZWxCdXR0b25IZWxkICYmIGhlbGROb3cpIHRoaXMudHJhY2tIb3Zlck1vdmVtZW50KGV2ZW50KTtcbiAgICBpZiAodGhpcy5iYXJyZWxCdXR0b25IZWxkICYmICFoZWxkTm93KSB0aGlzLnJlbGVhc2VQcmVzcyhlZmZlY3RzLCBldmVudC50aW1lc3RhbXApO1xuICAgIHJldHVybiBlZmZlY3RzO1xuICB9XG5cbiAgaGFuZGxlRXh0ZXJuYWxCdXR0b24oaW5wdXQ6IEV4dGVybmFsQnV0dG9uSW5wdXQpOiBHZXN0dXJlRWZmZWN0W10ge1xuICAgIGlmICh0aGlzLmJhcnJlbFNvdXJjZSAhPT0gXCJicmlkZ2VcIikgcmV0dXJuIFtdO1xuICAgIGlmIChpbnB1dC5kb3duKSB7XG4gICAgICBpZiAodGhpcy5iYXJyZWxCdXR0b25IZWxkKSByZXR1cm4gW107XG4gICAgICBpZiAoIXRoaXMucGVuQ29udGFjdCkge1xuICAgICAgICBjb25zdCBsYXRlID0gdGhpcy5jbGFpbUxhdGVUYXAoaW5wdXQucHJlc3NlZEF0KTtcbiAgICAgICAgaWYgKGxhdGUpIHJldHVybiBsYXRlO1xuICAgICAgICB0aGlzLnN0YXJ0UHJlc3ModGhpcy5wb2ludE9mKHRoaXMubGFzdFBvaW50KSwgaW5wdXQucHJlc3NlZEF0KTtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuICAgICAgdGhpcy5iYXJyZWxCdXR0b25IZWxkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY29uc3VtZWQgPSB0cnVlO1xuICAgICAgdGhpcy5iYXJyZWxDb250YWN0ID0gdGhpcy5zZXR0aW5ncy5idXR0b25Db250YWN0QWN0aW9uID09PSBcImVyYXNlclwiO1xuICAgICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgICBpZiAodGhpcy5zZXR0aW5ncy5idXR0b25Db250YWN0QWN0aW9uICE9PSBcImVyYXNlclwiIHx8IHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkgcmV0dXJuIFtdO1xuICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubWlkU3Ryb2tlUHJlc3MgPT09IFwibmV4dC1jb250YWN0XCIpIHJldHVybiBbXTtcbiAgICAgIGNvbnN0IGxhdGUgPVxuICAgICAgICB0aGlzLmNvbnRhY3RTdGFydGVkQXQgIT09IG51bGwgJiZcbiAgICAgICAgaW5wdXQucHJlc3NlZEF0IDw9IHRoaXMuY29udGFjdFN0YXJ0ZWRBdCArIHRoaXMuc2V0dGluZ3MubGF0ZVdpbmRvd01zO1xuICAgICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gdHJ1ZTtcbiAgICAgIHJldHVybiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiBcInRlbXBvcmFyeS10b29sLXNwbGl0XCIsXG4gICAgICAgICAgcG9pbnQ6IHRoaXMucG9pbnRPZih0aGlzLmxhc3RQb2ludCksXG4gICAgICAgICAgZGlzY2FyZFN0cm9rZTogbGF0ZSxcbiAgICAgICAgfSxcbiAgICAgIF07XG4gICAgfVxuICAgIGlmICghdGhpcy5iYXJyZWxCdXR0b25IZWxkKSByZXR1cm4gW107XG4gICAgaWYgKHRoaXMucGVuQ29udGFjdCkge1xuICAgICAgdGhpcy5yZWxlYXNlQWZ0ZXJDb250YWN0ID0gdHJ1ZTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdID0gW107XG4gICAgdGhpcy5yZWxlYXNlUHJlc3MoZWZmZWN0cywgaW5wdXQucHJlc3NlZEF0KTtcbiAgICByZXR1cm4gZWZmZWN0cztcbiAgfVxuXG4gIGRpc3Bvc2UoKTogR2VzdHVyZUVmZmVjdFtdIHtcbiAgICBjb25zdCBlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10gPSBbXTtcbiAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICBpZiAodGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlKSBlZmZlY3RzLnB1c2goeyB0eXBlOiBcInRlbXBvcmFyeS10b29sLWVuZFwiIH0pO1xuICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcbiAgICByZXR1cm4gZWZmZWN0cztcbiAgfVxuXG4gIHNuYXBzaG90KCk6IEdlc3R1cmVTdGF0ZVNuYXBzaG90IHtcbiAgICByZXR1cm4ge1xuICAgICAgYmFycmVsQnV0dG9uSGVsZDogdGhpcy5iYXJyZWxCdXR0b25IZWxkLFxuICAgICAgcGVuQ29udGFjdDogdGhpcy5wZW5Db250YWN0LFxuICAgICAgZ2VzdHVyZUNvbnN1bWVkOiB0aGlzLmNvbnN1bWVkLFxuICAgICAgdGVtcG9yYXJ5VG9vbEFjdGl2ZTogdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlLFxuICAgICAgaG92ZXJHZXN0dXJlTW92ZWQ6IHRoaXMubW92ZWQsXG4gICAgICBsb25nUHJlc3NGaXJlZDogdGhpcy5ob2xkRmlyZWQsXG4gICAgICBhY3RpdmVQb2ludGVySWQ6IHRoaXMuYWN0aXZlUG9pbnRlcklkLFxuICAgIH07XG4gIH1cblxuICAvKiogVGhlIGNvbnRyb2xsZXIgY2FsbHMgdGhpcyB3aGVuIHRoZSBvcHRpb25hbCBFeGNhbGlkcmF3IGJyaWRnZSByZWplY3RzIGEgc3RhcnQgcmVxdWVzdC4gKi9cbiAgdGVtcG9yYXJ5VG9vbERpZE5vdFN0YXJ0KCk6IHZvaWQge1xuICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGFydFByZXNzKG9yaWdpbjogTm9ybWFsaXplZFN0eWx1c0V2ZW50IHwgUG9pbnQsIGF0OiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBwb2ludCA9IFwia2luZFwiIGluIG9yaWdpbiA/IHsgeDogb3JpZ2luLngsIHk6IG9yaWdpbi55IH0gOiBvcmlnaW47XG4gICAgdGhpcy5iYXJyZWxCdXR0b25IZWxkID0gdHJ1ZTtcbiAgICB0aGlzLmNvbnN1bWVkID0gZmFsc2U7XG4gICAgdGhpcy5tb3ZlZCA9IGZhbHNlO1xuICAgIHRoaXMuaG9sZEZpcmVkID0gZmFsc2U7XG4gICAgdGhpcy5wcmVzc09yaWdpbiA9IHBvaW50O1xuICAgIHRoaXMucHJlc3NTdGFydGVkQXQgPSBhdDtcbiAgfVxuXG4gIC8qKiBDb250cm9sbGVyIHJlZ2lzdGVycyB0aGlzIHNvIHNjaGVkdWxlciBjYWxsYmFja3MgcmV0YWluIHB1cmUgc2VtYW50aWMgb3V0cHV0LiAqL1xuICBwcml2YXRlIG9uRWZmZWN0OiAoKGVmZmVjdDogR2VzdHVyZUVmZmVjdCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgc2V0RWZmZWN0U2luayhzaW5rOiAoZWZmZWN0OiBHZXN0dXJlRWZmZWN0KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5vbkVmZmVjdCA9IHNpbms7XG4gIH1cblxuICBwcml2YXRlIHRyYWNrQ29udGFjdE1vdmVtZW50KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29udGFjdE9yaWdpbiB8fCB0aGlzLmNvbnRhY3RNb3ZlZCkgcmV0dXJuO1xuICAgIGNvbnN0IGR4ID0gZXZlbnQueCAtIHRoaXMuY29udGFjdE9yaWdpbi54O1xuICAgIGNvbnN0IGR5ID0gZXZlbnQueSAtIHRoaXMuY29udGFjdE9yaWdpbi55O1xuICAgIGlmIChNYXRoLmh5cG90KGR4LCBkeSkgPiB0aGlzLnNldHRpbmdzLm1vdmVtZW50VGhyZXNob2xkUHgpIHRoaXMuY29udGFjdE1vdmVkID0gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgdHJhY2tIb3Zlck1vdmVtZW50KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMucHJlc3NPcmlnaW4gfHwgdGhpcy5tb3ZlZCkgcmV0dXJuO1xuICAgIGNvbnN0IGR4ID0gZXZlbnQueCAtIHRoaXMucHJlc3NPcmlnaW4ueDtcbiAgICBjb25zdCBkeSA9IGV2ZW50LnkgLSB0aGlzLnByZXNzT3JpZ2luLnk7XG4gICAgaWYgKE1hdGguaHlwb3QoZHgsIGR5KSA+IHRoaXMuc2V0dGluZ3MubW92ZW1lbnRUaHJlc2hvbGRQeCkgdGhpcy5tb3ZlZCA9IHRydWU7XG4gIH1cblxuICBwcml2YXRlIGNvbnN1bWVGb3JDb250YWN0KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQsIGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSk6IHZvaWQge1xuICAgIHRoaXMuY29uc3VtZWQgPSB0cnVlO1xuICAgIHRoaXMuYmFycmVsQ29udGFjdCA9IHRoaXMuc2V0dGluZ3MuYnV0dG9uQ29udGFjdEFjdGlvbiA9PT0gXCJlcmFzZXJcIjtcbiAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5idXR0b25Db250YWN0QWN0aW9uID09PSBcImVyYXNlclwiICYmICF0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUpIHtcbiAgICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IHRydWU7XG4gICAgICBlZmZlY3RzLnB1c2goeyB0eXBlOiBcInRlbXBvcmFyeS10b29sLXN0YXJ0XCIsIHBvaW50OiB7IHg6IGV2ZW50LngsIHk6IGV2ZW50LnkgfSB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbGVhc2VQcmVzcyhlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10sIGF0OiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBlbGFwc2VkID0gdGhpcy5wcmVzc1N0YXJ0ZWRBdCA9PT0gbnVsbCA/IDAgOiBhdCAtIHRoaXMucHJlc3NTdGFydGVkQXQ7XG4gICAgY29uc3QgaGVsZExvbmcgPSBlbGFwc2VkID49IHRoaXMuc2V0dGluZ3MubG9uZ1ByZXNzTXM7XG4gICAgdGhpcy5iYXJyZWxCdXR0b25IZWxkID0gZmFsc2U7XG4gICAgdGhpcy5wcmVzc1N0YXJ0ZWRBdCA9IG51bGw7XG4gICAgaWYgKCF0aGlzLmNvbnN1bWVkICYmICF0aGlzLm1vdmVkICYmICF0aGlzLmhvbGRGaXJlZCAmJiB0aGlzLnByZXNzT3JpZ2luICYmIGhlbGRMb25nKSB7XG4gICAgICB0aGlzLmhvbGRGaXJlZCA9IHRydWU7XG4gICAgICB0aGlzLmNvbnN1bWVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJidXR0b24taG9sZFwiLCBwb2ludDogdGhpcy5wcmVzc09yaWdpbiB9KTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLmNvbnN1bWVkICYmICF0aGlzLm1vdmVkICYmICF0aGlzLmhvbGRGaXJlZCAmJiB0aGlzLnByZXNzT3JpZ2luKSB7XG4gICAgICBpZiAodGhpcy5wZW5kaW5nVGFwKSB7XG4gICAgICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgICAgICBlZmZlY3RzLnB1c2goeyB0eXBlOiBcImJ1dHRvbi1kb3VibGUtdGFwXCIsIHBvaW50OiB0aGlzLnByZXNzT3JpZ2luIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcG9pbnQgPSB0aGlzLnByZXNzT3JpZ2luO1xuICAgICAgICBjb25zdCB0aW1lciA9IHRoaXMuc2NoZWR1bGVyLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMucGVuZGluZ1RhcCA9IG51bGw7XG4gICAgICAgICAgdGhpcy5vbkVmZmVjdD8uKHsgdHlwZTogXCJidXR0b24tdGFwXCIsIHBvaW50IH0pO1xuICAgICAgICB9LCB0aGlzLnNldHRpbmdzLmRvdWJsZVRhcE1zKTtcbiAgICAgICAgdGhpcy5wZW5kaW5nVGFwID0geyBwb2ludCwgdGltZXIgfTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5wcmVzc09yaWdpbiA9IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGNhbmNlbFByZXNzKCk6IHZvaWQge1xuICAgIHRoaXMuYmFycmVsQnV0dG9uSGVsZCA9IGZhbHNlO1xuICAgIHRoaXMucGVuQ29udGFjdCA9IGZhbHNlO1xuICAgIHRoaXMuY29uc3VtZWQgPSBmYWxzZTtcbiAgICB0aGlzLm1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5ob2xkRmlyZWQgPSBmYWxzZTtcbiAgICB0aGlzLnByZXNzT3JpZ2luID0gbnVsbDtcbiAgICB0aGlzLnByZXNzU3RhcnRlZEF0ID0gbnVsbDtcbiAgICB0aGlzLmNvbnRhY3RPcmlnaW4gPSBudWxsO1xuICAgIHRoaXMuY29udGFjdE1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5iYXJyZWxDb250YWN0ID0gZmFsc2U7XG4gICAgdGhpcy5iYXJyZWxBdERvd24gPSBmYWxzZTtcbiAgICB0aGlzLnJlY2VudENvbnRhY3QgPSBudWxsO1xuICAgIHRoaXMuYWN0aXZlUG9pbnRlcklkID0gbnVsbDtcbiAgICB0aGlzLnJlbGVhc2VBZnRlckNvbnRhY3QgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIGJhcnJlbCBwYWNrZXQgY2FuIGFycml2ZSBhZnRlciB0aGUgdGFwIGl0IGJlbG9uZ3MgdG8uIENsYWltIGl0IG9ubHkgd2hlblxuICAgKiB0aGUgcHJlc3MgdGltZSBvdmVybGFwcyB0aGF0IGNvbnRhY3QsIHNvIGEgbGF0ZXIgaG92ZXIgY2xpY2sgc3RpbGwgb3BlbnNcbiAgICogdGhlIG1lbnUuXG4gICAqL1xuICBwcml2YXRlIGNsYWltTGF0ZVRhcChwcmVzc2VkQXQ6IG51bWJlcik6IEdlc3R1cmVFZmZlY3RbXSB8IG51bGwge1xuICAgIGNvbnN0IHJlY2VudCA9IHRoaXMucmVjZW50Q29udGFjdDtcbiAgICBpZiAoIXJlY2VudCB8fCByZWNlbnQuYmFycmVsKSByZXR1cm4gbnVsbDtcbiAgICBpZiAocHJlc3NlZEF0IDwgcmVjZW50LnN0YXJ0ZWRBdCAtIExBVEVfUFJFU1NfTEVBRF9NUykgcmV0dXJuIG51bGw7XG4gICAgaWYgKHByZXNzZWRBdCA+IHJlY2VudC5lbmRlZEF0ICsgQ0xPQ0tfU0tFV19NUykgcmV0dXJuIG51bGw7XG4gICAgcmVjZW50LmJhcnJlbCA9IHRydWU7XG4gICAgdGhpcy5iYXJyZWxCdXR0b25IZWxkID0gdHJ1ZTtcbiAgICB0aGlzLmNvbnN1bWVkID0gdHJ1ZTtcbiAgICB0aGlzLnByZXNzT3JpZ2luID0gcmVjZW50LnBvaW50O1xuICAgIHRoaXMucHJlc3NTdGFydGVkQXQgPSBwcmVzc2VkQXQ7XG4gICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgdGhpcy5hcm1Db250ZXh0TWVudShyZWNlbnQuZW5kZWRBdCk7XG4gICAgaWYgKHJlY2VudC5tb3ZlZCB8fCB0aGlzLnNldHRpbmdzLmJ1dHRvbkNvbnRhY3RBY3Rpb24gIT09IFwiZXJhc2VyXCIpIHJldHVybiBbXTtcbiAgICByZXR1cm4gW3sgdHlwZTogXCJlcmFzZS10YXBcIiwgcG9pbnQ6IHJlY2VudC5wb2ludCB9XTtcbiAgfVxuXG4gIHByaXZhdGUgc2hvdWxkU3dhbGxvd0NvbnRleHRNZW51KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiBib29sZWFuIHtcbiAgICBpZiAoZXZlbnQuYnV0dG9uID09PSAyKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAodGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlIHx8IHRoaXMuYmFycmVsQ29udGFjdCkgcmV0dXJuIHRydWU7XG4gICAgaWYgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiB0aGlzLnBlbkNvbnRhY3QpIHJldHVybiB0cnVlO1xuICAgIHJldHVybiBldmVudC50aW1lc3RhbXAgPD0gdGhpcy5jb250ZXh0TWVudVVudGlsO1xuICB9XG5cbiAgcHJpdmF0ZSBhcm1Db250ZXh0TWVudShhdDogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZXh0TWVudVVudGlsID0gTWF0aC5tYXgodGhpcy5jb250ZXh0TWVudVVudGlsLCBhdCArIENPTlRFWFRfTUVOVV9HUkFDRV9NUyk7XG4gIH1cblxuICBwcml2YXRlIGNhbmNlbFBlbmRpbmdUYXAoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucGVuZGluZ1RhcCkgdGhpcy5zY2hlZHVsZXIuY2xlYXJUaW1lb3V0KHRoaXMucGVuZGluZ1RhcC50aW1lcik7XG4gICAgdGhpcy5wZW5kaW5nVGFwID0gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgaXNCYXJyZWxIZWxkKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKGV2ZW50LmJ1dHRvbnMgJiB0aGlzLnNldHRpbmdzLmJhcnJlbEJ1dHRvbk1hc2spICE9PSAwO1xuICB9XG5cbiAgcHJpdmF0ZSBjYW5SZWNvZ25pemVCYXJyZWxPbkNvbnRhY3QoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAoXG4gICAgICAodGhpcy5zZXR0aW5ncy5iYXJyZWxCdXR0b25NYXNrICE9PSAxIHx8XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucHJpbWFyeUNvbnRhY3RNb2RlID09PSBcImV4cGVyaW1lbnRhbFwiKSAmJlxuICAgICAgdGhpcy5pc0JhcnJlbEhlbGQoZXZlbnQpXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgaG92ZXJMYXRjaCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpcy5iYXJyZWxTb3VyY2UgPT09IFwicG9pbnRlclwiICYmXG4gICAgICB0aGlzLnNldHRpbmdzLmJhcnJlbEJ1dHRvbk1hc2sgPT09IDEgJiZcbiAgICAgIHRoaXMuc2V0dGluZ3MucHJpbWFyeUNvbnRhY3RNb2RlID09PSBcImhvdmVyLW9ubHlcIlxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIHBvaW50T2YocG9pbnQ6IFBvaW50IHwgbnVsbCk6IFBvaW50IHtcbiAgICByZXR1cm4gcG9pbnQgPyB7IHg6IHBvaW50LngsIHk6IHBvaW50LnkgfSA6IHsgeDogMCwgeTogMCB9O1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSB7IEV4Y2FsaWRyYXdCcmlkZ2UsIEFjdGl2ZVRvb2xTbmFwc2hvdCB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB0eXBlIHsgRGVidWdMb2dnZXIgfSBmcm9tIFwiLi4vZGVidWcvRGVidWdMb2dnZXJcIjtcbmltcG9ydCB7IERlYnVnT3ZlcmxheSB9IGZyb20gXCIuLi9kZWJ1Zy9EZWJ1Z092ZXJsYXlcIjtcbmltcG9ydCB0eXBlIHsgUGVuQnV0dG9uU2lnbmFsIH0gZnJvbSBcIi4uL3BlbmJyaWRnZS9QZW5CcmlkZ2VDbGllbnRcIjtcbmltcG9ydCB0eXBlIHsgUGVuU2lnbmFsSHViIH0gZnJvbSBcIi4uL3BlbmJyaWRnZS9QZW5TaWduYWxIdWJcIjtcbmltcG9ydCB7XG4gIGRlc2NyaWJlQmFycmVsU291cmNlLFxuICB0eXBlIFN0eWx1c0FjdGlvbixcbiAgdHlwZSBTdHlsdXNDb250cm9sc1NldHRpbmdzLFxufSBmcm9tIFwiLi4vc2V0dGluZ3Mvc2V0dGluZ3NcIjtcbmltcG9ydCB7IGlzU3ludGhldGljIH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvc3ludGhldGljUG9pbnRlclwiO1xuaW1wb3J0IHsgY2xhc3NpZnlQZW5FdmVudCwgbm9ybWFsaXplUG9pbnRlckV2ZW50IH0gZnJvbSBcIi4vbm9ybWFsaXplUG9pbnRlckV2ZW50XCI7XG5pbXBvcnQgeyBTdHlsdXNHZXN0dXJlTWFjaGluZSB9IGZyb20gXCIuL1N0eWx1c0dlc3R1cmVNYWNoaW5lXCI7XG5pbXBvcnQgdHlwZSB7IEdlc3R1cmVFZmZlY3QsIE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgUG9pbnQsIFNjaGVkdWxlciB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCB0eXBlIEFjdGlvbkhhbmRsZXIgPSAoYWN0aW9uOiBTdHlsdXNBY3Rpb24sIHBvaW50OiBQb2ludCwgYnJpZGdlOiBFeGNhbGlkcmF3QnJpZGdlKSA9PiB2b2lkO1xuXG5leHBvcnQgY2xhc3MgU3R5bHVzQ29udHJvbGxlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWFjaGluZTogU3R5bHVzR2VzdHVyZU1hY2hpbmU7XG4gIHByaXZhdGUgc2F2ZWRUb29sOiBBY3RpdmVUb29sU25hcHNob3QgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBkaXNwb3NlZCA9IGZhbHNlO1xuICBwcml2YXRlIGF0dGFjaGVkID0gZmFsc2U7XG4gIHByaXZhdGUgcmVhZG9ubHkgbGlzdGVuZXJzOiBBcnJheTxba2V5b2YgSFRNTEVsZW1lbnRFdmVudE1hcCwgRXZlbnRMaXN0ZW5lcl0+ID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgb3ZlcmxheTogRGVidWdPdmVybGF5O1xuICBwcml2YXRlIGxhdGVzdEV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBsYXN0UGVuRXZlbnQ6IFBvaW50ZXJFdmVudCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGxhc3RQb2ludGVyV2FzUGVuID0gZmFsc2U7XG4gIHByaXZhdGUgcHJpb3JTY2VuZUlkczogUmVhZG9ubHlTZXQ8c3RyaW5nPiB8IG51bGwgPSBudWxsO1xuICBsYXN0UGVuQWN0aXZpdHlBdCA9IDA7XG4gIHByaXZhdGUgbGFzdExhdGVuY3k6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGVhZjogV29ya3NwYWNlTGVhZixcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNldHRpbmdzOiAoKSA9PiBTdHlsdXNDb250cm9sc1NldHRpbmdzLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGVidWc6IERlYnVnTG9nZ2VyLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGlzcGF0Y2hBY3Rpb246IEFjdGlvbkhhbmRsZXIsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzY2hlZHVsZXI6IFNjaGVkdWxlciA9IHdpbmRvdyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBlbjogUGVuU2lnbmFsSHViIHwgbnVsbCA9IG51bGwsXG4gICAgcHJpdmF0ZSByZWFkb25seSBub3c6ICgpID0+IG51bWJlciA9ICgpID0+IHBlcmZvcm1hbmNlLm5vdygpXG4gICkge1xuICAgIHRoaXMubWFjaGluZSA9IG5ldyBTdHlsdXNHZXN0dXJlTWFjaGluZSh0aGlzLmdlc3R1cmVTZXR0aW5ncygpLCBzY2hlZHVsZXIpO1xuICAgIHRoaXMubWFjaGluZS5zZXRFZmZlY3RTaW5rKChlZmZlY3QpID0+IHRoaXMuYXBwbHlFZmZlY3QoZWZmZWN0KSk7XG4gICAgdGhpcy5vdmVybGF5ID0gbmV3IERlYnVnT3ZlcmxheShcbiAgICAgIHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLFxuICAgICAgKCkgPT4gdGhpcy5zZXR0aW5ncygpLmRlYnVnTW9kZSAmJiB0aGlzLnNldHRpbmdzKCkuZGVidWdPdmVybGF5XG4gICAgKTtcbiAgfVxuXG4gIGF0dGFjaCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCB8fCB0aGlzLmF0dGFjaGVkKSByZXR1cm47XG4gICAgdGhpcy5hdHRhY2hlZCA9IHRydWU7XG4gICAgdGhpcy5wZW4/LnJlZ2lzdGVyKHRoaXMpO1xuICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLmxlYWYudmlldy5jb250YWluZXJFbDtcbiAgICBmb3IgKGNvbnN0IHR5cGUgb2YgW1xuICAgICAgXCJwb2ludGVyZG93blwiLFxuICAgICAgXCJwb2ludGVybW92ZVwiLFxuICAgICAgXCJwb2ludGVydXBcIixcbiAgICAgIFwicG9pbnRlcmNhbmNlbFwiLFxuICAgICAgXCJjb250ZXh0bWVudVwiLFxuICAgIF0gYXMgY29uc3QpIHtcbiAgICAgIGNvbnN0IGxpc3RlbmVyOiBFdmVudExpc3RlbmVyID0gKHJhdykgPT4gdGhpcy5vblBvaW50ZXJFdmVudChyYXcgYXMgUG9pbnRlckV2ZW50KTtcbiAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgdHJ1ZSk7XG4gICAgICB0aGlzLmxpc3RlbmVycy5wdXNoKFt0eXBlLCBsaXN0ZW5lcl0pO1xuICAgIH1cbiAgfVxuXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZGlzcG9zZWQpIHJldHVybjtcbiAgICB0aGlzLmRpc3Bvc2VkID0gdHJ1ZTtcbiAgICB0aGlzLmF0dGFjaGVkID0gZmFsc2U7XG4gICAgdGhpcy5wZW4/LnVucmVnaXN0ZXIodGhpcyk7XG4gICAgZm9yIChjb25zdCBbdHlwZSwgbGlzdGVuZXJdIG9mIHRoaXMubGlzdGVuZXJzKVxuICAgICAgdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgdHJ1ZSk7XG4gICAgdGhpcy5saXN0ZW5lcnMubGVuZ3RoID0gMDtcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiB0aGlzLm1hY2hpbmUuZGlzcG9zZSgpKSB0aGlzLmFwcGx5RWZmZWN0KGVmZmVjdCk7XG4gICAgdGhpcy5vdmVybGF5LmNsb3NlKCk7XG4gIH1cbiAgZ2V0VHJhY2UoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5kZWJ1Zy5leHBvcnRUcmFjZSgpO1xuICB9XG4gIHJlY2VudE1lc3NhZ2VzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gdGhpcy5kZWJ1Zy5yZWNlbnRNZXNzYWdlcygpO1xuICB9XG4gIGxhc3RQZW5Qb2ludCgpOiBQb2ludCB8IG51bGwge1xuICAgIGlmICghdGhpcy5sYXRlc3RFdmVudCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHsgeDogdGhpcy5sYXRlc3RFdmVudC54LCB5OiB0aGlzLmxhdGVzdEV2ZW50LnkgfTtcbiAgfVxuICBicmlkZ2VGb3JNZW51KCk6IEV4Y2FsaWRyYXdCcmlkZ2Uge1xuICAgIHJldHVybiB0aGlzLmJyaWRnZTtcbiAgfVxuXG4gIG9uRXh0ZXJuYWxCdXR0b24oc2lnbmFsOiBQZW5CdXR0b25TaWduYWwpOiB2b2lkIHtcbiAgICBjb25zdCBsYXRlbmN5ID1cbiAgICAgIHNpZ25hbC5sYXRlbmN5TXMgPT09IG51bGwgPyBcInJlY2VpdmUtdGltZVwiIDogYCR7TWF0aC5yb3VuZChzaWduYWwubGF0ZW5jeU1zKX1tc2A7XG4gICAgdGhpcy5sYXN0TGF0ZW5jeSA9IGxhdGVuY3k7XG4gICAgdGhpcy5kZWJ1Zy5tZXNzYWdlKFxuICAgICAgYGJyaWRnZTogJHtzaWduYWwuZG93biA/IFwiZG93blwiIDogXCJ1cFwifSBzZXE9JHtzaWduYWwuc2VxfSBsYXRlbmN5PSR7bGF0ZW5jeX1gXG4gICAgKTtcbiAgICB0aGlzLm1hY2hpbmUuc2V0QmFycmVsU291cmNlKFwiYnJpZGdlXCIpO1xuICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIHRoaXMubWFjaGluZS5oYW5kbGVFeHRlcm5hbEJ1dHRvbih7XG4gICAgICBkb3duOiBzaWduYWwuZG93bixcbiAgICAgIHByZXNzZWRBdDogc2lnbmFsLnByZXNzZWRBdFBlcmYsXG4gICAgfSkpIHtcbiAgICAgIHRoaXMuYXBwbHlFZmZlY3QoZWZmZWN0KTtcbiAgICB9XG4gICAgdGhpcy5yZWZyZXNoT3ZlcmxheSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBvblBvaW50ZXJFdmVudChyYXc6IFBvaW50ZXJFdmVudCk6IHZvaWQge1xuICAgIGlmIChpc1N5bnRoZXRpYyhyYXcpKSByZXR1cm47XG4gICAgaWYgKHJhdy50eXBlID09PSBcImNvbnRleHRtZW51XCIpIHtcbiAgICAgIHRoaXMub25Db250ZXh0TWVudShyYXcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAocmF3LnBvaW50ZXJUeXBlICE9PSBcInBlblwiKSB7XG4gICAgICB0aGlzLmxhc3RQb2ludGVyV2FzUGVuID0gZmFsc2U7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMubGFzdFBvaW50ZXJXYXNQZW4gPSB0cnVlO1xuICAgIHRoaXMubGFzdFBlbkV2ZW50ID0gcmF3O1xuICAgIHRoaXMubGFzdFBlbkFjdGl2aXR5QXQgPSB0aGlzLm5vdygpO1xuICAgIGNvbnN0IGhlbGQgPSB0aGlzLmJhcnJlbEJlbGlldmVkSGVsZChyYXcpO1xuICAgIGNvbnN0IHBoYXNlID0gY2xhc3NpZnlQZW5FdmVudChyYXcsIGhlbGQpO1xuICAgIGlmIChwaGFzZSA9PT0gXCJob3Zlci1idXR0b25cIiAmJiB0aGlzLnNldHRpbmdzKCkuc3VwcHJlc3NIb3ZlckJ1dHRvbkV2ZW50cykge1xuICAgICAgaWYgKHR5cGVvZiByYXcuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uID09PSBcImZ1bmN0aW9uXCIpIHJhdy5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgIHJhdy5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgICBjb25zdCBldmVudCA9IG5vcm1hbGl6ZVBvaW50ZXJFdmVudChcbiAgICAgIHJhdyxcbiAgICAgIHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLmNvbnRhaW5zKHJhdy50YXJnZXQgYXMgTm9kZSlcbiAgICApO1xuICAgIGlmIChwaGFzZSA9PT0gXCJob3Zlci1idXR0b25cIikgZXZlbnQua2luZCA9IFwibW92ZVwiO1xuICAgIHRoaXMubGF0ZXN0RXZlbnQgPSBldmVudDtcbiAgICB0aGlzLmRlYnVnLmV2ZW50KGV2ZW50KTtcbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJkb3duXCIpIHRoaXMucHJpb3JTY2VuZUlkcyA9IHRoaXMuYnJpZGdlLmN1cnJlbnRTY2VuZUlkcygpO1xuICAgIHRoaXMubWFjaGluZS5zZXRCYXJyZWxTb3VyY2UodGhpcy5wZW4/LmlzUmVhZHkoKSA/IFwiYnJpZGdlXCIgOiBcInBvaW50ZXJcIik7XG4gICAgY29uc3QgZWZmZWN0cyA9IHRoaXMubWFjaGluZS5oYW5kbGUoZXZlbnQpO1xuICAgIGlmIChlZmZlY3RzLmxlbmd0aCA9PT0gMCkgdGhpcy5yZWZyZXNoT3ZlcmxheShldmVudCk7XG4gICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgZWZmZWN0cykgdGhpcy5hcHBseUVmZmVjdChlZmZlY3QsIHJhdyk7XG4gIH1cblxuICAvKipcbiAgICogQW5kcm9pZCBkZWxpdmVycyB0aGUgYmFycmVsIGJ1dHRvbiBhcyBhIE1vdXNlRXZlbnQgY29udGV4dG1lbnUsIG9mdGVuIHdpdGhcbiAgICogbm8gcG9pbnRlclR5cGUuIFRoYXQgaXMgdGhlIHJpZ2h0LWNsaWNrIFNhbXN1bmcgTm90ZXMgZG9lcyBub3QgdXNlIGZvciBlcmFzZS5cbiAgICovXG4gIHByaXZhdGUgb25Db250ZXh0TWVudShyYXc6IFBvaW50ZXJFdmVudCk6IHZvaWQge1xuICAgIGNvbnN0IHBvaW50ZXJUeXBlID0gcmF3LnBvaW50ZXJUeXBlO1xuICAgIGlmIChwb2ludGVyVHlwZSA9PT0gXCJtb3VzZVwiIHx8IHBvaW50ZXJUeXBlID09PSBcInRvdWNoXCIpIHJldHVybjtcbiAgICBpZiAocG9pbnRlclR5cGUgIT09IFwicGVuXCIgJiYgIXRoaXMubGFzdFBvaW50ZXJXYXNQZW4pIHJldHVybjtcbiAgICBjb25zdCBldmVudCA9IG5vcm1hbGl6ZVBvaW50ZXJFdmVudChcbiAgICAgIHJhdyxcbiAgICAgIHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLmNvbnRhaW5zKHJhdy50YXJnZXQgYXMgTm9kZSlcbiAgICApO1xuICAgIGV2ZW50LnBvaW50ZXJUeXBlID0gXCJwZW5cIjtcbiAgICBldmVudC5raW5kID0gXCJjb250ZXh0bWVudVwiO1xuICAgIHRoaXMubWFjaGluZS5zZXRCYXJyZWxTb3VyY2UodGhpcy5wZW4/LmlzUmVhZHkoKSA/IFwiYnJpZGdlXCIgOiBcInBvaW50ZXJcIik7XG4gICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgdGhpcy5tYWNoaW5lLmhhbmRsZShldmVudCkpIHtcbiAgICAgIGlmIChlZmZlY3QudHlwZSA9PT0gXCJzdXBwcmVzcy1jb250ZXh0LW1lbnVcIikgdGhpcy5ibG9ja0NvbnRleHRNZW51KHJhdyk7XG4gICAgICB0aGlzLmFwcGx5RWZmZWN0KGVmZmVjdCwgcmF3KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGJsb2NrQ29udGV4dE1lbnUocmF3OiBFdmVudCk6IHZvaWQge1xuICAgIHJhdy5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHJhdy5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBpZiAodHlwZW9mIHJhdy5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24gPT09IFwiZnVuY3Rpb25cIikgcmF3LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBseUVmZmVjdChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QsIHJhdz86IFBvaW50ZXJFdmVudCk6IHZvaWQge1xuICAgIHRoaXMuZGVidWcubWVzc2FnZShgZWZmZWN0OiAke2VmZmVjdC50eXBlfWApO1xuICAgIGlmICh0aGlzLnNldHRpbmdzKCkuc3R5bHVzVGVzdE1vZGUpIHtcbiAgICAgIHRoaXMuZGVidWcubWVzc2FnZShgdGVzdCBtb2RlIHN1cHByZXNzZWQ6ICR7ZWZmZWN0LnR5cGV9YCk7XG4gICAgICB0aGlzLnJlZnJlc2hPdmVybGF5KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHN3aXRjaCAoZWZmZWN0LnR5cGUpIHtcbiAgICAgIGNhc2UgXCJ0ZW1wb3JhcnktdG9vbC1zdGFydFwiOlxuICAgICAgICBpZiAoIXRoaXMuc2F2ZWRUb29sKSB7XG4gICAgICAgICAgY29uc3Qgc3ludGhldGljID1cbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MoKS5lcmFzZXJTdHJhdGVneSA9PT0gXCJzeW50aGV0aWMtYnV0dG9uNVwiICYmIHJhdz8udHlwZSA9PT0gXCJwb2ludGVyZG93blwiO1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9XG4gICAgICAgICAgICBzeW50aGV0aWMgJiYgcmF3XG4gICAgICAgICAgICAgID8gdGhpcy5icmlkZ2UuYmVnaW5Nb21lbnRhcnlFcmFzZXIocmF3KVxuICAgICAgICAgICAgICA6IHRoaXMuYnJpZGdlLnN0YXJ0VGVtcG9yYXJ5RXJhc2VyKCk7XG4gICAgICAgICAgaWYgKHJlc3VsdC5vaykgdGhpcy5zYXZlZFRvb2wgPSByZXN1bHQudmFsdWU7XG4gICAgICAgICAgZWxzZSB0aGlzLm1hY2hpbmUudGVtcG9yYXJ5VG9vbERpZE5vdFN0YXJ0KCk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwidGVtcG9yYXJ5LXRvb2wtc3BsaXRcIjoge1xuICAgICAgICBjb25zdCBldmVudCA9IHRoaXMubGFzdFBlbkV2ZW50ID8/IHJhdztcbiAgICAgICAgaWYgKCFldmVudCkgYnJlYWs7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9XG4gICAgICAgICAgdGhpcy5zZXR0aW5ncygpLmVyYXNlclN0cmF0ZWd5ID09PSBcInN5bnRoZXRpYy1idXR0b241XCJcbiAgICAgICAgICAgID8gdGhpcy5icmlkZ2Uuc3BsaXRTdHJva2VUb0VyYXNlcihldmVudCwgZWZmZWN0LmRpc2NhcmRTdHJva2UpXG4gICAgICAgICAgICA6IHRoaXMuYnJpZGdlLnNwbGl0U3Ryb2tlV2l0aEFjdGl2ZVRvb2woZXZlbnQpO1xuICAgICAgICBpZiAocmVzdWx0Lm9rKSB0aGlzLnNhdmVkVG9vbCA9IHJlc3VsdC52YWx1ZTtcbiAgICAgICAgZWxzZSB0aGlzLm1hY2hpbmUudGVtcG9yYXJ5VG9vbERpZE5vdFN0YXJ0KCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSBcInRlbXBvcmFyeS10b29sLWVuZFwiOlxuICAgICAgICBpZiAodGhpcy5zYXZlZFRvb2wpIHtcbiAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncygpLmVyYXNlclN0cmF0ZWd5ID09PSBcInN5bnRoZXRpYy1idXR0b241XCIpIHtcbiAgICAgICAgICAgIHRoaXMuYnJpZGdlLmVuZE1vbWVudGFyeUVyYXNlcih0aGlzLnNhdmVkVG9vbCk7XG4gICAgICAgICAgfSBlbHNlIHRoaXMuYnJpZGdlLnJlc3RvcmVUb29sKHRoaXMuc2F2ZWRUb29sKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNhdmVkVG9vbCA9IG51bGw7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImVyYXNlLXRhcFwiOiB7XG4gICAgICAgIGNvbnN0IHByaW9yID0gdGhpcy5wcmlvclNjZW5lSWRzO1xuICAgICAgICBjb25zdCBwb2ludCA9IGVmZmVjdC5wb2ludDtcbiAgICAgICAgdGhpcy5zY2hlZHVsZXIuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMuZGlzcG9zZWQpIHJldHVybjtcbiAgICAgICAgICB0aGlzLmJyaWRnZS5lcmFzZVN0cm9rZUF0KHBvaW50LCBwcmlvcik7XG4gICAgICAgIH0sIDApO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgXCJidXR0b24tdGFwXCI6XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvblRhcEFjdGlvbiwgZWZmZWN0LnBvaW50LCB0aGlzLmJyaWRnZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImJ1dHRvbi1kb3VibGUtdGFwXCI6XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvbkRvdWJsZVRhcEFjdGlvbiwgZWZmZWN0LnBvaW50LCB0aGlzLmJyaWRnZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImJ1dHRvbi1ob2xkXCI6XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvbkhvbGRBY3Rpb24sIGVmZmVjdC5wb2ludCwgdGhpcy5icmlkZ2UpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICB0aGlzLnJlZnJlc2hPdmVybGF5KHRoaXMubGF0ZXN0RXZlbnQsIGVmZmVjdCk7XG4gIH1cblxuICBwcml2YXRlIHJlZnJlc2hPdmVybGF5KFxuICAgIGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfCBudWxsID0gdGhpcy5sYXRlc3RFdmVudCxcbiAgICBlZmZlY3Q/OiBHZXN0dXJlRWZmZWN0XG4gICk6IHZvaWQge1xuICAgIGlmICghZXZlbnQpIHJldHVybjtcbiAgICB0aGlzLm92ZXJsYXkudXBkYXRlKGV2ZW50LCB0aGlzLm1hY2hpbmUuc25hcHNob3QoKSwgZWZmZWN0LCB0aGlzLnN0YXR1c0xpbmUoKSk7XG4gIH1cblxuICBwcml2YXRlIHN0YXR1c0xpbmUoKTogc3RyaW5nIHtcbiAgICBjb25zdCBzb3VyY2UgPSBkZXNjcmliZUJhcnJlbFNvdXJjZSh0aGlzLnNldHRpbmdzKCksIHRoaXMucGVuPy5pc1JlYWR5KCkgPT09IHRydWUpO1xuICAgIGNvbnN0IGRvd24gPSB0aGlzLnBlbj8uaXNEb3duKCkgPT09IHRydWU7XG4gICAgY29uc3QgbGF0ZW5jeSA9IHRoaXMubGFzdExhdGVuY3kgPyBgIGxhdGVuY3k6JHt0aGlzLmxhc3RMYXRlbmN5fWAgOiBcIlwiO1xuICAgIHJldHVybiBgc291cmNlOiR7c291cmNlfSBkb3duOiR7U3RyaW5nKGRvd24pfSR7bGF0ZW5jeX1gO1xuICB9XG5cbiAgcHJpdmF0ZSBiYXJyZWxCZWxpZXZlZEhlbGQocmF3OiBQb2ludGVyRXZlbnQpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5wZW4/LmlzUmVhZHkoKSkgcmV0dXJuIHRoaXMucGVuLmlzRG93bigpO1xuICAgIGlmICh0aGlzLm1hY2hpbmUuc25hcHNob3QoKS5iYXJyZWxCdXR0b25IZWxkKSByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCBzZXR0aW5ncyA9IHRoaXMuc2V0dGluZ3MoKTtcbiAgICByZXR1cm4gKFxuICAgICAgc2V0dGluZ3MuYmFycmVsQnV0dG9uTWFzayA9PT0gMSAmJlxuICAgICAgc2V0dGluZ3MucHJpbWFyeUNvbnRhY3RNb2RlID09PSBcImhvdmVyLW9ubHlcIiAmJlxuICAgICAgcmF3LnByZXNzdXJlIDwgMC4wMSAmJlxuICAgICAgKHJhdy5idXR0b25zICYgMSkgIT09IDBcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXN0dXJlU2V0dGluZ3MoKSB7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLnNldHRpbmdzKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlLmJ1dHRvbkNvbnRhY3RBY3Rpb24sXG4gICAgICBkb3VibGVUYXBNczogdmFsdWUuZG91YmxlVGFwTXMsXG4gICAgICBsb25nUHJlc3NNczogdmFsdWUubG9uZ1ByZXNzTXMsXG4gICAgICBtb3ZlbWVudFRocmVzaG9sZFB4OiB2YWx1ZS5tb3ZlbWVudFRocmVzaG9sZFB4LFxuICAgICAgYmFycmVsQnV0dG9uTWFzazogdmFsdWUuYmFycmVsQnV0dG9uTWFzayxcbiAgICAgIHByaW1hcnlDb250YWN0TW9kZTogdmFsdWUucHJpbWFyeUNvbnRhY3RNb2RlLFxuICAgICAgbGF0ZVdpbmRvd01zOiB2YWx1ZS5sYXRlV2luZG93TXMsXG4gICAgICBtaWRTdHJva2VQcmVzczogdmFsdWUubWlkU3Ryb2tlUHJlc3MsXG4gICAgfSBhcyBjb25zdDtcbiAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgQXBwLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBFeGNhbGlkcmF3QnJpZGdlIH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZVwiO1xuaW1wb3J0IHsgRGVidWdMb2dnZXIgfSBmcm9tIFwiLi4vZGVidWcvRGVidWdMb2dnZXJcIjtcbmltcG9ydCB0eXBlIHsgUGVuU2lnbmFsSHViLCBSb3V0ZWRQZW5UYXJnZXQgfSBmcm9tIFwiLi4vcGVuYnJpZGdlL1BlblNpZ25hbEh1YlwiO1xuaW1wb3J0IHR5cGUgeyBTdHlsdXNDb250cm9sc1NldHRpbmdzIH0gZnJvbSBcIi4uL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBTdHlsdXNDb250cm9sbGVyLCB0eXBlIEFjdGlvbkhhbmRsZXIgfSBmcm9tIFwiLi9TdHlsdXNDb250cm9sbGVyXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bHVzQ29udHJvbGxlckxpa2Uge1xuICBhdHRhY2goKTogdm9pZDtcbiAgZGlzcG9zZSgpOiB2b2lkO1xuICBnZXRUcmFjZSgpOiBzdHJpbmc7XG4gIHJlY2VudE1lc3NhZ2VzPygpOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IHR5cGUgU3R5bHVzQ29udHJvbGxlckZhY3RvcnkgPSAobGVhZjogV29ya3NwYWNlTGVhZikgPT4gU3R5bHVzQ29udHJvbGxlckxpa2U7XG5cbmV4cG9ydCBjbGFzcyBTdHlsdXNWaWV3UmVnaXN0cnkge1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbnRyb2xsZXJzID0gbmV3IE1hcDxXb3Jrc3BhY2VMZWFmLCBTdHlsdXNDb250cm9sbGVyTGlrZT4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBjcmVhdGVDb250cm9sbGVyOiBTdHlsdXNDb250cm9sbGVyRmFjdG9yeTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2V0dGluZ3M6ICgpID0+IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MsXG4gICAgcHJpdmF0ZSByZWFkb25seSBhY3Rpb25IYW5kbGVyOiBBY3Rpb25IYW5kbGVyLFxuICAgIGNyZWF0ZUNvbnRyb2xsZXI/OiBTdHlsdXNDb250cm9sbGVyRmFjdG9yeSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGhvb2tzPzoge1xuICAgICAgcGVuPzogUGVuU2lnbmFsSHViIHwgbnVsbDtcbiAgICAgIGRpYWdub3N0aWM/OiBib29sZWFuO1xuICAgICAgb25TeW5jPzogKCkgPT4gdm9pZDtcbiAgICB9XG4gICkge1xuICAgIHRoaXMuY3JlYXRlQ29udHJvbGxlciA9XG4gICAgICBjcmVhdGVDb250cm9sbGVyID8/XG4gICAgICAoKGxlYWYpID0+IHtcbiAgICAgICAgY29uc3QgZGVidWcgPSBuZXcgRGVidWdMb2dnZXIoKCkgPT4gdGhpcy5zZXR0aW5ncygpLmRlYnVnTW9kZSwgaG9va3M/LmRpYWdub3N0aWMgPT09IHRydWUpO1xuICAgICAgICByZXR1cm4gbmV3IFN0eWx1c0NvbnRyb2xsZXIoXG4gICAgICAgICAgbGVhZixcbiAgICAgICAgICBuZXcgRXhjYWxpZHJhd0JyaWRnZShsZWFmKSxcbiAgICAgICAgICB0aGlzLnNldHRpbmdzLFxuICAgICAgICAgIGRlYnVnLFxuICAgICAgICAgIHRoaXMuYWN0aW9uSGFuZGxlcixcbiAgICAgICAgICB3aW5kb3csXG4gICAgICAgICAgaG9va3M/LnBlbiA/PyBudWxsXG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHN5bmMoKTogdm9pZCB7XG4gICAgY29uc3QgbGVhdmVzID0gbmV3IFNldCh0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFwiZXhjYWxpZHJhd1wiKSk7XG4gICAgZm9yIChjb25zdCBsZWFmIG9mIGxlYXZlcylcbiAgICAgIGlmICghdGhpcy5jb250cm9sbGVycy5oYXMobGVhZikpIHtcbiAgICAgICAgY29uc3QgY29udHJvbGxlciA9IHRoaXMuY3JlYXRlQ29udHJvbGxlcihsZWFmKTtcbiAgICAgICAgY29udHJvbGxlci5hdHRhY2goKTtcbiAgICAgICAgdGhpcy5jb250cm9sbGVycy5zZXQobGVhZiwgY29udHJvbGxlcik7XG4gICAgICB9XG4gICAgZm9yIChjb25zdCBbbGVhZiwgY29udHJvbGxlcl0gb2YgdGhpcy5jb250cm9sbGVycylcbiAgICAgIGlmICghbGVhdmVzLmhhcyhsZWFmKSkge1xuICAgICAgICBjb250cm9sbGVyLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5jb250cm9sbGVycy5kZWxldGUobGVhZik7XG4gICAgICB9XG4gICAgdGhpcy5ob29rcz8ub25TeW5jPy4oKTtcbiAgfVxuICBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuY29udHJvbGxlcnMuc2l6ZTtcbiAgfVxuICBmYWxsYmFja1RhcmdldCgpOiBSb3V0ZWRQZW5UYXJnZXQgfCBudWxsIHtcbiAgICBjb25zdCBhY3RpdmUgPSAodGhpcy5hcHAud29ya3NwYWNlIGFzIHsgYWN0aXZlTGVhZj86IFdvcmtzcGFjZUxlYWYgfSkuYWN0aXZlTGVhZjtcbiAgICBjb25zdCBjb250cm9sbGVyID0gYWN0aXZlID8gdGhpcy5jb250cm9sbGVycy5nZXQoYWN0aXZlKSA6IHVuZGVmaW5lZDtcbiAgICBpZiAoY29udHJvbGxlciAmJiBcIm9uRXh0ZXJuYWxCdXR0b25cIiBpbiBjb250cm9sbGVyICYmIFwibGFzdFBlblBvaW50XCIgaW4gY29udHJvbGxlcikge1xuICAgICAgcmV0dXJuIGNvbnRyb2xsZXIgYXMgdW5rbm93biBhcyBSb3V0ZWRQZW5UYXJnZXQ7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJlY2VudE1lc3NhZ2VzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMuY29udHJvbGxlcnMudmFsdWVzKCldLmZsYXRNYXAoXG4gICAgICAoY29udHJvbGxlcikgPT4gY29udHJvbGxlci5yZWNlbnRNZXNzYWdlcz8uKCkgPz8gW11cbiAgICApO1xuICB9XG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBjb250cm9sbGVyIG9mIHRoaXMuY29udHJvbGxlcnMudmFsdWVzKCkpIGNvbnRyb2xsZXIuZGlzcG9zZSgpO1xuICAgIHRoaXMuY29udHJvbGxlcnMuY2xlYXIoKTtcbiAgfVxuICByZWZyZXNoKCk6IHZvaWQge1xuICAgIHRoaXMuZGlzcG9zZSgpO1xuICAgIHRoaXMuc3luYygpO1xuICB9XG4gIGV4cG9ydFRyYWNlcygpOiBzdHJpbmcge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShcbiAgICAgIFsuLi50aGlzLmNvbnRyb2xsZXJzLmVudHJpZXMoKV0ubWFwKChbbGVhZiwgY29udHJvbGxlcl0pID0+ICh7XG4gICAgICAgIGxlYWY6IGxlYWYuZ2V0RGlzcGxheVRleHQoKSxcbiAgICAgICAgZXZlbnRzOiBKU09OLnBhcnNlKGNvbnRyb2xsZXIuZ2V0VHJhY2UoKSksXG4gICAgICB9KSksXG4gICAgICBudWxsLFxuICAgICAgMlxuICAgICk7XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFBLG1CQUErQjs7O0FDRXhCLElBQU0sY0FBTixNQUFrQjtBQUFBLEVBR3ZCLFlBQ21CLFNBQ0EsaUJBQWlCLE9BQ2xDO0FBRmlCO0FBQ0E7QUFBQSxFQUNoQjtBQUFBLEVBTEssUUFBaUMsQ0FBQztBQUFBLEVBQ2xDLFdBQXFCLENBQUM7QUFBQSxFQU05QixNQUFNLE9BQW9DO0FBQ3hDLFFBQUksQ0FBQyxLQUFLLFFBQVEsRUFBRztBQUNyQixTQUFLLE1BQU0sS0FBSyxLQUFLO0FBQ3JCLFFBQUksS0FBSyxNQUFNLFNBQVMsSUFBSyxNQUFLLE1BQU0sTUFBTTtB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USxrQkFBa0IsT0FBTyxLQUFLLEVBQUU7QUFDdkQsU0FBSyxhQUFhO0FBQUEsRUFDcEI7QUFBQSxFQUVRLGVBQXFCO0FBQzNCLGVBQVcsWUFBWSxLQUFLLGdCQUFpQixVQUFTO0FBQUEsRUFDeEQ7QUFBQSxFQUVBLE1BQWMscUJBQW9DO0FBQ2hELFVBQU0sU0FBUyxrQkFBa0IsS0FBSyxRQUFRLEtBQUssQ0FBQztBQUNwRCxTQUFLLHFCQUFxQixTQUFTLE1BQU0sWUFBWSxNQUFNLElBQUk7QUFBQSxFQUNqRTtBQUFBLEVBRVEsa0JBQXdCO0FBQzlCLFVBQU0sVUFBVSxPQUFPLGFBQWEsZUFBZSxTQUFTLG9CQUFvQjtBQUNoRixTQUFLLE9BQU87QUFBQSxNQUNWLEtBQUssU0FBUyxvQkFDWixrQkFBa0IsS0FBSyxRQUFRLEtBQUssQ0FBQyxNQUFNLFNBQzFDLEtBQUssVUFBVSxLQUFLLEtBQUssS0FBSyxLQUMvQjtBQUFBLElBQ0o7QUFBQSxFQUNGO0FBQUEsRUFFUSxxQkFBMkI7QUFDakMsVUFBTSxTQUFTLEtBQUssSUFBSSxNQUFNO0FBQzlCLFFBQUksQ0FBQyxRQUFRO0FBQ1gsVUFBSSx3QkFBTyxtQ0FBbUM7QUFDOUM7QUFBQSxJQUNGO0FBQ0EsVUFBTSxRQUFRLE9BQU8sYUFBYSxLQUFLLGVBQWU7QUFDdEQsU0FBSyxLQUFLLEtBQUssT0FBTyxPQUFPLGNBQWMsQ0FBQztBQUFBLEVBQzlDO0FBQUEsRUFFUSxZQUFvQjtBQUMxQixXQUFPLGtCQUFrQixLQUFLLFNBQVMsYUFBYTtBQUFBLEVBQ3REO0FBQ0Y7QUFFQSxTQUFTLGlCQUF3QjtBQUMvQixTQUFPO0FBQUEsSUFDTCxHQUFHLEtBQUssTUFBTSxPQUFPLGFBQWEsQ0FBQztBQUFBLElBQ25DLEdBQUcsS0FBSyxNQUFNLE9BQU8sY0FBYyxDQUFDO0FBQUEsRUFDdEM7QUFDRjsiLAogICJuYW1lcyI6IFsiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAicHJvb2YiLCAiZmluZ2VycHJpbnQiLCAibm90ZSIsICJhY3Rpb25zIiwgImltcG9ydF9vYnNpZGlhbiIsICJsYXRlIiwgInN5bnRoZXRpYyJdCn0K
