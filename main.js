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
var import_obsidian3 = require("obsidian");

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

// src/settings/SettingsTab.ts
var import_obsidian = require("obsidian");

// src/settings/settings.ts
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
  debugOverlay: false
};
var NUMERIC_SETTING_LIMITS = {
  doubleTapMs: { min: 100, max: 1e3 },
  longPressMs: { min: 150, max: 2e3 },
  movementThresholdPx: { min: 1, max: 100 }
};
function parseNumericSetting(key, value) {
  const parsed = Number(value);
  const { min, max } = NUMERIC_SETTING_LIMITS[key];
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}
function normalizeSettings(value) {
  const action = (candidate, fallback) => candidate === "menu" || candidate === "copy" || candidate === "paste" || candidate === "none" ? candidate : fallback;
  const number = (candidate, fallback, min, max) => typeof candidate === "number" && Number.isFinite(candidate) ? Math.min(max, Math.max(min, Math.round(candidate))) : fallback;
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
    barrelButtonMask: value.barrelButtonMask === 1 || value.barrelButtonMask === 4 || value.barrelButtonMask === 8 || value.barrelButtonMask === 16 || value.barrelButtonMask === 32 ? value.barrelButtonMask : DEFAULT_SETTINGS.barrelButtonMask,
    primaryContactMode: value.primaryContactMode === "experimental" ? "experimental" : "hover-only",
    stylusTestMode: value.stylusTestMode === true,
    debugMode: value.debugMode === true,
    debugOverlay: value.debugOverlay === true
  };
}

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
var SettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("p", {
      text: "Requires the Excalidraw community plugin. Copy and paste await a compatible Excalidraw integration and are currently unavailable."
    });
    this.action("Tap", "buttonTapAction");
    this.action("Double tap", "buttonDoubleTapAction");
    this.action("Hold", "buttonHoldAction");
    new import_obsidian.Setting(containerEl).setName("Button + pen contact").setDesc("Temporary tool while the side button is held during pen contact.").addDropdown(
      (dropdown) => dropdown.addOption("eraser", "Temporary eraser").addOption("none", "Do nothing").setValue(this.plugin.settings.buttonContactAction).onChange(
        async (value) => this.plugin.updateSettings({
          buttonContactAction: value
        })
      )
    );
    this.number("Double-tap interval (ms)", "doubleTapMs");
    this.number("Long-press delay (ms)", "longPressMs");
    this.number("Movement threshold (px)", "movementThresholdPx");
    new import_obsidian.Setting(containerEl).setName("S Pen test mode").setDesc(
      "Suppresses menu, clipboard, and temporary-tool changes while still showing recognized state and effects in the debug overlay. Use this while trying signal profiles."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.stylusTestMode).onChange(async (value) => this.plugin.updateSettings({ stylusTestMode: value }))
    );
    new import_obsidian.Setting(containerEl).setName("S Pen signal test profile").setDesc(
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
    new import_obsidian.Setting(containerEl).setName("Debug logging").setDesc("Logs bounded raw pen event traces to the developer console.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.debugMode).onChange(async (value) => this.plugin.updateSettings({ debugMode: value }))
    );
    new import_obsidian.Setting(containerEl).setName("Debug overlay").setDesc(
      "Shows the latest pen event and stylus state in the Excalidraw view. Requires debug logging."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.debugOverlay).onChange(async (value) => this.plugin.updateSettings({ debugOverlay: value }))
    );
    new import_obsidian.Setting(containerEl).setName("Export debug trace").setDesc(
      "Copies buffered pen events from every open Excalidraw view as JSON, ready to attach to a bug report."
    ).addButton(
      (button) => button.setButtonText("Copy trace").onClick(() => this.plugin.copyStylusEventTrace())
    );
  }
  action(name, key) {
    new import_obsidian.Setting(this.containerEl).setName(`S Pen side button: ${name}`).addDropdown((dropdown) => {
      for (const [value, label] of Object.entries(actions)) dropdown.addOption(value, label);
      dropdown.setValue(this.plugin.settings[key]).onChange(async (value) => this.plugin.updateSettings({ [key]: value }));
    });
  }
  number(name, key) {
    const { min, max } = NUMERIC_SETTING_LIMITS[key];
    new import_obsidian.Setting(this.containerEl).setName(name).setDesc(`Whole milliseconds/pixels from ${min} to ${max}.`).addText(
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

// src/excalidraw/ExcalidrawBridge.ts
var import_obsidian2 = require("obsidian");

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

// src/excalidraw/ExcalidrawBridge.ts
var ExcalidrawBridge = class {
  constructor(leaf) {
    this.leaf = leaf;
  }
  warned = false;
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
      new import_obsidian2.Notice(`Excalidraw Stylus Controls: ${message}`);
      this.warned = true;
    }
  }
};

// src/debug/DebugLogger.ts
var DebugLogger = class {
  constructor(enabled) {
    this.enabled = enabled;
  }
  trace = [];
  event(event) {
    if (!this.enabled()) return;
    this.trace.push(event);
    if (this.trace.length > 100) this.trace.shift();
    console.debug("[Excalidraw Stylus Controls]", event);
  }
  message(message) {
    if (this.enabled()) console.debug("[Excalidraw Stylus Controls]", message);
  }
  exportTrace() {
    return JSON.stringify(this.trace, null, 2);
  }
  clear() {
    this.trace = [];
  }
};

