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
  }
  action(name, key) {
    new import_obsidian.Setting(this.containerEl).setName(`S Pen side button: ${name}`).addDropdown((dropdown) => {
      for (const [value, label] of Object.entries(actions))
        dropdown.addOption(value, label);
      dropdown.setValue(this.plugin.settings[key]).onChange(
        async (value) => this.plugin.updateSettings({ [key]: value })
      );
    });
  }
  number(name, key) {
    new import_obsidian.Setting(this.containerEl).setName(name).addText(
      (text) => text.setValue(String(this.plugin.settings[key])).onChange(
        async (value) => this.plugin.updateSettings({ [key]: Number(value) })
      )
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
    if (!api?.setActiveTool || !tool) return null;
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
    if (!api?.setActiveTool) return false;
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
      if (this.activePointerId !== null && event.pointerId !== this.activePointerId)
        return effects;
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
  }
  machine;
  savedTool = null;
  disposed = false;
  listeners = [];
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
    this.debug.event(event);
    for (const effect of this.machine.handle(event)) {
      if (effect.type === "suppress-context-menu") raw.preventDefault();
      this.applyEffect(effect);
    }
  }
  applyEffect(effect) {
    switch (effect.type) {
      case "temporary-tool-start":
        if (!this.savedTool) this.savedTool = this.bridge.startTemporaryEraser();
        break;
      case "temporary-tool-end":
        if (this.savedTool) this.bridge.restoreTool(this.savedTool);
        this.savedTool = null;
        break;
      case "button-tap":
        this.dispatchAction(this.settings().buttonTapAction, effect.point, this.bridge);
        break;
      case "button-double-tap":
        this.dispatchAction(
          this.settings().buttonDoubleTapAction,
          effect.point,
          this.bridge
        );
        break;
      case "button-hold":
        this.dispatchAction(this.settings().buttonHoldAction, effect.point, this.bridge);
        break;
      default:
        break;
    }
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL21lbnUvU3R5bHVzTWVudS50cyIsICJzcmMvc2V0dGluZ3MvU2V0dGluZ3NUYWIudHMiLCAic3JjL3NldHRpbmdzL3NldHRpbmdzLnRzIiwgInNyYy9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2UudHMiLCAic3JjL2RlYnVnL0RlYnVnTG9nZ2VyLnRzIiwgInNyYy9zdHlsdXMvbm9ybWFsaXplUG9pbnRlckV2ZW50LnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzR2VzdHVyZU1hY2hpbmUudHMiLCAic3JjL3N0eWx1cy9TdHlsdXNDb250cm9sbGVyLnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzVmlld1JlZ2lzdHJ5LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBOb3RpY2UsIFBsdWdpbiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgU3R5bHVzTWVudSB9IGZyb20gXCIuL21lbnUvU3R5bHVzTWVudVwiO1xuaW1wb3J0IHsgU2V0dGluZ3NUYWIgfSBmcm9tIFwiLi9zZXR0aW5ncy9TZXR0aW5nc1RhYlwiO1xuaW1wb3J0IHtcbiAgICBERUZBVUxUX1NFVFRJTkdTLFxuICAgIG5vcm1hbGl6ZVNldHRpbmdzLFxuICAgIHR5cGUgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyxcbn0gZnJvbSBcIi4vc2V0dGluZ3Mvc2V0dGluZ3NcIjtcbmltcG9ydCB7IFN0eWx1c1ZpZXdSZWdpc3RyeSB9IGZyb20gXCIuL3N0eWx1cy9TdHlsdXNWaWV3UmVnaXN0cnlcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3R5bHVzQ29udHJvbHNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICAgIHNldHRpbmdzOiBTdHlsdXNDb250cm9sc1NldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HUztcbiAgICBwcml2YXRlIHJlZ2lzdHJ5OiBTdHlsdXNWaWV3UmVnaXN0cnkgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1lbnUgPSBuZXcgU3R5bHVzTWVudSgpO1xuXG4gICAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gbm9ybWFsaXplU2V0dGluZ3MoKGF3YWl0IHRoaXMubG9hZERhdGEoKSkgPz8ge30pO1xuICAgICAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFNldHRpbmdzVGFiKHRoaXMpKTtcbiAgICAgICAgdGhpcy5yZWdpc3RyeSA9IG5ldyBTdHlsdXNWaWV3UmVnaXN0cnkoXG4gICAgICAgICAgICB0aGlzLmFwcCxcbiAgICAgICAgICAgICgpID0+IHRoaXMuc2V0dGluZ3MsXG4gICAgICAgICAgICAoYWN0aW9uLCBwb2ludCwgYnJpZGdlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGFjdGlvbiA9PT0gXCJtZW51XCIpIHRoaXMubWVudS5vcGVuKHBvaW50LCBicmlkZ2UpO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJjb3B5XCIpIGJyaWRnZS5jb3B5U2VsZWN0ZWRFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJwYXN0ZVwiKSBicmlkZ2UucGFzdGVBdChwb2ludCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICApO1xuICAgICAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAud29ya3NwYWNlLm9uKFwibGF5b3V0LWNoYW5nZVwiLCAoKSA9PiB0aGlzLnJlZ2lzdHJ5Py5zeW5jKCkpKTtcbiAgICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9uTGF5b3V0UmVhZHkoKCkgPT4gdGhpcy5yZWdpc3RyeT8uc3luYygpKTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiBcImNvcHktc3R5bHVzLWV2ZW50LXRyYWNlXCIsXG4gICAgICAgICAgICBuYW1lOiBcIkNvcHkgbGF0ZXN0IHN0eWx1cyBldmVudCB0cmFjZVwiLFxuICAgICAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFjZSA9IHRoaXMucmVnaXN0cnk/LmV4cG9ydFRyYWNlcygpID8/IFwiW11cIjtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCh0cmFjZSk7XG4gICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJTdHlsdXMgZXZlbnQgdHJhY2UgY29waWVkLlwiKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShcIlVuYWJsZSB0byBjb3B5IGV2ZW50IHRyYWNlLiBDaGVjayB0aGUgZGV2ZWxvcGVyIGNvbnNvbGUuXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBvbnVubG9hZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5tZW51LmNsb3NlKCk7XG4gICAgICAgIHRoaXMucmVnaXN0cnk/LmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5yZWdpc3RyeSA9IG51bGw7XG4gICAgfVxuICAgIGFzeW5jIHVwZGF0ZVNldHRpbmdzKHBhdGNoOiBQYXJ0aWFsPFN0eWx1c0NvbnRyb2xzU2V0dGluZ3M+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBub3JtYWxpemVTZXR0aW5ncyh7IC4uLnRoaXMuc2V0dGluZ3MsIC4uLnBhdGNoIH0pO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLnJlZ2lzdHJ5Py5yZWZyZXNoKCk7XG4gICAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgRXhjYWxpZHJhd0JyaWRnZSB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBTdHlsdXNNZW51IHtcbiAgICBwcml2YXRlIGVsZW1lbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gICAgb3Blbihwb2ludDogUG9pbnQsIGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZSk6IHZvaWQge1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIGNvbnN0IG1lbnUgPSBkb2N1bWVudC5ib2R5LmNyZWF0ZURpdih7IGNsczogXCJleGNhbGlkcmF3LXN0eWx1cy1tZW51XCIgfSk7XG4gICAgICAgIGNvbnN0IGFjdGlvbnM6IEFycmF5PFtzdHJpbmcsICgpID0+IHZvaWRdPiA9IFtcbiAgICAgICAgICAgIFtcIlNlbGVjdGlvblwiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcInNlbGVjdGlvblwiKV0sXG4gICAgICAgICAgICBbXCJGcmVlIGRyYXdcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJmcmVlZHJhd1wiKV0sXG4gICAgICAgICAgICBbXCJFcmFzZXJcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJlcmFzZXJcIildLFxuICAgICAgICAgICAgW1wiUmVjdGFuZ2xlXCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwicmVjdGFuZ2xlXCIpXSxcbiAgICAgICAgICAgIFtcIkFycm93XCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiYXJyb3dcIildLFxuICAgICAgICAgICAgW1wiQ29weVwiLCAoKSA9PiBicmlkZ2UuY29weVNlbGVjdGVkRWxlbWVudHMoKV0sXG4gICAgICAgICAgICBbXCJQYXN0ZVwiLCAoKSA9PiBicmlkZ2UucGFzdGVBdChwb2ludCldLFxuICAgICAgICBdO1xuICAgICAgICBmb3IgKGNvbnN0IFtuYW1lLCBjYWxsYmFja10gb2YgYWN0aW9ucykge1xuICAgICAgICAgICAgY29uc3QgYnV0dG9uID0gbWVudS5jcmVhdGVFbChcImJ1dHRvblwiLCB7XG4gICAgICAgICAgICAgICAgdGV4dDogbmFtZSxcbiAgICAgICAgICAgICAgICBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtbWVudV9faXRlbVwiLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJ1cFwiLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxlZnQgPSBNYXRoLm1pbihNYXRoLm1heCg4LCBwb2ludC54KSwgd2luZG93LmlubmVyV2lkdGggLSAxODApO1xuICAgICAgICBjb25zdCB0b3AgPSBNYXRoLm1pbihNYXRoLm1heCg4LCBwb2ludC55KSwgd2luZG93LmlubmVySGVpZ2h0IC0gMzAwKTtcbiAgICAgICAgbWVudS5zZXRDc3NQcm9wcyh7IGxlZnQ6IGAke2xlZnR9cHhgLCB0b3A6IGAke3RvcH1weGAgfSk7XG4gICAgICAgIHRoaXMuZWxlbWVudCA9IG1lbnU7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KFxuICAgICAgICAgICAgKCkgPT5cbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmRvd25cIiwgdGhpcy5jbG9zZSwge1xuICAgICAgICAgICAgICAgICAgICBvbmNlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjYXB0dXJlOiB0cnVlLFxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgMCxcbiAgICAgICAgKTtcbiAgICB9XG4gICAgY2xvc2UgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIHRoaXMuZWxlbWVudD8ucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuZWxlbWVudCA9IG51bGw7XG4gICAgfTtcbn1cbiIsICJpbXBvcnQgeyBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTdHlsdXNDb250cm9sc1BsdWdpbiBmcm9tIFwiLi4vbWFpblwiO1xuaW1wb3J0IHR5cGUgeyBTdHlsdXNBY3Rpb24gfSBmcm9tIFwiLi9zZXR0aW5nc1wiO1xuXG5jb25zdCBhY3Rpb25zOiBSZWNvcmQ8U3R5bHVzQWN0aW9uLCBzdHJpbmc+ID0ge1xuICAgIG1lbnU6IFwiT3BlbiBtZW51XCIsXG4gICAgY29weTogXCJDb3B5XCIsXG4gICAgcGFzdGU6IFwiUGFzdGVcIixcbiAgICBub25lOiBcIkRvIG5vdGhpbmdcIixcbn07XG5cbmV4cG9ydCBjbGFzcyBTZXR0aW5nc1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBTdHlsdXNDb250cm9sc1BsdWdpbikge1xuICAgICAgICBzdXBlcihwbHVnaW4uYXBwLCBwbHVnaW4pO1xuICAgIH1cbiAgICBkaXNwbGF5KCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgICAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgICAgICAgdGV4dDogXCJSZXF1aXJlcyB0aGUgRXhjYWxpZHJhdyBjb21tdW5pdHkgcGx1Z2luLiBDb3B5L3Bhc3RlIHVzZXMgYSBwcml2YXRlIGluLW1lbW9yeSBjbGlwYm9hcmQgaW4gdmVyc2lvbiAwLjEuXCIsXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFjdGlvbihcIlRhcFwiLCBcImJ1dHRvblRhcEFjdGlvblwiKTtcbiAgICAgICAgdGhpcy5hY3Rpb24oXCJEb3VibGUgdGFwXCIsIFwiYnV0dG9uRG91YmxlVGFwQWN0aW9uXCIpO1xuICAgICAgICB0aGlzLmFjdGlvbihcIkhvbGRcIiwgXCJidXR0b25Ib2xkQWN0aW9uXCIpO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiQnV0dG9uICsgcGVuIGNvbnRhY3RcIilcbiAgICAgICAgICAgIC5zZXREZXNjKFwiVGVtcG9yYXJ5IHRvb2wgd2hpbGUgdGhlIHNpZGUgYnV0dG9uIGlzIGhlbGQgZHVyaW5nIHBlbiBjb250YWN0LlwiKVxuICAgICAgICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT5cbiAgICAgICAgICAgICAgICBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKFwiZXJhc2VyXCIsIFwiVGVtcG9yYXJ5IGVyYXNlclwiKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKFwibm9uZVwiLCBcIkRvIG5vdGhpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmJ1dHRvbkNvbnRhY3RBY3Rpb24pXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnV0dG9uQ29udGFjdEFjdGlvbjogdmFsdWUgYXMgXCJlcmFzZXJcIiB8IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICApO1xuICAgICAgICB0aGlzLm51bWJlcihcIkRvdWJsZS10YXAgaW50ZXJ2YWwgKG1zKVwiLCBcImRvdWJsZVRhcE1zXCIpO1xuICAgICAgICB0aGlzLm51bWJlcihcIkxvbmctcHJlc3MgZGVsYXkgKG1zKVwiLCBcImxvbmdQcmVzc01zXCIpO1xuICAgICAgICB0aGlzLm51bWJlcihcIk1vdmVtZW50IHRocmVzaG9sZCAocHgpXCIsIFwibW92ZW1lbnRUaHJlc2hvbGRQeFwiKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZShcIkRlYnVnIGxvZ2dpbmdcIilcbiAgICAgICAgICAgIC5zZXREZXNjKFwiTG9ncyBib3VuZGVkIHJhdyBwZW4gZXZlbnQgdHJhY2VzIHRvIHRoZSBkZXZlbG9wZXIgY29uc29sZS5cIilcbiAgICAgICAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cbiAgICAgICAgICAgICAgICB0b2dnbGVcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlYnVnTW9kZSlcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4gdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBkZWJ1Z01vZGU6IHZhbHVlIH0pKSxcbiAgICAgICAgICAgICk7XG4gICAgfVxuICAgIHByaXZhdGUgYWN0aW9uKFxuICAgICAgICBuYW1lOiBzdHJpbmcsXG4gICAgICAgIGtleTogXCJidXR0b25UYXBBY3Rpb25cIiB8IFwiYnV0dG9uRG91YmxlVGFwQWN0aW9uXCIgfCBcImJ1dHRvbkhvbGRBY3Rpb25cIixcbiAgICApOiB2b2lkIHtcbiAgICAgICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKGBTIFBlbiBzaWRlIGJ1dHRvbjogJHtuYW1lfWApXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBbdmFsdWUsIGxhYmVsXSBvZiBPYmplY3QuZW50cmllcyhhY3Rpb25zKSlcbiAgICAgICAgICAgICAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKHZhbHVlLCBsYWJlbCk7XG4gICAgICAgICAgICAgICAgZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzW2tleV0pXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IFtrZXldOiB2YWx1ZSBhcyBTdHlsdXNBY3Rpb24gfSksXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG4gICAgcHJpdmF0ZSBudW1iZXIobmFtZTogc3RyaW5nLCBrZXk6IFwiZG91YmxlVGFwTXNcIiB8IFwibG9uZ1ByZXNzTXNcIiB8IFwibW92ZW1lbnRUaHJlc2hvbGRQeFwiKTogdm9pZCB7XG4gICAgICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZShuYW1lKVxuICAgICAgICAgICAgLmFkZFRleHQoKHRleHQpID0+XG4gICAgICAgICAgICAgICAgdGV4dFxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzW2tleV0pKVxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBba2V5XTogTnVtYmVyKHZhbHVlKSB9KSxcbiAgICAgICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICk7XG4gICAgfVxufVxuIiwgImV4cG9ydCB0eXBlIFN0eWx1c0FjdGlvbiA9IFwibWVudVwiIHwgXCJjb3B5XCIgfCBcInBhc3RlXCIgfCBcIm5vbmVcIjtcblxuZXhwb3J0IGludGVyZmFjZSBTdHlsdXNDb250cm9sc1NldHRpbmdzIHtcbiAgICBidXR0b25UYXBBY3Rpb246IFN0eWx1c0FjdGlvbjtcbiAgICBidXR0b25Eb3VibGVUYXBBY3Rpb246IFN0eWx1c0FjdGlvbjtcbiAgICBidXR0b25Ib2xkQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gICAgYnV0dG9uQ29udGFjdEFjdGlvbjogXCJlcmFzZXJcIiB8IFwibm9uZVwiO1xuICAgIGRvdWJsZVRhcE1zOiBudW1iZXI7XG4gICAgbG9uZ1ByZXNzTXM6IG51bWJlcjtcbiAgICBtb3ZlbWVudFRocmVzaG9sZFB4OiBudW1iZXI7XG4gICAgY2xlYW51cFN0cmF5RG90OiBib29sZWFuO1xuICAgIGRlYnVnTW9kZTogYm9vbGVhbjtcbiAgICBkZWJ1Z092ZXJsYXk6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTdHlsdXNDb250cm9sc1NldHRpbmdzID0ge1xuICAgIGJ1dHRvblRhcEFjdGlvbjogXCJtZW51XCIsXG4gICAgYnV0dG9uRG91YmxlVGFwQWN0aW9uOiBcImNvcHlcIixcbiAgICBidXR0b25Ib2xkQWN0aW9uOiBcInBhc3RlXCIsXG4gICAgYnV0dG9uQ29udGFjdEFjdGlvbjogXCJlcmFzZXJcIixcbiAgICBkb3VibGVUYXBNczogMzAwLFxuICAgIGxvbmdQcmVzc01zOiA0NTAsXG4gICAgbW92ZW1lbnRUaHJlc2hvbGRQeDogOCxcbiAgICBjbGVhbnVwU3RyYXlEb3Q6IHRydWUsXG4gICAgZGVidWdNb2RlOiBmYWxzZSxcbiAgICBkZWJ1Z092ZXJsYXk6IGZhbHNlLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVNldHRpbmdzKHZhbHVlOiBQYXJ0aWFsPFN0eWx1c0NvbnRyb2xzU2V0dGluZ3M+KTogU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB7XG4gICAgY29uc3QgYWN0aW9uID0gKGNhbmRpZGF0ZTogdW5rbm93biwgZmFsbGJhY2s6IFN0eWx1c0FjdGlvbik6IFN0eWx1c0FjdGlvbiA9PlxuICAgICAgICBjYW5kaWRhdGUgPT09IFwibWVudVwiIHx8XG4gICAgICAgIGNhbmRpZGF0ZSA9PT0gXCJjb3B5XCIgfHxcbiAgICAgICAgY2FuZGlkYXRlID09PSBcInBhc3RlXCIgfHxcbiAgICAgICAgY2FuZGlkYXRlID09PSBcIm5vbmVcIlxuICAgICAgICAgICAgPyBjYW5kaWRhdGVcbiAgICAgICAgICAgIDogZmFsbGJhY2s7XG4gICAgY29uc3QgbnVtYmVyID0gKGNhbmRpZGF0ZTogdW5rbm93biwgZmFsbGJhY2s6IG51bWJlciwgbWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyID0+XG4gICAgICAgIHR5cGVvZiBjYW5kaWRhdGUgPT09IFwibnVtYmVyXCIgJiYgTnVtYmVyLmlzRmluaXRlKGNhbmRpZGF0ZSlcbiAgICAgICAgICAgID8gTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIE1hdGgucm91bmQoY2FuZGlkYXRlKSkpXG4gICAgICAgICAgICA6IGZhbGxiYWNrO1xuICAgIHJldHVybiB7XG4gICAgICAgIGJ1dHRvblRhcEFjdGlvbjogYWN0aW9uKHZhbHVlLmJ1dHRvblRhcEFjdGlvbiwgREVGQVVMVF9TRVRUSU5HUy5idXR0b25UYXBBY3Rpb24pLFxuICAgICAgICBidXR0b25Eb3VibGVUYXBBY3Rpb246IGFjdGlvbihcbiAgICAgICAgICAgIHZhbHVlLmJ1dHRvbkRvdWJsZVRhcEFjdGlvbixcbiAgICAgICAgICAgIERFRkFVTFRfU0VUVElOR1MuYnV0dG9uRG91YmxlVGFwQWN0aW9uLFxuICAgICAgICApLFxuICAgICAgICBidXR0b25Ib2xkQWN0aW9uOiBhY3Rpb24odmFsdWUuYnV0dG9uSG9sZEFjdGlvbiwgREVGQVVMVF9TRVRUSU5HUy5idXR0b25Ib2xkQWN0aW9uKSxcbiAgICAgICAgYnV0dG9uQ29udGFjdEFjdGlvbjogdmFsdWUuYnV0dG9uQ29udGFjdEFjdGlvbiA9PT0gXCJub25lXCIgPyBcIm5vbmVcIiA6IFwiZXJhc2VyXCIsXG4gICAgICAgIGRvdWJsZVRhcE1zOiBudW1iZXIodmFsdWUuZG91YmxlVGFwTXMsIDMwMCwgMTAwLCAxMDAwKSxcbiAgICAgICAgbG9uZ1ByZXNzTXM6IG51bWJlcih2YWx1ZS5sb25nUHJlc3NNcywgNDUwLCAxNTAsIDIwMDApLFxuICAgICAgICBtb3ZlbWVudFRocmVzaG9sZFB4OiBudW1iZXIodmFsdWUubW92ZW1lbnRUaHJlc2hvbGRQeCwgOCwgMSwgMTAwKSxcbiAgICAgICAgY2xlYW51cFN0cmF5RG90OiB2YWx1ZS5jbGVhbnVwU3RyYXlEb3QgIT09IGZhbHNlLFxuICAgICAgICBkZWJ1Z01vZGU6IHZhbHVlLmRlYnVnTW9kZSA9PT0gdHJ1ZSxcbiAgICAgICAgZGVidWdPdmVybGF5OiB2YWx1ZS5kZWJ1Z092ZXJsYXkgPT09IHRydWUsXG4gICAgfTtcbn1cbiIsICJpbXBvcnQgeyBOb3RpY2UsIHR5cGUgQXBwLCB0eXBlIFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aXZlVG9vbFNuYXBzaG90IHtcbiAgICB0eXBlOiBzdHJpbmc7XG4gICAgW2tleTogc3RyaW5nXTogdW5rbm93bjtcbn1cbnR5cGUgSW1wZXJhdGl2ZUFwaSA9IHtcbiAgICBnZXRBcHBTdGF0ZT86ICgpID0+IHsgYWN0aXZlVG9vbD86IEFjdGl2ZVRvb2xTbmFwc2hvdCB9O1xuICAgIHNldEFjdGl2ZVRvb2w/OiAodG9vbDogQWN0aXZlVG9vbFNuYXBzaG90KSA9PiB2b2lkO1xufTtcblxuLyoqIENvbXBhdGliaWxpdHkgYm91bmRhcnkgZm9yIHRoZSBvcHRpb25hbCBFeGNhbGlkcmF3IHBsdWdpbi4gKi9cbmV4cG9ydCBjbGFzcyBFeGNhbGlkcmF3QnJpZGdlIHtcbiAgICBwcml2YXRlIHdhcm5lZCA9IGZhbHNlO1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBwcml2YXRlIHJlYWRvbmx5IGFwcDogQXBwLFxuICAgICAgICBwcml2YXRlIHJlYWRvbmx5IGxlYWY6IFdvcmtzcGFjZUxlYWYsXG4gICAgKSB7fVxuXG4gICAgc3RhcnRUZW1wb3JhcnlFcmFzZXIoKTogQWN0aXZlVG9vbFNuYXBzaG90IHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IGFwaSA9IHRoaXMuZ2V0QXBpKCk7XG4gICAgICAgIGNvbnN0IHRvb2wgPSBhcGk/LmdldEFwcFN0YXRlPy4oKS5hY3RpdmVUb29sO1xuICAgICAgICBpZiAoIWFwaT8uc2V0QWN0aXZlVG9vbCB8fCAhdG9vbCkgcmV0dXJuIG51bGw7XG4gICAgICAgIGFwaS5zZXRBY3RpdmVUb29sKHsgdHlwZTogXCJlcmFzZXJcIiB9KTtcbiAgICAgICAgcmV0dXJuIHsgLi4udG9vbCB9O1xuICAgIH1cbiAgICByZXN0b3JlVG9vbCh0b29sOiBBY3RpdmVUb29sU25hcHNob3QpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgYXBpID0gdGhpcy5nZXRBcGkoKTtcbiAgICAgICAgaWYgKCFhcGk/LnNldEFjdGl2ZVRvb2wpIHJldHVybiBmYWxzZTtcbiAgICAgICAgYXBpLnNldEFjdGl2ZVRvb2wodG9vbCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBzZXRUb29sKHR5cGU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBhcGkgPSB0aGlzLmdldEFwaSgpO1xuICAgICAgICBpZiAoIWFwaT8uc2V0QWN0aXZlVG9vbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBhcGkuc2V0QWN0aXZlVG9vbCh7IHR5cGUgfSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjb3B5U2VsZWN0ZWRFbGVtZW50cygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy51bnN1cHBvcnRlZChcIkNvcHkgcmVxdWlyZXMgYSBjb21wYXRpYmxlIEV4Y2FsaWRyYXcgQVBJLlwiKTtcbiAgICB9XG4gICAgcGFzdGVBdChwb2ludDogUG9pbnQpOiB2b2lkIHtcbiAgICAgICAgdm9pZCBwb2ludDtcbiAgICAgICAgdGhpcy51bnN1cHBvcnRlZChcIlBhc3RlIHJlcXVpcmVzIGEgY29tcGF0aWJsZSBFeGNhbGlkcmF3IEFQSS5cIik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRBcGkoKTogSW1wZXJhdGl2ZUFwaSB8IG51bGwge1xuICAgICAgICAvLyBFeGNhbGlkcmF3IGV4cG9zZXMgbm8gc3RhYmxlIENvbW11bml0eSBQbHVnaW4gQVBJIGZvciB0aGlzIHBhdGguIEtlZXAgdGhpc1xuICAgICAgICAvLyBvcHRpb25hbCBjYXBhYmlsaXR5IHByb2JlIGlzb2xhdGVkIHVudGlsIGEgZG9jdW1lbnRlZCBsZWFmLWF3YXJlIEFQSSBleGlzdHMuXG4gICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLmxlYWYudmlldyBhcyB1bmtub3duIGFzIHtcbiAgICAgICAgICAgIGV4Y2FsaWRyYXdBUEk/OiBJbXBlcmF0aXZlQXBpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdmlldy5leGNhbGlkcmF3QVBJID8/IG51bGw7XG4gICAgfVxuICAgIHByaXZhdGUgdW5zdXBwb3J0ZWQobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGlmICghdGhpcy53YXJuZWQpIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYEV4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzOiAke21lc3NhZ2V9YCk7XG4gICAgICAgICAgICB0aGlzLndhcm5lZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBEZWJ1Z0xvZ2dlciB7XG4gICAgcHJpdmF0ZSB0cmFjZTogTm9ybWFsaXplZFN0eWx1c0V2ZW50W10gPSBbXTtcbiAgICBwcml2YXRlIGxhc3RNb3ZlTG9nQXQgPSAtSW5maW5pdHk7XG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBlbmFibGVkOiAoKSA9PiBib29sZWFuKSB7fVxuXG4gICAgZXZlbnQoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMuZW5hYmxlZCgpKSByZXR1cm47XG4gICAgICAgIGlmIChldmVudC5raW5kID09PSBcIm1vdmVcIiAmJiBldmVudC50aW1lc3RhbXAgLSB0aGlzLmxhc3RNb3ZlTG9nQXQgPCAxMDApIHJldHVybjtcbiAgICAgICAgaWYgKGV2ZW50LmtpbmQgPT09IFwibW92ZVwiKSB0aGlzLmxhc3RNb3ZlTG9nQXQgPSBldmVudC50aW1lc3RhbXA7XG4gICAgICAgIHRoaXMudHJhY2UucHVzaChldmVudCk7XG4gICAgICAgIGlmICh0aGlzLnRyYWNlLmxlbmd0aCA+IDEwMCkgdGhpcy50cmFjZS5zaGlmdCgpO1xuICAgICAgICBjb25zb2xlLmRlYnVnKFwiW0V4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzXVwiLCBldmVudCk7XG4gICAgfVxuICAgIG1lc3NhZ2UobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLmVuYWJsZWQoKSkgY29uc29sZS5kZWJ1ZyhcIltFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9sc11cIiwgbWVzc2FnZSk7XG4gICAgfVxuICAgIGV4cG9ydFRyYWNlKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLnRyYWNlLCBudWxsLCAyKTtcbiAgICB9XG4gICAgY2xlYXIoKTogdm9pZCB7XG4gICAgICAgIHRoaXMudHJhY2UgPSBbXTtcbiAgICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBOb3JtYWxpemVkU3R5bHVzRXZlbnQsIFN0eWx1c0V2ZW50S2luZCB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmNvbnN0IGV2ZW50S2luZHM6IFJlY29yZDxzdHJpbmcsIFN0eWx1c0V2ZW50S2luZD4gPSB7XG4gICAgcG9pbnRlcmRvd246IFwiZG93blwiLFxuICAgIHBvaW50ZXJtb3ZlOiBcIm1vdmVcIixcbiAgICBwb2ludGVydXA6IFwidXBcIixcbiAgICBwb2ludGVyY2FuY2VsOiBcImNhbmNlbFwiLFxuICAgIGNvbnRleHRtZW51OiBcImNvbnRleHRtZW51XCIsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplUG9pbnRlckV2ZW50KFxuICAgIGV2ZW50OiBQb2ludGVyRXZlbnQsXG4gICAgaXNDYW52YXNUYXJnZXQ6IGJvb2xlYW4sXG4pOiBOb3JtYWxpemVkU3R5bHVzRXZlbnQge1xuICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IGV2ZW50S2luZHNbZXZlbnQudHlwZV0gPz8gXCJtb3ZlXCIsXG4gICAgICAgIHBvaW50ZXJUeXBlOiBldmVudC5wb2ludGVyVHlwZSxcbiAgICAgICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgICAgIGJ1dHRvbnM6IGV2ZW50LmJ1dHRvbnMsXG4gICAgICAgIGJ1dHRvbjogZXZlbnQuYnV0dG9uLFxuICAgICAgICBwcmVzc3VyZTogZXZlbnQucHJlc3N1cmUsXG4gICAgICAgIHg6IGV2ZW50LmNsaWVudFgsXG4gICAgICAgIHk6IGV2ZW50LmNsaWVudFksXG4gICAgICAgIHRpbWVzdGFtcDogZXZlbnQudGltZVN0YW1wLFxuICAgICAgICBpc0NhbnZhc1RhcmdldCxcbiAgICB9O1xufVxuIiwgImltcG9ydCB0eXBlIHtcbiAgICBHZXN0dXJlRWZmZWN0LFxuICAgIEdlc3R1cmVTZXR0aW5ncyxcbiAgICBOb3JtYWxpemVkU3R5bHVzRXZlbnQsXG4gICAgUG9pbnQsXG4gICAgU2NoZWR1bGVyLFxufSBmcm9tIFwiLi90eXBlc1wiO1xuXG5pbnRlcmZhY2UgUGVuZGluZ1RhcCB7XG4gICAgcG9pbnQ6IFBvaW50O1xuICAgIHRpbWVyOiB1bmtub3duO1xufVxuXG4vKiogUHVyZSBwZXItdmlldyBTIFBlbiBnZXN0dXJlIHBvbGljeS4gSXQgbmV2ZXIgdG91Y2hlcyB0aGUgRE9NIG9yIEV4Y2FsaWRyYXcuICovXG5leHBvcnQgY2xhc3MgU3R5bHVzR2VzdHVyZU1hY2hpbmUge1xuICAgIHByaXZhdGUgYmFycmVsQnV0dG9uSGVsZCA9IGZhbHNlO1xuICAgIHByaXZhdGUgcGVuQ29udGFjdCA9IGZhbHNlO1xuICAgIHByaXZhdGUgY29uc3VtZWQgPSBmYWxzZTtcbiAgICBwcml2YXRlIG1vdmVkID0gZmFsc2U7XG4gICAgcHJpdmF0ZSBob2xkRmlyZWQgPSBmYWxzZTtcbiAgICBwcml2YXRlIHRlbXBvcmFyeVRvb2xBY3RpdmUgPSBmYWxzZTtcbiAgICBwcml2YXRlIHByZXNzT3JpZ2luOiBQb2ludCB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgaG9sZFRpbWVyOiB1bmtub3duIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBwZW5kaW5nVGFwOiBQZW5kaW5nVGFwIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBhY3RpdmVQb2ludGVySWQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgc2V0dGluZ3M6IEdlc3R1cmVTZXR0aW5ncyxcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBzY2hlZHVsZXI6IFNjaGVkdWxlcixcbiAgICApIHt9XG5cbiAgICBoYW5kbGUoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IEdlc3R1cmVFZmZlY3RbXSB7XG4gICAgICAgIGlmIChldmVudC5wb2ludGVyVHlwZSAhPT0gXCJwZW5cIikgcmV0dXJuIFtdO1xuICAgICAgICBjb25zdCBlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10gPSBbXTtcbiAgICAgICAgaWYgKGV2ZW50LmtpbmQgPT09IFwiY29udGV4dG1lbnVcIikge1xuICAgICAgICAgICAgaWYgKHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSB8fCAodGhpcy5iYXJyZWxCdXR0b25IZWxkICYmIHRoaXMucGVuQ29udGFjdCkpXG4gICAgICAgICAgICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJzdXBwcmVzcy1jb250ZXh0LW1lbnVcIiB9KTtcbiAgICAgICAgICAgIHJldHVybiBlZmZlY3RzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV2ZW50LmtpbmQgPT09IFwiZG93blwiKSB7XG4gICAgICAgICAgICB0aGlzLnBlbkNvbnRhY3QgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBldmVudC5wb2ludGVySWQ7XG4gICAgICAgICAgICBpZiAodGhpcy5iYXJyZWxCdXR0b25IZWxkKSB0aGlzLmNvbnN1bWVGb3JDb250YWN0KGV2ZW50LCBlZmZlY3RzKTtcbiAgICAgICAgICAgIHJldHVybiBlZmZlY3RzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV2ZW50LmtpbmQgPT09IFwidXBcIiB8fCBldmVudC5raW5kID09PSBcImNhbmNlbFwiKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hY3RpdmVQb2ludGVySWQgIT09IG51bGwgJiYgZXZlbnQucG9pbnRlcklkICE9PSB0aGlzLmFjdGl2ZVBvaW50ZXJJZClcbiAgICAgICAgICAgICAgICByZXR1cm4gZWZmZWN0cztcbiAgICAgICAgICAgIHRoaXMucGVuQ29udGFjdCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBudWxsO1xuICAgICAgICAgICAgaWYgKHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtZW5kXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJjYW5jZWxcIikgdGhpcy5jYW5jZWxQcmVzcygpO1xuICAgICAgICAgICAgcmV0dXJuIGVmZmVjdHM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIb3ZlciBtb3ZlbWVudCBpcyB0aGUgb25seSBldmlkZW5jZSB1c2VkIHRvIGludGVycHJldCBidXR0b25zIGFzIGJhcnJlbCBzdGF0ZS5cbiAgICAgICAgaWYgKHRoaXMucGVuQ29udGFjdCkgcmV0dXJuIGVmZmVjdHM7XG4gICAgICAgIGNvbnN0IGhlbGROb3cgPSAoZXZlbnQuYnV0dG9ucyAmIDEpICE9PSAwO1xuICAgICAgICBpZiAoIXRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiBoZWxkTm93KSB0aGlzLnN0YXJ0UHJlc3MoZXZlbnQpO1xuICAgICAgICBpZiAodGhpcy5iYXJyZWxCdXR0b25IZWxkICYmIGhlbGROb3cpIHRoaXMudHJhY2tIb3Zlck1vdmVtZW50KGV2ZW50KTtcbiAgICAgICAgaWYgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiAhaGVsZE5vdykgdGhpcy5yZWxlYXNlUHJlc3MoZWZmZWN0cyk7XG4gICAgICAgIHJldHVybiBlZmZlY3RzO1xuICAgIH1cblxuICAgIGRpc3Bvc2UoKTogR2VzdHVyZUVmZmVjdFtdIHtcbiAgICAgICAgY29uc3QgZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdID0gW107XG4gICAgICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgICAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICAgICAgaWYgKHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJ0ZW1wb3JhcnktdG9vbC1lbmRcIiB9KTtcbiAgICAgICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcbiAgICAgICAgcmV0dXJuIGVmZmVjdHM7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzdGFydFByZXNzKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5iYXJyZWxCdXR0b25IZWxkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5jb25zdW1lZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLm1vdmVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaG9sZEZpcmVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMucHJlc3NPcmlnaW4gPSB7IHg6IGV2ZW50LngsIHk6IGV2ZW50LnkgfTtcbiAgICAgICAgdGhpcy5ob2xkVGltZXIgPSB0aGlzLnNjaGVkdWxlci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAhdGhpcy5iYXJyZWxCdXR0b25IZWxkIHx8XG4gICAgICAgICAgICAgICAgdGhpcy5wZW5Db250YWN0IHx8XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlZCB8fFxuICAgICAgICAgICAgICAgIHRoaXMuY29uc3VtZWQgfHxcbiAgICAgICAgICAgICAgICAhdGhpcy5wcmVzc09yaWdpblxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHRoaXMuaG9sZEZpcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuY29uc3VtZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgICAgICAgICB0aGlzLm9uRWZmZWN0Py4oeyB0eXBlOiBcImJ1dHRvbi1ob2xkXCIsIHBvaW50OiB0aGlzLnByZXNzT3JpZ2luIH0pO1xuICAgICAgICB9LCB0aGlzLnNldHRpbmdzLmxvbmdQcmVzc01zKTtcbiAgICB9XG5cbiAgICAvKiogQ29udHJvbGxlciByZWdpc3RlcnMgdGhpcyBzbyBzY2hlZHVsZXIgY2FsbGJhY2tzIHJldGFpbiBwdXJlIHNlbWFudGljIG91dHB1dC4gKi9cbiAgICBwcml2YXRlIG9uRWZmZWN0OiAoKGVmZmVjdDogR2VzdHVyZUVmZmVjdCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgICBzZXRFZmZlY3RTaW5rKHNpbms6IChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QpID0+IHZvaWQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5vbkVmZmVjdCA9IHNpbms7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB0cmFja0hvdmVyTW92ZW1lbnQoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMucHJlc3NPcmlnaW4gfHwgdGhpcy5tb3ZlZCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBkeCA9IGV2ZW50LnggLSB0aGlzLnByZXNzT3JpZ2luLng7XG4gICAgICAgIGNvbnN0IGR5ID0gZXZlbnQueSAtIHRoaXMucHJlc3NPcmlnaW4ueTtcbiAgICAgICAgaWYgKE1hdGguaHlwb3QoZHgsIGR5KSA+IHRoaXMuc2V0dGluZ3MubW92ZW1lbnRUaHJlc2hvbGRQeCkge1xuICAgICAgICAgICAgdGhpcy5tb3ZlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgY29uc3VtZUZvckNvbnRhY3QoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuY29uc3VtZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICAgICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmJ1dHRvbkNvbnRhY3RBY3Rpb24gPT09IFwiZXJhc2VyXCIgJiYgIXRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkge1xuICAgICAgICAgICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtc3RhcnRcIiwgcG9pbnQ6IHsgeDogZXZlbnQueCwgeTogZXZlbnQueSB9IH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSByZWxlYXNlUHJlc3MoZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgICAgICB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF0aGlzLmNvbnN1bWVkICYmICF0aGlzLm1vdmVkICYmICF0aGlzLmhvbGRGaXJlZCAmJiB0aGlzLnByZXNzT3JpZ2luKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wZW5kaW5nVGFwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgICAgICAgICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJidXR0b24tZG91YmxlLXRhcFwiLCBwb2ludDogdGhpcy5wcmVzc09yaWdpbiB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcG9pbnQgPSB0aGlzLnByZXNzT3JpZ2luO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVyID0gdGhpcy5zY2hlZHVsZXIuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGVuZGluZ1RhcCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25FZmZlY3Q/Lih7IHR5cGU6IFwiYnV0dG9uLXRhcFwiLCBwb2ludCB9KTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzLnNldHRpbmdzLmRvdWJsZVRhcE1zKTtcbiAgICAgICAgICAgICAgICB0aGlzLnBlbmRpbmdUYXAgPSB7IHBvaW50LCB0aW1lciB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJlc3NPcmlnaW4gPSBudWxsO1xuICAgIH1cblxuICAgIHByaXZhdGUgY2FuY2VsUHJlc3MoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgICAgICB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5wZW5Db250YWN0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY29uc3VtZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5tb3ZlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhvbGRGaXJlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnByZXNzT3JpZ2luID0gbnVsbDtcbiAgICAgICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBudWxsO1xuICAgIH1cblxuICAgIHByaXZhdGUgY2FuY2VsVGltZXIod2hpY2g6IFwiaG9sZFwiKTogdm9pZCB7XG4gICAgICAgIGlmICh3aGljaCA9PT0gXCJob2xkXCIgJiYgdGhpcy5ob2xkVGltZXIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVyLmNsZWFyVGltZW91dCh0aGlzLmhvbGRUaW1lcik7XG4gICAgICAgICAgICB0aGlzLmhvbGRUaW1lciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGNhbmNlbFBlbmRpbmdUYXAoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnBlbmRpbmdUYXApIHRoaXMuc2NoZWR1bGVyLmNsZWFyVGltZW91dCh0aGlzLnBlbmRpbmdUYXAudGltZXIpO1xuICAgICAgICB0aGlzLnBlbmRpbmdUYXAgPSBudWxsO1xuICAgIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIHsgRXhjYWxpZHJhd0JyaWRnZSwgQWN0aXZlVG9vbFNuYXBzaG90IH0gZnJvbSBcIi4uL2V4Y2FsaWRyYXcvRXhjYWxpZHJhd0JyaWRnZVwiO1xuaW1wb3J0IHR5cGUgeyBEZWJ1Z0xvZ2dlciB9IGZyb20gXCIuLi9kZWJ1Zy9EZWJ1Z0xvZ2dlclwiO1xuaW1wb3J0IHR5cGUgeyBTdHlsdXNDb250cm9sc1NldHRpbmdzIH0gZnJvbSBcIi4uL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBub3JtYWxpemVQb2ludGVyRXZlbnQgfSBmcm9tIFwiLi9ub3JtYWxpemVQb2ludGVyRXZlbnRcIjtcbmltcG9ydCB7IFN0eWx1c0dlc3R1cmVNYWNoaW5lIH0gZnJvbSBcIi4vU3R5bHVzR2VzdHVyZU1hY2hpbmVcIjtcbmltcG9ydCB0eXBlIHsgR2VzdHVyZUVmZmVjdCwgUG9pbnQsIFNjaGVkdWxlciB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCB0eXBlIEFjdGlvbkhhbmRsZXIgPSAoXG4gICAgYWN0aW9uOiBcIm1lbnVcIiB8IFwiY29weVwiIHwgXCJwYXN0ZVwiIHwgXCJub25lXCIsXG4gICAgcG9pbnQ6IFBvaW50LFxuICAgIGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZSxcbikgPT4gdm9pZDtcblxuZXhwb3J0IGNsYXNzIFN0eWx1c0NvbnRyb2xsZXIge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgbWFjaGluZTogU3R5bHVzR2VzdHVyZU1hY2hpbmU7XG4gICAgcHJpdmF0ZSBzYXZlZFRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgZGlzcG9zZWQgPSBmYWxzZTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxpc3RlbmVyczogQXJyYXk8W2tleW9mIEhUTUxFbGVtZW50RXZlbnRNYXAsIEV2ZW50TGlzdGVuZXJdPiA9IFtdO1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgbGVhZjogV29ya3NwYWNlTGVhZixcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBicmlkZ2U6IEV4Y2FsaWRyYXdCcmlkZ2UsXG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgc2V0dGluZ3M6ICgpID0+IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MsXG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgZGVidWc6IERlYnVnTG9nZ2VyLFxuICAgICAgICBwcml2YXRlIHJlYWRvbmx5IGRpc3BhdGNoQWN0aW9uOiBBY3Rpb25IYW5kbGVyLFxuICAgICAgICBzY2hlZHVsZXI6IFNjaGVkdWxlciA9IHdpbmRvdyxcbiAgICApIHtcbiAgICAgICAgdGhpcy5tYWNoaW5lID0gbmV3IFN0eWx1c0dlc3R1cmVNYWNoaW5lKHRoaXMuZ2VzdHVyZVNldHRpbmdzKCksIHNjaGVkdWxlcik7XG4gICAgICAgIHRoaXMubWFjaGluZS5zZXRFZmZlY3RTaW5rKChlZmZlY3QpID0+IHRoaXMuYXBwbHlFZmZlY3QoZWZmZWN0KSk7XG4gICAgfVxuXG4gICAgYXR0YWNoKCk6IHZvaWQge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWw7XG4gICAgICAgIGZvciAoY29uc3QgdHlwZSBvZiBbXG4gICAgICAgICAgICBcInBvaW50ZXJkb3duXCIsXG4gICAgICAgICAgICBcInBvaW50ZXJtb3ZlXCIsXG4gICAgICAgICAgICBcInBvaW50ZXJ1cFwiLFxuICAgICAgICAgICAgXCJwb2ludGVyY2FuY2VsXCIsXG4gICAgICAgICAgICBcImNvbnRleHRtZW51XCIsXG4gICAgICAgIF0gYXMgY29uc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RlbmVyOiBFdmVudExpc3RlbmVyID0gKHJhdykgPT4gdGhpcy5vblBvaW50ZXJFdmVudChyYXcgYXMgUG9pbnRlckV2ZW50KTtcbiAgICAgICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgdHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVycy5wdXNoKFt0eXBlLCBsaXN0ZW5lcl0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuZGlzcG9zZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5kaXNwb3NlZCA9IHRydWU7XG4gICAgICAgIGZvciAoY29uc3QgW3R5cGUsIGxpc3RlbmVyXSBvZiB0aGlzLmxpc3RlbmVycylcbiAgICAgICAgICAgIHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICAgICAgICB0aGlzLmxpc3RlbmVycy5sZW5ndGggPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiB0aGlzLm1hY2hpbmUuZGlzcG9zZSgpKSB0aGlzLmFwcGx5RWZmZWN0KGVmZmVjdCk7XG4gICAgfVxuICAgIGdldFRyYWNlKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmRlYnVnLmV4cG9ydFRyYWNlKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvblBvaW50ZXJFdmVudChyYXc6IFBvaW50ZXJFdmVudCk6IHZvaWQge1xuICAgICAgICBpZiAocmF3LnBvaW50ZXJUeXBlICE9PSBcInBlblwiKSByZXR1cm47XG4gICAgICAgIGNvbnN0IGV2ZW50ID0gbm9ybWFsaXplUG9pbnRlckV2ZW50KFxuICAgICAgICAgICAgcmF3LFxuICAgICAgICAgICAgdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWwuY29udGFpbnMocmF3LnRhcmdldCBhcyBOb2RlKSxcbiAgICAgICAgKTtcbiAgICAgICAgdGhpcy5kZWJ1Zy5ldmVudChldmVudCk7XG4gICAgICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIHRoaXMubWFjaGluZS5oYW5kbGUoZXZlbnQpKSB7XG4gICAgICAgICAgICBpZiAoZWZmZWN0LnR5cGUgPT09IFwic3VwcHJlc3MtY29udGV4dC1tZW51XCIpIHJhdy5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdGhpcy5hcHBseUVmZmVjdChlZmZlY3QpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhcHBseUVmZmVjdChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QpOiB2b2lkIHtcbiAgICAgICAgc3dpdGNoIChlZmZlY3QudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBcInRlbXBvcmFyeS10b29sLXN0YXJ0XCI6XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNhdmVkVG9vbCkgdGhpcy5zYXZlZFRvb2wgPSB0aGlzLmJyaWRnZS5zdGFydFRlbXBvcmFyeUVyYXNlcigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInRlbXBvcmFyeS10b29sLWVuZFwiOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNhdmVkVG9vbCkgdGhpcy5icmlkZ2UucmVzdG9yZVRvb2wodGhpcy5zYXZlZFRvb2wpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2F2ZWRUb29sID0gbnVsbDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJidXR0b24tdGFwXCI6XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEFjdGlvbih0aGlzLnNldHRpbmdzKCkuYnV0dG9uVGFwQWN0aW9uLCBlZmZlY3QucG9pbnQsIHRoaXMuYnJpZGdlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJidXR0b24tZG91YmxlLXRhcFwiOlxuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hBY3Rpb24oXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MoKS5idXR0b25Eb3VibGVUYXBBY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIGVmZmVjdC5wb2ludCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5icmlkZ2UsXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJidXR0b24taG9sZFwiOlxuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvbkhvbGRBY3Rpb24sIGVmZmVjdC5wb2ludCwgdGhpcy5icmlkZ2UpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZ2VzdHVyZVNldHRpbmdzKCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuc2V0dGluZ3MoKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlLmJ1dHRvbkNvbnRhY3RBY3Rpb24sXG4gICAgICAgICAgICBkb3VibGVUYXBNczogdmFsdWUuZG91YmxlVGFwTXMsXG4gICAgICAgICAgICBsb25nUHJlc3NNczogdmFsdWUubG9uZ1ByZXNzTXMsXG4gICAgICAgICAgICBtb3ZlbWVudFRocmVzaG9sZFB4OiB2YWx1ZS5tb3ZlbWVudFRocmVzaG9sZFB4LFxuICAgICAgICB9IGFzIGNvbnN0O1xuICAgIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IEFwcCwgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgRXhjYWxpZHJhd0JyaWRnZSB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB7IERlYnVnTG9nZ2VyIH0gZnJvbSBcIi4uL2RlYnVnL0RlYnVnTG9nZ2VyXCI7XG5pbXBvcnQgdHlwZSB7IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgfSBmcm9tIFwiLi4vc2V0dGluZ3Mvc2V0dGluZ3NcIjtcbmltcG9ydCB7IFN0eWx1c0NvbnRyb2xsZXIsIHR5cGUgQWN0aW9uSGFuZGxlciB9IGZyb20gXCIuL1N0eWx1c0NvbnRyb2xsZXJcIjtcblxuZXhwb3J0IGNsYXNzIFN0eWx1c1ZpZXdSZWdpc3RyeSB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250cm9sbGVycyA9IG5ldyBNYXA8V29ya3NwYWNlTGVhZiwgU3R5bHVzQ29udHJvbGxlcj4oKTtcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBhcHA6IEFwcCxcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogKCkgPT4gU3R5bHVzQ29udHJvbHNTZXR0aW5ncyxcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBhY3Rpb25IYW5kbGVyOiBBY3Rpb25IYW5kbGVyLFxuICAgICkge31cblxuICAgIHN5bmMoKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGxlYXZlcyA9IG5ldyBTZXQodGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShcImV4Y2FsaWRyYXdcIikpO1xuICAgICAgICBmb3IgKGNvbnN0IGxlYWYgb2YgbGVhdmVzKVxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbnRyb2xsZXJzLmhhcyhsZWFmKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlYnVnID0gbmV3IERlYnVnTG9nZ2VyKCgpID0+IHRoaXMuc2V0dGluZ3MoKS5kZWJ1Z01vZGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgU3R5bHVzQ29udHJvbGxlcihcbiAgICAgICAgICAgICAgICAgICAgbGVhZixcbiAgICAgICAgICAgICAgICAgICAgbmV3IEV4Y2FsaWRyYXdCcmlkZ2UodGhpcy5hcHAsIGxlYWYpLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLFxuICAgICAgICAgICAgICAgICAgICBkZWJ1ZyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hY3Rpb25IYW5kbGVyLFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgY29udHJvbGxlci5hdHRhY2goKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRyb2xsZXJzLnNldChsZWFmLCBjb250cm9sbGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBbbGVhZiwgY29udHJvbGxlcl0gb2YgdGhpcy5jb250cm9sbGVycylcbiAgICAgICAgICAgIGlmICghbGVhdmVzLmhhcyhsZWFmKSkge1xuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXIuZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29udHJvbGxlcnMuZGVsZXRlKGxlYWYpO1xuICAgICAgICAgICAgfVxuICAgIH1cbiAgICBkaXNwb3NlKCk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGNvbnRyb2xsZXIgb2YgdGhpcy5jb250cm9sbGVycy52YWx1ZXMoKSkgY29udHJvbGxlci5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMuY29udHJvbGxlcnMuY2xlYXIoKTtcbiAgICB9XG4gICAgcmVmcmVzaCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMuc3luYygpO1xuICAgIH1cbiAgICBleHBvcnRUcmFjZXMoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KFxuICAgICAgICAgICAgWy4uLnRoaXMuY29udHJvbGxlcnMuZW50cmllcygpXS5tYXAoKFtsZWFmLCBjb250cm9sbGVyXSkgPT4gKHtcbiAgICAgICAgICAgICAgICBsZWFmOiBsZWFmLmdldERpc3BsYXlUZXh0KCksXG4gICAgICAgICAgICAgICAgZXZlbnRzOiBKU09OLnBhcnNlKGNvbnRyb2xsZXIuZ2V0VHJhY2UoKSksXG4gICAgICAgICAgICB9KSksXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgMixcbiAgICAgICAgKTtcbiAgICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUFBQSxtQkFBK0I7OztBQ0d4QixJQUFNLGFBQU4sTUFBaUI7QUFBQSxFQUNaLFVBQThCO0FBQUEsRUFDdEMsS0FBSyxPQUFjLFFBQWdDO0FBQy9DLFNBQUssTUFBTTtBQUNYLFVBQU0sT0FBTyxTQUFTLEtBQUssVUFBVSxFQUFFLEtBQUsseUJBQXlCLENBQUM7QUFDdEUsVUFBTUMsV0FBdUM7QUFBQSxNQUN6QyxDQUFDLGFBQWEsTUFBTSxPQUFPLFFBQVEsV0FBVyxDQUFDO0FBQUEsTUFDL0MsQ0FBQyxhQUFhLE1BQU0sT0FBTyxRQUFRLFVBQVUsQ0FBQztBQUFBLE1BQzlDLENBQUMsVUFBVSxNQUFNLE9BQU8sUUFBUSxRQUFRLENBQUM7QUFBQSxNQUN6QyxDQUFDLGFBQWEsTUFBTSxPQUFPLFFBQVEsV0FBVyxDQUFDO0FBQUEsTUFDL0MsQ0FBQyxTQUFTLE1BQU0sT0FBTyxRQUFR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
