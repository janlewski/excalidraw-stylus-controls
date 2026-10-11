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
    barrelButtonMask: value.barrelButtonMask === 1 || value.barrelButtonMask === 32 ? value.barrelButtonMask : DEFAULT_SETTINGS.barrelButtonMask,
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
    new import_obsidian.Setting(containerEl).setName("Barrel button signal").setDesc(
      "The standard pen barrel signal is buttons: 2. If the debug overlay shows a different bit while the side button is held, select that bit."
    ).addDropdown(
      (dropdown) => dropdown.addOption("2", "Standard barrel (buttons: 2)").addOption("1", "Primary/tip bit (buttons: 1)").addOption("32", "Eraser bit (buttons: 32)").setValue(String(this.plugin.settings.barrelButtonMask)).onChange(
        async (value) => this.plugin.updateSettings({ barrelButtonMask: Number(value) })
      )
    );
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
      if (!this.barrelButtonHeld && this.isBarrelHeld(event)) this.startPress(event);
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
      barrelButtonMask: value.barrelButtonMask
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL21lbnUvU3R5bHVzTWVudS50cyIsICJzcmMvc2V0dGluZ3MvU2V0dGluZ3NUYWIudHMiLCAic3JjL3NldHRpbmdzL3NldHRpbmdzLnRzIiwgInNyYy9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2UudHMiLCAic3JjL2V4Y2FsaWRyYXcvY29tcGF0aWJpbGl0eS50cyIsICJzcmMvZGVidWcvRGVidWdMb2dnZXIudHMiLCAic3JjL2RlYnVnL0RlYnVnT3ZlcmxheS50cyIsICJzcmMvc3R5bHVzL25vcm1hbGl6ZVBvaW50ZXJFdmVudC50cyIsICJzcmMvc3R5bHVzL1N0eWx1c0dlc3R1cmVNYWNoaW5lLnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzQ29udHJvbGxlci50cyIsICJzcmMvc3R5bHVzL1N0eWx1c1ZpZXdSZWdpc3RyeS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgTm90aWNlLCBQbHVnaW4gfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IFN0eWx1c01lbnUgfSBmcm9tIFwiLi9tZW51L1N0eWx1c01lbnVcIjtcbmltcG9ydCB7IFNldHRpbmdzVGFiIH0gZnJvbSBcIi4vc2V0dGluZ3MvU2V0dGluZ3NUYWJcIjtcbmltcG9ydCB7XG4gIERFRkFVTFRfU0VUVElOR1MsXG4gIG5vcm1hbGl6ZVNldHRpbmdzLFxuICB0eXBlIFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MsXG59IGZyb20gXCIuL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBTdHlsdXNWaWV3UmVnaXN0cnkgfSBmcm9tIFwiLi9zdHlsdXMvU3R5bHVzVmlld1JlZ2lzdHJ5XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0eWx1c0NvbnRyb2xzUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuICBwcml2YXRlIHJlZ2lzdHJ5OiBTdHlsdXNWaWV3UmVnaXN0cnkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByZWFkb25seSBtZW51ID0gbmV3IFN0eWx1c01lbnUoKTtcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IG5vcm1hbGl6ZVNldHRpbmdzKChhd2FpdCB0aGlzLmxvYWREYXRhKCkpID8/IHt9KTtcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFNldHRpbmdzVGFiKHRoaXMpKTtcbiAgICB0aGlzLnJlZ2lzdHJ5ID0gbmV3IFN0eWx1c1ZpZXdSZWdpc3RyeShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgKCkgPT4gdGhpcy5zZXR0aW5ncyxcbiAgICAgIChhY3Rpb24sIHBvaW50LCBicmlkZ2UpID0+IHtcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJtZW51XCIpIHRoaXMubWVudS5vcGVuKHBvaW50LCBicmlkZ2UpO1xuICAgICAgICBlbHNlIGlmIChhY3Rpb24gPT09IFwiY29weVwiKSBicmlkZ2UuY29weVNlbGVjdGVkRWxlbWVudHMoKTtcbiAgICAgICAgZWxzZSBpZiAoYWN0aW9uID09PSBcInBhc3RlXCIpIGJyaWRnZS5wYXN0ZUF0KHBvaW50KTtcbiAgICAgIH1cbiAgICApO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJsYXlvdXQtY2hhbmdlXCIsICgpID0+IHRoaXMucmVnaXN0cnk/LnN5bmMoKSkpO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHRoaXMucmVnaXN0cnk/LnN5bmMoKSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImNvcHktc3R5bHVzLWV2ZW50LXRyYWNlXCIsXG4gICAgICBuYW1lOiBcIkNvcHkgbGF0ZXN0IHN0eWx1cyBldmVudCB0cmFjZVwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuY29weVN0eWx1c0V2ZW50VHJhY2UoKSxcbiAgICB9KTtcbiAgfVxuICBvbnVubG9hZCgpOiB2b2lkIHtcbiAgICB0aGlzLm1lbnUuY2xvc2UoKTtcbiAgICB0aGlzLnJlZ2lzdHJ5Py5kaXNwb3NlKCk7XG4gICAgdGhpcy5yZWdpc3RyeSA9IG51bGw7XG4gIH1cbiAgYXN5bmMgdXBkYXRlU2V0dGluZ3MocGF0Y2g6IFBhcnRpYWw8U3R5bHVzQ29udHJvbHNTZXR0aW5ncz4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnNldHRpbmdzID0gbm9ybWFsaXplU2V0dGluZ3MoeyAuLi50aGlzLnNldHRpbmdzLCAuLi5wYXRjaCB9KTtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICAgIHRoaXMucmVnaXN0cnk/LnJlZnJlc2goKTtcbiAgfVxuICBhc3luYyBjb3B5U3R5bHVzRXZlbnRUcmFjZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB0cmFjZSA9IHRoaXMucmVnaXN0cnk/LmV4cG9ydFRyYWNlcygpID8/IFwiW11cIjtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQodHJhY2UpO1xuICAgICAgbmV3IE5vdGljZShcIlN0eWx1cyBldmVudCB0cmFjZSBjb3BpZWQgYXMgSlNPTi5cIik7XG4gICAgfSBjYXRjaCB7XG4gICAgICBuZXcgTm90aWNlKFwiVW5hYmxlIHRvIGNvcHkgdGhlIHN0eWx1cyB0cmFjZS4gQ2hlY2sgdGhlIGRldmVsb3BlciBjb25zb2xlLlwiKTtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IEV4Y2FsaWRyYXdCcmlkZ2UgfSBmcm9tIFwiLi4vZXhjYWxpZHJhdy9FeGNhbGlkcmF3QnJpZGdlXCI7XG5pbXBvcnQgdHlwZSB7IFBvaW50IH0gZnJvbSBcIi4uL3N0eWx1cy90eXBlc1wiO1xuXG5jb25zdCBNRU5VX01BUkdJTl9QWCA9IDg7XG5jb25zdCBGQUxMQkFDS19NRU5VX1NJWkUgPSB7IHdpZHRoOiAxNzIsIGhlaWdodDogMzAwIH07XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGFtcE1lbnVQb3NpdGlvbihcbiAgcG9pbnQ6IFBvaW50LFxuICB2aWV3cG9ydDogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9LFxuICBtZW51OiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH1cbik6IFBvaW50IHtcbiAgcmV0dXJuIHtcbiAgICB4OiBNYXRoLm1heChNRU5VX01BUkdJTl9QWCwgTWF0aC5taW4ocG9pbnQueCwgdmlld3BvcnQud2lkdGggLSBtZW51LndpZHRoIC0gTUVOVV9NQVJHSU5fUFgpKSxcbiAgICB5OiBNYXRoLm1heChNRU5VX01BUkdJTl9QWCwgTWF0aC5taW4ocG9pbnQueSwgdmlld3BvcnQuaGVpZ2h0IC0gbWVudS5oZWlnaHQgLSBNRU5VX01BUkdJTl9QWCkpLFxuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgU3R5bHVzTWVudSB7XG4gIHByaXZhdGUgZWxlbWVudDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBvdXRzaWRlTGlzdGVuZXI6ICgoZXZlbnQ6IFBvaW50ZXJFdmVudCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBvcGVuR2VuZXJhdGlvbiA9IDA7XG5cbiAgb3Blbihwb2ludDogUG9pbnQsIGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZSk6IHZvaWQge1xuICAgIHRoaXMuY2xvc2UoKTtcbiAgICBjb25zdCBnZW5lcmF0aW9uID0gdGhpcy5vcGVuR2VuZXJhdGlvbjtcbiAgICBjb25zdCBtZW51ID0gZG9jdW1lbnQuYm9keS5jcmVhdGVEaXYoeyBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtbWVudVwiIH0pO1xuICAgIGNvbnN0IGFjdGlvbnM6IEFycmF5PFtzdHJpbmcsICgpID0+IHZvaWRdPiA9IFtcbiAgICAgIFtcIlNlbGVjdGlvblwiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcInNlbGVjdGlvblwiKV0sXG4gICAgICBbXCJGcmVlIGRyYXdcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJmcmVlZHJhd1wiKV0sXG4gICAgICBbXCJFcmFzZXJcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJlcmFzZXJcIildLFxuICAgICAgW1wiUmVjdGFuZ2xlXCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwicmVjdGFuZ2xlXCIpXSxcbiAgICAgIFtcIkFycm93XCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiYXJyb3dcIildLFxuICAgICAgW1wiQ29weVwiLCAoKSA9PiBicmlkZ2UuY29weVNlbGVjdGVkRWxlbWVudHMoKV0sXG4gICAgICBbXCJQYXN0ZVwiLCAoKSA9PiBicmlkZ2UucGFzdGVBdChwb2ludCldLFxuICAgIF07XG4gICAgZm9yIChjb25zdCBbbmFtZSwgY2FsbGJhY2tdIG9mIGFjdGlvbnMpIHtcbiAgICAgIGNvbnN0IGJ1dHRvbiA9IG1lbnUuY3JlYXRlRWwoXCJidXR0b25cIiwge1xuICAgICAgICB0ZXh0OiBuYW1lLFxuICAgICAgICBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtbWVudV9faXRlbVwiLFxuICAgICAgfSk7XG4gICAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJ1cFwiLCAoZXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLmVsZW1lbnQgPSBtZW51O1xuICAgIGNvbnN0IHBvc2l0aW9uID0gY2xhbXBNZW51UG9zaXRpb24oXG4gICAgICBwb2ludCxcbiAgICAgIHsgd2lkdGg6IHdpbmRvdy5pbm5lcldpZHRoLCBoZWlnaHQ6IHdpbmRvdy5pbm5lckhlaWdodCB9LFxuICAgICAge1xuICAgICAgICB3aWR0aDogbWVudS5vZmZzZXRXaWR0aCB8fCBGQUxMQkFDS19NRU5VX1NJWkUud2lkdGgsXG4gICAgICAgIGhlaWdodDogbWVudS5vZmZzZXRIZWlnaHQgfHwgRkFMTEJBQ0tfTUVOVV9TSVpFLmhlaWdodCxcbiAgICAgIH1cbiAgICApO1xuICAgIG1lbnUuc2V0Q3NzUHJvcHMoeyBsZWZ0OiBgJHtwb3NpdGlvbi54fXB4YCwgdG9wOiBgJHtwb3NpdGlvbi55fXB4YCB9KTtcbiAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAoZ2VuZXJhdGlvbiAhPT0gdGhpcy5vcGVuR2VuZXJhdGlvbiB8fCAhdGhpcy5lbGVtZW50KSByZXR1cm47XG4gICAgICB0aGlzLm91dHNpZGVMaXN0ZW5lciA9IChldmVudCkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMuZWxlbWVudD8uY29udGFpbnMoZXZlbnQudGFyZ2V0IGFzIE5vZGUpKSB0aGlzLmNsb3NlKCk7XG4gICAgICB9O1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIHRoaXMub3V0c2lkZUxpc3RlbmVyLCB0cnVlKTtcbiAgICB9LCAwKTtcbiAgfVxuICBjbG9zZSA9ICgpOiB2b2lkID0+IHtcbiAgICB0aGlzLm9wZW5HZW5lcmF0aW9uICs9IDE7XG4gICAgaWYgKHRoaXMub3V0c2lkZUxpc3RlbmVyKVxuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIHRoaXMub3V0c2lkZUxpc3RlbmVyLCB0cnVlKTtcbiAgICB0aGlzLm91dHNpZGVMaXN0ZW5lciA9IG51bGw7XG4gICAgdGhpcy5lbGVtZW50Py5yZW1vdmUoKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xuICB9O1xufVxuIiwgImltcG9ydCB7IFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIFN0eWx1c0NvbnRyb2xzUGx1Z2luIGZyb20gXCIuLi9tYWluXCI7XG5pbXBvcnQge1xuICBOVU1FUklDX1NFVFRJTkdfTElNSVRTLFxuICBwYXJzZU51bWVyaWNTZXR0aW5nLFxuICB0eXBlIE51bWVyaWNTZXR0aW5nS2V5LFxuICB0eXBlIFN0eWx1c0FjdGlvbixcbn0gZnJvbSBcIi4vc2V0dGluZ3NcIjtcblxuY29uc3QgYWN0aW9uczogUmVjb3JkPFN0eWx1c0FjdGlvbiwgc3RyaW5nPiA9IHtcbiAgbWVudTogXCJPcGVuIG1lbnVcIixcbiAgY29weTogXCJDb3B5XCIsXG4gIHBhc3RlOiBcIlBhc3RlXCIsXG4gIG5vbmU6IFwiRG8gbm90aGluZ1wiLFxufTtcblxuZXhwb3J0IGNsYXNzIFNldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBTdHlsdXNDb250cm9sc1BsdWdpbikge1xuICAgIHN1cGVyKHBsdWdpbi5hcHAsIHBsdWdpbik7XG4gIH1cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiUmVxdWlyZXMgdGhlIEV4Y2FsaWRyYXcgY29tbXVuaXR5IHBsdWdpbi4gQ29weSBhbmQgcGFzdGUgYXdhaXQgYSBjb21wYXRpYmxlIEV4Y2FsaWRyYXcgaW50ZWdyYXRpb24gYW5kIGFyZSBjdXJyZW50bHkgdW5hdmFpbGFibGUuXCIsXG4gICAgfSk7XG4gICAgdGhpcy5hY3Rpb24oXCJUYXBcIiwgXCJidXR0b25UYXBBY3Rpb25cIik7XG4gICAgdGhpcy5hY3Rpb24oXCJEb3VibGUgdGFwXCIsIFwiYnV0dG9uRG91YmxlVGFwQWN0aW9uXCIpO1xuICAgIHRoaXMuYWN0aW9uKFwiSG9sZFwiLCBcImJ1dHRvbkhvbGRBY3Rpb25cIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkJ1dHRvbiArIHBlbiBjb250YWN0XCIpXG4gICAgICAuc2V0RGVzYyhcIlRlbXBvcmFyeSB0b29sIHdoaWxlIHRoZSBzaWRlIGJ1dHRvbiBpcyBoZWxkIGR1cmluZyBwZW4gY29udGFjdC5cIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+XG4gICAgICAgIGRyb3Bkb3duXG4gICAgICAgICAgLmFkZE9wdGlvbihcImVyYXNlclwiLCBcIlRlbXBvcmFyeSBlcmFzZXJcIilcbiAgICAgICAgICAuYWRkT3B0aW9uKFwibm9uZVwiLCBcIkRvIG5vdGhpbmdcIilcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYnV0dG9uQ29udGFjdEFjdGlvbilcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PlxuICAgICAgICAgICAgdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3Moe1xuICAgICAgICAgICAgICBidXR0b25Db250YWN0QWN0aW9uOiB2YWx1ZSBhcyBcImVyYXNlclwiIHwgXCJub25lXCIsXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIClcbiAgICAgICk7XG4gICAgdGhpcy5udW1iZXIoXCJEb3VibGUtdGFwIGludGVydmFsIChtcylcIiwgXCJkb3VibGVUYXBNc1wiKTtcbiAgICB0aGlzLm51bWJlcihcIkxvbmctcHJlc3MgZGVsYXkgKG1zKVwiLCBcImxvbmdQcmVzc01zXCIpO1xuICAgIHRoaXMubnVtYmVyKFwiTW92ZW1lbnQgdGhyZXNob2xkIChweClcIiwgXCJtb3ZlbWVudFRocmVzaG9sZFB4XCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJCYXJyZWwgYnV0dG9uIHNpZ25hbFwiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIFwiVGhlIHN0YW5kYXJkIHBlbiBiYXJyZWwgc2lnbmFsIGlzIGJ1dHRvbnM6IDIuIElmIHRoZSBkZWJ1ZyBvdmVybGF5IHNob3dzIGEgZGlmZmVyZW50IGJpdCB3aGlsZSB0aGUgc2lkZSBidXR0b24gaXMgaGVsZCwgc2VsZWN0IHRoYXQgYml0LlwiXG4gICAgICApXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PlxuICAgICAgICBkcm9wZG93blxuICAgICAgICAgIC5hZGRPcHRpb24oXCIyXCIsIFwiU3RhbmRhcmQgYmFycmVsIChidXR0b25zOiAyKVwiKVxuICAgICAgICAgIC5hZGRPcHRpb24oXCIxXCIsIFwiUHJpbWFyeS90aXAgYml0IChidXR0b25zOiAxKVwiKVxuICAgICAgICAgIC5hZGRPcHRpb24oXCIzMlwiLCBcIkVyYXNlciBiaXQgKGJ1dHRvbnM6IDMyKVwiKVxuICAgICAgICAgIC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MuYmFycmVsQnV0dG9uTWFzaykpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT5cbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgYmFycmVsQnV0dG9uTWFzazogTnVtYmVyKHZhbHVlKSBhcyAxIHwgMiB8IDMyIH0pXG4gICAgICAgICAgKVxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVidWcgbG9nZ2luZ1wiKVxuICAgICAgLnNldERlc2MoXCJMb2dzIGJvdW5kZWQgcmF3IHBlbiBldmVudCB0cmFjZXMgdG8gdGhlIGRldmVsb3BlciBjb25zb2xlLlwiKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxuICAgICAgICB0b2dnbGVcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVidWdNb2RlKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgZGVidWdNb2RlOiB2YWx1ZSB9KSlcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlYnVnIG92ZXJsYXlcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIlNob3dzIHRoZSBsYXRlc3QgcGVuIGV2ZW50IGFuZCBzdHlsdXMgc3RhdGUgaW4gdGhlIEV4Y2FsaWRyYXcgdmlldy4gUmVxdWlyZXMgZGVidWcgbG9nZ2luZy5cIlxuICAgICAgKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxuICAgICAgICB0b2dnbGVcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVidWdPdmVybGF5KVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgZGVidWdPdmVybGF5OiB2YWx1ZSB9KSlcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkV4cG9ydCBkZWJ1ZyB0cmFjZVwiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIFwiQ29waWVzIGJ1ZmZlcmVkIHBlbiBldmVudHMgZnJvbSBldmVyeSBvcGVuIEV4Y2FsaWRyYXcgdmlldyBhcyBKU09OLCByZWFkeSB0byBhdHRhY2ggdG8gYSBidWcgcmVwb3J0LlwiXG4gICAgICApXG4gICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+XG4gICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiQ29weSB0cmFjZVwiKS5vbkNsaWNrKCgpID0+IHRoaXMucGx1Z2luLmNvcHlTdHlsdXNFdmVudFRyYWNlKCkpXG4gICAgICApO1xuICB9XG4gIHByaXZhdGUgYWN0aW9uKFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBrZXk6IFwiYnV0dG9uVGFwQWN0aW9uXCIgfCBcImJ1dHRvbkRvdWJsZVRhcEFjdGlvblwiIHwgXCJidXR0b25Ib2xkQWN0aW9uXCJcbiAgKTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbCkuc2V0TmFtZShgUyBQZW4gc2lkZSBidXR0b246ICR7bmFtZX1gKS5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgIGZvciAoY29uc3QgW3ZhbHVlLCBsYWJlbF0gb2YgT2JqZWN0LmVudHJpZXMoYWN0aW9ucykpIGRyb3Bkb3duLmFkZE9wdGlvbih2YWx1ZSwgbGFiZWwpO1xuICAgICAgZHJvcGRvd25cbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzW2tleV0pXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgW2tleV06IHZhbHVlIGFzIFN0eWx1c0FjdGlvbiB9KSk7XG4gICAgfSk7XG4gIH1cbiAgcHJpdmF0ZSBudW1iZXIobmFtZTogc3RyaW5nLCBrZXk6IE51bWVyaWNTZXR0aW5nS2V5KTogdm9pZCB7XG4gICAgY29uc3QgeyBtaW4sIG1heCB9ID0gTlVNRVJJQ19TRVRUSU5HX0xJTUlUU1trZXldO1xuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShuYW1lKVxuICAgICAgLnNldERlc2MoYFdob2xlIG1pbGxpc2Vjb25kcy9waXhlbHMgZnJvbSAke21pbn0gdG8gJHttYXh9LmApXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgICAgdGV4dC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3Nba2V5XSkpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlTnVtZXJpY1NldHRpbmcoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgdGV4dC5pbnB1dEVsLnNldEN1c3RvbVZhbGlkaXR5KFxuICAgICAgICAgICAgcGFyc2VkID09PSBudWxsID8gYEVudGVyIGEgd2hvbGUgbnVtYmVyIGZyb20gJHttaW59IHRvICR7bWF4fS5gIDogXCJcIlxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKHBhcnNlZCA9PT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgW2tleV06IHBhcnNlZCB9KTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gIH1cbn1cbiIsICJleHBvcnQgdHlwZSBTdHlsdXNBY3Rpb24gPSBcIm1lbnVcIiB8IFwiY29weVwiIHwgXCJwYXN0ZVwiIHwgXCJub25lXCI7XG5leHBvcnQgdHlwZSBCYXJyZWxCdXR0b25NYXNrID0gMSB8IDIgfCAzMjtcblxuZXhwb3J0IGludGVyZmFjZSBTdHlsdXNDb250cm9sc1NldHRpbmdzIHtcbiAgYnV0dG9uVGFwQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gIGJ1dHRvbkRvdWJsZVRhcEFjdGlvbjogU3R5bHVzQWN0aW9uO1xuICBidXR0b25Ib2xkQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gIGJ1dHRvbkNvbnRhY3RBY3Rpb246IFwiZXJhc2VyXCIgfCBcIm5vbmVcIjtcbiAgZG91YmxlVGFwTXM6IG51bWJlcjtcbiAgbG9uZ1ByZXNzTXM6IG51bWJlcjtcbiAgbW92ZW1lbnRUaHJlc2hvbGRQeDogbnVtYmVyO1xuICAvKiogUG9pbnRlckV2ZW50LmJ1dHRvbnMgYml0IHVzZWQgYnkgdGhlIGRldmljZSBmb3IgdGhlIGJhcnJlbCBidXR0b24uICovXG4gIGJhcnJlbEJ1dHRvbk1hc2s6IEJhcnJlbEJ1dHRvbk1hc2s7XG4gIGRlYnVnTW9kZTogYm9vbGVhbjtcbiAgZGVidWdPdmVybGF5OiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogU3R5bHVzQ29udHJvbHNTZXR0aW5ncyA9IHtcbiAgYnV0dG9uVGFwQWN0aW9uOiBcIm1lbnVcIixcbiAgYnV0dG9uRG91YmxlVGFwQWN0aW9uOiBcImNvcHlcIixcbiAgYnV0dG9uSG9sZEFjdGlvbjogXCJwYXN0ZVwiLFxuICBidXR0b25Db250YWN0QWN0aW9uOiBcImVyYXNlclwiLFxuICBkb3VibGVUYXBNczogMzAwLFxuICBsb25nUHJlc3NNczogNDUwLFxuICBtb3ZlbWVudFRocmVzaG9sZFB4OiA4LFxuICAvLyBQb2ludGVyIEV2ZW50cyBzcGVjaWZpZXMgYml0IDIgZm9yIGEgcGVuIGJhcnJlbCBidXR0b24uIEJpdCAxIGlzIHRoZSB0aXAuXG4gIGJhcnJlbEJ1dHRvbk1hc2s6IDIsXG4gIGRlYnVnTW9kZTogZmFsc2UsXG4gIGRlYnVnT3ZlcmxheTogZmFsc2UsXG59O1xuXG5leHBvcnQgY29uc3QgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUyA9IHtcbiAgZG91YmxlVGFwTXM6IHsgbWluOiAxMDAsIG1heDogMTAwMCB9LFxuICBsb25nUHJlc3NNczogeyBtaW46IDE1MCwgbWF4OiAyMDAwIH0sXG4gIG1vdmVtZW50VGhyZXNob2xkUHg6IHsgbWluOiAxLCBtYXg6IDEwMCB9LFxufSBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgTnVtZXJpY1NldHRpbmdLZXkgPSBrZXlvZiB0eXBlb2YgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUztcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTnVtZXJpY1NldHRpbmcoa2V5OiBOdW1lcmljU2V0dGluZ0tleSwgdmFsdWU6IHN0cmluZyk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCBwYXJzZWQgPSBOdW1iZXIodmFsdWUpO1xuICBjb25zdCB7IG1pbiwgbWF4IH0gPSBOVU1FUklDX1NFVFRJTkdfTElNSVRTW2tleV07XG4gIHJldHVybiBOdW1iZXIuaXNJbnRlZ2VyKHBhcnNlZCkgJiYgcGFyc2VkID49IG1pbiAmJiBwYXJzZWQgPD0gbWF4ID8gcGFyc2VkIDogbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVNldHRpbmdzKHZhbHVlOiBQYXJ0aWFsPFN0eWx1c0NvbnRyb2xzU2V0dGluZ3M+KTogU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB7XG4gIGNvbnN0IGFjdGlvbiA9IChjYW5kaWRhdGU6IHVua25vd24sIGZhbGxiYWNrOiBTdHlsdXNBY3Rpb24pOiBTdHlsdXNBY3Rpb24gPT5cbiAgICBjYW5kaWRhdGUgPT09IFwibWVudVwiIHx8IGNhbmRpZGF0ZSA9PT0gXCJjb3B5XCIgfHwgY2FuZGlkYXRlID09PSBcInBhc3RlXCIgfHwgY2FuZGlkYXRlID09PSBcIm5vbmVcIlxuICAgICAgPyBjYW5kaWRhdGVcbiAgICAgIDogZmFsbGJhY2s7XG4gIGNvbnN0IG51bWJlciA9IChjYW5kaWRhdGU6IHVua25vd24sIGZhbGxiYWNrOiBudW1iZXIsIG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcik6IG51bWJlciA9PlxuICAgIHR5cGVvZiBjYW5kaWRhdGUgPT09IFwibnVtYmVyXCIgJiYgTnVtYmVyLmlzRmluaXRlKGNhbmRpZGF0ZSlcbiAgICAgID8gTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIE1hdGgucm91bmQoY2FuZGlkYXRlKSkpXG4gICAgICA6IGZhbGxiYWNrO1xuICByZXR1cm4ge1xuICAgIGJ1dHRvblRhcEFjdGlvbjogYWN0aW9uKHZhbHVlLmJ1dHRvblRhcEFjdGlvbiwgREVGQVVMVF9TRVRUSU5HUy5idXR0b25UYXBBY3Rpb24pLFxuICAgIGJ1dHRvbkRvdWJsZVRhcEFjdGlvbjogYWN0aW9uKFxuICAgICAgdmFsdWUuYnV0dG9uRG91YmxlVGFwQWN0aW9uLFxuICAgICAgREVGQVVMVF9TRVRUSU5HUy5idXR0b25Eb3VibGVUYXBBY3Rpb25cbiAgICApLFxuICAgIGJ1dHRvbkhvbGRBY3Rpb246IGFjdGlvbih2YWx1ZS5idXR0b25Ib2xkQWN0aW9uLCBERUZBVUxUX1NFVFRJTkdTLmJ1dHRvbkhvbGRBY3Rpb24pLFxuICAgIGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlLmJ1dHRvbkNvbnRhY3RBY3Rpb24gPT09IFwibm9uZVwiID8gXCJub25lXCIgOiBcImVyYXNlclwiLFxuICAgIGRvdWJsZVRhcE1zOiBudW1iZXIoXG4gICAgICB2YWx1ZS5kb3VibGVUYXBNcyxcbiAgICAgIDMwMCxcbiAgICAgIE5VTUVSSUNfU0VUVElOR19MSU1JVFMuZG91YmxlVGFwTXMubWluLFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5kb3VibGVUYXBNcy5tYXhcbiAgICApLFxuICAgIGxvbmdQcmVzc01zOiBudW1iZXIoXG4gICAgICB2YWx1ZS5sb25nUHJlc3NNcyxcbiAgICAgIDQ1MCxcbiAgICAgIE5VTUVSSUNfU0VUVElOR19MSU1JVFMubG9uZ1ByZXNzTXMubWluLFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5sb25nUHJlc3NNcy5tYXhcbiAgICApLFxuICAgIG1vdmVtZW50VGhyZXNob2xkUHg6IG51bWJlcihcbiAgICAgIHZhbHVlLm1vdmVtZW50VGhyZXNob2xkUHgsXG4gICAgICA4LFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5tb3ZlbWVudFRocmVzaG9sZFB4Lm1pbixcbiAgICAgIE5VTUVSSUNfU0VUVElOR19MSU1JVFMubW92ZW1lbnRUaHJlc2hvbGRQeC5tYXhcbiAgICApLFxuICAgIGJhcnJlbEJ1dHRvbk1hc2s6XG4gICAgICB2YWx1ZS5iYXJyZWxCdXR0b25NYXNrID09PSAxIHx8IHZhbHVlLmJhcnJlbEJ1dHRvbk1hc2sgPT09IDMyXG4gICAgICAgID8gdmFsdWUuYmFycmVsQnV0dG9uTWFza1xuICAgICAgICA6IERFRkFVTFRfU0VUVElOR1MuYmFycmVsQnV0dG9uTWFzayxcbiAgICBkZWJ1Z01vZGU6IHZhbHVlLmRlYnVnTW9kZSA9PT0gdHJ1ZSxcbiAgICBkZWJ1Z092ZXJsYXk6IHZhbHVlLmRlYnVnT3ZlcmxheSA9PT0gdHJ1ZSxcbiAgfTtcbn1cbiIsICJpbXBvcnQgeyBOb3RpY2UsIHR5cGUgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgeyBQb2ludCB9IGZyb20gXCIuLi9zdHlsdXMvdHlwZXNcIjtcbmltcG9ydCB7XG4gIGdldExlYWZBcGksXG4gIHJlYWRBY3RpdmVUb29sLFxuICB0eXBlIEFjdGl2ZVRvb2xTbmFwc2hvdCxcbiAgdHlwZSBCcmlkZ2VPcGVyYXRpb25SZXN1bHQsXG4gIHR5cGUgQnJpZGdlUmVzdWx0LFxuICB0eXBlIENvbXBhdGlibGVJbXBlcmF0aXZlQXBpLFxufSBmcm9tIFwiLi9jb21wYXRpYmlsaXR5XCI7XG5cbmV4cG9ydCB0eXBlIHtcbiAgQWN0aXZlVG9vbFNuYXBzaG90LFxuICBCcmlkZ2VGYWlsdXJlQ29kZSxcbiAgQnJpZGdlT3BlcmF0aW9uUmVzdWx0LFxuICBCcmlkZ2VSZXN1bHQsXG59IGZyb20gXCIuL2NvbXBhdGliaWxpdHlcIjtcblxuLyoqIENvbXBhdGliaWxpdHkgYm91bmRhcnkgZm9yIHRoZSBvcHRpb25hbCBFeGNhbGlkcmF3IHBsdWdpbi4gKi9cbmV4cG9ydCBjbGFzcyBFeGNhbGlkcmF3QnJpZGdlIHtcbiAgcHJpdmF0ZSB3YXJuZWQgPSBmYWxzZTtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBsZWFmOiBXb3Jrc3BhY2VMZWFmKSB7fVxuXG4gIHN0YXJ0VGVtcG9yYXJ5RXJhc2VyKCk6IEJyaWRnZVJlc3VsdDxBY3RpdmVUb29sU25hcHNob3Q+IHtcbiAgICBjb25zdCBhcGlSZXN1bHQgPSB0aGlzLmdldEFwaSgpO1xuICAgIGlmICghYXBpUmVzdWx0Lm9rKSByZXR1cm4gdGhpcy5yZXBvcnQoYXBpUmVzdWx0KTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdG9vbCA9IHJlYWRBY3RpdmVUb29sKGFwaVJlc3VsdC52YWx1ZSk7XG4gICAgICBpZiAoIXRvb2wpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmFpbHVyZShcbiAgICAgICAgICBcImluY29tcGF0aWJsZVwiLFxuICAgICAgICAgIFwiVGVtcG9yYXJ5IGVyYXNlciBjb3VsZCBub3QgcmVhZCB0aGUgY3VycmVudCBhY3RpdmUgdG9vbC5cIlxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgYXBpUmVzdWx0LnZhbHVlLnNldEFjdGl2ZVRvb2woeyB0eXBlOiBcImVyYXNlclwiIH0pO1xuICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiB0b29sIH07XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwiZmFpbGVkXCIsIFwiVGVtcG9yYXJ5IGVyYXNlciBpcyB1bmF2YWlsYWJsZSBpbiB0aGlzIEV4Y2FsaWRyYXcgdmlldy5cIik7XG4gICAgfVxuICB9XG4gIHJlc3RvcmVUb29sKHRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCk6IEJyaWRnZU9wZXJhdGlvblJlc3VsdCB7XG4gICAgY29uc3QgYXBpUmVzdWx0ID0gdGhpcy5nZXRBcGkoKTtcbiAgICBpZiAoIWFwaVJlc3VsdC5vaykgcmV0dXJuIHRoaXMucmVwb3J0KGFwaVJlc3VsdCk7XG4gICAgdHJ5IHtcbiAgICAgIGFwaVJlc3VsdC52YWx1ZS5zZXRBY3RpdmVUb29sKHRvb2wpO1xuICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiB1bmRlZmluZWQgfTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXG4gICAgICAgIFwiZmFpbGVkXCIsXG4gICAgICAgIFwiVGhlIHByZXZpb3VzIHRvb2wgY291bGQgbm90IGJlIHJlc3RvcmVkIGluIHRoaXMgRXhjYWxpZHJhdyB2aWV3LlwiXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBzZXRUb29sKHR5cGU6IHN0cmluZyk6IEJyaWRnZU9wZXJhdGlvblJlc3VsdCB7XG4gICAgY29uc3QgYXBpUmVzdWx0ID0gdGhpcy5nZXRBcGkoKTtcbiAgICBpZiAoIWFwaVJlc3VsdC5vaykgcmV0dXJuIHRoaXMucmVwb3J0KGFwaVJlc3VsdCk7XG4gICAgdHJ5IHtcbiAgICAgIGFwaVJlc3VsdC52YWx1ZS5zZXRBY3RpdmVUb29sKHsgdHlwZSB9KTtcbiAgICAgIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogdW5kZWZpbmVkIH07XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwiZmFpbGVkXCIsIFwiVG9vbCBzd2l0Y2hpbmcgaXMgdW5hdmFpbGFibGUgaW4gdGhpcyBFeGNhbGlkcmF3IHZpZXcuXCIpO1xuICAgIH1cbiAgfVxuICBjb3B5U2VsZWN0ZWRFbGVtZW50cygpOiBCcmlkZ2VPcGVyYXRpb25SZXN1bHQge1xuICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXCJ1bmF2YWlsYWJsZVwiLCBcIkNvcHkgcmVxdWlyZXMgYSBjb21wYXRpYmxlIEV4Y2FsaWRyYXcgQVBJLlwiKTtcbiAgfVxuICBwYXN0ZUF0KHBvaW50OiBQb2ludCk6IEJyaWRnZU9wZXJhdGlvblJlc3VsdCB7XG4gICAgdm9pZCBwb2ludDtcbiAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwidW5hdmFpbGFibGVcIiwgXCJQYXN0ZSByZXF1aXJlcyBhIGNvbXBhdGlibGUgRXhjYWxpZHJhdyBBUEkuXCIpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRBcGkoKTogQnJpZGdlUmVzdWx0PENvbXBhdGlibGVJbXBlcmF0aXZlQXBpPiB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBnZXRMZWFmQXBpKHRoaXMubGVhZi52aWV3KTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgY29kZTogXCJmYWlsZWRcIixcbiAgICAgICAgbWVzc2FnZTogXCJFeGNhbGlkcmF3IEFQSSBsb29rdXAgZmFpbGVkIGZvciB0aGlzIGxlYWYuXCIsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVwb3J0PFQ+KHJlc3VsdDogRXhjbHVkZTxCcmlkZ2VSZXN1bHQ8VD4sIHsgb2s6IHRydWUgfT4pOiBCcmlkZ2VSZXN1bHQ8bmV2ZXI+IHtcbiAgICB0aGlzLnVuc3VwcG9ydGVkKHJlc3VsdC5tZXNzYWdlKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHByaXZhdGUgZmFpbHVyZShcbiAgICBjb2RlOiBcInVuYXZhaWxhYmxlXCIgfCBcImluY29tcGF0aWJsZVwiIHwgXCJmYWlsZWRcIixcbiAgICBtZXNzYWdlOiBzdHJpbmdcbiAgKTogQnJpZGdlUmVzdWx0PG5ldmVyPiB7XG4gICAgdGhpcy51bnN1cHBvcnRlZChtZXNzYWdlKTtcbiAgICByZXR1cm4geyBvazogZmFsc2UsIGNvZGUsIG1lc3NhZ2UgfTtcbiAgfVxuICBwcml2YXRlIHVuc3VwcG9ydGVkKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy53YXJuZWQpIHtcbiAgICAgIG5ldyBOb3RpY2UoYEV4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzOiAke21lc3NhZ2V9YCk7XG4gICAgICB0aGlzLndhcm5lZCA9IHRydWU7XG4gICAgfVxuICB9XG59XG4iLCAiZXhwb3J0IGludGVyZmFjZSBBY3RpdmVUb29sU25hcHNob3Qge1xuICB0eXBlOiBzdHJpbmc7XG4gIFtrZXk6IHN0cmluZ106IHVua25vd247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1wZXJhdGl2ZUFwaSB7XG4gIGdldEFwcFN0YXRlPzogKCkgPT4geyBhY3RpdmVUb29sPzogQWN0aXZlVG9vbFNuYXBzaG90IH07XG4gIHNldEFjdGl2ZVRvb2w/OiAodG9vbDogQWN0aXZlVG9vbFNuYXBzaG90KSA9PiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBhdGlibGVJbXBlcmF0aXZlQXBpIGV4dGVuZHMgSW1wZXJhdGl2ZUFwaSB7XG4gIGdldEFwcFN0YXRlOiAoKSA9PiB7IGFjdGl2ZVRvb2w/OiBBY3RpdmVUb29sU25hcHNob3QgfTtcbiAgc2V0QWN0aXZlVG9vbDogKHRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUgQnJpZGdlRmFpbHVyZUNvZGUgPSBcInVuYXZhaWxhYmxlXCIgfCBcImluY29tcGF0aWJsZVwiIHwgXCJmYWlsZWRcIjtcblxuZXhwb3J0IHR5cGUgQnJpZGdlUmVzdWx0PFQ+ID1cbiAgeyBvazogdHJ1ZTsgdmFsdWU6IFQgfSB8IHsgb2s6IGZhbHNlOyBjb2RlOiBCcmlkZ2VGYWlsdXJlQ29kZTsgbWVzc2FnZTogc3RyaW5nIH07XG5cbmV4cG9ydCB0eXBlIEJyaWRnZU9wZXJhdGlvblJlc3VsdCA9IEJyaWRnZVJlc3VsdDx2b2lkPjtcblxuZXhwb3J0IGludGVyZmFjZSBFeGNhbGlkcmF3TGVhZlN1cmZhY2Uge1xuICAvKipcbiAgICogVGhpcyBpcyBhIGNvbXBhdGliaWxpdHkgZmFsbGJhY2ssIG5vdCBhIGRvY3VtZW50ZWQgRXhjYWxpZHJhdyBwbHVnaW4gQVBJLlxuICAgKiBLZWVwIGFjY2VzcyB0byBpdCBoZXJlIHVudGlsIEV4Y2FsaWRyYXcgcHVibGlzaGVzIGEgdGhpcmQtcGFydHksIGxlYWYtc2NvcGVkXG4gICAqIGludGVncmF0aW9uIHBvaW50LlxuICAgKi9cbiAgZXhjYWxpZHJhd0FQST86IHVua25vd247XG59XG5cbi8qKiBUaGUgZG9jdW1lbnRlZCwgdmlldy10YXJnZXRlZCBwb3J0aW9uIG9mIEV4Y2FsaWRyYXdBdXRvbWF0ZSB1c2VkIGJ5IHRoaXMgcGx1Z2luLiAqL1xuZXhwb3J0IGludGVyZmFjZSBFeGNhbGlkcmF3QXV0b21hdGVTdXJmYWNlIHtcbiAgc2V0VmlldzogKHZpZXc6IHVua25vd24pID0+IHVua25vd247XG4gIGdldEV4Y2FsaWRyYXdBUEk6ICgpID0+IHVua25vd247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVG9vbENhcGFiaWxpdGllcyB7XG4gIGNhblJlYWRBY3RpdmVUb29sOiBib29sZWFuO1xuICBjYW5TZXRBY3RpdmVUb29sOiBib29sZWFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9vbENhcGFiaWxpdGllcyhhcGk6IEltcGVyYXRpdmVBcGkgfCBudWxsKTogVG9vbENhcGFiaWxpdGllcyB7XG4gIHJldHVybiB7XG4gICAgY2FuUmVhZEFjdGl2ZVRvb2w6IHR5cGVvZiBhcGk/LmdldEFwcFN0YXRlID09PSBcImZ1bmN0aW9uXCIsXG4gICAgY2FuU2V0QWN0aXZlVG9vbDogdHlwZW9mIGFwaT8uc2V0QWN0aXZlVG9vbCA9PT0gXCJmdW5jdGlvblwiLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFjdGl2ZVRvb2woYXBpOiBJbXBlcmF0aXZlQXBpKTogQWN0aXZlVG9vbFNuYXBzaG90IHwgbnVsbCB7XG4gIGNvbnN0IGFjdGl2ZVRvb2wgPSBhcGkuZ2V0QXBwU3RhdGU/LigpLmFjdGl2ZVRvb2w7XG4gIHJldHVybiBhY3RpdmVUb29sID8geyAuLi5hY3RpdmVUb29sIH0gOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TGVhZkFwaShcbiAgdmlldzogdW5rbm93bixcbiAgYXV0b21hdGUgPSBnZXRHbG9iYWxBdXRvbWF0ZSgpXG4pOiBCcmlkZ2VSZXN1bHQ8Q29tcGF0aWJsZUltcGVyYXRpdmVBcGk+IHtcbiAgaWYgKCF2aWV3IHx8IHR5cGVvZiB2aWV3ICE9PSBcIm9iamVjdFwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiBmYWxzZSxcbiAgICAgIGNvZGU6IFwidW5hdmFpbGFibGVcIixcbiAgICAgIG1lc3NhZ2U6IFwiVGhpcyBsZWFmIGRvZXMgbm90IGV4cG9zZSBhbiBFeGNhbGlkcmF3IHZpZXcuXCIsXG4gICAgfTtcbiAgfVxuICBpZiAoYXV0b21hdGUpIHtcbiAgICB0cnkge1xuICAgICAgLy8gRXhjYWxpZHJhd0F1dG9tYXRlIGRvY3VtZW50cyBzZXRWaWV3KHZpZXcpIHNwZWNpZmljYWxseSBzbyBvcGVyYXRpb25zXG4gICAgICAvLyBhcmUgc2NvcGVkIHRvIHRoYXQgdmlldy4gTmV2ZXIgcGFzcyBcImFjdGl2ZVwiIGhlcmUuXG4gICAgICBhdXRvbWF0ZS5zZXRWaWV3KHZpZXcpO1xuICAgICAgcmV0dXJuIHZhbGlkYXRlSW1wZXJhdGl2ZUFwaShhdXRvbWF0ZS5nZXRFeGNhbGlkcmF3QVBJKCkpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb2s6IGZhbHNlLFxuICAgICAgICBjb2RlOiBcImZhaWxlZFwiLFxuICAgICAgICBtZXNzYWdlOiBcIkV4Y2FsaWRyYXcgY291bGQgbm90IHRhcmdldCB0aGlzIGxlYWYncyBjYW52YXMuXCIsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8vIFRoaXMgZmFsbGJhY2sgaXMgZGVsaWJlcmF0ZWx5IGlzb2xhdGVkOiBpdCBpcyBub3QgcGFydCBvZiBFeGNhbGlkcmF3J3NcbiAgLy8gZG9jdW1lbnRlZCB0aGlyZC1wYXJ0eSBBUEkgc3VyZmFjZS5cbiAgY29uc3QgYXBpID0gKHZpZXcgYXMgRXhjYWxpZHJhd0xlYWZTdXJmYWNlKS5leGNhbGlkcmF3QVBJO1xuICByZXR1cm4gdmFsaWRhdGVJbXBlcmF0aXZlQXBpKGFwaSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWxBdXRvbWF0ZSgpOiBFeGNhbGlkcmF3QXV0b21hdGVTdXJmYWNlIHwgbnVsbCB7XG4gIGNvbnN0IGNhbmRpZGF0ZSA9IChnbG9iYWxUaGlzIGFzIHsgRXhjYWxpZHJhd0F1dG9tYXRlPzogdW5rbm93biB9KS5FeGNhbGlkcmF3QXV0b21hdGU7XG4gIGlmIChcbiAgICBjYW5kaWRhdGUgJiZcbiAgICB0eXBlb2YgY2FuZGlkYXRlID09PSBcIm9iamVjdFwiICYmXG4gICAgdHlwZW9mIChjYW5kaWRhdGUgYXMgRXhjYWxpZHJhd0F1dG9tYXRlU3VyZmFjZSkuc2V0VmlldyA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgdHlwZW9mIChjYW5kaWRhdGUgYXMgRXhjYWxpZHJhd0F1dG9tYXRlU3VyZmFjZSkuZ2V0RXhjYWxpZHJhd0FQSSA9PT0gXCJmdW5jdGlvblwiXG4gICkge1xuICAgIHJldHVybiBjYW5kaWRhdGUgYXMgRXhjYWxpZHJhd0F1dG9tYXRlU3VyZmFjZTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVJbXBlcmF0aXZlQXBpKGFwaTogdW5rbm93bik6IEJyaWRnZVJlc3VsdDxDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaT4ge1xuICBpZiAoIWFwaSB8fCB0eXBlb2YgYXBpICE9PSBcIm9iamVjdFwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiBmYWxzZSxcbiAgICAgIGNvZGU6IFwidW5hdmFpbGFibGVcIixcbiAgICAgIG1lc3NhZ2U6IFwiRXhjYWxpZHJhdyBoYXMgbm90IG1hZGUgYW4gQVBJIGF2YWlsYWJsZSBmb3IgdGhpcyBsZWFmLlwiLFxuICAgIH07XG4gIH1cbiAgY29uc3QgY2FwYWJpbGl0aWVzID0gdG9vbENhcGFiaWxpdGllcyhhcGkgYXMgSW1wZXJhdGl2ZUFwaSk7XG4gIGlmICghY2FwYWJpbGl0aWVzLmNhblJlYWRBY3RpdmVUb29sIHx8ICFjYXBhYmlsaXRpZXMuY2FuU2V0QWN0aXZlVG9vbCkge1xuICAgIHJldHVybiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBjb2RlOiBcImluY29tcGF0aWJsZVwiLFxuICAgICAgbWVzc2FnZTogXCJUaGlzIEV4Y2FsaWRyYXcgQVBJIGRvZXMgbm90IHN1cHBvcnQgYWN0aXZlLXRvb2wgcmVhZCBhbmQgd3JpdGUgb3BlcmF0aW9ucy5cIixcbiAgICB9O1xuICB9XG4gIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogYXBpIGFzIENvbXBhdGlibGVJbXBlcmF0aXZlQXBpIH07XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBEZWJ1Z0xvZ2dlciB7XG4gIHByaXZhdGUgdHJhY2U6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudFtdID0gW107XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZW5hYmxlZDogKCkgPT4gYm9vbGVhbikge31cblxuICBldmVudChldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZWQoKSkgcmV0dXJuO1xuICAgIHRoaXMudHJhY2UucHVzaChldmVudCk7XG4gICAgaWYgKHRoaXMudHJhY2UubGVuZ3RoID4gMTAwKSB0aGlzLnRyYWNlLnNoaWZ0KCk7XG4gICAgY29uc29sZS5kZWJ1ZyhcIltFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9sc11cIiwgZXZlbnQpO1xuICB9XG4gIG1lc3NhZ2UobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZW5hYmxlZCgpKSBjb25zb2xlLmRlYnVnKFwiW0V4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzXVwiLCBtZXNzYWdlKTtcbiAgfVxuICBleHBvcnRUcmFjZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLnRyYWNlLCBudWxsLCAyKTtcbiAgfVxuICBjbGVhcigpOiB2b2lkIHtcbiAgICB0aGlzLnRyYWNlID0gW107XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IEdlc3R1cmVFZmZlY3QsIEdlc3R1cmVTdGF0ZVNuYXBzaG90LCBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbi8qKiBBIGRpYWdub3N0aWMtb25seSwgbm9uLWludGVyYWN0aXZlIG92ZXJsYXkgbG9jYWwgdG8gb25lIEV4Y2FsaWRyYXcgdmlldy4gKi9cbmV4cG9ydCBjbGFzcyBEZWJ1Z092ZXJsYXkge1xuICBwcml2YXRlIGVsZW1lbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXI6IEhUTUxFbGVtZW50LFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZW5hYmxlZDogKCkgPT4gYm9vbGVhblxuICApIHt9XG5cbiAgdXBkYXRlKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQsIHN0YXRlOiBHZXN0dXJlU3RhdGVTbmFwc2hvdCwgZWZmZWN0PzogR2VzdHVyZUVmZmVjdCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5lbmFibGVkKCkpIHtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgb3ZlcmxheSA9IHRoaXMuZW5zdXJlRWxlbWVudCgpO1xuICAgIGNvbnN0IHN0YXRlU3VtbWFyeSA9IFtcbiAgICAgIGBob3Zlcjoke1N0cmluZyghc3RhdGUucGVuQ29udGFjdCl9YCxcbiAgICAgIGBiYXJyZWw6JHtTdHJpbmcoc3RhdGUuYmFycmVsQnV0dG9uSGVsZCl9YCxcbiAgICAgIGBjb25zdW1lZDoke1N0cmluZyhzdGF0ZS5nZXN0dXJlQ29uc3VtZWQpfWAsXG4gICAgICBgdGVtcDoke1N0cmluZyhzdGF0ZS50ZW1wb3JhcnlUb29sQWN0aXZlKX1gLFxuICAgIF0uam9pbihcIiBcdTAwQjcgXCIpO1xuICAgIG92ZXJsYXkuc2V0VGV4dChcbiAgICAgIFtcbiAgICAgICAgYFMgUGVuICR7ZXZlbnQua2luZH0gaWQ6JHtldmVudC5wb2ludGVySWR9IGJ1dHRvbjoke2V2ZW50LmJ1dHRvbn0gYnV0dG9uczoke2V2ZW50LmJ1dHRvbnN9IHByZXNzdXJlOiR7ZXZlbnQucHJlc3N1cmUudG9GaXhlZCgyKX1gLFxuICAgICAgICBgdGlsdDoke2V2ZW50LnRpbHRYfSwke2V2ZW50LnRpbHRZfSB0d2lzdDoke2V2ZW50LnR3aXN0fSB0YW5nZW50aWFsOiR7ZXZlbnQudGFuZ2VudGlhbFByZXNzdXJlLnRvRml4ZWQoMil9IHNpemU6JHtldmVudC53aWR0aH14JHtldmVudC5oZWlnaHR9YCxcbiAgICAgICAgc3RhdGVTdW1tYXJ5LFxuICAgICAgICBgZWZmZWN0OiR7ZWZmZWN0Py50eXBlID8/IFwibm9uZVwifWAsXG4gICAgICBdLmpvaW4oXCJcXG5cIilcbiAgICApO1xuICB9XG5cbiAgY2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5lbGVtZW50Py5yZW1vdmUoKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVFbGVtZW50KCk6IEhUTUxFbGVtZW50IHtcbiAgICBpZiAodGhpcy5lbGVtZW50KSByZXR1cm4gdGhpcy5lbGVtZW50O1xuICAgIHRoaXMuZWxlbWVudCA9IHRoaXMuY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJleGNhbGlkcmF3LXN0eWx1cy1kZWJ1Zy1vdmVybGF5XCIgfSk7XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudDtcbiAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgTm9ybWFsaXplZFN0eWx1c0V2ZW50LCBTdHlsdXNFdmVudEtpbmQgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5jb25zdCBldmVudEtpbmRzOiBSZWNvcmQ8c3RyaW5nLCBTdHlsdXNFdmVudEtpbmQ+ID0ge1xuICBwb2ludGVyZG93bjogXCJkb3duXCIsXG4gIHBvaW50ZXJtb3ZlOiBcIm1vdmVcIixcbiAgcG9pbnRlcnVwOiBcInVwXCIsXG4gIHBvaW50ZXJjYW5jZWw6IFwiY2FuY2VsXCIsXG4gIGNvbnRleHRtZW51OiBcImNvbnRleHRtZW51XCIsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplUG9pbnRlckV2ZW50KFxuICBldmVudDogUG9pbnRlckV2ZW50LFxuICBpc0NhbnZhc1RhcmdldDogYm9vbGVhblxuKTogTm9ybWFsaXplZFN0eWx1c0V2ZW50IHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBldmVudEtpbmRzW2V2ZW50LnR5cGVdID8/IFwibW92ZVwiLFxuICAgIHBvaW50ZXJUeXBlOiBldmVudC5wb2ludGVyVHlwZSxcbiAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICBidXR0b25zOiBldmVudC5idXR0b25zLFxuICAgIGJ1dHRvbjogZXZlbnQuYnV0dG9uLFxuICAgIHByZXNzdXJlOiBldmVudC5wcmVzc3VyZSxcbiAgICB0YW5nZW50aWFsUHJlc3N1cmU6IGV2ZW50LnRhbmdlbnRpYWxQcmVzc3VyZSxcbiAgICB0aWx0WDogZXZlbnQudGlsdFgsXG4gICAgdGlsdFk6IGV2ZW50LnRpbHRZLFxuICAgIHR3aXN0OiBldmVudC50d2lzdCxcbiAgICB3aWR0aDogZXZlbnQud2lkdGgsXG4gICAgaGVpZ2h0OiBldmVudC5oZWlnaHQsXG4gICAgeDogZXZlbnQuY2xpZW50WCxcbiAgICB5OiBldmVudC5jbGllbnRZLFxuICAgIHRpbWVzdGFtcDogZXZlbnQudGltZVN0YW1wLFxuICAgIGlzQ2FudmFzVGFyZ2V0LFxuICB9O1xufVxuIiwgImltcG9ydCB0eXBlIHtcbiAgR2VzdHVyZUVmZmVjdCxcbiAgR2VzdHVyZVNldHRpbmdzLFxuICBHZXN0dXJlU3RhdGVTbmFwc2hvdCxcbiAgTm9ybWFsaXplZFN0eWx1c0V2ZW50LFxuICBQb2ludCxcbiAgU2NoZWR1bGVyLFxufSBmcm9tIFwiLi90eXBlc1wiO1xuXG5pbnRlcmZhY2UgUGVuZGluZ1RhcCB7XG4gIHBvaW50OiBQb2ludDtcbiAgdGltZXI6IHVua25vd247XG59XG5cbi8qKiBQdXJlIHBlci12aWV3IFMgUGVuIGdlc3R1cmUgcG9saWN5LiBJdCBuZXZlciB0b3VjaGVzIHRoZSBET00gb3IgRXhjYWxpZHJhdy4gKi9cbmV4cG9ydCBjbGFzcyBTdHlsdXNHZXN0dXJlTWFjaGluZSB7XG4gIHByaXZhdGUgYmFycmVsQnV0dG9uSGVsZCA9IGZhbHNlO1xuICBwcml2YXRlIHBlbkNvbnRhY3QgPSBmYWxzZTtcbiAgcHJpdmF0ZSBjb25zdW1lZCA9IGZhbHNlO1xuICBwcml2YXRlIG1vdmVkID0gZmFsc2U7XG4gIHByaXZhdGUgaG9sZEZpcmVkID0gZmFsc2U7XG4gIHByaXZhdGUgdGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICBwcml2YXRlIHByZXNzT3JpZ2luOiBQb2ludCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGhvbGRUaW1lcjogdW5rbm93biB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdUYXA6IFBlbmRpbmdUYXAgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBhY3RpdmVQb2ludGVySWQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2V0dGluZ3M6IEdlc3R1cmVTZXR0aW5ncyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNjaGVkdWxlcjogU2NoZWR1bGVyXG4gICkge31cblxuICBoYW5kbGUoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IEdlc3R1cmVFZmZlY3RbXSB7XG4gICAgaWYgKGV2ZW50LnBvaW50ZXJUeXBlICE9PSBcInBlblwiKSByZXR1cm4gW107XG4gICAgY29uc3QgZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdID0gW107XG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwiY29udGV4dG1lbnVcIikge1xuICAgICAgaWYgKHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSB8fCAodGhpcy5iYXJyZWxCdXR0b25IZWxkICYmIHRoaXMucGVuQ29udGFjdCkpXG4gICAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwic3VwcHJlc3MtY29udGV4dC1tZW51XCIgfSk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJkb3duXCIpIHtcbiAgICAgIC8vIEEgY29tcGxpYW50IGJyb3dzZXIgbWF5IGZpcnN0IGV4cG9zZSB0aGUgYmFycmVsIHN0YXRlIHRvZ2V0aGVyIHdpdGhcbiAgICAgIC8vIGNvbnRhY3QgKGJ1dHRvbnM6IDMpLiBEbyBub3QgcmVxdWlyZSBhbiBlYXJsaWVyIGhvdmVyIG1vdmUuXG4gICAgICBpZiAoIXRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiB0aGlzLmlzQmFycmVsSGVsZChldmVudCkpIHRoaXMuc3RhcnRQcmVzcyhldmVudCk7XG4gICAgICB0aGlzLnBlbkNvbnRhY3QgPSB0cnVlO1xuICAgICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBldmVudC5wb2ludGVySWQ7XG4gICAgICBpZiAodGhpcy5iYXJyZWxCdXR0b25IZWxkKSB0aGlzLmNvbnN1bWVGb3JDb250YWN0KGV2ZW50LCBlZmZlY3RzKTtcbiAgICAgIHJldHVybiBlZmZlY3RzO1xuICAgIH1cblxuICAgIGlmIChldmVudC5raW5kID09PSBcInVwXCIgfHwgZXZlbnQua2luZCA9PT0gXCJjYW5jZWxcIikge1xuICAgICAgaWYgKHRoaXMuYWN0aXZlUG9pbnRlcklkICE9PSBudWxsICYmIGV2ZW50LnBvaW50ZXJJZCAhPT0gdGhpcy5hY3RpdmVQb2ludGVySWQpIHJldHVybiBlZmZlY3RzO1xuICAgICAgdGhpcy5wZW5Db250YWN0ID0gZmFsc2U7XG4gICAgICB0aGlzLmFjdGl2ZVBvaW50ZXJJZCA9IG51bGw7XG4gICAgICBpZiAodGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlKSB7XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICBlZmZlY3RzLnB1c2goeyB0eXBlOiBcInRlbXBvcmFyeS10b29sLWVuZFwiIH0pO1xuICAgICAgfVxuICAgICAgaWYgKGV2ZW50LmtpbmQgPT09IFwiY2FuY2VsXCIpIHRoaXMuY2FuY2VsUHJlc3MoKTtcbiAgICAgIGVsc2UgaWYgKCF0aGlzLmlzQmFycmVsSGVsZChldmVudCkpIHRoaXMucmVsZWFzZVByZXNzKGVmZmVjdHMpO1xuICAgICAgcmV0dXJuIGVmZmVjdHM7XG4gICAgfVxuXG4gICAgLy8gV2hpbGUgaG92ZXJpbmcsIG1vdmVtZW50IGNhcnJpZXMgYmFycmVsLWJ1dHRvbiB0cmFuc2l0aW9ucy5cbiAgICBpZiAodGhpcy5wZW5Db250YWN0KSByZXR1cm4gZWZmZWN0cztcbiAgICBjb25zdCBoZWxkTm93ID0gdGhpcy5pc0JhcnJlbEhlbGQoZXZlbnQpO1xuICAgIGlmICghdGhpcy5iYXJyZWxCdXR0b25IZWxkICYmIGhlbGROb3cpIHRoaXMuc3RhcnRQcmVzcyhldmVudCk7XG4gICAgaWYgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiBoZWxkTm93KSB0aGlzLnRyYWNrSG92ZXJNb3ZlbWVudChldmVudCk7XG4gICAgaWYgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiAhaGVsZE5vdykgdGhpcy5yZWxlYXNlUHJlc3MoZWZmZWN0cyk7XG4gICAgcmV0dXJuIGVmZmVjdHM7XG4gIH1cblxuICBkaXNwb3NlKCk6IEdlc3R1cmVFZmZlY3RbXSB7XG4gICAgY29uc3QgZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdID0gW107XG4gICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgaWYgKHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJ0ZW1wb3JhcnktdG9vbC1lbmRcIiB9KTtcbiAgICB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUgPSBmYWxzZTtcbiAgICB0aGlzLmNhbmNlbFByZXNzKCk7XG4gICAgcmV0dXJuIGVmZmVjdHM7XG4gIH1cblxuICBzbmFwc2hvdCgpOiBHZXN0dXJlU3RhdGVTbmFwc2hvdCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJhcnJlbEJ1dHRvbkhlbGQ6IHRoaXMuYmFycmVsQnV0dG9uSGVsZCxcbiAgICAgIHBlbkNvbnRhY3Q6IHRoaXMucGVuQ29udGFjdCxcbiAgICAgIGdlc3R1cmVDb25zdW1lZDogdGhpcy5jb25zdW1lZCxcbiAgICAgIHRlbXBvcmFyeVRvb2xBY3RpdmU6IHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSxcbiAgICAgIGhvdmVyR2VzdHVyZU1vdmVkOiB0aGlzLm1vdmVkLFxuICAgICAgbG9uZ1ByZXNzRmlyZWQ6IHRoaXMuaG9sZEZpcmVkLFxuICAgICAgYWN0aXZlUG9pbnRlcklkOiB0aGlzLmFjdGl2ZVBvaW50ZXJJZCxcbiAgICB9O1xuICB9XG5cbiAgLyoqIFRoZSBjb250cm9sbGVyIGNhbGxzIHRoaXMgd2hlbiB0aGUgb3B0aW9uYWwgRXhjYWxpZHJhdyBicmlkZ2UgcmVqZWN0cyBhIHN0YXJ0IHJlcXVlc3QuICovXG4gIHRlbXBvcmFyeVRvb2xEaWROb3RTdGFydCgpOiB2b2lkIHtcbiAgICB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUgPSBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgc3RhcnRQcmVzcyhldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50KTogdm9pZCB7XG4gICAgdGhpcy5iYXJyZWxCdXR0b25IZWxkID0gdHJ1ZTtcbiAgICB0aGlzLmNvbnN1bWVkID0gZmFsc2U7XG4gICAgdGhpcy5tb3ZlZCA9IGZhbHNlO1xuICAgIHRoaXMuaG9sZEZpcmVkID0gZmFsc2U7XG4gICAgdGhpcy5wcmVzc09yaWdpbiA9IHsgeDogZXZlbnQueCwgeTogZXZlbnQueSB9O1xuICAgIHRoaXMuaG9sZFRpbWVyID0gdGhpcy5zY2hlZHVsZXIuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAoXG4gICAgICAgICF0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgfHxcbiAgICAgICAgdGhpcy5wZW5Db250YWN0IHx8XG4gICAgICAgIHRoaXMubW92ZWQgfHxcbiAgICAgICAgdGhpcy5jb25zdW1lZCB8fFxuICAgICAgICAhdGhpcy5wcmVzc09yaWdpblxuICAgICAgKVxuICAgICAgICByZXR1cm47XG4gICAgICB0aGlzLmhvbGRGaXJlZCA9IHRydWU7XG4gICAgICB0aGlzLmNvbnN1bWVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgICAgdGhpcy5vbkVmZmVjdD8uKHsgdHlwZTogXCJidXR0b24taG9sZFwiLCBwb2ludDogdGhpcy5wcmVzc09yaWdpbiB9KTtcbiAgICB9LCB0aGlzLnNldHRpbmdzLmxvbmdQcmVzc01zKTtcbiAgfVxuXG4gIC8qKiBDb250cm9sbGVyIHJlZ2lzdGVycyB0aGlzIHNvIHNjaGVkdWxlciBjYWxsYmFja3MgcmV0YWluIHB1cmUgc2VtYW50aWMgb3V0cHV0LiAqL1xuICBwcml2YXRlIG9uRWZmZWN0OiAoKGVmZmVjdDogR2VzdHVyZUVmZmVjdCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgc2V0RWZmZWN0U2luayhzaW5rOiAoZWZmZWN0OiBHZXN0dXJlRWZmZWN0KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5vbkVmZmVjdCA9IHNpbms7XG4gIH1cblxuICBwcml2YXRlIHRyYWNrSG92ZXJNb3ZlbWVudChldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnByZXNzT3JpZ2luIHx8IHRoaXMubW92ZWQpIHJldHVybjtcbiAgICBjb25zdCBkeCA9IGV2ZW50LnggLSB0aGlzLnByZXNzT3JpZ2luLng7XG4gICAgY29uc3QgZHkgPSBldmVudC55IC0gdGhpcy5wcmVzc09yaWdpbi55O1xuICAgIGlmIChNYXRoLmh5cG90KGR4LCBkeSkgPiB0aGlzLnNldHRpbmdzLm1vdmVtZW50VGhyZXNob2xkUHgpIHtcbiAgICAgIHRoaXMubW92ZWQgPSB0cnVlO1xuICAgICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjb25zdW1lRm9yQ29udGFjdChldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50LCBlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10pOiB2b2lkIHtcbiAgICB0aGlzLmNvbnN1bWVkID0gdHJ1ZTtcbiAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5idXR0b25Db250YWN0QWN0aW9uID09PSBcImVyYXNlclwiICYmICF0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUpIHtcbiAgICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IHRydWU7XG4gICAgICBlZmZlY3RzLnB1c2goeyB0eXBlOiBcInRlbXBvcmFyeS10b29sLXN0YXJ0XCIsIHBvaW50OiB7IHg6IGV2ZW50LngsIHk6IGV2ZW50LnkgfSB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbGVhc2VQcmVzcyhlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10pOiB2b2lkIHtcbiAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgPSBmYWxzZTtcbiAgICBpZiAoIXRoaXMuY29uc3VtZWQgJiYgIXRoaXMubW92ZWQgJiYgIXRoaXMuaG9sZEZpcmVkICYmIHRoaXMucHJlc3NPcmlnaW4pIHtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdUYXApIHtcbiAgICAgICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwiYnV0dG9uLWRvdWJsZS10YXBcIiwgcG9pbnQ6IHRoaXMucHJlc3NPcmlnaW4gfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwb2ludCA9IHRoaXMucHJlc3NPcmlnaW47XG4gICAgICAgIGNvbnN0IHRpbWVyID0gdGhpcy5zY2hlZHVsZXIuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5wZW5kaW5nVGFwID0gbnVsbDtcbiAgICAgICAgICB0aGlzLm9uRWZmZWN0Py4oeyB0eXBlOiBcImJ1dHRvbi10YXBcIiwgcG9pbnQgfSk7XG4gICAgICAgIH0sIHRoaXMuc2V0dGluZ3MuZG91YmxlVGFwTXMpO1xuICAgICAgICB0aGlzLnBlbmRpbmdUYXAgPSB7IHBvaW50LCB0aW1lciB9O1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnByZXNzT3JpZ2luID0gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgY2FuY2VsUHJlc3MoKTogdm9pZCB7XG4gICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgdGhpcy5iYXJyZWxCdXR0b25IZWxkID0gZmFsc2U7XG4gICAgdGhpcy5wZW5Db250YWN0ID0gZmFsc2U7XG4gICAgdGhpcy5jb25zdW1lZCA9IGZhbHNlO1xuICAgIHRoaXMubW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmhvbGRGaXJlZCA9IGZhbHNlO1xuICAgIHRoaXMucHJlc3NPcmlnaW4gPSBudWxsO1xuICAgIHRoaXMuYWN0aXZlUG9pbnRlcklkID0gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgY2FuY2VsVGltZXIod2hpY2g6IFwiaG9sZFwiKTogdm9pZCB7XG4gICAgaWYgKHdoaWNoID09PSBcImhvbGRcIiAmJiB0aGlzLmhvbGRUaW1lciAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5zY2hlZHVsZXIuY2xlYXJUaW1lb3V0KHRoaXMuaG9sZFRpbWVyKTtcbiAgICAgIHRoaXMuaG9sZFRpbWVyID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNhbmNlbFBlbmRpbmdUYXAoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucGVuZGluZ1RhcCkgdGhpcy5zY2hlZHVsZXIuY2xlYXJUaW1lb3V0KHRoaXMucGVuZGluZ1RhcC50aW1lcik7XG4gICAgdGhpcy5wZW5kaW5nVGFwID0gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgaXNCYXJyZWxIZWxkKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKGV2ZW50LmJ1dHRvbnMgJiB0aGlzLnNldHRpbmdzLmJhcnJlbEJ1dHRvbk1hc2spICE9PSAwO1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSB7IEV4Y2FsaWRyYXdCcmlkZ2UsIEFjdGl2ZVRvb2xTbmFwc2hvdCB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB0eXBlIHsgRGVidWdMb2dnZXIgfSBmcm9tIFwiLi4vZGVidWcvRGVidWdMb2dnZXJcIjtcbmltcG9ydCB7IERlYnVnT3ZlcmxheSB9IGZyb20gXCIuLi9kZWJ1Zy9EZWJ1Z092ZXJsYXlcIjtcbmltcG9ydCB0eXBlIHsgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB9IGZyb20gXCIuLi9zZXR0aW5ncy9zZXR0aW5nc1wiO1xuaW1wb3J0IHsgbm9ybWFsaXplUG9pbnRlckV2ZW50IH0gZnJvbSBcIi4vbm9ybWFsaXplUG9pbnRlckV2ZW50XCI7XG5pbXBvcnQgeyBTdHlsdXNHZXN0dXJlTWFjaGluZSB9IGZyb20gXCIuL1N0eWx1c0dlc3R1cmVNYWNoaW5lXCI7XG5pbXBvcnQgdHlwZSB7IEdlc3R1cmVFZmZlY3QsIE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgUG9pbnQsIFNjaGVkdWxlciB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCB0eXBlIEFjdGlvbkhhbmRsZXIgPSAoXG4gIGFjdGlvbjogXCJtZW51XCIgfCBcImNvcHlcIiB8IFwicGFzdGVcIiB8IFwibm9uZVwiLFxuICBwb2ludDogUG9pbnQsXG4gIGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZVxuKSA9PiB2b2lkO1xuXG5leHBvcnQgY2xhc3MgU3R5bHVzQ29udHJvbGxlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWFjaGluZTogU3R5bHVzR2VzdHVyZU1hY2hpbmU7XG4gIHByaXZhdGUgc2F2ZWRUb29sOiBBY3RpdmVUb29sU25hcHNob3QgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBkaXNwb3NlZCA9IGZhbHNlO1xuICBwcml2YXRlIGF0dGFjaGVkID0gZmFsc2U7XG4gIHByaXZhdGUgcmVhZG9ubHkgbGlzdGVuZXJzOiBBcnJheTxba2V5b2YgSFRNTEVsZW1lbnRFdmVudE1hcCwgRXZlbnRMaXN0ZW5lcl0+ID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgb3ZlcmxheTogRGVidWdPdmVybGF5O1xuICBwcml2YXRlIGxhdGVzdEV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxlYWY6IFdvcmtzcGFjZUxlYWYsXG4gICAgcHJpdmF0ZSByZWFkb25seSBicmlkZ2U6IEV4Y2FsaWRyYXdCcmlkZ2UsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogKCkgPT4gU3R5bHVzQ29udHJvbHNTZXR0aW5ncyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRlYnVnOiBEZWJ1Z0xvZ2dlcixcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpc3BhdGNoQWN0aW9uOiBBY3Rpb25IYW5kbGVyLFxuICAgIHNjaGVkdWxlcjogU2NoZWR1bGVyID0gd2luZG93XG4gICkge1xuICAgIHRoaXMubWFjaGluZSA9IG5ldyBTdHlsdXNHZXN0dXJlTWFjaGluZSh0aGlzLmdlc3R1cmVTZXR0aW5ncygpLCBzY2hlZHVsZXIpO1xuICAgIHRoaXMubWFjaGluZS5zZXRFZmZlY3RTaW5rKChlZmZlY3QpID0+IHRoaXMuYXBwbHlFZmZlY3QoZWZmZWN0KSk7XG4gICAgdGhpcy5vdmVybGF5ID0gbmV3IERlYnVnT3ZlcmxheShcbiAgICAgIHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLFxuICAgICAgKCkgPT4gdGhpcy5zZXR0aW5ncygpLmRlYnVnTW9kZSAmJiB0aGlzLnNldHRpbmdzKCkuZGVidWdPdmVybGF5XG4gICAgKTtcbiAgfVxuXG4gIGF0dGFjaCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCB8fCB0aGlzLmF0dGFjaGVkKSByZXR1cm47XG4gICAgdGhpcy5hdHRhY2hlZCA9IHRydWU7XG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsO1xuICAgIGZvciAoY29uc3QgdHlwZSBvZiBbXG4gICAgICBcInBvaW50ZXJkb3duXCIsXG4gICAgICBcInBvaW50ZXJtb3ZlXCIsXG4gICAgICBcInBvaW50ZXJ1cFwiLFxuICAgICAgXCJwb2ludGVyY2FuY2VsXCIsXG4gICAgICBcImNvbnRleHRtZW51XCIsXG4gICAgXSBhcyBjb25zdCkge1xuICAgICAgY29uc3QgbGlzdGVuZXI6IEV2ZW50TGlzdGVuZXIgPSAocmF3KSA9PiB0aGlzLm9uUG9pbnRlckV2ZW50KHJhdyBhcyBQb2ludGVyRXZlbnQpO1xuICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgICAgIHRoaXMubGlzdGVuZXJzLnB1c2goW3R5cGUsIGxpc3RlbmVyXSk7XG4gICAgfVxuICB9XG5cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkgcmV0dXJuO1xuICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuICAgIHRoaXMuYXR0YWNoZWQgPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IFt0eXBlLCBsaXN0ZW5lcl0gb2YgdGhpcy5saXN0ZW5lcnMpXG4gICAgICB0aGlzLmxlYWYudmlldy5jb250YWluZXJFbC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgICB0aGlzLmxpc3RlbmVycy5sZW5ndGggPSAwO1xuICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIHRoaXMubWFjaGluZS5kaXNwb3NlKCkpIHRoaXMuYXBwbHlFZmZlY3QoZWZmZWN0KTtcbiAgICB0aGlzLm92ZXJsYXkuY2xvc2UoKTtcbiAgfVxuICBnZXRUcmFjZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRlYnVnLmV4cG9ydFRyYWNlKCk7XG4gIH1cblxuICBwcml2YXRlIG9uUG9pbnRlckV2ZW50KHJhdzogUG9pbnRlckV2ZW50KTogdm9pZCB7XG4gICAgaWYgKHJhdy5wb2ludGVyVHlwZSAhPT0gXCJwZW5cIikgcmV0dXJuO1xuICAgIGNvbnN0IGV2ZW50ID0gbm9ybWFsaXplUG9pbnRlckV2ZW50KFxuICAgICAgcmF3LFxuICAgICAgdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWwuY29udGFpbnMocmF3LnRhcmdldCBhcyBOb2RlKVxuICAgICk7XG4gICAgdGhpcy5sYXRlc3RFdmVudCA9IGV2ZW50O1xuICAgIHRoaXMuZGVidWcuZXZlbnQoZXZlbnQpO1xuICAgIGNvbnN0IGVmZmVjdHMgPSB0aGlzLm1hY2hpbmUuaGFuZGxlKGV2ZW50KTtcbiAgICBpZiAoZWZmZWN0cy5sZW5ndGggPT09IDApIHRoaXMub3ZlcmxheS51cGRhdGUoZXZlbnQsIHRoaXMubWFjaGluZS5zbmFwc2hvdCgpKTtcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiBlZmZlY3RzKSB7XG4gICAgICBpZiAoZWZmZWN0LnR5cGUgPT09IFwic3VwcHJlc3MtY29udGV4dC1tZW51XCIpIHJhdy5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5hcHBseUVmZmVjdChlZmZlY3QpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwbHlFZmZlY3QoZWZmZWN0OiBHZXN0dXJlRWZmZWN0KTogdm9pZCB7XG4gICAgdGhpcy5kZWJ1Zy5tZXNzYWdlKGBlZmZlY3Q6ICR7ZWZmZWN0LnR5cGV9YCk7XG4gICAgc3dpdGNoIChlZmZlY3QudHlwZSkge1xuICAgICAgY2FzZSBcInRlbXBvcmFyeS10b29sLXN0YXJ0XCI6XG4gICAgICAgIGlmICghdGhpcy5zYXZlZFRvb2wpIHtcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmJyaWRnZS5zdGFydFRlbXBvcmFyeUVyYXNlcigpO1xuICAgICAgICAgIGlmIChyZXN1bHQub2spIHRoaXMuc2F2ZWRUb29sID0gcmVzdWx0LnZhbHVlO1xuICAgICAgICAgIGVsc2UgdGhpcy5tYWNoaW5lLnRlbXBvcmFyeVRvb2xEaWROb3RTdGFydCgpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcInRlbXBvcmFyeS10b29sLWVuZFwiOlxuICAgICAgICBpZiAodGhpcy5zYXZlZFRvb2wpIHRoaXMuYnJpZGdlLnJlc3RvcmVUb29sKHRoaXMuc2F2ZWRUb29sKTtcbiAgICAgICAgdGhpcy5zYXZlZFRvb2wgPSBudWxsO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJidXR0b24tdGFwXCI6XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvblRhcEFjdGlvbiwgZWZmZWN0LnBvaW50LCB0aGlzLmJyaWRnZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImJ1dHRvbi1kb3VibGUtdGFwXCI6XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvbkRvdWJsZVRhcEFjdGlvbiwgZWZmZWN0LnBvaW50LCB0aGlzLmJyaWRnZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImJ1dHRvbi1ob2xkXCI6XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvbkhvbGRBY3Rpb24sIGVmZmVjdC5wb2ludCwgdGhpcy5icmlkZ2UpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAodGhpcy5sYXRlc3RFdmVudCkgdGhpcy5vdmVybGF5LnVwZGF0ZSh0aGlzLmxhdGVzdEV2ZW50LCB0aGlzLm1hY2hpbmUuc25hcHNob3QoKSwgZWZmZWN0KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2VzdHVyZVNldHRpbmdzKCkge1xuICAgIGNvbnN0IHZhbHVlID0gdGhpcy5zZXR0aW5ncygpO1xuICAgIHJldHVybiB7XG4gICAgICBidXR0b25Db250YWN0QWN0aW9uOiB2YWx1ZS5idXR0b25Db250YWN0QWN0aW9uLFxuICAgICAgZG91YmxlVGFwTXM6IHZhbHVlLmRvdWJsZVRhcE1zLFxuICAgICAgbG9uZ1ByZXNzTXM6IHZhbHVlLmxvbmdQcmVzc01zLFxuICAgICAgbW92ZW1lbnRUaHJlc2hvbGRQeDogdmFsdWUubW92ZW1lbnRUaHJlc2hvbGRQeCxcbiAgICAgIGJhcnJlbEJ1dHRvbk1hc2s6IHZhbHVlLmJhcnJlbEJ1dHRvbk1hc2ssXG4gICAgfSBhcyBjb25zdDtcbiAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgQXBwLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBFeGNhbGlkcmF3QnJpZGdlIH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZVwiO1xuaW1wb3J0IHsgRGVidWdMb2dnZXIgfSBmcm9tIFwiLi4vZGVidWcvRGVidWdMb2dnZXJcIjtcbmltcG9ydCB0eXBlIHsgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB9IGZyb20gXCIuLi9zZXR0aW5ncy9zZXR0aW5nc1wiO1xuaW1wb3J0IHsgU3R5bHVzQ29udHJvbGxlciwgdHlwZSBBY3Rpb25IYW5kbGVyIH0gZnJvbSBcIi4vU3R5bHVzQ29udHJvbGxlclwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFN0eWx1c0NvbnRyb2xsZXJMaWtlIHtcbiAgYXR0YWNoKCk6IHZvaWQ7XG4gIGRpc3Bvc2UoKTogdm9pZDtcbiAgZ2V0VHJhY2UoKTogc3RyaW5nO1xufVxuXG5leHBvcnQgdHlwZSBTdHlsdXNDb250cm9sbGVyRmFjdG9yeSA9IChsZWFmOiBXb3Jrc3BhY2VMZWFmKSA9PiBTdHlsdXNDb250cm9sbGVyTGlrZTtcblxuZXhwb3J0IGNsYXNzIFN0eWx1c1ZpZXdSZWdpc3RyeSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29udHJvbGxlcnMgPSBuZXcgTWFwPFdvcmtzcGFjZUxlYWYsIFN0eWx1c0NvbnRyb2xsZXJMaWtlPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGNyZWF0ZUNvbnRyb2xsZXI6IFN0eWx1c0NvbnRyb2xsZXJGYWN0b3J5O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogKCkgPT4gU3R5bHVzQ29udHJvbHNTZXR0aW5ncyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFjdGlvbkhhbmRsZXI6IEFjdGlvbkhhbmRsZXIsXG4gICAgY3JlYXRlQ29udHJvbGxlcj86IFN0eWx1c0NvbnRyb2xsZXJGYWN0b3J5XG4gICkge1xuICAgIHRoaXMuY3JlYXRlQ29udHJvbGxlciA9XG4gICAgICBjcmVhdGVDb250cm9sbGVyID8/XG4gICAgICAoKGxlYWYpID0+IHtcbiAgICAgICAgY29uc3QgZGVidWcgPSBuZXcgRGVidWdMb2dnZXIoKCkgPT4gdGhpcy5zZXR0aW5ncygpLmRlYnVnTW9kZSk7XG4gICAgICAgIHJldHVybiBuZXcgU3R5bHVzQ29udHJvbGxlcihcbiAgICAgICAgICBsZWFmLFxuICAgICAgICAgIG5ldyBFeGNhbGlkcmF3QnJpZGdlKGxlYWYpLFxuICAgICAgICAgIHRoaXMuc2V0dGluZ3MsXG4gICAgICAgICAgZGVidWcsXG4gICAgICAgICAgdGhpcy5hY3Rpb25IYW5kbGVyXG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHN5bmMoKTogdm9pZCB7XG4gICAgY29uc3QgbGVhdmVzID0gbmV3IFNldCh0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFwiZXhjYWxpZHJhd1wiKSk7XG4gICAgZm9yIChjb25zdCBsZWFmIG9mIGxlYXZlcylcbiAgICAgIGlmICghdGhpcy5jb250cm9sbGVycy5oYXMobGVhZikpIHtcbiAgICAgICAgY29uc3QgY29udHJvbGxlciA9IHRoaXMuY3JlYXRlQ29udHJvbGxlcihsZWFmKTtcbiAgICAgICAgY29udHJvbGxlci5hdHRhY2goKTtcbiAgICAgICAgdGhpcy5jb250cm9sbGVycy5zZXQobGVhZiwgY29udHJvbGxlcik7XG4gICAgICB9XG4gICAgZm9yIChjb25zdCBbbGVhZiwgY29udHJvbGxlcl0gb2YgdGhpcy5jb250cm9sbGVycylcbiAgICAgIGlmICghbGVhdmVzLmhhcyhsZWFmKSkge1xuICAgICAgICBjb250cm9sbGVyLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5jb250cm9sbGVycy5kZWxldGUobGVhZik7XG4gICAgICB9XG4gIH1cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGNvbnRyb2xsZXIgb2YgdGhpcy5jb250cm9sbGVycy52YWx1ZXMoKSkgY29udHJvbGxlci5kaXNwb3NlKCk7XG4gICAgdGhpcy5jb250cm9sbGVycy5jbGVhcigpO1xuICB9XG4gIHJlZnJlc2goKTogdm9pZCB7XG4gICAgdGhpcy5kaXNwb3NlKCk7XG4gICAgdGhpcy5zeW5jKCk7XG4gIH1cbiAgZXhwb3J0VHJhY2VzKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KFxuICAgICAgWy4uLnRoaXMuY29udHJvbGxlcnMuZW50cmllcygpXS5tYXAoKFtsZWFmLCBjb250cm9sbGVyXSkgPT4gKHtcbiAgICAgICAgbGVhZjogbGVhZi5nZXREaXNwbGF5VGV4dCgpLFxuICAgICAgICBldmVudHM6IEpTT04ucGFyc2UoY29udHJvbGxlci5nZXRUcmFjZSgpKSxcbiAgICAgIH0pKSxcbiAgICAgIG51bGwsXG4gICAgICAyXG4gICAgKTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFBQUEsbUJBQStCOzs7QUNHL0IsSUFBTSxpQkFBaUI7QUFDdkIsSUFBTSxxQkFBcUIsRUFBRSxPQUFPLEtBQUssUUFBUSxJQUFJO0FBRTlDLFNBQVMsa0JBQ2QsT0FDQSxVQUNBLE1BQ087QUFDUCxTQUFPO0FBQUEsSUFDTCxHQUFHLEtBQUssSUFBSSxnQkFBZ0IsS0FBSyxJQUFJLE1BQU0sR0FBRyxTQUFTLFFBQVEsS0FBSyxRQUFRLGNBQWMsQ0FBQztBQUFBLElBQzNGLEdBQUcsS0FBSyxJQUFJLGdCQUFnQixLQUFLLElBQUksTUFBTSxHQUFHLFNBQVMsU0FBUyxLQUFLLFNBQVMsY0FBYyxDQUFDO0FBQUEsRUFDL0Y7QUFDRjtBQUVPLElBQU0sYUFBTixNQUFpQjtBQUFBLEVBQ2QsVUFBOEI7QUFBQSxFQUM5QixrQkFBMEQ7QUFBQSxFQUMxRCxpQkFBaUI7QUFBQSxFQUV6QixLQUFLLE9BQWMsUUFBZ0M7QUFDakQsU0FBSyxNQUFNO0FBQ1gsVUFBTSxhQUFhLEtBQUs7QUFDeEIsVUFBTSxPQUFPLFNBQVMsS0FBSyxVQUFVLEVBQUUsS0FBSyx5QkFBeUIsQ0FBQztBQUN0RSxVQUFNQyxXQUF1QztBQUFBLE1BQzNDLENBQUMsYUFBYSxNQUFNLE9BQU8sUUFBUSxXQUFXLENBQUM7QUFBQSxNQUMvQyxDQUFDLGFBQWEsTUFBTSxPQUFPLFFBQVEsVUFBVSxDQUFDO0FBQUEsTUFDOUMsQ0FBQyxVQUFVLE1BQU0sT0FBTyxRQUFRLFFBQVEsQ0FBQztB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
