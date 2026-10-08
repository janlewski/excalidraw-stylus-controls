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
var StylusMenu = class {
  element = null;
  open(point, bridge) {
    this.close();
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
        callback();
        this.close();
      });
    }
    const left = Math.min(Math.max(8, point.x), window.innerWidth - 180);
    const top = Math.min(Math.max(8, point.y), window.innerHeight - 300);
    menu.setCssProps({ left: `${left}px`, top: `${top}px` });
    this.element = menu;
    window.setTimeout(
      () => document.addEventListener("pointerdown", this.close, {
        once: true,
        capture: true
      }),
      0
    );
  }
  close = () => {
    this.element?.remove();
    this.element = null;
  };
};

// src/settings/SettingsTab.ts
var import_obsidian = require("obsidian");
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
    new import_obsidian.Setting(this.containerEl).setName(name).addText(
      (text) => text.setValue(String(this.plugin.settings[key])).onChange(async (value) => this.plugin.updateSettings({ [key]: Number(value) }))
    );
  }
};

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
    doubleTapMs: number(value.doubleTapMs, 300, 100, 1e3),
    longPressMs: number(value.longPressMs, 450, 150, 2e3),
    movementThresholdPx: number(value.movementThresholdPx, 8, 1, 100),
    debugMode: value.debugMode === true,
    debugOverlay: value.debugOverlay === true
  };
}

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
function getLeafApi(view) {
  if (!view || typeof view !== "object") {
    return {
      ok: false,
      code: "unavailable",
      message: "This leaf does not expose an Excalidraw view."
    };
  }
  const api = view.excalidrawAPI;
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
  constructor(app, settings, actionHandler) {
    this.app = app;
    this.settings = settings;
    this.actionHandler = actionHandler;
  }
  controllers = /* @__PURE__ */ new Map();
  sync() {
    const leaves = new Set(this.app.workspace.getLeavesOfType("excalidraw"));
    for (const leaf of leaves)
      if (!this.controllers.has(leaf)) {
        const debug = new DebugLogger(() => this.settings().debugMode);
        const controller = new StylusController(
          leaf,
          new ExcalidrawBridge(leaf),
          this.settings,
          debug,
          this.actionHandler
        );
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL21lbnUvU3R5bHVzTWVudS50cyIsICJzcmMvc2V0dGluZ3MvU2V0dGluZ3NUYWIudHMiLCAic3JjL3NldHRpbmdzL3NldHRpbmdzLnRzIiwgInNyYy9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2UudHMiLCAic3JjL2V4Y2FsaWRyYXcvY29tcGF0aWJpbGl0eS50cyIsICJzcmMvZGVidWcvRGVidWdMb2dnZXIudHMiLCAic3JjL2RlYnVnL0RlYnVnT3ZlcmxheS50cyIsICJzcmMvc3R5bHVzL25vcm1hbGl6ZVBvaW50ZXJFdmVudC50cyIsICJzcmMvc3R5bHVzL1N0eWx1c0dlc3R1cmVNYWNoaW5lLnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzQ29udHJvbGxlci50cyIsICJzcmMvc3R5bHVzL1N0eWx1c1ZpZXdSZWdpc3RyeS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgTm90aWNlLCBQbHVnaW4gfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IFN0eWx1c01lbnUgfSBmcm9tIFwiLi9tZW51L1N0eWx1c01lbnVcIjtcbmltcG9ydCB7IFNldHRpbmdzVGFiIH0gZnJvbSBcIi4vc2V0dGluZ3MvU2V0dGluZ3NUYWJcIjtcbmltcG9ydCB7XG4gIERFRkFVTFRfU0VUVElOR1MsXG4gIG5vcm1hbGl6ZVNldHRpbmdzLFxuICB0eXBlIFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MsXG59IGZyb20gXCIuL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBTdHlsdXNWaWV3UmVnaXN0cnkgfSBmcm9tIFwiLi9zdHlsdXMvU3R5bHVzVmlld1JlZ2lzdHJ5XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0eWx1c0NvbnRyb2xzUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuICBwcml2YXRlIHJlZ2lzdHJ5OiBTdHlsdXNWaWV3UmVnaXN0cnkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByZWFkb25seSBtZW51ID0gbmV3IFN0eWx1c01lbnUoKTtcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IG5vcm1hbGl6ZVNldHRpbmdzKChhd2FpdCB0aGlzLmxvYWREYXRhKCkpID8/IHt9KTtcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFNldHRpbmdzVGFiKHRoaXMpKTtcbiAgICB0aGlzLnJlZ2lzdHJ5ID0gbmV3IFN0eWx1c1ZpZXdSZWdpc3RyeShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgKCkgPT4gdGhpcy5zZXR0aW5ncyxcbiAgICAgIChhY3Rpb24sIHBvaW50LCBicmlkZ2UpID0+IHtcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJtZW51XCIpIHRoaXMubWVudS5vcGVuKHBvaW50LCBicmlkZ2UpO1xuICAgICAgICBlbHNlIGlmIChhY3Rpb24gPT09IFwiY29weVwiKSBicmlkZ2UuY29weVNlbGVjdGVkRWxlbWVudHMoKTtcbiAgICAgICAgZWxzZSBpZiAoYWN0aW9uID09PSBcInBhc3RlXCIpIGJyaWRnZS5wYXN0ZUF0KHBvaW50KTtcbiAgICAgIH1cbiAgICApO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJsYXlvdXQtY2hhbmdlXCIsICgpID0+IHRoaXMucmVnaXN0cnk/LnN5bmMoKSkpO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHRoaXMucmVnaXN0cnk/LnN5bmMoKSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImNvcHktc3R5bHVzLWV2ZW50LXRyYWNlXCIsXG4gICAgICBuYW1lOiBcIkNvcHkgbGF0ZXN0IHN0eWx1cyBldmVudCB0cmFjZVwiLFxuICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgICAgY29uc3QgdHJhY2UgPSB0aGlzLnJlZ2lzdHJ5Py5leHBvcnRUcmFjZXMoKSA/PyBcIltdXCI7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQodHJhY2UpO1xuICAgICAgICAgIG5ldyBOb3RpY2UoXCJTdHlsdXMgZXZlbnQgdHJhY2UgY29waWVkLlwiKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgbmV3IE5vdGljZShcIlVuYWJsZSB0byBjb3B5IGV2ZW50IHRyYWNlLiBDaGVjayB0aGUgZGV2ZWxvcGVyIGNvbnNvbGUuXCIpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG4gIG9udW5sb2FkKCk6IHZvaWQge1xuICAgIHRoaXMubWVudS5jbG9zZSgpO1xuICAgIHRoaXMucmVnaXN0cnk/LmRpc3Bvc2UoKTtcbiAgICB0aGlzLnJlZ2lzdHJ5ID0gbnVsbDtcbiAgfVxuICBhc3luYyB1cGRhdGVTZXR0aW5ncyhwYXRjaDogUGFydGlhbDxTdHlsdXNDb250cm9sc1NldHRpbmdzPik6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBub3JtYWxpemVTZXR0aW5ncyh7IC4uLnRoaXMuc2V0dGluZ3MsIC4uLnBhdGNoIH0pO1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gICAgdGhpcy5yZWdpc3RyeT8ucmVmcmVzaCgpO1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBFeGNhbGlkcmF3QnJpZGdlIH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZVwiO1xuaW1wb3J0IHR5cGUgeyBQb2ludCB9IGZyb20gXCIuLi9zdHlsdXMvdHlwZXNcIjtcblxuZXhwb3J0IGNsYXNzIFN0eWx1c01lbnUge1xuICBwcml2YXRlIGVsZW1lbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIG9wZW4ocG9pbnQ6IFBvaW50LCBicmlkZ2U6IEV4Y2FsaWRyYXdCcmlkZ2UpOiB2b2lkIHtcbiAgICB0aGlzLmNsb3NlKCk7XG4gICAgY29uc3QgbWVudSA9IGRvY3VtZW50LmJvZHkuY3JlYXRlRGl2KHsgY2xzOiBcImV4Y2FsaWRyYXctc3R5bHVzLW1lbnVcIiB9KTtcbiAgICBjb25zdCBhY3Rpb25zOiBBcnJheTxbc3RyaW5nLCAoKSA9PiB2b2lkXT4gPSBbXG4gICAgICBbXCJTZWxlY3Rpb25cIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJzZWxlY3Rpb25cIildLFxuICAgICAgW1wiRnJlZSBkcmF3XCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiZnJlZWRyYXdcIildLFxuICAgICAgW1wiRXJhc2VyXCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiZXJhc2VyXCIpXSxcbiAgICAgIFtcIlJlY3RhbmdsZVwiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcInJlY3RhbmdsZVwiKV0sXG4gICAgICBbXCJBcnJvd1wiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcImFycm93XCIpXSxcbiAgICAgIFtcIkNvcHlcIiwgKCkgPT4gYnJpZGdlLmNvcHlTZWxlY3RlZEVsZW1lbnRzKCldLFxuICAgICAgW1wiUGFzdGVcIiwgKCkgPT4gYnJpZGdlLnBhc3RlQXQocG9pbnQpXSxcbiAgICBdO1xuICAgIGZvciAoY29uc3QgW25hbWUsIGNhbGxiYWNrXSBvZiBhY3Rpb25zKSB7XG4gICAgICBjb25zdCBidXR0b24gPSBtZW51LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcbiAgICAgICAgdGV4dDogbmFtZSxcbiAgICAgICAgY2xzOiBcImV4Y2FsaWRyYXctc3R5bHVzLW1lbnVfX2l0ZW1cIixcbiAgICAgIH0pO1xuICAgICAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVydXBcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3QgbGVmdCA9IE1hdGgubWluKE1hdGgubWF4KDgsIHBvaW50LngpLCB3aW5kb3cuaW5uZXJXaWR0aCAtIDE4MCk7XG4gICAgY29uc3QgdG9wID0gTWF0aC5taW4oTWF0aC5tYXgoOCwgcG9pbnQueSksIHdpbmRvdy5pbm5lckhlaWdodCAtIDMwMCk7XG4gICAgbWVudS5zZXRDc3NQcm9wcyh7IGxlZnQ6IGAke2xlZnR9cHhgLCB0b3A6IGAke3RvcH1weGAgfSk7XG4gICAgdGhpcy5lbGVtZW50ID0gbWVudTtcbiAgICB3aW5kb3cuc2V0VGltZW91dChcbiAgICAgICgpID0+XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZG93blwiLCB0aGlzLmNsb3NlLCB7XG4gICAgICAgICAgb25jZTogdHJ1ZSxcbiAgICAgICAgICBjYXB0dXJlOiB0cnVlLFxuICAgICAgICB9KSxcbiAgICAgIDBcbiAgICApO1xuICB9XG4gIGNsb3NlID0gKCk6IHZvaWQgPT4ge1xuICAgIHRoaXMuZWxlbWVudD8ucmVtb3ZlKCk7XG4gICAgdGhpcy5lbGVtZW50ID0gbnVsbDtcbiAgfTtcbn1cbiIsICJpbXBvcnQgeyBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTdHlsdXNDb250cm9sc1BsdWdpbiBmcm9tIFwiLi4vbWFpblwiO1xuaW1wb3J0IHR5cGUgeyBTdHlsdXNBY3Rpb24gfSBmcm9tIFwiLi9zZXR0aW5nc1wiO1xuXG5jb25zdCBhY3Rpb25zOiBSZWNvcmQ8U3R5bHVzQWN0aW9uLCBzdHJpbmc+ID0ge1xuICBtZW51OiBcIk9wZW4gbWVudVwiLFxuICBjb3B5OiBcIkNvcHlcIixcbiAgcGFzdGU6IFwiUGFzdGVcIixcbiAgbm9uZTogXCJEbyBub3RoaW5nXCIsXG59O1xuXG5leHBvcnQgY2xhc3MgU2V0dGluZ3NUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwbHVnaW46IFN0eWx1c0NvbnRyb2xzUGx1Z2luKSB7XG4gICAgc3VwZXIocGx1Z2luLmFwcCwgcGx1Z2luKTtcbiAgfVxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJSZXF1aXJlcyB0aGUgRXhjYWxpZHJhdyBjb21tdW5pdHkgcGx1Z2luLiBDb3B5IGFuZCBwYXN0ZSBhd2FpdCBhIGNvbXBhdGlibGUgRXhjYWxpZHJhdyBpbnRlZ3JhdGlvbiBhbmQgYXJlIGN1cnJlbnRseSB1bmF2YWlsYWJsZS5cIixcbiAgICB9KTtcbiAgICB0aGlzLmFjdGlvbihcIlRhcFwiLCBcImJ1dHRvblRhcEFjdGlvblwiKTtcbiAgICB0aGlzLmFjdGlvbihcIkRvdWJsZSB0YXBcIiwgXCJidXR0b25Eb3VibGVUYXBBY3Rpb25cIik7XG4gICAgdGhpcy5hY3Rpb24oXCJIb2xkXCIsIFwiYnV0dG9uSG9sZEFjdGlvblwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQnV0dG9uICsgcGVuIGNvbnRhY3RcIilcbiAgICAgIC5zZXREZXNjKFwiVGVtcG9yYXJ5IHRvb2wgd2hpbGUgdGhlIHNpZGUgYnV0dG9uIGlzIGhlbGQgZHVyaW5nIHBlbiBjb250YWN0LlwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT5cbiAgICAgICAgZHJvcGRvd25cbiAgICAgICAgICAuYWRkT3B0aW9uKFwiZXJhc2VyXCIsIFwiVGVtcG9yYXJ5IGVyYXNlclwiKVxuICAgICAgICAgIC5hZGRPcHRpb24oXCJub25lXCIsIFwiRG8gbm90aGluZ1wiKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5idXR0b25Db250YWN0QWN0aW9uKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7XG4gICAgICAgICAgICAgIGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlIGFzIFwiZXJhc2VyXCIgfCBcIm5vbmVcIixcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKVxuICAgICAgKTtcbiAgICB0aGlzLm51bWJlcihcIkRvdWJsZS10YXAgaW50ZXJ2YWwgKG1zKVwiLCBcImRvdWJsZVRhcE1zXCIpO1xuICAgIHRoaXMubnVtYmVyKFwiTG9uZy1wcmVzcyBkZWxheSAobXMpXCIsIFwibG9uZ1ByZXNzTXNcIik7XG4gICAgdGhpcy5udW1iZXIoXCJNb3ZlbWVudCB0aHJlc2hvbGQgKHB4KVwiLCBcIm1vdmVtZW50VGhyZXNob2xkUHhcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlYnVnIGxvZ2dpbmdcIilcbiAgICAgIC5zZXREZXNjKFwiTG9ncyBib3VuZGVkIHJhdyBwZW4gZXZlbnQgdHJhY2VzIHRvIHRoZSBkZXZlbG9wZXIgY29uc29sZS5cIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cbiAgICAgICAgdG9nZ2xlXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlYnVnTW9kZSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IGRlYnVnTW9kZTogdmFsdWUgfSkpXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWJ1ZyBvdmVybGF5XCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJTaG93cyB0aGUgbGF0ZXN0IHBlbiBldmVudCBhbmQgc3R5bHVzIHN0YXRlIGluIHRoZSBFeGNhbGlkcmF3IHZpZXcuIFJlcXVpcmVzIGRlYnVnIGxvZ2dpbmcuXCJcbiAgICAgIClcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cbiAgICAgICAgdG9nZ2xlXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlYnVnT3ZlcmxheSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IGRlYnVnT3ZlcmxheTogdmFsdWUgfSkpXG4gICAgICApO1xuICB9XG4gIHByaXZhdGUgYWN0aW9uKFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBrZXk6IFwiYnV0dG9uVGFwQWN0aW9uXCIgfCBcImJ1dHRvbkRvdWJsZVRhcEFjdGlvblwiIHwgXCJidXR0b25Ib2xkQWN0aW9uXCJcbiAgKTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbCkuc2V0TmFtZShgUyBQZW4gc2lkZSBidXR0b246ICR7bmFtZX1gKS5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgIGZvciAoY29uc3QgW3ZhbHVlLCBsYWJlbF0gb2YgT2JqZWN0LmVudHJpZXMoYWN0aW9ucykpIGRyb3Bkb3duLmFkZE9wdGlvbih2YWx1ZSwgbGFiZWwpO1xuICAgICAgZHJvcGRvd25cbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzW2tleV0pXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgW2tleV06IHZhbHVlIGFzIFN0eWx1c0FjdGlvbiB9KSk7XG4gICAgfSk7XG4gIH1cbiAgcHJpdmF0ZSBudW1iZXIobmFtZTogc3RyaW5nLCBrZXk6IFwiZG91YmxlVGFwTXNcIiB8IFwibG9uZ1ByZXNzTXNcIiB8IFwibW92ZW1lbnRUaHJlc2hvbGRQeFwiKTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKG5hbWUpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgICAgdGV4dFxuICAgICAgICAgIC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3Nba2V5XSkpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4gdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBba2V5XTogTnVtYmVyKHZhbHVlKSB9KSlcbiAgICAgICk7XG4gIH1cbn1cbiIsICJleHBvcnQgdHlwZSBTdHlsdXNBY3Rpb24gPSBcIm1lbnVcIiB8IFwiY29weVwiIHwgXCJwYXN0ZVwiIHwgXCJub25lXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB7XG4gIGJ1dHRvblRhcEFjdGlvbjogU3R5bHVzQWN0aW9uO1xuICBidXR0b25Eb3VibGVUYXBBY3Rpb246IFN0eWx1c0FjdGlvbjtcbiAgYnV0dG9uSG9sZEFjdGlvbjogU3R5bHVzQWN0aW9uO1xuICBidXR0b25Db250YWN0QWN0aW9uOiBcImVyYXNlclwiIHwgXCJub25lXCI7XG4gIGRvdWJsZVRhcE1zOiBudW1iZXI7XG4gIGxvbmdQcmVzc01zOiBudW1iZXI7XG4gIG1vdmVtZW50VGhyZXNob2xkUHg6IG51bWJlcjtcbiAgZGVidWdNb2RlOiBib29sZWFuO1xuICBkZWJ1Z092ZXJsYXk6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTdHlsdXNDb250cm9sc1NldHRpbmdzID0ge1xuICBidXR0b25UYXBBY3Rpb246IFwibWVudVwiLFxuICBidXR0b25Eb3VibGVUYXBBY3Rpb246IFwiY29weVwiLFxuICBidXR0b25Ib2xkQWN0aW9uOiBcInBhc3RlXCIsXG4gIGJ1dHRvbkNvbnRhY3RBY3Rpb246IFwiZXJhc2VyXCIsXG4gIGRvdWJsZVRhcE1zOiAzMDAsXG4gIGxvbmdQcmVzc01zOiA0NTAsXG4gIG1vdmVtZW50VGhyZXNob2xkUHg6IDgsXG4gIGRlYnVnTW9kZTogZmFsc2UsXG4gIGRlYnVnT3ZlcmxheTogZmFsc2UsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU2V0dGluZ3ModmFsdWU6IFBhcnRpYWw8U3R5bHVzQ29udHJvbHNTZXR0aW5ncz4pOiBTdHlsdXNDb250cm9sc1NldHRpbmdzIHtcbiAgY29uc3QgYWN0aW9uID0gKGNhbmRpZGF0ZTogdW5rbm93biwgZmFsbGJhY2s6IFN0eWx1c0FjdGlvbik6IFN0eWx1c0FjdGlvbiA9PlxuICAgIGNhbmRpZGF0ZSA9PT0gXCJtZW51XCIgfHwgY2FuZGlkYXRlID09PSBcImNvcHlcIiB8fCBjYW5kaWRhdGUgPT09IFwicGFzdGVcIiB8fCBjYW5kaWRhdGUgPT09IFwibm9uZVwiXG4gICAgICA/IGNhbmRpZGF0ZVxuICAgICAgOiBmYWxsYmFjaztcbiAgY29uc3QgbnVtYmVyID0gKGNhbmRpZGF0ZTogdW5rbm93biwgZmFsbGJhY2s6IG51bWJlciwgbWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyID0+XG4gICAgdHlwZW9mIGNhbmRpZGF0ZSA9PT0gXCJudW1iZXJcIiAmJiBOdW1iZXIuaXNGaW5pdGUoY2FuZGlkYXRlKVxuICAgICAgPyBNYXRoLm1pbihtYXgsIE1hdGgubWF4KG1pbiwgTWF0aC5yb3VuZChjYW5kaWRhdGUpKSlcbiAgICAgIDogZmFsbGJhY2s7XG4gIHJldHVybiB7XG4gICAgYnV0dG9uVGFwQWN0aW9uOiBhY3Rpb24odmFsdWUuYnV0dG9uVGFwQWN0aW9uLCBERUZBVUxUX1NFVFRJTkdTLmJ1dHRvblRhcEFjdGlvbiksXG4gICAgYnV0dG9uRG91YmxlVGFwQWN0aW9uOiBhY3Rpb24oXG4gICAgICB2YWx1ZS5idXR0b25Eb3VibGVUYXBBY3Rpb24sXG4gICAgICBERUZBVUxUX1NFVFRJTkdTLmJ1dHRvbkRvdWJsZVRhcEFjdGlvblxuICAgICksXG4gICAgYnV0dG9uSG9sZEFjdGlvbjogYWN0aW9uKHZhbHVlLmJ1dHRvbkhvbGRBY3Rpb24sIERFRkFVTFRfU0VUVElOR1MuYnV0dG9uSG9sZEFjdGlvbiksXG4gICAgYnV0dG9uQ29udGFjdEFjdGlvbjogdmFsdWUuYnV0dG9uQ29udGFjdEFjdGlvbiA9PT0gXCJub25lXCIgPyBcIm5vbmVcIiA6IFwiZXJhc2VyXCIsXG4gICAgZG91YmxlVGFwTXM6IG51bWJlcih2YWx1ZS5kb3VibGVUYXBNcywgMzAwLCAxMDAsIDEwMDApLFxuICAgIGxvbmdQcmVzc01zOiBudW1iZXIodmFsdWUubG9uZ1ByZXNzTXMsIDQ1MCwgMTUwLCAyMDAwKSxcbiAgICBtb3ZlbWVudFRocmVzaG9sZFB4OiBudW1iZXIodmFsdWUubW92ZW1lbnRUaHJlc2hvbGRQeCwgOCwgMSwgMTAwKSxcbiAgICBkZWJ1Z01vZGU6IHZhbHVlLmRlYnVnTW9kZSA9PT0gdHJ1ZSxcbiAgICBkZWJ1Z092ZXJsYXk6IHZhbHVlLmRlYnVnT3ZlcmxheSA9PT0gdHJ1ZSxcbiAgfTtcbn1cbiIsICJpbXBvcnQgeyBOb3RpY2UsIHR5cGUgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgeyBQb2ludCB9IGZyb20gXCIuLi9zdHlsdXMvdHlwZXNcIjtcbmltcG9ydCB7XG4gIGdldExlYWZBcGksXG4gIHJlYWRBY3RpdmVUb29sLFxuICB0eXBlIEFjdGl2ZVRvb2xTbmFwc2hvdCxcbiAgdHlwZSBCcmlkZ2VPcGVyYXRpb25SZXN1bHQsXG4gIHR5cGUgQnJpZGdlUmVzdWx0LFxuICB0eXBlIENvbXBhdGlibGVJbXBlcmF0aXZlQXBpLFxufSBmcm9tIFwiLi9jb21wYXRpYmlsaXR5XCI7XG5cbmV4cG9ydCB0eXBlIHtcbiAgQWN0aXZlVG9vbFNuYXBzaG90LFxuICBCcmlkZ2VGYWlsdXJlQ29kZSxcbiAgQnJpZGdlT3BlcmF0aW9uUmVzdWx0LFxuICBCcmlkZ2VSZXN1bHQsXG59IGZyb20gXCIuL2NvbXBhdGliaWxpdHlcIjtcblxuLyoqIENvbXBhdGliaWxpdHkgYm91bmRhcnkgZm9yIHRoZSBvcHRpb25hbCBFeGNhbGlkcmF3IHBsdWdpbi4gKi9cbmV4cG9ydCBjbGFzcyBFeGNhbGlkcmF3QnJpZGdlIHtcbiAgcHJpdmF0ZSB3YXJuZWQgPSBmYWxzZTtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBsZWFmOiBXb3Jrc3BhY2VMZWFmKSB7fVxuXG4gIHN0YXJ0VGVtcG9yYXJ5RXJhc2VyKCk6IEJyaWRnZVJlc3VsdDxBY3RpdmVUb29sU25hcHNob3Q+IHtcbiAgICBjb25zdCBhcGlSZXN1bHQgPSB0aGlzLmdldEFwaSgpO1xuICAgIGlmICghYXBpUmVzdWx0Lm9rKSByZXR1cm4gdGhpcy5yZXBvcnQoYXBpUmVzdWx0KTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdG9vbCA9IHJlYWRBY3RpdmVUb29sKGFwaVJlc3VsdC52YWx1ZSk7XG4gICAgICBpZiAoIXRvb2wpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmFpbHVyZShcbiAgICAgICAgICBcImluY29tcGF0aWJsZVwiLFxuICAgICAgICAgIFwiVGVtcG9yYXJ5IGVyYXNlciBjb3VsZCBub3QgcmVhZCB0aGUgY3VycmVudCBhY3RpdmUgdG9vbC5cIlxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgYXBpUmVzdWx0LnZhbHVlLnNldEFjdGl2ZVRvb2woeyB0eXBlOiBcImVyYXNlclwiIH0pO1xuICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiB0b29sIH07XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwiZmFpbGVkXCIsIFwiVGVtcG9yYXJ5IGVyYXNlciBpcyB1bmF2YWlsYWJsZSBpbiB0aGlzIEV4Y2FsaWRyYXcgdmlldy5cIik7XG4gICAgfVxuICB9XG4gIHJlc3RvcmVUb29sKHRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCk6IEJyaWRnZU9wZXJhdGlvblJlc3VsdCB7XG4gICAgY29uc3QgYXBpUmVzdWx0ID0gdGhpcy5nZXRBcGkoKTtcbiAgICBpZiAoIWFwaVJlc3VsdC5vaykgcmV0dXJuIHRoaXMucmVwb3J0KGFwaVJlc3VsdCk7XG4gICAgdHJ5IHtcbiAgICAgIGFwaVJlc3VsdC52YWx1ZS5zZXRBY3RpdmVUb29sKHRvb2wpO1xuICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiB1bmRlZmluZWQgfTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXG4gICAgICAgIFwiZmFpbGVkXCIsXG4gICAgICAgIFwiVGhlIHByZXZpb3VzIHRvb2wgY291bGQgbm90IGJlIHJlc3RvcmVkIGluIHRoaXMgRXhjYWxpZHJhdyB2aWV3LlwiXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBzZXRUb29sKHR5cGU6IHN0cmluZyk6IEJyaWRnZU9wZXJhdGlvblJlc3VsdCB7XG4gICAgY29uc3QgYXBpUmVzdWx0ID0gdGhpcy5nZXRBcGkoKTtcbiAgICBpZiAoIWFwaVJlc3VsdC5vaykgcmV0dXJuIHRoaXMucmVwb3J0KGFwaVJlc3VsdCk7XG4gICAgdHJ5IHtcbiAgICAgIGFwaVJlc3VsdC52YWx1ZS5zZXRBY3RpdmVUb29sKHsgdHlwZSB9KTtcbiAgICAgIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogdW5kZWZpbmVkIH07XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwiZmFpbGVkXCIsIFwiVG9vbCBzd2l0Y2hpbmcgaXMgdW5hdmFpbGFibGUgaW4gdGhpcyBFeGNhbGlkcmF3IHZpZXcuXCIpO1xuICAgIH1cbiAgfVxuICBjb3B5U2VsZWN0ZWRFbGVtZW50cygpOiBCcmlkZ2VPcGVyYXRpb25SZXN1bHQge1xuICAgIHJldHVybiB0aGlzLmZhaWx1cmUoXCJ1bmF2YWlsYWJsZVwiLCBcIkNvcHkgcmVxdWlyZXMgYSBjb21wYXRpYmxlIEV4Y2FsaWRyYXcgQVBJLlwiKTtcbiAgfVxuICBwYXN0ZUF0KHBvaW50OiBQb2ludCk6IEJyaWRnZU9wZXJhdGlvblJlc3VsdCB7XG4gICAgdm9pZCBwb2ludDtcbiAgICByZXR1cm4gdGhpcy5mYWlsdXJlKFwidW5hdmFpbGFibGVcIiwgXCJQYXN0ZSByZXF1aXJlcyBhIGNvbXBhdGlibGUgRXhjYWxpZHJhdyBBUEkuXCIpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRBcGkoKTogQnJpZGdlUmVzdWx0PENvbXBhdGlibGVJbXBlcmF0aXZlQXBpPiB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBnZXRMZWFmQXBpKHRoaXMubGVhZi52aWV3KTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgY29kZTogXCJmYWlsZWRcIixcbiAgICAgICAgbWVzc2FnZTogXCJFeGNhbGlkcmF3IEFQSSBsb29rdXAgZmFpbGVkIGZvciB0aGlzIGxlYWYuXCIsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVwb3J0PFQ+KHJlc3VsdDogRXhjbHVkZTxCcmlkZ2VSZXN1bHQ8VD4sIHsgb2s6IHRydWUgfT4pOiBCcmlkZ2VSZXN1bHQ8bmV2ZXI+IHtcbiAgICB0aGlzLnVuc3VwcG9ydGVkKHJlc3VsdC5tZXNzYWdlKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHByaXZhdGUgZmFpbHVyZShcbiAgICBjb2RlOiBcInVuYXZhaWxhYmxlXCIgfCBcImluY29tcGF0aWJsZVwiIHwgXCJmYWlsZWRcIixcbiAgICBtZXNzYWdlOiBzdHJpbmdcbiAgKTogQnJpZGdlUmVzdWx0PG5ldmVyPiB7XG4gICAgdGhpcy51bnN1cHBvcnRlZChtZXNzYWdlKTtcbiAgICByZXR1cm4geyBvazogZmFsc2UsIGNvZGUsIG1lc3NhZ2UgfTtcbiAgfVxuICBwcml2YXRlIHVuc3VwcG9ydGVkKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy53YXJuZWQpIHtcbiAgICAgIG5ldyBOb3RpY2UoYEV4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzOiAke21lc3NhZ2V9YCk7XG4gICAgICB0aGlzLndhcm5lZCA9IHRydWU7XG4gICAgfVxuICB9XG59XG4iLCAiZXhwb3J0IGludGVyZmFjZSBBY3RpdmVUb29sU25hcHNob3Qge1xuICB0eXBlOiBzdHJpbmc7XG4gIFtrZXk6IHN0cmluZ106IHVua25vd247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1wZXJhdGl2ZUFwaSB7XG4gIGdldEFwcFN0YXRlPzogKCkgPT4geyBhY3RpdmVUb29sPzogQWN0aXZlVG9vbFNuYXBzaG90IH07XG4gIHNldEFjdGl2ZVRvb2w/OiAodG9vbDogQWN0aXZlVG9vbFNuYXBzaG90KSA9PiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBhdGlibGVJbXBlcmF0aXZlQXBpIGV4dGVuZHMgSW1wZXJhdGl2ZUFwaSB7XG4gIGdldEFwcFN0YXRlOiAoKSA9PiB7IGFjdGl2ZVRvb2w/OiBBY3RpdmVUb29sU25hcHNob3QgfTtcbiAgc2V0QWN0aXZlVG9vbDogKHRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUgQnJpZGdlRmFpbHVyZUNvZGUgPSBcInVuYXZhaWxhYmxlXCIgfCBcImluY29tcGF0aWJsZVwiIHwgXCJmYWlsZWRcIjtcblxuZXhwb3J0IHR5cGUgQnJpZGdlUmVzdWx0PFQ+ID1cbiAgeyBvazogdHJ1ZTsgdmFsdWU6IFQgfSB8IHsgb2s6IGZhbHNlOyBjb2RlOiBCcmlkZ2VGYWlsdXJlQ29kZTsgbWVzc2FnZTogc3RyaW5nIH07XG5cbmV4cG9ydCB0eXBlIEJyaWRnZU9wZXJhdGlvblJlc3VsdCA9IEJyaWRnZVJlc3VsdDx2b2lkPjtcblxuZXhwb3J0IGludGVyZmFjZSBFeGNhbGlkcmF3TGVhZlN1cmZhY2Uge1xuICAvKipcbiAgICogVGhpcyBpcyBhIGNvbXBhdGliaWxpdHkgZmFsbGJhY2ssIG5vdCBhIGRvY3VtZW50ZWQgRXhjYWxpZHJhdyBwbHVnaW4gQVBJLlxuICAgKiBLZWVwIGFjY2VzcyB0byBpdCBoZXJlIHVudGlsIEV4Y2FsaWRyYXcgcHVibGlzaGVzIGEgdGhpcmQtcGFydHksIGxlYWYtc2NvcGVkXG4gICAqIGludGVncmF0aW9uIHBvaW50LlxuICAgKi9cbiAgZXhjYWxpZHJhd0FQST86IHVua25vd247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVG9vbENhcGFiaWxpdGllcyB7XG4gIGNhblJlYWRBY3RpdmVUb29sOiBib29sZWFuO1xuICBjYW5TZXRBY3RpdmVUb29sOiBib29sZWFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9vbENhcGFiaWxpdGllcyhhcGk6IEltcGVyYXRpdmVBcGkgfCBudWxsKTogVG9vbENhcGFiaWxpdGllcyB7XG4gIHJldHVybiB7XG4gICAgY2FuUmVhZEFjdGl2ZVRvb2w6IHR5cGVvZiBhcGk/LmdldEFwcFN0YXRlID09PSBcImZ1bmN0aW9uXCIsXG4gICAgY2FuU2V0QWN0aXZlVG9vbDogdHlwZW9mIGFwaT8uc2V0QWN0aXZlVG9vbCA9PT0gXCJmdW5jdGlvblwiLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFjdGl2ZVRvb2woYXBpOiBJbXBlcmF0aXZlQXBpKTogQWN0aXZlVG9vbFNuYXBzaG90IHwgbnVsbCB7XG4gIGNvbnN0IGFjdGl2ZVRvb2wgPSBhcGkuZ2V0QXBwU3RhdGU/LigpLmFjdGl2ZVRvb2w7XG4gIHJldHVybiBhY3RpdmVUb29sID8geyAuLi5hY3RpdmVUb29sIH0gOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TGVhZkFwaSh2aWV3OiB1bmtub3duKTogQnJpZGdlUmVzdWx0PENvbXBhdGlibGVJbXBlcmF0aXZlQXBpPiB7XG4gIGlmICghdmlldyB8fCB0eXBlb2YgdmlldyAhPT0gXCJvYmplY3RcIikge1xuICAgIHJldHVybiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBjb2RlOiBcInVuYXZhaWxhYmxlXCIsXG4gICAgICBtZXNzYWdlOiBcIlRoaXMgbGVhZiBkb2VzIG5vdCBleHBvc2UgYW4gRXhjYWxpZHJhdyB2aWV3LlwiLFxuICAgIH07XG4gIH1cbiAgY29uc3QgYXBpID0gKHZpZXcgYXMgRXhjYWxpZHJhd0xlYWZTdXJmYWNlKS5leGNhbGlkcmF3QVBJO1xuICBpZiAoIWFwaSB8fCB0eXBlb2YgYXBpICE9PSBcIm9iamVjdFwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiBmYWxzZSxcbiAgICAgIGNvZGU6IFwidW5hdmFpbGFibGVcIixcbiAgICAgIG1lc3NhZ2U6IFwiRXhjYWxpZHJhdyBoYXMgbm90IG1hZGUgYW4gQVBJIGF2YWlsYWJsZSBmb3IgdGhpcyBsZWFmLlwiLFxuICAgIH07XG4gIH1cbiAgY29uc3QgY2FwYWJpbGl0aWVzID0gdG9vbENhcGFiaWxpdGllcyhhcGkgYXMgSW1wZXJhdGl2ZUFwaSk7XG4gIGlmICghY2FwYWJpbGl0aWVzLmNhblJlYWRBY3RpdmVUb29sIHx8ICFjYXBhYmlsaXRpZXMuY2FuU2V0QWN0aXZlVG9vbCkge1xuICAgIHJldHVybiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBjb2RlOiBcImluY29tcGF0aWJsZVwiLFxuICAgICAgbWVzc2FnZTogXCJUaGlzIEV4Y2FsaWRyYXcgQVBJIGRvZXMgbm90IHN1cHBvcnQgYWN0aXZlLXRvb2wgcmVhZCBhbmQgd3JpdGUgb3BlcmF0aW9ucy5cIixcbiAgICB9O1xuICB9XG4gIHJldHVybiB7IG9rOiB0cnVlLCB2YWx1ZTogYXBpIGFzIENvbXBhdGlibGVJbXBlcmF0aXZlQXBpIH07XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBEZWJ1Z0xvZ2dlciB7XG4gIHByaXZhdGUgdHJhY2U6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudFtdID0gW107XG4gIHByaXZhdGUgbGFzdE1vdmVMb2dBdCA9IC1JbmZpbml0eTtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBlbmFibGVkOiAoKSA9PiBib29sZWFuKSB7fVxuXG4gIGV2ZW50KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCgpKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwibW92ZVwiICYmIGV2ZW50LnRpbWVzdGFtcCAtIHRoaXMubGFzdE1vdmVMb2dBdCA8IDEwMCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5raW5kID09PSBcIm1vdmVcIikgdGhpcy5sYXN0TW92ZUxvZ0F0ID0gZXZlbnQudGltZXN0YW1wO1xuICAgIHRoaXMudHJhY2UucHVzaChldmVudCk7XG4gICAgaWYgKHRoaXMudHJhY2UubGVuZ3RoID4gMTAwKSB0aGlzLnRyYWNlLnNoaWZ0KCk7XG4gICAgY29uc29sZS5kZWJ1ZyhcIltFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9sc11cIiwgZXZlbnQpO1xuICB9XG4gIG1lc3NhZ2UobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZW5hYmxlZCgpKSBjb25zb2xlLmRlYnVnKFwiW0V4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzXVwiLCBtZXNzYWdlKTtcbiAgfVxuICBleHBvcnRUcmFjZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLnRyYWNlLCBudWxsLCAyKTtcbiAgfVxuICBjbGVhcigpOiB2b2lkIHtcbiAgICB0aGlzLnRyYWNlID0gW107XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IEdlc3R1cmVFZmZlY3QsIEdlc3R1cmVTdGF0ZVNuYXBzaG90LCBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbi8qKiBBIGRpYWdub3N0aWMtb25seSwgbm9uLWludGVyYWN0aXZlIG92ZXJsYXkgbG9jYWwgdG8gb25lIEV4Y2FsaWRyYXcgdmlldy4gKi9cbmV4cG9ydCBjbGFzcyBEZWJ1Z092ZXJsYXkge1xuICBwcml2YXRlIGVsZW1lbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXI6IEhUTUxFbGVtZW50LFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZW5hYmxlZDogKCkgPT4gYm9vbGVhblxuICApIHt9XG5cbiAgdXBkYXRlKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQsIHN0YXRlOiBHZXN0dXJlU3RhdGVTbmFwc2hvdCwgZWZmZWN0PzogR2VzdHVyZUVmZmVjdCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5lbmFibGVkKCkpIHtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgb3ZlcmxheSA9IHRoaXMuZW5zdXJlRWxlbWVudCgpO1xuICAgIGNvbnN0IHN0YXRlU3VtbWFyeSA9IFtcbiAgICAgIGBob3Zlcjoke1N0cmluZyghc3RhdGUucGVuQ29udGFjdCl9YCxcbiAgICAgIGBiYXJyZWw6JHtTdHJpbmcoc3RhdGUuYmFycmVsQnV0dG9uSGVsZCl9YCxcbiAgICAgIGBjb25zdW1lZDoke1N0cmluZyhzdGF0ZS5nZXN0dXJlQ29uc3VtZWQpfWAsXG4gICAgICBgdGVtcDoke1N0cmluZyhzdGF0ZS50ZW1wb3JhcnlUb29sQWN0aXZlKX1gLFxuICAgIF0uam9pbihcIiBcdTAwQjcgXCIpO1xuICAgIG92ZXJsYXkuc2V0VGV4dChcbiAgICAgIFtcbiAgICAgICAgYFMgUGVuICR7ZXZlbnQua2luZH0gaWQ6JHtldmVudC5wb2ludGVySWR9IGJ1dHRvbnM6JHtldmVudC5idXR0b25zfSBwcmVzc3VyZToke2V2ZW50LnByZXNzdXJlLnRvRml4ZWQoMil9YCxcbiAgICAgICAgc3RhdGVTdW1tYXJ5LFxuICAgICAgICBgZWZmZWN0OiR7ZWZmZWN0Py50eXBlID8/IFwibm9uZVwifWAsXG4gICAgICBdLmpvaW4oXCJcXG5cIilcbiAgICApO1xuICB9XG5cbiAgY2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5lbGVtZW50Py5yZW1vdmUoKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVFbGVtZW50KCk6IEhUTUxFbGVtZW50IHtcbiAgICBpZiAodGhpcy5lbGVtZW50KSByZXR1cm4gdGhpcy5lbGVtZW50O1xuICAgIHRoaXMuZWxlbWVudCA9IHRoaXMuY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJleGNhbGlkcmF3LXN0eWx1cy1kZWJ1Zy1vdmVybGF5XCIgfSk7XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudDtcbiAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgTm9ybWFsaXplZFN0eWx1c0V2ZW50LCBTdHlsdXNFdmVudEtpbmQgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5jb25zdCBldmVudEtpbmRzOiBSZWNvcmQ8c3RyaW5nLCBTdHlsdXNFdmVudEtpbmQ+ID0ge1xuICBwb2ludGVyZG93bjogXCJkb3duXCIsXG4gIHBvaW50ZXJtb3ZlOiBcIm1vdmVcIixcbiAgcG9pbnRlcnVwOiBcInVwXCIsXG4gIHBvaW50ZXJjYW5jZWw6IFwiY2FuY2VsXCIsXG4gIGNvbnRleHRtZW51OiBcImNvbnRleHRtZW51XCIsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplUG9pbnRlckV2ZW50KFxuICBldmVudDogUG9pbnRlckV2ZW50LFxuICBpc0NhbnZhc1RhcmdldDogYm9vbGVhblxuKTogTm9ybWFsaXplZFN0eWx1c0V2ZW50IHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBldmVudEtpbmRzW2V2ZW50LnR5cGVdID8/IFwibW92ZVwiLFxuICAgIHBvaW50ZXJUeXBlOiBldmVudC5wb2ludGVyVHlwZSxcbiAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICBidXR0b25zOiBldmVudC5idXR0b25zLFxuICAgIGJ1dHRvbjogZXZlbnQuYnV0dG9uLFxuICAgIHByZXNzdXJlOiBldmVudC5wcmVzc3VyZSxcbiAgICB4OiBldmVudC5jbGllbnRYLFxuICAgIHk6IGV2ZW50LmNsaWVudFksXG4gICAgdGltZXN0YW1wOiBldmVudC50aW1lU3RhbXAsXG4gICAgaXNDYW52YXNUYXJnZXQsXG4gIH07XG59XG4iLCAiaW1wb3J0IHR5cGUge1xuICBHZXN0dXJlRWZmZWN0LFxuICBHZXN0dXJlU2V0dGluZ3MsXG4gIEdlc3R1cmVTdGF0ZVNuYXBzaG90LFxuICBOb3JtYWxpemVkU3R5bHVzRXZlbnQsXG4gIFBvaW50LFxuICBTY2hlZHVsZXIsXG59IGZyb20gXCIuL3R5cGVzXCI7XG5cbmludGVyZmFjZSBQZW5kaW5nVGFwIHtcbiAgcG9pbnQ6IFBvaW50O1xuICB0aW1lcjogdW5rbm93bjtcbn1cblxuLyoqIFB1cmUgcGVyLXZpZXcgUyBQZW4gZ2VzdHVyZSBwb2xpY3kuIEl0IG5ldmVyIHRvdWNoZXMgdGhlIERPTSBvciBFeGNhbGlkcmF3LiAqL1xuZXhwb3J0IGNsYXNzIFN0eWx1c0dlc3R1cmVNYWNoaW5lIHtcbiAgcHJpdmF0ZSBiYXJyZWxCdXR0b25IZWxkID0gZmFsc2U7XG4gIHByaXZhdGUgcGVuQ29udGFjdCA9IGZhbHNlO1xuICBwcml2YXRlIGNvbnN1bWVkID0gZmFsc2U7XG4gIHByaXZhdGUgbW92ZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBob2xkRmlyZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSB0ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gIHByaXZhdGUgcHJlc3NPcmlnaW46IFBvaW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaG9sZFRpbWVyOiB1bmtub3duIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGVuZGluZ1RhcDogUGVuZGluZ1RhcCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGFjdGl2ZVBvaW50ZXJJZDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogR2VzdHVyZVNldHRpbmdzLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2NoZWR1bGVyOiBTY2hlZHVsZXJcbiAgKSB7fVxuXG4gIGhhbmRsZShldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50KTogR2VzdHVyZUVmZmVjdFtdIHtcbiAgICBpZiAoZXZlbnQucG9pbnRlclR5cGUgIT09IFwicGVuXCIpIHJldHVybiBbXTtcbiAgICBjb25zdCBlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10gPSBbXTtcbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJjb250ZXh0bWVudVwiKSB7XG4gICAgICBpZiAodGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlIHx8ICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgdGhpcy5wZW5Db250YWN0KSlcbiAgICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJzdXBwcmVzcy1jb250ZXh0LW1lbnVcIiB9KTtcbiAgICAgIHJldHVybiBlZmZlY3RzO1xuICAgIH1cblxuICAgIGlmIChldmVudC5raW5kID09PSBcImRvd25cIikge1xuICAgICAgdGhpcy5wZW5Db250YWN0ID0gdHJ1ZTtcbiAgICAgIHRoaXMuYWN0aXZlUG9pbnRlcklkID0gZXZlbnQucG9pbnRlcklkO1xuICAgICAgaWYgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCkgdGhpcy5jb25zdW1lRm9yQ29udGFjdChldmVudCwgZWZmZWN0cyk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJ1cFwiIHx8IGV2ZW50LmtpbmQgPT09IFwiY2FuY2VsXCIpIHtcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXJJZCAhPT0gbnVsbCAmJiBldmVudC5wb2ludGVySWQgIT09IHRoaXMuYWN0aXZlUG9pbnRlcklkKSByZXR1cm4gZWZmZWN0cztcbiAgICAgIHRoaXMucGVuQ29udGFjdCA9IGZhbHNlO1xuICAgICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBudWxsO1xuICAgICAgaWYgKHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkge1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJ0ZW1wb3JhcnktdG9vbC1lbmRcIiB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChldmVudC5raW5kID09PSBcImNhbmNlbFwiKSB0aGlzLmNhbmNlbFByZXNzKCk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICAvLyBIb3ZlciBtb3ZlbWVudCBpcyB0aGUgb25seSBldmlkZW5jZSB1c2VkIHRvIGludGVycHJldCBidXR0b25zIGFzIGJhcnJlbCBzdGF0ZS5cbiAgICBpZiAodGhpcy5wZW5Db250YWN0KSByZXR1cm4gZWZmZWN0cztcbiAgICBjb25zdCBoZWxkTm93ID0gKGV2ZW50LmJ1dHRvbnMgJiAxKSAhPT0gMDtcbiAgICBpZiAoIXRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiBoZWxkTm93KSB0aGlzLnN0YXJ0UHJlc3MoZXZlbnQpO1xuICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgaGVsZE5vdykgdGhpcy50cmFja0hvdmVyTW92ZW1lbnQoZXZlbnQpO1xuICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgIWhlbGROb3cpIHRoaXMucmVsZWFzZVByZXNzKGVmZmVjdHMpO1xuICAgIHJldHVybiBlZmZlY3RzO1xuICB9XG5cbiAgZGlzcG9zZSgpOiBHZXN0dXJlRWZmZWN0W10ge1xuICAgIGNvbnN0IGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSA9IFtdO1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgIGlmICh0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUpIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtZW5kXCIgfSk7XG4gICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5jYW5jZWxQcmVzcygpO1xuICAgIHJldHVybiBlZmZlY3RzO1xuICB9XG5cbiAgc25hcHNob3QoKTogR2VzdHVyZVN0YXRlU25hcHNob3Qge1xuICAgIHJldHVybiB7XG4gICAgICBiYXJyZWxCdXR0b25IZWxkOiB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQsXG4gICAgICBwZW5Db250YWN0OiB0aGlzLnBlbkNvbnRhY3QsXG4gICAgICBnZXN0dXJlQ29uc3VtZWQ6IHRoaXMuY29uc3VtZWQsXG4gICAgICB0ZW1wb3JhcnlUb29sQWN0aXZlOiB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUsXG4gICAgICBob3Zlckdlc3R1cmVNb3ZlZDogdGhpcy5tb3ZlZCxcbiAgICAgIGxvbmdQcmVzc0ZpcmVkOiB0aGlzLmhvbGRGaXJlZCxcbiAgICAgIGFjdGl2ZVBvaW50ZXJJZDogdGhpcy5hY3RpdmVQb2ludGVySWQsXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBUaGUgY29udHJvbGxlciBjYWxscyB0aGlzIHdoZW4gdGhlIG9wdGlvbmFsIEV4Y2FsaWRyYXcgYnJpZGdlIHJlamVjdHMgYSBzdGFydCByZXF1ZXN0LiAqL1xuICB0ZW1wb3JhcnlUb29sRGlkTm90U3RhcnQoKTogdm9pZCB7XG4gICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIHN0YXJ0UHJlc3MoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IHZvaWQge1xuICAgIHRoaXMuYmFycmVsQnV0dG9uSGVsZCA9IHRydWU7XG4gICAgdGhpcy5jb25zdW1lZCA9IGZhbHNlO1xuICAgIHRoaXMubW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmhvbGRGaXJlZCA9IGZhbHNlO1xuICAgIHRoaXMucHJlc3NPcmlnaW4gPSB7IHg6IGV2ZW50LngsIHk6IGV2ZW50LnkgfTtcbiAgICB0aGlzLmhvbGRUaW1lciA9IHRoaXMuc2NoZWR1bGVyLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKFxuICAgICAgICAhdGhpcy5iYXJyZWxCdXR0b25IZWxkIHx8XG4gICAgICAgIHRoaXMucGVuQ29udGFjdCB8fFxuICAgICAgICB0aGlzLm1vdmVkIHx8XG4gICAgICAgIHRoaXMuY29uc3VtZWQgfHxcbiAgICAgICAgIXRoaXMucHJlc3NPcmlnaW5cbiAgICAgIClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgdGhpcy5ob2xkRmlyZWQgPSB0cnVlO1xuICAgICAgdGhpcy5jb25zdW1lZCA9IHRydWU7XG4gICAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICAgIHRoaXMub25FZmZlY3Q/Lih7IHR5cGU6IFwiYnV0dG9uLWhvbGRcIiwgcG9pbnQ6IHRoaXMucHJlc3NPcmlnaW4gfSk7XG4gICAgfSwgdGhpcy5zZXR0aW5ncy5sb25nUHJlc3NNcyk7XG4gIH1cblxuICAvKiogQ29udHJvbGxlciByZWdpc3RlcnMgdGhpcyBzbyBzY2hlZHVsZXIgY2FsbGJhY2tzIHJldGFpbiBwdXJlIHNlbWFudGljIG91dHB1dC4gKi9cbiAgcHJpdmF0ZSBvbkVmZmVjdDogKChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gIHNldEVmZmVjdFNpbmsoc2luazogKGVmZmVjdDogR2VzdHVyZUVmZmVjdCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMub25FZmZlY3QgPSBzaW5rO1xuICB9XG5cbiAgcHJpdmF0ZSB0cmFja0hvdmVyTW92ZW1lbnQoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5wcmVzc09yaWdpbiB8fCB0aGlzLm1vdmVkKSByZXR1cm47XG4gICAgY29uc3QgZHggPSBldmVudC54IC0gdGhpcy5wcmVzc09yaWdpbi54O1xuICAgIGNvbnN0IGR5ID0gZXZlbnQueSAtIHRoaXMucHJlc3NPcmlnaW4ueTtcbiAgICBpZiAoTWF0aC5oeXBvdChkeCwgZHkpID4gdGhpcy5zZXR0aW5ncy5tb3ZlbWVudFRocmVzaG9sZFB4KSB7XG4gICAgICB0aGlzLm1vdmVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY29uc3VtZUZvckNvbnRhY3QoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdKTogdm9pZCB7XG4gICAgdGhpcy5jb25zdW1lZCA9IHRydWU7XG4gICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MuYnV0dG9uQ29udGFjdEFjdGlvbiA9PT0gXCJlcmFzZXJcIiAmJiAhdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlKSB7XG4gICAgICB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUgPSB0cnVlO1xuICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJ0ZW1wb3JhcnktdG9vbC1zdGFydFwiLCBwb2ludDogeyB4OiBldmVudC54LCB5OiBldmVudC55IH0gfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWxlYXNlUHJlc3MoZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdKTogdm9pZCB7XG4gICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgdGhpcy5iYXJyZWxCdXR0b25IZWxkID0gZmFsc2U7XG4gICAgaWYgKCF0aGlzLmNvbnN1bWVkICYmICF0aGlzLm1vdmVkICYmICF0aGlzLmhvbGRGaXJlZCAmJiB0aGlzLnByZXNzT3JpZ2luKSB7XG4gICAgICBpZiAodGhpcy5wZW5kaW5nVGFwKSB7XG4gICAgICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgICAgICBlZmZlY3RzLnB1c2goeyB0eXBlOiBcImJ1dHRvbi1kb3VibGUtdGFwXCIsIHBvaW50OiB0aGlzLnByZXNzT3JpZ2luIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcG9pbnQgPSB0aGlzLnByZXNzT3JpZ2luO1xuICAgICAgICBjb25zdCB0aW1lciA9IHRoaXMuc2NoZWR1bGVyLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMucGVuZGluZ1RhcCA9IG51bGw7XG4gICAgICAgICAgdGhpcy5vbkVmZmVjdD8uKHsgdHlwZTogXCJidXR0b24tdGFwXCIsIHBvaW50IH0pO1xuICAgICAgICB9LCB0aGlzLnNldHRpbmdzLmRvdWJsZVRhcE1zKTtcbiAgICAgICAgdGhpcy5wZW5kaW5nVGFwID0geyBwb2ludCwgdGltZXIgfTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5wcmVzc09yaWdpbiA9IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGNhbmNlbFByZXNzKCk6IHZvaWQge1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuYmFycmVsQnV0dG9uSGVsZCA9IGZhbHNlO1xuICAgIHRoaXMucGVuQ29udGFjdCA9IGZhbHNlO1xuICAgIHRoaXMuY29uc3VtZWQgPSBmYWxzZTtcbiAgICB0aGlzLm1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5ob2xkRmlyZWQgPSBmYWxzZTtcbiAgICB0aGlzLnByZXNzT3JpZ2luID0gbnVsbDtcbiAgICB0aGlzLmFjdGl2ZVBvaW50ZXJJZCA9IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGNhbmNlbFRpbWVyKHdoaWNoOiBcImhvbGRcIik6IHZvaWQge1xuICAgIGlmICh3aGljaCA9PT0gXCJob2xkXCIgJiYgdGhpcy5ob2xkVGltZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuc2NoZWR1bGVyLmNsZWFyVGltZW91dCh0aGlzLmhvbGRUaW1lcik7XG4gICAgICB0aGlzLmhvbGRUaW1lciA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjYW5jZWxQZW5kaW5nVGFwKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnBlbmRpbmdUYXApIHRoaXMuc2NoZWR1bGVyLmNsZWFyVGltZW91dCh0aGlzLnBlbmRpbmdUYXAudGltZXIpO1xuICAgIHRoaXMucGVuZGluZ1RhcCA9IG51bGw7XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIHsgRXhjYWxpZHJhd0JyaWRnZSwgQWN0aXZlVG9vbFNuYXBzaG90IH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZVwiO1xuaW1wb3J0IHR5cGUgeyBEZWJ1Z0xvZ2dlciB9IGZyb20gXCIuLi9kZWJ1Zy9EZWJ1Z0xvZ2dlclwiO1xuaW1wb3J0IHsgRGVidWdPdmVybGF5IH0gZnJvbSBcIi4uL2RlYnVnL0RlYnVnT3ZlcmxheVwiO1xuaW1wb3J0IHR5cGUgeyBTdHlsdXNDb250cm9sc1NldHRpbmdzIH0gZnJvbSBcIi4uL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBub3JtYWxpemVQb2ludGVyRXZlbnQgfSBmcm9tIFwiLi9ub3JtYWxpemVQb2ludGVyRXZlbnRcIjtcbmltcG9ydCB7IFN0eWx1c0dlc3R1cmVNYWNoaW5lIH0gZnJvbSBcIi4vU3R5bHVzR2VzdHVyZU1hY2hpbmVcIjtcbmltcG9ydCB0eXBlIHsgR2VzdHVyZUVmZmVjdCwgTm9ybWFsaXplZFN0eWx1c0V2ZW50LCBQb2ludCwgU2NoZWR1bGVyIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IHR5cGUgQWN0aW9uSGFuZGxlciA9IChcbiAgYWN0aW9uOiBcIm1lbnVcIiB8IFwiY29weVwiIHwgXCJwYXN0ZVwiIHwgXCJub25lXCIsXG4gIHBvaW50OiBQb2ludCxcbiAgYnJpZGdlOiBFeGNhbGlkcmF3QnJpZGdlXG4pID0+IHZvaWQ7XG5cbmV4cG9ydCBjbGFzcyBTdHlsdXNDb250cm9sbGVyIHtcbiAgcHJpdmF0ZSByZWFkb25seSBtYWNoaW5lOiBTdHlsdXNHZXN0dXJlTWFjaGluZTtcbiAgcHJpdmF0ZSBzYXZlZFRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRpc3Bvc2VkID0gZmFsc2U7XG4gIHByaXZhdGUgYXR0YWNoZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSByZWFkb25seSBsaXN0ZW5lcnM6IEFycmF5PFtrZXlvZiBIVE1MRWxlbWVudEV2ZW50TWFwLCBFdmVudExpc3RlbmVyXT4gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBvdmVybGF5OiBEZWJ1Z092ZXJsYXk7XG4gIHByaXZhdGUgbGF0ZXN0RXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGVhZjogV29ya3NwYWNlTGVhZixcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNldHRpbmdzOiAoKSA9PiBTdHlsdXNDb250cm9sc1NldHRpbmdzLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGVidWc6IERlYnVnTG9nZ2VyLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGlzcGF0Y2hBY3Rpb246IEFjdGlvbkhhbmRsZXIsXG4gICAgc2NoZWR1bGVyOiBTY2hlZHVsZXIgPSB3aW5kb3dcbiAgKSB7XG4gICAgdGhpcy5tYWNoaW5lID0gbmV3IFN0eWx1c0dlc3R1cmVNYWNoaW5lKHRoaXMuZ2VzdHVyZVNldHRpbmdzKCksIHNjaGVkdWxlcik7XG4gICAgdGhpcy5tYWNoaW5lLnNldEVmZmVjdFNpbmsoKGVmZmVjdCkgPT4gdGhpcy5hcHBseUVmZmVjdChlZmZlY3QpKTtcbiAgICB0aGlzLm92ZXJsYXkgPSBuZXcgRGVidWdPdmVybGF5KFxuICAgICAgdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWwsXG4gICAgICAoKSA9PiB0aGlzLnNldHRpbmdzKCkuZGVidWdNb2RlICYmIHRoaXMuc2V0dGluZ3MoKS5kZWJ1Z092ZXJsYXlcbiAgICApO1xuICB9XG5cbiAgYXR0YWNoKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkIHx8IHRoaXMuYXR0YWNoZWQpIHJldHVybjtcbiAgICB0aGlzLmF0dGFjaGVkID0gdHJ1ZTtcbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWw7XG4gICAgZm9yIChjb25zdCB0eXBlIG9mIFtcbiAgICAgIFwicG9pbnRlcmRvd25cIixcbiAgICAgIFwicG9pbnRlcm1vdmVcIixcbiAgICAgIFwicG9pbnRlcnVwXCIsXG4gICAgICBcInBvaW50ZXJjYW5jZWxcIixcbiAgICAgIFwiY29udGV4dG1lbnVcIixcbiAgICBdIGFzIGNvbnN0KSB7XG4gICAgICBjb25zdCBsaXN0ZW5lcjogRXZlbnRMaXN0ZW5lciA9IChyYXcpID0+IHRoaXMub25Qb2ludGVyRXZlbnQocmF3IGFzIFBvaW50ZXJFdmVudCk7XG4gICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICAgICAgdGhpcy5saXN0ZW5lcnMucHVzaChbdHlwZSwgbGlzdGVuZXJdKTtcbiAgICB9XG4gIH1cblxuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSByZXR1cm47XG4gICAgdGhpcy5kaXNwb3NlZCA9IHRydWU7XG4gICAgdGhpcy5hdHRhY2hlZCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgW3R5cGUsIGxpc3RlbmVyXSBvZiB0aGlzLmxpc3RlbmVycylcbiAgICAgIHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICAgIHRoaXMubGlzdGVuZXJzLmxlbmd0aCA9IDA7XG4gICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgdGhpcy5tYWNoaW5lLmRpc3Bvc2UoKSkgdGhpcy5hcHBseUVmZmVjdChlZmZlY3QpO1xuICAgIHRoaXMub3ZlcmxheS5jbG9zZSgpO1xuICB9XG4gIGdldFRyYWNlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVidWcuZXhwb3J0VHJhY2UoKTtcbiAgfVxuXG4gIHByaXZhdGUgb25Qb2ludGVyRXZlbnQocmF3OiBQb2ludGVyRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAocmF3LnBvaW50ZXJUeXBlICE9PSBcInBlblwiKSByZXR1cm47XG4gICAgY29uc3QgZXZlbnQgPSBub3JtYWxpemVQb2ludGVyRXZlbnQoXG4gICAgICByYXcsXG4gICAgICB0aGlzLmxlYWYudmlldy5jb250YWluZXJFbC5jb250YWlucyhyYXcudGFyZ2V0IGFzIE5vZGUpXG4gICAgKTtcbiAgICB0aGlzLmxhdGVzdEV2ZW50ID0gZXZlbnQ7XG4gICAgdGhpcy5kZWJ1Zy5ldmVudChldmVudCk7XG4gICAgY29uc3QgZWZmZWN0cyA9IHRoaXMubWFjaGluZS5oYW5kbGUoZXZlbnQpO1xuICAgIGlmIChlZmZlY3RzLmxlbmd0aCA9PT0gMCkgdGhpcy5vdmVybGF5LnVwZGF0ZShldmVudCwgdGhpcy5tYWNoaW5lLnNuYXBzaG90KCkpO1xuICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIGVmZmVjdHMpIHtcbiAgICAgIGlmIChlZmZlY3QudHlwZSA9PT0gXCJzdXBwcmVzcy1jb250ZXh0LW1lbnVcIikgcmF3LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLmFwcGx5RWZmZWN0KGVmZmVjdCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBseUVmZmVjdChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QpOiB2b2lkIHtcbiAgICB0aGlzLmRlYnVnLm1lc3NhZ2UoYGVmZmVjdDogJHtlZmZlY3QudHlwZX1gKTtcbiAgICBzd2l0Y2ggKGVmZmVjdC50eXBlKSB7XG4gICAgICBjYXNlIFwidGVtcG9yYXJ5LXRvb2wtc3RhcnRcIjpcbiAgICAgICAgaWYgKCF0aGlzLnNhdmVkVG9vbCkge1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYnJpZGdlLnN0YXJ0VGVtcG9yYXJ5RXJhc2VyKCk7XG4gICAgICAgICAgaWYgKHJlc3VsdC5vaykgdGhpcy5zYXZlZFRvb2wgPSByZXN1bHQudmFsdWU7XG4gICAgICAgICAgZWxzZSB0aGlzLm1hY2hpbmUudGVtcG9yYXJ5VG9vbERpZE5vdFN0YXJ0KCk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwidGVtcG9yYXJ5LXRvb2wtZW5kXCI6XG4gICAgICAgIGlmICh0aGlzLnNhdmVkVG9vbCkgdGhpcy5icmlkZ2UucmVzdG9yZVRvb2wodGhpcy5zYXZlZFRvb2wpO1xuICAgICAgICB0aGlzLnNhdmVkVG9vbCA9IG51bGw7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImJ1dHRvbi10YXBcIjpcbiAgICAgICAgdGhpcy5kaXNwYXRjaEFjdGlvbih0aGlzLnNldHRpbmdzKCkuYnV0dG9uVGFwQWN0aW9uLCBlZmZlY3QucG9pbnQsIHRoaXMuYnJpZGdlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiYnV0dG9uLWRvdWJsZS10YXBcIjpcbiAgICAgICAgdGhpcy5kaXNwYXRjaEFjdGlvbih0aGlzLnNldHRpbmdzKCkuYnV0dG9uRG91YmxlVGFwQWN0aW9uLCBlZmZlY3QucG9pbnQsIHRoaXMuYnJpZGdlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiYnV0dG9uLWhvbGRcIjpcbiAgICAgICAgdGhpcy5kaXNwYXRjaEFjdGlvbih0aGlzLnNldHRpbmdzKCkuYnV0dG9uSG9sZEFjdGlvbiwgZWZmZWN0LnBvaW50LCB0aGlzLmJyaWRnZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGlmICh0aGlzLmxhdGVzdEV2ZW50KSB0aGlzLm92ZXJsYXkudXBkYXRlKHRoaXMubGF0ZXN0RXZlbnQsIHRoaXMubWFjaGluZS5zbmFwc2hvdCgpLCBlZmZlY3QpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXN0dXJlU2V0dGluZ3MoKSB7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLnNldHRpbmdzKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlLmJ1dHRvbkNvbnRhY3RBY3Rpb24sXG4gICAgICBkb3VibGVUYXBNczogdmFsdWUuZG91YmxlVGFwTXMsXG4gICAgICBsb25nUHJlc3NNczogdmFsdWUubG9uZ1ByZXNzTXMsXG4gICAgICBtb3ZlbWVudFRocmVzaG9sZFB4OiB2YWx1ZS5tb3ZlbWVudFRocmVzaG9sZFB4LFxuICAgIH0gYXMgY29uc3Q7XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IEFwcCwgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgRXhjYWxpZHJhd0JyaWRnZSB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB7IERlYnVnTG9nZ2VyIH0gZnJvbSBcIi4uL2RlYnVnL0RlYnVnTG9nZ2VyXCI7XG5pbXBvcnQgdHlwZSB7IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgfSBmcm9tIFwiLi4vc2V0dGluZ3Mvc2V0dGluZ3NcIjtcbmltcG9ydCB7IFN0eWx1c0NvbnRyb2xsZXIsIHR5cGUgQWN0aW9uSGFuZGxlciB9IGZyb20gXCIuL1N0eWx1c0NvbnRyb2xsZXJcIjtcblxuZXhwb3J0IGNsYXNzIFN0eWx1c1ZpZXdSZWdpc3RyeSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29udHJvbGxlcnMgPSBuZXcgTWFwPFdvcmtzcGFjZUxlYWYsIFN0eWx1c0NvbnRyb2xsZXI+KCk7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogKCkgPT4gU3R5bHVzQ29udHJvbHNTZXR0aW5ncyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFjdGlvbkhhbmRsZXI6IEFjdGlvbkhhbmRsZXJcbiAgKSB7fVxuXG4gIHN5bmMoKTogdm9pZCB7XG4gICAgY29uc3QgbGVhdmVzID0gbmV3IFNldCh0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFwiZXhjYWxpZHJhd1wiKSk7XG4gICAgZm9yIChjb25zdCBsZWFmIG9mIGxlYXZlcylcbiAgICAgIGlmICghdGhpcy5jb250cm9sbGVycy5oYXMobGVhZikpIHtcbiAgICAgICAgY29uc3QgZGVidWcgPSBuZXcgRGVidWdMb2dnZXIoKCkgPT4gdGhpcy5zZXR0aW5ncygpLmRlYnVnTW9kZSk7XG4gICAgICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgU3R5bHVzQ29udHJvbGxlcihcbiAgICAgICAgICBsZWFmLFxuICAgICAgICAgIG5ldyBFeGNhbGlkcmF3QnJpZGdlKGxlYWYpLFxuICAgICAgICAgIHRoaXMuc2V0dGluZ3MsXG4gICAgICAgICAgZGVidWcsXG4gICAgICAgICAgdGhpcy5hY3Rpb25IYW5kbGVyXG4gICAgICAgICk7XG4gICAgICAgIGNvbnRyb2xsZXIuYXR0YWNoKCk7XG4gICAgICAgIHRoaXMuY29udHJvbGxlcnMuc2V0KGxlYWYsIGNvbnRyb2xsZXIpO1xuICAgICAgfVxuICAgIGZvciAoY29uc3QgW2xlYWYsIGNvbnRyb2xsZXJdIG9mIHRoaXMuY29udHJvbGxlcnMpXG4gICAgICBpZiAoIWxlYXZlcy5oYXMobGVhZikpIHtcbiAgICAgICAgY29udHJvbGxlci5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMuY29udHJvbGxlcnMuZGVsZXRlKGxlYWYpO1xuICAgICAgfVxuICB9XG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBjb250cm9sbGVyIG9mIHRoaXMuY29udHJvbGxlcnMudmFsdWVzKCkpIGNvbnRyb2xsZXIuZGlzcG9zZSgpO1xuICAgIHRoaXMuY29udHJvbGxlcnMuY2xlYXIoKTtcbiAgfVxuICByZWZyZXNoKCk6IHZvaWQge1xuICAgIHRoaXMuZGlzcG9zZSgpO1xuICAgIHRoaXMuc3luYygpO1xuICB9XG4gIGV4cG9ydFRyYWNlcygpOiBzdHJpbmcge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShcbiAgICAgIFsuLi50aGlzLmNvbnRyb2xsZXJzLmVudHJpZXMoKV0ubWFwKChbbGVhZiwgY29udHJvbGxlcl0pID0+ICh7XG4gICAgICAgIGxlYWY6IGxlYWYuZ2V0RGlzcGxheVRleHQoKSxcbiAgICAgICAgZXZlbnRzOiBKU09OLnBhcnNlKGNvbnRyb2xsZXIuZ2V0VHJhY2UoKSksXG4gICAgICB9KSksXG4gICAgICBudWxsLFxuICAgICAgMlxuICAgICk7XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFBLG1CQUErQjs7O0FDR3hCLElBQU0sYUFBTixNQUFpQjtBQUFBLEVBQ2QsVUFBOEI7QUFBQSxFQUN0QyxLQUFLLE9BQWMsUUFBZ0M7QUFDakQsU0FBSyxNQUFNO0FBQ1gsVUFBTSxPQUFPLFNBQVMsS0FBSyxVQUFVLEVBQUUsS0FBSyx5QkFBeUIsQ0FBQztBQUN0RSxVQUFNQyxXQUF1QztBQUFBLE1BQzNDLENBQUMsYUFBYSxNQUFNLE9BQU8sUUFBUSxXQUFXLENBQUM7QUFBQSxNQUMvQyxDQUFDLGFBQWEsTUFBTSxPQUFPLFFBQVEsVUFBVSxDQUFDO0FBQUEsTUFDOUMsQ0FBQyxVQUFVLE1BQU0sT0FBTyxRQUFRLFFBQVEsQ0FBQztBQUFBLE1BQ3pDLENBQUMsYUFBYSxNQUFNLE9BQU8sUUFBUSxXQUFXLENBQUM7QUFBQSxNQUMvQyxDQUFDLFNBQVMsTUFBTSxPQUFPLFFBQVEsT0FBTyxDQUFDO0FBQUEsTUFDdkMsQ0FBQyxRQUFRLE1BQU0sT0FBTyxxQkFBcUIsQ0FBQztBQUFBLE1BQzVDLENBQUMsU0FBUyxNQUFNLE9BQU8sUUFBUSxLQUFLLENBQUM7QUFBQSxJQUN2QztBQUNBLGVBQVcsQ0FBQyxNQUFNLFFBQVEsS0FBS0EsVUFBUztBQUN0QyxZQUFNLFNBQVMsS0FBSyxTQUFTLFVBQVU7QUFBQSxRQUNyQyxNQUFNO0FBQUEsUUFDTixLQUFLO0FBQUEsTUFDUCxDQUFDO0FBQ0QsYUFBTyxpQkFBaUIsYUFBYSxDQUFDLFVBQVU7QUFDOUMsY0FBTSxnQkFBZ0I7QUFDdEIsaUJBQVM7QUFDVCxhQUFLLE1BQU07QUFBQSxNQUNiLENBQUM7QUFBQSxJQUNIO0FBQ0EsVUFBTSxPQUFPLEtBQUssSUFBSSxLQUFLLElBQUksR0FBRyxNQUFNLENBQUMs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
