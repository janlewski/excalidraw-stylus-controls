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
        `S Pen ${event.kind} id:${event.pointerId} buttons:${event.buttons} pressure:${event.pressure.toFixed(2)}`,
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
    const heldNow = (event.buttons & 1) !== 0;
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
      movementThresholdPx: value.movementThresholdPx
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL21lbnUvU3R5bHVzTWVudS50cyIsICJzcmMvc2V0dGluZ3MvU2V0dGluZ3NUYWIudHMiLCAic3JjL3NldHRpbmdzL3NldHRpbmdzLnRzIiwgInNyYy9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2UudHMiLCAic3JjL2V4Y2FsaWRyYXcvY29tcGF0aWJpbGl0eS50cyIsICJzcmMvZGVidWcvRGVidWdMb2dnZXIudHMiLCAic3JjL2RlYnVnL0RlYnVnT3ZlcmxheS50cyIsICJzcmMvc3R5bHVzL25vcm1hbGl6ZVBvaW50ZXJFdmVudC50cyIsICJzcmMvc3R5bHVzL1N0eWx1c0dlc3R1cmVNYWNoaW5lLnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzQ29udHJvbGxlci50cyIsICJzcmMvc3R5bHVzL1N0eWx1c1ZpZXdSZWdpc3RyeS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgTm90aWNlLCBQbHVnaW4gfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IFN0eWx1c01lbnUgfSBmcm9tIFwiLi9tZW51L1N0eWx1c01lbnVcIjtcbmltcG9ydCB7IFNldHRpbmdzVGFiIH0gZnJvbSBcIi4vc2V0dGluZ3MvU2V0dGluZ3NUYWJcIjtcbmltcG9ydCB7XG4gIERFRkFVTFRfU0VUVElOR1MsXG4gIG5vcm1hbGl6ZVNldHRpbmdzLFxuICB0eXBlIFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MsXG59IGZyb20gXCIuL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBTdHlsdXNWaWV3UmVnaXN0cnkgfSBmcm9tIFwiLi9zdHlsdXMvU3R5bHVzVmlld1JlZ2lzdHJ5XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0eWx1c0NvbnRyb2xzUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuICBwcml2YXRlIHJlZ2lzdHJ5OiBTdHlsdXNWaWV3UmVnaXN0cnkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByZWFkb25seSBtZW51ID0gbmV3IFN0eWx1c01lbnUoKTtcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IG5vcm1hbGl6ZVNldHRpbmdzKChhd2FpdCB0aGlzLmxvYWREYXRhKCkpID8/IHt9KTtcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFNldHRpbmdzVGFiKHRoaXMpKTtcbiAgICB0aGlzLnJlZ2lzdHJ5ID0gbmV3IFN0eWx1c1ZpZXdSZWdpc3RyeShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgKCkgPT4gdGhpcy5zZXR0aW5ncyxcbiAgICAgIChhY3Rpb24sIHBvaW50LCBicmlkZ2UpID0+IHtcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJtZW51XCIpIHRoaXMubWVudS5vcGVuKHBvaW50LCBicmlkZ2UpO1xuICAgICAgICBlbHNlIGlmIChhY3Rpb24gPT09IFwiY29weVwiKSBicmlkZ2UuY29weVNlbGVjdGVkRWxlbWVudHMoKTtcbiAgICAgICAgZWxzZSBpZiAoYWN0aW9uID09PSBcInBhc3RlXCIpIGJyaWRnZS5wYXN0ZUF0KHBvaW50KTtcbiAgICAgIH1cbiAgICApO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJsYXlvdXQtY2hhbmdlXCIsICgpID0+IHRoaXMucmVnaXN0cnk/LnN5bmMoKSkpO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHRoaXMucmVnaXN0cnk/LnN5bmMoKSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImNvcHktc3R5bHVzLWV2ZW50LXRyYWNlXCIsXG4gICAgICBuYW1lOiBcIkNvcHkgbGF0ZXN0IHN0eWx1cyBldmVudCB0cmFjZVwiLFxuICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgICAgY29uc3QgdHJhY2UgPSB0aGlzLnJlZ2lzdHJ5Py5leHBvcnRUcmFjZXMoKSA/PyBcIltdXCI7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQodHJhY2UpO1xuICAgICAgICAgIG5ldyBOb3RpY2UoXCJTdHlsdXMgZXZlbnQgdHJhY2UgY29waWVkLlwiKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgbmV3IE5vdGljZShcIlVuYWJsZSB0byBjb3B5IGV2ZW50IHRyYWNlLiBDaGVjayB0aGUgZGV2ZWxvcGVyIGNvbnNvbGUuXCIpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG4gIG9udW5sb2FkKCk6IHZvaWQge1xuICAgIHRoaXMubWVudS5jbG9zZSgpO1xuICAgIHRoaXMucmVnaXN0cnk/LmRpc3Bvc2UoKTtcbiAgICB0aGlzLnJlZ2lzdHJ5ID0gbnVsbDtcbiAgfVxuICBhc3luYyB1cGRhdGVTZXR0aW5ncyhwYXRjaDogUGFydGlhbDxTdHlsdXNDb250cm9sc1NldHRpbmdzPik6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBub3JtYWxpemVTZXR0aW5ncyh7IC4uLnRoaXMuc2V0dGluZ3MsIC4uLnBhdGNoIH0pO1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gICAgdGhpcy5yZWdpc3RyeT8ucmVmcmVzaCgpO1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBFeGNhbGlkcmF3QnJpZGdlIH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZVwiO1xuaW1wb3J0IHR5cGUgeyBQb2ludCB9IGZyb20gXCIuLi9zdHlsdXMvdHlwZXNcIjtcblxuY29uc3QgTUVOVV9NQVJHSU5fUFggPSA4O1xuY29uc3QgRkFMTEJBQ0tfTUVOVV9TSVpFID0geyB3aWR0aDogMTcyLCBoZWlnaHQ6IDMwMCB9O1xuXG5leHBvcnQgZnVuY3Rpb24gY2xhbXBNZW51UG9zaXRpb24oXG4gIHBvaW50OiBQb2ludCxcbiAgdmlld3BvcnQ6IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfSxcbiAgbWVudTogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9XG4pOiBQb2ludCB7XG4gIHJldHVybiB7XG4gICAgeDogTWF0aC5tYXgoTUVOVV9NQVJHSU5fUFgsIE1hdGgubWluKHBvaW50LngsIHZpZXdwb3J0LndpZHRoIC0gbWVudS53aWR0aCAtIE1FTlVfTUFSR0lOX1BYKSksXG4gICAgeTogTWF0aC5tYXgoTUVOVV9NQVJHSU5fUFgsIE1hdGgubWluKHBvaW50LnksIHZpZXdwb3J0LmhlaWdodCAtIG1lbnUuaGVpZ2h0IC0gTUVOVV9NQVJHSU5fUFgpKSxcbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIFN0eWx1c01lbnUge1xuICBwcml2YXRlIGVsZW1lbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgb3V0c2lkZUxpc3RlbmVyOiAoKGV2ZW50OiBQb2ludGVyRXZlbnQpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgb3BlbkdlbmVyYXRpb24gPSAwO1xuXG4gIG9wZW4ocG9pbnQ6IFBvaW50LCBicmlkZ2U6IEV4Y2FsaWRyYXdCcmlkZ2UpOiB2b2lkIHtcbiAgICB0aGlzLmNsb3NlKCk7XG4gICAgY29uc3QgZ2VuZXJhdGlvbiA9IHRoaXMub3BlbkdlbmVyYXRpb247XG4gICAgY29uc3QgbWVudSA9IGRvY3VtZW50LmJvZHkuY3JlYXRlRGl2KHsgY2xzOiBcImV4Y2FsaWRyYXctc3R5bHVzLW1lbnVcIiB9KTtcbiAgICBjb25zdCBhY3Rpb25zOiBBcnJheTxbc3RyaW5nLCAoKSA9PiB2b2lkXT4gPSBbXG4gICAgICBbXCJTZWxlY3Rpb25cIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJzZWxlY3Rpb25cIildLFxuICAgICAgW1wiRnJlZSBkcmF3XCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiZnJlZWRyYXdcIildLFxuICAgICAgW1wiRXJhc2VyXCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiZXJhc2VyXCIpXSxcbiAgICAgIFtcIlJlY3RhbmdsZVwiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcInJlY3RhbmdsZVwiKV0sXG4gICAgICBbXCJBcnJvd1wiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcImFycm93XCIpXSxcbiAgICAgIFtcIkNvcHlcIiwgKCkgPT4gYnJpZGdlLmNvcHlTZWxlY3RlZEVsZW1lbnRzKCldLFxuICAgICAgW1wiUGFzdGVcIiwgKCkgPT4gYnJpZGdlLnBhc3RlQXQocG9pbnQpXSxcbiAgICBdO1xuICAgIGZvciAoY29uc3QgW25hbWUsIGNhbGxiYWNrXSBvZiBhY3Rpb25zKSB7XG4gICAgICBjb25zdCBidXR0b24gPSBtZW51LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcbiAgICAgICAgdGV4dDogbmFtZSxcbiAgICAgICAgY2xzOiBcImV4Y2FsaWRyYXctc3R5bHVzLW1lbnVfX2l0ZW1cIixcbiAgICAgIH0pO1xuICAgICAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVydXBcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhpcy5lbGVtZW50ID0gbWVudTtcbiAgICBjb25zdCBwb3NpdGlvbiA9IGNsYW1wTWVudVBvc2l0aW9uKFxuICAgICAgcG9pbnQsXG4gICAgICB7IHdpZHRoOiB3aW5kb3cuaW5uZXJXaWR0aCwgaGVpZ2h0OiB3aW5kb3cuaW5uZXJIZWlnaHQgfSxcbiAgICAgIHtcbiAgICAgICAgd2lkdGg6IG1lbnUub2Zmc2V0V2lkdGggfHwgRkFMTEJBQ0tfTUVOVV9TSVpFLndpZHRoLFxuICAgICAgICBoZWlnaHQ6IG1lbnUub2Zmc2V0SGVpZ2h0IHx8IEZBTExCQUNLX01FTlVfU0laRS5oZWlnaHQsXG4gICAgICB9XG4gICAgKTtcbiAgICBtZW51LnNldENzc1Byb3BzKHsgbGVmdDogYCR7cG9zaXRpb24ueH1weGAsIHRvcDogYCR7cG9zaXRpb24ueX1weGAgfSk7XG4gICAgd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKGdlbmVyYXRpb24gIT09IHRoaXMub3BlbkdlbmVyYXRpb24gfHwgIXRoaXMuZWxlbWVudCkgcmV0dXJuO1xuICAgICAgdGhpcy5vdXRzaWRlTGlzdGVuZXIgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgaWYgKCF0aGlzLmVsZW1lbnQ/LmNvbnRhaW5zKGV2ZW50LnRhcmdldCBhcyBOb2RlKSkgdGhpcy5jbG9zZSgpO1xuICAgICAgfTtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZG93blwiLCB0aGlzLm91dHNpZGVMaXN0ZW5lciwgdHJ1ZSk7XG4gICAgfSwgMCk7XG4gIH1cbiAgY2xvc2UgPSAoKTogdm9pZCA9PiB7XG4gICAgdGhpcy5vcGVuR2VuZXJhdGlvbiArPSAxO1xuICAgIGlmICh0aGlzLm91dHNpZGVMaXN0ZW5lcilcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZG93blwiLCB0aGlzLm91dHNpZGVMaXN0ZW5lciwgdHJ1ZSk7XG4gICAgdGhpcy5vdXRzaWRlTGlzdGVuZXIgPSBudWxsO1xuICAgIHRoaXMuZWxlbWVudD8ucmVtb3ZlKCk7XG4gICAgdGhpcy5lbGVtZW50ID0gbnVsbDtcbiAgfTtcbn1cbiIsICJpbXBvcnQgeyBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTdHlsdXNDb250cm9sc1BsdWdpbiBmcm9tIFwiLi4vbWFpblwiO1xuaW1wb3J0IHtcbiAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUyxcbiAgcGFyc2VOdW1lcmljU2V0dGluZyxcbiAgdHlwZSBOdW1lcmljU2V0dGluZ0tleSxcbiAgdHlwZSBTdHlsdXNBY3Rpb24sXG59IGZyb20gXCIuL3NldHRpbmdzXCI7XG5cbmNvbnN0IGFjdGlvbnM6IFJlY29yZDxTdHlsdXNBY3Rpb24sIHN0cmluZz4gPSB7XG4gIG1lbnU6IFwiT3BlbiBtZW51XCIsXG4gIGNvcHk6IFwiQ29weVwiLFxuICBwYXN0ZTogXCJQYXN0ZVwiLFxuICBub25lOiBcIkRvIG5vdGhpbmdcIixcbn07XG5cbmV4cG9ydCBjbGFzcyBTZXR0aW5nc1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogU3R5bHVzQ29udHJvbHNQbHVnaW4pIHtcbiAgICBzdXBlcihwbHVnaW4uYXBwLCBwbHVnaW4pO1xuICB9XG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlJlcXVpcmVzIHRoZSBFeGNhbGlkcmF3IGNvbW11bml0eSBwbHVnaW4uIENvcHkgYW5kIHBhc3RlIGF3YWl0IGEgY29tcGF0aWJsZSBFeGNhbGlkcmF3IGludGVncmF0aW9uIGFuZCBhcmUgY3VycmVudGx5IHVuYXZhaWxhYmxlLlwiLFxuICAgIH0pO1xuICAgIHRoaXMuYWN0aW9uKFwiVGFwXCIsIFwiYnV0dG9uVGFwQWN0aW9uXCIpO1xuICAgIHRoaXMuYWN0aW9uKFwiRG91YmxlIHRhcFwiLCBcImJ1dHRvbkRvdWJsZVRhcEFjdGlvblwiKTtcbiAgICB0aGlzLmFjdGlvbihcIkhvbGRcIiwgXCJidXR0b25Ib2xkQWN0aW9uXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJCdXR0b24gKyBwZW4gY29udGFjdFwiKVxuICAgICAgLnNldERlc2MoXCJUZW1wb3JhcnkgdG9vbCB3aGlsZSB0aGUgc2lkZSBidXR0b24gaXMgaGVsZCBkdXJpbmcgcGVuIGNvbnRhY3QuXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PlxuICAgICAgICBkcm9wZG93blxuICAgICAgICAgIC5hZGRPcHRpb24oXCJlcmFzZXJcIiwgXCJUZW1wb3JhcnkgZXJhc2VyXCIpXG4gICAgICAgICAgLmFkZE9wdGlvbihcIm5vbmVcIiwgXCJEbyBub3RoaW5nXCIpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmJ1dHRvbkNvbnRhY3RBY3Rpb24pXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT5cbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHtcbiAgICAgICAgICAgICAgYnV0dG9uQ29udGFjdEFjdGlvbjogdmFsdWUgYXMgXCJlcmFzZXJcIiB8IFwibm9uZVwiLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICApXG4gICAgICApO1xuICAgIHRoaXMubnVtYmVyKFwiRG91YmxlLXRhcCBpbnRlcnZhbCAobXMpXCIsIFwiZG91YmxlVGFwTXNcIik7XG4gICAgdGhpcy5udW1iZXIoXCJMb25nLXByZXNzIGRlbGF5IChtcylcIiwgXCJsb25nUHJlc3NNc1wiKTtcbiAgICB0aGlzLm51bWJlcihcIk1vdmVtZW50IHRocmVzaG9sZCAocHgpXCIsIFwibW92ZW1lbnRUaHJlc2hvbGRQeFwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVidWcgbG9nZ2luZ1wiKVxuICAgICAgLnNldERlc2MoXCJMb2dzIGJvdW5kZWQgcmF3IHBlbiBldmVudCB0cmFjZXMgdG8gdGhlIGRldmVsb3BlciBjb25zb2xlLlwiKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxuICAgICAgICB0b2dnbGVcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVidWdNb2RlKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgZGVidWdNb2RlOiB2YWx1ZSB9KSlcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlYnVnIG92ZXJsYXlcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIlNob3dzIHRoZSBsYXRlc3QgcGVuIGV2ZW50IGFuZCBzdHlsdXMgc3RhdGUgaW4gdGhlIEV4Y2FsaWRyYXcgdmlldy4gUmVxdWlyZXMgZGVidWcgbG9nZ2luZy5cIlxuICAgICAgKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxuICAgICAgICB0b2dnbGVcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVidWdPdmVybGF5KVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgZGVidWdPdmVybGF5OiB2YWx1ZSB9KSlcbiAgICAgICk7XG4gIH1cbiAgcHJpdmF0ZSBhY3Rpb24oXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIGtleTogXCJidXR0b25UYXBBY3Rpb25cIiB8IFwiYnV0dG9uRG91YmxlVGFwQWN0aW9uXCIgfCBcImJ1dHRvbkhvbGRBY3Rpb25cIlxuICApOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRhaW5lckVsKS5zZXROYW1lKGBTIFBlbiBzaWRlIGJ1dHRvbjogJHtuYW1lfWApLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgZm9yIChjb25zdCBbdmFsdWUsIGxhYmVsXSBvZiBPYmplY3QuZW50cmllcyhhY3Rpb25zKSkgZHJvcGRvd24uYWRkT3B0aW9uKHZhbHVlLCBsYWJlbCk7XG4gICAgICBkcm9wZG93blxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Nba2V5XSlcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4gdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBba2V5XTogdmFsdWUgYXMgU3R5bHVzQWN0aW9uIH0pKTtcbiAgICB9KTtcbiAgfVxuICBwcml2YXRlIG51bWJlcihuYW1lOiBzdHJpbmcsIGtleTogTnVtZXJpY1NldHRpbmdLZXkpOiB2b2lkIHtcbiAgICBjb25zdCB7IG1pbiwgbWF4IH0gPSBOVU1FUklDX1NFVFRJTkdfTElNSVRTW2tleV07XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKG5hbWUpXG4gICAgICAuc2V0RGVzYyhgV2hvbGUgbWlsbGlzZWNvbmRzL3BpeGVscyBmcm9tICR7bWlufSB0byAke21heH0uYClcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxuICAgICAgICB0ZXh0LnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5nc1trZXldKSkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VOdW1lcmljU2V0dGluZyhrZXksIHZhbHVlKTtcbiAgICAgICAgICB0ZXh0LmlucHV0RWwuc2V0Q3VzdG9tVmFsaWRpdHkoXG4gICAgICAgICAgICBwYXJzZWQgPT09IG51bGwgPyBgRW50ZXIgYSB3aG9sZSBudW1iZXIgZnJvbSAke21pbn0gdG8gJHttYXh9LmAgOiBcIlwiXG4gICAgICAgICAgKTtcbiAgICAgICAgICBpZiAocGFyc2VkID09PSBudWxsKSByZXR1cm47XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBba2V5XTogcGFyc2VkIH0pO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgfVxufVxuIiwgImV4cG9ydCB0eXBlIFN0eWx1c0FjdGlvbiA9IFwibWVudVwiIHwgXCJjb3B5XCIgfCBcInBhc3RlXCIgfCBcIm5vbmVcIjtcblxuZXhwb3J0IGludGVyZmFjZSBTdHlsdXNDb250cm9sc1NldHRpbmdzIHtcbiAgYnV0dG9uVGFwQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gIGJ1dHRvbkRvdWJsZVRhcEFjdGlvbjogU3R5bHVzQWN0aW9uO1xuICBidXR0b25Ib2xkQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gIGJ1dHRvbkNvbnRhY3RBY3Rpb246IFwiZXJhc2VyXCIgfCBcIm5vbmVcIjtcbiAgZG91YmxlVGFwTXM6IG51bWJlcjtcbiAgbG9uZ1ByZXNzTXM6IG51bWJlcjtcbiAgbW92ZW1lbnRUaHJlc2hvbGRQeDogbnVtYmVyO1xuICBkZWJ1Z01vZGU6IGJvb2xlYW47XG4gIGRlYnVnT3ZlcmxheTogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgPSB7XG4gIGJ1dHRvblRhcEFjdGlvbjogXCJtZW51XCIsXG4gIGJ1dHRvbkRvdWJsZVRhcEFjdGlvbjogXCJjb3B5XCIsXG4gIGJ1dHRvbkhvbGRBY3Rpb246IFwicGFzdGVcIixcbiAgYnV0dG9uQ29udGFjdEFjdGlvbjogXCJlcmFzZXJcIixcbiAgZG91YmxlVGFwTXM6IDMwMCxcbiAgbG9uZ1ByZXNzTXM6IDQ1MCxcbiAgbW92ZW1lbnRUaHJlc2hvbGRQeDogOCxcbiAgZGVidWdNb2RlOiBmYWxzZSxcbiAgZGVidWdPdmVybGF5OiBmYWxzZSxcbn07XG5cbmV4cG9ydCBjb25zdCBOVU1FUklDX1NFVFRJTkdfTElNSVRTID0ge1xuICBkb3VibGVUYXBNczogeyBtaW46IDEwMCwgbWF4OiAxMDAwIH0sXG4gIGxvbmdQcmVzc01zOiB7IG1pbjogMTUwLCBtYXg6IDIwMDAgfSxcbiAgbW92ZW1lbnRUaHJlc2hvbGRQeDogeyBtaW46IDEsIG1heDogMTAwIH0sXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBOdW1lcmljU2V0dGluZ0tleSA9IGtleW9mIHR5cGVvZiBOVU1FUklDX1NFVFRJTkdfTElNSVRTO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VOdW1lcmljU2V0dGluZyhrZXk6IE51bWVyaWNTZXR0aW5nS2V5LCB2YWx1ZTogc3RyaW5nKTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IHBhcnNlZCA9IE51bWJlcih2YWx1ZSk7XG4gIGNvbnN0IHsgbWluLCBtYXggfSA9IE5VTUVSSUNfU0VUVElOR19MSU1JVFNba2V5XTtcbiAgcmV0dXJuIE51bWJlci5pc0ludGVnZXIocGFyc2VkKSAmJiBwYXJzZWQgPj0gbWluICYmIHBhcnNlZCA8PSBtYXggPyBwYXJzZWQgOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU2V0dGluZ3ModmFsdWU6IFBhcnRpYWw8U3R5bHVzQ29udHJvbHNTZXR0aW5ncz4pOiBTdHlsdXNDb250cm9sc1NldHRpbmdzIHtcbiAgY29uc3QgYWN0aW9uID0gKGNhbmRpZGF0ZTogdW5rbm93biwgZmFsbGJhY2s6IFN0eWx1c0FjdGlvbik6IFN0eWx1c0FjdGlvbiA9PlxuICAgIGNhbmRpZGF0ZSA9PT0gXCJtZW51XCIgfHwgY2FuZGlkYXRlID09PSBcImNvcHlcIiB8fCBjYW5kaWRhdGUgPT09IFwicGFzdGVcIiB8fCBjYW5kaWRhdGUgPT09IFwibm9uZVwiXG4gICAgICA/IGNhbmRpZGF0ZVxuICAgICAgOiBmYWxsYmFjaztcbiAgY29uc3QgbnVtYmVyID0gKGNhbmRpZGF0ZTogdW5rbm93biwgZmFsbGJhY2s6IG51bWJlciwgbWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyID0+XG4gICAgdHlwZW9mIGNhbmRpZGF0ZSA9PT0gXCJudW1iZXJcIiAmJiBOdW1iZXIuaXNGaW5pdGUoY2FuZGlkYXRlKVxuICAgICAgPyBNYXRoLm1pbihtYXgsIE1hdGgubWF4KG1pbiwgTWF0aC5yb3VuZChjYW5kaWRhdGUpKSlcbiAgICAgIDogZmFsbGJhY2s7XG4gIHJldHVybiB7XG4gICAgYnV0dG9uVGFwQWN0aW9uOiBhY3Rpb24odmFsdWUuYnV0dG9uVGFwQWN0aW9uLCBERUZBVUxUX1NFVFRJTkdTLmJ1dHRvblRhcEFjdGlvbiksXG4gICAgYnV0dG9uRG91YmxlVGFwQWN0aW9uOiBhY3Rpb24oXG4gICAgICB2YWx1ZS5idXR0b25Eb3VibGVUYXBBY3Rpb24sXG4gICAgICBERUZBVUxUX1NFVFRJTkdTLmJ1dHRvbkRvdWJsZVRhcEFjdGlvblxuICAgICksXG4gICAgYnV0dG9uSG9sZEFjdGlvbjogYWN0aW9uKHZhbHVlLmJ1dHRvbkhvbGRBY3Rpb24sIERFRkFVTFRfU0VUVElOR1MuYnV0dG9uSG9sZEFjdGlvbiksXG4gICAgYnV0dG9uQ29udGFjdEFjdGlvbjogdmFsdWUuYnV0dG9uQ29udGFjdEFjdGlvbiA9PT0gXCJub25lXCIgPyBcIm5vbmVcIiA6IFwiZXJhc2VyXCIsXG4gICAgZG91YmxlVGFwTXM6IG51bWJlcihcbiAgICAgIHZhbHVlLmRvdWJsZVRhcE1zLFxuICAgICAgMzAwLFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5kb3VibGVUYXBNcy5taW4sXG4gICAgICBOVU1FUklDX1NFVFRJTkdfTElNSVRTLmRvdWJsZVRhcE1zLm1heFxuICAgICksXG4gICAgbG9uZ1ByZXNzTXM6IG51bWJlcihcbiAgICAgIHZhbHVlLmxvbmdQcmVzc01zLFxuICAgICAgNDUwLFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5sb25nUHJlc3NNcy5taW4sXG4gICAgICBOVU1FUklDX1NFVFRJTkdfTElNSVRTLmxvbmdQcmVzc01zLm1heFxuICAgICksXG4gICAgbW92ZW1lbnRUaHJlc2hvbGRQeDogbnVtYmVyKFxuICAgICAgdmFsdWUubW92ZW1lbnRUaHJlc2hvbGRQeCxcbiAgICAgIDgsXG4gICAgICBOVU1FUklDX1NFVFRJTkdfTElNSVRTLm1vdmVtZW50VGhyZXNob2xkUHgubWluLFxuICAgICAgTlVNRVJJQ19TRVRUSU5HX0xJTUlUUy5tb3ZlbWVudFRocmVzaG9sZFB4Lm1heFxuICAgICksXG4gICAgZGVidWdNb2RlOiB2YWx1ZS5kZWJ1Z01vZGUgPT09IHRydWUsXG4gICAgZGVidWdPdmVybGF5OiB2YWx1ZS5kZWJ1Z092ZXJsYXkgPT09IHRydWUsXG4gIH07XG59XG4iLCAiaW1wb3J0IHsgTm90aWNlLCB0eXBlIFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5pbXBvcnQge1xuICBnZXRMZWFmQXBpLFxuICByZWFkQWN0aXZlVG9vbCxcbiAgdHlwZSBBY3RpdmVUb29sU25hcHNob3QsXG4gIHR5cGUgQnJpZGdlT3BlcmF0aW9uUmVzdWx0LFxuICB0eXBlIEJyaWRnZVJlc3VsdCxcbiAgdHlwZSBDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaSxcbn0gZnJvbSBcIi4vY29tcGF0aWJpbGl0eVwiO1xuXG5leHBvcnQgdHlwZSB7XG4gIEFjdGl2ZVRvb2xTbmFwc2hvdCxcbiAgQnJpZGdlRmFpbHVyZUNvZGUsXG4gIEJyaWRnZU9wZXJhdGlvblJlc3VsdCxcbiAgQnJpZGdlUmVzdWx0LFxufSBmcm9tIFwiLi9jb21wYXRpYmlsaXR5XCI7XG5cbi8qKiBDb21wYXRpYmlsaXR5IGJvdW5kYXJ5IGZvciB0aGUgb3B0aW9uYWwgRXhjYWxpZHJhdyBwbHVnaW4uICovXG5leHBvcnQgY2xhc3MgRXhjYWxpZHJhd0JyaWRnZSB7XG4gIHByaXZhdGUgd2FybmVkID0gZmFsc2U7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgbGVhZjogV29ya3NwYWNlTGVhZikge31cblxuICBzdGFydFRlbXBvcmFyeUVyYXNlcigpOiBCcmlkZ2VSZXN1bHQ8QWN0aXZlVG9vbFNuYXBzaG90PiB7XG4gICAgY29uc3QgYXBpUmVzdWx0ID0gdGhpcy5nZXRBcGkoKTtcbiAgICBpZiAoIWFwaVJlc3VsdC5vaykgcmV0dXJuIHRoaXMucmVwb3J0KGFwaVJlc3VsdCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRvb2wgPSByZWFkQWN0aXZlVG9vbChhcGlSZXN1bHQudmFsdWUpO1xuICAgICAgaWYgKCF0b29sKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXG4gICAgICAgICAgXCJpbmNvbXBhdGlibGVcIixcbiAgICAgICAgICBcIlRlbXBvcmFyeSBlcmFzZXIgY291bGQgbm90IHJlYWQgdGhlIGN1cnJlbnQgYWN0aXZlIHRvb2wuXCJcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGFwaVJlc3VsdC52YWx1ZS5zZXRBY3RpdmVUb29sKHsgdHlwZTogXCJlcmFzZXJcIiB9KTtcbiAgICAgIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogdG9vbCB9O1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHRoaXMuZmFpbHVyZShcImZhaWxlZFwiLCBcIlRlbXBvcmFyeSBlcmFzZXIgaXMgdW5hdmFpbGFibGUgaW4gdGhpcyBFeGNhbGlkcmF3IHZpZXcuXCIpO1xuICAgIH1cbiAgfVxuICByZXN0b3JlVG9vbCh0b29sOiBBY3RpdmVUb29sU25hcHNob3QpOiBCcmlkZ2VPcGVyYXRpb25SZXN1bHQge1xuICAgIGNvbnN0IGFwaVJlc3VsdCA9IHRoaXMuZ2V0QXBpKCk7XG4gICAgaWYgKCFhcGlSZXN1bHQub2spIHJldHVybiB0aGlzLnJlcG9ydChhcGlSZXN1bHQpO1xuICAgIHRyeSB7XG4gICAgICBhcGlSZXN1bHQudmFsdWUuc2V0QWN0aXZlVG9vbCh0b29sKTtcbiAgICAgIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogdW5kZWZpbmVkIH07XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFxuICAgICAgICBcImZhaWxlZFwiLFxuICAgICAgICBcIlRoZSBwcmV2aW91cyB0b29sIGNvdWxkIG5vdCBiZSByZXN0b3JlZCBpbiB0aGlzIEV4Y2FsaWRyYXcgdmlldy5cIlxuICAgICAgKTtcbiAgICB9XG4gIH1cbiAgc2V0VG9vbCh0eXBlOiBzdHJpbmcpOiBCcmlkZ2VPcGVyYXRpb25SZXN1bHQge1xuICAgIGNvbnN0IGFwaVJlc3VsdCA9IHRoaXMuZ2V0QXBpKCk7XG4gICAgaWYgKCFhcGlSZXN1bHQub2spIHJldHVybiB0aGlzLnJlcG9ydChhcGlSZXN1bHQpO1xuICAgIHRyeSB7XG4gICAgICBhcGlSZXN1bHQudmFsdWUuc2V0QWN0aXZlVG9vbCh7IHR5cGUgfSk7XG4gICAgICByZXR1cm4geyBvazogdHJ1ZSwgdmFsdWU6IHVuZGVmaW5lZCB9O1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHRoaXMuZmFpbHVyZShcImZhaWxlZFwiLCBcIlRvb2wgc3dpdGNoaW5nIGlzIHVuYXZhaWxhYmxlIGluIHRoaXMgRXhjYWxpZHJhdyB2aWV3LlwiKTtcbiAgICB9XG4gIH1cbiAgY29weVNlbGVjdGVkRWxlbWVudHMoKTogQnJpZGdlT3BlcmF0aW9uUmVzdWx0IHtcbiAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwidW5hdmFpbGFibGVcIiwgXCJDb3B5IHJlcXVpcmVzIGEgY29tcGF0aWJsZSBFeGNhbGlkcmF3IEFQSS5cIik7XG4gIH1cbiAgcGFzdGVBdChwb2ludDogUG9pbnQpOiBCcmlkZ2VPcGVyYXRpb25SZXN1bHQge1xuICAgIHZvaWQgcG9pbnQ7XG4gICAgcmV0dXJuIHRoaXMuZmFpbHVyZShcInVuYXZhaWxhYmxlXCIsIFwiUGFzdGUgcmVxdWlyZXMgYSBjb21wYXRpYmxlIEV4Y2FsaWRyYXcgQVBJLlwiKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0QXBpKCk6IEJyaWRnZVJlc3VsdDxDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaT4ge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZ2V0TGVhZkFwaSh0aGlzLmxlYWYudmlldyk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvazogZmFsc2UsXG4gICAgICAgIGNvZGU6IFwiZmFpbGVkXCIsXG4gICAgICAgIG1lc3NhZ2U6IFwiRXhjYWxpZHJhdyBBUEkgbG9va3VwIGZhaWxlZCBmb3IgdGhpcyBsZWFmLlwiLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlcG9ydDxUPihyZXN1bHQ6IEV4Y2x1ZGU8QnJpZGdlUmVzdWx0PFQ+LCB7IG9rOiB0cnVlIH0+KTogQnJpZGdlUmVzdWx0PG5ldmVyPiB7XG4gICAgdGhpcy51bnN1cHBvcnRlZChyZXN1bHQubWVzc2FnZSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBwcml2YXRlIGZhaWx1cmUoXG4gICAgY29kZTogXCJ1bmF2YWlsYWJsZVwiIHwgXCJpbmNvbXBhdGlibGVcIiB8IFwiZmFpbGVkXCIsXG4gICAgbWVzc2FnZTogc3RyaW5nXG4gICk6IEJyaWRnZVJlc3VsdDxuZXZlcj4ge1xuICAgIHRoaXMudW5zdXBwb3J0ZWQobWVzc2FnZSk7XG4gICAgcmV0dXJuIHsgb2s6IGZhbHNlLCBjb2RlLCBtZXNzYWdlIH07XG4gIH1cbiAgcHJpdmF0ZSB1bnN1cHBvcnRlZChtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMud2FybmVkKSB7XG4gICAgICBuZXcgTm90aWNlKGBFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9sczogJHttZXNzYWdlfWApO1xuICAgICAgdGhpcy53YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgQWN0aXZlVG9vbFNuYXBzaG90IHtcbiAgdHlwZTogc3RyaW5nO1xuICBba2V5OiBzdHJpbmddOiB1bmtub3duO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltcGVyYXRpdmVBcGkge1xuICBnZXRBcHBTdGF0ZT86ICgpID0+IHsgYWN0aXZlVG9vbD86IEFjdGl2ZVRvb2xTbmFwc2hvdCB9O1xuICBzZXRBY3RpdmVUb29sPzogKHRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaSBleHRlbmRzIEltcGVyYXRpdmVBcGkge1xuICBnZXRBcHBTdGF0ZTogKCkgPT4geyBhY3RpdmVUb29sPzogQWN0aXZlVG9vbFNuYXBzaG90IH07XG4gIHNldEFjdGl2ZVRvb2w6ICh0b29sOiBBY3RpdmVUb29sU25hcHNob3QpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCB0eXBlIEJyaWRnZUZhaWx1cmVDb2RlID0gXCJ1bmF2YWlsYWJsZVwiIHwgXCJpbmNvbXBhdGlibGVcIiB8IFwiZmFpbGVkXCI7XG5cbmV4cG9ydCB0eXBlIEJyaWRnZVJlc3VsdDxUPiA9XG4gIHsgb2s6IHRydWU7IHZhbHVlOiBUIH0gfCB7IG9rOiBmYWxzZTsgY29kZTogQnJpZGdlRmFpbHVyZUNvZGU7IG1lc3NhZ2U6IHN0cmluZyB9O1xuXG5leHBvcnQgdHlwZSBCcmlkZ2VPcGVyYXRpb25SZXN1bHQgPSBCcmlkZ2VSZXN1bHQ8dm9pZD47XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXhjYWxpZHJhd0xlYWZTdXJmYWNlIHtcbiAgLyoqXG4gICAqIFRoaXMgaXMgYSBjb21wYXRpYmlsaXR5IGZhbGxiYWNrLCBub3QgYSBkb2N1bWVudGVkIEV4Y2FsaWRyYXcgcGx1Z2luIEFQSS5cbiAgICogS2VlcCBhY2Nlc3MgdG8gaXQgaGVyZSB1bnRpbCBFeGNhbGlkcmF3IHB1Ymxpc2hlcyBhIHRoaXJkLXBhcnR5LCBsZWFmLXNjb3BlZFxuICAgKiBpbnRlZ3JhdGlvbiBwb2ludC5cbiAgICovXG4gIGV4Y2FsaWRyYXdBUEk/OiB1bmtub3duO1xufVxuXG4vKiogVGhlIGRvY3VtZW50ZWQsIHZpZXctdGFyZ2V0ZWQgcG9ydGlvbiBvZiBFeGNhbGlkcmF3QXV0b21hdGUgdXNlZCBieSB0aGlzIHBsdWdpbi4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXhjYWxpZHJhd0F1dG9tYXRlU3VyZmFjZSB7XG4gIHNldFZpZXc6ICh2aWV3OiB1bmtub3duKSA9PiB1bmtub3duO1xuICBnZXRFeGNhbGlkcmF3QVBJOiAoKSA9PiB1bmtub3duO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRvb2xDYXBhYmlsaXRpZXMge1xuICBjYW5SZWFkQWN0aXZlVG9vbDogYm9vbGVhbjtcbiAgY2FuU2V0QWN0aXZlVG9vbDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvb2xDYXBhYmlsaXRpZXMoYXBpOiBJbXBlcmF0aXZlQXBpIHwgbnVsbCk6IFRvb2xDYXBhYmlsaXRpZXMge1xuICByZXR1cm4ge1xuICAgIGNhblJlYWRBY3RpdmVUb29sOiB0eXBlb2YgYXBpPy5nZXRBcHBTdGF0ZSA9PT0gXCJmdW5jdGlvblwiLFxuICAgIGNhblNldEFjdGl2ZVRvb2w6IHR5cGVvZiBhcGk/LnNldEFjdGl2ZVRvb2wgPT09IFwiZnVuY3Rpb25cIixcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBY3RpdmVUb29sKGFwaTogSW1wZXJhdGl2ZUFwaSk6IEFjdGl2ZVRvb2xTbmFwc2hvdCB8IG51bGwge1xuICBjb25zdCBhY3RpdmVUb29sID0gYXBpLmdldEFwcFN0YXRlPy4oKS5hY3RpdmVUb29sO1xuICByZXR1cm4gYWN0aXZlVG9vbCA/IHsgLi4uYWN0aXZlVG9vbCB9IDogbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldExlYWZBcGkoXG4gIHZpZXc6IHVua25vd24sXG4gIGF1dG9tYXRlID0gZ2V0R2xvYmFsQXV0b21hdGUoKVxuKTogQnJpZGdlUmVzdWx0PENvbXBhdGlibGVJbXBlcmF0aXZlQXBpPiB7XG4gIGlmICghdmlldyB8fCB0eXBlb2YgdmlldyAhPT0gXCJvYmplY3RcIikge1xuICAgIHJldHVybiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBjb2RlOiBcInVuYXZhaWxhYmxlXCIsXG4gICAgICBtZXNzYWdlOiBcIlRoaXMgbGVhZiBkb2VzIG5vdCBleHBvc2UgYW4gRXhjYWxpZHJhdyB2aWV3LlwiLFxuICAgIH07XG4gIH1cbiAgaWYgKGF1dG9tYXRlKSB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIEV4Y2FsaWRyYXdBdXRvbWF0ZSBkb2N1bWVudHMgc2V0Vmlldyh2aWV3KSBzcGVjaWZpY2FsbHkgc28gb3BlcmF0aW9uc1xuICAgICAgLy8gYXJlIHNjb3BlZCB0byB0aGF0IHZpZXcuIE5ldmVyIHBhc3MgXCJhY3RpdmVcIiBoZXJlLlxuICAgICAgYXV0b21hdGUuc2V0Vmlldyh2aWV3KTtcbiAgICAgIHJldHVybiB2YWxpZGF0ZUltcGVyYXRpdmVBcGkoYXV0b21hdGUuZ2V0RXhjYWxpZHJhd0FQSSgpKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgY29kZTogXCJmYWlsZWRcIixcbiAgICAgICAgbWVzc2FnZTogXCJFeGNhbGlkcmF3IGNvdWxkIG5vdCB0YXJnZXQgdGhpcyBsZWFmJ3MgY2FudmFzLlwiLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvLyBUaGlzIGZhbGxiYWNrIGlzIGRlbGliZXJhdGVseSBpc29sYXRlZDogaXQgaXMgbm90IHBhcnQgb2YgRXhjYWxpZHJhdydzXG4gIC8vIGRvY3VtZW50ZWQgdGhpcmQtcGFydHkgQVBJIHN1cmZhY2UuXG4gIGNvbnN0IGFwaSA9ICh2aWV3IGFzIEV4Y2FsaWRyYXdMZWFmU3VyZmFjZSkuZXhjYWxpZHJhd0FQSTtcbiAgcmV0dXJuIHZhbGlkYXRlSW1wZXJhdGl2ZUFwaShhcGkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2xvYmFsQXV0b21hdGUoKTogRXhjYWxpZHJhd0F1dG9tYXRlU3VyZmFjZSB8IG51bGwge1xuICBjb25zdCBjYW5kaWRhdGUgPSAoZ2xvYmFsVGhpcyBhcyB7IEV4Y2FsaWRyYXdBdXRvbWF0ZT86IHVua25vd24gfSkuRXhjYWxpZHJhd0F1dG9tYXRlO1xuICBpZiAoXG4gICAgY2FuZGlkYXRlICYmXG4gICAgdHlwZW9mIGNhbmRpZGF0ZSA9PT0gXCJvYmplY3RcIiAmJlxuICAgIHR5cGVvZiAoY2FuZGlkYXRlIGFzIEV4Y2FsaWRyYXdBdXRvbWF0ZVN1cmZhY2UpLnNldFZpZXcgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgIHR5cGVvZiAoY2FuZGlkYXRlIGFzIEV4Y2FsaWRyYXdBdXRvbWF0ZVN1cmZhY2UpLmdldEV4Y2FsaWRyYXdBUEkgPT09IFwiZnVuY3Rpb25cIlxuICApIHtcbiAgICByZXR1cm4gY2FuZGlkYXRlIGFzIEV4Y2FsaWRyYXdBdXRvbWF0ZVN1cmZhY2U7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlSW1wZXJhdGl2ZUFwaShhcGk6IHVua25vd24pOiBCcmlkZ2VSZXN1bHQ8Q29tcGF0aWJsZUltcGVyYXRpdmVBcGk+IHtcbiAgaWYgKCFhcGkgfHwgdHlwZW9mIGFwaSAhPT0gXCJvYmplY3RcIikge1xuICAgIHJldHVybiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBjb2RlOiBcInVuYXZhaWxhYmxlXCIsXG4gICAgICBtZXNzYWdlOiBcIkV4Y2FsaWRyYXcgaGFzIG5vdCBtYWRlIGFuIEFQSSBhdmFpbGFibGUgZm9yIHRoaXMgbGVhZi5cIixcbiAgICB9O1xuICB9XG4gIGNvbnN0IGNhcGFiaWxpdGllcyA9IHRvb2xDYXBhYmlsaXRpZXMoYXBpIGFzIEltcGVyYXRpdmVBcGkpO1xuICBpZiAoIWNhcGFiaWxpdGllcy5jYW5SZWFkQWN0aXZlVG9vbCB8fCAhY2FwYWJpbGl0aWVzLmNhblNldEFjdGl2ZVRvb2wpIHtcbiAgICByZXR1cm4ge1xuICAgICAgb2s6IGZhbHNlLFxuICAgICAgY29kZTogXCJpbmNvbXBhdGlibGVcIixcbiAgICAgIG1lc3NhZ2U6IFwiVGhpcyBFeGNhbGlkcmF3IEFQSSBkb2VzIG5vdCBzdXBwb3J0IGFjdGl2ZS10b29sIHJlYWQgYW5kIHdyaXRlIG9wZXJhdGlvbnMuXCIsXG4gICAgfTtcbiAgfVxuICByZXR1cm4geyBvazogdHJ1ZSwgdmFsdWU6IGFwaSBhcyBDb21wYXRpYmxlSW1wZXJhdGl2ZUFwaSB9O1xufVxuIiwgImltcG9ydCB0eXBlIHsgTm9ybWFsaXplZFN0eWx1c0V2ZW50IH0gZnJvbSBcIi4uL3N0eWx1cy90eXBlc1wiO1xuXG5leHBvcnQgY2xhc3MgRGVidWdMb2dnZXIge1xuICBwcml2YXRlIHRyYWNlOiBOb3JtYWxpemVkU3R5bHVzRXZlbnRbXSA9IFtdO1xuICBwcml2YXRlIGxhc3RNb3ZlTG9nQXQgPSAtSW5maW5pdHk7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZW5hYmxlZDogKCkgPT4gYm9vbGVhbikge31cblxuICBldmVudChldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZWQoKSkgcmV0dXJuO1xuICAgIGlmIChldmVudC5raW5kID09PSBcIm1vdmVcIiAmJiBldmVudC50aW1lc3RhbXAgLSB0aGlzLmxhc3RNb3ZlTG9nQXQgPCAxMDApIHJldHVybjtcbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJtb3ZlXCIpIHRoaXMubGFzdE1vdmVMb2dBdCA9IGV2ZW50LnRpbWVzdGFtcDtcbiAgICB0aGlzLnRyYWNlLnB1c2goZXZlbnQpO1xuICAgIGlmICh0aGlzLnRyYWNlLmxlbmd0aCA+IDEwMCkgdGhpcy50cmFjZS5zaGlmdCgpO1xuICAgIGNvbnNvbGUuZGVidWcoXCJbRXhjYWxpZHJhdyBTdHlsdXMgQ29udHJvbHNdXCIsIGV2ZW50KTtcbiAgfVxuICBtZXNzYWdlKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICh0aGlzLmVuYWJsZWQoKSkgY29uc29sZS5kZWJ1ZyhcIltFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9sc11cIiwgbWVzc2FnZSk7XG4gIH1cbiAgZXhwb3J0VHJhY2UoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy50cmFjZSwgbnVsbCwgMik7XG4gIH1cbiAgY2xlYXIoKTogdm9pZCB7XG4gICAgdGhpcy50cmFjZSA9IFtdO1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBHZXN0dXJlRWZmZWN0LCBHZXN0dXJlU3RhdGVTbmFwc2hvdCwgTm9ybWFsaXplZFN0eWx1c0V2ZW50IH0gZnJvbSBcIi4uL3N0eWx1cy90eXBlc1wiO1xuXG4vKiogQSBkaWFnbm9zdGljLW9ubHksIG5vbi1pbnRlcmFjdGl2ZSBvdmVybGF5IGxvY2FsIHRvIG9uZSBFeGNhbGlkcmF3IHZpZXcuICovXG5leHBvcnQgY2xhc3MgRGVidWdPdmVybGF5IHtcbiAgcHJpdmF0ZSBlbGVtZW50OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29udGFpbmVyOiBIVE1MRWxlbWVudCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVuYWJsZWQ6ICgpID0+IGJvb2xlYW5cbiAgKSB7fVxuXG4gIHVwZGF0ZShldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50LCBzdGF0ZTogR2VzdHVyZVN0YXRlU25hcHNob3QsIGVmZmVjdD86IEdlc3R1cmVFZmZlY3QpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCgpKSB7XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG92ZXJsYXkgPSB0aGlzLmVuc3VyZUVsZW1lbnQoKTtcbiAgICBjb25zdCBzdGF0ZVN1bW1hcnkgPSBbXG4gICAgICBgaG92ZXI6JHtTdHJpbmcoIXN0YXRlLnBlbkNvbnRhY3QpfWAsXG4gICAgICBgYmFycmVsOiR7U3RyaW5nKHN0YXRlLmJhcnJlbEJ1dHRvbkhlbGQpfWAsXG4gICAgICBgY29uc3VtZWQ6JHtTdHJpbmcoc3RhdGUuZ2VzdHVyZUNvbnN1bWVkKX1gLFxuICAgICAgYHRlbXA6JHtTdHJpbmcoc3RhdGUudGVtcG9yYXJ5VG9vbEFjdGl2ZSl9YCxcbiAgICBdLmpvaW4oXCIgXHUwMEI3IFwiKTtcbiAgICBvdmVybGF5LnNldFRleHQoXG4gICAgICBbXG4gICAgICAgIGBTIFBlbiAke2V2ZW50LmtpbmR9IGlkOiR7ZXZlbnQucG9pbnRlcklkfSBidXR0b25zOiR7ZXZlbnQuYnV0dG9uc30gcHJlc3N1cmU6JHtldmVudC5wcmVzc3VyZS50b0ZpeGVkKDIpfWAsXG4gICAgICAgIHN0YXRlU3VtbWFyeSxcbiAgICAgICAgYGVmZmVjdDoke2VmZmVjdD8udHlwZSA/PyBcIm5vbmVcIn1gLFxuICAgICAgXS5qb2luKFwiXFxuXCIpXG4gICAgKTtcbiAgfVxuXG4gIGNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuZWxlbWVudD8ucmVtb3ZlKCk7XG4gICAgdGhpcy5lbGVtZW50ID0gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlRWxlbWVudCgpOiBIVE1MRWxlbWVudCB7XG4gICAgaWYgKHRoaXMuZWxlbWVudCkgcmV0dXJuIHRoaXMuZWxlbWVudDtcbiAgICB0aGlzLmVsZW1lbnQgPSB0aGlzLmNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtZGVidWctb3ZlcmxheVwiIH0pO1xuICAgIHJldHVybiB0aGlzLmVsZW1lbnQ7XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgU3R5bHVzRXZlbnRLaW5kIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuY29uc3QgZXZlbnRLaW5kczogUmVjb3JkPHN0cmluZywgU3R5bHVzRXZlbnRLaW5kPiA9IHtcbiAgcG9pbnRlcmRvd246IFwiZG93blwiLFxuICBwb2ludGVybW92ZTogXCJtb3ZlXCIsXG4gIHBvaW50ZXJ1cDogXCJ1cFwiLFxuICBwb2ludGVyY2FuY2VsOiBcImNhbmNlbFwiLFxuICBjb250ZXh0bWVudTogXCJjb250ZXh0bWVudVwiLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVBvaW50ZXJFdmVudChcbiAgZXZlbnQ6IFBvaW50ZXJFdmVudCxcbiAgaXNDYW52YXNUYXJnZXQ6IGJvb2xlYW5cbik6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCB7XG4gIHJldHVybiB7XG4gICAga2luZDogZXZlbnRLaW5kc1tldmVudC50eXBlXSA/PyBcIm1vdmVcIixcbiAgICBwb2ludGVyVHlwZTogZXZlbnQucG9pbnRlclR5cGUsXG4gICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgYnV0dG9uczogZXZlbnQuYnV0dG9ucyxcbiAgICBidXR0b246IGV2ZW50LmJ1dHRvbixcbiAgICBwcmVzc3VyZTogZXZlbnQucHJlc3N1cmUsXG4gICAgeDogZXZlbnQuY2xpZW50WCxcbiAgICB5OiBldmVudC5jbGllbnRZLFxuICAgIHRpbWVzdGFtcDogZXZlbnQudGltZVN0YW1wLFxuICAgIGlzQ2FudmFzVGFyZ2V0LFxuICB9O1xufVxuIiwgImltcG9ydCB0eXBlIHtcbiAgR2VzdHVyZUVmZmVjdCxcbiAgR2VzdHVyZVNldHRpbmdzLFxuICBHZXN0dXJlU3RhdGVTbmFwc2hvdCxcbiAgTm9ybWFsaXplZFN0eWx1c0V2ZW50LFxuICBQb2ludCxcbiAgU2NoZWR1bGVyLFxufSBmcm9tIFwiLi90eXBlc1wiO1xuXG5pbnRlcmZhY2UgUGVuZGluZ1RhcCB7XG4gIHBvaW50OiBQb2ludDtcbiAgdGltZXI6IHVua25vd247XG59XG5cbi8qKiBQdXJlIHBlci12aWV3IFMgUGVuIGdlc3R1cmUgcG9saWN5LiBJdCBuZXZlciB0b3VjaGVzIHRoZSBET00gb3IgRXhjYWxpZHJhdy4gKi9cbmV4cG9ydCBjbGFzcyBTdHlsdXNHZXN0dXJlTWFjaGluZSB7XG4gIHByaXZhdGUgYmFycmVsQnV0dG9uSGVsZCA9IGZhbHNlO1xuICBwcml2YXRlIHBlbkNvbnRhY3QgPSBmYWxzZTtcbiAgcHJpdmF0ZSBjb25zdW1lZCA9IGZhbHNlO1xuICBwcml2YXRlIG1vdmVkID0gZmFsc2U7XG4gIHByaXZhdGUgaG9sZEZpcmVkID0gZmFsc2U7XG4gIHByaXZhdGUgdGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICBwcml2YXRlIHByZXNzT3JpZ2luOiBQb2ludCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGhvbGRUaW1lcjogdW5rbm93biB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdUYXA6IFBlbmRpbmdUYXAgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBhY3RpdmVQb2ludGVySWQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2V0dGluZ3M6IEdlc3R1cmVTZXR0aW5ncyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNjaGVkdWxlcjogU2NoZWR1bGVyXG4gICkge31cblxuICBoYW5kbGUoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IEdlc3R1cmVFZmZlY3RbXSB7XG4gICAgaWYgKGV2ZW50LnBvaW50ZXJUeXBlICE9PSBcInBlblwiKSByZXR1cm4gW107XG4gICAgY29uc3QgZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdID0gW107XG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwiY29udGV4dG1lbnVcIikge1xuICAgICAgaWYgKHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSB8fCAodGhpcy5iYXJyZWxCdXR0b25IZWxkICYmIHRoaXMucGVuQ29udGFjdCkpXG4gICAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwic3VwcHJlc3MtY29udGV4dC1tZW51XCIgfSk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJkb3duXCIpIHtcbiAgICAgIHRoaXMucGVuQ29udGFjdCA9IHRydWU7XG4gICAgICB0aGlzLmFjdGl2ZVBvaW50ZXJJZCA9IGV2ZW50LnBvaW50ZXJJZDtcbiAgICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQpIHRoaXMuY29uc3VtZUZvckNvbnRhY3QoZXZlbnQsIGVmZmVjdHMpO1xuICAgICAgcmV0dXJuIGVmZmVjdHM7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwidXBcIiB8fCBldmVudC5raW5kID09PSBcImNhbmNlbFwiKSB7XG4gICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVySWQgIT09IG51bGwgJiYgZXZlbnQucG9pbnRlcklkICE9PSB0aGlzLmFjdGl2ZVBvaW50ZXJJZCkgcmV0dXJuIGVmZmVjdHM7XG4gICAgICB0aGlzLnBlbkNvbnRhY3QgPSBmYWxzZTtcbiAgICAgIHRoaXMuYWN0aXZlUG9pbnRlcklkID0gbnVsbDtcbiAgICAgIGlmICh0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUpIHtcbiAgICAgICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtZW5kXCIgfSk7XG4gICAgICB9XG4gICAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJjYW5jZWxcIikgdGhpcy5jYW5jZWxQcmVzcygpO1xuICAgICAgcmV0dXJuIGVmZmVjdHM7XG4gICAgfVxuXG4gICAgLy8gSG92ZXIgbW92ZW1lbnQgaXMgdGhlIG9ubHkgZXZpZGVuY2UgdXNlZCB0byBpbnRlcnByZXQgYnV0dG9ucyBhcyBiYXJyZWwgc3RhdGUuXG4gICAgaWYgKHRoaXMucGVuQ29udGFjdCkgcmV0dXJuIGVmZmVjdHM7XG4gICAgY29uc3QgaGVsZE5vdyA9IChldmVudC5idXR0b25zICYgMSkgIT09IDA7XG4gICAgaWYgKCF0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgaGVsZE5vdykgdGhpcy5zdGFydFByZXNzKGV2ZW50KTtcbiAgICBpZiAodGhpcy5iYXJyZWxCdXR0b25IZWxkICYmIGhlbGROb3cpIHRoaXMudHJhY2tIb3Zlck1vdmVtZW50KGV2ZW50KTtcbiAgICBpZiAodGhpcy5iYXJyZWxCdXR0b25IZWxkICYmICFoZWxkTm93KSB0aGlzLnJlbGVhc2VQcmVzcyhlZmZlY3RzKTtcbiAgICByZXR1cm4gZWZmZWN0cztcbiAgfVxuXG4gIGRpc3Bvc2UoKTogR2VzdHVyZUVmZmVjdFtdIHtcbiAgICBjb25zdCBlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10gPSBbXTtcbiAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICBpZiAodGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlKSBlZmZlY3RzLnB1c2goeyB0eXBlOiBcInRlbXBvcmFyeS10b29sLWVuZFwiIH0pO1xuICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcbiAgICByZXR1cm4gZWZmZWN0cztcbiAgfVxuXG4gIHNuYXBzaG90KCk6IEdlc3R1cmVTdGF0ZVNuYXBzaG90IHtcbiAgICByZXR1cm4ge1xuICAgICAgYmFycmVsQnV0dG9uSGVsZDogdGhpcy5iYXJyZWxCdXR0b25IZWxkLFxuICAgICAgcGVuQ29udGFjdDogdGhpcy5wZW5Db250YWN0LFxuICAgICAgZ2VzdHVyZUNvbnN1bWVkOiB0aGlzLmNvbnN1bWVkLFxuICAgICAgdGVtcG9yYXJ5VG9vbEFjdGl2ZTogdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlLFxuICAgICAgaG92ZXJHZXN0dXJlTW92ZWQ6IHRoaXMubW92ZWQsXG4gICAgICBsb25nUHJlc3NGaXJlZDogdGhpcy5ob2xkRmlyZWQsXG4gICAgICBhY3RpdmVQb2ludGVySWQ6IHRoaXMuYWN0aXZlUG9pbnRlcklkLFxuICAgIH07XG4gIH1cblxuICAvKiogVGhlIGNvbnRyb2xsZXIgY2FsbHMgdGhpcyB3aGVuIHRoZSBvcHRpb25hbCBFeGNhbGlkcmF3IGJyaWRnZSByZWplY3RzIGEgc3RhcnQgcmVxdWVzdC4gKi9cbiAgdGVtcG9yYXJ5VG9vbERpZE5vdFN0YXJ0KCk6IHZvaWQge1xuICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGFydFByZXNzKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgPSB0cnVlO1xuICAgIHRoaXMuY29uc3VtZWQgPSBmYWxzZTtcbiAgICB0aGlzLm1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5ob2xkRmlyZWQgPSBmYWxzZTtcbiAgICB0aGlzLnByZXNzT3JpZ2luID0geyB4OiBldmVudC54LCB5OiBldmVudC55IH07XG4gICAgdGhpcy5ob2xkVGltZXIgPSB0aGlzLnNjaGVkdWxlci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmIChcbiAgICAgICAgIXRoaXMuYmFycmVsQnV0dG9uSGVsZCB8fFxuICAgICAgICB0aGlzLnBlbkNvbnRhY3QgfHxcbiAgICAgICAgdGhpcy5tb3ZlZCB8fFxuICAgICAgICB0aGlzLmNvbnN1bWVkIHx8XG4gICAgICAgICF0aGlzLnByZXNzT3JpZ2luXG4gICAgICApXG4gICAgICAgIHJldHVybjtcbiAgICAgIHRoaXMuaG9sZEZpcmVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY29uc3VtZWQgPSB0cnVlO1xuICAgICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgICB0aGlzLm9uRWZmZWN0Py4oeyB0eXBlOiBcImJ1dHRvbi1ob2xkXCIsIHBvaW50OiB0aGlzLnByZXNzT3JpZ2luIH0pO1xuICAgIH0sIHRoaXMuc2V0dGluZ3MubG9uZ1ByZXNzTXMpO1xuICB9XG5cbiAgLyoqIENvbnRyb2xsZXIgcmVnaXN0ZXJzIHRoaXMgc28gc2NoZWR1bGVyIGNhbGxiYWNrcyByZXRhaW4gcHVyZSBzZW1hbnRpYyBvdXRwdXQuICovXG4gIHByaXZhdGUgb25FZmZlY3Q6ICgoZWZmZWN0OiBHZXN0dXJlRWZmZWN0KSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICBzZXRFZmZlY3RTaW5rKHNpbms6IChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLm9uRWZmZWN0ID0gc2luaztcbiAgfVxuXG4gIHByaXZhdGUgdHJhY2tIb3Zlck1vdmVtZW50KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMucHJlc3NPcmlnaW4gfHwgdGhpcy5tb3ZlZCkgcmV0dXJuO1xuICAgIGNvbnN0IGR4ID0gZXZlbnQueCAtIHRoaXMucHJlc3NPcmlnaW4ueDtcbiAgICBjb25zdCBkeSA9IGV2ZW50LnkgLSB0aGlzLnByZXNzT3JpZ2luLnk7XG4gICAgaWYgKE1hdGguaHlwb3QoZHgsIGR5KSA+IHRoaXMuc2V0dGluZ3MubW92ZW1lbnRUaHJlc2hvbGRQeCkge1xuICAgICAgdGhpcy5tb3ZlZCA9IHRydWU7XG4gICAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNvbnN1bWVGb3JDb250YWN0KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQsIGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSk6IHZvaWQge1xuICAgIHRoaXMuY29uc3VtZWQgPSB0cnVlO1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgIGlmICh0aGlzLnNldHRpbmdzLmJ1dHRvbkNvbnRhY3RBY3Rpb24gPT09IFwiZXJhc2VyXCIgJiYgIXRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkge1xuICAgICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gdHJ1ZTtcbiAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtc3RhcnRcIiwgcG9pbnQ6IHsgeDogZXZlbnQueCwgeTogZXZlbnQueSB9IH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVsZWFzZVByZXNzKGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSk6IHZvaWQge1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuYmFycmVsQnV0dG9uSGVsZCA9IGZhbHNlO1xuICAgIGlmICghdGhpcy5jb25zdW1lZCAmJiAhdGhpcy5tb3ZlZCAmJiAhdGhpcy5ob2xkRmlyZWQgJiYgdGhpcy5wcmVzc09yaWdpbikge1xuICAgICAgaWYgKHRoaXMucGVuZGluZ1RhcCkge1xuICAgICAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJidXR0b24tZG91YmxlLXRhcFwiLCBwb2ludDogdGhpcy5wcmVzc09yaWdpbiB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHBvaW50ID0gdGhpcy5wcmVzc09yaWdpbjtcbiAgICAgICAgY29uc3QgdGltZXIgPSB0aGlzLnNjaGVkdWxlci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdUYXAgPSBudWxsO1xuICAgICAgICAgIHRoaXMub25FZmZlY3Q/Lih7IHR5cGU6IFwiYnV0dG9uLXRhcFwiLCBwb2ludCB9KTtcbiAgICAgICAgfSwgdGhpcy5zZXR0aW5ncy5kb3VibGVUYXBNcyk7XG4gICAgICAgIHRoaXMucGVuZGluZ1RhcCA9IHsgcG9pbnQsIHRpbWVyIH07XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucHJlc3NPcmlnaW4gPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBjYW5jZWxQcmVzcygpOiB2b2lkIHtcbiAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgPSBmYWxzZTtcbiAgICB0aGlzLnBlbkNvbnRhY3QgPSBmYWxzZTtcbiAgICB0aGlzLmNvbnN1bWVkID0gZmFsc2U7XG4gICAgdGhpcy5tb3ZlZCA9IGZhbHNlO1xuICAgIHRoaXMuaG9sZEZpcmVkID0gZmFsc2U7XG4gICAgdGhpcy5wcmVzc09yaWdpbiA9IG51bGw7XG4gICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBjYW5jZWxUaW1lcih3aGljaDogXCJob2xkXCIpOiB2b2lkIHtcbiAgICBpZiAod2hpY2ggPT09IFwiaG9sZFwiICYmIHRoaXMuaG9sZFRpbWVyICE9PSBudWxsKSB7XG4gICAgICB0aGlzLnNjaGVkdWxlci5jbGVhclRpbWVvdXQodGhpcy5ob2xkVGltZXIpO1xuICAgICAgdGhpcy5ob2xkVGltZXIgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2FuY2VsUGVuZGluZ1RhcCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5wZW5kaW5nVGFwKSB0aGlzLnNjaGVkdWxlci5jbGVhclRpbWVvdXQodGhpcy5wZW5kaW5nVGFwLnRpbWVyKTtcbiAgICB0aGlzLnBlbmRpbmdUYXAgPSBudWxsO1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSB7IEV4Y2FsaWRyYXdCcmlkZ2UsIEFjdGl2ZVRvb2xTbmFwc2hvdCB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB0eXBlIHsgRGVidWdMb2dnZXIgfSBmcm9tIFwiLi4vZGVidWcvRGVidWdMb2dnZXJcIjtcbmltcG9ydCB7IERlYnVnT3ZlcmxheSB9IGZyb20gXCIuLi9kZWJ1Zy9EZWJ1Z092ZXJsYXlcIjtcbmltcG9ydCB0eXBlIHsgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB9IGZyb20gXCIuLi9zZXR0aW5ncy9zZXR0aW5nc1wiO1xuaW1wb3J0IHsgbm9ybWFsaXplUG9pbnRlckV2ZW50IH0gZnJvbSBcIi4vbm9ybWFsaXplUG9pbnRlckV2ZW50XCI7XG5pbXBvcnQgeyBTdHlsdXNHZXN0dXJlTWFjaGluZSB9IGZyb20gXCIuL1N0eWx1c0dlc3R1cmVNYWNoaW5lXCI7XG5pbXBvcnQgdHlwZSB7IEdlc3R1cmVFZmZlY3QsIE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgUG9pbnQsIFNjaGVkdWxlciB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCB0eXBlIEFjdGlvbkhhbmRsZXIgPSAoXG4gIGFjdGlvbjogXCJtZW51XCIgfCBcImNvcHlcIiB8IFwicGFzdGVcIiB8IFwibm9uZVwiLFxuICBwb2ludDogUG9pbnQsXG4gIGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZVxuKSA9PiB2b2lkO1xuXG5leHBvcnQgY2xhc3MgU3R5bHVzQ29udHJvbGxlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWFjaGluZTogU3R5bHVzR2VzdHVyZU1hY2hpbmU7XG4gIHByaXZhdGUgc2F2ZWRUb29sOiBBY3RpdmVUb29sU25hcHNob3QgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBkaXNwb3NlZCA9IGZhbHNlO1xuICBwcml2YXRlIGF0dGFjaGVkID0gZmFsc2U7XG4gIHByaXZhdGUgcmVhZG9ubHkgbGlzdGVuZXJzOiBBcnJheTxba2V5b2YgSFRNTEVsZW1lbnRFdmVudE1hcCwgRXZlbnRMaXN0ZW5lcl0+ID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgb3ZlcmxheTogRGVidWdPdmVybGF5O1xuICBwcml2YXRlIGxhdGVzdEV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxlYWY6IFdvcmtzcGFjZUxlYWYsXG4gICAgcHJpdmF0ZSByZWFkb25seSBicmlkZ2U6IEV4Y2FsaWRyYXdCcmlkZ2UsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogKCkgPT4gU3R5bHVzQ29udHJvbHNTZXR0aW5ncyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRlYnVnOiBEZWJ1Z0xvZ2dlcixcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpc3BhdGNoQWN0aW9uOiBBY3Rpb25IYW5kbGVyLFxuICAgIHNjaGVkdWxlcjogU2NoZWR1bGVyID0gd2luZG93XG4gICkge1xuICAgIHRoaXMubWFjaGluZSA9IG5ldyBTdHlsdXNHZXN0dXJlTWFjaGluZSh0aGlzLmdlc3R1cmVTZXR0aW5ncygpLCBzY2hlZHVsZXIpO1xuICAgIHRoaXMubWFjaGluZS5zZXRFZmZlY3RTaW5rKChlZmZlY3QpID0+IHRoaXMuYXBwbHlFZmZlY3QoZWZmZWN0KSk7XG4gICAgdGhpcy5vdmVybGF5ID0gbmV3IERlYnVnT3ZlcmxheShcbiAgICAgIHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLFxuICAgICAgKCkgPT4gdGhpcy5zZXR0aW5ncygpLmRlYnVnTW9kZSAmJiB0aGlzLnNldHRpbmdzKCkuZGVidWdPdmVybGF5XG4gICAgKTtcbiAgfVxuXG4gIGF0dGFjaCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCB8fCB0aGlzLmF0dGFjaGVkKSByZXR1cm47XG4gICAgdGhpcy5hdHRhY2hlZCA9IHRydWU7XG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsO1xuICAgIGZvciAoY29uc3QgdHlwZSBvZiBbXG4gICAgICBcInBvaW50ZXJkb3duXCIsXG4gICAgICBcInBvaW50ZXJtb3ZlXCIsXG4gICAgICBcInBvaW50ZXJ1cFwiLFxuICAgICAgXCJwb2ludGVyY2FuY2VsXCIsXG4gICAgICBcImNvbnRleHRtZW51XCIsXG4gICAgXSBhcyBjb25zdCkge1xuICAgICAgY29uc3QgbGlzdGVuZXI6IEV2ZW50TGlzdGVuZXIgPSAocmF3KSA9PiB0aGlzLm9uUG9pbnRlckV2ZW50KHJhdyBhcyBQb2ludGVyRXZlbnQpO1xuICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgICAgIHRoaXMubGlzdGVuZXJzLnB1c2goW3R5cGUsIGxpc3RlbmVyXSk7XG4gICAgfVxuICB9XG5cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkgcmV0dXJuO1xuICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuICAgIHRoaXMuYXR0YWNoZWQgPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IFt0eXBlLCBsaXN0ZW5lcl0gb2YgdGhpcy5saXN0ZW5lcnMpXG4gICAgICB0aGlzLmxlYWYudmlldy5jb250YWluZXJFbC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgICB0aGlzLmxpc3RlbmVycy5sZW5ndGggPSAwO1xuICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIHRoaXMubWFjaGluZS5kaXNwb3NlKCkpIHRoaXMuYXBwbHlFZmZlY3QoZWZmZWN0KTtcbiAgICB0aGlzLm92ZXJsYXkuY2xvc2UoKTtcbiAgfVxuICBnZXRUcmFjZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRlYnVnLmV4cG9ydFRyYWNlKCk7XG4gIH1cblxuICBwcml2YXRlIG9uUG9pbnRlckV2ZW50KHJhdzogUG9pbnRlckV2ZW50KTogdm9pZCB7XG4gICAgaWYgKHJhdy5wb2ludGVyVHlwZSAhPT0gXCJwZW5cIikgcmV0dXJuO1xuICAgIGNvbnN0IGV2ZW50ID0gbm9ybWFsaXplUG9pbnRlckV2ZW50KFxuICAgICAgcmF3LFxuICAgICAgdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWwuY29udGFpbnMocmF3LnRhcmdldCBhcyBOb2RlKVxuICAgICk7XG4gICAgdGhpcy5sYXRlc3RFdmVudCA9IGV2ZW50O1xuICAgIHRoaXMuZGVidWcuZXZlbnQoZXZlbnQpO1xuICAgIGNvbnN0IGVmZmVjdHMgPSB0aGlzLm1hY2hpbmUuaGFuZGxlKGV2ZW50KTtcbiAgICBpZiAoZWZmZWN0cy5sZW5ndGggPT09IDApIHRoaXMub3ZlcmxheS51cGRhdGUoZXZlbnQsIHRoaXMubWFjaGluZS5zbmFwc2hvdCgpKTtcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiBlZmZlY3RzKSB7XG4gICAgICBpZiAoZWZmZWN0LnR5cGUgPT09IFwic3VwcHJlc3MtY29udGV4dC1tZW51XCIpIHJhdy5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5hcHBseUVmZmVjdChlZmZlY3QpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwbHlFZmZlY3QoZWZmZWN0OiBHZXN0dXJlRWZmZWN0KTogdm9pZCB7XG4gICAgdGhpcy5kZWJ1Zy5tZXNzYWdlKGBlZmZlY3Q6ICR7ZWZmZWN0LnR5cGV9YCk7XG4gICAgc3dpdGNoIChlZmZlY3QudHlwZSkge1xuICAgICAgY2FzZSBcInRlbXBvcmFyeS10b29sLXN0YXJ0XCI6XG4gICAgICAgIGlmICghdGhpcy5zYXZlZFRvb2wpIHtcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmJyaWRnZS5zdGFydFRlbXBvcmFyeUVyYXNlcigpO1xuICAgICAgICAgIGlmIChyZXN1bHQub2spIHRoaXMuc2F2ZWRUb29sID0gcmVzdWx0LnZhbHVlO1xuICAgICAgICAgIGVsc2UgdGhpcy5tYWNoaW5lLnRlbXBvcmFyeVRvb2xEaWROb3RTdGFydCgpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcInRlbXBvcmFyeS10b29sLWVuZFwiOlxuICAgICAgICBpZiAodGhpcy5zYXZlZFRvb2wpIHRoaXMuYnJpZGdlLnJlc3RvcmVUb29sKHRoaXMuc2F2ZWRUb29sKTtcbiAgICAgICAgdGhpcy5zYXZlZFRvb2wgPSBudWxsO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJidXR0b24tdGFwXCI6XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvblRhcEFjdGlvbiwgZWZmZWN0LnBvaW50LCB0aGlzLmJyaWRnZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImJ1dHRvbi1kb3VibGUtdGFwXCI6XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvbkRvdWJsZVRhcEFjdGlvbiwgZWZmZWN0LnBvaW50LCB0aGlzLmJyaWRnZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImJ1dHRvbi1ob2xkXCI6XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvbkhvbGRBY3Rpb24sIGVmZmVjdC5wb2ludCwgdGhpcy5icmlkZ2UpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAodGhpcy5sYXRlc3RFdmVudCkgdGhpcy5vdmVybGF5LnVwZGF0ZSh0aGlzLmxhdGVzdEV2ZW50LCB0aGlzLm1hY2hpbmUuc25hcHNob3QoKSwgZWZmZWN0KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2VzdHVyZVNldHRpbmdzKCkge1xuICAgIGNvbnN0IHZhbHVlID0gdGhpcy5zZXR0aW5ncygpO1xuICAgIHJldHVybiB7XG4gICAgICBidXR0b25Db250YWN0QWN0aW9uOiB2YWx1ZS5idXR0b25Db250YWN0QWN0aW9uLFxuICAgICAgZG91YmxlVGFwTXM6IHZhbHVlLmRvdWJsZVRhcE1zLFxuICAgICAgbG9uZ1ByZXNzTXM6IHZhbHVlLmxvbmdQcmVzc01zLFxuICAgICAgbW92ZW1lbnRUaHJlc2hvbGRQeDogdmFsdWUubW92ZW1lbnRUaHJlc2hvbGRQeCxcbiAgICB9IGFzIGNvbnN0O1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBBcHAsIFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IEV4Y2FsaWRyYXdCcmlkZ2UgfSBmcm9tIFwiLi4vZXhjYWxpZHJhdy9FeGNhbGlkcmF3QnJpZGdlXCI7XG5pbXBvcnQgeyBEZWJ1Z0xvZ2dlciB9IGZyb20gXCIuLi9kZWJ1Zy9EZWJ1Z0xvZ2dlclwiO1xuaW1wb3J0IHR5cGUgeyBTdHlsdXNDb250cm9sc1NldHRpbmdzIH0gZnJvbSBcIi4uL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBTdHlsdXNDb250cm9sbGVyLCB0eXBlIEFjdGlvbkhhbmRsZXIgfSBmcm9tIFwiLi9TdHlsdXNDb250cm9sbGVyXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bHVzQ29udHJvbGxlckxpa2Uge1xuICBhdHRhY2goKTogdm9pZDtcbiAgZGlzcG9zZSgpOiB2b2lkO1xuICBnZXRUcmFjZSgpOiBzdHJpbmc7XG59XG5cbmV4cG9ydCB0eXBlIFN0eWx1c0NvbnRyb2xsZXJGYWN0b3J5ID0gKGxlYWY6IFdvcmtzcGFjZUxlYWYpID0+IFN0eWx1c0NvbnRyb2xsZXJMaWtlO1xuXG5leHBvcnQgY2xhc3MgU3R5bHVzVmlld1JlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSByZWFkb25seSBjb250cm9sbGVycyA9IG5ldyBNYXA8V29ya3NwYWNlTGVhZiwgU3R5bHVzQ29udHJvbGxlckxpa2U+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgY3JlYXRlQ29udHJvbGxlcjogU3R5bHVzQ29udHJvbGxlckZhY3Rvcnk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNldHRpbmdzOiAoKSA9PiBTdHlsdXNDb250cm9sc1NldHRpbmdzLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgYWN0aW9uSGFuZGxlcjogQWN0aW9uSGFuZGxlcixcbiAgICBjcmVhdGVDb250cm9sbGVyPzogU3R5bHVzQ29udHJvbGxlckZhY3RvcnlcbiAgKSB7XG4gICAgdGhpcy5jcmVhdGVDb250cm9sbGVyID1cbiAgICAgIGNyZWF0ZUNvbnRyb2xsZXIgPz9cbiAgICAgICgobGVhZikgPT4ge1xuICAgICAgICBjb25zdCBkZWJ1ZyA9IG5ldyBEZWJ1Z0xvZ2dlcigoKSA9PiB0aGlzLnNldHRpbmdzKCkuZGVidWdNb2RlKTtcbiAgICAgICAgcmV0dXJuIG5ldyBTdHlsdXNDb250cm9sbGVyKFxuICAgICAgICAgIGxlYWYsXG4gICAgICAgICAgbmV3IEV4Y2FsaWRyYXdCcmlkZ2UobGVhZiksXG4gICAgICAgICAgdGhpcy5zZXR0aW5ncyxcbiAgICAgICAgICBkZWJ1ZyxcbiAgICAgICAgICB0aGlzLmFjdGlvbkhhbmRsZXJcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgc3luYygpOiB2b2lkIHtcbiAgICBjb25zdCBsZWF2ZXMgPSBuZXcgU2V0KHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoXCJleGNhbGlkcmF3XCIpKTtcbiAgICBmb3IgKGNvbnN0IGxlYWYgb2YgbGVhdmVzKVxuICAgICAgaWYgKCF0aGlzLmNvbnRyb2xsZXJzLmhhcyhsZWFmKSkge1xuICAgICAgICBjb25zdCBjb250cm9sbGVyID0gdGhpcy5jcmVhdGVDb250cm9sbGVyKGxlYWYpO1xuICAgICAgICBjb250cm9sbGVyLmF0dGFjaCgpO1xuICAgICAgICB0aGlzLmNvbnRyb2xsZXJzLnNldChsZWFmLCBjb250cm9sbGVyKTtcbiAgICAgIH1cbiAgICBmb3IgKGNvbnN0IFtsZWFmLCBjb250cm9sbGVyXSBvZiB0aGlzLmNvbnRyb2xsZXJzKVxuICAgICAgaWYgKCFsZWF2ZXMuaGFzKGxlYWYpKSB7XG4gICAgICAgIGNvbnRyb2xsZXIuZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLmNvbnRyb2xsZXJzLmRlbGV0ZShsZWFmKTtcbiAgICAgIH1cbiAgfVxuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgY29udHJvbGxlciBvZiB0aGlzLmNvbnRyb2xsZXJzLnZhbHVlcygpKSBjb250cm9sbGVyLmRpc3Bvc2UoKTtcbiAgICB0aGlzLmNvbnRyb2xsZXJzLmNsZWFyKCk7XG4gIH1cbiAgcmVmcmVzaCgpOiB2b2lkIHtcbiAgICB0aGlzLmRpc3Bvc2UoKTtcbiAgICB0aGlzLnN5bmMoKTtcbiAgfVxuICBleHBvcnRUcmFjZXMoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoXG4gICAgICBbLi4udGhpcy5jb250cm9sbGVycy5lbnRyaWVzKCldLm1hcCgoW2xlYWYsIGNvbnRyb2xsZXJdKSA9PiAoe1xuICAgICAgICBsZWFmOiBsZWFmLmdldERpc3BsYXlUZXh0KCksXG4gICAgICAgIGV2ZW50czogSlNPTi5wYXJzZShjb250cm9sbGVyLmdldFRyYWNlKCkpLFxuICAgICAgfSkpLFxuICAgICAgbnVsbCxcbiAgICAgIDJcbiAgICApO1xuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUFBQSxtQkFBK0I7OztBQ0cvQixJQUFNLGlCQUFpQjtBQUN2QixJQUFNLHFCQUFxQixFQUFFLE9BQU8sS0FBSyxRQUFRLElBQUk7QUFFOUMsU0FBUyxrQkFDZCxPQUNBLFVBQ0EsTUFDTztBQUNQLFNB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QkFBaUIsTUFBTSxLQUFLLFVBQVUsS0FBSyxDQUFDLENBQUM7QUFDdEYsU0FBSyxJQUFJLFVBQVUsY0FBYyxNQUFNLEtBQUssVUFBVSxLQUFLLENBQUM7QUFDNUQsU0FBSyxXQUFXO0FBQUEsTUFDZCxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixVQUFVLFlBQVk7QUFDcEIsY0FBTSxRQUFRLEtBQUssVUFBVSxhQUFhLEtBQUs7QUFDL0MsWUFBSTtBQUNGLGdCQUFNLFVBQVUsVUFBVSxVQUFVLEtBQUs7QUFDekMsY0FBSSx3QkFBTyw0QkFBNEI7QUFBQSxRQUN6QyxRQUFRO0FBQ04sY0FBSSx3QkFBTywwREFBMEQ7QUFBQSxRQUN2RTtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxXQUFpQjtBQUNmLFNBQUssS0FBSyxNQUFNO0FBQ2hCLFNBQUssVUFBVSxRQUFRO0FBQ3ZCLFNBQUssV0FBVztBQUFBLEVBQ2xCO0FBQUEsRUFDQSxNQUFNLGVBQWUsT0FBdUQ7QUFDMUUsU0FBSyxXQUFXLGtCQUFrQixFQUFFLEdBQUcsS0FBSyxVQUFVLEdBQUcsTUFBTSxDQUFDO0FBQ2hFLFVBQU0sS0FBSyxTQUFTLEtBQUssUUFBUTtBQUNqQyxTQUFLLFVBQVUsUUFBUTtBQUFBLEVBQ3pCO0FBQ0Y7IiwKICAibmFtZXMiOiBbImltcG9ydF9vYnNpZGlhbiIsICJhY3Rpb25zIiwgImltcG9ydF9vYnNpZGlhbiJdCn0K