// src/debug/DebugOverlay.ts
var DebugOverlay = class {
  constructor(container, enabled) {
    this.container = container;
    this.enabled = enabled;
  }
  element = null;
  update(event, state, effect) {
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
        `effect:${effect?.type ?? "none"}`
      ].join("\n")
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
  handle(event) {
    if (event.pointerType !== "pen") return [];
    const effects = [];
    if (event.kind === "contextmenu") {
      if (this.temporaryToolActive || this.barrelButtonHeld && this.penContact)
        effects.push({ type: "suppress-context-menu" });
      return effects;
    }
    if (event.kind === "down") {
      if (!this.barrelButtonHeld && this.canRecognizeBarrelOnContact(event)) this.startPress(event);
      this.penContact = true;
      this.activePointerId = event.pointerId;
      if (this.barrelButtonHeld) this.consumeForContact(event, effects);
      return effects;
    }
    if (event.kind === "up" || event.kind === "cancel") {
      if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return effects;
      this.penContact = false;
      this.activePointerId = null;
      if (this.temporaryToolActive) {
        this.temporaryToolActive = false;
        effects.push({ type: "temporary-tool-end" });
      }
      if (event.kind === "cancel") this.cancelPress();
      else if (!this.isBarrelHeld(event)) this.releasePress(effects);
      return effects;
    }
    if (this.penContact) return effects;
    const heldNow = this.isBarrelHeld(event);
    if (!this.barrelButtonHeld && heldNow) this.startPress(event);
    if (this.barrelButtonHeld && heldNow) this.trackHoverMovement(event);
    if (this.barrelButtonHeld && !heldNow) this.releasePress(effects);
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
  startPress(event) {
    this.barrelButtonHeld = true;
    this.consumed = false;
    this.moved = false;
    this.holdFired = false;
    this.pressOrigin = { x: event.x, y: event.y };
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
};

// src/stylus/StylusController.ts
var StylusController = class {
  constructor(leaf, bridge, settings, debug, dispatchAction, scheduler = window) {
    this.leaf = leaf;
    this.bridge = bridge;
    this.settings = settings;
    this.debug = debug;
    this.dispatchAction = dispatchAction;
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
  attach() {
    if (this.disposed || this.attached) return;
    this.attached = true;
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
    for (const [type, listener] of this.listeners)
      this.leaf.view.containerEl.removeEventListener(type, listener, true);
    this.listeners.length = 0;
    for (const effect of this.machine.dispose()) this.applyEffect(effect);
    this.overlay.close();
  }
  getTrace() {
    return this.debug.exportTrace();
  }
  onPointerEvent(raw) {
    if (raw.pointerType !== "pen") return;
    const event = normalizePointerEvent(
      raw,
      this.leaf.view.containerEl.contains(raw.target)
    );
    this.latestEvent = event;
    this.debug.event(event);
    const effects = this.machine.handle(event);
    if (effects.length === 0) this.overlay.update(event, this.machine.snapshot());
    for (const effect of effects) {
      if (effect.type === "suppress-context-menu") raw.preventDefault();
      this.applyEffect(effect);
    }
  }
  applyEffect(effect) {
    this.debug.message(`effect: ${effect.type}`);
    if (this.settings().stylusTestMode) {
      this.debug.message(`test mode suppressed: ${effect.type}`);
      if (this.latestEvent) this.overlay.update(this.latestEvent, this.machine.snapshot(), effect);
      return;
    }
    switch (effect.type) {
      case "temporary-tool-start":
        if (!this.savedTool) {
          const result = this.bridge.startTemporaryEraser();
          if (result.ok) this.savedTool = result.value;
          else this.machine.temporaryToolDidNotStart();
        }
        break;
      case "temporary-tool-end":
        if (this.savedTool) this.bridge.restoreTool(this.savedTool);
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
    if (this.latestEvent) this.overlay.update(this.latestEvent, this.machine.snapshot(), effect);
  }
  gestureSettings() {
    const value = this.settings();
    return {
      buttonContactAction: value.buttonContactAction,
      doubleTapMs: value.doubleTapMs,
      longPressMs: value.longPressMs,
      movementThresholdPx: value.movementThresholdPx,
      barrelButtonMask: value.barrelButtonMask,
      primaryContactMode: value.primaryContactMode
    };
  }
};

// src/stylus/StylusViewRegistry.ts
var StylusViewRegistry = class {
  constructor(app, settings, actionHandler, createController) {
    this.app = app;
    this.settings = settings;
    this.actionHandler = actionHandler;
    this.createController = createController ?? ((leaf) => {
      const debug = new DebugLogger(() => this.settings().debugMode);
      return new StylusController(
        leaf,
        new ExcalidrawBridge(leaf),
        this.settings,
        debug,
        this.actionHandler
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
var StylusControlsPlugin = class extends import_obsidian3.Plugin {
  settings = DEFAULT_SETTINGS;
  registry = null;
  menu = new StylusMenu();
  async onload() {
    this.settings = normalizeSettings(await this.loadData() ?? {});
    this.addSettingTab(new SettingsTab(this));
    this.registry = new StylusViewRegistry(
      this.app,
      () => this.settings,
      (action, point, bridge) => {
        if (action === "menu") this.menu.open(point, bridge);
        else if (action === "copy") bridge.copySelectedElements();
        else if (action === "paste") bridge.pasteAt(point);
      }
    );
    this.registerEvent(this.app.workspace.on("layout-change", () => this.registry?.sync()));
    this.app.workspace.onLayoutReady(() => this.registry?.sync());
    this.addCommand({
      id: "copy-stylus-event-trace",
      name: "Copy latest stylus event trace",
      callback: () => this.copyStylusEventTrace()
    });
  }
  onunload() {
    this.menu.close();
    this.registry?.dispose();
    this.registry = null;
  }
  async updateSettings(patch) {
    this.settings = normalizeSettings({ ...this.settings, ...patch });
    await this.saveData(this.settings);
    this.registry?.refresh();
  }
  async copyStylusEventTrace() {
    const trace = this.registry?.exportTraces() ?? "[]";
    try {
      await navigator.clipboard.writeText(trace);
      new import_obsidian3.Notice("Stylus event trace copied as JSON.");
    } catch {
      new import_obsidian3.Notice("Unable to copy the stylus trace. Check the developer console.");
    }
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL21lbnUvU3R5bHVzTWVudS50cyIsICJzcmMvc2V0dGluZ3MvU2V0dGluZ3NUYWIudHMiLCAic3JjL3NldHRpbmdzL3NldHRpbmdzLnRzIiwgInNyYy9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2UudHMiLCAic3JjL2V4Y2FsaWRyYXcvY29tcGF0aWJpbGl0eS50cyIsICJzcmMvZGVidWcvRGVidWdMb2dnZXIudHMiLCAic3JjL2RlYnVnL0RlYnVnT3ZlcmxheS50cyIsICJzcmMvc3R5bHVzL25vcm1hbGl6ZVBvaW50ZXJFdmVudC50cyIsICJzcmMvc3R5bHVzL1N0eWx1c0dlc3R1cmVNYWNoaW5lLnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzQ29udHJvbGxlci50cyIsICJzcmMvc3R5bHVzL1N0eWx1c1ZpZXdSZWdpc3RyeS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgTm90aWNlLCBQbHVnaW4gfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IFN0eWx1c01lbnUgfSBmcm9tIFwiLi9tZW51L1N0eWx1c01lbnVcIjtcbmltcG9ydCB7IFNldHRpbmdzVGFiIH0gZnJvbSBcIi4vc2V0dGluZ3MvU2V0dGluZ3NUYWJcIjtcbmltcG9ydCB7XG4gIERFRkFVTFRfU0VUVElOR1MsXG4gIG5vcm1hbGl6ZVNldHRpbmdzLFxuICB0eXBlIFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MsXG59IGZyb20gXCIuL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBTdHlsdXNWaWV3UmVnaXN0cnkgfSBmcm9tIFwiLi9zdHlsdXMvU3R5bHVzVmlld1JlZ2lzdHJ5XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0eWx1c0NvbnRyb2xzUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuICBwcml2YXRlIHJlZ2lzdHJ5OiBTdHlsdXNWaWV3UmVnaXN0cnkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByZWFkb25seSBtZW51ID0gbmV3IFN0eWx1c01lbnUoKTtcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IG5vcm1hbGl6ZVNldHRpbmdzKChhd2FpdCB0aGlzLmxvYWREYXRhKCkpID8/IHt9KTtcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFNldHRpbmdzVGFiKHRoaXMpKTtcbiAgICB0aGlzLnJlZ2lzdHJ5ID0gbmV3IFN0eWx1c1ZpZXdSZWdpc3RyeShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgKCkgPT4gdGhpcy5zZXR0aW5ncyxcbiAgICAgIChhY3Rpb24sIHBvaW50LCBicmlkZ2UpID0+IHtcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJtZW51XCIpIHRoaXMubWVudS5vcGVuKHBvaW50LCBicmlkZ2UpO1xuICAgICAgICBlbHNlIGlmIChhY3Rpb24gPT09IFwiY29weVwiKSBicmlkZ2UuY29weVNlbGVjdGVkRWxlbWVudHMoKTtcbiAgICAgICAgZWxzZSBpZiAoYWN0aW9uID09PSBcInBhc3RlXCIpIGJyaWRnZS5wYXN0ZUF0KHBvaW50KTtcbiAgICAgIH1cbiAgICApO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJsYXlvdXQtY2hhbmdlXCIsICgpID0+IHRoaXMucmVnaXN0cnk/LnN5bmMoKSkpO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHRoaXMucmVnaXN0cnk/LnN5bmMoKSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImNvcHktc3R5bHVzLWV2ZW50LXRyYWNlXCIsXG4gICAgICBuYW1lOiBcIkNvcHkgbGF0ZXN0IHN0eWx1cyBldmVudCB0cmFjZVwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuY29weVN0eWx1c0V2ZW50VHJhY2UoKSxcbiAgICB9KTtcbiAgfVxuICBvbnVubG9hZCgpOiB2b2lkIHtcbiAgICB0aGlzLm1lbnUuY2xvc2UoKTtcbiAgICB0aGlzLnJlZ2lzdHJ5Py5kaXNwb3NlKCk7XG4gICAgdGhpcy5yZWdpc3RyeSA9IG51bGw7XG4gIH1cbiAgYXN5bmMgdXBkYXRlU2V0dGluZ3MocGF0Y2g6IFBhcnRpYWw8U3R5bHVzQ29udHJvbHNTZXR0aW5ncz4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnNldHRpbmdzID0gbm9ybWFsaXplU2V0dGluZ3MoeyAuLi50aGlzLnNldHRpbmdzLCAuLi5wYXRjaCB9KTtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICAgIHRoaXMucmVnaXN0cnk/LnJlZnJlc2goKTtcbiAgfVxuICBhc3luYyBjb3B5U3R5bHVzRXZlbnRUcmFjZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB0cmFjZSA9IHRoaXMucmVnaXN0cnk/LmV4cG9ydFRyYWNlcygpID8/IFwiW11cIjtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQodHJhY2UpO1xuICAgICAgbmV3IE5vdGljZShcIlN0eWx1cyBldmVudCB0cmFjZSBjb3BpZWQgYXMgSlNPTi5cIik7XG4gICAgfSBjYXRjaCB7XG4gICAgICBuZXcgTm90aWNlKFwiVW5hYmxlIHRvIGNvcHkgdGhlIHN0eWx1cyB0cmFjZS4gQ2hlY2sgdGhlIGRldmVsb3BlciBjb25zb2xlLlwiKTtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IEV4Y2FsaWRyYXdCcmlkZ2UgfSBmcm9tIFwiLi4vZXhjYWxpZHJhdy9FeGNhbGlkcmF3QnJpZGdlXCI7XG5pbXBvcnQgdHlwZSB7IFBvaW50IH0gZnJvbSBcIi4uL3N0eWx1cy90eXBlc1wiO1xuXG5jb25zdCBNRU5VX01BUkdJTl9QWCA9IDg7XG5jb25zdCBGQUxMQkFDS19NRU5VX1NJWkUgPSB7IHdpZHRoOiAxNzIsIGhlaWdodDogMzAwIH07XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGFtcE1lbnVQb3NpdGlvbihcbiAgcG9pbnQ6IFBvaW50LFxuICB2aWV3cG9ydDogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9LFxuICBtZW51OiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH1cbik6IFBvaW50IHtcbiAgcmV0dXJuIHtcbiAgICB4OiBNYXRoLm1heChNRU5VX01BUkdJTl9QWCwgTWF0aC5taW4ocG9pbnQueCwgdmlld3BvcnQud2lkdGggLSBtZW51LndpZHRoIC0gTUVOVV9NQVJHSU5fUFgpKSxcbiAgICB5OiBNYXRoLm1heChNRU5VX01BUkdJTl9QWCwgTWF0aC5taW4ocG9pbnQueSwgdmlld3BvcnQuaGVpZ2h0IC0gbWVudS5oZWlnaHQgLSBNRU5VX01BUkdJTl9QWCkpLFxuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgU3R5bHVzTWVudSB7XG4gIHByaXZhdGUgZWxlbWVudDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBvdXRzaWRlTGlzdGVuZXI6ICgoZXZlbnQ6IFBvaW50ZXJFdmVudCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBvcGVuR2VuZXJhdGlvbiA9IDA7XG5cbiAgb3Blbihwb2ludDogUG9pbnQsIGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZSk6IHZvaWQge1xuICAgIHRoaXMuY2xvc2UoKTtcbiAgICBjb25zdCBnZW5lcmF0aW9uID0gdGhpcy5vcGVuR2VuZXJhdGlvbjtcbiAgICBjb25zdCBtZW51ID0gZG9jdW1lbnQuYm9keS5jcmVhdGVEaXYoeyBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtbWVudVwiIH0pO1xuICAgIGNvbnN0IGFjdGlvbnM6IEFycmF5PFtzdHJpbmcsICgpID0+IHZvaWRdPiA9IFtcbiAgICAgIFtcIlNlbGVjdGlvblwiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcInNlbGVjdGlvblwiKV0sXG4gICAgICBbXCJGcmVlIGRyYXdcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJmcmVlZHJhd1wiKV0sXG4gICAgICBbXCJFcmFzZXJcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJlcmFzZXJcIildLFxuICAgICAgW1wiUmVjdGFuZ2xlXCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwicmVjdGFuZ2xlXCIpXSxcbiAgICAgIFtcIkFycm93XCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiYXJyb3dcIildLFxuICAgICAgW1wiQ29weVwiLCAoKSA9PiBicmlkZ2UuY29weVNlbGVjdGVkRWxlbWVudHMoKV0sXG4gICAgICBbXCJQYXN0ZVwiLCAoKSA9PiBicmlkZ2UucGFzdGVBdChwb2ludCldLFxuICAgIF07XG4gICAgZm9yIChjb25zdCBbbmFtZSwgY2FsbGJhY2tdIG9mIGFjdGlvbnMpIHtcbiAgICAgIGNvbnN0IGJ1dHRvbiA9IG1lbnUuY3JlYXRlRWwoXCJidXR0b25cIiwge1xuICAgICAgICB0ZXh0OiBuYW1lLFxuICAgICAgICBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtbWVudV9faXRlbVwiLFxuICAgICAgfSk7XG4gICAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJ1cFwiLCAoZXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLmVsZW1lbnQgPSBtZW51O1xuICAgIGNvbnN0IHBvc2l0aW9uID0gY2xhbXBNZW51UG9zaXRpb24oXG4gICAgICBwb2ludCxcbiAgICAgIHsgd2lkdGg6IHdpbmRvdy5pbm5lcldpZHRoLCBoZWlnaHQ6IHdpbmRvdy5pbm5lckhlaWdodCB9LFxuICAgICAge1xuICAgICAgICB3aWR0aDogbWVudS5vZmZzZXRXaWR0aCB8fCBGQUxMQkFDS19NRU5VX1NJWkUud2lkdGgsXG4gICAgICAgIGhlaWdodDogbWVudS5vZmZzZXRIZWlnaHQgfHwgRkFMTEJBQ0tfTUVOVV9TSVpFLmhlaWdodCxcbiAgICAgIH1cbiAgICApO1xuICAgIG1lbnUuc2V0Q3NzUHJvcHMoeyBsZWZ0OiBgJHtwb3NpdGlvbi54fXB4YCwgdG9wOiBgJHtwb3NpdGlvbi55fXB4YCB9KTtcbiAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAoZ2VuZXJhdGlvbiAhPT0gdGhpcy5vcGVuR2VuZXJhdGlvbiB8fCAhdGhpcy5lbGVtZW50KSByZXR1cm47XG4gICAgICB0aGlzLm91dHNpZGVMaXN0ZW5lciA9IChldmVudCkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMuZWxlbWVudD8uY29udGFpbnMoZXZlbnQudGFyZ2V0IGFzIE5vZGUpKSB0aGlzLmNsb3NlKCk7XG4gICAgICB9O1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIHRoaXMub3V0c2lkZUxpc3RlbmVyLCB0cnVlKTtcbiAgICB9LCAwKTtcbiAgfVxuICBjbG9zZSA9ICgpOiB2b2lkID0+IHtcbiAgICB0aGlzLm9wZW5HZW5lcmF0aW9uICs9IDE7XG4gICAgaWYgKHRoaXMub3V0c2lkZUxpc3RlbmVyKVxuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIHRoaXMub3V0c2lkZUxpc3RlbmVyLCB0cnVlKTtcbiAgICB0aGlzLm91dHNpZGVMaXN0ZW5lciA9IG51bGw7XG4gICAgdGhpcy5lbGVtZW50Py5yZW1vdmUoKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xuICB9O1xufVxuIiwgImltcG9ydCB7IFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIFN0eWx1c0NvbnRyb2xzUGx1Z2luIGZyb20gXCIuLi9tYWluXCI7XG5pbXBvcnQge1xuICBOVU1FUklDX1NFVFRJTkdfTElNSVRTLFxuICBwYXJzZU51bWVyaWNTZXR0aW5nLFxuICB0eXBlIE51bWVyaWNTZXR0aW5nS2V5LFxuICB0eXBlIEJhcnJlbEJ1dHRvbk1hc2ssXG4gIHR5cGUgU3R5bHVzQWN0aW9uLFxufSBmcm9tIFwiLi9zZXR0aW5nc1wiO1xuXG5jb25zdCBhY3Rpb25zOiBSZWNvcmQ8U3R5bHVzQWN0aW9uLCBzdHJpbmc+ID0ge1xuICBtZW51OiBcIk9wZW4gbWVudVwiLFxuICBjb3B5OiBcIkNvcHlcIixcbiAgcGFzdGU6IFwiUGFzdGVcIixcbiAgbm9uZTogXCJEbyBub3RoaW5nXCIsXG59O1xuXG5jb25zdCB0ZXN0UHJvZmlsZXM6IFJlY29yZDxcbiAgc3RyaW5nLFxuICB7IGxhYmVsOiBzdHJpbmc7IG1hc2s6IEJhcnJlbEJ1dHRvbk1hc2s7IHByaW1hcnlDb250YWN0TW9kZTogXCJob3Zlci1vbmx5XCIgfCBcImV4cGVyaW1lbnRhbFwiIH1cbj4gPSB7XG4gIFwic3RhbmRhcmRcIjoge1xuICAgIGxhYmVsOiBcIlN0YW5kYXJkIGJhcnJlbCBcdTIwMTQgYnV0dG9uczogMlwiLFxuICAgIG1hc2s6IDIsXG4gICAgcHJpbWFyeUNvbnRhY3RNb2RlOiBcImhvdmVyLW9ubHlcIixcbiAgfSxcbiAgXCJhbmRyb2lkLWhvdmVyXCI6IHtcbiAgICBsYWJlbDogXCJBbmRyb2lkL1dlYlZpZXcgcHJpbWFyeSBcdTIwMTQgYnV0dG9uczogMSwgaG92ZXIgb25seVwiLFxuICAgIG1hc2s6IDEsXG4gICAgcHJpbWFyeUNvbnRhY3RNb2RlOiBcImhvdmVyLW9ubHlcIixcbiAgfSxcbiAgXCJhbmRyb2lkLWNvbnRhY3RcIjoge1xuICAgIGxhYmVsOiBcIkFuZHJvaWQvV2ViVmlldyBwcmltYXJ5IFx1MjAxNCBidXR0b25zOiAxLCBjb250YWN0IGV4cGVyaW1lbnRcIixcbiAgICBtYXNrOiAxLFxuICAgIHByaW1hcnlDb250YWN0TW9kZTogXCJleHBlcmltZW50YWxcIixcbiAgfSxcbiAgXCJhdXhpbGlhcnlcIjoge1xuICAgIGxhYmVsOiBcIkF1eGlsaWFyeS9taWRkbGUgXHUyMDE0IGJ1dHRvbnM6IDRcIixcbiAgICBtYXNrOiA0LFxuICAgIHByaW1hcnlDb250YWN0TW9kZTogXCJob3Zlci1vbmx5XCIsXG4gIH0sXG4gIFwiYmFja1wiOiB7IGxhYmVsOiBcIkJhY2sgXHUyMDE0IGJ1dHRvbnM6IDhcIiwgbWFzazogOCwgcHJpbWFyeUNvbnRhY3RNb2RlOiBcImhvdmVyLW9ubHlcIiB9LFxuICBcImZvcndhcmRcIjogeyBsYWJlbDogXCJGb3J3YXJkIFx1MjAxNCBidXR0b25zOiAxNlwiLCBtYXNrOiAxNiwgcHJpbWFyeUNvbnRhY3RNb2RlOiBcImhvdmVyLW9ubHlcIiB9LFxuICBcImVyYXNlclwiOiB7IGxhYmVsOiBcIlBlbiBlcmFzZXIgXHUyMDE0IGJ1dHRvbnM6IDMyXCIsIG1hc2s6IDMyLCBwcmltYXJ5Q29udGFjdE1vZGU6IFwiaG92ZXItb25seVwiIH0sXG59O1xuXG5leHBvcnQgY2xhc3MgU2V0dGluZ3NUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbHVnaW46IFN0eWx1c0NvbnRyb2xzUGx1Z2luKSB7XG4gICAgc3VwZXIocGx1Z2luLmFwcCwgcGx1Z2luKTtcbiAgfVxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJSZXF1aXJlcyB0aGUgRXhjYWxpZHJhdyBjb21tdW5pdHkgcGx1Z2luLiBDb3B5IGFuZCBwYXN0ZSBhd2FpdCBhIGNvbXBhdGlibGUgRXhjYWxpZHJhdyBpbnRlZ3JhdGlvbiBhbmQgYXJlIGN1cnJlbnRseSB1bmF2YWlsYWJsZS5cIixcbiAgICB9KTtcbiAgICB0aGlzLmFjdGlvbihcIlRhcFwiLCBcImJ1dHRvblRhcEFjdGlvblwiKTtcbiAgICB0aGlzLmFjdGlvbihcIkRvdWJsZSB0YXBcIiwgXCJidXR0b25Eb3VibGVUYXBBY3Rpb25cIik7XG4gICAgdGhpcy5hY3Rpb24oXCJIb2xkXCIsIFwiYnV0dG9uSG9sZEFjdGlvblwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQnV0dG9uICsgcGVuIGNvbnRhY3RcIilcbiAgICAgIC5zZXREZXNjKFwiVGVtcG9yYXJ5IHRvb2wgd2hpbGUgdGhlIHNpZGUgYnV0dG9uIGlzIGhlbGQgZHVyaW5nIHBlbiBjb250YWN0LlwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT5cbiAgICAgICAgZHJvcGRvd25cbiAgICAgICAgICAuYWRkT3B0aW9uKFwiZXJhc2VyXCIsIFwiVGVtcG9yYXJ5IGVyYXNlclwiKVxuICAgICAgICAgIC5hZGRPcHRpb24oXCJub25lXCIsIFwiRG8gbm90aGluZ1wiKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5idXR0b25Db250YWN0QWN0aW9uKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7XG4gICAgICAgICAgICAgIGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlIGFzIFwiZXJhc2VyXCIgfCBcIm5vbmVcIixcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKVxuICAgICAgKTtcbiAgICB0aGlzLm51bWJlcihcIkRvdWJsZS10YXAgaW50ZXJ2YWwgKG1zKVwiLCBcImRvdWJsZVRhcE1zXCIpO1xuICAgIHRoaXMubnVtYmVyKFwiTG9uZy1wcmVzcyBkZWxheSAobXMpXCIsIFwibG9uZ1ByZXNzTXNcIik7XG4gICAgdGhpcy5udW1iZXIoXCJNb3ZlbWVudCB0aHJlc2hvbGQgKHB4KVwiLCBcIm1vdmVtZW50VGhyZXNob2xkUHhcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlMgUGVuIHRlc3QgbW9kZVwiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIFwiU3VwcHJlc3NlcyBtZW51LCBjbGlwYm9hcmQsIGFuZCB0ZW1wb3JhcnktdG9vbCBjaGFuZ2VzIHdoaWxlIHN0aWxsIHNob3dpbmcgcmVjb2duaXplZCBzdGF0ZSBhbmQgZWZmZWN0cyBpbiB0aGUgZGVidWcgb3ZlcmxheS4gVXNlIHRoaXMgd2hpbGUgdHJ5aW5nIHNpZ25hbCBwcm9maWxlcy5cIlxuICAgICAgKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxuICAgICAgICB0b2dnbGVcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Muc3R5bHVzVGVzdE1vZGUpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4gdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBzdHlsdXNUZXN0TW9kZTogdmFsdWUgfSkpXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJTIFBlbiBzaWduYWwgdGVzdCBwcm9maWxlXCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJUcnkgb25lIHByb2ZpbGUgYXQgYSB0aW1lIHdpdGggdGVzdCBtb2RlIGVuYWJsZWQsIHRoZW4gZXhwb3J0IHRoZSB0cmFjZS4gVGhlIEFuZHJvaWQgY29udGFjdCBleHBlcmltZW50IG1heSByZWNvZ25pemUgZXZlcnkgb3JkaW5hcnkgcGVuIHN0cm9rZTsgdXNlIGl0IG9ubHkgaW4gYSBkaXNwb3NhYmxlIGRyYXdpbmcuXCJcbiAgICAgIClcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgZm9yIChjb25zdCBbdmFsdWUsIHByb2ZpbGVdIG9mIE9iamVjdC5lbnRyaWVzKHRlc3RQcm9maWxlcykpXG4gICAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKHZhbHVlLCBwcm9maWxlLmxhYmVsKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUodGhpcy5jdXJyZW50VGVzdFByb2ZpbGUoKSkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uc3QgcHJvZmlsZSA9IHRlc3RQcm9maWxlc1t2YWx1ZV07XG4gICAgICAgICAgaWYgKCFwcm9maWxlKSByZXR1cm47XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3Moe1xuICAgICAgICAgICAgYmFycmVsQnV0dG9uTWFzazogcHJvZmlsZS5tYXNrLFxuICAgICAgICAgICAgcHJpbWFyeUNvbnRhY3RNb2RlOiBwcm9maWxlLnByaW1hcnlDb250YWN0TW9kZSxcbiAgICAgICAgICAgIHN0eWx1c1Rlc3RNb2RlOiB0cnVlLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWJ1ZyBsb2dnaW5nXCIpXG4gICAgICAuc2V0RGVzYyhcIkxvZ3MgYm91bmRlZCByYXcgcGVuIGV2ZW50IHRyYWNlcyB0byB0aGUgZGV2ZWxvcGVyIGNvbnNvbGUuXCIpXG4gICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XG4gICAgICAgIHRvZ2dsZVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWJ1Z01vZGUpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4gdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBkZWJ1Z01vZGU6IHZhbHVlIH0pKVxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVidWcgb3ZlcmxheVwiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIFwiU2hvd3MgdGhlIGxhdGVzdCBwZW4gZXZlbnQgYW5kIHN0eWx1cyBzdGF0ZSBpbiB0aGUgRXhjYWxpZHJhdyB2aWV3LiBSZXF1aXJlcyBkZWJ1ZyBsb2dnaW5nLlwiXG4gICAgICApXG4gICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XG4gICAgICAgIHRvZ2dsZVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWJ1Z092ZXJsYXkpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4gdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBkZWJ1Z092ZXJsYXk6IHZhbHVlIH0pKVxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRXhwb3J0IGRlYnVnIHRyYWNlXCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJDb3BpZXMgYnVmZmVyZWQgcGVuIGV2ZW50cyBmcm9tIGV2ZXJ5IG9wZW4gRXhjYWxpZHJhdyB2aWV3IGFzIEpTT04sIHJlYWR5IHRvIGF0dGFjaCB0byBhIGJ1ZyByZXBvcnQuXCJcbiAgICAgIClcbiAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT5cbiAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJDb3B5IHRyYWNlXCIpLm9uQ2xpY2soKCkgPT4gdGhpcy5wbHVnaW4uY29weVN0eWx1c0V2ZW50VHJhY2UoKSlcbiAgICAgICk7XG4gIH1cbiAgcHJpdmF0ZSBhY3Rpb24oXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIGtleTogXCJidXR0b25UYXBBY3Rpb25cIiB8IFwiYnV0dG9uRG91YmxlVGFwQWN0aW9uXCIgfCBcImJ1dHRvbkhvbGRBY3Rpb25cIlxuICApOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRhaW5lckVsKS5zZXROYW1lKGBTIFBlbiBzaWRlIGJ1dHRvbjogJHtuYW1lfWApLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgZm9yIChjb25zdCBbdmFsdWUsIGxhYmVsXSBvZiBPYmplY3QuZW50cmllcyhhY3Rpb25zKSkgZHJvcGRvd24uYWRkT3B0aW9uKHZhbHVlLCBsYWJlbCk7XG4gICAgICBkcm9wZG93blxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Nba2V5XSlcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4gdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBba2V5XTogdmFsdWUgYXMgU3R5bHVzQWN0aW9uIH0pKTtcbiAgICB9KTtcbiAgfVxuICBwcml2YXRlIG51bWJlcihuYW1lOiBzdHJpbmcsIGtleTogTnVtZXJpY1NldHRpbmdLZXkpOiB2b2lkIHtcbiAgICBjb25zdCB7IG1pbiwgbWF4IH0gPSBOVU1FUklDX1NFVFRJTkdfTElNSVRTW2tleV07XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKG5hbWUpXG4gICAgICAuc2V0RGVzYyhgV2hvbGUgbWlsbGlzZWNvbmRzL3BpeGVscyBmcm9tICR7bWlufSB0byAke21heH0uYClcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxuICAgICAgICB0ZXh0LnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5nc1trZXldKSkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VOdW1lcmljU2V0dGluZyhrZXksIHZhbHVlKTtcbiAgICAgICAgICB0ZXh0LmlucHV0RWwuc2V0Q3VzdG9tVmFsaWRpdHkoXG4gICAgICAgICAgICBwYXJzZWQgPT09IG51bGwgPyBgRW50ZXIgYSB3aG9sZSBudW1iZXIgZnJvbSAke21pbn0gdG8gJHttYXh9LmAgOiBcIlwiXG4gICAgICAgICAgKTtcbiAgICAgICAgICBpZiAocGFyc2VkID09PSBudWxsKSByZXR1cm47XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBba2V5XTogcGFyc2VkIH0pO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgY3VycmVudFRlc3RQcm9maWxlKCk6IHN0cmluZyB7XG4gICAgY29uc3QgeyBiYXJyZWxCdXR0b25NYXNrLCBwcmltYXJ5Q29udGFjdE1vZGUgfSA9IHRoaXMucGx1Z2luLnNldHRpbmdzO1xuICAgIHJldHVybiAoXG4gICAgICBPYmplY3QuZW50cmllcyh0ZXN0UHJvZmlsZXMpLmZpbmQoXG4gICAgICAgIChbLCBwcm9maWxlXSkgPT5cbiAgICAgICAgICBwcm9maWxlLm1hc2sgPT09IGJhcnJlbEJ1dHRvbk1hc2sgJiYgcHJvZmlsZS5wcmltYXJ5Q29udGFjdE1vZGUgPT09IHByaW1hcnlDb250YWN0TW9kZVxuICAgICAgKT8uWzBdID8/IFwic3RhbmRhcmRcIlxuICAgICk7XG4gIH1cbn1cbiIsICJleHBvcnQgdHlwZSBTdHlsdXNBY3Rpb24gPSBcIm1lbnVcIiB8IFwiY29weVwiIHwgXCJwYXN0ZVwiIHwgXCJub25lXCI7XG5leHBvcnQgdHlwZSBCYXJyZWxCdXR0b25NYXNrID0gMSB8IDIgfCA0IHwgOCB8IDE2IHwgMzI7XG5leHBvcnQgdHlwZSBQcmltYXJ5Q29udGFjdE1vZGUgPSBcImhvdmVyLW9ubHlcIiB8IFwiZXhwZXJpbWVudGFsXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB7XG4gIGJ1dHRvblRhcEFjdGlvbjogU3R5bHVzQWN0aW9uO1xuICBidXR0b25Eb3VibGVUYXBBY3Rpb246IFN0eWx1c0FjdGlvbjtcbiAgYnV0dG9uSG9sZEFjdGlvbjogU3R5bHVzQWN0aW9uO1xuICBidXR0b25Db250YWN0QWN0aW9uOiBcImVyYXNlclwiIHwgXCJub25lXCI7XG4gIGRvdWJsZVRhcE1zOiBudW1iZXI7XG4gIGxvbmdQcmVzc01zOiBudW1iZXI7XG4gIG1vdmVtZW50VGhyZXNob2xkUHg6IG51bWJlcjtcbiAgLyoqIFBvaW50ZXJFdmVudC5idXR0b25zIGJpdCB1c2VkIGJ5IHRoZSBkZXZpY2UgZm9yIHRoZSBiYXJyZWwgYnV0dG9uLiAqL1xuICBiYXJyZWxCdXR0b25NYXNrOiBCYXJyZWxCdXR0b25NYXNrO1xuICAvKiogUHJldmVudCB0aGUgQW5kcm9pZC9XZWJWaWV3IHByaW1hcnkgYml0IGZyb20gbWF0Y2hpbmcgb3JkaW5hcnkgcGVuIGNvbnRhY3QgYnkgZGVmYXVsdC4gKi9cbiAgcHJpbWFyeUNvbnRhY3RNb2RlOiBQcmltYXJ5Q29udGFjdE1vZGU7XG4gIC8qKiBBbGxvdyBhIHRlc3RlciB0byBpbnNwZWN0IHJlY29nbml0aW9uIHdpdGhvdXQgY2hhbmdpbmcgdGhlIGRyYXdpbmcgb3Igb3BlbmluZyBhY3Rpb25zLiAqL1xuICBzdHlsdXNUZXN0TW9kZTogYm9vbGVhbjtcbiAgZGVidWdNb2RlOiBib29sZWFuO1xuICBkZWJ1Z092ZXJsYXk6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTdHlsdXNDb250cm9sc1NldHRpbmdzID0ge1xuICBidXR0b25UYXBBY3Rpb246IFwibWVudVwiLFxuICBidXR0b25Eb3VibGVUYXBBY3Rpb246IFwiY29weVwiLFxuICBidXR0b25Ib2xkQWN0aW9uOiBcInBhc3RlXCIsXG4gIGJ1dHRvbkNvbnRhY3RBY3Rpb246IFwiZXJhc2VyXCIsXG4gIGRvdWJsZVRhcE1zOiAzMDAsXG4gIGxvbmdQcmVzc01zOiA0NTAsXG4gIG1vdmVtZW50VGhyZXNob2xkUHg6IDgsXG4gIC8vIFBvaW50ZXIgRXZlbnRzIHNwZWNpZmllcyBiaXQgMiBmb3IgYSBwZW4gYmFycmVsIGJ1dHRvbi4gQml0IDEgaXMgdGhlIHRpcC5cbiAgYmFycmVsQnV0dG9uTWFzazogMixcbiAgcHJpbWFyeUNvbnRhY3RNb2RlOiBcImhvdmVyLW9ubHlcIixcbiAgc3R5bHVzVGVzdE1vZGU6IGZhbHNlLFxuICBkZWJ1Z01vZGU6IGZhbHNlLFxuICBkZWJ1Z092ZXJsYXk6IGZhbHNlLFxufTtcblxuZXhwb3J0IGNvbnN0IE5VTUVSSUNfU0VUVElOR19MSU1JVFMgPSB7XG4gIGRvdWJsZVRhcE1zOiB7IG1pbjogMTAwLCBtYXg6IDEwMDAgfSxcbiAgbG9uZ1ByZXNzTXM6IHsgbWluOiAxNTAsIG1heDogMjAwMCB9LFxuICBtb3ZlbWVudFRocmVzaG9sZFB4OiB7IG1pbjogMSwgbWF4OiAxMDAgfSxcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIE51bWVyaWNTZXR0aW5nS2V5ID0ga2V5b2YgdHlwZW9mIE5VTUVSSUNfU0VUVElOR19MSU1JVFM7XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU51bWVyaWNTZXR0aW5nKGtleTogTnVtZXJpY1NldHRpbmdLZXksIHZhbHVlOiBzdHJpbmcpOiBudW1iZXIgfCBudWxsIHtcbiAgY29uc3QgcGFyc2VkID0gTnVtYmVyKHZhbHVlKTtcbiAgY29uc3QgeyBtaW4sIG1heCB9ID0gTlVNRVJJQ19TRVRUSU5HX0xJTUlUU1trZXldO1xuICByZXR1cm4gTnVtYmVyLmlzSW50ZWdlcihwYXJzZWQpICYmIHBhcnNlZCA+PSBtaW4gJiYgcGFyc2VkIDw9IG1heCA/IHBhcnNlZCA6IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVTZXR0aW5ncyh2YWx1ZTogUGFydGlhbDxTdHlsdXNDb250cm9sc1NldHRpbmdzPik6IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3Mge1xuICBjb25zdCBhY3Rpb24gPSAoY2FuZGlkYXRlOiB1bmtub3duLCBmYWxsYmFjazogU3R5bHVzQWN0aW9uKTogU3R5bHVzQWN0aW9uID0+XG4gICAgY2FuZGlkYXRlID09PSBcIm1lbnVcIiB8fCBjYW5kaWRhdGUgPT09IFwiY29weVwiIHx8IGNhbmRpZGF0ZSA9PT0gXCJwYXN0ZVwiIHx8IGNhbmRpZGF0ZSA9PT0gXCJub25lXCJcbiAgICAgID8gY2FuZGlkYXRlXG4gICAgICA6IGZhbGxiYWNrO1xuICBjb25zdCBudW1iZXIgPSAoY2FuZGlkYXRlOiB1bmtub3duLCBmYWxsYmFjazogbnVtYmVyLCBtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXIgPT5cbiAgICB0eXBlb2YgY2FuZGlkYXRlID09PSBcIm51bWJlclwiICYmIE51bWJlci5pc0Zpbml0ZShjYW5kaWRhdGUpXG4gICAgICA/IE1hdGgubWluKG1heCwgTWF0aC5tYXgobWluLCBNYXRoLnJvdW5kKGNhbmRpZGF0ZSkpKVxuICAgICAgOiBmYWxsYmFjaztcbiAgcmV0dXJuIHtcbiAgICBidXR0b25UYXBBY3Rpb246IGFjdGlvbih2YWx1ZS5idXR0b25UYXBBY3Rpb24sIERFRkFVTFRfU0VUVElOR1MuYnV0dG9uVGFwQWN0aW9uKSxcbiAgICBidXR0b25Eb3VibGVUYXBBY3Rpb246IGFjdGlvbihcbiAgICAgIHZhbHVlLmJ1dHRvbkRvdWJsZVRhcEFjdGlvbixcbiAgICAgIERFRkFVTFRfU0VUVElOR1MuYnV0dG9uRG91YmxlVGFwQWN0aW9uXG4gICAgKSxcbiAgICBidXR0b25Ib2xkQWN0aW9uOiBhY3Rpb24odmFsdWUuYnV0dG9uSG9sZEFjdGlvbiwgREVGQVVMVF9TRVRUSU5HUy5idXR0b25Ib2xkQWN0aW9uKSxcbiAgICBidXR0b25Db250YWN0QWN0aW9uOiB2YWx1ZS5idXR0b25Db250YWN0QWN0aW9uID09PSBcIm5vbmVcIiA/IFwibm9uZVwiIDogXCJlcmFzZXJcIixcbiAgICBkb3VibGVUYXBNczogbnVtYmVyKFxuICAgICAgdmFsdWUuZG91YmxlVGFwTXMsXG4gICAgICAzMDAsXG4gICAgICBOVU1FUklDX1NFVFRJTkdfTElNSVRTLmRvdWJsZVRhcE1zLm1pbixcbiAgICAgIE5VTUVSSUNfU0VUVElOR19MSU1JVFMuZG91YmxlVGFwTXMubWF4XG4gICAgKSxcbiAgICBsb25nUHJlc3NNczogbnVtYmVyKFxuICAgICAgdmFsdWUubG9uZ1ByZXNzTXMsXG4gICAgICA0NTAsXG4gICAgICBOVU1FUklDX1NFVFRJTkdfTElNSVRTLmxvbmdQcmVzc01zLm1pbixcbiAgICAgIE5VTUVSSUNfU0VUVElOR19MSU1JVFMubG9uZ1ByZXNzTXMubWF4XG4gICAgKSxcbiAgICBtb3ZlbWVudFRocmVzaG9sZFB4OiBudW1iZXIoXG4gICAgICB2YWx1ZS5tb3ZlbWVudFRocmVzaG9sZFB4LFxuICAgICAgOCxcbiAgICAgIE5VTUVSSUNfU0VUVElOR19MSU1JVFMubW92ZW1lbnRUaHJlc2hvbGRQeC5taW4sXG4gICAgICBOVU1FUklDX1NFVFRJTkdfTElNSVRTLm1vdmVtZW50VGhyZXNob2xkUHgubWF4XG4gICAgKSxcbiAgICBiYXJyZWxCdXR0b25NYXNrOlxuICAgICAgdmFsdWUuYmFycmVsQnV0dG9uTWFzayA9PT0gMSB8fFxuICAgICAgdmFsdWUuYmFycmVsQnV0dG9uTWFzayA9PT0gNCB8fFxuICAgICAgdmFsdWUuYmFycmVsQnV0dG9uTWFzayA9PT0gOCB8fFxuICAgICAgdmFsdWUuYmFycmVsQnV0dG9uTWFzayA9PT0gMTYgfHxcbiAgICAgIHZhbHVlLmJhcnJlbEJ1dHRvbk1hc2sgPT09IDMyXG4gICAgICAgID8gdmFsdWUuYmFycmVsQnV0dG9uTWFza1xuICAgICAgICA6IERFRkFVTFRfU0VUVElOR1MuYmFycmVsQnV0dG9uTWFzayxcbiAgICBwcmltYXJ5Q29udGFjdE1vZGU6IHZhbHVlLnByaW1hcnlDb250YWN0TW9kZSA9PT0gXCJleHBlcmltZW50YWxcIiA/IFwiZXhwZXJpbWVudGFsXCIgOiBcImhvdmVyLW9ubHlcIixcbiAgICBzdHlsdXNUZXN0TW9kZTogdmFsdWUuc3R5bHVzVGVzdE1vZGUgPT09IHRydWUsXG4gICAgZGVidWdNb2RlOiB2YWx1ZS5kZWJ1Z01vZGUgPT09IHRydWUsXG4gICAgZGVidWdPdmVybGF5OiB2YWx1ZS5kZWJ1Z092ZXJsYXkgPT09IHRydWUsXG4gIH07XG59XG4iLCAiaW1wb3J0IHsgTm90aWNlLCB0eXBlIFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5pbXBvcnQge1xuICBnZXRMZWFmQXBpLFxuICByZWFkQWN0aXZlVG9vbCxcbiAgdHlwZSBBY3RpdmVUb29sU25hcHNob3QsXG4gIHR5cGUgQnJpZGdlT3BlcmF0aW9uUmVzdWx0LFxuICB0eXBlIEJyaWRnZVJlc3VsdCxcbiAgdHlwZSBDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaSxcbn0gZnJvbSBcIi4vY29tcGF0aWJpbGl0eVwiO1xuXG5leHBvcnQgdHlwZSB7XG4gIEFjdGl2ZVRvb2xTbmFwc2hvdCxcbiAgQnJpZGdlRmFpbHVyZUNvZGUsXG4gIEJyaWRnZU9wZXJhdGlvblJlc3VsdCxcbiAgQnJpZGdlUmVzdWx0LFxufSBmcm9tIFwiLi9jb21wYXRpYmlsaXR5XCI7XG5cbi8qKiBDb21wYXRpYmlsaXR5IGJvdW5kYXJ5IGZvciB0aGUgb3B0aW9uYWwgRXhjYWxpZHJhdyBwbHVnaW4uICovXG5leHBvcnQgY2xhc3MgRXhjYWxpZHJhd0JyaWRnZSB7XG4gIHByaXZhdGUgd2FybmVkID0gZmFsc2U7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgbGVhZjogV29ya3NwYWNlTGVhZikge31cblxuICBzdGFydFRlbXBvcmFyeUVyYXNlcigpOiBCcmlkZ2VSZXN1bHQ8QWN0aXZlVG9vbFNuYXBzaG90PiB7XG4gICAgY29uc3QgYXBpUmVzdWx0ID0gdGhpcy5nZXRBcGkoKTtcbiAgICBpZiAoIWFwaVJlc3VsdC5vaykgcmV0dXJuIHRoaXMucmVwb3J0KGFwaVJlc3VsdCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRvb2wgPSByZWFkQWN0aXZlVG9vbChhcGlSZXN1bHQudmFsdWUpO1xuICAgICAgaWYgKCF0b29sKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXG4gICAgICAgICAgXCJpbmNvbXBhdGlibGVcIixcbiAgICAgICAgICBcIlRlbXBvcmFyeSBlcmFzZXIgY291bGQgbm90IHJlYWQgdGhlIGN1cnJlbnQgYWN0aXZlIHRvb2wuXCJcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGFwaVJlc3VsdC52YWx1ZS5zZXRBY3RpdmVUb29sKHsgdHlwZTogXCJlcmFzZXJcIiB9KTtcbiAgICAgIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogdG9vbCB9O1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHRoaXMuZmFpbHVyZShcImZhaWxlZFwiLCBcIlRlbXBvcmFyeSBlcmFzZXIgaXMgdW5hdmFpbGFibGUgaW4gdGhpcyBFeGNhbGlkcmF3IHZpZXcuXCIpO1xuICAgIH1cbiAgfVxuICByZXN0b3JlVG9vbCh0b29sOiBBY3RpdmVUb29sU25hcHNob3QpOiBCcmlkZ2VPcGVyYXRpb25SZXN1bHQge1xuICAgIGNvbnN0IGFwaVJlc3VsdCA9IHRoaXMuZ2V0QXBpKCk7XG4gICAgaWYgKCFhcGlSZXN1bHQub2spIHJldHVybiB0aGlzLnJlcG9ydChhcGlSZXN1bHQpO1xuICAgIHRyeSB7XG4gICAgICBhcGlSZXN1bHQudmFsdWUuc2V0QWN0aXZlVG9vbCh0b29sKTtcbiAgICAgIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogdW5kZWZpbmVkIH07XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFxuICAgICAgICBcImZhaWxlZFwiLFxuICAgICAgICBcIlRoZSBwcmV2aW91cyB0b29sIGNvdWxkIG5vdCBiZSByZXN0b3JlZCBpbiB0aGlzIEV4Y2FsaWRyYXcgdmlldy5cIlxuICAgICAgKTtcbiAgICB9XG4gIH1cbiAgc2V0VG9vbCh0eXBlOiBzdHJpbmcpOiBCcmlkZ2VPcGVyYXRpb25SZXN1bHQge1xuICAgIGNvbnN0IGFwaVJlc3VsdCA9IHRoaXMuZ2V0QXBpKCk7XG4gICAgaWYgKCFhcGlSZXN1bHQub2spIHJldHVybiB0aGlzLnJlcG9ydChhcGlSZXN1bHQpO1xuICAgIHRyeSB7XG4gICAgICBhcGlSZXN1bHQudmFsdWUuc2V0QWN0aXZlVG9vbCh7IHR5cGUgfSk7XG4gICAgICByZXR1cm4geyBvazogdHJ1ZSwgdmFsdWU6IHVuZGVmaW5lZCB9O1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHRoaXMuZmFpbHVyZShcImZhaWxlZFwiLCBcIlRvb2wgc3dpdGNoaW5nIGlzIHVuYXZhaWxhYmxlIGluIHRoaXMgRXhjYWxpZHJhdyB2aWV3LlwiKTtcbiAgICB9XG4gIH1cbiAgY29weVNlbGVjdGVkRWxlbWVudHMoKTogQnJpZGdlT3BlcmF0aW9uUmVzdWx0IHtcbiAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwidW5hdmFpbGFibGVcIiwgXCJDb3B5IHJlcXVpcmVzIGEgY29tcGF0aWJsZSBFeGNhbGlkcmF3IEFQSS5cIik7XG4gIH1cbiAgcGFzdGVBdChwb2ludDogUG9pbnQpOiBCcmlkZ2VPcGVyYXRpb25SZXN1bHQge1xuICAgIHZvaWQgcG9pbnQ7XG4gICAgcmV0dXJuIHRoaXMuZmFpbHVyZShcInVuYXZhaWxhYmxlXCIsIFwiUGFzdGUgcmVxdWlyZXMgYSBjb21wYXRpYmxlIEV4Y2FsaWRyYXcgQVBJLlwiKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0QXBpKCk6IEJyaWRnZVJlc3VsdDxDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaT4ge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZ2V0TGVhZkFwaSh0aGlzLmxlYWYudmlldyk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvazogZmFsc2UsXG4gICAgICAgIGNvZGU6IFwiZmFpbGVkXCIsXG4gICAgICAgIG1lc3NhZ2U6IFwiRXhjYWxpZHJhdyBBUEkgbG9va3VwIGZhaWxlZCBmb3IgdGhpcyBsZWFmLlwiLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlcG9ydDxUPihyZXN1bHQ6IEV4Y2x1ZGU8QnJpZGdlUmVzdWx0PFQ+LCB7IG9rOiB0cnVlIH0+KTogQnJpZGdlUmVzdWx0PG5ldmVyPiB7XG4gICAgdGhpcy51bnN1cHBvcnRlZChyZXN1bHQubWVzc2FnZSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBwcml2YXRlIGZhaWx1cmUoXG4gICAgY29kZTogXCJ1bmF2YWlsYWJsZVwiIHwgXCJpbmNvbXBhdGlibGVcIiB8IFwiZmFpbGVkXCIsXG4gICAgbWVzc2FnZTogc3RyaW5nXG4gICk6IEJyaWRnZVJlc3VsdDxuZXZlcj4ge1xuICAgIHRoaXMudW5zdXBwb3J0ZWQobWVzc2FnZSk7XG4gICAgcmV0dXJuIHsgb2s6IGZhbHNlLCBjb2RlLCBtZXNzYWdlIH07XG4gIH1cbiAgcHJpdmF0ZSB1bnN1cHBvcnRlZChtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMud2FybmVkKSB7XG4gICAgICBuZXcgTm90aWNlKGBFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9sczogJHttZXNzYWdlfWApO1xuICAgICAgdGhpcy53YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgQWN0aXZlVG9vbFNuYXBzaG90IHtcbiAgdHlwZTogc3RyaW5nO1xuICBba2V5OiBzdHJpbmddOiB1bmtub3duO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltcGVyYXRpdmVBcGkge1xuICBnZXRBcHBTdGF0ZT86ICgpID0+IHsgYWN0aXZlVG9vbD86IEFjdGl2ZVRvb2xTbmFwc2hvdCB9O1xuICBzZXRBY3RpdmVUb29sPzogKHRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaSBleHRlbmRzIEltcGVyYXRpdmVBcGkge1xuICBnZXRBcHBTdGF0ZTogKCkgPT4geyBhY3RpdmVUb29sPzogQWN0aXZlVG9vbFNuYXBzaG90IH07XG4gIHNldEFjdGl2ZVRvb2w6ICh0b29sOiBBY3RpdmVUb29sU25hcHNob3QpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCB0eXBlIEJyaWRnZUZhaWx1cmVDb2RlID0gXCJ1bmF2YWlsYWJsZVwiIHwgXCJpbmNvbXBhdGlibGVcIiB8IFwiZmFpbGVkXCI7XG5cbmV4cG9ydCB0eXBlIEJyaWRnZVJlc3VsdDxUPiA9XG4gIHsgb2s6IHRydWU7IHZhbHVlOiBUIH0gfCB7IG9rOiBmYWxzZTsgY29kZTogQnJpZGdlRmFpbHVyZUNvZGU7IG1lc3NhZ2U6IHN0cmluZyB9O1xuXG5leHBvcnQgdHlwZSBCcmlkZ2VPcGVyYXRpb25SZXN1bHQgPSBCcmlkZ2VSZXN1bHQ8dm9pZD47XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXhjYWxpZHJhd0xlYWZTdXJmYWNlIHtcbiAgLyoqXG4gICAqIFRoaXMgaXMgYSBjb21wYXRpYmlsaXR5IGZhbGxiYWNrLCBub3QgYSBkb2N1bWVudGVkIEV4Y2FsaWRyYXcgcGx1Z2luIEFQSS5cbiAgICogS2VlcCBhY2Nlc3MgdG8gaXQgaGVyZSB1bnRpbCBFeGNhbGlkcmF3IHB1Ymxpc2hlcyBhIHRoaXJkLXBhcnR5LCBsZWFmLXNjb3BlZFxuICAgKiBpbnRlZ3JhdGlvbiBwb2ludC5cbiAgICovXG4gIGV4Y2FsaWRyYXdBUEk/OiB1bmtub3duO1xufVxuXG4vKiogVGhlIGRvY3VtZW50ZWQsIHZpZXctdGFyZ2V0ZWQgcG9ydGlvbiBvZiBFeGNhbGlkcmF3QXV0b21hdGUgdXNlZCBieSB0aGlzIHBsdWdpbi4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXhjYWxpZHJhd0F1dG9tYXRlU3VyZmFjZSB7XG4gIHNldFZpZXc6ICh2aWV3OiB1bmtub3duKSA9PiB1bmtub3duO1xuICBnZXRFeGNhbGlkcmF3QVBJOiAoKSA9PiB1bmtub3duO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRvb2xDYXBhYmlsaXRpZXMge1xuICBjYW5SZWFkQWN0aXZlVG9vbDogYm9vbGVhbjtcbiAgY2FuU2V0QWN0aXZlVG9vbDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvb2xDYXBhYmlsaXRpZXMoYXBpOiBJbXBlcmF0aXZlQXBpIHwgbnVsbCk6IFRvb2xDYXBhYmlsaXRpZXMge1xuICByZXR1cm4ge1xuICAgIGNhblJlYWRBY3RpdmVUb29sOiB0eXBlb2YgYXBpPy5nZXRBcHBTdGF0ZSA9PT0gXCJmdW5jdGlvblwiLFxuICAgIGNhblNldEFjdGl2ZVRvb2w6IHR5cGVvZiBhcGk/LnNldEFjdGl2ZVRvb2wgPT09IFwiZnVuY3Rpb25cIixcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBY3RpdmVUb29sKGFwaTogSW1wZXJhdGl2ZUFwaSk6IEFjdGl2ZVRvb2xTbmFwc2hvdCB8IG51bGwge1xuICBjb25zdCBhY3RpdmVUb29sID0gYXBpLmdldEFwcFN0YXRlPy4oKS5hY3RpdmVUb29sO1xuICByZXR1cm4gYWN0aXZlVG9vbCA/IHsgLi4uYWN0aXZlVG9vbCB9IDogbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldExlYWZBcGkoXG4gIHZpZXc6IHVua25vd24sXG4gIGF1dG9tYXRlID0gZ2V0R2xvYmFsQXV0b21hdGUoKVxuKTogQnJpZGdlUmVzdWx0PENvbXBhdGlibGVJbXBlcmF0aXZlQXBpPiB7XG4gIGlmICghdmlldyB8fCB0eXBlb2YgdmlldyAhPT0gXCJvYmplY3RcIikge1xuICAgIHJldHVybiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBjb2RlOiBcInVuYXZhaWxhYmxlXCIsXG4gICAgICBtZXNzYWdlOiBcIlRoaXMgbGVhZiBkb2VzIG5vdCBleHBvc2UgYW4gRXhjYWxpZHJhdyB2aWV3LlwiLFxuICAgIH07XG4gIH1cbiAgaWYgKGF1dG9tYXRlKSB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIEV4Y2FsaWRyYXdBdXRvbWF0ZSBkb2N1bWVudHMgc2V0Vmlldyh2aWV3KSBzcGVjaWZpY2FsbHkgc28gb3BlcmF0aW9uc1xuICAgICAgLy8gYXJlIHNjb3BlZCB0byB0aGF0IHZpZXcuIE5ldmVyIHBhc3MgXCJhY3RpdmVcIiBoZXJlLlxuICAgICAgYXV0b21hdGUuc2V0Vmlldyh2aWV3KTtcbiAgICAgIHJldHVybiB2YWxpZGF0ZUltcGVyYXRpdmVBcGkoYXV0b21hdGUuZ2V0RXhjYWxpZHJhd0FQSSgpKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgY29kZTogXCJmYWlsZWRcIixcbiAgICAgICAgbWVzc2FnZTogXCJFeGNhbGlkcmF3IGNvdWxkIG5vdCB0YXJnZXQgdGhpcyBsZWFmJ3MgY2FudmFzLlwiLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvLyBUaGlzIGZhbGxiYWNrIGlzIGRlbGliZXJhdGVseSBpc29sYXRlZDogaXQgaXMgbm90IHBhcnQgb2YgRXhjYWxpZHJhdydzXG4gIC8vIGRvY3VtZW50ZWQgdGhpcmQtcGFydHkgQVBJIHN1cmZhY2UuXG4gIGNvbnN0IGFwaSA9ICh2aWV3IGFzIEV4Y2FsaWRyYXdMZWFmU3VyZmFjZSkuZXhjYWxpZHJhd0FQSTtcbiAgcmV0dXJuIHZhbGlkYXRlSW1wZXJhdGl2ZUFwaShhcGkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2xvYmFsQXV0b21hdGUoKTogRXhjYWxpZHJhd0F1dG9tYXRlU3VyZmFjZSB8IG51bGwge1xuICBjb25zdCBjYW5kaWRhdGUgPSAoZ2xvYmFsVGhpcyBhcyB7IEV4Y2FsaWRyYXdBdXRvbWF0ZT86IHVua25vd24gfSkuRXhjYWxpZHJhd0F1dG9tYXRlO1xuICBpZiAoXG4gICAgY2FuZGlkYXRlICYmXG4gICAgdHlwZW9mIGNhbmRpZGF0ZSA9PT0gXCJvYmplY3RcIiAmJlxuICAgIHR5cGVvZiAoY2FuZGlkYXRlIGFzIEV4Y2FsaWRyYXdBdXRvbWF0ZVN1cmZhY2UpLnNldFZpZXcgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgIHR5cGVvZiAoY2FuZGlkYXRlIGFzIEV4Y2FsaWRyYXdBdXRvbWF0ZVN1cmZhY2UpLmdldEV4Y2FsaWRyYXdBUEkgPT09IFwiZnVuY3Rpb25cIlxuICApIHtcbiAgICByZXR1cm4gY2FuZGlkYXRlIGFzIEV4Y2FsaWRyYXdBdXRvbWF0ZVN1cmZhY2U7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlSW1wZXJhdGl2ZUFwaShhcGk6IHVua25vd24pOiBCcmlkZ2VSZXN1bHQ8Q29tcGF0aWJsZUltcGVyYXRpdmVBcGk+IHtcbiAgaWYgKCFhcGkgfHwgdHlwZW9mIGFwaSAhPT0gXCJvYmplY3RcIikge1xuICAgIHJldHVybiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBjb2RlOiBcInVuYXZhaWxhYmxlXCIsXG4gICAgICBtZXNzYWdlOiBcIkV4Y2FsaWRyYXcgaGFzIG5vdCBtYWRlIGFuIEFQSSBhdmFpbGFibGUgZm9yIHRoaXMgbGVhZi5cIixcbiAgICB9O1xuICB9XG4gIGNvbnN0IGNhcGFiaWxpdGllcyA9IHRvb2xDYXBhYmlsaXRpZXMoYXBpIGFzIEltcGVyYXRpdmVBcGkpO1xuICBpZiAoIWNhcGFiaWxpdGllcy5jYW5SZWFkQWN0aXZlVG9vbCB8fCAhY2FwYWJpbGl0aWVzLmNhblNldEFjdGl2ZVRvb2wpIHtcbiAgICByZXR1cm4ge1xuICAgICAgb2s6IGZhbHNlLFxuICAgICAgY29kZTogXCJpbmNvbXBhdGlibGVcIixcbiAgICAgIG1lc3NhZ2U6IFwiVGhpcyBFeGNhbGlkcmF3IEFQSSBkb2VzIG5vdCBzdXBwb3J0IGFjdGl2ZS10b29sIHJlYWQgYW5kIHdyaXRlIG9wZXJhdGlvbnMuXCIsXG4gICAgfTtcbiAgfVxuICByZXR1cm4geyBvazogdHJ1ZSwgdmFsdWU6IGFwaSBhcyBDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaSB9O1xufVxuIiwgImltcG9ydCB0eXBlIHsgTm9ybWFsaXplZFN0eWx1c0V2ZW50IH0gZnJvbSBcIi4uL3N0eWx1cy90eXBlc1wiO1xuXG5leHBvcnQgY2xhc3MgRGVidWdMb2dnZXIge1xuICBwcml2YXRlIHRyYWNlOiBOb3JtYWxpemVkU3R5bHVzRXZlbnRbXSA9IFtdO1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGVuYWJsZWQ6ICgpID0+IGJvb2xlYW4pIHt9XG5cbiAgZXZlbnQoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5lbmFibGVkKCkpIHJldHVybjtcbiAgICB0aGlzLnRyYWNlLnB1c2goZXZlbnQpO1xuICAgIGlmICh0aGlzLnRyYWNlLmxlbmd0aCA+IDEwMCkgdGhpcy50cmFjZS5zaGlmdCgpO1xuICAgIGNvbnNvbGUuZGVidWcoXCJbRXhjYWxpZHJhdyBTdHlsdXMgQ29udHJvbHNdXCIsIGV2ZW50KTtcbiAgfVxuICBtZXNzYWdlKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICh0aGlzLmVuYWJsZWQoKSkgY29uc29sZS5kZWJ1ZyhcIltFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9sc11cIiwgbWVzc2FnZSk7XG4gIH1cbiAgZXhwb3J0VHJhY2UoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy50cmFjZSwgbnVsbCwgMik7XG4gIH1cbiAgY2xlYXIoKTogdm9pZCB7XG4gICAgdGhpcy50cmFjZSA9IFtdO1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBHZXN0dXJlRWZmZWN0LCBHZXN0dXJlU3RhdGVTbmFwc2hvdCwgTm9ybWFsaXplZFN0eWx1c0V2ZW50IH0gZnJvbSBcIi4uL3N0eWx1cy90eXBlc1wiO1xuXG4vKiogQSBkaWFnbm9zdGljLW9ubHksIG5vbi1pbnRlcmFjdGl2ZSBvdmVybGF5IGxvY2FsIHRvIG9uZSBFeGNhbGlkcmF3IHZpZXcuICovXG5leHBvcnQgY2xhc3MgRGVidWdPdmVybGF5IHtcbiAgcHJpdmF0ZSBlbGVtZW50OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29udGFpbmVyOiBIVE1MRWxlbWVudCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVuYWJsZWQ6ICgpID0+IGJvb2xlYW5cbiAgKSB7fVxuXG4gIHVwZGF0ZShldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50LCBzdGF0ZTogR2VzdHVyZVN0YXRlU25hcHNob3QsIGVmZmVjdD86IEdlc3R1cmVFZmZlY3QpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCgpKSB7XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG92ZXJsYXkgPSB0aGlzLmVuc3VyZUVsZW1lbnQoKTtcbiAgICBjb25zdCBzdGF0ZVN1bW1hcnkgPSBbXG4gICAgICBgaG92ZXI6JHtTdHJpbmcoIXN0YXRlLnBlbkNvbnRhY3QpfWAsXG4gICAgICBgYmFycmVsOiR7U3RyaW5nKHN0YXRlLmJhcnJlbEJ1dHRvbkhlbGQpfWAsXG4gICAgICBgY29uc3VtZWQ6JHtTdHJpbmcoc3RhdGUuZ2VzdHVyZUNvbnN1bWVkKX1gLFxuICAgICAgYHRlbXA6JHtTdHJpbmcoc3RhdGUudGVtcG9yYXJ5VG9vbEFjdGl2ZSl9YCxcbiAgICBdLmpvaW4oXCIgXHUwMEI3IFwiKTtcbiAgICBvdmVybGF5LnNldFRleHQoXG4gICAgICBbXG4gICAgICAgIGBTIFBlbiAke2V2ZW50LmtpbmR9IGlkOiR7ZXZlbnQucG9pbnRlcklkfSBidXR0b246JHtldmVudC5idXR0b259IGJ1dHRvbnM6JHtldmVudC5idXR0b25zfSBwcmVzc3VyZToke2V2ZW50LnByZXNzdXJlLnRvRml4ZWQoMil9YCxcbiAgICAgICAgYHRpbHQ6JHtldmVudC50aWx0WH0sJHtldmVudC50aWx0WX0gdHdpc3Q6JHtldmVudC50d2lzdH0gdGFuZ2VudGlhbDoke2V2ZW50LnRhbmdlbnRpYWxQcmVzc3VyZS50b0ZpeGVkKDIpfSBzaXplOiR7ZXZlbnQud2lkdGh9eCR7ZXZlbnQuaGVpZ2h0fWAsXG4gICAgICAgIHN0YXRlU3VtbWFyeSxcbiAgICAgICAgYGVmZmVjdDoke2VmZmVjdD8udHlwZSA/PyBcIm5vbmVcIn1gLFxuICAgICAgXS5qb2luKFwiXFxuXCIpXG4gICAgKTtcbiAgfVxuXG4gIGNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuZWxlbWVudD8ucmVtb3ZlKCk7XG4gICAgdGhpcy5lbGVtZW50ID0gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlRWxlbWVudCgpOiBIVE1MRWxlbWVudCB7XG4gICAgaWYgKHRoaXMuZWxlbWVudCkgcmV0dXJuIHRoaXMuZWxlbWVudDtcbiAgICB0aGlzLmVsZW1lbnQgPSB0aGlzLmNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtZGVidWctb3ZlcmxheVwiIH0pO1xuICAgIHJldHVybiB0aGlzLmVsZW1lbnQ7XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgU3R5bHVzRXZlbnRLaW5kIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuY29uc3QgZXZlbnRLaW5kczogUmVjb3JkPHN0cmluZywgU3R5bHVzRXZlbnRLaW5kPiA9IHtcbiAgcG9pbnRlcmRvd246IFwiZG93blwiLFxuICBwb2ludGVybW92ZTogXCJtb3ZlXCIsXG4gIHBvaW50ZXJ1cDogXCJ1cFwiLFxuICBwb2ludGVyY2FuY2VsOiBcImNhbmNlbFwiLFxuICBjb250ZXh0bWVudTogXCJjb250ZXh0bWVudVwiLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVBvaW50ZXJFdmVudChcbiAgZXZlbnQ6IFBvaW50ZXJFdmVudCxcbiAgaXNDYW52YXNUYXJnZXQ6IGJvb2xlYW5cbik6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCB7XG4gIHJldHVybiB7XG4gICAga2luZDogZXZlbnRLaW5kc1tldmVudC50eXBlXSA/PyBcIm1vdmVcIixcbiAgICBwb2ludGVyVHlwZTogZXZlbnQucG9pbnRlclR5cGUsXG4gICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgYnV0dG9uczogZXZlbnQuYnV0dG9ucyxcbiAgICBidXR0b246IGV2ZW50LmJ1dHRvbixcbiAgICBwcmVzc3VyZTogZXZlbnQucHJlc3N1cmUsXG4gICAgdGFuZ2VudGlhbFByZXNzdXJlOiBldmVudC50YW5nZW50aWFsUHJlc3N1cmUsXG4gICAgdGlsdFg6IGV2ZW50LnRpbHRYLFxuICAgIHRpbHRZOiBldmVudC50aWx0WSxcbiAgICB0d2lzdDogZXZlbnQudHdpc3QsXG4gICAgd2lkdGg6IGV2ZW50LndpZHRoLFxuICAgIGhlaWdodDogZXZlbnQuaGVpZ2h0LFxuICAgIHg6IGV2ZW50LmNsaWVudFgsXG4gICAgeTogZXZlbnQuY2xpZW50WSxcbiAgICB0aW1lc3RhbXA6IGV2ZW50LnRpbWVTdGFtcCxcbiAgICBpc0NhbnZhc1RhcmdldCxcbiAgfTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7XG4gIEdlc3R1cmVFZmZlY3QsXG4gIEdlc3R1cmVTZXR0aW5ncyxcbiAgR2VzdHVyZVN0YXRlU25hcHNob3QsXG4gIE5vcm1hbGl6ZWRTdHlsdXNFdmVudCxcbiAgUG9pbnQsXG4gIFNjaGVkdWxlcixcbn0gZnJvbSBcIi4vdHlwZXNcIjtcblxuaW50ZXJmYWNlIFBlbmRpbmdUYXAge1xuICBwb2ludDogUG9pbnQ7XG4gIHRpbWVyOiB1bmtub3duO1xufVxuXG4vKiogUHVyZSBwZXItdmlldyBTIFBlbiBnZXN0dXJlIHBvbGljeS4gSXQgbmV2ZXIgdG91Y2hlcyB0aGUgRE9NIG9yIEV4Y2FsaWRyYXcuICovXG5leHBvcnQgY2xhc3MgU3R5bHVzR2VzdHVyZU1hY2hpbmUge1xuICBwcml2YXRlIGJhcnJlbEJ1dHRvbkhlbGQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBwZW5Db250YWN0ID0gZmFsc2U7XG4gIHByaXZhdGUgY29uc3VtZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBtb3ZlZCA9IGZhbHNlO1xuICBwcml2YXRlIGhvbGRGaXJlZCA9IGZhbHNlO1xuICBwcml2YXRlIHRlbXBvcmFyeVRvb2xBY3RpdmUgPSBmYWxzZTtcbiAgcHJpdmF0ZSBwcmVzc09yaWdpbjogUG9pbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBob2xkVGltZXI6IHVua25vd24gfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwZW5kaW5nVGFwOiBQZW5kaW5nVGFwIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgYWN0aXZlUG9pbnRlcklkOiBudW1iZXIgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNldHRpbmdzOiBHZXN0dXJlU2V0dGluZ3MsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzY2hlZHVsZXI6IFNjaGVkdWxlclxuICApIHt9XG5cbiAgaGFuZGxlKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiBHZXN0dXJlRWZmZWN0W10ge1xuICAgIGlmIChldmVudC5wb2ludGVyVHlwZSAhPT0gXCJwZW5cIikgcmV0dXJuIFtdO1xuICAgIGNvbnN0IGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSA9IFtdO1xuICAgIGlmIChldmVudC5raW5kID09PSBcImNvbnRleHRtZW51XCIpIHtcbiAgICAgIGlmICh0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUgfHwgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiB0aGlzLnBlbkNvbnRhY3QpKVxuICAgICAgICBlZmZlY3RzLnB1c2goeyB0eXBlOiBcInN1cHByZXNzLWNvbnRleHQtbWVudVwiIH0pO1xuICAgICAgcmV0dXJuIGVmZmVjdHM7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwiZG93blwiKSB7XG4gICAgICAvLyBBIGNvbXBsaWFudCBicm93c2VyIG1heSBmaXJzdCBleHBvc2UgdGhlIGJhcnJlbCBzdGF0ZSB0b2dldGhlciB3aXRoXG4gICAgICAvLyBjb250YWN0IChidXR0b25zOiAzKS4gQml0IDEgaXMgZGVsaWJlcmF0ZWx5IGV4Y2x1ZGVkIGhlcmU6IEFuZHJvaWRcbiAgICAgIC8vIFdlYlZpZXcgY2FuIG1hcCBhIHN0eWx1cyBidXR0b24gdG8gdGhhdCBzYW1lIGJpdCBhcyBwZW4gY29udGFjdC5cbiAgICAgIGlmICghdGhpcy5iYXJyZWxCdXR0b25IZWxkICYmIHRoaXMuY2FuUmVjb2duaXplQmFycmVsT25Db250YWN0KGV2ZW50KSkgdGhpcy5zdGFydFByZXNzKGV2ZW50KTtcbiAgICAgIHRoaXMucGVuQ29udGFjdCA9IHRydWU7XG4gICAgICB0aGlzLmFjdGl2ZVBvaW50ZXJJZCA9IGV2ZW50LnBvaW50ZXJJZDtcbiAgICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQpIHRoaXMuY29uc3VtZUZvckNvbnRhY3QoZXZlbnQsIGVmZmVjdHMpO1xuICAgICAgcmV0dXJuIGVmZmVjdHM7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwidXBcIiB8fCBldmVudC5raW5kID09PSBcImNhbmNlbFwiKSB7XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVySWQgIT09IG51bGwgJiYgZXZlbnQucG9pbnRlcklkICE9PSB0aGlzLmFjdGl2ZVBvaW50ZXJJZCkgcmV0dXJuIGVmZmVjdHM7XG4gICAgICB0aGlzLnBlbkNvbnRhY3QgPSBmYWxzZTtcbiAgICAgIHRoaXMuYWN0aXZlUG9pbnRlcklkID0gbnVsbDtcbiAgICAgIGlmICh0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUpIHtcbiAgICAgICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtZW5kXCIgfSk7XG4gICAgICB9XG4gICAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJjYW5jZWxcIikgdGhpcy5jYW5jZWxQcmVzcygpO1xuICAgICAgZWxzZSBpZiAoIXRoaXMuaXNCYXJyZWxIZWxkKGV2ZW50KSkgdGhpcy5yZWxlYXNlUHJlc3MoZWZmZWN0cyk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICAvLyBXaGlsZSBob3ZlcmluZywgbW92ZW1lbnQgY2FycmllcyBiYXJyZWwtYnV0dG9uIHRyYW5zaXRpb25zLlxuICAgIGlmICh0aGlzLnBlbkNvbnRhY3QpIHJldHVybiBlZmZlY3RzO1xuICAgIGNvbnN0IGhlbGROb3cgPSB0aGlzLmlzQmFycmVsSGVsZChldmVudCk7XG4gICAgaWYgKCF0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgaGVsZE5vdykgdGhpcy5zdGFydFByZXNzKGV2ZW50KTtcbiAgICBpZiAodGhpcy5iYXJyZWxCdXR0b25IZWxkICYmIGhlbGROb3cpIHRoaXMudHJhY2tIb3Zlck1vdmVtZW50KGV2ZW50KTtcbiAgICBpZiAodGhpcy5iYXJyZWxCdXR0b25IZWxkICYmICFoZWxkTm93KSB0aGlzLnJlbGVhc2VQcmVzcyhlZmZlY3RzKTtcbiAgICByZXR1cm4gZWZmZWN0cztcbiAgfVxuXG4gIGRpc3Bvc2UoKTogR2VzdHVyZUVmZmVjdFtdIHtcbiAgICBjb25zdCBlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10gPSBbXTtcbiAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICBpZiAodGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlKSBlZmZlY3RzLnB1c2goeyB0eXBlOiBcInRlbXBvcmFyeS10b29sLWVuZFwiIH0pO1xuICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcbiAgICByZXR1cm4gZWZmZWN0cztcbiAgfVxuXG4gIHNuYXBzaG90KCk6IEdlc3R1cmVTdGF0ZVNuYXBzaG90IHtcbiAgICByZXR1cm4ge1xuICAgICAgYmFycmVsQnV0dG9uSGVsZDogdGhpcy5iYXJyZWxCdXR0b25IZWxkLFxuICAgICAgcGVuQ29udGFjdDogdGhpcy5wZW5Db250YWN0LFxuICAgICAgZ2VzdHVyZUNvbnN1bWVkOiB0aGlzLmNvbnN1bWVkLFxuICAgICAgdGVtcG9yYXJ5VG9vbEFjdGl2ZTogdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlLFxuICAgICAgaG92ZXJHZXN0dXJlTW92ZWQ6IHRoaXMubW92ZWQsXG4gICAgICBsb25nUHJlc3NGaXJlZDogdGhpcy5ob2xkRmlyZWQsXG4gICAgICBhY3RpdmVQb2ludGVySWQ6IHRoaXMuYWN0aXZlUG9pbnRlcklkLFxuICAgIH07XG4gIH1cblxuICAvKiogVGhlIGNvbnRyb2xsZXIgY2FsbHMgdGhpcyB3aGVuIHRoZSBvcHRpb25hbCBFeGNhbGlkcmF3IGJyaWRnZSByZWplY3RzIGEgc3RhcnQgcmVxdWVzdC4gKi9cbiAgdGVtcG9yYXJ5VG9vbERpZE5vdFN0YXJ0KCk6IHZvaWQge1xuICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGFydFByZXNzKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgPSB0cnVlO1xuICAgIHRoaXMuY29uc3VtZWQgPSBmYWxzZTtcbiAgICB0aGlzLm1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5ob2xkRmlyZWQgPSBmYWxzZTtcbiAgICB0aGlzLnByZXNzT3JpZ2luID0geyB4OiBldmVudC54LCB5OiBldmVudC55IH07XG4gICAgdGhpcy5ob2xkVGltZXIgPSB0aGlzLnNjaGVkdWxlci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmIChcbiAgICAgICAgIXRoaXMuYmFycmVsQnV0dG9uSGVsZCB8fFxuICAgICAgICB0aGlzLnBlbkNvbnRhY3QgfHxcbiAgICAgICAgdGhpcy5tb3ZlZCB8fFxuICAgICAgICB0aGlzLmNvbnN1bWVkIHx8XG4gICAgICAgICF0aGlzLnByZXNzT3JpZ2luXG4gICAgICApXG4gICAgICAgIHJldHVybjtcbiAgICAgIHRoaXMuaG9sZEZpcmVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY29uc3VtZWQgPSB0cnVlO1xuICAgICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgICB0aGlzLm9uRWZmZWN0Py4oeyB0eXBlOiBcImJ1dHRvbi1ob2xkXCIsIHBvaW50OiB0aGlzLnByZXNzT3JpZ2luIH0pO1xuICAgIH0sIHRoaXMuc2V0dGluZ3MubG9uZ1ByZXNzTXMpO1xuICB9XG5cbiAgLyoqIENvbnRyb2xsZXIgcmVnaXN0ZXJzIHRoaXMgc28gc2NoZWR1bGVyIGNhbGxiYWNrcyByZXRhaW4gcHVyZSBzZW1hbnRpYyBvdXRwdXQuICovXG4gIHByaXZhdGUgb25FZmZlY3Q6ICgoZWZmZWN0OiBHZXN0dXJlRWZmZWN0KSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICBzZXRFZmZlY3RTaW5rKHNpbms6IChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLm9uRWZmZWN0ID0gc2luaztcbiAgfVxuXG4gIHByaXZhdGUgdHJhY2tIb3Zlck1vdmVtZW50KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMucHJlc3NPcmlnaW4gfHwgdGhpcy5tb3ZlZCkgcmV0dXJuO1xuICAgIGNvbnN0IGR4ID0gZXZlbnQueCAtIHRoaXMucHJlc3NPcmlnaW4ueDtcbiAgICBjb25zdCBkeSA9IGV2ZW50LnkgLSB0aGlzLnByZXNzT3JpZ2luLnk7XG4gICAgaWYgKE1hdGguaHlwb3QoZHgsIGR5KSA+IHRoaXMuc2V0dGluZ3MubW92ZW1lbnRUaHJlc2hvbGRQeCkge1xuICAgICAgdGhpcy5tb3ZlZCA9IHRydWU7XG4gICAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNvbnN1bWVGb3JDb250YWN0KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQsIGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSk6IHZvaWQge1xuICAgIHRoaXMuY29uc3VtZWQgPSB0cnVlO1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgIGlmICh0aGlzLnNldHRpbmdzLmJ1dHRvbkNvbnRhY3RBY3Rpb24gPT09IFwiZXJhc2VyXCIgJiYgIXRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkge1xuICAgICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gdHJ1ZTtcbiAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtc3RhcnRcIiwgcG9pbnQ6IHsgeDogZXZlbnQueCwgeTogZXZlbnQueSB9IH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVsZWFzZVByZXNzKGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSk6IHZvaWQge1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuYmFycmVsQnV0dG9uSGVsZCA9IGZhbHNlO1xuICAgIGlmICghdGhpcy5jb25zdW1lZCAmJiAhdGhpcy5tb3ZlZCAmJiAhdGhpcy5ob2xkRmlyZWQgJiYgdGhpcy5wcmVzc09yaWdpbikge1xuICAgICAgaWYgKHRoaXMucGVuZGluZ1RhcCkge1xuICAgICAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJidXR0b24tZG91YmxlLXRhcFwiLCBwb2ludDogdGhpcy5wcmVzc09yaWdpbiB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHBvaW50ID0gdGhpcy5wcmVzc09yaWdpbjtcbiAgICAgICAgY29uc3QgdGltZXIgPSB0aGlzLnNjaGVkdWxlci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdUYXAgPSBudWxsO1xuICAgICAgICAgIHRoaXMub25FZmZlY3Q/Lih7IHR5cGU6IFwiYnV0dG9uLXRhcFwiLCBwb2ludCB9KTtcbiAgICAgICAgfSwgdGhpcy5zZXR0aW5ncy5kb3VibGVUYXBNcyk7XG4gICAgICAgIHRoaXMucGVuZGluZ1RhcCA9IHsgcG9pbnQsIHRpbWVyIH07XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucHJlc3NPcmlnaW4gPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBjYW5jZWxQcmVzcygpOiB2b2lkIHtcbiAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgPSBmYWxzZTtcbiAgICB0aGlzLnBlbkNvbnRhY3QgPSBmYWxzZTtcbiAgICB0aGlzLmNvbnN1bWVkID0gZmFsc2U7XG4gICAgdGhpcy5tb3ZlZCA9IGZhbHNlO1xuICAgIHRoaXMuaG9sZEZpcmVkID0gZmFsc2U7XG4gICAgdGhpcy5wcmVzc09yaWdpbiA9IG51bGw7XG4gICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBjYW5jZWxUaW1lcih3aGljaDogXCJob2xkXCIpOiB2b2lkIHtcbiAgICBpZiAod2hpY2ggPT09IFwiaG9sZFwiICYmIHRoaXMuaG9sZFRpbWVyICE9PSBudWxsKSB7XG4gICAgICB0aGlzLnNjaGVkdWxlci5jbGVhclRpbWVvdXQodGhpcy5ob2xkVGltZXIpO1xuICAgICAgdGhpcy5ob2xkVGltZXIgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2FuY2VsUGVuZGluZ1RhcCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5wZW5kaW5nVGFwKSB0aGlzLnNjaGVkdWxlci5jbGVhclRpbWVvdXQodGhpcy5wZW5kaW5nVGFwLnRpbWVyKTtcbiAgICB0aGlzLnBlbmRpbmdUYXAgPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0JhcnJlbEhlbGQoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAoZXZlbnQuYnV0dG9ucyAmIHRoaXMuc2V0dGluZ3MuYmFycmVsQnV0dG9uTWFzaykgIT09IDA7XG4gIH1cblxuICBwcml2YXRlIGNhblJlY29nbml6ZUJhcnJlbE9uQ29udGFjdChldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIChcbiAgICAgICh0aGlzLnNldHRpbmdzLmJhcnJlbEJ1dHRvbk1hc2sgIT09IDEgfHxcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5wcmltYXJ5Q29udGFjdE1vZGUgPT09IFwiZXhwZXJpbWVudGFsXCIpICYmXG4gICAgICB0aGlzLmlzQmFycmVsSGVsZChldmVudClcbiAgICApO1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSB7IEV4Y2FsaWRyYXdCcmlkZ2UsIEFjdGl2ZVRvb2xTbmFwc2hvdCB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB0eXBlIHsgRGVidWdMb2dnZXIgfSBmcm9tIFwiLi4vZGVidWcvRGVidWdMb2dnZXJcIjtcbmltcG9ydCB7IERlYnVnT3ZlcmxheSB9IGZyb20gXCIuLi9kZWJ1Zy9EZWJ1Z092ZXJsYXlcIjtcbmltcG9ydCB0eXBlIHsgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB9IGZyb20gXCIuLi9zZXR0aW5ncy9zZXR0aW5nc1wiO1xuaW1wb3J0IHsgbm9ybWFsaXplUG9pbnRlckV2ZW50IH0gZnJvbSBcIi4vbm9ybWFsaXplUG9pbnRlckV2ZW50XCI7XG5pbXBvcnQgeyBTdHlsdXNHZXN0dXJlTWFjaGluZSB9IGZyb20gXCIuL1N0eWx1c0dlc3R1cmVNYWNoaW5lXCI7XG5pbXBvcnQgdHlwZSB7IEdlc3R1cmVFZmZlY3QsIE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgUG9pbnQsIFNjaGVkdWxlciB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCB0eXBlIEFjdGlvbkhhbmRsZXIgPSAoXG4gIGFjdGlvbjogXCJtZW51XCIgfCBcImNvcHlcIiB8IFwicGFzdGVcIiB8IFwibm9uZVwiLFxuICBwb2ludDogUG9pbnQsXG4gIGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZVxuKSA9PiB2b2lkO1xuXG5leHBvcnQgY2xhc3MgU3R5bHVzQ29udHJvbGxlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWFjaGluZTogU3R5bHVzR2VzdHVyZU1hY2hpbmU7XG4gIHByaXZhdGUgc2F2ZWRUb29sOiBBY3RpdmVUb29sU25hcHNob3QgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBkaXNwb3NlZCA9IGZhbHNlO1xuICBwcml2YXRlIGF0dGFjaGVkID0gZmFsc2U7XG4gIHByaXZhdGUgcmVhZG9ubHkgbGlzdGVuZXJzOiBBcnJheTxba2V5b2YgSFRNTEVsZW1lbnRFdmVudE1hcCwgRXZlbnRMaXN0ZW5lcl0+ID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgb3ZlcmxheTogRGVidWdPdmVybGF5O1xuICBwcml2YXRlIGxhdGVzdEV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxlYWY6IFdvcmtzcGFjZUxlYWYsXG4gICAgcHJpdmF0ZSByZWFkb25seSBicmlkZ2U6IEV4Y2FsaWRyYXdCcmlkZ2UsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogKCkgPT4gU3R5bHVzQ29udHJvbHNTZXR0aW5ncyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRlYnVnOiBEZWJ1Z0xvZ2dlcixcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpc3BhdGNoQWN0aW9uOiBBY3Rpb25IYW5kbGVyLFxuICAgIHNjaGVkdWxlcjogU2NoZWR1bGVyID0gd2luZG93XG4gICkge1xuICAgIHRoaXMubWFjaGluZSA9IG5ldyBTdHlsdXNHZXN0dXJlTWFjaGluZSh0aGlzLmdlc3R1cmVTZXR0aW5ncygpLCBzY2hlZHVsZXIpO1xuICAgIHRoaXMubWFjaGluZS5zZXRFZmZlY3RTaW5rKChlZmZlY3QpID0+IHRoaXMuYXBwbHlFZmZlY3QoZWZmZWN0KSk7XG4gICAgdGhpcy5vdmVybGF5ID0gbmV3IERlYnVnT3ZlcmxheShcbiAgICAgIHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLFxuICAgICAgKCkgPT4gdGhpcy5zZXR0aW5ncygpLmRlYnVnTW9kZSAmJiB0aGlzLnNldHRpbmdzKCkuZGVidWdPdmVybGF5XG4gICAgKTtcbiAgfVxuXG4gIGF0dGFjaCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCB8fCB0aGlzLmF0dGFjaGVkKSByZXR1cm47XG4gICAgdGhpcy5hdHRhY2hlZCA9IHRydWU7XG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsO1xuICAgIGZvciAoY29uc3QgdHlwZSBvZiBbXG4gICAgICBcInBvaW50ZXJkb3duXCIsXG4gICAgICBcInBvaW50ZXJtb3ZlXCIsXG4gICAgICBcInBvaW50ZXJ1cFwiLFxuICAgICAgXCJwb2ludGVyY2FuY2VsXCIsXG4gICAgICBcImNvbnRleHRtZW51XCIsXG4gICAgXSBhcyBjb25zdCkge1xuICAgICAgY29uc3QgbGlzdGVuZXI6IEV2ZW50TGlzdGVuZXIgPSAocmF3KSA9PiB0aGlzLm9uUG9pbnRlckV2ZW50KHJhdyBhcyBQb2ludGVyRXZlbnQpO1xuICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgICAgIHRoaXMubGlzdGVuZXJzLnB1c2goW3R5cGUsIGxpc3RlbmVyXSk7XG4gICAgfVxuICB9XG5cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkgcmV0dXJuO1xuICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuICAgIHRoaXMuYXR0YWNoZWQgPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IFt0eXBlLCBsaXN0ZW5lcl0gb2YgdGhpcy5saXN0ZW5lcnMpXG4gICAgICB0aGlzLmxlYWYudmlldy5jb250YWluZXJFbC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgICB0aGlzLmxpc3RlbmVycy5sZW5ndGggPSAwO1xuICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIHRoaXMubWFjaGluZS5kaXNwb3NlKCkpIHRoaXMuYXBwbHlFZmZlY3QoZWZmZWN0KTtcbiAgICB0aGlzLm92ZXJsYXkuY2xvc2UoKTtcbiAgfVxuICBnZXRUcmFjZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRlYnVnLmV4cG9ydFRyYWNlKCk7XG4gIH1cblxuICBwcml2YXRlIG9uUG9pbnRlckV2ZW50KHJhdzogUG9pbnRlckV2ZW50KTogdm9pZCB7XG4gICAgaWYgKHJhdy5wb2ludGVyVHlwZSAhPT0gXCJwZW5cIikgcmV0dXJuO1xuICAgIGNvbnN0IGV2ZW50ID0gbm9ybWFsaXplUG9pbnRlckV2ZW50KFxuICAgICAgcmF3LFxuICAgICAgdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWwuY29udGFpbnMocmF3LnRhcmdldCBhcyBOb2RlKVxuICAgICk7XG4gICAgdGhpcy5sYXRlc3RFdmVudCA9IGV2ZW50O1xuICAgIHRoaXMuZGVidWcuZXZlbnQoZXZlbnQpO1xuICAgIGNvbnN0IGVmZmVjdHMgPSB0aGlzLm1hY2hpbmUuaGFuZGxlKGV2ZW50KTtcbiAgICBpZiAoZWZmZWN0cy5sZW5ndGggPT09IDApIHRoaXMub3ZlcmxheS51cGRhdGUoZXZlbnQsIHRoaXMubWFjaGluZS5zbmFwc2hvdCgpKTtcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiBlZmZlY3RzKSB7XG4gICAgICBpZiAoZWZmZWN0LnR5cGUgPT09IFwic3VwcHJlc3MtY29udGV4dC1tZW51XCIpIHJhdy5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5hcHBseUVmZmVjdChlZmZlY3QpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwbHlFZmZlY3QoZWZmZWN0OiBHZXN0dXJlRWZmZWN0KTogdm9pZCB7XG4gICAgdGhpcy5kZWJ1Zy5tZXNzYWdlKGBlZmZlY3Q6ICR7ZWZmZWN0LnR5cGV9YCk7XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MoKS5zdHlsdXNUZXN0TW9kZSkge1xuICAgICAgdGhpcy5kZWJ1Zy5tZXNzYWdlKGB0ZXN0IG1vZGUgc3VwcHJlc3NlZDogJHtlZmZlY3QudHlwZX1gKTtcbiAgICAgIGlmICh0aGlzLmxhdGVzdEV2ZW50KSB0aGlzLm92ZXJsYXkudXBkYXRlKHRoaXMubGF0ZXN0RXZlbnQsIHRoaXMubWFjaGluZS5zbmFwc2hvdCgpLCBlZmZlY3QpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzd2l0Y2ggKGVmZmVjdC50eXBlKSB7XG4gICAgICBjYXNlIFwidGVtcG9yYXJ5LXRvb2wtc3RhcnRcIjpcbiAgICAgICAgaWYgKCF0aGlzLnNhdmVkVG9vbCkge1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYnJpZGdlLnN0YXJ0VGVtcG9yYXJ5RXJhc2VyKCk7XG4gICAgICAgICAgaWYgKHJlc3VsdC5vaykgdGhpcy5zYXZlZFRvb2wgPSByZXN1bHQudmFsdWU7XG4gICAgICAgICAgZWxzZSB0aGlzLm1hY2hpbmUudGVtcG9yYXJ5VG9vbERpZE5vdFN0YXJ0KCk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwidGVtcG9yYXJ5LXRvb2wtZW5kXCI6XG4gICAgICAgIGlmICh0aGlzLnNhdmVkVG9vbCkgdGhpcy5icmlkZ2UucmVzdG9yZVRvb2wodGhpcy5zYXZlZFRvb2wpO1xuICAgICAgICB0aGlzLnNhdmVkVG9vbCA9IG51bGw7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImJ1dHRvbi10YXBcIjpcbiAgICAgICAgdGhpcy5kaXNwYXRjaEFjdGlvbih0aGlzLnNldHRpbmdzKCkuYnV0dG9uVGFwQWN0aW9uLCBlZmZlY3QucG9pbnQsIHRoaXMuYnJpZGdlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiYnV0dG9uLWRvdWJsZS10YXBcIjpcbiAgICAgICAgdGhpcy5kaXNwYXRjaEFjdGlvbih0aGlzLnNldHRpbmdzKCkuYnV0dG9uRG91YmxlVGFwQWN0aW9uLCBlZmZlY3QucG9pbnQsIHRoaXMuYnJpZGdlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiYnV0dG9uLWhvbGRcIjpcbiAgICAgICAgdGhpcy5kaXNwYXRjaEFjdGlvbih0aGlzLnNldHRpbmdzKCkuYnV0dG9uSG9sZEFjdGlvbiwgZWZmZWN0LnBvaW50LCB0aGlzLmJyaWRnZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGlmICh0aGlzLmxhdGVzdEV2ZW50KSB0aGlzLm92ZXJsYXkudXBkYXRlKHRoaXMubGF0ZXN0RXZlbnQsIHRoaXMubWFjaGluZS5zbmFwc2hvdCgpLCBlZmZlY3QpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXN0dXJlU2V0dGluZ3MoKSB7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLnNldHRpbmdzKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlLmJ1dHRvbkNvbnRhY3RBY3Rpb24sXG4gICAgICBkb3VibGVUYXBNczogdmFsdWUuZG91YmxlVGFwTXMsXG4gICAgICBsb25nUHJlc3NNczogdmFsdWUubG9uZ1ByZXNzTXMsXG4gICAgICBtb3ZlbWVudFRocmVzaG9sZFB4OiB2YWx1ZS5tb3ZlbWVudFRocmVzaG9sZFB4LFxuICAgICAgYmFycmVsQnV0dG9uTWFzazogdmFsdWUuYmFycmVsQnV0dG9uTWFzayxcbiAgICAgIHByaW1hcnlDb250YWN0TW9kZTogdmFsdWUucHJpbWFyeUNvbnRhY3RNb2RlLFxuICAgIH0gYXMgY29uc3Q7XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IEFwcCwgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgRXhjYWxpZHJhd0JyaWRnZSB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB7IERlYnVnTG9nZ2VyIH0gZnJvbSBcIi4uL2RlYnVnL0RlYnVnTG9nZ2VyXCI7XG5pbXBvcnQgdHlwZSB7IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgfSBmcm9tIFwiLi4vc2V0dGluZ3Mvc2V0dGluZ3NcIjtcbmltcG9ydCB7IFN0eWx1c0NvbnRyb2xsZXIsIHR5cGUgQWN0aW9uSGFuZGxlciB9IGZyb20gXCIuL1N0eWx1c0NvbnRyb2xsZXJcIjtcblxuZXhwb3J0IGludGVyZmFjZSBTdHlsdXNDb250cm9sbGVyTGlrZSB7XG4gIGF0dGFjaCgpOiB2b2lkO1xuICBkaXNwb3NlKCk6IHZvaWQ7XG4gIGdldFRyYWNlKCk6IHN0cmluZztcbn1cblxuZXhwb3J0IHR5cGUgU3R5bHVzQ29udHJvbGxlckZhY3RvcnkgPSAobGVhZjogV29ya3NwYWNlTGVhZikgPT4gU3R5bHVzQ29udHJvbGxlckxpa2U7XG5cbmV4cG9ydCBjbGFzcyBTdHlsdXNWaWV3UmVnaXN0cnkge1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbnRyb2xsZXJzID0gbmV3IE1hcDxXb3Jrc3BhY2VMZWFmLCBTdHlsdXNDb250cm9sbGVyTGlrZT4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBjcmVhdGVDb250cm9sbGVyOiBTdHlsdXNDb250cm9sbGVyRmFjdG9yeTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2V0dGluZ3M6ICgpID0+IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MsXG4gICAgcHJpdmF0ZSByZWFkb25seSBhY3Rpb25IYW5kbGVyOiBBY3Rpb25IYW5kbGVyLFxuICAgIGNyZWF0ZUNvbnRyb2xsZXI/OiBTdHlsdXNDb250cm9sbGVyRmFjdG9yeVxuICApIHtcbiAgICB0aGlzLmNyZWF0ZUNvbnRyb2xsZXIgPVxuICAgICAgY3JlYXRlQ29udHJvbGxlciA/P1xuICAgICAgKChsZWFmKSA9PiB7XG4gICAgICAgIGNvbnN0IGRlYnVnID0gbmV3IERlYnVnTG9nZ2VyKCgpID0+IHRoaXMuc2V0dGluZ3MoKS5kZWJ1Z01vZGUpO1xuICAgICAgICByZXR1cm4gbmV3IFN0eWx1c0NvbnRyb2xsZXIoXG4gICAgICAgICAgbGVhZixcbiAgICAgICAgICBuZXcgRXhjYWxpZHJhd0JyaWRnZShsZWFmKSxcbiAgICAgICAgICB0aGlzLnNldHRpbmdzLFxuICAgICAgICAgIGRlYnVnLFxuICAgICAgICAgIHRoaXMuYWN0aW9uSGFuZGxlclxuICAgICAgICApO1xuICAgICAgfSk7XG4gIH1cblxuICBzeW5jKCk6IHZvaWQge1xuICAgIGNvbnN0IGxlYXZlcyA9IG5ldyBTZXQodGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShcImV4Y2FsaWRyYXdcIikpO1xuICAgIGZvciAoY29uc3QgbGVhZiBvZiBsZWF2ZXMpXG4gICAgICBpZiAoIXRoaXMuY29udHJvbGxlcnMuaGFzKGxlYWYpKSB7XG4gICAgICAgIGNvbnN0IGNvbnRyb2xsZXIgPSB0aGlzLmNyZWF0ZUNvbnRyb2xsZXIobGVhZik7XG4gICAgICAgIGNvbnRyb2xsZXIuYXR0YWNoKCk7XG4gICAgICAgIHRoaXMuY29udHJvbGxlcnMuc2V0KGxlYWYsIGNvbnRyb2xsZXIpO1xuICAgICAgfVxuICAgIGZvciAoY29uc3QgW2xlYWYsIGNvbnRyb2xsZXJdIG9mIHRoaXMuY29udHJvbGxlcnMpXG4gICAgICBpZiAoIWxlYXZlcy5oYXMobGVhZikpIHtcbiAgICAgICAgY29udHJvbGxlci5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMuY29udHJvbGxlcnMuZGVsZXRlKGxlYWYpO1xuICAgICAgfVxuICB9XG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBjb250cm9sbGVyIG9mIHRoaXMuY29udHJvbGxlcnMudmFsdWVzKCkpIGNvbnRyb2xsZXIuZGlzcG9zZSgpO1xuICAgIHRoaXMuY29udHJvbGxlcnMuY2xlYXIoKTtcbiAgfVxuICByZWZyZXNoKCk6IHZvaWQge1xuICAgIHRoaXMuZGlzcG9zZSgpO1xuICAgIHRoaXMuc3luYygpO1xuICB9XG4gIGV4cG9ydFRyYWNlcygpOiBzdHJpbmcge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShcbiAgICAgIFsuLi50aGlzLmNvbnRyb2xsZXJzLmVudHJpZXMoKV0ubWFwKChbbGVhZiwgY29udHJvbGxlcl0pID0+ICh7XG4gICAgICAgIGxlYWY6IGxlYWYuZ2V0RGlzcGxheVRleHQoKSxcbiAgICAgICAgZXZlbnRzOiBKU09OLnBhcnNlKGNvbnRyb2xsZXIuZ2V0VHJhY2UoKSksXG4gICAgICB9KSksXG4gICAgICBudWxsLFxuICAgICAgMlxuICAgICk7XG4gIH1cbn1cbiJdLAogICJtYXBwaW5n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O0FBQUEsRUFDQSxXQUFpQjtBQUNmLFNBQUssS0FBSyxNQUFNO0FBQ2hCLFNBQUssVUFBVSxRQUFRO0FBQ3ZCLFNBQUssV0FBVztBQUFBLEVBQ2xCO0FBQUEsRUFDQSxNQUFNLGVBQWUsT0FBdUQ7QUFDMUUsU0FBSyxXQUFXLGtCQUFrQixFQUFFLEdBQUcsS0FBSyxVQUFVLEdBQUcsTUFBTSxDQUFDO0FBQ2hFLFVBQU0sS0FBSyxTQUFTLEtBQUssUUFBUTtBQUNqQyxTQUFLLFVBQVUsUUFBUTtBQUFBLEVBQ3pCO0FBQUEsRUFDQSxNQUFNLHVCQUFzQztBQUMxQyxVQUFNLFFBQVEsS0FBSyxVQUFVLGFBQWEsS0FBSztBQUMvQyxRQUFJO0FBQ0YsWUFBTSxVQUFVLFVBQVUsVUFBVSxLQUFLO0FBQ3pDLFVBQUksd0JBQU8sb0NBQW9DO0FBQUEsSUFDakQsUUFBUTtBQUNOLFVBQUksd0JBQU8sK0RBQStEO0FBQUEsSUFDNUU7QUFBQSxFQUNGO0FBQ0Y7IiwKICAibmFtZXMiOiBbImltcG9ydF9vYnNpZGlhbiIsICJhY3Rpb25zIiwgImltcG9ydF9vYnNpZGlhbiJdCn0K
