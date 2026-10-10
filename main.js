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
  lastMoveLogAt = -Infinity;
  event(event) {
    if (!this.enabled()) return;
    if (event.kind === "move" && event.timestamp - this.lastMoveLogAt < 100) return;
    if (event.kind === "move") this.lastMoveLogAt = event.timestamp;
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
      return effects;
    }
    if (this.penContact) return effects;
    const heldNow = (event.buttons & this.settings.barrelButtonMask) !== 0;
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
      callback: async () => {
        const trace = this.registry?.exportTraces() ?? "[]";
        try {
          await navigator.clipboard.writeText(trace);
          new import_obsidian3.Notice("Stylus event trace copied.");
        } catch {
          new import_obsidian3.Notice("Unable to copy event trace. Check the developer console.");
        }
      }
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
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL21lbnUvU3R5bHVzTWVudS50cyIsICJzcmMvc2V0dGluZ3MvU2V0dGluZ3NUYWIudHMiLCAic3JjL3NldHRpbmdzL3NldHRpbmdzLnRzIiwgInNyYy9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2UudHMiLCAic3JjL2V4Y2FsaWRyYXcvY29tcGF0aWJpbGl0eS50cyIsICJzcmMvZGVidWcvRGVidWdMb2dnZXIudHMiLCAic3JjL2RlYnVnL0RlYnVnT3ZlcmxheS50cyIsICJzcmMvc3R5bHVzL25vcm1hbGl6ZVBvaW50ZXJFdmVudC50cyIsICJzcmMvc3R5bHVzL1N0eWx1c0dlc3R1cmVNYWNoaW5lLnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzQ29udHJvbGxlci50cyIsICJzcmMvc3R5bHVzL1N0eWx1c1ZpZXdSZWdpc3RyeS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgTm90aWNlLCBQbHVnaW4gfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IFN0eWx1c01lbnUgfSBmcm9tIFwiLi9tZW51L1N0eWx1c01lbnVcIjtcbmltcG9ydCB7IFNldHRpbmdzVGFiIH0gZnJvbSBcIi4vc2V0dGluZ3MvU2V0dGluZ3NUYWJcIjtcbmltcG9ydCB7XG4gIERFRkFVTFRfU0VUVElOR1MsXG4gIG5vcm1hbGl6ZVNldHRpbmdzLFxuICB0eXBlIFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MsXG59IGZyb20gXCIuL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBTdHlsdXNWaWV3UmVnaXN0cnkgfSBmcm9tIFwiLi9zdHlsdXMvU3R5bHVzVmlld1JlZ2lzdHJ5XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0eWx1c0NvbnRyb2xzUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuICBwcml2YXRlIHJlZ2lzdHJ5OiBTdHlsdXNWaWV3UmVnaXN0cnkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByZWFkb25seSBtZW51ID0gbmV3IFN0eWx1c01lbnUoKTtcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IG5vcm1hbGl6ZVNldHRpbmdzKChhd2FpdCB0aGlzLmxvYWREYXRhKCkpID8/IHt9KTtcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFNldHRpbmdzVGFiKHRoaXMpKTtcbiAgICB0aGlzLnJlZ2lzdHJ5ID0gbmV3IFN0eWx1c1ZpZXdSZWdpc3RyeShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgKCkgPT4gdGhpcy5zZXR0aW5ncyxcbiAgICAgIChhY3Rpb24sIHBvaW50LCBicmlkZ2UpID0+IHtcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJtZW51XCIpIHRoaXMubWVudS5vcGVuKHBvaW50LCBicmlkZ2UpO1xuICAgICAgICBlbHNlIGlmIChhY3Rpb24gPT09IFwiY29weVwiKSBicmlkZ2UuY29weVNlbGVjdGVkRWxlbWVudHMoKTtcbiAgICAgICAgZWxzZSBpZiAoYWN0aW9uID09PSBcInBhc3RlXCIpIGJyaWRnZS5wYXN0ZUF0KHBvaW50KTtcbiAgICAgIH1cbiAgICApO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJsYXlvdXQtY2hhbmdlXCIsICgpID0+IHRoaXMucmVnaXN0cnk/LnN5bmMoKSkpO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHRoaXMucmVnaXN0cnk/LnN5bmMoKSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImNvcHktc3R5bHVzLWV2ZW50LXRyYWNlXCIsXG4gICAgICBuYW1lOiBcIkNvcHkgbGF0ZXN0IHN0eWx1cyBldmVudCB0cmFjZVwiLFxuICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgICAgY29uc3QgdHJhY2UgPSB0aGlzLnJlZ2lzdHJ5Py5leHBvcnRUcmFjZXMoKSA/PyBcIltdXCI7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQodHJhY2UpO1xuICAgICAgICAgIG5ldyBOb3RpY2UoXCJTdHlsdXMgZXZlbnQgdHJhY2UgY29waWVkLlwiKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgbmV3IE5vdGljZShcIlVuYWJsZSB0byBjb3B5IGV2ZW50IHRyYWNlLiBDaGVjayB0aGUgZGV2ZWxvcGVyIGNvbnNvbGUuXCIpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG4gIG9udW5sb2FkKCk6IHZvaWQge1xuICAgIHRoaXMubWVudS5jbG9zZSgpO1xuICAgIHRoaXMucmVnaXN0cnk/LmRpc3Bvc2UoKTtcbiAgICB0aGlzLnJlZ2lzdHJ5ID0gbnVsbDtcbiAgfVxuICBhc3luYyB1cGRhdGVTZXR0aW5ncyhwYXRjaDogUGFydGlhbDxTdHlsdXNDb250cm9sc1NldHRpbmdzPik6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBub3JtYWxpemVTZXR0aW5ncyh7IC4uLnRoaXMuc2V0dGluZ3MsIC4uLnBhdGNoIH0pO1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gICAgdGhpcy5yZWdpc3RyeT8ucmVmcmVzaCgpO1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBFeGNhbGlkcmF3QnJpZGdlIH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZVwiO1xuaW1wb3J0IHR5cGUgeyBQb2ludCB9IGZyb20gXCIuLi9zdHlsdXMvdHlwZXNcIjtcblxuY29uc3QgTUVOVV9NQVJHSU5fUFggPSA4O1xuY29uc3QgRkFMTEJBQ0tfTUVOVV9TSVpFID0geyB3aWR0aDogMTcyLCBoZWlnaHQ6IDMwMCB9O1xuXG5leHBvcnQgZnVuY3Rpb24gY2xhbXBNZW51UG9zaXRpb24oXG4gIHBvaW50OiBQb2ludCxcbiAgdmlld3BvcnQ6IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfSxcbiAgbWVudTogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9XG4pOiBQb2ludCB7XG4gIHJldHVybiB7XG4gICAgeDogTWF0aC5tYXgoTUVOVV9NQVJHSU5fUFgsIE1hdGgubWluKHBvaW50LngsIHZpZXdwb3J0LndpZHRoIC0gbWVudS53aWR0aCAtIE1FTlVfTUFSR0lOX1BYKSksXG4gICAgeTogTWF0aC5tYXgoTUVOVV9NQVJHSU5fUFgsIE1hdGgubWluKHBvaW50LnksIHZpZXdwb3J0LmhlaWdodCAtIG1lbnUuaGVpZ2h0IC0gTUVOVV9NQVJHSU5fUFgpKSxcbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIFN0eWx1c01lbnUge1xuICBwcml2YXRlIGVsZW1lbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgb3V0c2lkZUxpc3RlbmVyOiAoKGV2ZW50OiBQb2ludGVyRXZlbnQpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgb3BlbkdlbmVyYXRpb24gPSAwO1xuXG4gIG9wZW4ocG9pbnQ6IFBvaW50LCBicmlkZ2U6IEV4Y2FsaWRyYXdCcmlkZ2UpOiB2b2lkIHtcbiAgICB0aGlzLmNsb3NlKCk7XG4gICAgY29uc3QgZ2VuZXJhdGlvbiA9IHRoaXMub3BlbkdlbmVyYXRpb247XG4gICAgY29uc3QgbWVudSA9IGRvY3VtZW50LmJvZHkuY3JlYXRlRGl2KHsgY2xzOiBcImV4Y2FsaWRyYXctc3R5bHVzLW1lbnVcIiB9KTtcbiAgICBjb25zdCBhY3Rpb25zOiBBcnJheTxbc3RyaW5nLCAoKSA9PiB2b2lkXT4gPSBbXG4gICAgICBbXCJTZWxlY3Rpb25cIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJzZWxlY3Rpb25cIildLFxuICAgICAgW1wiRnJlZSBkcmF3XCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiZnJlZWRyYXdcIildLFxuICAgICAgW1wiRXJhc2VyXCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiZXJhc2VyXCIpXSxcbiAgICAgIFtcIlJlY3RhbmdsZVwiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcInJlY3RhbmdsZVwiKV0sXG4gICAgICBbXCJBcnJvd1wiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcImFycm93XCIpXSxcbiAgICAgIFtcIkNvcHlcIiwgKCkgPT4gYnJpZGdlLmNvcHlTZWxlY3RlZEVsZW1lbnRzKCldLFxuICAgICAgW1wiUGFzdGVcIiwgKCkgPT4gYnJpZGdlLnBhc3RlQXQocG9pbnQpXSxcbiAgICBdO1xuICAgIGZvciAoY29uc3QgW25hbWUsIGNhbGxiYWNrXSBvZiBhY3Rpb25zKSB7XG4gICAgICBjb25zdCBidXR0b24gPSBtZW51LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcbiAgICAgICAgdGV4dDogbmFtZSxcbiAgICAgICAgY2xzOiBcImV4Y2FsaWRyYXctc3R5bHVzLW1lbnVfX2l0ZW1cIixcbiAgICAgIH0pO1xuICAgICAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVydXBcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhpcy5lbGVtZW50ID0gbWVudTtcbiAgICBjb25zdCBwb3NpdGlvbiA9IGNsYW1wTWVudVBvc2l0aW9uKFxuICAgICAgcG9pbnQsXG4gICAgICB7IHdpZHRoOiB3aW5kb3cuaW5uZXJXaWR0aCwgaGVpZ2h0OiB3aW5kb3cuaW5uZXJIZWlnaHQgfSxcbiAgICAgIHtcbiAgICAgICAgd2lkdGg6IG1lbnUub2Zmc2V0V2lkdGggfHwgRkFMTEJBQ0tfTUVOVV9TSVpFLndpZHRoLFxuICAgICAgICBoZWlnaHQ6IG1lbnUub2Zmc2V0SGVpZ2h0IHx8IEZBTExCQUNLX01FTlVfU0laRS5oZWlnaHQsXG4gICAgICB9XG4gICAgKTtcbiAgICBtZW51LnNldENzc1Byb3BzKHsgbGVmdDogYCR7cG9zaXRpb24ueH1weGAsIHRvcDogYCR7cG9zaXRpb24ueX1weGAgfSk7XG4gICAgd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKGdlbmVyYXRpb24gIT09IHRoaXMub3BlbkdlbmVyYXRpb24gfHwgIXRoaXMuZWxlbWVudCkgcmV0dXJuO1xuICAgICAgdGhpcy5vdXRzaWRlTGlzdGVuZXIgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgaWYgKCF0aGlzLmVsZW1lbnQ/LmNvbnRhaW5zKGV2ZW50LnRhcmdldCBhcyBOb2RlKSkgdGhpcy5jbG9zZSgpO1xuICAgICAgfTtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZG93blwiLCB0aGlzLm91dHNpZGVMaXN0ZW5lciwgdHJ1ZSk7XG4gICAgfSwgMCk7XG4gIH1cbiAgY2xvc2UgPSAoKTogdm9pZCA9PiB7XG4gICAgdGhpcy5vcGVuR2VuZXJhdGlvbiArPSAxO1xuICAgIGlmICh0aGlzLm91dHNpZGVMaXN0ZW5lcilcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZG93blwiLCB0aGlzLm91dHNpZGVMaXN0ZW5lciwgdHJ1ZSk7XG4gICAgdGhpcy5vdXRzaWRlTGlzdGVuZXIgPSBudWxsO1xuICAgIHRoaXMuZWxlbWVudD8ucmVtb3ZlKCk7XG4gICAgdGhpcy5lbGVtZW50ID0gbnVsbDtcbiAgfTtcbn1cbiIsICJpbXBvcnQgeyBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTdHlsdXNDb250cm9sc1BsdWdpbiBmcm9tIFwiLi4vbWFpblwiO1xuaW1wb3J0IHtcbiAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUyxcbiAgcGFyc2VOdW1lcmljU2V0dGluZyxcbiAgdHlwZSBOdW1lcmljU2V0dGluZ0tleSxcbiAgdHlwZSBTdHlsdXNBY3Rpb24sXG59IGZyb20gXCIuL3NldHRpbmdzXCI7XG5cbmNvbnN0IGFjdGlvbnM6IFJlY29yZDxTdHlsdXNBY3Rpb24sIHN0cmluZz4gPSB7XG4gIG1lbnU6IFwiT3BlbiBtZW51XCIsXG4gIGNvcHk6IFwiQ29weVwiLFxuICBwYXN0ZTogXCJQYXN0ZVwiLFxuICBub25lOiBcIkRvIG5vdGhpbmdcIixcbn07XG5cbmV4cG9ydCBjbGFzcyBTZXR0aW5nc1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogU3R5bHVzQ29udHJvbHNQbHVnaW4pIHtcbiAgICBzdXBlcihwbHVnaW4uYXBwLCBwbHVnaW4pO1xuICB9XG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlJlcXVpcmVzIHRoZSBFeGNhbGlkcmF3IGNvbW11bml0eSBwbHVnaW4uIENvcHkgYW5kIHBhc3RlIGF3YWl0IGEgY29tcGF0aWJsZSBFeGNhbGlkcmF3IGludGVncmF0aW9uIGFuZCBhcmUgY3VycmVudGx5IHVuYXZhaWxhYmxlLlwiLFxuICAgIH0pO1xuICAgIHRoaXMuYWN0aW9uKFwiVGFwXCIsIFwiYnV0dG9uVGFwQWN0aW9uXCIpO1xuICAgIHRoaXMuYWN0aW9uKFwiRG91YmxlIHRhcFwiLCBcImJ1dHRvbkRvdWJsZVRhcEFjdGlvblwiKTtcbiAgICB0aGlzLmFjdGlvbihcIkhvbGRcIiwgXCJidXR0b25Ib2xkQWN0aW9uXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJCdXR0b24gKyBwZW4gY29udGFjdFwiKVxuICAgICAgLnNldERlc2MoXCJUZW1wb3JhcnkgdG9vbCB3aGlsZSB0aGUgc2lkZSBidXR0b24gaXMgaGVsZCBkdXJpbmcgcGVuIGNvbnRhY3QuXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PlxuICAgICAgICBkcm9wZG93blxuICAgICAgICAgIC5hZGRPcHRpb24oXCJlcmFzZXJcIiwgXCJUZW1wb3JhcnkgZXJhc2VyXCIpXG4gICAgICAgICAgLmFkZE9wdGlvbihcIm5vbmVcIiwgXCJEbyBub3RoaW5nXCIpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmJ1dHRvbkNvbnRhY3RBY3Rpb24pXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT5cbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHtcbiAgICAgICAgICAgICAgYnV0dG9uQ29udGFjdEFjdGlvbjogdmFsdWUgYXMgXCJlcmFzZXJcIiB8IFwibm9uZVwiLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICApXG4gICAgICApO1xuICAgIHRoaXMubnVtYmVyKFwiRG91YmxlLXRhcCBpbnRlcnZhbCAobXMpXCIsIFwiZG91YmxlVGFwTXNcIik7XG4gICAgdGhpcy5udW1iZXIoXCJMb25nLXByZXNzIGRlbGF5IChtcylcIiwgXCJsb25nUHJlc3NNc1wiKTtcbiAgICB0aGlzLm51bWJlcihcIk1vdmVtZW50IHRocmVzaG9sZCAocHgpXCIsIFwibW92ZW1lbnRUaHJlc2hvbGRQeFwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQmFycmVsIGJ1dHRvbiBzaWduYWxcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIlRoZSBzdGFuZGFyZCBwZW4gYmFycmVsIHNpZ25hbCBpcyBidXR0b25zOiAyLiBJZiB0aGUgZGVidWcgb3ZlcmxheSBzaG93cyBhIGRpZmZlcmVudCBiaXQgd2hpbGUgdGhlIHNpZGUgYnV0dG9uIGlzIGhlbGQsIHNlbGVjdCB0aGF0IGJpdC5cIlxuICAgICAgKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT5cbiAgICAgICAgZHJvcGRvd25cbiAgICAgICAgICAuYWRkT3B0aW9uKFwiMlwiLCBcIlN0YW5kYXJkIGJhcnJlbCAoYnV0dG9uczogMilcIilcbiAgICAgICAgICAuYWRkT3B0aW9uKFwiMVwiLCBcIlByaW1hcnkvdGlwIGJpdCAoYnV0dG9uczogMSlcIilcbiAgICAgICAgICAuYWRkT3B0aW9uKFwiMzJcIiwgXCJFcmFzZXIgYml0IChidXR0b25zOiAzMilcIilcbiAgICAgICAgICAuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLmJhcnJlbEJ1dHRvbk1hc2spKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IGJhcnJlbEJ1dHRvbk1hc2s6IE51bWJlcih2YWx1ZSkgYXMgMSB8IDIgfCAzMiB9KVxuICAgICAgICAgIClcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlYnVnIGxvZ2dpbmdcIilcbiAgICAgIC5zZXREZXNjKFwiTG9ncyBib3VuZGVkIHJhdyBwZW4gZXZlbnQgdHJhY2VzIHRvIHRoZSBkZXZlbG9wZXIgY29uc29sZS5cIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cbiAgICAgICAgdG9nZ2xlXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlYnVnTW9kZSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IGRlYnVnTW9kZTogdmFsdWUgfSkpXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWJ1ZyBvdmVybGF5XCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJTaG93cyB0aGUgbGF0ZXN0IHBlbiBldmVudCBhbmQgc3R5bHVzIHN0YXRlIGluIHRoZSBFeGNhbGlkcmF3IHZpZXcuIFJlcXVpcmVzIGRlYnVnIGxvZ2dpbmcuXCJcbiAgICAgIClcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cbiAgICAgICAgdG9nZ2xlXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlYnVnT3ZlcmxheSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IGRlYnVnT3ZlcmxheTogdmFsdWUgfSkpXG4gICAgICApO1xuICB9XG4gIHByaXZhdGUgYWN0aW9uKFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBrZXk6IFwiYnV0dG9uVGFwQWN0aW9uXCIgfCBcImJ1dHRvbkRvdWJsZVRhcEFjdGlvblwiIHwgXCJidXR0b25Ib2xkQWN0aW9uXCJcbiAgKTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbCkuc2V0TmFtZShgUyBQZW4gc2lkZSBidXR0b246ICR7bmFtZX1gKS5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgIGZvciAoY29uc3QgW3ZhbHVlLCBsYWJlbF0gb2YgT2JqZWN0LmVudHJpZXMoYWN0aW9ucykpIGRyb3Bkb3duLmFkZE9wdGlvbih2YWx1ZSwgbGFiZWwpO1xuICAgICAgZHJvcGRvd25cbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzW2tleV0pXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgW2tleV06IHZhbHVlIGFzIFN0eWx1c0FjdGlvbiB9KSk7XG4gICAgfSk7XG4gIH1cbiAgcHJpdmF0ZSBudW1iZXIobmFtZTogc3RyaW5nLCBrZXk6IE51bWVyaWNTZXR0aW5nS2V5KTogdm9pZCB7XG4gICAgY29uc3QgeyBtaW4sIG1heCB9ID0gTlVNRVJJQ19TRVRUSU5HX0xJTUlUU1trZXldO1xuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShuYW1lKVxuICAgICAgLnNldERlc2MoYFdob2xlIG1pbGxpc2Vjb25kcy9waXhlbHMgZnJvbSAke21pbn0gdG8gJHttYXh9LmApXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgICAgdGV4dC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3Nba2V5XSkpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlTnVtZXJpY1NldHRpbmcoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgdGV4dC5pbnB1dEVsLnNldEN1c3RvbVZhbGlkaXR5KFxuICAgICAgICAgICAgcGFyc2VkID09PSBudWxsID8gYEVudGVyIGEgd2hvbGUgbnVtYmVyIGZyb20gJHttaW59IHRvICR7bWF4fS5gIDogXCJcIlxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKHBhcnNlZCA9PT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgW2tleV06IHBhcnNlZCB9KTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gIH1cbn1cbiIsICJleHBvcnQgdHlwZSBTdHlsdXNBY3Rpb24gPSBcIm1lbnVcIiB8IFwiY29weVwiIHwgXCJwYXN0ZVwiIHwgXCJub25lXCI7XG5leHBvcnQgdHlwZSBCYXJyZWxCdXR0b25NYXNrID0gMSB8IDIgfCAzMjtcblxuZXhwb3J0IGludGVyZmFjZSBTdHlsdXNDb250cm9sc1NldHRpbmdzIHtcbiAgYnV0dG9uVGFwQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gIGJ1dHRvbkRvdWJsZVRhcEFjdGlvbjogU3R5bHVzQWN0aW9uO1xuICBidXR0b25Ib2xkQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gIGJ1dHRvbkNvbnRhY3RBY3Rpb246IFwiZXJhc2VyXCIgfCBcIm5vbmVcIjtcbiAgZG91YmxlVGFwTXM6IG51bWJlcjtcbiAgbG9uZ1ByZXNzTXM6IG51bWJlcjtcbiAgbW92ZW1lbnRUaHJlc2hvbGRQeDogbnVtYmVyO1xuICAvKiogUG9pbnRlckV2ZW50LmJ1dHRvbnMgYml0IHVzZWQgYnkgdGhlIGRldmljZSBmb3IgdGhlIGJhcnJlbCBidXR0b24uICovXG4gIGJhcnJlbEJ1dHRvbk1hc2s6IEJhcnJlbEJ1dHRvbk1hc2s7XG4gIGRlYnVnTW9kZTogYm9vbGVhbjtcbiAgZGVidWdPdmVybGF5OiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogU3R5bHVzQ29udHJvbHNTZXR0aW5ncyA9IHtcbiAgYnV0dG9uVGFwQWN0aW9uOiBcIm1lbnVcIixcbiAgYnV0dG9uRG91YmxlVGFwQWN0aW9uOiBcImNvcHlcIixcbiAgYnV0dG9uSG9sZEFjdGlvbjogXCJwYXN0ZVwiLFxuICBidXR0b25Db250YWN0QWN0aW9uOiBcImVyYXNlclwiLFxuICBkb3VibGVUYXBNczogMzAwLFxuICBsb25nUHJlc3NNczogNDUwLFxuICBtb3ZlbWVudFRocmVzaG9sZFB4OiA4LFxuICAvLyBQb2ludGVyIEV2ZW50cyBzcGVjaWZpZXMgYml0IDIgZm9yIGEgcGVuIGJhcnJlbCBidXR0b24uIEJpdCAxIGlzIHRoZSB0aXAuXG4gIGJhcnJlbEJ1dHRvbk1hc2s6IDIsXG4gIGRlYnVnTW9kZTogZmFsc2UsXG4gIGRlYnVnT3ZlcmxheTogZmFsc2UsXG59O1xuXG5leHBvcnQgY29uc3QgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUyA9IHtcbiAgZG91YmxlVGFwTXM6IHsgbWluOiAxMDAsIG1heDogMTAwMCB9LFxuICBsb25nUHJlc3NNczogeyBtaW46IDE1MCwgbWF4OiAyMDAwIH0sXG4gIG1vdmVtZW50VGhyZXNob2xkUHg6IHsgbWluOiAxLCBtYXg6IDEwMCB9LFxufSBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgTnVtZXJpY1NldHRpbmdLZXkgPSBrZXlvZiB0eXBlb2YgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUztcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTnVtZXJpY1NldHRpbmcoa2V5OiBOdW1lcmljU2V0dGluZ0tleSwgdmFsdWU6IHN0cmluZyk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCBwYXJzZWQgPSBOdW1iZXIodmFsdWUpO1xuICBjb25zdCB7IG1pbiwgbWF4IH0gPSBOVU1FUklDX1NFVFRJTkdfTElNSVRTW2tleV07XG4gIHJldHVybiBOdW1iZXIuaXNJbnRlZ2VyKHBhcnNlZCkgJiYgcGFyc2VkID49IG1pbiAmJiBwYXJzZWQgPD0gbWF4ID8gcGFyc2VkIDogbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVNldHRpbmdzKHZhbHVlOiBQYXJ0aWFsPFN0eWx1c0NvbnRyb2xzU2V0dGluZ3M+KTogU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB7XG4gIGNvbnN0IGFjdGlvbiA9IChjYW5kaWRhdGU6IHVua25vd24sIGZhbGxiYWNrOiBTdHlsdXNBY3Rpb24pOiBTdHlsdXNBY3Rpb24gPT5cbiAgICBjYW5kaWRhdGUgPT09IFwibWVudVwiIHx8IGNhbmRpZGF0ZSA9PT0gXCJjb3B5XCIgfHwgY2FuZGlkYXRlID09PSBcInBhc3RlXCIgfHwgY2FuZGlkYXRlID09PSBcIm5vbmVcIlxuICAgICAgPyBjYW5kaWRhdGVcbiAgICAgIDogZmFsbGJhY2s7XG4gIGNvbnN0IG51bWJlciA9IChjYW5kaWRhdGU6IHVua25vd24sIGZhbGxiYWNrOiBudW1iZXIsIG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcik6IG51bWJlciA9PlxuICAgIHR5cGVvZiBjYW5kaWRhdGUgPT09IFwibnVtYmVyXCIgJiYgTnVtYmVyLmlzRmluaXRlKGNhbmRpZGF0ZSlcbiAgICAgID8gTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIE1hdGgucm91bmQoY2FuZGlkYXRlKSkpXG4gICAgICA6IGZhbGxiYWNrO1xuICByZXR1cm4ge1xuICAgIGJ1dHRvblRhcEFjdGlvbjogYWN0aW9uKHZhbHVlLmJ1dHRvblRhcEFjdGlvbiwgREVGQVVMVF9TRVRUSU5HUy5idXR0b25UYXBBY3Rpb24pLFxuICAgIGJ1dHRvbkRvdWJsZVRhcEFjdGlvbjogYWN0aW9uKFxuICAgICAgdmFsdWUuYnV0dG9uRG91YmxlVGFwQWN0aW9uLFxuICAgICAgREVGQVVMVF9TRVRUSU5HUy5idXR0b25Eb3VibGVUYXBBY3Rpb25cbiAgICApLFxuICAgIGJ1dHRvbkhvbGRBY3Rpb246IGFjdGlvbih2YWx1ZS5idXR0b25Ib2xkQWN0aW9uLCBERUZBVUxUX1NFVFRJTkdTLmJ1dHRvbkhvbGRBY3Rpb24pLFxuICAgIGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlLmJ1dHRvbkNvbnRhY3RBY3Rpb24gPT09IFwibm9uZVwiID8gXCJub25lXCIgOiBcImVyYXNlclwiLFxuICAgIGRvdWJsZVRhcE1zOiBudW1iZXIoXG4gICAgICB2YWx1ZS5kb3VibGVUYXBNcyxcbiAgICAgIDMwMCxcbiAgICAgIE5VTUVSSUNfU0VUVElOR19MSU1JVFMuZG91YmxlVGFwTXMubWluLFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5kb3VibGVUYXBNcy5tYXhcbiAgICApLFxuICAgIGxvbmdQcmVzc01zOiBudW1iZXIoXG4gICAgICB2YWx1ZS5sb25nUHJlc3NNcyxcbiAgICAgIDQ1MCxcbiAgICAgIE5VTUVSSUNfU0VUVElOR19MSU1JVFMubG9uZ1ByZXNzTXMubWluLFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5sb25nUHJlc3NNcy5tYXhcbiAgICApLFxuICAgIG1vdmVtZW50VGhyZXNob2xkUHg6IG51bWJlcihcbiAgICAgIHZhbHVlLm1vdmVtZW50VGhyZXNob2xkUHgsXG4gICAgICA4LFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5tb3ZlbWVudFRocmVzaG9sZFB4Lm1pbixcbiAgICAgIE5VTUVSSUNfU0VUVElOR19MSU1JVFMubW92ZW1lbnRUaHJlc2hvbGRQeC5tYXhcbiAgICApLFxuICAgIGJhcnJlbEJ1dHRvbk1hc2s6XG4gICAgICB2YWx1ZS5iYXJyZWxCdXR0b25NYXNrID09PSAxIHx8IHZhbHVlLmJhcnJlbEJ1dHRvbk1hc2sgPT09IDMyXG4gICAgICAgID8gdmFsdWUuYmFycmVsQnV0dG9uTWFza1xuICAgICAgICA6IERFRkFVTFRfU0VUVElOR1MuYmFycmVsQnV0dG9uTWFzayxcbiAgICBkZWJ1Z01vZGU6IHZhbHVlLmRlYnVnTW9kZSA9PT0gdHJ1ZSxcbiAgICBkZWJ1Z092ZXJsYXk6IHZhbHVlLmRlYnVnT3ZlcmxheSA9PT0gdHJ1ZSxcbiAgfTtcbn1cbiIsICJpbXBvcnQgeyBOb3RpY2UsIHR5cGUgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgeyBQb2ludCB9IGZyb20gXCIuLi9zdHlsdXMvdHlwZXNcIjtcbmltcG9ydCB7XG4gIGdldExlYWZBcGksXG4gIHJlYWRBY3RpdmVUb29sLFxuICB0eXBlIEFjdGl2ZVRvb2xTbmFwc2hvdCxcbiAgdHlwZSBCcmlkZ2VPcGVyYXRpb25SZXN1bHQsXG4gIHR5cGUgQnJpZGdlUmVzdWx0LFxuICB0eXBlIENvbXBhdGlibGVJbXBlcmF0aXZlQXBpLFxufSBmcm9tIFwiLi9jb21wYXRpYmlsaXR5XCI7XG5cbmV4cG9ydCB0eXBlIHtcbiAgQWN0aXZlVG9vbFNuYXBzaG90LFxuICBCcmlkZ2VGYWlsdXJlQ29kZSxcbiAgQnJpZGdlT3BlcmF0aW9uUmVzdWx0LFxuICBCcmlkZ2VSZXN1bHQsXG59IGZyb20gXCIuL2NvbXBhdGliaWxpdHlcIjtcblxuLyoqIENvbXBhdGliaWxpdHkgYm91bmRhcnkgZm9yIHRoZSBvcHRpb25hbCBFeGNhbGlkcmF3IHBsdWdpbi4gKi9cbmV4cG9ydCBjbGFzcyBFeGNhbGlkcmF3QnJpZGdlIHtcbiAgcHJpdmF0ZSB3YXJuZWQgPSBmYWxzZTtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBsZWFmOiBXb3Jrc3BhY2VMZWFmKSB7fVxuXG4gIHN0YXJ0VGVtcG9yYXJ5RXJhc2VyKCk6IEJyaWRnZVJlc3VsdDxBY3RpdmVUb29sU25hcHNob3Q+IHtcbiAgICBjb25zdCBhcGlSZXN1bHQgPSB0aGlzLmdldEFwaSgpO1xuICAgIGlmICghYXBpUmVzdWx0Lm9rKSByZXR1cm4gdGhpcy5yZXBvcnQoYXBpUmVzdWx0KTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdG9vbCA9IHJlYWRBY3RpdmVUb29sKGFwaVJlc3VsdC52YWx1ZSk7XG4gICAgICBpZiAoIXRvb2wpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmFpbHVyZShcbiAgICAgICAgICBcImluY29tcGF0aWJsZVwiLFxuICAgICAgICAgIFwiVGVtcG9yYXJ5IGVyYXNlciBjb3VsZCBub3QgcmVhZCB0aGUgY3VycmVudCBhY3RpdmUgdG9vbC5cIlxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgYXBpUmVzdWx0LnZhbHVlLnNldEFjdGl2ZVRvb2woeyB0eXBlOiBcImVyYXNlclwiIH0pO1xuICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiB0b29sIH07XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwiZmFpbGVkXCIsIFwiVGVtcG9yYXJ5IGVyYXNlciBpcyB1bmF2YWlsYWJsZSBpbiB0aGlzIEV4Y2FsaWRyYXcgdmlldy5cIik7XG4gICAgfVxuICB9XG4gIHJlc3RvcmVUb29sKHRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCk6IEJyaWRnZU9wZXJhdGlvblJlc3VsdCB7XG4gICAgY29uc3QgYXBpUmVzdWx0ID0gdGhpcy5nZXRBcGkoKTtcbiAgICBpZiAoIWFwaVJlc3VsdC5vaykgcmV0dXJuIHRoaXMucmVwb3J0KGFwaVJlc3VsdCk7XG4gICAgdHJ5IHtcbiAgICAgIGFwaVJlc3VsdC52YWx1ZS5zZXRBY3RpdmVUb29sKHRvb2wpO1xuICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiB1bmRlZmluZWQgfTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXG4gICAgICAgIFwiZmFpbGVkXCIsXG4gICAgICAgIFwiVGhlIHByZXZpb3VzIHRvb2wgY291bGQgbm90IGJlIHJlc3RvcmVkIGluIHRoaXMgRXhjYWxpZHJhdyB2aWV3LlwiXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBzZXRUb29sKHR5cGU6IHN0cmluZyk6IEJyaWRnZU9wZXJhdGlvblJlc3VsdCB7XG4gICAgY29uc3QgYXBpUmVzdWx0ID0gdGhpcy5nZXRBcGkoKTtcbiAgICBpZiAoIWFwaVJlc3VsdC5vaykgcmV0dXJuIHRoaXMucmVwb3J0KGFwaVJlc3VsdCk7XG4gICAgdHJ5IHtcbiAgICAgIGFwaVJlc3VsdC52YWx1ZS5zZXRBY3RpdmVUb29sKHsgdHlwZSB9KTtcbiAgICAgIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogdW5kZWZpbmVkIH07XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwiZmFpbGVkXCIsIFwiVG9vbCBzd2l0Y2hpbmcgaXMgdW5hdmFpbGFibGUgaW4gdGhpcyBFeGNhbGlkcmF3IHZpZXcuXCIpO1xuICAgIH1cbiAgfVxuICBjb3B5U2VsZWN0ZWRFbGVtZW50cygpOiBCcmlkZ2VPcGVyYXRpb25SZXN1bHQge1xuICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXCJ1bmF2YWlsYWJsZVwiLCBcIkNvcHkgcmVxdWlyZXMgYSBjb21wYXRpYmxlIEV4Y2FsaWRyYXcgQVBJLlwiKTtcbiAgfVxuICBwYXN0ZUF0KHBvaW50OiBQb2ludCk6IEJyaWRnZU9wZXJhdGlvblJlc3VsdCB7XG4gICAgdm9pZCBwb2ludDtcbiAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwidW5hdmFpbGFibGVcIiwgXCJQYXN0ZSByZXF1aXJlcyBhIGNvbXBhdGlibGUgRXhjYWxpZHJhdyBBUEkuXCIpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRBcGkoKTogQnJpZGdlUmVzdWx0PENvbXBhdGlibGVJbXBlcmF0aXZlQXBpPiB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBnZXRMZWFmQXBpKHRoaXMubGVhZi52aWV3KTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgY29kZTogXCJmYWlsZWRcIixcbiAgICAgICAgbWVzc2FnZTogXCJFeGNhbGlkcmF3IEFQSSBsb29rdXAgZmFpbGVkIGZvciB0aGlzIGxlYWYuXCIsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVwb3J0PFQ+KHJlc3VsdDogRXhjbHVkZTxCcmlkZ2VSZXN1bHQ8VD4sIHsgb2s6IHRydWUgfT4pOiBCcmlkZ2VSZXN1bHQ8bmV2ZXI+IHtcbiAgICB0aGlzLnVuc3VwcG9ydGVkKHJlc3VsdC5tZXNzYWdlKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHByaXZhdGUgZmFpbHVyZShcbiAgICBjb2RlOiBcInVuYXZhaWxhYmxlXCIgfCBcImluY29tcGF0aWJsZVwiIHwgXCJmYWlsZWRcIixcbiAgICBtZXNzYWdlOiBzdHJpbmdcbiAgKTogQnJpZGdlUmVzdWx0PG5ldmVyPiB7XG4gICAgdGhpcy51bnN1cHBvcnRlZChtZXNzYWdlKTtcbiAgICByZXR1cm4geyBvazogZmFsc2UsIGNvZGUsIG1lc3NhZ2UgfTtcbiAgfVxuICBwcml2YXRlIHVuc3VwcG9ydGVkKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy53YXJuZWQpIHtcbiAgICAgIG5ldyBOb3RpY2UoYEV4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzOiAke21lc3NhZ2V9YCk7XG4gICAgICB0aGlzLndhcm5lZCA9IHRydWU7XG4gICAgfVxuICB9XG59XG4iLCAiZXhwb3J0IGludGVyZmFjZSBBY3RpdmVUb29sU25hcHNob3Qge1xuICB0eXBlOiBzdHJpbmc7XG4gIFtrZXk6IHN0cmluZ106IHVua25vd247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1wZXJhdGl2ZUFwaSB7XG4gIGdldEFwcFN0YXRlPzogKCkgPT4geyBhY3RpdmVUb29sPzogQWN0aXZlVG9vbFNuYXBzaG90IH07XG4gIHNldEFjdGl2ZVRvb2w/OiAodG9vbDogQWN0aXZlVG9vbFNuYXBzaG90KSA9PiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBhdGlibGVJbXBlcmF0aXZlQXBpIGV4dGVuZHMgSW1wZXJhdGl2ZUFwaSB7XG4gIGdldEFwcFN0YXRlOiAoKSA9PiB7IGFjdGl2ZVRvb2w/OiBBY3RpdmVUb29sU25hcHNob3QgfTtcbiAgc2V0QWN0aXZlVG9vbDogKHRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUgQnJpZGdlRmFpbHVyZUNvZGUgPSBcInVuYXZhaWxhYmxlXCIgfCBcImluY29tcGF0aWJsZVwiIHwgXCJmYWlsZWRcIjtcblxuZXhwb3J0IHR5cGUgQnJpZGdlUmVzdWx0PFQ+ID1cbiAgeyBvazogdHJ1ZTsgdmFsdWU6IFQgfSB8IHsgb2s6IGZhbHNlOyBjb2RlOiBCcmlkZ2VGYWlsdXJlQ29kZTsgbWVzc2FnZTogc3RyaW5nIH07XG5cbmV4cG9ydCB0eXBlIEJyaWRnZU9wZXJhdGlvblJlc3VsdCA9IEJyaWRnZVJlc3VsdDx2b2lkPjtcblxuZXhwb3J0IGludGVyZmFjZSBFeGNhbGlkcmF3TGVhZlN1cmZhY2Uge1xuICAvKipcbiAgICogVGhpcyBpcyBhIGNvbXBhdGliaWxpdHkgZmFsbGJhY2ssIG5vdCBhIGRvY3VtZW50ZWQgRXhjYWxpZHJhdyBwbHVnaW4gQVBJLlxuICAgKiBLZWVwIGFjY2VzcyB0byBpdCBoZXJlIHVudGlsIEV4Y2FsaWRyYXcgcHVibGlzaGVzIGEgdGhpcmQtcGFydHksIGxlYWYtc2NvcGVkXG4gICAqIGludGVncmF0aW9uIHBvaW50LlxuICAgKi9cbiAgZXhjYWxpZHJhd0FQST86IHVua25vd247XG59XG5cbi8qKiBUaGUgZG9jdW1lbnRlZCwgdmlldy10YXJnZXRlZCBwb3J0aW9uIG9mIEV4Y2FsaWRyYXdBdXRvbWF0ZSB1c2VkIGJ5IHRoaXMgcGx1Z2luLiAqL1xuZXhwb3J0IGludGVyZmFjZSBFeGNhbGlkcmF3QXV0b21hdGVTdXJmYWNlIHtcbiAgc2V0VmlldzogKHZpZXc6IHVua25vd24pID0+IHVua25vd247XG4gIGdldEV4Y2FsaWRyYXdBUEk6ICgpID0+IHVua25vd247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVG9vbENhcGFiaWxpdGllcyB7XG4gIGNhblJlYWRBY3RpdmVUb29sOiBib29sZWFuO1xuICBjYW5TZXRBY3RpdmVUb29sOiBib29sZWFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9vbENhcGFiaWxpdGllcyhhcGk6IEltcGVyYXRpdmVBcGkgfCBudWxsKTogVG9vbENhcGFiaWxpdGllcyB7XG4gIHJldHVybiB7XG4gICAgY2FuUmVhZEFjdGl2ZVRvb2w6IHR5cGVvZiBhcGk/LmdldEFwcFN0YXRlID09PSBcImZ1bmN0aW9uXCIsXG4gICAgY2FuU2V0QWN0aXZlVG9vbDogdHlwZW9mIGFwaT8uc2V0QWN0aXZlVG9vbCA9PT0gXCJmdW5jdGlvblwiLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFjdGl2ZVRvb2woYXBpOiBJbXBlcmF0aXZlQXBpKTogQWN0aXZlVG9vbFNuYXBzaG90IHwgbnVsbCB7XG4gIGNvbnN0IGFjdGl2ZVRvb2wgPSBhcGkuZ2V0QXBwU3RhdGU/LigpLmFjdGl2ZVRvb2w7XG4gIHJldHVybiBhY3RpdmVUb29sID8geyAuLi5hY3RpdmVUb29sIH0gOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TGVhZkFwaShcbiAgdmlldzogdW5rbm93bixcbiAgYXV0b21hdGUgPSBnZXRHbG9iYWxBdXRvbWF0ZSgpXG4pOiBCcmlkZ2VSZXN1bHQ8Q29tcGF0aWJsZUltcGVyYXRpdmVBcGk+IHtcbiAgaWYgKCF2aWV3IHx8IHR5cGVvZiB2aWV3ICE9PSBcIm9iamVjdFwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiBmYWxzZSxcbiAgICAgIGNvZGU6IFwidW5hdmFpbGFibGVcIixcbiAgICAgIG1lc3NhZ2U6IFwiVGhpcyBsZWFmIGRvZXMgbm90IGV4cG9zZSBhbiBFeGNhbGlkcmF3IHZpZXcuXCIsXG4gICAgfTtcbiAgfVxuICBpZiAoYXV0b21hdGUpIHtcbiAgICB0cnkge1xuICAgICAgLy8gRXhjYWxpZHJhd0F1dG9tYXRlIGRvY3VtZW50cyBzZXRWaWV3KHZpZXcpIHNwZWNpZmljYWxseSBzbyBvcGVyYXRpb25zXG4gICAgICAvLyBhcmUgc2NvcGVkIHRvIHRoYXQgdmlldy4gTmV2ZXIgcGFzcyBcImFjdGl2ZVwiIGhlcmUuXG4gICAgICBhdXRvbWF0ZS5zZXRWaWV3KHZpZXcpO1xuICAgICAgcmV0dXJuIHZhbGlkYXRlSW1wZXJhdGl2ZUFwaShhdXRvbWF0ZS5nZXRFeGNhbGlkcmF3QVBJKCkpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb2s6IGZhbHNlLFxuICAgICAgICBjb2RlOiBcImZhaWxlZFwiLFxuICAgICAgICBtZXNzYWdlOiBcIkV4Y2FsaWRyYXcgY291bGQgbm90IHRhcmdldCB0aGlzIGxlYWYncyBjYW52YXMuXCIsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8vIFRoaXMgZmFsbGJhY2sgaXMgZGVsaWJlcmF0ZWx5IGlzb2xhdGVkOiBpdCBpcyBub3QgcGFydCBvZiBFeGNhbGlkcmF3J3NcbiAgLy8gZG9jdW1lbnRlZCB0aGlyZC1wYXJ0eSBBUEkgc3VyZmFjZS5cbiAgY29uc3QgYXBpID0gKHZpZXcgYXMgRXhjYWxpZHJhd0xlYWZTdXJmYWNlKS5leGNhbGlkcmF3QVBJO1xuICByZXR1cm4gdmFsaWRhdGVJbXBlcmF0aXZlQXBpKGFwaSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWxBdXRvbWF0ZSgpOiBFeGNhbGlkcmF3QXV0b21hdGVTdXJmYWNlIHwgbnVsbCB7XG4gIGNvbnN0IGNhbmRpZGF0ZSA9IChnbG9iYWxUaGlzIGFzIHsgRXhjYWxpZHJhd0F1dG9tYXRlPzogdW5rbm93biB9KS5FeGNhbGlkcmF3QXV0b21hdGU7XG4gIGlmIChcbiAgICBjYW5kaWRhdGUgJiZcbiAgICB0eXBlb2YgY2FuZGlkYXRlID09PSBcIm9iamVjdFwiICYmXG4gICAgdHlwZW9mIChjYW5kaWRhdGUgYXMgRXhjYWxpZHJhd0F1dG9tYXRlU3VyZmFjZSkuc2V0VmlldyA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgdHlwZW9mIChjYW5kaWRhdGUgYXMgRXhjYWxpZHJhd0F1dG9tYXRlU3VyZmFjZSkuZ2V0RXhjYWxpZHJhd0FQSSA9PT0gXCJmdW5jdGlvblwiXG4gICkge1xuICAgIHJldHVybiBjYW5kaWRhdGUgYXMgRXhjYWxpZHJhd0F1dG9tYXRlU3VyZmFjZTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVJbXBlcmF0aXZlQXBpKGFwaTogdW5rbm93bik6IEJyaWRnZVJlc3VsdDxDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaT4ge1xuICBpZiAoIWFwaSB8fCB0eXBlb2YgYXBpICE9PSBcIm9iamVjdFwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiBmYWxzZSxcbiAgICAgIGNvZGU6IFwidW5hdmFpbGFibGVcIixcbiAgICAgIG1lc3NhZ2U6IFwiRXhjYWxpZHJhdyBoYXMgbm90IG1hZGUgYW4gQVBJIGF2YWlsYWJsZSBmb3IgdGhpcyBsZWFmLlwiLFxuICAgIH07XG4gIH1cbiAgY29uc3QgY2FwYWJpbGl0aWVzID0gdG9vbENhcGFiaWxpdGllcyhhcGkgYXMgSW1wZXJhdGl2ZUFwaSk7XG4gIGlmICghY2FwYWJpbGl0aWVzLmNhblJlYWRBY3RpdmVUb29sIHx8ICFjYXBhYmlsaXRpZXMuY2FuU2V0QWN0aXZlVG9vbCkge1xuICAgIHJldHVybiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBjb2RlOiBcImluY29tcGF0aWJsZVwiLFxuICAgICAgbWVzc2FnZTogXCJUaGlzIEV4Y2FsaWRyYXcgQVBJIGRvZXMgbm90IHN1cHBvcnQgYWN0aXZlLXRvb2wgcmVhZCBhbmQgd3JpdGUgb3BlcmF0aW9ucy5cIixcbiAgICB9O1xuICB9XG4gIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogYXBpIGFzIENvbXBhdGlibGVJbXBlcmF0aXZlQXBpIH07XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBEZWJ1Z0xvZ2dlciB7XG4gIHByaXZhdGUgdHJhY2U6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudFtdID0gW107XG4gIHByaXZhdGUgbGFzdE1vdmVMb2dBdCA9IC1JbmZpbml0eTtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBlbmFibGVkOiAoKSA9PiBib29sZWFuKSB7fVxuXG4gIGV2ZW50KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCgpKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwibW92ZVwiICYmIGV2ZW50LnRpbWVzdGFtcCAtIHRoaXMubGFzdE1vdmVMb2dBdCA8IDEwMCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5raW5kID09PSBcIm1vdmVcIikgdGhpcy5sYXN0TW92ZUxvZ0F0ID0gZXZlbnQudGltZXN0YW1wO1xuICAgIHRoaXMudHJhY2UucHVzaChldmVudCk7XG4gICAgaWYgKHRoaXMudHJhY2UubGVuZ3RoID4gMTAwKSB0aGlzLnRyYWNlLnNoaWZ0KCk7XG4gICAgY29uc29sZS5kZWJ1ZyhcIltFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9sc11cIiwgZXZlbnQpO1xuICB9XG4gIG1lc3NhZ2UobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZW5hYmxlZCgpKSBjb25zb2xlLmRlYnVnKFwiW0V4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzXVwiLCBtZXNzYWdlKTtcbiAgfVxuICBleHBvcnRUcmFjZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLnRyYWNlLCBudWxsLCAyKTtcbiAgfVxuICBjbGVhcigpOiB2b2lkIHtcbiAgICB0aGlzLnRyYWNlID0gW107XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IEdlc3R1cmVFZmZlY3QsIEdlc3R1cmVTdGF0ZVNuYXBzaG90LCBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbi8qKiBBIGRpYWdub3N0aWMtb25seSwgbm9uLWludGVyYWN0aXZlIG92ZXJsYXkgbG9jYWwgdG8gb25lIEV4Y2FsaWRyYXcgdmlldy4gKi9cbmV4cG9ydCBjbGFzcyBEZWJ1Z092ZXJsYXkge1xuICBwcml2YXRlIGVsZW1lbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXI6IEhUTUxFbGVtZW50LFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZW5hYmxlZDogKCkgPT4gYm9vbGVhblxuICApIHt9XG5cbiAgdXBkYXRlKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQsIHN0YXRlOiBHZXN0dXJlU3RhdGVTbmFwc2hvdCwgZWZmZWN0PzogR2VzdHVyZUVmZmVjdCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5lbmFibGVkKCkpIHtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgb3ZlcmxheSA9IHRoaXMuZW5zdXJlRWxlbWVudCgpO1xuICAgIGNvbnN0IHN0YXRlU3VtbWFyeSA9IFtcbiAgICAgIGBob3Zlcjoke1N0cmluZyghc3RhdGUucGVuQ29udGFjdCl9YCxcbiAgICAgIGBiYXJyZWw6JHtTdHJpbmcoc3RhdGUuYmFycmVsQnV0dG9uSGVsZCl9YCxcbiAgICAgIGBjb25zdW1lZDoke1N0cmluZyhzdGF0ZS5nZXN0dXJlQ29uc3VtZWQpfWAsXG4gICAgICBgdGVtcDoke1N0cmluZyhzdGF0ZS50ZW1wb3JhcnlUb29sQWN0aXZlKX1gLFxuICAgIF0uam9pbihcIiBcdTAwQjcgXCIpO1xuICAgIG92ZXJsYXkuc2V0VGV4dChcbiAgICAgIFtcbiAgICAgICAgYFMgUGVuICR7ZXZlbnQua2luZH0gaWQ6JHtldmVudC5wb2ludGVySWR9IGJ1dHRvbjoke2V2ZW50LmJ1dHRvbn0gYnV0dG9uczoke2V2ZW50LmJ1dHRvbnN9IHByZXNzdXJlOiR7ZXZlbnQucHJlc3N1cmUudG9GaXhlZCgyKX1gLFxuICAgICAgICBgdGlsdDoke2V2ZW50LnRpbHRYfSwke2V2ZW50LnRpbHRZfSB0d2lzdDoke2V2ZW50LnR3aXN0fSB0YW5nZW50aWFsOiR7ZXZlbnQudGFuZ2VudGlhbFByZXNzdXJlLnRvRml4ZWQoMil9IHNpemU6JHtldmVudC53aWR0aH14JHtldmVudC5oZWlnaHR9YCxcbiAgICAgICAgc3RhdGVTdW1tYXJ5LFxuICAgICAgICBgZWZmZWN0OiR7ZWZmZWN0Py50eXBlID8/IFwibm9uZVwifWAsXG4gICAgICBdLmpvaW4oXCJcXG5cIilcbiAgICApO1xuICB9XG5cbiAgY2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5lbGVtZW50Py5yZW1vdmUoKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVFbGVtZW50KCk6IEhUTUxFbGVtZW50IHtcbiAgICBpZiAodGhpcy5lbGVtZW50KSByZXR1cm4gdGhpcy5lbGVtZW50O1xuICAgIHRoaXMuZWxlbWVudCA9IHRoaXMuY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJleGNhbGlkcmF3LXN0eWx1cy1kZWJ1Zy1vdmVybGF5XCIgfSk7XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudDtcbiAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgTm9ybWFsaXplZFN0eWx1c0V2ZW50LCBTdHlsdXNFdmVudEtpbmQgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5jb25zdCBldmVudEtpbmRzOiBSZWNvcmQ8c3RyaW5nLCBTdHlsdXNFdmVudEtpbmQ+ID0ge1xuICBwb2ludGVyZG93bjogXCJkb3duXCIsXG4gIHBvaW50ZXJtb3ZlOiBcIm1vdmVcIixcbiAgcG9pbnRlcnVwOiBcInVwXCIsXG4gIHBvaW50ZXJjYW5jZWw6IFwiY2FuY2VsXCIsXG4gIGNvbnRleHRtZW51OiBcImNvbnRleHRtZW51XCIsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplUG9pbnRlckV2ZW50KFxuICBldmVudDogUG9pbnRlckV2ZW50LFxuICBpc0NhbnZhc1RhcmdldDogYm9vbGVhblxuKTogTm9ybWFsaXplZFN0eWx1c0V2ZW50IHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBldmVudEtpbmRzW2V2ZW50LnR5cGVdID8/IFwibW92ZVwiLFxuICAgIHBvaW50ZXJUeXBlOiBldmVudC5wb2ludGVyVHlwZSxcbiAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICBidXR0b25zOiBldmVudC5idXR0b25zLFxuICAgIGJ1dHRvbjogZXZlbnQuYnV0dG9uLFxuICAgIHByZXNzdXJlOiBldmVudC5wcmVzc3VyZSxcbiAgICB0YW5nZW50aWFsUHJlc3N1cmU6IGV2ZW50LnRhbmdlbnRpYWxQcmVzc3VyZSxcbiAgICB0aWx0WDogZXZlbnQudGlsdFgsXG4gICAgdGlsdFk6IGV2ZW50LnRpbHRZLFxuICAgIHR3aXN0OiBldmVudC50d2lzdCxcbiAgICB3aWR0aDogZXZlbnQud2lkdGgsXG4gICAgaGVpZ2h0OiBldmVudC5oZWlnaHQsXG4gICAgeDogZXZlbnQuY2xpZW50WCxcbiAgICB5OiBldmVudC5jbGllbnRZLFxuICAgIHRpbWVzdGFtcDogZXZlbnQudGltZVN0YW1wLFxuICAgIGlzQ2FudmFzVGFyZ2V0LFxuICB9O1xufVxuIiwgImltcG9ydCB0eXBlIHtcbiAgR2VzdHVyZUVmZmVjdCxcbiAgR2VzdHVyZVNldHRpbmdzLFxuICBHZXN0dXJlU3RhdGVTbmFwc2hvdCxcbiAgTm9ybWFsaXplZFN0eWx1c0V2ZW50LFxuICBQb2ludCxcbiAgU2NoZWR1bGVyLFxufSBmcm9tIFwiLi90eXBlc1wiO1xuXG5pbnRlcmZhY2UgUGVuZGluZ1RhcCB7XG4gIHBvaW50OiBQb2ludDtcbiAgdGltZXI6IHVua25vd247XG59XG5cbi8qKiBQdXJlIHBlci12aWV3IFMgUGVuIGdlc3R1cmUgcG9saWN5LiBJdCBuZXZlciB0b3VjaGVzIHRoZSBET00gb3IgRXhjYWxpZHJhdy4gKi9cbmV4cG9ydCBjbGFzcyBTdHlsdXNHZXN0dXJlTWFjaGluZSB7XG4gIHByaXZhdGUgYmFycmVsQnV0dG9uSGVsZCA9IGZhbHNlO1xuICBwcml2YXRlIHBlbkNvbnRhY3QgPSBmYWxzZTtcbiAgcHJpdmF0ZSBjb25zdW1lZCA9IGZhbHNlO1xuICBwcml2YXRlIG1vdmVkID0gZmFsc2U7XG4gIHByaXZhdGUgaG9sZEZpcmVkID0gZmFsc2U7XG4gIHByaXZhdGUgdGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICBwcml2YXRlIHByZXNzT3JpZ2luOiBQb2ludCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGhvbGRUaW1lcjogdW5rbm93biB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdUYXA6IFBlbmRpbmdUYXAgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBhY3RpdmVQb2ludGVySWQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2V0dGluZ3M6IEdlc3R1cmVTZXR0aW5ncyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNjaGVkdWxlcjogU2NoZWR1bGVyXG4gICkge31cblxuICBoYW5kbGUoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IEdlc3R1cmVFZmZlY3RbXSB7XG4gICAgaWYgKGV2ZW50LnBvaW50ZXJUeXBlICE9PSBcInBlblwiKSByZXR1cm4gW107XG4gICAgY29uc3QgZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdID0gW107XG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwiY29udGV4dG1lbnVcIikge1xuICAgICAgaWYgKHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSB8fCAodGhpcy5iYXJyZWxCdXR0b25IZWxkICYmIHRoaXMucGVuQ29udGFjdCkpXG4gICAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwic3VwcHJlc3MtY29udGV4dC1tZW51XCIgfSk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJkb3duXCIpIHtcbiAgICAgIHRoaXMucGVuQ29udGFjdCA9IHRydWU7XG4gICAgICB0aGlzLmFjdGl2ZVBvaW50ZXJJZCA9IGV2ZW50LnBvaW50ZXJJZDtcbiAgICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQpIHRoaXMuY29uc3VtZUZvckNvbnRhY3QoZXZlbnQsIGVmZmVjdHMpO1xuICAgICAgcmV0dXJuIGVmZmVjdHM7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwidXBcIiB8fCBldmVudC5raW5kID09PSBcImNhbmNlbFwiKSB7XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVySWQgIT09IG51bGwgJiYgZXZlbnQucG9pbnRlcklkICE9PSB0aGlzLmFjdGl2ZVBvaW50ZXJJZCkgcmV0dXJuIGVmZmVjdHM7XG4gICAgICB0aGlzLnBlbkNvbnRhY3QgPSBmYWxzZTtcbiAgICAgIHRoaXMuYWN0aXZlUG9pbnRlcklkID0gbnVsbDtcbiAgICAgIGlmICh0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUpIHtcbiAgICAgICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtZW5kXCIgfSk7XG4gICAgICB9XG4gICAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJjYW5jZWxcIikgdGhpcy5jYW5jZWxQcmVzcygpO1xuICAgICAgcmV0dXJuIGVmZmVjdHM7XG4gICAgfVxuXG4gICAgLy8gSG92ZXIgbW92ZW1lbnQgaXMgdGhlIG9ubHkgZXZpZGVuY2UgdXNlZCB0byBpbnRlcnByZXQgYnV0dG9ucyBhcyBiYXJyZWwgc3RhdGUuXG4gICAgaWYgKHRoaXMucGVuQ29udGFjdCkgcmV0dXJuIGVmZmVjdHM7XG4gICAgY29uc3QgaGVsZE5vdyA9IChldmVudC5idXR0b25zICYgdGhpcy5zZXR0aW5ncy5iYXJyZWxCdXR0b25NYXNrKSAhPT0gMDtcbiAgICBpZiAoIXRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiBoZWxkTm93KSB0aGlzLnN0YXJ0UHJlc3MoZXZlbnQpO1xuICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgaGVsZE5vdykgdGhpcy50cmFja0hvdmVyTW92ZW1lbnQoZXZlbnQpO1xuICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgIWhlbGROb3cpIHRoaXMucmVsZWFzZVByZXNzKGVmZmVjdHMpO1xuICAgIHJldHVybiBlZmZlY3RzO1xuICB9XG5cbiAgZGlzcG9zZSgpOiBHZXN0dXJlRWZmZWN0W10ge1xuICAgIGNvbnN0IGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSA9IFtdO1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgIGlmICh0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUpIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtZW5kXCIgfSk7XG4gICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5jYW5jZWxQcmVzcygpO1xuICAgIHJldHVybiBlZmZlY3RzO1xuICB9XG5cbiAgc25hcHNob3QoKTogR2VzdHVyZVN0YXRlU25hcHNob3Qge1xuICAgIHJldHVybiB7XG4gICAgICBiYXJyZWxCdXR0b25IZWxkOiB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQsXG4gICAgICBwZW5Db250YWN0OiB0aGlzLnBlbkNvbnRhY3QsXG4gICAgICBnZXN0dXJlQ29uc3VtZWQ6IHRoaXMuY29uc3VtZWQsXG4gICAgICB0ZW1wb3JhcnlUb29sQWN0aXZlOiB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUsXG4gICAgICBob3Zlckdlc3R1cmVNb3ZlZDogdGhpcy5tb3ZlZCxcbiAgICAgIGxvbmdQcmVzc0ZpcmVkOiB0aGlzLmhvbGRGaXJlZCxcbiAgICAgIGFjdGl2ZVBvaW50ZXJJZDogdGhpcy5hY3RpdmVQb2ludGVySWQsXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBUaGUgY29udHJvbGxlciBjYWxscyB0aGlzIHdoZW4gdGhlIG9wdGlvbmFsIEV4Y2FsaWRyYXcgYnJpZGdlIHJlamVjdHMgYSBzdGFydCByZXF1ZXN0LiAqL1xuICB0ZW1wb3JhcnlUb29sRGlkTm90U3RhcnQoKTogdm9pZCB7XG4gICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIHN0YXJ0UHJlc3MoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IHZvaWQge1xuICAgIHRoaXMuYmFycmVsQnV0dG9uSGVsZCA9IHRydWU7XG4gICAgdGhpcy5jb25zdW1lZCA9IGZhbHNlO1xuICAgIHRoaXMubW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmhvbGRGaXJlZCA9IGZhbHNlO1xuICAgIHRoaXMucHJlc3NPcmlnaW4gPSB7IHg6IGV2ZW50LngsIHk6IGV2ZW50LnkgfTtcbiAgICB0aGlzLmhvbGRUaW1lciA9IHRoaXMuc2NoZWR1bGVyLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKFxuICAgICAgICAhdGhpcy5iYXJyZWxCdXR0b25IZWxkIHx8XG4gICAgICAgIHRoaXMucGVuQ29udGFjdCB8fFxuICAgICAgICB0aGlzLm1vdmVkIHx8XG4gICAgICAgIHRoaXMuY29uc3VtZWQgfHxcbiAgICAgICAgIXRoaXMucHJlc3NPcmlnaW5cbiAgICAgIClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgdGhpcy5ob2xkRmlyZWQgPSB0cnVlO1xuICAgICAgdGhpcy5jb25zdW1lZCA9IHRydWU7XG4gICAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICAgIHRoaXMub25FZmZlY3Q/Lih7IHR5cGU6IFwiYnV0dG9uLWhvbGRcIiwgcG9pbnQ6IHRoaXMucHJlc3NPcmlnaW4gfSk7XG4gICAgfSwgdGhpcy5zZXR0aW5ncy5sb25nUHJlc3NNcyk7XG4gIH1cblxuICAvKiogQ29udHJvbGxlciByZWdpc3RlcnMgdGhpcyBzbyBzY2hlZHVsZXIgY2FsbGJhY2tzIHJldGFpbiBwdXJlIHNlbWFudGljIG91dHB1dC4gKi9cbiAgcHJpdmF0ZSBvbkVmZmVjdDogKChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gIHNldEVmZmVjdFNpbmsoc2luazogKGVmZmVjdDogR2VzdHVyZUVmZmVjdCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMub25FZmZlY3QgPSBzaW5rO1xuICB9XG5cbiAgcHJpdmF0ZSB0cmFja0hvdmVyTW92ZW1lbnQoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5wcmVzc09yaWdpbiB8fCB0aGlzLm1vdmVkKSByZXR1cm47XG4gICAgY29uc3QgZHggPSBldmVudC54IC0gdGhpcy5wcmVzc09yaWdpbi54O1xuICAgIGNvbnN0IGR5ID0gZXZlbnQueSAtIHRoaXMucHJlc3NPcmlnaW4ueTtcbiAgICBpZiAoTWF0aC5oeXBvdChkeCwgZHkpID4gdGhpcy5zZXR0aW5ncy5tb3ZlbWVudFRocmVzaG9sZFB4KSB7XG4gICAgICB0aGlzLm1vdmVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY29uc3VtZUZvckNvbnRhY3QoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdKTogdm9pZCB7XG4gICAgdGhpcy5jb25zdW1lZCA9IHRydWU7XG4gICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MuYnV0dG9uQ29udGFjdEFjdGlvbiA9PT0gXCJlcmFzZXJcIiAmJiAhdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlKSB7XG4gICAgICB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUgPSB0cnVlO1xuICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJ0ZW1wb3JhcnktdG9vbC1zdGFydFwiLCBwb2ludDogeyB4OiBldmVudC54LCB5OiBldmVudC55IH0gfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWxlYXNlUHJlc3MoZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdKTogdm9pZCB7XG4gICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgdGhpcy5iYXJyZWxCdXR0b25IZWxkID0gZmFsc2U7XG4gICAgaWYgKCF0aGlzLmNvbnN1bWVkICYmICF0aGlzLm1vdmVkICYmICF0aGlzLmhvbGRGaXJlZCAmJiB0aGlzLnByZXNzT3JpZ2luKSB7XG4gICAgICBpZiAodGhpcy5wZW5kaW5nVGFwKSB7XG4gICAgICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgICAgICBlZmZlY3RzLnB1c2goeyB0eXBlOiBcImJ1dHRvbi1kb3VibGUtdGFwXCIsIHBvaW50OiB0aGlzLnByZXNzT3JpZ2luIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcG9pbnQgPSB0aGlzLnByZXNzT3JpZ2luO1xuICAgICAgICBjb25zdCB0aW1lciA9IHRoaXMuc2NoZWR1bGVyLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMucGVuZGluZ1RhcCA9IG51bGw7XG4gICAgICAgICAgdGhpcy5vbkVmZmVjdD8uKHsgdHlwZTogXCJidXR0b24tdGFwXCIsIHBvaW50IH0pO1xuICAgICAgICB9LCB0aGlzLnNldHRpbmdzLmRvdWJsZVRhcE1zKTtcbiAgICAgICAgdGhpcy5wZW5kaW5nVGFwID0geyBwb2ludCwgdGltZXIgfTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5wcmVzc09yaWdpbiA9IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGNhbmNlbFByZXNzKCk6IHZvaWQge1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuYmFycmVsQnV0dG9uSGVsZCA9IGZhbHNlO1xuICAgIHRoaXMucGVuQ29udGFjdCA9IGZhbHNlO1xuICAgIHRoaXMuY29uc3VtZWQgPSBmYWxzZTtcbiAgICB0aGlzLm1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5ob2xkRmlyZWQgPSBmYWxzZTtcbiAgICB0aGlzLnByZXNzT3JpZ2luID0gbnVsbDtcbiAgICB0aGlzLmFjdGl2ZVBvaW50ZXJJZCA9IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGNhbmNlbFRpbWVyKHdoaWNoOiBcImhvbGRcIik6IHZvaWQge1xuICAgIGlmICh3aGljaCA9PT0gXCJob2xkXCIgJiYgdGhpcy5ob2xkVGltZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuc2NoZWR1bGVyLmNsZWFyVGltZW91dCh0aGlzLmhvbGRUaW1lcik7XG4gICAgICB0aGlzLmhvbGRUaW1lciA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjYW5jZWxQZW5kaW5nVGFwKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnBlbmRpbmdUYXApIHRoaXMuc2NoZWR1bGVyLmNsZWFyVGltZW91dCh0aGlzLnBlbmRpbmdUYXAudGltZXIpO1xuICAgIHRoaXMucGVuZGluZ1RhcCA9IG51bGw7XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIHsgRXhjYWxpZHJhd0JyaWRnZSwgQWN0aXZlVG9vbFNuYXBzaG90IH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZVwiO1xuaW1wb3J0IHR5cGUgeyBEZWJ1Z0xvZ2dlciB9IGZyb20gXCIuLi9kZWJ1Zy9EZWJ1Z0xvZ2dlclwiO1xuaW1wb3J0IHsgRGVidWdPdmVybGF5IH0gZnJvbSBcIi4uL2RlYnVnL0RlYnVnT3ZlcmxheVwiO1xuaW1wb3J0IHR5cGUgeyBTdHlsdXNDb250cm9sc1NldHRpbmdzIH0gZnJvbSBcIi4uL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBub3JtYWxpemVQb2ludGVyRXZlbnQgfSBmcm9tIFwiLi9ub3JtYWxpemVQb2ludGVyRXZlbnRcIjtcbmltcG9ydCB7IFN0eWx1c0dlc3R1cmVNYWNoaW5lIH0gZnJvbSBcIi4vU3R5bHVzR2VzdHVyZU1hY2hpbmVcIjtcbmltcG9ydCB0eXBlIHsgR2VzdHVyZUVmZmVjdCwgTm9ybWFsaXplZFN0eWx1c0V2ZW50LCBQb2ludCwgU2NoZWR1bGVyIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IHR5cGUgQWN0aW9uSGFuZGxlciA9IChcbiAgYWN0aW9uOiBcIm1lbnVcIiB8IFwiY29weVwiIHwgXCJwYXN0ZVwiIHwgXCJub25lXCIsXG4gIHBvaW50OiBQb2ludCxcbiAgYnJpZGdlOiBFeGNhbGlkcmF3QnJpZGdlXG4pID0+IHZvaWQ7XG5cbmV4cG9ydCBjbGFzcyBTdHlsdXNDb250cm9sbGVyIHtcbiAgcHJpdmF0ZSByZWFkb25seSBtYWNoaW5lOiBTdHlsdXNHZXN0dXJlTWFjaGluZTtcbiAgcHJpdmF0ZSBzYXZlZFRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRpc3Bvc2VkID0gZmFsc2U7XG4gIHByaXZhdGUgYXR0YWNoZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSByZWFkb25seSBsaXN0ZW5lcnM6IEFycmF5PFtrZXlvZiBIVE1MRWxlbWVudEV2ZW50TWFwLCBFdmVudExpc3RlbmVyXT4gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBvdmVybGF5OiBEZWJ1Z092ZXJsYXk7XG4gIHByaXZhdGUgbGF0ZXN0RXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGVhZjogV29ya3NwYWNlTGVhZixcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNldHRpbmdzOiAoKSA9PiBTdHlsdXNDb250cm9sc1NldHRpbmdzLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGVidWc6IERlYnVnTG9nZ2VyLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGlzcGF0Y2hBY3Rpb246IEFjdGlvbkhhbmRsZXIsXG4gICAgc2NoZWR1bGVyOiBTY2hlZHVsZXIgPSB3aW5kb3dcbiAgKSB7XG4gICAgdGhpcy5tYWNoaW5lID0gbmV3IFN0eWx1c0dlc3R1cmVNYWNoaW5lKHRoaXMuZ2VzdHVyZVNldHRpbmdzKCksIHNjaGVkdWxlcik7XG4gICAgdGhpcy5tYWNoaW5lLnNldEVmZmVjdFNpbmsoKGVmZmVjdCkgPT4gdGhpcy5hcHBseUVmZmVjdChlZmZlY3QpKTtcbiAgICB0aGlzLm92ZXJsYXkgPSBuZXcgRGVidWdPdmVybGF5KFxuICAgICAgdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWwsXG4gICAgICAoKSA9PiB0aGlzLnNldHRpbmdzKCkuZGVidWdNb2RlICYmIHRoaXMuc2V0dGluZ3MoKS5kZWJ1Z092ZXJsYXlcbiAgICApO1xuICB9XG5cbiAgYXR0YWNoKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkIHx8IHRoaXMuYXR0YWNoZWQpIHJldHVybjtcbiAgICB0aGlzLmF0dGFjaGVkID0gdHJ1ZTtcbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWw7XG4gICAgZm9yIChjb25zdCB0eXBlIG9mIFtcbiAgICAgIFwicG9pbnRlcmRvd25cIixcbiAgICAgIFwicG9pbnRlcm1vdmVcIixcbiAgICAgIFwicG9pbnRlcnVwXCIsXG4gICAgICBcInBvaW50ZXJjYW5jZWxcIixcbiAgICAgIFwiY29udGV4dG1lbnVcIixcbiAgICBdIGFzIGNvbnN0KSB7XG4gICAgICBjb25zdCBsaXN0ZW5lcjogRXZlbnRMaXN0ZW5lciA9IChyYXcpID0+IHRoaXMub25Qb2ludGVyRXZlbnQocmF3IGFzIFBvaW50ZXJFdmVudCk7XG4gICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICAgICAgdGhpcy5saXN0ZW5lcnMucHVzaChbdHlwZSwgbGlzdGVuZXJdKTtcbiAgICB9XG4gIH1cblxuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSByZXR1cm47XG4gICAgdGhpcy5kaXNwb3NlZCA9IHRydWU7XG4gICAgdGhpcy5hdHRhY2hlZCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgW3R5cGUsIGxpc3RlbmVyXSBvZiB0aGlzLmxpc3RlbmVycylcbiAgICAgIHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICAgIHRoaXMubGlzdGVuZXJzLmxlbmd0aCA9IDA7XG4gICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgdGhpcy5tYWNoaW5lLmRpc3Bvc2UoKSkgdGhpcy5hcHBseUVmZmVjdChlZmZlY3QpO1xuICAgIHRoaXMub3ZlcmxheS5jbG9zZSgpO1xuICB9XG4gIGdldFRyYWNlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVidWcuZXhwb3J0VHJhY2UoKTtcbiAgfVxuXG4gIHByaXZhdGUgb25Qb2ludGVyRXZlbnQocmF3OiBQb2ludGVyRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAocmF3LnBvaW50ZXJUeXBlICE9PSBcInBlblwiKSByZXR1cm47XG4gICAgY29uc3QgZXZlbnQgPSBub3JtYWxpemVQb2ludGVyRXZlbnQoXG4gICAgICByYXcsXG4gICAgICB0aGlzLmxlYWYudmlldy5jb250YWluZXJFbC5jb250YWlucyhyYXcudGFyZ2V0IGFzIE5vZGUpXG4gICAgKTtcbiAgICB0aGlzLmxhdGVzdEV2ZW50ID0gZXZlbnQ7XG4gICAgdGhpcy5kZWJ1Zy5ldmVudChldmVudCk7XG4gICAgY29uc3QgZWZmZWN0cyA9IHRoaXMubWFjaGluZS5oYW5kbGUoZXZlbnQpO1xuICAgIGlmIChlZmZlY3RzLmxlbmd0aCA9PT0gMCkgdGhpcy5vdmVybGF5LnVwZGF0ZShldmVudCwgdGhpcy5tYWNoaW5lLnNuYXBzaG90KCkpO1xuICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIGVmZmVjdHMpIHtcbiAgICAgIGlmIChlZmZlY3QudHlwZSA9PT0gXCJzdXBwcmVzcy1jb250ZXh0LW1lbnVcIikgcmF3LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLmFwcGx5RWZmZWN0KGVmZmVjdCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBseUVmZmVjdChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QpOiB2b2lkIHtcbiAgICB0aGlzLmRlYnVnLm1lc3NhZ2UoYGVmZmVjdDogJHtlZmZlY3QudHlwZX1gKTtcbiAgICBzd2l0Y2ggKGVmZmVjdC50eXBlKSB7XG4gICAgICBjYXNlIFwidGVtcG9yYXJ5LXRvb2wtc3RhcnRcIjpcbiAgICAgICAgaWYgKCF0aGlzLnNhdmVkVG9vbCkge1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYnJpZGdlLnN0YXJ0VGVtcG9yYXJ5RXJhc2VyKCk7XG4gICAgICAgICAgaWYgKHJlc3VsdC5vaykgdGhpcy5zYXZlZFRvb2wgPSByZXN1bHQudmFsdWU7XG4gICAgICAgICAgZWxzZSB0aGlzLm1hY2hpbmUudGVtcG9yYXJ5VG9vbERpZE5vdFN0YXJ0KCk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwidGVtcG9yYXJ5LXRvb2wtZW5kXCI6XG4gICAgICAgIGlmICh0aGlzLnNhdmVkVG9vbCkgdGhpcy5icmlkZ2UucmVzdG9yZVRvb2wodGhpcy5zYXZlZFRvb2wpO1xuICAgICAgICB0aGlzLnNhdmVkVG9vbCA9IG51bGw7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImJ1dHRvbi10YXBcIjpcbiAgICAgICAgdGhpcy5kaXNwYXRjaEFjdGlvbih0aGlzLnNldHRpbmdzKCkuYnV0dG9uVGFwQWN0aW9uLCBlZmZlY3QucG9pbnQsIHRoaXMuYnJpZGdlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiYnV0dG9uLWRvdWJsZS10YXBcIjpcbiAgICAgICAgdGhpcy5kaXNwYXRjaEFjdGlvbih0aGlzLnNldHRpbmdzKCkuYnV0dG9uRG91YmxlVGFwQWN0aW9uLCBlZmZlY3QucG9pbnQsIHRoaXMuYnJpZGdlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiYnV0dG9uLWhvbGRcIjpcbiAgICAgICAgdGhpcy5kaXNwYXRjaEFjdGlvbih0aGlzLnNldHRpbmdzKCkuYnV0dG9uSG9sZEFjdGlvbiwgZWZmZWN0LnBvaW50LCB0aGlzLmJyaWRnZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGlmICh0aGlzLmxhdGVzdEV2ZW50KSB0aGlzLm92ZXJsYXkudXBkYXRlKHRoaXMubGF0ZXN0RXZlbnQsIHRoaXMubWFjaGluZS5zbmFwc2hvdCgpLCBlZmZlY3QpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXN0dXJlU2V0dGluZ3MoKSB7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLnNldHRpbmdzKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlLmJ1dHRvbkNvbnRhY3RBY3Rpb24sXG4gICAgICBkb3VibGVUYXBNczogdmFsdWUuZG91YmxlVGFwTXMsXG4gICAgICBsb25nUHJlc3NNczogdmFsdWUubG9uZ1ByZXNzTXMsXG4gICAgICBtb3ZlbWVudFRocmVzaG9sZFB4OiB2YWx1ZS5tb3ZlbWVudFRocmVzaG9sZFB4LFxuICAgICAgYmFycmVsQnV0dG9uTWFzazogdmFsdWUuYmFycmVsQnV0dG9uTWFzayxcbiAgICB9IGFzIGNvbnN0O1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBBcHAsIFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IEV4Y2FsaWRyYXdCcmlkZ2UgfSBmcm9tIFwiLi4vZXhjYWxpZHJhdy9FeGNhbGlkcmF3QnJpZGdlXCI7XG5pbXBvcnQgeyBEZWJ1Z0xvZ2dlciB9IGZyb20gXCIuLi9kZWJ1Zy9EZWJ1Z0xvZ2dlclwiO1xuaW1wb3J0IHR5cGUgeyBTdHlsdXNDb250cm9sc1NldHRpbmdzIH0gZnJvbSBcIi4uL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBTdHlsdXNDb250cm9sbGVyLCB0eXBlIEFjdGlvbkhhbmRsZXIgfSBmcm9tIFwiLi9TdHlsdXNDb250cm9sbGVyXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bHVzQ29udHJvbGxlckxpa2Uge1xuICBhdHRhY2goKTogdm9pZDtcbiAgZGlzcG9zZSgpOiB2b2lkO1xuICBnZXRUcmFjZSgpOiBzdHJpbmc7XG59XG5cbmV4cG9ydCB0eXBlIFN0eWx1c0NvbnRyb2xsZXJGYWN0b3J5ID0gKGxlYWY6IFdvcmtzcGFjZUxlYWYpID0+IFN0eWx1c0NvbnRyb2xsZXJMaWtlO1xuXG5leHBvcnQgY2xhc3MgU3R5bHVzVmlld1JlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSByZWFkb25seSBjb250cm9sbGVycyA9IG5ldyBNYXA8V29ya3NwYWNlTGVhZiwgU3R5bHVzQ29udHJvbGxlckxpa2U+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgY3JlYXRlQ29udHJvbGxlcjogU3R5bHVzQ29udHJvbGxlckZhY3Rvcnk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNldHRpbmdzOiAoKSA9PiBTdHlsdXNDb250cm9sc1NldHRpbmdzLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgYWN0aW9uSGFuZGxlcjogQWN0aW9uSGFuZGxlcixcbiAgICBjcmVhdGVDb250cm9sbGVyPzogU3R5bHVzQ29udHJvbGxlckZhY3RvcnlcbiAgKSB7XG4gICAgdGhpcy5jcmVhdGVDb250cm9sbGVyID1cbiAgICAgIGNyZWF0ZUNvbnRyb2xsZXIgPz9cbiAgICAgICgobGVhZikgPT4ge1xuICAgICAgICBjb25zdCBkZWJ1ZyA9IG5ldyBEZWJ1Z0xvZ2dlcigoKSA9PiB0aGlzLnNldHRpbmdzKCkuZGVidWdNb2RlKTtcbiAgICAgICAgcmV0dXJuIG5ldyBTdHlsdXNDb250cm9sbGVyKFxuICAgICAgICAgIGxlYWYsXG4gICAgICAgICAgbmV3IEV4Y2FsaWRyYXdCcmlkZ2UobGVhZiksXG4gICAgICAgICAgdGhpcy5zZXR0aW5ncyxcbiAgICAgICAgICBkZWJ1ZyxcbiAgICAgICAgICB0aGlzLmFjdGlvbkhhbmRsZXJcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgc3luYygpOiB2b2lkIHtcbiAgICBjb25zdCBsZWF2ZXMgPSBuZXcgU2V0KHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoXCJleGNhbGlkcmF3XCIpKTtcbiAgICBmb3IgKGNvbnN0IGxlYWYgb2YgbGVhdmVzKVxuICAgICAgaWYgKCF0aGlzLmNvbnRyb2xsZXJzLmhhcyhsZWFmKSkge1xuICAgICAgICBjb25zdCBjb250cm9sbGVyID0gdGhpcy5jcmVhdGVDb250cm9sbGVyKGxlYWYpO1xuICAgICAgICBjb250cm9sbGVyLmF0dGFjaCgpO1xuICAgICAgICB0aGlzLmNvbnRyb2xsZXJzLnNldChsZWFmLCBjb250cm9sbGVyKTtcbiAgICAgIH1cbiAgICBmb3IgKGNvbnN0IFtsZWFmLCBjb250cm9sbGVyXSBvZiB0aGlzLmNvbnRyb2xsZXJzKVxuICAgICAgaWYgKCFsZWF2ZXMuaGFzKGxlYWYpKSB7XG4gICAgICAgIGNvbnRyb2xsZXIuZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLmNvbnRyb2xsZXJzLmRlbGV0ZShsZWFmKTtcbiAgICAgIH1cbiAgfVxuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgY29udHJvbGxlciBvZiB0aGlzLmNvbnRyb2xsZXJzLnZhbHVlcygpKSBjb250cm9sbGVyLmRpc3Bvc2UoKTtcbiAgICB0aGlzLmNvbnRyb2xsZXJzLmNsZWFyKCk7XG4gIH1cbiAgcmVmcmVzaCgpOiB2b2lkIHtcbiAgICB0aGlzLmRpc3Bvc2UoKTtcbiAgICB0aGlzLnN5bmMoKTtcbiAgfVxuICBleHBvcnRUcmFjZXMoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoXG4gICAgICBbLi4udGhpcy5jb250cm9sbGVycy5lbnRyaWVzKCldLm1hcCgoW2xlYWYsIGNvbnRyb2xsZXJdKSA9PiAoe1xuICAgICAgICBsZWFmOiBsZWFmLmdldERpc3BsYXlUZXh0KCksXG4gICAgICAgIGV2ZW50czogSlNPTi5wYXJzZShjb250cm9sbGVyLmdldFRyYWNlKCkpLFxuICAgICAgfSkpLFxuICAgICAgbnVsbCxcbiAgICAgIDJcbiAgICApO1xuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUFBQSxtQkFBK0I7OztBQ0cvQixJQUFNLGlCQUFpQjtBQUN2QixJQUFNLHFCQUFxQixFQUFFLE9BQU8sS0FBSyxRQUFRLElBQUk7QUFFOUMsU0FBUyxrQkFDZCxPQUNBLFVBQ0EsTUFDTztBQUNQLFNBQU87QUFBQSxJQUNMLEdBQUcsS0FBSyxJQUFJLGdCQUFnQixLQUFLLElBQUksTUFBTSxHQUFHLFNBQVMsUUFBUSxLQUFLLFFBQVEsY0FBYyxDQUFDO0FBQUEsSUFDM0YsR0FBRyxLQUFLLElBQUksZ0JBQWdCLEtBQUssSUFBSSxNQUFNLEdBQUcsU0FBUyxTQUFTLEtBQUssU0FBUyxjQUFjLENBQUM7QUFBQSxFQUMvRjtBQUNGO0FBRU8sSUFBTSxhQUFOLE1BQWlCO0FBQUEsRUFDZCxVQUE4QjtBQUFBLEVBQzlCLGtCQUEwRDtBQUFBLEVBQzFELGlCQUFpQjtBQUFBLEVBRXpCLEtBQUssT0FBYyxRQUFnQztBQUNqRCxTQUFLLE1BQU07QUFDWCxVQUFNLGFBQWEsS0FBSztBQUN4QixVQUFNLE9BQU8sU0FBUyxLQUFLLFVBQVUsRUFBRSxLQUFLLHlCQUF5QixDQUFDO0FBQ3RFLFVBQU1DLFdBQXVDO0FBQUEsTUFDM0MsQ0FBQyxhQUFhLE1BQU0sT0FBTyxRQUFRLFdBQVcsQ0FBQztBQUFBLE1BQy9DLENBQUMsYUFBYSxNQUFNLE9BQU8sUUFBUSxVQUFVLENBQUM7QUFBQSxNQUM5QyxDQUFDLFVBQVUsTUFBTSxPQUFPLFFBQVEsUUFBUSxDQUFDO0FBQUEsTUFDekMsQ0FBQyxhQUFhLE1BQU0sT0FBTyxRQUFRLFdBQVcsQ0FBQztBQUFBLE1BQy9DLENBQUMsU0FBUyxNQUFNLE9BQU8sUUFBUSxPQUFPLENBQUM7QUFBQSxNQUN2QyxDQUFDLFFBQVEsTUFBTSxPQUFPLHFCQUFxQixDQUFDO0FBQUEsTUFDNUMsQ0FBQyxTQUFTLE1BQU0sT0FBTyxRQUFRLEtBQUssQ0FBQztBQUFBLElBQ3ZDO0FBQ0EsZUFBVyxDQUFDLE1BQU0sUUFBUSxLQUFLQSxVQUFTO0FBQ3RDLFlBQU0sU0FBUyxLQUFLLFNBQVMsVUFBVTtBQUFBLFFBQ3JDLE1BQU07QUFBQSxRQUNOLEtBQUs7QUFBQSxNQUNQLENBQUM7QUFDRCxhQUFPLGlCQUFpQixhQUFhLENBQUMsVUFBVTtBQUM5QyxjQUFNLGdCQUFnQjtBQUN0QixjQUFNLGVBQWU7QUFDckIsaUJBQVM7QUFDVCxhQUFLLE1BQU07QUFBQSxNQUNiLENBQUM7QUFBQSxJQUNIO0FBQ0EsU0FBSyxVQUFVO0FBQ2YsVUFBTSxXQUFXO0FBQUEsTUFDZjtBQUFBLE1BQ0EsRUFBRSxPQUFPLE9BQU8sWUFBWSxRQUFRLE9BQU8sWUFBWTtBQUFBLE1BQ3ZEO0FBQUEsUUFDRSxPQUFPLEtBQUssZUFBZSxtQkFBbUI7QUFBQSxRQUM5QyxRQUFRLEtBQUssZ0JBQWdCLG1CQUFtQjtBQUFBLE1BQ2xEO0FBQUEsSUFDRjtBQUNBLFNBQUssWUFBWSxFQUFFLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQztBQUNwRSxXQUFPLFdBQVcsTUFBTTtBQUN0QixVQUFJLGVBQWUsS0FBSyxrQkFBa0IsQ0FBQyxLQUFLLFFBQVM7QUFDekQsV0FBSyxrQkFBa0IsQ0FBQyxVQUFVO0FBQ2hDLFlBQUksQ0FBQyxLQUFLLFNBQVMsU0FBUyxNQUFNLE1BQWMsRUFBRyxNQUFLLE1BQU07QUFBQSxNQUNoRTtBQUNBLGVBQVMsaUJBQWlCLGVBQWUsS0FBSyxpQkFBaUIsSUFBSTtBQUFBLElBQ3JFLEdBQUcsQ0FBQztBQUFBLEVBQ047QUFBQSxFQUNBLFFBQVEsTUFBWTtBQUNsQixTQUFLLGtCQUFrQjtBQUN2QixRQUFJLEtBQUs7QUFDUCxlQUFTLG9CQUFvQixlQUFlLEtBQUssaUJBQWlCLElBQUk7QUFDeEUsU0FBSyxrQkFBa0I7QUFDdkIsU0FBSyxTQUFTLE9BQU87QUFDckIsU0FBSyxVQUFVO0FBQUEsRUFDakI7QUFDRjs7O0FDekVBLHNCQUEwQzs7O0FDaUJuQyxJQUFNLG1CQUEyQztBQUFBLEVBQ3RELGlCQUFpQjtBQUFBLEVBQ2pCLHVCQUF1QjtBQUFBLEVBQ3ZCLGtCQUFrQjtBQUFBLEVBQ2xCLHFCQUFxQjtBQUFBLEVBQ3JCLGFBQWE7QUFBQSxFQUNiLGFBQWE7QUFBQSxFQUNiLHFCQUFxQjtBQUFBO0FBQUEsRUFFckIsa0JBQWtCO0FBQUEsRUFDbEIsV0FBVztBQUFBLEVBQ1gsY0FBYztBQUNoQjtBQUVPLElBQU0seUJBQXlCO0FBQUEsRUFDcEMsYUFBYSxFQUFFLEtBQUssS0FBSyxLQUFLLElBQUs7QUFBQSxFQUNuQyxhQUFhLEVBQUUsS0FBSyxLQUFLLEtBQUssSUFBSztBQUFBLEVBQ25DLHFCQUFxQixFQUFFLEtBQUssR0FBRyxLQUFLLElBQUk7QUFDMUM7QUFJTyxTQUFTLG9CQUFvQixLQUF3QixPQUE4QjtBQUN4RixRQUFNLFNBQVMsT0FBTyxLQUFLO0FBQzNCLFFBQU0sRUFBRSxLQUFLLElBQUksSUFBSSx1QkFBdUIsR0FBRztBQUMvQyxTQUFPLE9BQU8sVUFBVSxNQUFNLEtBQUssVUFBVSxPQUFPLFVBQVUsTUFBTSxTQUFTO0FBQy9FO0FBRU8sU0FBUyxrQkFBa0IsT0FBZ0U7QUFDaEcsUUFBTSxTQUFTLENBQUMsV0FBb0IsYUFDbEMsY0FBYyxVQUFVLGNBQWMsVUFBVSxjQUFjLFdBQVcsY0FBYyxTQUNuRixZQUNBO0FBQ04sUUFBTSxTQUFTLENBQUMsV0FBb0IsVUFBa0IsS0FBYSxRQUNqRSxPQUFPLGNBQWMsWUFBWSxPQUFPLFNBQVMsU0FBUyxJQUN0RCxLQUFLLElBQUksS0FBSyxLQUFLLElBQUksS0FBSyxLQUFLLE1BQU0sU0FBUyxDQUFDLENBQUMsSUFDbEQ7QUFDTixTQUFPO0FBQUEsSUFDTCxpQkFBaUIsT0FBTyxNQUFNLGlCQUFpQixpQkFBaUIsZUFBZTtBQUFBLElBQy9FLHVCQUF1QjtBQUFBLE1BQ3JCLE1BQU07QUFBQSxNQUNOLGlCQUFpQjtBQUFBLElBQ25CO0FBQUEsSUFDQSxrQkFBa0IsT0FBTyxNQUFNLGtCQUFrQixpQkFBaUIsZ0JBQWdCO0FBQUEsSUFDbEYscUJBQXFCLE1BQU0sd0JBQXdCLFNBQVMsU0FBUztBQUFBLElBQ3JFLGFBQWE7QUFBQSxNQUNYLE1BQU07QUFBQSxNQUNOO0FBQUEsTUFDQSx1QkFBdUIsWUFBWTtBQUFBLE1BQ25DLHVCQUF1QixZQUFZO0FBQUEsSUFDckM7QUFBQSxJQUNBLGFBQWE7QUFBQSxNQUNYLE1BQU07QUFBQSxNQUNOO0FBQUEsTUFDQSx1QkFBdUIsWUFBWTtBQUFBLE1BQ25DLHVCQUF1QixZQUFZO0FBQUEsSUFDckM7QUFBQSxJQUNBLHFCQUFxQjtBQUFBLE1BQ25CLE1BQU07QUFBQSxNQUNOO0FBQUEsTUFDQSx1QkFBdUIsb0JBQW9CO0FBQUEsTUFDM0MsdUJBQXVCLG9CQUFvQjtBQUFBLElBQzdDO0FBQUEsSUFDQSxrQkFDRSxNQUFNLHFCQUFxQixLQUFLLE1BQU0scUJBQXFCLEtBQ3ZELE1BQU0sbUJBQ04saUJBQWlCO0FBQUEsSUFDdkIsV0FBVyxNQUFNLGNBQWM7QUFBQSxJQUMvQixjQUFjLE1BQU0saUJBQWlCO0FBQUEsRUFDdkM7QUFDRjs7O0FEOUVBLElBQU0sVUFBd0M7QUFBQSxFQUM1QyxNQUFNO0FBQUEsRUFDTixNQUFNO0FBQUEsRUFDTixPQUFPO0FBQUEsRUFDUCxNQUFNO0FBQ1I7QUFFTyxJQUFNLGNBQU4sY0FBMEIsaUNBQWlCO0FBQUEsRUFDaEQsWUFBNkIsUUFBOEI7QUFDekQsVUFBTSxPQUFPLEtBQUssTUFBTTtBQURHO0FBQUEsRUFFN0I7QUFBQSxFQUNBLFVBQWdCO0FBQ2QsVUFBTSxFQUFFLFlBQVksSUFBSTtBQUN4QixnQkFBWSxNQUFNO0FBQ2xCLGdCQUFZLFNBQVMsS0FBSztBQUFBLE1BQ3hCLE1BQU07QUFBQSxJQUNSLENBQUM7QUFDRCxTQUFLLE9BQU8sT0FBTyxpQkFBaUI7QUFDcEMsU0FBSyxPQUFPLGNBQWMsdUJBQXVCO0FBQ2pELFNBQUssT0FBTyxRQUFRLGtCQUFrQjtBQUN0QyxRQUFJLHdCQUFRLFdBQVcsRUFDcEIsUUFBUSxzQkFBc0IsRUFDOUIsUUFBUSxrRUFBa0UsRUFDMUU7QUFBQSxNQUFZLENBQUMsYUFDWixTQUNHLFVBQVUsVUFBVSxrQkFBa0IsRUFDdEMsVUFBVSxRQUFRLFlBQVksRUFDOUIsU0FBUyxLQUFLLE9BQU8sU0FBUyxtQkFBbUIsRUFDakQ7QUFBQSxRQUFTLE9BQU8sVUFDZixLQUFLLE9BQU8sZUFBZTtBQUFBLFVBQ3pCLHFCQUFxQjtBQUFBLFFBQ3ZCLENBQUM7QUFBQSxNQUNIO0FBQUEsSUFDSjtBQUNGLFNBQUssT0FBTyw0QkFBNEIsYUFBYTtBQUNyRCxTQUFLLE9BQU8seUJBQXlCLGFBQWE7QUFDbEQsU0FBSyxPQUFPLDJCQUEyQixxQkFBcUI7QUFDNUQsUUFBSSx3QkFBUSxXQUFXLEVBQ3BCLFFBQVEsc0JBQXNCLEVBQzlCO0FBQUEsTUFDQztBQUFBLElBQ0YsRUFDQztBQUFBLE1BQVksQ0FBQyxhQUNaLFNBQ0csVUFBVSxLQUFLLDhCQUE4QixFQUM3QyxVQUFVLEtBQUssOEJBQThCLEVBQzdDLFVBQVUsTUFBTSwwQkFBMEIsRUFDMUMsU0FBUyxPQUFPLEtBQUssT0FBTyxTQUFTLGdCQUFnQixDQUFDLEVBQ3REO0FBQUEsUUFBUyxPQUFPLFVBQ2YsS0FBSyxPQUFPLGVBQWUsRUFBRSxrQkFBa0IsT0FBTyxLQUFLLEVBQWdCLENBQUM7QUFBQSxNQUM5RTtBQUFBLElBQ0o7QUFDRixRQUFJLHdCQUFRLFdBQVcsRUFDcEIsUUFBUSxlQUFlLEVBQ3ZCLFFBQVEsNkRBQTZELEVBQ3JFO0FBQUEsTUFBVSxDQUFDLFdBQ1YsT0FDRyxTQUFTLEtBQUssT0FBTyxTQUFTLFNBQVMsRUFDdkMsU0FBUyxPQUFPLFVBQVUsS0FBSyxPQUFPLGVBQWUsRUFBRSxXQUFXLE1BQU0sQ0FBQyxDQUFDO0FBQUEsSUFDL0U7QUFDRixRQUFJLHdCQUFRLFdBQVcsRUFDcEIsUUFBUSxlQUFlLEVBQ3ZCO0FBQUEsTUFDQztBQUFBLElBQ0YsRUFDQztBQUFBLE1BQVUsQ0FBQyxXQUNWLE9BQ0csU0FBUyxLQUFLLE9BQU8sU0FBUyxZQUFZLEVBQzFDLFNBQVMsT0FBTyxVQUFVLEtBQUssT0FBTyxlQUFlLEVBQUUsY0FBYyxNQUFNLENBQUMsQ0FBQztBQUFBLElBQ2xGO0FBQUEsRUFDSjtBQUFBLEVBQ1EsT0FDTixNQUNBLEtBQ007QUFDTixRQUFJLHdCQUFRLEtBQUssV0FBVyxFQUFFLFFBQVEsc0JBQXNCLElBQUksRUFBRSxFQUFFLFlBQVksQ0FBQyxhQUFhO0FBQzVGLGlCQUFXLENBQUMsT0FBTyxLQUFLLEtBQUssT0FBTyxRQUFRLE9BQU8sRUFBRyxVQUFTLFVBQVUsT0FBTyxLQUFLO0FBQ3JGLGVBQ0csU0FBUyxLQUFLLE9BQU8sU0FBUyxHQUFHLENBQUMsRUFDbEMsU0FBUyxPQUFPLFVBQVUsS0FBSyxPQUFPLGVBQWUsRUFBRSxDQUFDLEdBQUcsR0FBRyxNQUFzQixDQUFDLENBQUM7QUFBQSxJQUMzRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ1EsT0FBTyxNQUFjLEtBQThCO0FBQ3pELFVBQU0sRUFBRSxLQUFLLElBQUksSUFBSSx1QkFBdUIsR0FBRztBQUMvQyxRQUFJLHdCQUFRLEtBQUssV0FBVyxFQUN6QixRQUFRLElBQUksRUFDWixRQUFRLGtDQUFrQyxHQUFHLE9BQU8sR0FBRyxHQUFHLEVBQzFEO0FBQUEsTUFBUSxDQUFDLFNBQ1IsS0FBSyxTQUFTLE9BQU8sS0FBSyxPQUFPLFNBQVMsR0FBRyxDQUFDLENBQUMsRUFBRSxTQUFTLE9BQU8sVUFBVTtBQUN6RSxjQUFNLFNBQVMsb0JBQW9CLEtBQUssS0FBSztBQUM3QyxhQUFLLFFBQVE7QUFBQSxVQUNYLFdBQVcsT0FBTyw2QkFBNkIsR0FBRyxPQUFPLEdBQUcsTUFBTTtBQUFBLFFBQ3BFO0FBQ0EsWUFBSSxXQUFXLEtBQU07QUFDckIsY0FBTSxLQUFLLE9BQU8sZUFBZSxFQUFFLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQztBQUFBLE1BQ3BELENBQUM7QUFBQSxJQUNIO0FBQUEsRUFDSjtBQUNGOzs7QUUzR0EsSUFBQUMsbUJBQTJDOzs7QUMwQ3BDLFNBQVMsaUJBQWlCLEtBQTZDO0FBQzVFLFNBQU87QUFBQSxJQUNMLG1CQUFtQixPQUFPLEtBQUssZ0JBQWdCO0FBQUEsSUFDL0Msa0JBQWtCLE9BQU8sS0FBSyxrQkFBa0I7QUFBQSxFQUNsRDtBQUNGO0FBRU8sU0FBUyxlQUFlLEtBQStDO0FBQzVFLFFBQU0sYUFBYSxJQUFJLGNBQWMsRUFBRTtBQUN2QyxTQUFPLGFBQWEsRUFBRSxHQUFHLFdBQVcsSUFBSTtBQUMxQztBQUVPLFNBQVMsV0FDZCxNQUNBLFdBQVcsa0JBQWtCLEdBQ1U7QUFDdkMsTUFBSSxDQUFDLFFBQVEsT0FBTyxTQUFTLFVBQVU7QUFDckMsV0FBTztBQUFBLE1BQ0wsSUFBSTtBQUFBLE1BQ0osTUFBTTtBQUFBLE1BQ04sU0FBUztBQUFBLElBQ1g7QUFBQSxFQUNGO0FBQ0EsTUFBSSxVQUFVO0FBQ1osUUFBSTtBQUdGLGVBQVMsUUFBUSxJQUFJO0FBQ3JCLGFBQU8sc0JBQXNCLFNBQVMsaUJBQWlCLENBQUM7QUFBQSxJQUMxRCxRQUFRO0FBQ04sYUFBTztBQUFBLFFBQ0wsSUFBSTtBQUFBLFFBQ0osTUFBTTtBQUFBLFFBQ04sU0FBUztBQUFBLE1BQ1g7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUlBLFFBQU0sTUFBTyxLQUErQjtBQUM1QyxTQUFPLHNCQUFzQixHQUFHO0FBQ2xDO0FBRU8sU0FBUyxvQkFBc0Q7QUFDcEUsUUFBTSxZQUFhLFdBQWdEO0FBQ25FLE1BQ0UsYUFDQSxPQUFPLGNBQWMsWUFDckIsT0FBUSxVQUF3QyxZQUFZLGNBQzVELE9BQVEsVUFBd0MscUJBQXFCLFlBQ3JFO0FBQ0EsV0FBTztBQUFBLEVBQ1Q7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxTQUFTLHNCQUFzQixLQUFxRDtBQUNsRixNQUFJLENBQUMsT0FBTyxPQUFPLFFBQVEsVUFBVTtBQUNuQyxXQUFPO0FBQUEsTUFDTCxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixTQUFTO0FBQUEsSUFDWDtBQUFBLEVBQ0Y7QUFDQSxRQUFNLGVBQWUsaUJBQWlCLEdBQW9CO0FBQzFELE1BQUksQ0FBQyxhQUFhLHFCQUFxQixDQUFDLGFBQWEsa0JBQWtCO0FBQ3JFLFdBQU87QUFBQSxNQUNMLElBQUk7QUFBQSxNQUNKLE1BQU07QUFBQSxNQUNOLFNBQVM7QUFBQSxJQUNYO0FBQUEsRUFDRjtBQUNBLFNBQU8sRUFBRSxJQUFJLE1BQU0sT0FBTyxJQUErQjtBQUMzRDs7O0FEakdPLElBQU0sbUJBQU4sTUFBdUI7QUFBQSxFQUU1QixZQUE2QixNQUFxQjtBQUFyQjtBQUFBLEVBQXNCO0FBQUEsRUFEM0MsU0FBUztBQUFBLEVBR2pCLHVCQUF5RDtBQUN2RCxVQUFNLFlBQVksS0FBSyxPQUFPO0FBQzlCLFFBQUksQ0FBQyxVQUFVLEdBQUksUUFBTyxLQUFLLE9BQU8sU0FBUztBQUMvQyxRQUFJO0FBQ0YsWUFBTSxPQUFPLGVBQWUsVUFBVSxLQUFLO0FBQzNDLFVBQUksQ0FBQyxNQUFNO0FBQ1QsZUFBTyxLQUFLO0FBQUEsVUFDVjtBQUFBLFVBQ0E7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUNBLGdCQUFVLE1BQU0sY0FBYyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ2hELGFBQU8sRUFBRSxJQUFJLE1BQU0sT0FBTyxLQUFLO0FBQUEsSUFDakMsUUFBUTtBQUNOLGFBQU8sS0FBSyxRQUFRLFVBQVUsMERBQTBEO0FBQUEsSUFDMUY7QUFBQSxFQUNGO0FBQUEsRUFDQSxZQUFZLE1BQWlEO0FBQzNELFVBQU0sWUFBWSxLQUFLLE9BQU87QUFDOUIsUUFBSSxDQUFDLFVBQVUsR0FBSSxRQUFPLEtBQUssT0FBTyxTQUFTO0FBQy9DLFFBQUk7QUFDRixnQkFBVSxNQUFNLGNBQWMsSUFBSTtBQUNsQyxhQUFPLEVBQUUsSUFBSSxNQUFNLE9BQU8sT0FBVTtBQUFBLElBQ3RDLFFBQVE7QUFDTixhQUFPLEtBQUs7QUFBQSxRQUNWO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUSxNQUFxQztBQUMzQyxVQUFNLFlBQVksS0FBSyxPQUFPO0FBQzlCLFFBQUksQ0FBQyxVQUFVLEdBQUksUUFBTyxLQUFLLE9BQU8sU0FBUztBQUMvQyxRQUFJO0FBQ0YsZ0JBQVUsTUFBTSxjQUFjLEVBQUUsS0FBSyxDQUFDO0FBQ3RDLGFBQU8sRUFBRSxJQUFJLE1BQU0sT0FBTyxPQUFVO0FBQUEsSUFDdEMsUUFBUTtBQUNOLGFBQU8sS0FBSyxRQUFRLFVBQVUsd0RBQXdEO0FBQUEsSUFDeEY7QUFBQSxFQUNGO0FBQUEsRUFDQSx1QkFBOEM7QUFDNUMsV0FBTyxLQUFLLFFBQVEsZUFBZSw0Q0FBNEM7QUFBQSxFQUNqRjtBQUFBLEVBQ0EsUUFBUSxPQUFxQztBQUUzQyxXQUFPLEtBQUssUUFBUSxlQUFlLDZDQUE2QztBQUFBLEVBQ2xGO0FBQUEsRUFFUSxTQUFnRDtBQUN0RCxRQUFJO0FBQ0YsYUFBTyxXQUFXLEtBQUssS0FBSyxJQUFJO0FBQUEsSUFDbEMsUUFBUTtBQUNOLGFBQU87QUFBQSxRQUNMLElBQUk7QUFBQSxRQUNKLE1BQU07QUFBQSxRQUNOLFNBQVM7QUFBQSxNQUNYO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUVRLE9BQVUsUUFBcUU7QUFDckYsU0FBSyxZQUFZLE9BQU8sT0FBTztBQUMvQixXQUFPO0FBQUEsRUFDVDtBQUFBLEVBQ1EsUUFDTixNQUNBLFNBQ3FCO0FBQ3JCLFNBQUssWUFBWSxPQUFPO0FBQ3hCLFdBQU8sRUFBRSxJQUFJLE9BQU8sTUFBTSxRQUFRO0FBQUEsRUFDcEM7QUFBQSxFQUNRLFlBQVksU0FBdUI7QUFDekMsUUFBSSxDQUFDLEtBQUssUUFBUTtBQUNoQixVQUFJLHdCQUFPLCtCQUErQixPQUFPLEVBQUU7QUFDbkQsV0FBSyxTQUFTO0FBQUEsSUFDaEI7QUFBQSxFQUNGO0FBQ0Y7OztBRWxHTyxJQUFNLGNBQU4sTUFBa0I7QUFBQSxFQUd2QixZQUE2QixTQUF3QjtBQUF4QjtBQUFBLEVBQXlCO0FBQUEsRUFGOUMsUUFBaUMsQ0FBQztBQUFBLEVBQ2xDLGdCQUFnQjtBQUFBLEVBR3hCLE1BQU0sT0FBb0M7QUFDeEMsUUFBSSxDQUFDLEtBQUssUUFBUSxFQUFHO0FBQ3JCLFFBQUksTUFBTSxTQUFTLFVBQVUsTUFBTSxZQUFZLEtBQUssZ0JBQWdCLElBQUs7QUFDekUsUUFBSSxNQUFNLFNBQVMsT0FBUSxNQUFLLGdCQUFnQixNQUFNO0FBQ3RELFNBQUssTUFBTSxLQUFLLEtBQUs7QUFDckIsUUFBSSxLQUFLLE1BQU0sU0FBUyxJQUFLLE1BQUssTUFBTSxNQUFNO0FBQzlDLFlBQVEsTUFBTSxnQ0FBZ0MsS0FBSztBQUFBLEVBQ3JEO0FBQUEsRUFDQSxRQUFRLFNBQXVCO0FBQzdCLFFBQUksS0FBSyxRQUFRLEVBQUcsU0FBUSxNQUFNLGdDQUFnQyxPQUFPO0FBQUEsRUFDM0U7QUFBQSxFQUNBLGNBQXNCO0FBQ3BCLFdBQU8sS0FBSyxVQUFVLEtBQUssT0FBTyxNQUFNLENBQUM7QUFBQSxFQUMzQztBQUFBLEVBQ0EsUUFBYztBQUNaLFNBQUssUUFBUSxDQUFDO0FBQUEsRUFDaEI7QUFDRjs7O0FDckJPLElBQU0sZUFBTixNQUFtQjtBQUFBLEVBR3hCLFlBQ21CLFdBQ0EsU0FDakI7QUFGaUI7QUFDQTtBQUFBLEVBQ2hCO0FBQUEsRUFMSyxVQUE4QjtBQUFBLEVBT3RDLE9BQU8sT0FBOEIsT0FBNkIsUUFBOEI7QUFDOUYsUUFBSSxDQUFDLEtBQUssUUFBUSxHQUFHO0FBQ25CLFdBQUssTUFBTTtBQUNYO0FBQUEsSUFDRjtBQUNBLFVBQU0sVUFBVSxLQUFLLGNBQWM7QUFDbkMsVUFBTSxlQUFlO0FBQUEsTUFDbkIsU0FBUyxPQUFPLENBQUMsTUFBTSxVQUFVLENBQUM7QUFBQSxNQUNsQyxVQUFVLE9BQU8sTUFBTSxnQkFBZ0IsQ0FBQztBQUFBLE1BQ3hDLFlBQVksT0FBTyxNQUFNLGVBQWUsQ0FBQztBQUFBLE1BQ3pDLFFBQVEsT0FBTyxNQUFNLG1CQUFtQixDQUFDO0FBQUEsSUFDM0MsRUFBRSxLQUFLLFFBQUs7QUFDWixZQUFRO0FBQUEsTUFDTjtBQUFBLFFBQ0UsU0FBUyxNQUFNLElBQUksT0FBTyxNQUFNLFNBQVMsV0FBVyxNQUFNLE1BQU0sWUFBWSxNQUFNLE9BQU8sYUFBYSxNQUFNLFNBQVMsUUFBUSxDQUFDLENBQUM7QUFBQSxRQUMvSCxRQUFRLE1BQU0sS0FBSyxJQUFJLE1BQU0sS0FBSyxVQUFVLE1BQU0sS0FBSyxlQUFlLE1BQU0sbUJBQW1CLFFBQVEsQ0FBQyxDQUFDLFNBQVMsTUFBTSxLQUFLLElBQUksTUFBTSxNQUFNO0FBQUEsUUFDN0k7QUFBQSxRQUNBLFVBQVUsUUFBUSxRQUFRLE1BQU07QUFBQSxNQUNsQyxFQUFFLEtBQUssSUFBSTtBQUFBLElBQ2I7QUFBQSxFQUNGO0FBQUEsRUFFQSxRQUFjO0FBQ1osU0FBSyxTQUFTLE9BQU87QUFDckIsU0FBSyxVQUFVO0FBQUEsRUFDakI7QUFBQSxFQUVRLGdCQUE2QjtBQUNuQyxRQUFJLEtBQUssUUFBUyxRQUFPLEtBQUs7QUFDOUIsU0FBSyxVQUFVLEtBQUssVUFBVSxVQUFVLEVBQUUsS0FBSyxrQ0FBa0MsQ0FBQztBQUNsRixXQUFPLEtBQUs7QUFBQSxFQUNkO0FBQ0Y7OztBQ3pDQSxJQUFNLGFBQThDO0FBQUEsRUFDbEQsYUFBYTtBQUFBLEVBQ2IsYUFBYTtBQUFBLEVBQ2IsV0FBVztBQUFBLEVBQ1gsZUFBZTtBQUFBLEVBQ2YsYUFBYTtBQUNmO0FBRU8sU0FBUyxzQkFDZCxPQUNBLGdCQUN1QjtBQUN2QixTQUFPO0FBQUEsSUFDTCxNQUFNLFdBQVcsTUFBTSxJQUFJLEtBQUs7QUFBQSxJQUNoQyxhQUFhLE1BQU07QUFBQSxJQUNuQixXQUFXLE1BQU07QUFBQSxJQUNqQixTQUFTLE1BQU07QUFBQSxJQUNmLFFBQVEsTUFBTTtBQUFBLElBQ2QsVUFBVSxNQUFNO0FBQUEsSUFDaEIsb0JBQW9CLE1BQU07QUFBQSxJQUMxQixPQUFPLE1BQU07QUFBQSxJQUNiLE9BQU8sTUFBTTtBQUFBLElBQ2IsT0FBTyxNQUFNO0FBQUEsSUFDYixPQUFPLE1BQU07QUFBQSxJQUNiLFFBQVEsTUFBTTtBQUFBLElBQ2QsR0FBRyxNQUFNO0FBQUEsSUFDVCxHQUFHLE1BQU07QUFBQSxJQUNULFdBQVcsTUFBTTtBQUFBLElBQ2pCO0FBQUEsRUFDRjtBQUNGOzs7QUNqQk8sSUFBTSx1QkFBTixNQUEyQjtBQUFBLEVBWWhDLFlBQ21CLFVBQ0EsV0FDakI7QUFGaUI7QUFDQTtBQUFBLEVBQ2hCO0FBQUEsRUFkSyxtQkFBbUI7QUFBQSxFQUNuQixhQUFhO0FBQUEsRUFDYixXQUFXO0FBQUEsRUFDWCxRQUFRO0FBQUEsRUFDUixZQUFZO0FBQUEsRUFDWixzQkFBc0I7QUFBQSxFQUN0QixjQUE0QjtBQUFBLEVBQzVCLFlBQTRCO0FBQUEsRUFDNUIsYUFBZ0M7QUFBQSxFQUNoQyxrQkFBaUM7QUFBQSxFQU96QyxPQUFPLE9BQStDO0FBQ3BELFFBQUksTUFBTSxnQkFBZ0IsTUFBTyxRQUFPLENBQUM7QUFDekMsVUFBTSxVQUEyQixDQUFDO0FBQ2xDLFFBQUksTUFBTSxTQUFTLGVBQWU7QUFDaEMsVUFBSSxLQUFLLHVCQUF3QixLQUFLLG9CQUFvQixLQUFLO0FBQzdELGdCQUFRLEtBQUssRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2hELGFBQU87QUFBQSxJQUNUO0FBRUEsUUFBSSxNQUFNLFNBQVMsUUFBUTtBQUN6QixXQUFLLGFBQWE7QUFDbEIsV0FBSyxrQkFBa0IsTUFBTTtBQUM3QixVQUFJLEtBQUssaUJBQWtCLE1BQUssa0JBQWtCLE9BQU8sT0FBTztBQUNoRSxhQUFPO0FBQUEsSUFDVDtBQUVBLFFBQUksTUFBTSxTQUFTLFFBQVEsTUFBTSxTQUFTLFVBQVU7QUFDbEQsVUFBSSxLQUFLLG9CQUFvQixRQUFRLE1BQU0sY0FBYyxLQUFLLGdCQUFpQixRQUFPO0FBQ3RGLFdBQUssYUFBYTtBQUNsQixXQUFLLGtCQUFrQjtBQUN2QixVQUFJLEtBQUsscUJBQXFCO0FBQzVCLGFBQUssc0JBQXNCO0FBQzNCLGdCQUFRLEtBQUssRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQUEsTUFDN0M7QUFDQSxVQUFJLE1BQU0sU0FBUyxTQUFVLE1BQUssWUFBWTtBQUM5QyxhQUFPO0FBQUEsSUFDVDtBQUdBLFFBQUksS0FBSyxXQUFZLFFBQU87QUFDNUIsVUFBTSxXQUFXLE1BQU0sVUFBVSxLQUFLLFNBQVMsc0JBQXNCO0FBQ3JFLFFBQUksQ0FBQyxLQUFLLG9CQUFvQixRQUFTLE1BQUssV0FBVyxLQUFLO0FBQzVELFFBQUksS0FBSyxvQkFBb0IsUUFBUyxNQUFLLG1CQUFtQixLQUFLO0FBQ25FLFFBQUksS0FBSyxvQkFBb0IsQ0FBQyxRQUFTLE1BQUssYUFBYSxPQUFPO0FBQ2hFLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFQSxVQUEyQjtBQUN6QixVQUFNLFVBQTJCLENBQUM7QUFDbEMsU0FBSyxZQUFZLE1BQU07QUFDdkIsU0FBSyxpQkFBaUI7QUFDdEIsUUFBSSxLQUFLLG9CQUFxQixTQUFRLEtBQUssRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3pFLFNBQUssc0JBQXNCO0FBQzNCLFNBQUssWUFBWTtBQUNqQixXQUFPO0FBQUEsRUFDVDtBQUFBLEVBRUEsV0FBaUM7QUFDL0IsV0FBTztBQUFBLE1BQ0wsa0JBQWtCLEtBQUs7QUFBQSxNQUN2QixZQUFZLEtBQUs7QUFBQSxNQUNqQixpQkFBaUIsS0FBSztBQUFBLE1BQ3RCLHFCQUFxQixLQUFLO0FBQUEsTUFDMUIsbUJBQW1CLEtBQUs7QUFBQSxNQUN4QixnQkFBZ0IsS0FBSztBQUFBLE1BQ3JCLGlCQUFpQixLQUFLO0FBQUEsSUFDeEI7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUdBLDJCQUFpQztBQUMvQixTQUFLLHNCQUFzQjtBQUFBLEVBQzdCO0FBQUEsRUFFUSxXQUFXLE9BQW9DO0FBQ3JELFNBQUssbUJBQW1CO0FBQ3hCLFNBQUssV0FBVztBQUNoQixTQUFLLFFBQVE7QUFDYixTQUFLLFlBQVk7QUFDakIsU0FBSyxjQUFjLEVBQUUsR0FBRyxNQUFNLEdBQUcsR0FBRyxNQUFNLEVBQUU7QUFDNUMsU0FBSyxZQUFZLEtBQUssVUFBVSxXQUFXLE1BQU07QUFDL0MsVUFDRSxDQUFDLEtBQUssb0JBQ04sS0FBSyxjQUNMLEtBQUssU0FDTCxLQUFLLFlBQ0wsQ0FBQyxLQUFLO0FBRU47QUFDRixXQUFLLFlBQVk7QUFDakIsV0FBSyxXQUFXO0FBQ2hCLFdBQUssaUJBQWlCO0FBQ3RCLFdBQUssV0FBVyxFQUFFLE1BQU0sZUFBZSxPQUFPLEtBQUssWUFBWSxDQUFDO0FBQUEsSUFDbEUsR0FBRyxLQUFLLFNBQVMsV0FBVztBQUFBLEVBQzlCO0FBQUE7QUFBQSxFQUdRLFdBQXFEO0FBQUEsRUFDN0QsY0FBYyxNQUE2QztBQUN6RCxTQUFLLFdBQVc7QUFBQSxFQUNsQjtBQUFBLEVBRVEsbUJBQW1CLE9BQW9DO0FBQzdELFFBQUksQ0FBQyxLQUFLLGVBQWUsS0FBSyxNQUFPO0FBQ3JDLFVBQU0sS0FBSyxNQUFNLElBQUksS0FBSyxZQUFZO0FBQ3RDLFVBQU0sS0FBSyxNQUFNLElBQUksS0FBSyxZQUFZO0FBQ3RDLFFBQUksS0FBSyxNQUFNLElBQUksRUFBRSxJQUFJLEtBQUssU0FBUyxxQkFBcUI7QUFDMUQsV0FBSyxRQUFRO0FBQ2IsV0FBSyxZQUFZLE1BQU07QUFBQSxJQUN6QjtBQUFBLEVBQ0Y7QUFBQSxFQUVRLGtCQUFrQixPQUE4QixTQUFnQztBQUN0RixTQUFLLFdBQVc7QUFDaEIsU0FBSyxZQUFZLE1BQU07QUFDdkIsU0FBSyxpQkFBaUI7QUFDdEIsUUFBSSxLQUFLLFNBQVMsd0JBQXdCLFlBQVksQ0FBQyxLQUFLLHFCQUFxQjtBQUMvRSxXQUFLLHNCQUFzQjtBQUMzQixjQUFRLEtBQUssRUFBRSxNQUFNLHdCQUF3QixPQUFPLEVBQUUsR0FBRyxNQUFNLEdBQUcsR0FBRyxNQUFNLEVBQUUsRUFBRSxDQUFDO0FBQUEsSUFDbEY7QUFBQSxFQUNGO0FBQUEsRUFFUSxhQUFhLFNBQWdDO0FBQ25ELFNBQUssWUFBWSxNQUFNO0FBQ3ZCLFNBQUssbUJBQW1CO0FBQ3hCLFFBQUksQ0FBQyxLQUFLLFlBQVksQ0FBQyxLQUFLLFNBQVMsQ0FBQyxLQUFLLGFBQWEsS0FBSyxhQUFhO0FBQ3hFLFVBQUksS0FBSyxZQUFZO0FBQ25CLGFBQUssaUJBQWlCO0FBQ3RCLGdCQUFRLEtBQUssRUFBRSxNQUFNLHFCQUFxQixPQUFPLEtBQUssWUFBWSxDQUFDO0FBQUEsTUFDckUsT0FBTztBQUNMLGNBQU0sUUFBUSxLQUFLO0FBQ25CLGNBQU0sUUFBUSxLQUFLLFVBQVUsV0FBVyxNQUFNO0FBQzVDLGVBQUssYUFBYTtBQUNsQixlQUFLLFdBQVcsRUFBRSxNQUFNLGNBQWMsTUFBTSxDQUFDO0FBQUEsUUFDL0MsR0FBRyxLQUFLLFNBQVMsV0FBVztBQUM1QixhQUFLLGFBQWEsRUFBRSxPQUFPLE1BQU07QUFBQSxNQUNuQztBQUFBLElBQ0Y7QUFDQSxTQUFLLGNBQWM7QUFBQSxFQUNyQjtBQUFBLEVBRVEsY0FBb0I7QUFDMUIsU0FBSyxZQUFZLE1BQU07QUFDdkIsU0FBSyxtQkFBbUI7QUFDeEIsU0FBSyxhQUFhO0FBQ2xCLFNBQUssV0FBVztBQUNoQixTQUFLLFFBQVE7QUFDYixTQUFLLFlBQVk7QUFDakIsU0FBSyxjQUFjO0FBQ25CLFNBQUssa0JBQWtCO0FBQUEsRUFDekI7QUFBQSxFQUVRLFlBQVksT0FBcUI7QUFDdkMsUUFBSSxVQUFVLFVBQVUsS0FBSyxjQUFjLE1BQU07QUFDL0MsV0FBSyxVQUFVLGFBQWEsS0FBSyxTQUFTO0FBQzFDLFdBQUssWUFBWTtBQUFBLElBQ25CO0FBQUEsRUFDRjtBQUFBLEVBRVEsbUJBQXlCO0FBQy9CLFFBQUksS0FBSyxXQUFZLE1BQUssVUFBVSxhQUFhLEtBQUssV0FBVyxLQUFLO0FBQ3RFLFNBQUssYUFBYTtBQUFBLEVBQ3BCO0FBQ0Y7OztBQzFLTyxJQUFNLG1CQUFOLE1BQXVCO0FBQUEsRUFTNUIsWUFDbUIsTUFDQSxRQUNBLFVBQ0EsT0FDQSxnQkFDakIsWUFBdUIsUUFDdkI7QUFOaUI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUdqQixTQUFLLFVBQVUsSUFBSSxxQkFBcUIsS0FBSyxnQkFBZ0IsR0FBRyxTQUFTO0FBQ3pFLFNBQUssUUFBUSxjQUFjLENBQUMsV0FBVyxLQUFLLFlBQVksTUFBTSxDQUFDO0FBQy9ELFNBQUssVUFBVSxJQUFJO0FBQUEsTUFDakIsS0FBSyxLQUFLLEtBQUs7QUFBQSxNQUNmLE1BQU0sS0FBSyxTQUFTLEVBQUUsYUFBYSxLQUFLLFNBQVMsRUFBRTtBQUFBLElBQ3JEO0FBQUEsRUFDRjtBQUFBLEVBdEJpQjtBQUFBLEVBQ1QsWUFBdUM7QUFBQSxFQUN2QyxXQUFXO0FBQUEsRUFDWCxXQUFXO0FBQUEsRUFDRixZQUErRCxDQUFDO0FBQUEsRUFDaEU7QUFBQSxFQUNULGNBQTRDO0FBQUEsRUFrQnBELFNBQWU7QUFDYixRQUFJLEtBQUssWUFBWSxLQUFLLFNBQVU7QUFDcEMsU0FBSyxXQUFXO0FBQ2hCLFVBQU0sVUFBVSxLQUFLLEtBQUssS0FBSztBQUMvQixlQUFXLFFBQVE7QUFBQSxNQUNqQjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGLEdBQVk7QUFDVixZQUFNLFdBQTBCLENBQUMsUUFBUSxLQUFLLGVBQWUsR0FBbUI7QUFDaEYsY0FBUSxpQkFBaUIsTUFBTSxVQUFVLElBQUk7QUFDN0MsV0FBSyxVQUFVLEtBQUssQ0FBQyxNQUFNLFFBQVEsQ0FBQztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBRUEsVUFBZ0I7QUFDZCxRQUFJLEtBQUssU0FBVTtBQUNuQixTQUFLLFdBQVc7QUFDaEIsU0FBSyxXQUFXO0FBQ2hCLGVBQVcsQ0FBQyxNQUFNLFFBQVEsS0FBSyxLQUFLO0FBQ2xDLFdBQUssS0FBSyxLQUFLLFlBQVksb0JBQW9CLE1BQU0sVUFBVSxJQUFJO0FBQ3JFLFNBQUssVUFBVSxTQUFTO0FBQ3hCLGVBQVcsVUFBVSxLQUFLLFFBQVEsUUFBUSxFQUFHLE1BQUssWUFBWSxNQUFNO0FBQ3BFLFNBQUssUUFBUSxNQUFNO0FBQUEsRUFDckI7QUFBQSxFQUNBLFdBQW1CO0FBQ2pCLFdBQU8sS0FBSyxNQUFNLFlBQVk7QUFBQSxFQUNoQztBQUFBLEVBRVEsZUFBZSxLQUF5QjtBQUM5QyxRQUFJLElBQUksZ0JBQWdCLE1BQU87QUFDL0IsVUFBTSxRQUFRO0FBQUEsTUFDWjtBQUFBLE1BQ0EsS0FBSyxLQUFLLEtBQUssWUFBWSxTQUFTLElBQUksTUFBYztBQUFBLElBQ3hEO0FBQ0EsU0FBSyxjQUFjO0FBQ25CLFNBQUssTUFBTSxNQUFNLEtBQUs7QUFDdEIsVUFBTSxVQUFVLEtBQUssUUFBUSxPQUFPLEtBQUs7QUFDekMsUUFBSSxRQUFRLFdBQVcsRUFBRyxNQUFLLFFBQVEsT0FBTyxPQUFPLEtBQUssUUFBUSxTQUFTLENBQUM7QUFDNUUsZUFBVyxVQUFVLFNBQVM7QUFDNUIsVUFBSSxPQUFPLFNBQVMsd0JBQXlCLEtBQUksZUFBZTtBQUNoRSxXQUFLLFlBQVksTUFBTTtBQUFBLElBQ3pCO0FBQUEsRUFDRjtBQUFBLEVBRVEsWUFBWSxRQUE2QjtBQUMvQyxTQUFLLE1BQU0sUUFBUSxXQUFXLE9BQU8sSUFBSSxFQUFFO0FBQzNDLFlBQVEsT0FBTyxNQUFNO0FBQUEsTUFDbkIsS0FBSztBQUNILFlBQUksQ0FBQyxLQUFLLFdBQVc7QUFDbkIsZ0JBQU0sU0FBUyxLQUFLLE9BQU8scUJBQXFCO0FBQ2hELGNBQUksT0FBTyxHQUFJLE1BQUssWUFBWSxPQUFPO0FBQUEsY0FDbEMsTUFBSyxRQUFRLHlCQUF5QjtBQUFBLFFBQzdDO0FBQ0E7QUFBQSxNQUNGLEtBQUs7QUFDSCxZQUFJLEtBQUssVUFBVyxNQUFLLE9BQU8sWUFBWSxLQUFLLFNBQVM7QUFDMUQsYUFBSyxZQUFZO0FBQ2pCO0FBQUEsTUFDRixLQUFLO0FBQ0gsYUFBSyxlQUFlLEtBQUssU0FBUyxFQUFFLGlCQUFpQixPQUFPLE9BQU8sS0FBSyxNQUFNO0FBQzlFO0FBQUEsTUFDRixLQUFLO0FBQ0gsYUFBSyxlQUFlLEtBQUssU0FBUyxFQUFFLHVCQUF1QixPQUFPLE9BQU8sS0FBSyxNQUFNO0FBQ3BGO0FBQUEsTUFDRixLQUFLO0FBQ0gsYUFBSyxlQUFlLEtBQUssU0FBUyxFQUFFLGtCQUFrQixPQUFPLE9BQU8sS0FBSyxNQUFNO0FBQy9FO0FBQUEsTUFDRjtBQUNFO0FBQUEsSUFDSjtBQUNBLFFBQUksS0FBSyxZQUFhLE1BQUssUUFBUSxPQUFPLEtBQUssYUFBYSxLQUFLLFFBQVEsU0FBUyxHQUFHLE1BQU07QUFBQSxFQUM3RjtBQUFBLEVBRVEsa0JBQWtCO0FBQ3hCLFVBQU0sUUFBUSxLQUFLLFNBQVM7QUFDNUIsV0FBTztBQUFBLE1BQ0wscUJBQXFCLE1BQU07QUFBQSxNQUMzQixhQUFhLE1BQU07QUFBQSxNQUNuQixhQUFhLE1BQU07QUFBQSxNQUNuQixxQkFBcUIsTUFBTTtBQUFBLE1BQzNCLGtCQUFrQixNQUFNO0FBQUEsSUFDMUI7QUFBQSxFQUNGO0FBQ0Y7OztBQ2hITyxJQUFNLHFCQUFOLE1BQXlCO0FBQUEsRUFJOUIsWUFDbUIsS0FDQSxVQUNBLGVBQ2pCLGtCQUNBO0FBSmlCO0FBQ0E7QUFDQTtBQUdqQixTQUFLLG1CQUNILHFCQUNDLENBQUMsU0FBUztBQUNULFlBQU0sUUFBUSxJQUFJLFlBQVksTUFBTSxLQUFLLFNBQVMsRUFBRSxTQUFTO0FBQzdELGFBQU8sSUFBSTtBQUFBLFFBQ1Q7QUFBQSxRQUNBLElBQUksaUJBQWlCLElBQUk7QUFBQSxRQUN6QixLQUFLO0FBQUEsUUFDTDtBQUFBLFFBQ0EsS0FBSztBQUFBLE1BQ1A7QUFBQSxJQUNGO0FBQUEsRUFDSjtBQUFBLEVBckJpQixjQUFjLG9CQUFJLElBQXlDO0FBQUEsRUFDM0Q7QUFBQSxFQXNCakIsT0FBYTtBQUNYLFVBQU0sU0FBUyxJQUFJLElBQUksS0FBSyxJQUFJLFVBQVUsZ0JBQWdCLFlBQVksQ0FBQztBQUN2RSxlQUFXLFFBQVE7QUFDakIsVUFBSSxDQUFDLEtBQUssWUFBWSxJQUFJLElBQUksR0FBRztBQUMvQixjQUFNLGFBQWEsS0FBSyxpQkFBaUIsSUFBSTtBQUM3QyxtQkFBVyxPQUFPO0FBQ2xCLGFBQUssWUFBWSxJQUFJLE1BQU0sVUFBVTtBQUFBLE1BQ3ZDO0FBQ0YsZUFBVyxDQUFDLE1BQU0sVUFBVSxLQUFLLEtBQUs7QUFDcEMsVUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLEdBQUc7QUFDckIsbUJBQVcsUUFBUTtBQUNuQixhQUFLLFlBQVksT0FBTyxJQUFJO0FBQUEsTUFDOUI7QUFBQSxFQUNKO0FBQUEsRUFDQSxVQUFnQjtBQUNkLGVBQVcsY0FBYyxLQUFLLFlBQVksT0FBTyxFQUFHLFlBQVcsUUFBUTtBQUN2RSxTQUFLLFlBQVksTUFBTTtBQUFBLEVBQ3pCO0FBQUEsRUFDQSxVQUFnQjtBQUNkLFNBQUssUUFBUTtBQUNiLFNBQUssS0FBSztBQUFBLEVBQ1o7QUFBQSxFQUNBLGVBQXVCO0FBQ3JCLFdBQU8sS0FBSztBQUFBLE1BQ1YsQ0FBQyxHQUFHLEtBQUssWUFBWSxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxNQUFNLFVBQVUsT0FBTztBQUFBLFFBQzNELE1BQU0sS0FBSyxlQUFlO0FBQUEsUUFDMUIsUUFBUSxLQUFLLE1BQU0sV0FBVyxTQUFTLENBQUM7QUFBQSxNQUMxQyxFQUFFO0FBQUEsTUFDRjtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGOzs7QVg1REEsSUFBcUIsdUJBQXJCLGNBQWtELHdCQUFPO0FBQUEsRUFDdkQsV0FBbUM7QUFBQSxFQUMzQixXQUFzQztBQUFBLEVBQzdCLE9BQU8sSUFBSSxXQUFXO0FBQUEsRUFFdkMsTUFBTSxTQUF3QjtBQUM1QixTQUFLLFdBQVcsa0JBQW1CLE1BQU0sS0FBSyxTQUFTLEtBQU0sQ0FBQyxDQUFDO0FBQy9ELFNBQUssY0FBYyxJQUFJLFlBQVksSUFBSSxDQUFDO0FBQ3hDLFNBQUssV0FBVyxJQUFJO0FBQUEsTUFDbEIsS0FBSztBQUFBLE1BQ0wsTUFBTSxLQUFLO0FBQUEsTUFDWCxDQUFDLFFBQVEsT0FBTyxXQUFXO0FBQ3pCLFlBQUksV0FBVyxPQUFRLE1BQUssS0FBSyxLQUFLLE9BQU8sTUFBTTtBQUFBLGlCQUMxQyxXQUFXLE9BQVEsUUFBTyxxQkFBcUI7QUFBQSxpQkFDL0MsV0FBVyxRQUFTLFFBQU8sUUFBUSxLQUFLO0FBQUEsTUFDbkQ7QUFBQSxJQUNGO0FBQ0EsU0FBSyxjQUFjLEtBQUssSUFBSSxVQUFVLEdBQUcsaUJBQWlCLE1BQU0sS0FBSyxVQUFVLEtBQUssQ0FBQyxDQUFDO0FBQ3RGLFNBQUssSUFBSSxVQUFVLGNBQWMsTUFBTSxLQUFLLFVBQVUsS0FBSyxDQUFDO0FBQzVELFNBQUssV0FBVztBQUFBLE1BQ2QsSUFBSTtBQUFBLE1BQ0osTUFBTTtBQUFBLE1BQ04sVUFBVSxZQUFZO0FBQ3BCLGNBQU0sUUFBUSxLQUFLLFVBQVUsYUFBYSxLQUFLO0FBQy9DLFlBQUk7QUFDRixnQkFBTSxVQUFVLFVBQVUsVUFBVSxLQUFLO0FBQ3pDLGNBQUksd0JBQU8sNEJBQTRCO0FBQUEsUUFDekMsUUFBUTtBQUNOLGNBQUksd0JBQU8sMERBQTBEO0FBQUEsUUFDdkU7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsV0FBaUI7QUFDZixTQUFLLEtBQUssTUFBTTtBQUNoQixTQUFLLFVBQVUsUUFBUTtBQUN2QixTQUFLLFdBQVc7QUFBQSxFQUNsQjtBQUFBLEVBQ0EsTUFBTSxlQUFlLE9BQXVEO0FBQzFFLFNBQUssV0FBVyxrQkFBa0IsRUFBRSxHQUFHLEtBQUssVUFBVSxHQUFHLE1BQU0sQ0FBQztBQUNoRSxVQUFNLEtBQUssU0FBUyxLQUFLLFFBQVE7QUFDakMsU0FBSyxVQUFVLFFBQVE7QUFBQSxFQUN6QjtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAiYWN0aW9ucyIsICJpbXBvcnRfb2JzaWRpYW4iXQp9Cg==
