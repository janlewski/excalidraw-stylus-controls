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
      text: "Requires the Excalidraw community plugin. Copy/paste uses a private in-memory clipboard in version 0.1."
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
  cleanupStrayDot: true,
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
    cleanupStrayDot: value.cleanupStrayDot !== false,
    debugMode: value.debugMode === true,
    debugOverlay: value.debugOverlay === true
  };
}

// src/excalidraw/ExcalidrawBridge.ts
var import_obsidian2 = require("obsidian");
var ExcalidrawBridge = class {
  constructor(app, leaf) {
    this.app = app;
    this.leaf = leaf;
  }
  warned = false;
  startTemporaryEraser() {
    const api = this.getApi();
    const tool = api?.getAppState?.().activeTool;
    if (!api?.setActiveTool || !tool) {
      this.unsupported("Temporary eraser requires a compatible Excalidraw view.");
      return null;
    }
    api.setActiveTool({ type: "eraser" });
    return { ...tool };
  }
  restoreTool(tool) {
    const api = this.getApi();
    if (!api?.setActiveTool) return false;
    api.setActiveTool(tool);
    return true;
  }
  setTool(type) {
    const api = this.getApi();
    if (!api?.setActiveTool) {
      this.unsupported("Tool switching requires a compatible Excalidraw view.");
      return false;
    }
    api.setActiveTool({ type });
    return true;
  }
  copySelectedElements() {
    this.unsupported("Copy requires a compatible Excalidraw API.");
  }
  pasteAt(point) {
    this.unsupported("Paste requires a compatible Excalidraw API.");
  }
  getApi() {
    const view = this.leaf.view;
    return view.excalidrawAPI ?? null;
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
  listeners = [];
  overlay;
  latestEvent = null;
  attach() {
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
          this.savedTool = this.bridge.startTemporaryEraser();
          if (!this.savedTool) this.machine.temporaryToolDidNotStart();
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
          new ExcalidrawBridge(this.app, leaf),
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL21lbnUvU3R5bHVzTWVudS50cyIsICJzcmMvc2V0dGluZ3MvU2V0dGluZ3NUYWIudHMiLCAic3JjL3NldHRpbmdzL3NldHRpbmdzLnRzIiwgInNyYy9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2UudHMiLCAic3JjL2RlYnVnL0RlYnVnTG9nZ2VyLnRzIiwgInNyYy9kZWJ1Zy9EZWJ1Z092ZXJsYXkudHMiLCAic3JjL3N0eWx1cy9ub3JtYWxpemVQb2ludGVyRXZlbnQudHMiLCAic3JjL3N0eWx1cy9TdHlsdXNHZXN0dXJlTWFjaGluZS50cyIsICJzcmMvc3R5bHVzL1N0eWx1c0NvbnRyb2xsZXIudHMiLCAic3JjL3N0eWx1cy9TdHlsdXNWaWV3UmVnaXN0cnkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IE5vdGljZSwgUGx1Z2luIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBTdHlsdXNNZW51IH0gZnJvbSBcIi4vbWVudS9TdHlsdXNNZW51XCI7XG5pbXBvcnQgeyBTZXR0aW5nc1RhYiB9IGZyb20gXCIuL3NldHRpbmdzL1NldHRpbmdzVGFiXCI7XG5pbXBvcnQge1xuICBERUZBVUxUX1NFVFRJTkdTLFxuICBub3JtYWxpemVTZXR0aW5ncyxcbiAgdHlwZSBTdHlsdXNDb250cm9sc1NldHRpbmdzLFxufSBmcm9tIFwiLi9zZXR0aW5ncy9zZXR0aW5nc1wiO1xuaW1wb3J0IHsgU3R5bHVzVmlld1JlZ2lzdHJ5IH0gZnJvbSBcIi4vc3R5bHVzL1N0eWx1c1ZpZXdSZWdpc3RyeVwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTdHlsdXNDb250cm9sc1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBTdHlsdXNDb250cm9sc1NldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HUztcbiAgcHJpdmF0ZSByZWdpc3RyeTogU3R5bHVzVmlld1JlZ2lzdHJ5IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWVudSA9IG5ldyBTdHlsdXNNZW51KCk7XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBub3JtYWxpemVTZXR0aW5ncygoYXdhaXQgdGhpcy5sb2FkRGF0YSgpKSA/PyB7fSk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTZXR0aW5nc1RhYih0aGlzKSk7XG4gICAgdGhpcy5yZWdpc3RyeSA9IG5ldyBTdHlsdXNWaWV3UmVnaXN0cnkoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgICgpID0+IHRoaXMuc2V0dGluZ3MsXG4gICAgICAoYWN0aW9uLCBwb2ludCwgYnJpZGdlKSA9PiB7XG4gICAgICAgIGlmIChhY3Rpb24gPT09IFwibWVudVwiKSB0aGlzLm1lbnUub3Blbihwb2ludCwgYnJpZGdlKTtcbiAgICAgICAgZWxzZSBpZiAoYWN0aW9uID09PSBcImNvcHlcIikgYnJpZGdlLmNvcHlTZWxlY3RlZEVsZW1lbnRzKCk7XG4gICAgICAgIGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJwYXN0ZVwiKSBicmlkZ2UucGFzdGVBdChwb2ludCk7XG4gICAgICB9XG4gICAgKTtcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAud29ya3NwYWNlLm9uKFwibGF5b3V0LWNoYW5nZVwiLCAoKSA9PiB0aGlzLnJlZ2lzdHJ5Py5zeW5jKCkpKTtcbiAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub25MYXlvdXRSZWFkeSgoKSA9PiB0aGlzLnJlZ2lzdHJ5Py5zeW5jKCkpO1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJjb3B5LXN0eWx1cy1ldmVudC10cmFjZVwiLFxuICAgICAgbmFtZTogXCJDb3B5IGxhdGVzdCBzdHlsdXMgZXZlbnQgdHJhY2VcIixcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHRyYWNlID0gdGhpcy5yZWdpc3RyeT8uZXhwb3J0VHJhY2VzKCkgPz8gXCJbXVwiO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHRyYWNlKTtcbiAgICAgICAgICBuZXcgTm90aWNlKFwiU3R5bHVzIGV2ZW50IHRyYWNlIGNvcGllZC5cIik7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIG5ldyBOb3RpY2UoXCJVbmFibGUgdG8gY29weSBldmVudCB0cmFjZS4gQ2hlY2sgdGhlIGRldmVsb3BlciBjb25zb2xlLlwiKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuICBvbnVubG9hZCgpOiB2b2lkIHtcbiAgICB0aGlzLm1lbnUuY2xvc2UoKTtcbiAgICB0aGlzLnJlZ2lzdHJ5Py5kaXNwb3NlKCk7XG4gICAgdGhpcy5yZWdpc3RyeSA9IG51bGw7XG4gIH1cbiAgYXN5bmMgdXBkYXRlU2V0dGluZ3MocGF0Y2g6IFBhcnRpYWw8U3R5bHVzQ29udHJvbHNTZXR0aW5ncz4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnNldHRpbmdzID0gbm9ybWFsaXplU2V0dGluZ3MoeyAuLi50aGlzLnNldHRpbmdzLCAuLi5wYXRjaCB9KTtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICAgIHRoaXMucmVnaXN0cnk/LnJlZnJlc2goKTtcbiAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgRXhjYWxpZHJhd0JyaWRnZSB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBTdHlsdXNNZW51IHtcbiAgcHJpdmF0ZSBlbGVtZW50OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICBvcGVuKHBvaW50OiBQb2ludCwgYnJpZGdlOiBFeGNhbGlkcmF3QnJpZGdlKTogdm9pZCB7XG4gICAgdGhpcy5jbG9zZSgpO1xuICAgIGNvbnN0IG1lbnUgPSBkb2N1bWVudC5ib2R5LmNyZWF0ZURpdih7IGNsczogXCJleGNhbGlkcmF3LXN0eWx1cy1tZW51XCIgfSk7XG4gICAgY29uc3QgYWN0aW9uczogQXJyYXk8W3N0cmluZywgKCkgPT4gdm9pZF0+ID0gW1xuICAgICAgW1wiU2VsZWN0aW9uXCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwic2VsZWN0aW9uXCIpXSxcbiAgICAgIFtcIkZyZWUgZHJhd1wiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcImZyZWVkcmF3XCIpXSxcbiAgICAgIFtcIkVyYXNlclwiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcImVyYXNlclwiKV0sXG4gICAgICBbXCJSZWN0YW5nbGVcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJyZWN0YW5nbGVcIildLFxuICAgICAgW1wiQXJyb3dcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJhcnJvd1wiKV0sXG4gICAgICBbXCJDb3B5XCIsICgpID0+IGJyaWRnZS5jb3B5U2VsZWN0ZWRFbGVtZW50cygpXSxcbiAgICAgIFtcIlBhc3RlXCIsICgpID0+IGJyaWRnZS5wYXN0ZUF0KHBvaW50KV0sXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBjYWxsYmFja10gb2YgYWN0aW9ucykge1xuICAgICAgY29uc3QgYnV0dG9uID0gbWVudS5jcmVhdGVFbChcImJ1dHRvblwiLCB7XG4gICAgICAgIHRleHQ6IG5hbWUsXG4gICAgICAgIGNsczogXCJleGNhbGlkcmF3LXN0eWx1cy1tZW51X19pdGVtXCIsXG4gICAgICB9KTtcbiAgICAgIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcnVwXCIsIChldmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IGxlZnQgPSBNYXRoLm1pbihNYXRoLm1heCg4LCBwb2ludC54KSwgd2luZG93LmlubmVyV2lkdGggLSAxODApO1xuICAgIGNvbnN0IHRvcCA9IE1hdGgubWluKE1hdGgubWF4KDgsIHBvaW50LnkpLCB3aW5kb3cuaW5uZXJIZWlnaHQgLSAzMDApO1xuICAgIG1lbnUuc2V0Q3NzUHJvcHMoeyBsZWZ0OiBgJHtsZWZ0fXB4YCwgdG9wOiBgJHt0b3B9cHhgIH0pO1xuICAgIHRoaXMuZWxlbWVudCA9IG1lbnU7XG4gICAgd2luZG93LnNldFRpbWVvdXQoXG4gICAgICAoKSA9PlxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmRvd25cIiwgdGhpcy5jbG9zZSwge1xuICAgICAgICAgIG9uY2U6IHRydWUsXG4gICAgICAgICAgY2FwdHVyZTogdHJ1ZSxcbiAgICAgICAgfSksXG4gICAgICAwXG4gICAgKTtcbiAgfVxuICBjbG9zZSA9ICgpOiB2b2lkID0+IHtcbiAgICB0aGlzLmVsZW1lbnQ/LnJlbW92ZSgpO1xuICAgIHRoaXMuZWxlbWVudCA9IG51bGw7XG4gIH07XG59XG4iLCAiaW1wb3J0IHsgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgU3R5bHVzQ29udHJvbHNQbHVnaW4gZnJvbSBcIi4uL21haW5cIjtcbmltcG9ydCB0eXBlIHsgU3R5bHVzQWN0aW9uIH0gZnJvbSBcIi4vc2V0dGluZ3NcIjtcblxuY29uc3QgYWN0aW9uczogUmVjb3JkPFN0eWx1c0FjdGlvbiwgc3RyaW5nPiA9IHtcbiAgbWVudTogXCJPcGVuIG1lbnVcIixcbiAgY29weTogXCJDb3B5XCIsXG4gIHBhc3RlOiBcIlBhc3RlXCIsXG4gIG5vbmU6IFwiRG8gbm90aGluZ1wiLFxufTtcblxuZXhwb3J0IGNsYXNzIFNldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBTdHlsdXNDb250cm9sc1BsdWdpbikge1xuICAgIHN1cGVyKHBsdWdpbi5hcHAsIHBsdWdpbik7XG4gIH1cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiUmVxdWlyZXMgdGhlIEV4Y2FsaWRyYXcgY29tbXVuaXR5IHBsdWdpbi4gQ29weS9wYXN0ZSB1c2VzIGEgcHJpdmF0ZSBpbi1tZW1vcnkgY2xpcGJvYXJkIGluIHZlcnNpb24gMC4xLlwiLFxuICAgIH0pO1xuICAgIHRoaXMuYWN0aW9uKFwiVGFwXCIsIFwiYnV0dG9uVGFwQWN0aW9uXCIpO1xuICAgIHRoaXMuYWN0aW9uKFwiRG91YmxlIHRhcFwiLCBcImJ1dHRvbkRvdWJsZVRhcEFjdGlvblwiKTtcbiAgICB0aGlzLmFjdGlvbihcIkhvbGRcIiwgXCJidXR0b25Ib2xkQWN0aW9uXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJCdXR0b24gKyBwZW4gY29udGFjdFwiKVxuICAgICAgLnNldERlc2MoXCJUZW1wb3JhcnkgdG9vbCB3aGlsZSB0aGUgc2lkZSBidXR0b24gaXMgaGVsZCBkdXJpbmcgcGVuIGNvbnRhY3QuXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PlxuICAgICAgICBkcm9wZG93blxuICAgICAgICAgIC5hZGRPcHRpb24oXCJlcmFzZXJcIiwgXCJUZW1wb3JhcnkgZXJhc2VyXCIpXG4gICAgICAgICAgLmFkZE9wdGlvbihcIm5vbmVcIiwgXCJEbyBub3RoaW5nXCIpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmJ1dHRvbkNvbnRhY3RBY3Rpb24pXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT5cbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHtcbiAgICAgICAgICAgICAgYnV0dG9uQ29udGFjdEFjdGlvbjogdmFsdWUgYXMgXCJlcmFzZXJcIiB8IFwibm9uZVwiLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICApXG4gICAgICApO1xuICAgIHRoaXMubnVtYmVyKFwiRG91YmxlLXRhcCBpbnRlcnZhbCAobXMpXCIsIFwiZG91YmxlVGFwTXNcIik7XG4gICAgdGhpcy5udW1iZXIoXCJMb25nLXByZXNzIGRlbGF5IChtcylcIiwgXCJsb25nUHJlc3NNc1wiKTtcbiAgICB0aGlzLm51bWJlcihcIk1vdmVtZW50IHRocmVzaG9sZCAocHgpXCIsIFwibW92ZW1lbnRUaHJlc2hvbGRQeFwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVidWcgbG9nZ2luZ1wiKVxuICAgICAgLnNldERlc2MoXCJMb2dzIGJvdW5kZWQgcmF3IHBlbiBldmVudCB0cmFjZXMgdG8gdGhlIGRldmVsb3BlciBjb25zb2xlLlwiKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxuICAgICAgICB0b2dnbGVcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVidWdNb2RlKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgZGVidWdNb2RlOiB2YWx1ZSB9KSlcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlYnVnIG92ZXJsYXlcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIlNob3dzIHRoZSBsYXRlc3QgcGVuIGV2ZW50IGFuZCBzdHlsdXMgc3RhdGUgaW4gdGhlIEV4Y2FsaWRyYXcgdmlldy4gUmVxdWlyZXMgZGVidWcgbG9nZ2luZy5cIlxuICAgICAgKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxuICAgICAgICB0b2dnbGVcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVidWdPdmVybGF5KVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgZGVidWdPdmVybGF5OiB2YWx1ZSB9KSlcbiAgICAgICk7XG4gIH1cbiAgcHJpdmF0ZSBhY3Rpb24oXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIGtleTogXCJidXR0b25UYXBBY3Rpb25cIiB8IFwiYnV0dG9uRG91YmxlVGFwQWN0aW9uXCIgfCBcImJ1dHRvbkhvbGRBY3Rpb25cIlxuICApOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRhaW5lckVsKS5zZXROYW1lKGBTIFBlbiBzaWRlIGJ1dHRvbjogJHtuYW1lfWApLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgZm9yIChjb25zdCBbdmFsdWUsIGxhYmVsXSBvZiBPYmplY3QuZW50cmllcyhhY3Rpb25zKSkgZHJvcGRvd24uYWRkT3B0aW9uKHZhbHVlLCBsYWJlbCk7XG4gICAgICBkcm9wZG93blxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Nba2V5XSlcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4gdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBba2V5XTogdmFsdWUgYXMgU3R5bHVzQWN0aW9uIH0pKTtcbiAgICB9KTtcbiAgfVxuICBwcml2YXRlIG51bWJlcihuYW1lOiBzdHJpbmcsIGtleTogXCJkb3VibGVUYXBNc1wiIHwgXCJsb25nUHJlc3NNc1wiIHwgXCJtb3ZlbWVudFRocmVzaG9sZFB4XCIpOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUobmFtZSlcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxuICAgICAgICB0ZXh0XG4gICAgICAgICAgLnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5nc1trZXldKSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IFtrZXldOiBOdW1iZXIodmFsdWUpIH0pKVxuICAgICAgKTtcbiAgfVxufVxuIiwgImV4cG9ydCB0eXBlIFN0eWx1c0FjdGlvbiA9IFwibWVudVwiIHwgXCJjb3B5XCIgfCBcInBhc3RlXCIgfCBcIm5vbmVcIjtcblxuZXhwb3J0IGludGVyZmFjZSBTdHlsdXNDb250cm9sc1NldHRpbmdzIHtcbiAgYnV0dG9uVGFwQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gIGJ1dHRvbkRvdWJsZVRhcEFjdGlvbjogU3R5bHVzQWN0aW9uO1xuICBidXR0b25Ib2xkQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gIGJ1dHRvbkNvbnRhY3RBY3Rpb246IFwiZXJhc2VyXCIgfCBcIm5vbmVcIjtcbiAgZG91YmxlVGFwTXM6IG51bWJlcjtcbiAgbG9uZ1ByZXNzTXM6IG51bWJlcjtcbiAgbW92ZW1lbnRUaHJlc2hvbGRQeDogbnVtYmVyO1xuICBjbGVhbnVwU3RyYXlEb3Q6IGJvb2xlYW47XG4gIGRlYnVnTW9kZTogYm9vbGVhbjtcbiAgZGVidWdPdmVybGF5OiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogU3R5bHVzQ29udHJvbHNTZXR0aW5ncyA9IHtcbiAgYnV0dG9uVGFwQWN0aW9uOiBcIm1lbnVcIixcbiAgYnV0dG9uRG91YmxlVGFwQWN0aW9uOiBcImNvcHlcIixcbiAgYnV0dG9uSG9sZEFjdGlvbjogXCJwYXN0ZVwiLFxuICBidXR0b25Db250YWN0QWN0aW9uOiBcImVyYXNlclwiLFxuICBkb3VibGVUYXBNczogMzAwLFxuICBsb25nUHJlc3NNczogNDUwLFxuICBtb3ZlbWVudFRocmVzaG9sZFB4OiA4LFxuICBjbGVhbnVwU3RyYXlEb3Q6IHRydWUsXG4gIGRlYnVnTW9kZTogZmFsc2UsXG4gIGRlYnVnT3ZlcmxheTogZmFsc2UsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU2V0dGluZ3ModmFsdWU6IFBhcnRpYWw8U3R5bHVzQ29udHJvbHNTZXR0aW5ncz4pOiBTdHlsdXNDb250cm9sc1NldHRpbmdzIHtcbiAgY29uc3QgYWN0aW9uID0gKGNhbmRpZGF0ZTogdW5rbm93biwgZmFsbGJhY2s6IFN0eWx1c0FjdGlvbik6IFN0eWx1c0FjdGlvbiA9PlxuICAgIGNhbmRpZGF0ZSA9PT0gXCJtZW51XCIgfHwgY2FuZGlkYXRlID09PSBcImNvcHlcIiB8fCBjYW5kaWRhdGUgPT09IFwicGFzdGVcIiB8fCBjYW5kaWRhdGUgPT09IFwibm9uZVwiXG4gICAgICA/IGNhbmRpZGF0ZVxuICAgICAgOiBmYWxsYmFjaztcbiAgY29uc3QgbnVtYmVyID0gKGNhbmRpZGF0ZTogdW5rbm93biwgZmFsbGJhY2s6IG51bWJlciwgbWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyID0+XG4gICAgdHlwZW9mIGNhbmRpZGF0ZSA9PT0gXCJudW1iZXJcIiAmJiBOdW1iZXIuaXNGaW5pdGUoY2FuZGlkYXRlKVxuICAgICAgPyBNYXRoLm1pbihtYXgsIE1hdGgubWF4KG1pbiwgTWF0aC5yb3VuZChjYW5kaWRhdGUpKSlcbiAgICAgIDogZmFsbGJhY2s7XG4gIHJldHVybiB7XG4gICAgYnV0dG9uVGFwQWN0aW9uOiBhY3Rpb24odmFsdWUuYnV0dG9uVGFwQWN0aW9uLCBERUZBVUxUX1NFVFRJTkdTLmJ1dHRvblRhcEFjdGlvbiksXG4gICAgYnV0dG9uRG91YmxlVGFwQWN0aW9uOiBhY3Rpb24oXG4gICAgICB2YWx1ZS5idXR0b25Eb3VibGVUYXBBY3Rpb24sXG4gICAgICBERUZBVUxUX1NFVFRJTkdTLmJ1dHRvbkRvdWJsZVRhcEFjdGlvblxuICAgICksXG4gICAgYnV0dG9uSG9sZEFjdGlvbjogYWN0aW9uKHZhbHVlLmJ1dHRvbkhvbGRBY3Rpb24sIERFRkFVTFRfU0VUVElOR1MuYnV0dG9uSG9sZEFjdGlvbiksXG4gICAgYnV0dG9uQ29udGFjdEFjdGlvbjogdmFsdWUuYnV0dG9uQ29udGFjdEFjdGlvbiA9PT0gXCJub25lXCIgPyBcIm5vbmVcIiA6IFwiZXJhc2VyXCIsXG4gICAgZG91YmxlVGFwTXM6IG51bWJlcih2YWx1ZS5kb3VibGVUYXBNcywgMzAwLCAxMDAsIDEwMDApLFxuICAgIGxvbmdQcmVzc01zOiBudW1iZXIodmFsdWUubG9uZ1ByZXNzTXMsIDQ1MCwgMTUwLCAyMDAwKSxcbiAgICBtb3ZlbWVudFRocmVzaG9sZFB4OiBudW1iZXIodmFsdWUubW92ZW1lbnRUaHJlc2hvbGRQeCwgOCwgMSwgMTAwKSxcbiAgICBjbGVhbnVwU3RyYXlEb3Q6IHZhbHVlLmNsZWFudXBTdHJheURvdCAhPT0gZmFsc2UsXG4gICAgZGVidWdNb2RlOiB2YWx1ZS5kZWJ1Z01vZGUgPT09IHRydWUsXG4gICAgZGVidWdPdmVybGF5OiB2YWx1ZS5kZWJ1Z092ZXJsYXkgPT09IHRydWUsXG4gIH07XG59XG4iLCAiaW1wb3J0IHsgTm90aWNlLCB0eXBlIEFwcCwgdHlwZSBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSB7IFBvaW50IH0gZnJvbSBcIi4uL3N0eWx1cy90eXBlc1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFjdGl2ZVRvb2xTbmFwc2hvdCB7XG4gIHR5cGU6IHN0cmluZztcbiAgW2tleTogc3RyaW5nXTogdW5rbm93bjtcbn1cbnR5cGUgSW1wZXJhdGl2ZUFwaSA9IHtcbiAgZ2V0QXBwU3RhdGU/OiAoKSA9PiB7IGFjdGl2ZVRvb2w/OiBBY3RpdmVUb29sU25hcHNob3QgfTtcbiAgc2V0QWN0aXZlVG9vbD86ICh0b29sOiBBY3RpdmVUb29sU25hcHNob3QpID0+IHZvaWQ7XG59O1xuXG4vKiogQ29tcGF0aWJpbGl0eSBib3VuZGFyeSBmb3IgdGhlIG9wdGlvbmFsIEV4Y2FsaWRyYXcgcGx1Z2luLiAqL1xuZXhwb3J0IGNsYXNzIEV4Y2FsaWRyYXdCcmlkZ2Uge1xuICBwcml2YXRlIHdhcm5lZCA9IGZhbHNlO1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgbGVhZjogV29ya3NwYWNlTGVhZlxuICApIHt9XG5cbiAgc3RhcnRUZW1wb3JhcnlFcmFzZXIoKTogQWN0aXZlVG9vbFNuYXBzaG90IHwgbnVsbCB7XG4gICAgY29uc3QgYXBpID0gdGhpcy5nZXRBcGkoKTtcbiAgICBjb25zdCB0b29sID0gYXBpPy5nZXRBcHBTdGF0ZT8uKCkuYWN0aXZlVG9vbDtcbiAgICBpZiAoIWFwaT8uc2V0QWN0aXZlVG9vbCB8fCAhdG9vbCkge1xuICAgICAgdGhpcy51bnN1cHBvcnRlZChcIlRlbXBvcmFyeSBlcmFzZXIgcmVxdWlyZXMgYSBjb21wYXRpYmxlIEV4Y2FsaWRyYXcgdmlldy5cIik7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgYXBpLnNldEFjdGl2ZVRvb2woeyB0eXBlOiBcImVyYXNlclwiIH0pO1xuICAgIHJldHVybiB7IC4uLnRvb2wgfTtcbiAgfVxuICByZXN0b3JlVG9vbCh0b29sOiBBY3RpdmVUb29sU25hcHNob3QpOiBib29sZWFuIHtcbiAgICBjb25zdCBhcGkgPSB0aGlzLmdldEFwaSgpO1xuICAgIGlmICghYXBpPy5zZXRBY3RpdmVUb29sKSByZXR1cm4gZmFsc2U7XG4gICAgYXBpLnNldEFjdGl2ZVRvb2wodG9vbCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgc2V0VG9vbCh0eXBlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBhcGkgPSB0aGlzLmdldEFwaSgpO1xuICAgIGlmICghYXBpPy5zZXRBY3RpdmVUb29sKSB7XG4gICAgICB0aGlzLnVuc3VwcG9ydGVkKFwiVG9vbCBzd2l0Y2hpbmcgcmVxdWlyZXMgYSBjb21wYXRpYmxlIEV4Y2FsaWRyYXcgdmlldy5cIik7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGFwaS5zZXRBY3RpdmVUb29sKHsgdHlwZSB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBjb3B5U2VsZWN0ZWRFbGVtZW50cygpOiB2b2lkIHtcbiAgICB0aGlzLnVuc3VwcG9ydGVkKFwiQ29weSByZXF1aXJlcyBhIGNvbXBhdGlibGUgRXhjYWxpZHJhdyBBUEkuXCIpO1xuICB9XG4gIHBhc3RlQXQocG9pbnQ6IFBvaW50KTogdm9pZCB7XG4gICAgdm9pZCBwb2ludDtcbiAgICB0aGlzLnVuc3VwcG9ydGVkKFwiUGFzdGUgcmVxdWlyZXMgYSBjb21wYXRpYmxlIEV4Y2FsaWRyYXcgQVBJLlwiKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0QXBpKCk6IEltcGVyYXRpdmVBcGkgfCBudWxsIHtcbiAgICAvLyBFeGNhbGlkcmF3IGV4cG9zZXMgbm8gc3RhYmxlIENvbW11bml0eSBQbHVnaW4gQVBJIGZvciB0aGlzIHBhdGguIEtlZXAgdGhpc1xuICAgIC8vIG9wdGlvbmFsIGNhcGFiaWxpdHkgcHJvYmUgaXNvbGF0ZWQgdW50aWwgYSBkb2N1bWVudGVkIGxlYWYtYXdhcmUgQVBJIGV4aXN0cy5cbiAgICBjb25zdCB2aWV3ID0gdGhpcy5sZWFmLnZpZXcgYXMgdW5rbm93biBhcyB7XG4gICAgICBleGNhbGlkcmF3QVBJPzogSW1wZXJhdGl2ZUFwaTtcbiAgICB9O1xuICAgIHJldHVybiB2aWV3LmV4Y2FsaWRyYXdBUEkgPz8gbnVsbDtcbiAgfVxuICBwcml2YXRlIHVuc3VwcG9ydGVkKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy53YXJuZWQpIHtcbiAgICAgIG5ldyBOb3RpY2UoYEV4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzOiAke21lc3NhZ2V9YCk7XG4gICAgICB0aGlzLndhcm5lZCA9IHRydWU7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBEZWJ1Z0xvZ2dlciB7XG4gIHByaXZhdGUgdHJhY2U6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudFtdID0gW107XG4gIHByaXZhdGUgbGFzdE1vdmVMb2dBdCA9IC1JbmZpbml0eTtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBlbmFibGVkOiAoKSA9PiBib29sZWFuKSB7fVxuXG4gIGV2ZW50KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCgpKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwibW92ZVwiICYmIGV2ZW50LnRpbWVzdGFtcCAtIHRoaXMubGFzdE1vdmVMb2dBdCA8IDEwMCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5raW5kID09PSBcIm1vdmVcIikgdGhpcy5sYXN0TW92ZUxvZ0F0ID0gZXZlbnQudGltZXN0YW1wO1xuICAgIHRoaXMudHJhY2UucHVzaChldmVudCk7XG4gICAgaWYgKHRoaXMudHJhY2UubGVuZ3RoID4gMTAwKSB0aGlzLnRyYWNlLnNoaWZ0KCk7XG4gICAgY29uc29sZS5kZWJ1ZyhcIltFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9sc11cIiwgZXZlbnQpO1xuICB9XG4gIG1lc3NhZ2UobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZW5hYmxlZCgpKSBjb25zb2xlLmRlYnVnKFwiW0V4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzXVwiLCBtZXNzYWdlKTtcbiAgfVxuICBleHBvcnRUcmFjZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLnRyYWNlLCBudWxsLCAyKTtcbiAgfVxuICBjbGVhcigpOiB2b2lkIHtcbiAgICB0aGlzLnRyYWNlID0gW107XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IEdlc3R1cmVFZmZlY3QsIEdlc3R1cmVTdGF0ZVNuYXBzaG90LCBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbi8qKiBBIGRpYWdub3N0aWMtb25seSwgbm9uLWludGVyYWN0aXZlIG92ZXJsYXkgbG9jYWwgdG8gb25lIEV4Y2FsaWRyYXcgdmlldy4gKi9cbmV4cG9ydCBjbGFzcyBEZWJ1Z092ZXJsYXkge1xuICBwcml2YXRlIGVsZW1lbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXI6IEhUTUxFbGVtZW50LFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZW5hYmxlZDogKCkgPT4gYm9vbGVhblxuICApIHt9XG5cbiAgdXBkYXRlKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQsIHN0YXRlOiBHZXN0dXJlU3RhdGVTbmFwc2hvdCwgZWZmZWN0PzogR2VzdHVyZUVmZmVjdCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5lbmFibGVkKCkpIHtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgb3ZlcmxheSA9IHRoaXMuZW5zdXJlRWxlbWVudCgpO1xuICAgIGNvbnN0IHN0YXRlU3VtbWFyeSA9IFtcbiAgICAgIGBob3Zlcjoke1N0cmluZyghc3RhdGUucGVuQ29udGFjdCl9YCxcbiAgICAgIGBiYXJyZWw6JHtTdHJpbmcoc3RhdGUuYmFycmVsQnV0dG9uSGVsZCl9YCxcbiAgICAgIGBjb25zdW1lZDoke1N0cmluZyhzdGF0ZS5nZXN0dXJlQ29uc3VtZWQpfWAsXG4gICAgICBgdGVtcDoke1N0cmluZyhzdGF0ZS50ZW1wb3JhcnlUb29sQWN0aXZlKX1gLFxuICAgIF0uam9pbihcIiBcdTAwQjcgXCIpO1xuICAgIG92ZXJsYXkuc2V0VGV4dChcbiAgICAgIFtcbiAgICAgICAgYFMgUGVuICR7ZXZlbnQua2luZH0gaWQ6JHtldmVudC5wb2ludGVySWR9IGJ1dHRvbnM6JHtldmVudC5idXR0b25zfSBwcmVzc3VyZToke2V2ZW50LnByZXNzdXJlLnRvRml4ZWQoMil9YCxcbiAgICAgICAgc3RhdGVTdW1tYXJ5LFxuICAgICAgICBgZWZmZWN0OiR7ZWZmZWN0Py50eXBlID8/IFwibm9uZVwifWAsXG4gICAgICBdLmpvaW4oXCJcXG5cIilcbiAgICApO1xuICB9XG5cbiAgY2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5lbGVtZW50Py5yZW1vdmUoKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVFbGVtZW50KCk6IEhUTUxFbGVtZW50IHtcbiAgICBpZiAodGhpcy5lbGVtZW50KSByZXR1cm4gdGhpcy5lbGVtZW50O1xuICAgIHRoaXMuZWxlbWVudCA9IHRoaXMuY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJleGNhbGlkcmF3LXN0eWx1cy1kZWJ1Zy1vdmVybGF5XCIgfSk7XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudDtcbiAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgTm9ybWFsaXplZFN0eWx1c0V2ZW50LCBTdHlsdXNFdmVudEtpbmQgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5jb25zdCBldmVudEtpbmRzOiBSZWNvcmQ8c3RyaW5nLCBTdHlsdXNFdmVudEtpbmQ+ID0ge1xuICBwb2ludGVyZG93bjogXCJkb3duXCIsXG4gIHBvaW50ZXJtb3ZlOiBcIm1vdmVcIixcbiAgcG9pbnRlcnVwOiBcInVwXCIsXG4gIHBvaW50ZXJjYW5jZWw6IFwiY2FuY2VsXCIsXG4gIGNvbnRleHRtZW51OiBcImNvbnRleHRtZW51XCIsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplUG9pbnRlckV2ZW50KFxuICBldmVudDogUG9pbnRlckV2ZW50LFxuICBpc0NhbnZhc1RhcmdldDogYm9vbGVhblxuKTogTm9ybWFsaXplZFN0eWx1c0V2ZW50IHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBldmVudEtpbmRzW2V2ZW50LnR5cGVdID8/IFwibW92ZVwiLFxuICAgIHBvaW50ZXJUeXBlOiBldmVudC5wb2ludGVyVHlwZSxcbiAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICBidXR0b25zOiBldmVudC5idXR0b25zLFxuICAgIGJ1dHRvbjogZXZlbnQuYnV0dG9uLFxuICAgIHByZXNzdXJlOiBldmVudC5wcmVzc3VyZSxcbiAgICB4OiBldmVudC5jbGllbnRYLFxuICAgIHk6IGV2ZW50LmNsaWVudFksXG4gICAgdGltZXN0YW1wOiBldmVudC50aW1lU3RhbXAsXG4gICAgaXNDYW52YXNUYXJnZXQsXG4gIH07XG59XG4iLCAiaW1wb3J0IHR5cGUge1xuICBHZXN0dXJlRWZmZWN0LFxuICBHZXN0dXJlU2V0dGluZ3MsXG4gIEdlc3R1cmVTdGF0ZVNuYXBzaG90LFxuICBOb3JtYWxpemVkU3R5bHVzRXZlbnQsXG4gIFBvaW50LFxuICBTY2hlZHVsZXIsXG59IGZyb20gXCIuL3R5cGVzXCI7XG5cbmludGVyZmFjZSBQZW5kaW5nVGFwIHtcbiAgcG9pbnQ6IFBvaW50O1xuICB0aW1lcjogdW5rbm93bjtcbn1cblxuLyoqIFB1cmUgcGVyLXZpZXcgUyBQZW4gZ2VzdHVyZSBwb2xpY3kuIEl0IG5ldmVyIHRvdWNoZXMgdGhlIERPTSBvciBFeGNhbGlkcmF3LiAqL1xuZXhwb3J0IGNsYXNzIFN0eWx1c0dlc3R1cmVNYWNoaW5lIHtcbiAgcHJpdmF0ZSBiYXJyZWxCdXR0b25IZWxkID0gZmFsc2U7XG4gIHByaXZhdGUgcGVuQ29udGFjdCA9IGZhbHNlO1xuICBwcml2YXRlIGNvbnN1bWVkID0gZmFsc2U7XG4gIHByaXZhdGUgbW92ZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBob2xkRmlyZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSB0ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gIHByaXZhdGUgcHJlc3NPcmlnaW46IFBvaW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaG9sZFRpbWVyOiB1bmtub3duIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGVuZGluZ1RhcDogUGVuZGluZ1RhcCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGFjdGl2ZVBvaW50ZXJJZDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogR2VzdHVyZVNldHRpbmdzLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2NoZWR1bGVyOiBTY2hlZHVsZXJcbiAgKSB7fVxuXG4gIGhhbmRsZShldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50KTogR2VzdHVyZUVmZmVjdFtdIHtcbiAgICBpZiAoZXZlbnQucG9pbnRlclR5cGUgIT09IFwicGVuXCIpIHJldHVybiBbXTtcbiAgICBjb25zdCBlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10gPSBbXTtcbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJjb250ZXh0bWVudVwiKSB7XG4gICAgICBpZiAodGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlIHx8ICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgdGhpcy5wZW5Db250YWN0KSlcbiAgICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJzdXBwcmVzcy1jb250ZXh0LW1lbnVcIiB9KTtcbiAgICAgIHJldHVybiBlZmZlY3RzO1xuICAgIH1cblxuICAgIGlmIChldmVudC5raW5kID09PSBcImRvd25cIikge1xuICAgICAgdGhpcy5wZW5Db250YWN0ID0gdHJ1ZTtcbiAgICAgIHRoaXMuYWN0aXZlUG9pbnRlcklkID0gZXZlbnQucG9pbnRlcklkO1xuICAgICAgaWYgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCkgdGhpcy5jb25zdW1lRm9yQ29udGFjdChldmVudCwgZWZmZWN0cyk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJ1cFwiIHx8IGV2ZW50LmtpbmQgPT09IFwiY2FuY2VsXCIpIHtcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXJJZCAhPT0gbnVsbCAmJiBldmVudC5wb2ludGVySWQgIT09IHRoaXMuYWN0aXZlUG9pbnRlcklkKSByZXR1cm4gZWZmZWN0cztcbiAgICAgIHRoaXMucGVuQ29udGFjdCA9IGZhbHNlO1xuICAgICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBudWxsO1xuICAgICAgaWYgKHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkge1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJ0ZW1wb3JhcnktdG9vbC1lbmRcIiB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChldmVudC5raW5kID09PSBcImNhbmNlbFwiKSB0aGlzLmNhbmNlbFByZXNzKCk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICAvLyBIb3ZlciBtb3ZlbWVudCBpcyB0aGUgb25seSBldmlkZW5jZSB1c2VkIHRvIGludGVycHJldCBidXR0b25zIGFzIGJhcnJlbCBzdGF0ZS5cbiAgICBpZiAodGhpcy5wZW5Db250YWN0KSByZXR1cm4gZWZmZWN0cztcbiAgICBjb25zdCBoZWxkTm93ID0gKGV2ZW50LmJ1dHRvbnMgJiAxKSAhPT0gMDtcbiAgICBpZiAoIXRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiBoZWxkTm93KSB0aGlzLnN0YXJ0UHJlc3MoZXZlbnQpO1xuICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgaGVsZE5vdykgdGhpcy50cmFja0hvdmVyTW92ZW1lbnQoZXZlbnQpO1xuICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgIWhlbGROb3cpIHRoaXMucmVsZWFzZVByZXNzKGVmZmVjdHMpO1xuICAgIHJldHVybiBlZmZlY3RzO1xuICB9XG5cbiAgZGlzcG9zZSgpOiBHZXN0dXJlRWZmZWN0W10ge1xuICAgIGNvbnN0IGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSA9IFtdO1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgIGlmICh0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUpIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtZW5kXCIgfSk7XG4gICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5jYW5jZWxQcmVzcygpO1xuICAgIHJldHVybiBlZmZlY3RzO1xuICB9XG5cbiAgc25hcHNob3QoKTogR2VzdHVyZVN0YXRlU25hcHNob3Qge1xuICAgIHJldHVybiB7XG4gICAgICBiYXJyZWxCdXR0b25IZWxkOiB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQsXG4gICAgICBwZW5Db250YWN0OiB0aGlzLnBlbkNvbnRhY3QsXG4gICAgICBnZXN0dXJlQ29uc3VtZWQ6IHRoaXMuY29uc3VtZWQsXG4gICAgICB0ZW1wb3JhcnlUb29sQWN0aXZlOiB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUsXG4gICAgICBob3Zlckdlc3R1cmVNb3ZlZDogdGhpcy5tb3ZlZCxcbiAgICAgIGxvbmdQcmVzc0ZpcmVkOiB0aGlzLmhvbGRGaXJlZCxcbiAgICAgIGFjdGl2ZVBvaW50ZXJJZDogdGhpcy5hY3RpdmVQb2ludGVySWQsXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBUaGUgY29udHJvbGxlciBjYWxscyB0aGlzIHdoZW4gdGhlIG9wdGlvbmFsIEV4Y2FsaWRyYXcgYnJpZGdlIHJlamVjdHMgYSBzdGFydCByZXF1ZXN0LiAqL1xuICB0ZW1wb3JhcnlUb29sRGlkTm90U3RhcnQoKTogdm9pZCB7XG4gICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIHN0YXJ0UHJlc3MoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IHZvaWQge1xuICAgIHRoaXMuYmFycmVsQnV0dG9uSGVsZCA9IHRydWU7XG4gICAgdGhpcy5jb25zdW1lZCA9IGZhbHNlO1xuICAgIHRoaXMubW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmhvbGRGaXJlZCA9IGZhbHNlO1xuICAgIHRoaXMucHJlc3NPcmlnaW4gPSB7IHg6IGV2ZW50LngsIHk6IGV2ZW50LnkgfTtcbiAgICB0aGlzLmhvbGRUaW1lciA9IHRoaXMuc2NoZWR1bGVyLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKFxuICAgICAgICAhdGhpcy5iYXJyZWxCdXR0b25IZWxkIHx8XG4gICAgICAgIHRoaXMucGVuQ29udGFjdCB8fFxuICAgICAgICB0aGlzLm1vdmVkIHx8XG4gICAgICAgIHRoaXMuY29uc3VtZWQgfHxcbiAgICAgICAgIXRoaXMucHJlc3NPcmlnaW5cbiAgICAgIClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgdGhpcy5ob2xkRmlyZWQgPSB0cnVlO1xuICAgICAgdGhpcy5jb25zdW1lZCA9IHRydWU7XG4gICAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICAgIHRoaXMub25FZmZlY3Q/Lih7IHR5cGU6IFwiYnV0dG9uLWhvbGRcIiwgcG9pbnQ6IHRoaXMucHJlc3NPcmlnaW4gfSk7XG4gICAgfSwgdGhpcy5zZXR0aW5ncy5sb25nUHJlc3NNcyk7XG4gIH1cblxuICAvKiogQ29udHJvbGxlciByZWdpc3RlcnMgdGhpcyBzbyBzY2hlZHVsZXIgY2FsbGJhY2tzIHJldGFpbiBwdXJlIHNlbWFudGljIG91dHB1dC4gKi9cbiAgcHJpdmF0ZSBvbkVmZmVjdDogKChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gIHNldEVmZmVjdFNpbmsoc2luazogKGVmZmVjdDogR2VzdHVyZUVmZmVjdCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMub25FZmZlY3QgPSBzaW5rO1xuICB9XG5cbiAgcHJpdmF0ZSB0cmFja0hvdmVyTW92ZW1lbnQoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5wcmVzc09yaWdpbiB8fCB0aGlzLm1vdmVkKSByZXR1cm47XG4gICAgY29uc3QgZHggPSBldmVudC54IC0gdGhpcy5wcmVzc09yaWdpbi54O1xuICAgIGNvbnN0IGR5ID0gZXZlbnQueSAtIHRoaXMucHJlc3NPcmlnaW4ueTtcbiAgICBpZiAoTWF0aC5oeXBvdChkeCwgZHkpID4gdGhpcy5zZXR0aW5ncy5tb3ZlbWVudFRocmVzaG9sZFB4KSB7XG4gICAgICB0aGlzLm1vdmVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY29uc3VtZUZvckNvbnRhY3QoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdKTogdm9pZCB7XG4gICAgdGhpcy5jb25zdW1lZCA9IHRydWU7XG4gICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MuYnV0dG9uQ29udGFjdEFjdGlvbiA9PT0gXCJlcmFzZXJcIiAmJiAhdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlKSB7XG4gICAgICB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUgPSB0cnVlO1xuICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJ0ZW1wb3JhcnktdG9vbC1zdGFydFwiLCBwb2ludDogeyB4OiBldmVudC54LCB5OiBldmVudC55IH0gfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWxlYXNlUHJlc3MoZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdKTogdm9pZCB7XG4gICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgdGhpcy5iYXJyZWxCdXR0b25IZWxkID0gZmFsc2U7XG4gICAgaWYgKCF0aGlzLmNvbnN1bWVkICYmICF0aGlzLm1vdmVkICYmICF0aGlzLmhvbGRGaXJlZCAmJiB0aGlzLnByZXNzT3JpZ2luKSB7XG4gICAgICBpZiAodGhpcy5wZW5kaW5nVGFwKSB7XG4gICAgICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgICAgICBlZmZlY3RzLnB1c2goeyB0eXBlOiBcImJ1dHRvbi1kb3VibGUtdGFwXCIsIHBvaW50OiB0aGlzLnByZXNzT3JpZ2luIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcG9pbnQgPSB0aGlzLnByZXNzT3JpZ2luO1xuICAgICAgICBjb25zdCB0aW1lciA9IHRoaXMuc2NoZWR1bGVyLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMucGVuZGluZ1RhcCA9IG51bGw7XG4gICAgICAgICAgdGhpcy5vbkVmZmVjdD8uKHsgdHlwZTogXCJidXR0b24tdGFwXCIsIHBvaW50IH0pO1xuICAgICAgICB9LCB0aGlzLnNldHRpbmdzLmRvdWJsZVRhcE1zKTtcbiAgICAgICAgdGhpcy5wZW5kaW5nVGFwID0geyBwb2ludCwgdGltZXIgfTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5wcmVzc09yaWdpbiA9IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGNhbmNlbFByZXNzKCk6IHZvaWQge1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuYmFycmVsQnV0dG9uSGVsZCA9IGZhbHNlO1xuICAgIHRoaXMucGVuQ29udGFjdCA9IGZhbHNlO1xuICAgIHRoaXMuY29uc3VtZWQgPSBmYWxzZTtcbiAgICB0aGlzLm1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5ob2xkRmlyZWQgPSBmYWxzZTtcbiAgICB0aGlzLnByZXNzT3JpZ2luID0gbnVsbDtcbiAgICB0aGlzLmFjdGl2ZVBvaW50ZXJJZCA9IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGNhbmNlbFRpbWVyKHdoaWNoOiBcImhvbGRcIik6IHZvaWQge1xuICAgIGlmICh3aGljaCA9PT0gXCJob2xkXCIgJiYgdGhpcy5ob2xkVGltZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuc2NoZWR1bGVyLmNsZWFyVGltZW91dCh0aGlzLmhvbGRUaW1lcik7XG4gICAgICB0aGlzLmhvbGRUaW1lciA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjYW5jZWxQZW5kaW5nVGFwKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnBlbmRpbmdUYXApIHRoaXMuc2NoZWR1bGVyLmNsZWFyVGltZW91dCh0aGlzLnBlbmRpbmdUYXAudGltZXIpO1xuICAgIHRoaXMucGVuZGluZ1RhcCA9IG51bGw7XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIHsgRXhjYWxpZHJhd0JyaWRnZSwgQWN0aXZlVG9vbFNuYXBzaG90IH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZVwiO1xuaW1wb3J0IHR5cGUgeyBEZWJ1Z0xvZ2dlciB9IGZyb20gXCIuLi9kZWJ1Zy9EZWJ1Z0xvZ2dlclwiO1xuaW1wb3J0IHsgRGVidWdPdmVybGF5IH0gZnJvbSBcIi4uL2RlYnVnL0RlYnVnT3ZlcmxheVwiO1xuaW1wb3J0IHR5cGUgeyBTdHlsdXNDb250cm9sc1NldHRpbmdzIH0gZnJvbSBcIi4uL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBub3JtYWxpemVQb2ludGVyRXZlbnQgfSBmcm9tIFwiLi9ub3JtYWxpemVQb2ludGVyRXZlbnRcIjtcbmltcG9ydCB7IFN0eWx1c0dlc3R1cmVNYWNoaW5lIH0gZnJvbSBcIi4vU3R5bHVzR2VzdHVyZU1hY2hpbmVcIjtcbmltcG9ydCB0eXBlIHsgR2VzdHVyZUVmZmVjdCwgTm9ybWFsaXplZFN0eWx1c0V2ZW50LCBQb2ludCwgU2NoZWR1bGVyIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IHR5cGUgQWN0aW9uSGFuZGxlciA9IChcbiAgYWN0aW9uOiBcIm1lbnVcIiB8IFwiY29weVwiIHwgXCJwYXN0ZVwiIHwgXCJub25lXCIsXG4gIHBvaW50OiBQb2ludCxcbiAgYnJpZGdlOiBFeGNhbGlkcmF3QnJpZGdlXG4pID0+IHZvaWQ7XG5cbmV4cG9ydCBjbGFzcyBTdHlsdXNDb250cm9sbGVyIHtcbiAgcHJpdmF0ZSByZWFkb25seSBtYWNoaW5lOiBTdHlsdXNHZXN0dXJlTWFjaGluZTtcbiAgcHJpdmF0ZSBzYXZlZFRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRpc3Bvc2VkID0gZmFsc2U7XG4gIHByaXZhdGUgcmVhZG9ubHkgbGlzdGVuZXJzOiBBcnJheTxba2V5b2YgSFRNTEVsZW1lbnRFdmVudE1hcCwgRXZlbnRMaXN0ZW5lcl0+ID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgb3ZlcmxheTogRGVidWdPdmVybGF5O1xuICBwcml2YXRlIGxhdGVzdEV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxlYWY6IFdvcmtzcGFjZUxlYWYsXG4gICAgcHJpdmF0ZSByZWFkb25seSBicmlkZ2U6IEV4Y2FsaWRyYXdCcmlkZ2UsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogKCkgPT4gU3R5bHVzQ29udHJvbHNTZXR0aW5ncyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRlYnVnOiBEZWJ1Z0xvZ2dlcixcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpc3BhdGNoQWN0aW9uOiBBY3Rpb25IYW5kbGVyLFxuICAgIHNjaGVkdWxlcjogU2NoZWR1bGVyID0gd2luZG93XG4gICkge1xuICAgIHRoaXMubWFjaGluZSA9IG5ldyBTdHlsdXNHZXN0dXJlTWFjaGluZSh0aGlzLmdlc3R1cmVTZXR0aW5ncygpLCBzY2hlZHVsZXIpO1xuICAgIHRoaXMubWFjaGluZS5zZXRFZmZlY3RTaW5rKChlZmZlY3QpID0+IHRoaXMuYXBwbHlFZmZlY3QoZWZmZWN0KSk7XG4gICAgdGhpcy5vdmVybGF5ID0gbmV3IERlYnVnT3ZlcmxheShcbiAgICAgIHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLFxuICAgICAgKCkgPT4gdGhpcy5zZXR0aW5ncygpLmRlYnVnTW9kZSAmJiB0aGlzLnNldHRpbmdzKCkuZGVidWdPdmVybGF5XG4gICAgKTtcbiAgfVxuXG4gIGF0dGFjaCgpOiB2b2lkIHtcbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWw7XG4gICAgZm9yIChjb25zdCB0eXBlIG9mIFtcbiAgICAgIFwicG9pbnRlcmRvd25cIixcbiAgICAgIFwicG9pbnRlcm1vdmVcIixcbiAgICAgIFwicG9pbnRlcnVwXCIsXG4gICAgICBcInBvaW50ZXJjYW5jZWxcIixcbiAgICAgIFwiY29udGV4dG1lbnVcIixcbiAgICBdIGFzIGNvbnN0KSB7XG4gICAgICBjb25zdCBsaXN0ZW5lcjogRXZlbnRMaXN0ZW5lciA9IChyYXcpID0+IHRoaXMub25Qb2ludGVyRXZlbnQocmF3IGFzIFBvaW50ZXJFdmVudCk7XG4gICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICAgICAgdGhpcy5saXN0ZW5lcnMucHVzaChbdHlwZSwgbGlzdGVuZXJdKTtcbiAgICB9XG4gIH1cblxuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSByZXR1cm47XG4gICAgdGhpcy5kaXNwb3NlZCA9IHRydWU7XG4gICAgZm9yIChjb25zdCBbdHlwZSwgbGlzdGVuZXJdIG9mIHRoaXMubGlzdGVuZXJzKVxuICAgICAgdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgdHJ1ZSk7XG4gICAgdGhpcy5saXN0ZW5lcnMubGVuZ3RoID0gMDtcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiB0aGlzLm1hY2hpbmUuZGlzcG9zZSgpKSB0aGlzLmFwcGx5RWZmZWN0KGVmZmVjdCk7XG4gICAgdGhpcy5vdmVybGF5LmNsb3NlKCk7XG4gIH1cbiAgZ2V0VHJhY2UoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5kZWJ1Zy5leHBvcnRUcmFjZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBvblBvaW50ZXJFdmVudChyYXc6IFBvaW50ZXJFdmVudCk6IHZvaWQge1xuICAgIGlmIChyYXcucG9pbnRlclR5cGUgIT09IFwicGVuXCIpIHJldHVybjtcbiAgICBjb25zdCBldmVudCA9IG5vcm1hbGl6ZVBvaW50ZXJFdmVudChcbiAgICAgIHJhdyxcbiAgICAgIHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLmNvbnRhaW5zKHJhdy50YXJnZXQgYXMgTm9kZSlcbiAgICApO1xuICAgIHRoaXMubGF0ZXN0RXZlbnQgPSBldmVudDtcbiAgICB0aGlzLmRlYnVnLmV2ZW50KGV2ZW50KTtcbiAgICBjb25zdCBlZmZlY3RzID0gdGhpcy5tYWNoaW5lLmhhbmRsZShldmVudCk7XG4gICAgaWYgKGVmZmVjdHMubGVuZ3RoID09PSAwKSB0aGlzLm92ZXJsYXkudXBkYXRlKGV2ZW50LCB0aGlzLm1hY2hpbmUuc25hcHNob3QoKSk7XG4gICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgZWZmZWN0cykge1xuICAgICAgaWYgKGVmZmVjdC50eXBlID09PSBcInN1cHByZXNzLWNvbnRleHQtbWVudVwiKSByYXcucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMuYXBwbHlFZmZlY3QoZWZmZWN0KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFwcGx5RWZmZWN0KGVmZmVjdDogR2VzdHVyZUVmZmVjdCk6IHZvaWQge1xuICAgIHRoaXMuZGVidWcubWVzc2FnZShgZWZmZWN0OiAke2VmZmVjdC50eXBlfWApO1xuICAgIHN3aXRjaCAoZWZmZWN0LnR5cGUpIHtcbiAgICAgIGNhc2UgXCJ0ZW1wb3JhcnktdG9vbC1zdGFydFwiOlxuICAgICAgICBpZiAoIXRoaXMuc2F2ZWRUb29sKSB7XG4gICAgICAgICAgdGhpcy5zYXZlZFRvb2wgPSB0aGlzLmJyaWRnZS5zdGFydFRlbXBvcmFyeUVyYXNlcigpO1xuICAgICAgICAgIGlmICghdGhpcy5zYXZlZFRvb2wpIHRoaXMubWFjaGluZS50ZW1wb3JhcnlUb29sRGlkTm90U3RhcnQoKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJ0ZW1wb3JhcnktdG9vbC1lbmRcIjpcbiAgICAgICAgaWYgKHRoaXMuc2F2ZWRUb29sKSB0aGlzLmJyaWRnZS5yZXN0b3JlVG9vbCh0aGlzLnNhdmVkVG9vbCk7XG4gICAgICAgIHRoaXMuc2F2ZWRUb29sID0gbnVsbDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiYnV0dG9uLXRhcFwiOlxuICAgICAgICB0aGlzLmRpc3BhdGNoQWN0aW9uKHRoaXMuc2V0dGluZ3MoKS5idXR0b25UYXBBY3Rpb24sIGVmZmVjdC5wb2ludCwgdGhpcy5icmlkZ2UpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJidXR0b24tZG91YmxlLXRhcFwiOlxuICAgICAgICB0aGlzLmRpc3BhdGNoQWN0aW9uKHRoaXMuc2V0dGluZ3MoKS5idXR0b25Eb3VibGVUYXBBY3Rpb24sIGVmZmVjdC5wb2ludCwgdGhpcy5icmlkZ2UpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJidXR0b24taG9sZFwiOlxuICAgICAgICB0aGlzLmRpc3BhdGNoQWN0aW9uKHRoaXMuc2V0dGluZ3MoKS5idXR0b25Ib2xkQWN0aW9uLCBlZmZlY3QucG9pbnQsIHRoaXMuYnJpZGdlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgaWYgKHRoaXMubGF0ZXN0RXZlbnQpIHRoaXMub3ZlcmxheS51cGRhdGUodGhpcy5sYXRlc3RFdmVudCwgdGhpcy5tYWNoaW5lLnNuYXBzaG90KCksIGVmZmVjdCk7XG4gIH1cblxuICBwcml2YXRlIGdlc3R1cmVTZXR0aW5ncygpIHtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMuc2V0dGluZ3MoKTtcbiAgICByZXR1cm4ge1xuICAgICAgYnV0dG9uQ29udGFjdEFjdGlvbjogdmFsdWUuYnV0dG9uQ29udGFjdEFjdGlvbixcbiAgICAgIGRvdWJsZVRhcE1zOiB2YWx1ZS5kb3VibGVUYXBNcyxcbiAgICAgIGxvbmdQcmVzc01zOiB2YWx1ZS5sb25nUHJlc3NNcyxcbiAgICAgIG1vdmVtZW50VGhyZXNob2xkUHg6IHZhbHVlLm1vdmVtZW50VGhyZXNob2xkUHgsXG4gICAgfSBhcyBjb25zdDtcbiAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgQXBwLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBFeGNhbGlkcmF3QnJpZGdlIH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZVwiO1xuaW1wb3J0IHsgRGVidWdMb2dnZXIgfSBmcm9tIFwiLi4vZGVidWcvRGVidWdMb2dnZXJcIjtcbmltcG9ydCB0eXBlIHsgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB9IGZyb20gXCIuLi9zZXR0aW5ncy9zZXR0aW5nc1wiO1xuaW1wb3J0IHsgU3R5bHVzQ29udHJvbGxlciwgdHlwZSBBY3Rpb25IYW5kbGVyIH0gZnJvbSBcIi4vU3R5bHVzQ29udHJvbGxlclwiO1xuXG5leHBvcnQgY2xhc3MgU3R5bHVzVmlld1JlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSByZWFkb25seSBjb250cm9sbGVycyA9IG5ldyBNYXA8V29ya3NwYWNlTGVhZiwgU3R5bHVzQ29udHJvbGxlcj4oKTtcbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNldHRpbmdzOiAoKSA9PiBTdHlsdXNDb250cm9sc1NldHRpbmdzLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgYWN0aW9uSGFuZGxlcjogQWN0aW9uSGFuZGxlclxuICApIHt9XG5cbiAgc3luYygpOiB2b2lkIHtcbiAgICBjb25zdCBsZWF2ZXMgPSBuZXcgU2V0KHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoXCJleGNhbGlkcmF3XCIpKTtcbiAgICBmb3IgKGNvbnN0IGxlYWYgb2YgbGVhdmVzKVxuICAgICAgaWYgKCF0aGlzLmNvbnRyb2xsZXJzLmhhcyhsZWFmKSkge1xuICAgICAgICBjb25zdCBkZWJ1ZyA9IG5ldyBEZWJ1Z0xvZ2dlcigoKSA9PiB0aGlzLnNldHRpbmdzKCkuZGVidWdNb2RlKTtcbiAgICAgICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBTdHlsdXNDb250cm9sbGVyKFxuICAgICAgICAgIGxlYWYsXG4gICAgICAgICAgbmV3IEV4Y2FsaWRyYXdCcmlkZ2UodGhpcy5hcHAsIGxlYWYpLFxuICAgICAgICAgIHRoaXMuc2V0dGluZ3MsXG4gICAgICAgICAgZGVidWcsXG4gICAgICAgICAgdGhpcy5hY3Rpb25IYW5kbGVyXG4gICAgICAgICk7XG4gICAgICAgIGNvbnRyb2xsZXIuYXR0YWNoKCk7XG4gICAgICAgIHRoaXMuY29udHJvbGxlcnMuc2V0KGxlYWYsIGNvbnRyb2xsZXIpO1xuICAgICAgfVxuICAgIGZvciAoY29uc3QgW2xlYWYsIGNvbnRyb2xsZXJdIG9mIHRoaXMuY29udHJvbGxlcnMpXG4gICAgICBpZiAoIWxlYXZlcy5oYXMobGVhZikpIHtcbiAgICAgICAgY29udHJvbGxlci5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMuY29udHJvbGxlcnMuZGVsZXRlKGxlYWYpO1xuICAgICAgfVxuICB9XG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBjb250cm9sbGVyIG9mIHRoaXMuY29udHJvbGxlcnMudmFsdWVzKCkpIGNvbnRyb2xsZXIuZGlzcG9zZSgpO1xuICAgIHRoaXMuY29udHJvbGxlcnMuY2xlYXIoKTtcbiAgfVxuICByZWZyZXNoKCk6IHZvaWQge1xuICAgIHRoaXMuZGlzcG9zZSgpO1xuICAgIHRoaXMuc3luYygpO1xuICB9XG4gIGV4cG9ydFRyYWNlcygpOiBzdHJpbmcge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShcbiAgICAgIFsuLi50aGlzLmNvbnRyb2xsZXJzLmVudHJpZXMoKV0ubWFwKChbbGVhZiwgY29udHJvbGxlcl0pID0+ICh7XG4gICAgICAgIGxlYWY6IGxlYWYuZ2V0RGlzcGxheVRleHQoKSxcbiAgICAgICAgZXZlbnRzOiBKU09OLnBhcnNlKGNvbnRyb2xsZXIuZ2V0VHJhY2UoKSksXG4gICAgICB9KSksXG4gICAgICBudWxsLFxuICAgICAgMlxuICAgICk7XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFBLG1CQUErQjs7O0FDR3hCLElBQU0sYUFBTixNQUFpQjtBQUFBLEVBQ2QsVUFBOEI7QUFBQSxFQUN0QyxLQUFLLE9BQWMsUUFBZ0M7QUFDakQsU0FBSyxNQUFNO0FBQ1gsVUFBTSxPQUFPLFNBQVMsS0FBSyxVQUFVLEVBQUUsS0FBSyx5QkFBeUIsQ0FBQztBQUN0RSxVQUFNQyxXQUF1QztBQUFBLE1BQzNDLENBQUMsYUFBYSxNQUFNLE9BQU8sUUFBUSxXQUFXLENBQUM7QUFBQSxNQUMvQyxDQUFDLGFBQWEsTUFBTSxPQUFPLFFBQVEsVUFBVSxDQUFDO0FBQUEsTUFDOUMsQ0FBQyxVQUFVLE1BQU0sT0FBTyxRQUFRLFFBQVEsQ0FBQztBQUFBLE1BQ3pDLENBQUMsYUFBYSxNQUFNLE9BQU8sUUFBUSxXQUFXLENBQUM7QUFBQSxNQUMvQyxDQUFDLFNBQVMsTUFBTSxPQUFPLFFBQVEsT0FBTyxDQUFDO0FBQUEsTUFDdkMsQ0FBQyxRQUFRLE1BQU0sT0FBTyxxQkFBcUIsQ0FBQztBQUFBLE1BQzVDLENBQUMsU0FBUyxNQUFNLE9BQU8sUUFBUSxLQUFLLENBQUM7QUFBQSxJQUN2QztBQUNBLGVBQVcsQ0FBQyxNQUFNLFFBQVEsS0FBS0EsVUFBUztBQUN0QyxZQUFNLFNBQVMsS0FBSyxTQUFTLFVBQVU7QUFBQSxRQUNyQyxNQUFNO0FBQUEsUUFDTixLQUFLO0FBQUEsTUFDUCxDQUFDO0FBQ0QsYUFBTyxpQkFBaUIsYUFBYSxDQUFDLFVBQVU7QUFDOUMsY0FBTSxnQkFBZ0I7QUFDdEIsaUJBQVM7QUFDVCxhQUFLLE1BQU07QUFB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LENBQUM7QUFDdEYsU0FBSyxJQUFJLFVBQVUsY0FBYyxNQUFNLEtBQUssVUFBVSxLQUFLLENBQUM7QUFDNUQsU0FBSyxXQUFXO0FBQUEsTUFDZCxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixVQUFVLFlBQVk7QUFDcEIsY0FBTSxRQUFRLEtBQUssVUFBVSxhQUFhLEtBQUs7QUFDL0MsWUFBSTtBQUNGLGdCQUFNLFVBQVUsVUFBVSxVQUFVLEtBQUs7QUFDekMsY0FBSSx3QkFBTyw0QkFBNEI7QUFBQSxRQUN6QyxRQUFRO0FBQ04sY0FBSSx3QkFBTywwREFBMEQ7QUFBQSxRQUN2RTtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxXQUFpQjtBQUNmLFNBQUssS0FBSyxNQUFNO0FBQ2hCLFNBQUssVUFBVSxRQUFRO0FBQ3ZCLFNBQUssV0FBVztBQUFBLEVBQ2xCO0FBQUEsRUFDQSxNQUFNLGVBQWUsT0FBdUQ7QUFDMUUsU0FBSyxXQUFXLGtCQUFrQixFQUFFLEdBQUcsS0FBSyxVQUFVLEdBQUcsTUFBTSxDQUFDO0FBQ2hFLFVBQU0sS0FBSyxTQUFTLEtBQUssUUFBUTtBQUNqQyxTQUFLLFVBQVUsUUFBUTtBQUFBLEVBQ3pCO0FBQ0Y7IiwKICAibmFtZXMiOiBbImltcG9ydF9vYnNpZGlhbiIsICJhY3Rpb25zIiwgImltcG9ydF9vYnNpZGlhbiJdCn0K
