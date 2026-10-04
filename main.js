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
        this.dispatchAction(this.settings().buttonDoubleTapAction, effect.point, this.bridge);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL21lbnUvU3R5bHVzTWVudS50cyIsICJzcmMvc2V0dGluZ3MvU2V0dGluZ3NUYWIudHMiLCAic3JjL3NldHRpbmdzL3NldHRpbmdzLnRzIiwgInNyYy9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2UudHMiLCAic3JjL2RlYnVnL0RlYnVnTG9nZ2VyLnRzIiwgInNyYy9zdHlsdXMvbm9ybWFsaXplUG9pbnRlckV2ZW50LnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzR2VzdHVyZU1hY2hpbmUudHMiLCAic3JjL3N0eWx1cy9TdHlsdXNDb250cm9sbGVyLnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzVmlld1JlZ2lzdHJ5LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBOb3RpY2UsIFBsdWdpbiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgU3R5bHVzTWVudSB9IGZyb20gXCIuL21lbnUvU3R5bHVzTWVudVwiO1xuaW1wb3J0IHsgU2V0dGluZ3NUYWIgfSBmcm9tIFwiLi9zZXR0aW5ncy9TZXR0aW5nc1RhYlwiO1xuaW1wb3J0IHtcbiAgREVGQVVMVF9TRVRUSU5HUyxcbiAgbm9ybWFsaXplU2V0dGluZ3MsXG4gIHR5cGUgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyxcbn0gZnJvbSBcIi4vc2V0dGluZ3Mvc2V0dGluZ3NcIjtcbmltcG9ydCB7IFN0eWx1c1ZpZXdSZWdpc3RyeSB9IGZyb20gXCIuL3N0eWx1cy9TdHlsdXNWaWV3UmVnaXN0cnlcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3R5bHVzQ29udHJvbHNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogU3R5bHVzQ29udHJvbHNTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XG4gIHByaXZhdGUgcmVnaXN0cnk6IFN0eWx1c1ZpZXdSZWdpc3RyeSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHJlYWRvbmx5IG1lbnUgPSBuZXcgU3R5bHVzTWVudSgpO1xuXG4gIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnNldHRpbmdzID0gbm9ybWFsaXplU2V0dGluZ3MoKGF3YWl0IHRoaXMubG9hZERhdGEoKSkgPz8ge30pO1xuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgU2V0dGluZ3NUYWIodGhpcykpO1xuICAgIHRoaXMucmVnaXN0cnkgPSBuZXcgU3R5bHVzVmlld1JlZ2lzdHJ5KFxuICAgICAgdGhpcy5hcHAsXG4gICAgICAoKSA9PiB0aGlzLnNldHRpbmdzLFxuICAgICAgKGFjdGlvbiwgcG9pbnQsIGJyaWRnZSkgPT4ge1xuICAgICAgICBpZiAoYWN0aW9uID09PSBcIm1lbnVcIikgdGhpcy5tZW51Lm9wZW4ocG9pbnQsIGJyaWRnZSk7XG4gICAgICAgIGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJjb3B5XCIpIGJyaWRnZS5jb3B5U2VsZWN0ZWRFbGVtZW50cygpO1xuICAgICAgICBlbHNlIGlmIChhY3Rpb24gPT09IFwicGFzdGVcIikgYnJpZGdlLnBhc3RlQXQocG9pbnQpO1xuICAgICAgfVxuICAgICk7XG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbihcImxheW91dC1jaGFuZ2VcIiwgKCkgPT4gdGhpcy5yZWdpc3RyeT8uc3luYygpKSk7XG4gICAgdGhpcy5hcHAud29ya3NwYWNlLm9uTGF5b3V0UmVhZHkoKCkgPT4gdGhpcy5yZWdpc3RyeT8uc3luYygpKTtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwiY29weS1zdHlsdXMtZXZlbnQtdHJhY2VcIixcbiAgICAgIG5hbWU6IFwiQ29weSBsYXRlc3Qgc3R5bHVzIGV2ZW50IHRyYWNlXCIsXG4gICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgICBjb25zdCB0cmFjZSA9IHRoaXMucmVnaXN0cnk/LmV4cG9ydFRyYWNlcygpID8/IFwiW11cIjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCh0cmFjZSk7XG4gICAgICAgICAgbmV3IE5vdGljZShcIlN0eWx1cyBldmVudCB0cmFjZSBjb3BpZWQuXCIpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICBuZXcgTm90aWNlKFwiVW5hYmxlIHRvIGNvcHkgZXZlbnQgdHJhY2UuIENoZWNrIHRoZSBkZXZlbG9wZXIgY29uc29sZS5cIik7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cbiAgb251bmxvYWQoKTogdm9pZCB7XG4gICAgdGhpcy5tZW51LmNsb3NlKCk7XG4gICAgdGhpcy5yZWdpc3RyeT8uZGlzcG9zZSgpO1xuICAgIHRoaXMucmVnaXN0cnkgPSBudWxsO1xuICB9XG4gIGFzeW5jIHVwZGF0ZVNldHRpbmdzKHBhdGNoOiBQYXJ0aWFsPFN0eWx1c0NvbnRyb2xzU2V0dGluZ3M+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IG5vcm1hbGl6ZVNldHRpbmdzKHsgLi4udGhpcy5zZXR0aW5ncywgLi4ucGF0Y2ggfSk7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgICB0aGlzLnJlZ2lzdHJ5Py5yZWZyZXNoKCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IEV4Y2FsaWRyYXdCcmlkZ2UgfSBmcm9tIFwiLi4vZXhjYWxpZHJhdy9FeGNhbGlkcmF3QnJpZGdlXCI7XG5pbXBvcnQgdHlwZSB7IFBvaW50IH0gZnJvbSBcIi4uL3N0eWx1cy90eXBlc1wiO1xuXG5leHBvcnQgY2xhc3MgU3R5bHVzTWVudSB7XG4gIHByaXZhdGUgZWxlbWVudDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgb3Blbihwb2ludDogUG9pbnQsIGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZSk6IHZvaWQge1xuICAgIHRoaXMuY2xvc2UoKTtcbiAgICBjb25zdCBtZW51ID0gZG9jdW1lbnQuYm9keS5jcmVhdGVEaXYoeyBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtbWVudVwiIH0pO1xuICAgIGNvbnN0IGFjdGlvbnM6IEFycmF5PFtzdHJpbmcsICgpID0+IHZvaWRdPiA9IFtcbiAgICAgIFtcIlNlbGVjdGlvblwiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcInNlbGVjdGlvblwiKV0sXG4gICAgICBbXCJGcmVlIGRyYXdcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJmcmVlZHJhd1wiKV0sXG4gICAgICBbXCJFcmFzZXJcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJlcmFzZXJcIildLFxuICAgICAgW1wiUmVjdGFuZ2xlXCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwicmVjdGFuZ2xlXCIpXSxcbiAgICAgIFtcIkFycm93XCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiYXJyb3dcIildLFxuICAgICAgW1wiQ29weVwiLCAoKSA9PiBicmlkZ2UuY29weVNlbGVjdGVkRWxlbWVudHMoKV0sXG4gICAgICBbXCJQYXN0ZVwiLCAoKSA9PiBicmlkZ2UucGFzdGVBdChwb2ludCldLFxuICAgIF07XG4gICAgZm9yIChjb25zdCBbbmFtZSwgY2FsbGJhY2tdIG9mIGFjdGlvbnMpIHtcbiAgICAgIGNvbnN0IGJ1dHRvbiA9IG1lbnUuY3JlYXRlRWwoXCJidXR0b25cIiwge1xuICAgICAgICB0ZXh0OiBuYW1lLFxuICAgICAgICBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtbWVudV9faXRlbVwiLFxuICAgICAgfSk7XG4gICAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJ1cFwiLCAoZXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCBsZWZ0ID0gTWF0aC5taW4oTWF0aC5tYXgoOCwgcG9pbnQueCksIHdpbmRvdy5pbm5lcldpZHRoIC0gMTgwKTtcbiAgICBjb25zdCB0b3AgPSBNYXRoLm1pbihNYXRoLm1heCg4LCBwb2ludC55KSwgd2luZG93LmlubmVySGVpZ2h0IC0gMzAwKTtcbiAgICBtZW51LnNldENzc1Byb3BzKHsgbGVmdDogYCR7bGVmdH1weGAsIHRvcDogYCR7dG9wfXB4YCB9KTtcbiAgICB0aGlzLmVsZW1lbnQgPSBtZW51O1xuICAgIHdpbmRvdy5zZXRUaW1lb3V0KFxuICAgICAgKCkgPT5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIHRoaXMuY2xvc2UsIHtcbiAgICAgICAgICBvbmNlOiB0cnVlLFxuICAgICAgICAgIGNhcHR1cmU6IHRydWUsXG4gICAgICAgIH0pLFxuICAgICAgMFxuICAgICk7XG4gIH1cbiAgY2xvc2UgPSAoKTogdm9pZCA9PiB7XG4gICAgdGhpcy5lbGVtZW50Py5yZW1vdmUoKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xuICB9O1xufVxuIiwgImltcG9ydCB7IFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIFN0eWx1c0NvbnRyb2xzUGx1Z2luIGZyb20gXCIuLi9tYWluXCI7XG5pbXBvcnQgdHlwZSB7IFN0eWx1c0FjdGlvbiB9IGZyb20gXCIuL3NldHRpbmdzXCI7XG5cbmNvbnN0IGFjdGlvbnM6IFJlY29yZDxTdHlsdXNBY3Rpb24sIHN0cmluZz4gPSB7XG4gIG1lbnU6IFwiT3BlbiBtZW51XCIsXG4gIGNvcHk6IFwiQ29weVwiLFxuICBwYXN0ZTogXCJQYXN0ZVwiLFxuICBub25lOiBcIkRvIG5vdGhpbmdcIixcbn07XG5cbmV4cG9ydCBjbGFzcyBTZXR0aW5nc1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogU3R5bHVzQ29udHJvbHNQbHVnaW4pIHtcbiAgICBzdXBlcihwbHVnaW4uYXBwLCBwbHVnaW4pO1xuICB9XG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlJlcXVpcmVzIHRoZSBFeGNhbGlkcmF3IGNvbW11bml0eSBwbHVnaW4uIENvcHkvcGFzdGUgdXNlcyBhIHByaXZhdGUgaW4tbWVtb3J5IGNsaXBib2FyZCBpbiB2ZXJzaW9uIDAuMS5cIixcbiAgICB9KTtcbiAgICB0aGlzLmFjdGlvbihcIlRhcFwiLCBcImJ1dHRvblRhcEFjdGlvblwiKTtcbiAgICB0aGlzLmFjdGlvbihcIkRvdWJsZSB0YXBcIiwgXCJidXR0b25Eb3VibGVUYXBBY3Rpb25cIik7XG4gICAgdGhpcy5hY3Rpb24oXCJIb2xkXCIsIFwiYnV0dG9uSG9sZEFjdGlvblwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQnV0dG9uICsgcGVuIGNvbnRhY3RcIilcbiAgICAgIC5zZXREZXNjKFwiVGVtcG9yYXJ5IHRvb2wgd2hpbGUgdGhlIHNpZGUgYnV0dG9uIGlzIGhlbGQgZHVyaW5nIHBlbiBjb250YWN0LlwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT5cbiAgICAgICAgZHJvcGRvd25cbiAgICAgICAgICAuYWRkT3B0aW9uKFwiZXJhc2VyXCIsIFwiVGVtcG9yYXJ5IGVyYXNlclwiKVxuICAgICAgICAgIC5hZGRPcHRpb24oXCJub25lXCIsIFwiRG8gbm90aGluZ1wiKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5idXR0b25Db250YWN0QWN0aW9uKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7XG4gICAgICAgICAgICAgIGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlIGFzIFwiZXJhc2VyXCIgfCBcIm5vbmVcIixcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKVxuICAgICAgKTtcbiAgICB0aGlzLm51bWJlcihcIkRvdWJsZS10YXAgaW50ZXJ2YWwgKG1zKVwiLCBcImRvdWJsZVRhcE1zXCIpO1xuICAgIHRoaXMubnVtYmVyKFwiTG9uZy1wcmVzcyBkZWxheSAobXMpXCIsIFwibG9uZ1ByZXNzTXNcIik7XG4gICAgdGhpcy5udW1iZXIoXCJNb3ZlbWVudCB0aHJlc2hvbGQgKHB4KVwiLCBcIm1vdmVtZW50VGhyZXNob2xkUHhcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlYnVnIGxvZ2dpbmdcIilcbiAgICAgIC5zZXREZXNjKFwiTG9ncyBib3VuZGVkIHJhdyBwZW4gZXZlbnQgdHJhY2VzIHRvIHRoZSBkZXZlbG9wZXIgY29uc29sZS5cIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cbiAgICAgICAgdG9nZ2xlXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlYnVnTW9kZSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IGRlYnVnTW9kZTogdmFsdWUgfSkpXG4gICAgICApO1xuICB9XG4gIHByaXZhdGUgYWN0aW9uKFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBrZXk6IFwiYnV0dG9uVGFwQWN0aW9uXCIgfCBcImJ1dHRvbkRvdWJsZVRhcEFjdGlvblwiIHwgXCJidXR0b25Ib2xkQWN0aW9uXCJcbiAgKTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbCkuc2V0TmFtZShgUyBQZW4gc2lkZSBidXR0b246ICR7bmFtZX1gKS5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgIGZvciAoY29uc3QgW3ZhbHVlLCBsYWJlbF0gb2YgT2JqZWN0LmVudHJpZXMoYWN0aW9ucykpIGRyb3Bkb3duLmFkZE9wdGlvbih2YWx1ZSwgbGFiZWwpO1xuICAgICAgZHJvcGRvd25cbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzW2tleV0pXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgW2tleV06IHZhbHVlIGFzIFN0eWx1c0FjdGlvbiB9KSk7XG4gICAgfSk7XG4gIH1cbiAgcHJpdmF0ZSBudW1iZXIobmFtZTogc3RyaW5nLCBrZXk6IFwiZG91YmxlVGFwTXNcIiB8IFwibG9uZ1ByZXNzTXNcIiB8IFwibW92ZW1lbnRUaHJlc2hvbGRQeFwiKTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKG5hbWUpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgICAgdGV4dFxuICAgICAgICAgIC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3Nba2V5XSkpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4gdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBba2V5XTogTnVtYmVyKHZhbHVlKSB9KSlcbiAgICAgICk7XG4gIH1cbn1cbiIsICJleHBvcnQgdHlwZSBTdHlsdXNBY3Rpb24gPSBcIm1lbnVcIiB8IFwiY29weVwiIHwgXCJwYXN0ZVwiIHwgXCJub25lXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB7XG4gIGJ1dHRvblRhcEFjdGlvbjogU3R5bHVzQWN0aW9uO1xuICBidXR0b25Eb3VibGVUYXBBY3Rpb246IFN0eWx1c0FjdGlvbjtcbiAgYnV0dG9uSG9sZEFjdGlvbjogU3R5bHVzQWN0aW9uO1xuICBidXR0b25Db250YWN0QWN0aW9uOiBcImVyYXNlclwiIHwgXCJub25lXCI7XG4gIGRvdWJsZVRhcE1zOiBudW1iZXI7XG4gIGxvbmdQcmVzc01zOiBudW1iZXI7XG4gIG1vdmVtZW50VGhyZXNob2xkUHg6IG51bWJlcjtcbiAgY2xlYW51cFN0cmF5RG90OiBib29sZWFuO1xuICBkZWJ1Z01vZGU6IGJvb2xlYW47XG4gIGRlYnVnT3ZlcmxheTogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgPSB7XG4gIGJ1dHRvblRhcEFjdGlvbjogXCJtZW51XCIsXG4gIGJ1dHRvbkRvdWJsZVRhcEFjdGlvbjogXCJjb3B5XCIsXG4gIGJ1dHRvbkhvbGRBY3Rpb246IFwicGFzdGVcIixcbiAgYnV0dG9uQ29udGFjdEFjdGlvbjogXCJlcmFzZXJcIixcbiAgZG91YmxlVGFwTXM6IDMwMCxcbiAgbG9uZ1ByZXNzTXM6IDQ1MCxcbiAgbW92ZW1lbnRUaHJlc2hvbGRQeDogOCxcbiAgY2xlYW51cFN0cmF5RG90OiB0cnVlLFxuICBkZWJ1Z01vZGU6IGZhbHNlLFxuICBkZWJ1Z092ZXJsYXk6IGZhbHNlLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVNldHRpbmdzKHZhbHVlOiBQYXJ0aWFsPFN0eWx1c0NvbnRyb2xzU2V0dGluZ3M+KTogU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB7XG4gIGNvbnN0IGFjdGlvbiA9IChjYW5kaWRhdGU6IHVua25vd24sIGZhbGxiYWNrOiBTdHlsdXNBY3Rpb24pOiBTdHlsdXNBY3Rpb24gPT5cbiAgICBjYW5kaWRhdGUgPT09IFwibWVudVwiIHx8IGNhbmRpZGF0ZSA9PT0gXCJjb3B5XCIgfHwgY2FuZGlkYXRlID09PSBcInBhc3RlXCIgfHwgY2FuZGlkYXRlID09PSBcIm5vbmVcIlxuICAgICAgPyBjYW5kaWRhdGVcbiAgICAgIDogZmFsbGJhY2s7XG4gIGNvbnN0IG51bWJlciA9IChjYW5kaWRhdGU6IHVua25vd24sIGZhbGxiYWNrOiBudW1iZXIsIG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcik6IG51bWJlciA9PlxuICAgIHR5cGVvZiBjYW5kaWRhdGUgPT09IFwibnVtYmVyXCIgJiYgTnVtYmVyLmlzRmluaXRlKGNhbmRpZGF0ZSlcbiAgICAgID8gTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIE1hdGgucm91bmQoY2FuZGlkYXRlKSkpXG4gICAgICA6IGZhbGxiYWNrO1xuICByZXR1cm4ge1xuICAgIGJ1dHRvblRhcEFjdGlvbjogYWN0aW9uKHZhbHVlLmJ1dHRvblRhcEFjdGlvbiwgREVGQVVMVF9TRVRUSU5HUy5idXR0b25UYXBBY3Rpb24pLFxuICAgIGJ1dHRvbkRvdWJsZVRhcEFjdGlvbjogYWN0aW9uKFxuICAgICAgdmFsdWUuYnV0dG9uRG91YmxlVGFwQWN0aW9uLFxuICAgICAgREVGQVVMVF9TRVRUSU5HUy5idXR0b25Eb3VibGVUYXBBY3Rpb25cbiAgICApLFxuICAgIGJ1dHRvbkhvbGRBY3Rpb246IGFjdGlvbih2YWx1ZS5idXR0b25Ib2xkQWN0aW9uLCBERUZBVUxUX1NFVFRJTkdTLmJ1dHRvbkhvbGRBY3Rpb24pLFxuICAgIGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlLmJ1dHRvbkNvbnRhY3RBY3Rpb24gPT09IFwibm9uZVwiID8gXCJub25lXCIgOiBcImVyYXNlclwiLFxuICAgIGRvdWJsZVRhcE1zOiBudW1iZXIodmFsdWUuZG91YmxlVGFwTXMsIDMwMCwgMTAwLCAxMDAwKSxcbiAgICBsb25nUHJlc3NNczogbnVtYmVyKHZhbHVlLmxvbmdQcmVzc01zLCA0NTAsIDE1MCwgMjAwMCksXG4gICAgbW92ZW1lbnRUaHJlc2hvbGRQeDogbnVtYmVyKHZhbHVlLm1vdmVtZW50VGhyZXNob2xkUHgsIDgsIDEsIDEwMCksXG4gICAgY2xlYW51cFN0cmF5RG90OiB2YWx1ZS5jbGVhbnVwU3RyYXlEb3QgIT09IGZhbHNlLFxuICAgIGRlYnVnTW9kZTogdmFsdWUuZGVidWdNb2RlID09PSB0cnVlLFxuICAgIGRlYnVnT3ZlcmxheTogdmFsdWUuZGVidWdPdmVybGF5ID09PSB0cnVlLFxuICB9O1xufVxuIiwgImltcG9ydCB7IE5vdGljZSwgdHlwZSBBcHAsIHR5cGUgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgeyBQb2ludCB9IGZyb20gXCIuLi9zdHlsdXMvdHlwZXNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBBY3RpdmVUb29sU25hcHNob3Qge1xuICB0eXBlOiBzdHJpbmc7XG4gIFtrZXk6IHN0cmluZ106IHVua25vd247XG59XG50eXBlIEltcGVyYXRpdmVBcGkgPSB7XG4gIGdldEFwcFN0YXRlPzogKCkgPT4geyBhY3RpdmVUb29sPzogQWN0aXZlVG9vbFNuYXBzaG90IH07XG4gIHNldEFjdGl2ZVRvb2w/OiAodG9vbDogQWN0aXZlVG9vbFNuYXBzaG90KSA9PiB2b2lkO1xufTtcblxuLyoqIENvbXBhdGliaWxpdHkgYm91bmRhcnkgZm9yIHRoZSBvcHRpb25hbCBFeGNhbGlkcmF3IHBsdWdpbi4gKi9cbmV4cG9ydCBjbGFzcyBFeGNhbGlkcmF3QnJpZGdlIHtcbiAgcHJpdmF0ZSB3YXJuZWQgPSBmYWxzZTtcbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxlYWY6IFdvcmtzcGFjZUxlYWZcbiAgKSB7fVxuXG4gIHN0YXJ0VGVtcG9yYXJ5RXJhc2VyKCk6IEFjdGl2ZVRvb2xTbmFwc2hvdCB8IG51bGwge1xuICAgIGNvbnN0IGFwaSA9IHRoaXMuZ2V0QXBpKCk7XG4gICAgY29uc3QgdG9vbCA9IGFwaT8uZ2V0QXBwU3RhdGU/LigpLmFjdGl2ZVRvb2w7XG4gICAgaWYgKCFhcGk/LnNldEFjdGl2ZVRvb2wgfHwgIXRvb2wpIHJldHVybiBudWxsO1xuICAgIGFwaS5zZXRBY3RpdmVUb29sKHsgdHlwZTogXCJlcmFzZXJcIiB9KTtcbiAgICByZXR1cm4geyAuLi50b29sIH07XG4gIH1cbiAgcmVzdG9yZVRvb2wodG9vbDogQWN0aXZlVG9vbFNuYXBzaG90KTogYm9vbGVhbiB7XG4gICAgY29uc3QgYXBpID0gdGhpcy5nZXRBcGkoKTtcbiAgICBpZiAoIWFwaT8uc2V0QWN0aXZlVG9vbCkgcmV0dXJuIGZhbHNlO1xuICAgIGFwaS5zZXRBY3RpdmVUb29sKHRvb2wpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHNldFRvb2wodHlwZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgYXBpID0gdGhpcy5nZXRBcGkoKTtcbiAgICBpZiAoIWFwaT8uc2V0QWN0aXZlVG9vbCkgcmV0dXJuIGZhbHNlO1xuICAgIGFwaS5zZXRBY3RpdmVUb29sKHsgdHlwZSB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBjb3B5U2VsZWN0ZWRFbGVtZW50cygpOiB2b2lkIHtcbiAgICB0aGlzLnVuc3VwcG9ydGVkKFwiQ29weSByZXF1aXJlcyBhIGNvbXBhdGlibGUgRXhjYWxpZHJhdyBBUEkuXCIpO1xuICB9XG4gIHBhc3RlQXQocG9pbnQ6IFBvaW50KTogdm9pZCB7XG4gICAgdm9pZCBwb2ludDtcbiAgICB0aGlzLnVuc3VwcG9ydGVkKFwiUGFzdGUgcmVxdWlyZXMgYSBjb21wYXRpYmxlIEV4Y2FsaWRyYXcgQVBJLlwiKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0QXBpKCk6IEltcGVyYXRpdmVBcGkgfCBudWxsIHtcbiAgICAvLyBFeGNhbGlkcmF3IGV4cG9zZXMgbm8gc3RhYmxlIENvbW11bml0eSBQbHVnaW4gQVBJIGZvciB0aGlzIHBhdGguIEtlZXAgdGhpc1xuICAgIC8vIG9wdGlvbmFsIGNhcGFiaWxpdHkgcHJvYmUgaXNvbGF0ZWQgdW50aWwgYSBkb2N1bWVudGVkIGxlYWYtYXdhcmUgQVBJIGV4aXN0cy5cbiAgICBjb25zdCB2aWV3ID0gdGhpcy5sZWFmLnZpZXcgYXMgdW5rbm93biBhcyB7XG4gICAgICBleGNhbGlkcmF3QVBJPzogSW1wZXJhdGl2ZUFwaTtcbiAgICB9O1xuICAgIHJldHVybiB2aWV3LmV4Y2FsaWRyYXdBUEkgPz8gbnVsbDtcbiAgfVxuICBwcml2YXRlIHVuc3VwcG9ydGVkKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy53YXJuZWQpIHtcbiAgICAgIG5ldyBOb3RpY2UoYEV4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzOiAke21lc3NhZ2V9YCk7XG4gICAgICB0aGlzLndhcm5lZCA9IHRydWU7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBEZWJ1Z0xvZ2dlciB7XG4gIHByaXZhdGUgdHJhY2U6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudFtdID0gW107XG4gIHByaXZhdGUgbGFzdE1vdmVMb2dBdCA9IC1JbmZpbml0eTtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBlbmFibGVkOiAoKSA9PiBib29sZWFuKSB7fVxuXG4gIGV2ZW50KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCgpKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwibW92ZVwiICYmIGV2ZW50LnRpbWVzdGFtcCAtIHRoaXMubGFzdE1vdmVMb2dBdCA8IDEwMCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5raW5kID09PSBcIm1vdmVcIikgdGhpcy5sYXN0TW92ZUxvZ0F0ID0gZXZlbnQudGltZXN0YW1wO1xuICAgIHRoaXMudHJhY2UucHVzaChldmVudCk7XG4gICAgaWYgKHRoaXMudHJhY2UubGVuZ3RoID4gMTAwKSB0aGlzLnRyYWNlLnNoaWZ0KCk7XG4gICAgY29uc29sZS5kZWJ1ZyhcIltFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9sc11cIiwgZXZlbnQpO1xuICB9XG4gIG1lc3NhZ2UobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZW5hYmxlZCgpKSBjb25zb2xlLmRlYnVnKFwiW0V4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzXVwiLCBtZXNzYWdlKTtcbiAgfVxuICBleHBvcnRUcmFjZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLnRyYWNlLCBudWxsLCAyKTtcbiAgfVxuICBjbGVhcigpOiB2b2lkIHtcbiAgICB0aGlzLnRyYWNlID0gW107XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgU3R5bHVzRXZlbnRLaW5kIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuY29uc3QgZXZlbnRLaW5kczogUmVjb3JkPHN0cmluZywgU3R5bHVzRXZlbnRLaW5kPiA9IHtcbiAgcG9pbnRlcmRvd246IFwiZG93blwiLFxuICBwb2ludGVybW92ZTogXCJtb3ZlXCIsXG4gIHBvaW50ZXJ1cDogXCJ1cFwiLFxuICBwb2ludGVyY2FuY2VsOiBcImNhbmNlbFwiLFxuICBjb250ZXh0bWVudTogXCJjb250ZXh0bWVudVwiLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVBvaW50ZXJFdmVudChcbiAgZXZlbnQ6IFBvaW50ZXJFdmVudCxcbiAgaXNDYW52YXNUYXJnZXQ6IGJvb2xlYW5cbik6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCB7XG4gIHJldHVybiB7XG4gICAga2luZDogZXZlbnRLaW5kc1tldmVudC50eXBlXSA/PyBcIm1vdmVcIixcbiAgICBwb2ludGVyVHlwZTogZXZlbnQucG9pbnRlclR5cGUsXG4gICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgYnV0dG9uczogZXZlbnQuYnV0dG9ucyxcbiAgICBidXR0b246IGV2ZW50LmJ1dHRvbixcbiAgICBwcmVzc3VyZTogZXZlbnQucHJlc3N1cmUsXG4gICAgeDogZXZlbnQuY2xpZW50WCxcbiAgICB5OiBldmVudC5jbGllbnRZLFxuICAgIHRpbWVzdGFtcDogZXZlbnQudGltZVN0YW1wLFxuICAgIGlzQ2FudmFzVGFyZ2V0LFxuICB9O1xufVxuIiwgImltcG9ydCB0eXBlIHtcbiAgR2VzdHVyZUVmZmVjdCxcbiAgR2VzdHVyZVNldHRpbmdzLFxuICBOb3JtYWxpemVkU3R5bHVzRXZlbnQsXG4gIFBvaW50LFxuICBTY2hlZHVsZXIsXG59IGZyb20gXCIuL3R5cGVzXCI7XG5cbmludGVyZmFjZSBQZW5kaW5nVGFwIHtcbiAgcG9pbnQ6IFBvaW50O1xuICB0aW1lcjogdW5rbm93bjtcbn1cblxuLyoqIFB1cmUgcGVyLXZpZXcgUyBQZW4gZ2VzdHVyZSBwb2xpY3kuIEl0IG5ldmVyIHRvdWNoZXMgdGhlIERPTSBvciBFeGNhbGlkcmF3LiAqL1xuZXhwb3J0IGNsYXNzIFN0eWx1c0dlc3R1cmVNYWNoaW5lIHtcbiAgcHJpdmF0ZSBiYXJyZWxCdXR0b25IZWxkID0gZmFsc2U7XG4gIHByaXZhdGUgcGVuQ29udGFjdCA9IGZhbHNlO1xuICBwcml2YXRlIGNvbnN1bWVkID0gZmFsc2U7XG4gIHByaXZhdGUgbW92ZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBob2xkRmlyZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSB0ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gIHByaXZhdGUgcHJlc3NPcmlnaW46IFBvaW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaG9sZFRpbWVyOiB1bmtub3duIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGVuZGluZ1RhcDogUGVuZGluZ1RhcCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGFjdGl2ZVBvaW50ZXJJZDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogR2VzdHVyZVNldHRpbmdzLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2NoZWR1bGVyOiBTY2hlZHVsZXJcbiAgKSB7fVxuXG4gIGhhbmRsZShldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50KTogR2VzdHVyZUVmZmVjdFtdIHtcbiAgICBpZiAoZXZlbnQucG9pbnRlclR5cGUgIT09IFwicGVuXCIpIHJldHVybiBbXTtcbiAgICBjb25zdCBlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10gPSBbXTtcbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJjb250ZXh0bWVudVwiKSB7XG4gICAgICBpZiAodGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlIHx8ICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgdGhpcy5wZW5Db250YWN0KSlcbiAgICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJzdXBwcmVzcy1jb250ZXh0LW1lbnVcIiB9KTtcbiAgICAgIHJldHVybiBlZmZlY3RzO1xuICAgIH1cblxuICAgIGlmIChldmVudC5raW5kID09PSBcImRvd25cIikge1xuICAgICAgdGhpcy5wZW5Db250YWN0ID0gdHJ1ZTtcbiAgICAgIHRoaXMuYWN0aXZlUG9pbnRlcklkID0gZXZlbnQucG9pbnRlcklkO1xuICAgICAgaWYgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCkgdGhpcy5jb25zdW1lRm9yQ29udGFjdChldmVudCwgZWZmZWN0cyk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJ1cFwiIHx8IGV2ZW50LmtpbmQgPT09IFwiY2FuY2VsXCIpIHtcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXJJZCAhPT0gbnVsbCAmJiBldmVudC5wb2ludGVySWQgIT09IHRoaXMuYWN0aXZlUG9pbnRlcklkKSByZXR1cm4gZWZmZWN0cztcbiAgICAgIHRoaXMucGVuQ29udGFjdCA9IGZhbHNlO1xuICAgICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBudWxsO1xuICAgICAgaWYgKHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkge1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJ0ZW1wb3JhcnktdG9vbC1lbmRcIiB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChldmVudC5raW5kID09PSBcImNhbmNlbFwiKSB0aGlzLmNhbmNlbFByZXNzKCk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICAvLyBIb3ZlciBtb3ZlbWVudCBpcyB0aGUgb25seSBldmlkZW5jZSB1c2VkIHRvIGludGVycHJldCBidXR0b25zIGFzIGJhcnJlbCBzdGF0ZS5cbiAgICBpZiAodGhpcy5wZW5Db250YWN0KSByZXR1cm4gZWZmZWN0cztcbiAgICBjb25zdCBoZWxkTm93ID0gKGV2ZW50LmJ1dHRvbnMgJiAxKSAhPT0gMDtcbiAgICBpZiAoIXRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiBoZWxkTm93KSB0aGlzLnN0YXJ0UHJlc3MoZXZlbnQpO1xuICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgaGVsZE5vdykgdGhpcy50cmFja0hvdmVyTW92ZW1lbnQoZXZlbnQpO1xuICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgIWhlbGROb3cpIHRoaXMucmVsZWFzZVByZXNzKGVmZmVjdHMpO1xuICAgIHJldHVybiBlZmZlY3RzO1xuICB9XG5cbiAgZGlzcG9zZSgpOiBHZXN0dXJlRWZmZWN0W10ge1xuICAgIGNvbnN0IGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSA9IFtdO1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgIGlmICh0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUpIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtZW5kXCIgfSk7XG4gICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5jYW5jZWxQcmVzcygpO1xuICAgIHJldHVybiBlZmZlY3RzO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGFydFByZXNzKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgPSB0cnVlO1xuICAgIHRoaXMuY29uc3VtZWQgPSBmYWxzZTtcbiAgICB0aGlzLm1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5ob2xkRmlyZWQgPSBmYWxzZTtcbiAgICB0aGlzLnByZXNzT3JpZ2luID0geyB4OiBldmVudC54LCB5OiBldmVudC55IH07XG4gICAgdGhpcy5ob2xkVGltZXIgPSB0aGlzLnNjaGVkdWxlci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmIChcbiAgICAgICAgIXRoaXMuYmFycmVsQnV0dG9uSGVsZCB8fFxuICAgICAgICB0aGlzLnBlbkNvbnRhY3QgfHxcbiAgICAgICAgdGhpcy5tb3ZlZCB8fFxuICAgICAgICB0aGlzLmNvbnN1bWVkIHx8XG4gICAgICAgICF0aGlzLnByZXNzT3JpZ2luXG4gICAgICApXG4gICAgICAgIHJldHVybjtcbiAgICAgIHRoaXMuaG9sZEZpcmVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY29uc3VtZWQgPSB0cnVlO1xuICAgICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgICB0aGlzLm9uRWZmZWN0Py4oeyB0eXBlOiBcImJ1dHRvbi1ob2xkXCIsIHBvaW50OiB0aGlzLnByZXNzT3JpZ2luIH0pO1xuICAgIH0sIHRoaXMuc2V0dGluZ3MubG9uZ1ByZXNzTXMpO1xuICB9XG5cbiAgLyoqIENvbnRyb2xsZXIgcmVnaXN0ZXJzIHRoaXMgc28gc2NoZWR1bGVyIGNhbGxiYWNrcyByZXRhaW4gcHVyZSBzZW1hbnRpYyBvdXRwdXQuICovXG4gIHByaXZhdGUgb25FZmZlY3Q6ICgoZWZmZWN0OiBHZXN0dXJlRWZmZWN0KSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICBzZXRFZmZlY3RTaW5rKHNpbms6IChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLm9uRWZmZWN0ID0gc2luaztcbiAgfVxuXG4gIHByaXZhdGUgdHJhY2tIb3Zlck1vdmVtZW50KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMucHJlc3NPcmlnaW4gfHwgdGhpcy5tb3ZlZCkgcmV0dXJuO1xuICAgIGNvbnN0IGR4ID0gZXZlbnQueCAtIHRoaXMucHJlc3NPcmlnaW4ueDtcbiAgICBjb25zdCBkeSA9IGV2ZW50LnkgLSB0aGlzLnByZXNzT3JpZ2luLnk7XG4gICAgaWYgKE1hdGguaHlwb3QoZHgsIGR5KSA+IHRoaXMuc2V0dGluZ3MubW92ZW1lbnRUaHJlc2hvbGRQeCkge1xuICAgICAgdGhpcy5tb3ZlZCA9IHRydWU7XG4gICAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNvbnN1bWVGb3JDb250YWN0KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQsIGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSk6IHZvaWQge1xuICAgIHRoaXMuY29uc3VtZWQgPSB0cnVlO1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgIGlmICh0aGlzLnNldHRpbmdzLmJ1dHRvbkNvbnRhY3RBY3Rpb24gPT09IFwiZXJhc2VyXCIgJiYgIXRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkge1xuICAgICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gdHJ1ZTtcbiAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtc3RhcnRcIiwgcG9pbnQ6IHsgeDogZXZlbnQueCwgeTogZXZlbnQueSB9IH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVsZWFzZVByZXNzKGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSk6IHZvaWQge1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuYmFycmVsQnV0dG9uSGVsZCA9IGZhbHNlO1xuICAgIGlmICghdGhpcy5jb25zdW1lZCAmJiAhdGhpcy5tb3ZlZCAmJiAhdGhpcy5ob2xkRmlyZWQgJiYgdGhpcy5wcmVzc09yaWdpbikge1xuICAgICAgaWYgKHRoaXMucGVuZGluZ1RhcCkge1xuICAgICAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJidXR0b24tZG91YmxlLXRhcFwiLCBwb2ludDogdGhpcy5wcmVzc09yaWdpbiB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHBvaW50ID0gdGhpcy5wcmVzc09yaWdpbjtcbiAgICAgICAgY29uc3QgdGltZXIgPSB0aGlzLnNjaGVkdWxlci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdUYXAgPSBudWxsO1xuICAgICAgICAgIHRoaXMub25FZmZlY3Q/Lih7IHR5cGU6IFwiYnV0dG9uLXRhcFwiLCBwb2ludCB9KTtcbiAgICAgICAgfSwgdGhpcy5zZXR0aW5ncy5kb3VibGVUYXBNcyk7XG4gICAgICAgIHRoaXMucGVuZGluZ1RhcCA9IHsgcG9pbnQsIHRpbWVyIH07XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucHJlc3NPcmlnaW4gPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBjYW5jZWxQcmVzcygpOiB2b2lkIHtcbiAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgPSBmYWxzZTtcbiAgICB0aGlzLnBlbkNvbnRhY3QgPSBmYWxzZTtcbiAgICB0aGlzLmNvbnN1bWVkID0gZmFsc2U7XG4gICAgdGhpcy5tb3ZlZCA9IGZhbHNlO1xuICAgIHRoaXMuaG9sZEZpcmVkID0gZmFsc2U7XG4gICAgdGhpcy5wcmVzc09yaWdpbiA9IG51bGw7XG4gICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBjYW5jZWxUaW1lcih3aGljaDogXCJob2xkXCIpOiB2b2lkIHtcbiAgICBpZiAod2hpY2ggPT09IFwiaG9sZFwiICYmIHRoaXMuaG9sZFRpbWVyICE9PSBudWxsKSB7XG4gICAgICB0aGlzLnNjaGVkdWxlci5jbGVhclRpbWVvdXQodGhpcy5ob2xkVGltZXIpO1xuICAgICAgdGhpcy5ob2xkVGltZXIgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2FuY2VsUGVuZGluZ1RhcCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5wZW5kaW5nVGFwKSB0aGlzLnNjaGVkdWxlci5jbGVhclRpbWVvdXQodGhpcy5wZW5kaW5nVGFwLnRpbWVyKTtcbiAgICB0aGlzLnBlbmRpbmdUYXAgPSBudWxsO1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSB7IEV4Y2FsaWRyYXdCcmlkZ2UsIEFjdGl2ZVRvb2xTbmFwc2hvdCB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB0eXBlIHsgRGVidWdMb2dnZXIgfSBmcm9tIFwiLi4vZGVidWcvRGVidWdMb2dnZXJcIjtcbmltcG9ydCB0eXBlIHsgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB9IGZyb20gXCIuLi9zZXR0aW5ncy9zZXR0aW5nc1wiO1xuaW1wb3J0IHsgbm9ybWFsaXplUG9pbnRlckV2ZW50IH0gZnJvbSBcIi4vbm9ybWFsaXplUG9pbnRlckV2ZW50XCI7XG5pbXBvcnQgeyBTdHlsdXNHZXN0dXJlTWFjaGluZSB9IGZyb20gXCIuL1N0eWx1c0dlc3R1cmVNYWNoaW5lXCI7XG5pbXBvcnQgdHlwZSB7IEdlc3R1cmVFZmZlY3QsIFBvaW50LCBTY2hlZHVsZXIgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgdHlwZSBBY3Rpb25IYW5kbGVyID0gKFxuICBhY3Rpb246IFwibWVudVwiIHwgXCJjb3B5XCIgfCBcInBhc3RlXCIgfCBcIm5vbmVcIixcbiAgcG9pbnQ6IFBvaW50LFxuICBicmlkZ2U6IEV4Y2FsaWRyYXdCcmlkZ2VcbikgPT4gdm9pZDtcblxuZXhwb3J0IGNsYXNzIFN0eWx1c0NvbnRyb2xsZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IG1hY2hpbmU6IFN0eWx1c0dlc3R1cmVNYWNoaW5lO1xuICBwcml2YXRlIHNhdmVkVG9vbDogQWN0aXZlVG9vbFNuYXBzaG90IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZGlzcG9zZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSByZWFkb25seSBsaXN0ZW5lcnM6IEFycmF5PFtrZXlvZiBIVE1MRWxlbWVudEV2ZW50TWFwLCBFdmVudExpc3RlbmVyXT4gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxlYWY6IFdvcmtzcGFjZUxlYWYsXG4gICAgcHJpdmF0ZSByZWFkb25seSBicmlkZ2U6IEV4Y2FsaWRyYXdCcmlkZ2UsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogKCkgPT4gU3R5bHVzQ29udHJvbHNTZXR0aW5ncyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRlYnVnOiBEZWJ1Z0xvZ2dlcixcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpc3BhdGNoQWN0aW9uOiBBY3Rpb25IYW5kbGVyLFxuICAgIHNjaGVkdWxlcjogU2NoZWR1bGVyID0gd2luZG93XG4gICkge1xuICAgIHRoaXMubWFjaGluZSA9IG5ldyBTdHlsdXNHZXN0dXJlTWFjaGluZSh0aGlzLmdlc3R1cmVTZXR0aW5ncygpLCBzY2hlZHVsZXIpO1xuICAgIHRoaXMubWFjaGluZS5zZXRFZmZlY3RTaW5rKChlZmZlY3QpID0+IHRoaXMuYXBwbHlFZmZlY3QoZWZmZWN0KSk7XG4gIH1cblxuICBhdHRhY2goKTogdm9pZCB7XG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsO1xuICAgIGZvciAoY29uc3QgdHlwZSBvZiBbXG4gICAgICBcInBvaW50ZXJkb3duXCIsXG4gICAgICBcInBvaW50ZXJtb3ZlXCIsXG4gICAgICBcInBvaW50ZXJ1cFwiLFxuICAgICAgXCJwb2ludGVyY2FuY2VsXCIsXG4gICAgICBcImNvbnRleHRtZW51XCIsXG4gICAgXSBhcyBjb25zdCkge1xuICAgICAgY29uc3QgbGlzdGVuZXI6IEV2ZW50TGlzdGVuZXIgPSAocmF3KSA9PiB0aGlzLm9uUG9pbnRlckV2ZW50KHJhdyBhcyBQb2ludGVyRXZlbnQpO1xuICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgICAgIHRoaXMubGlzdGVuZXJzLnB1c2goW3R5cGUsIGxpc3RlbmVyXSk7XG4gICAgfVxuICB9XG5cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkgcmV0dXJuO1xuICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuICAgIGZvciAoY29uc3QgW3R5cGUsIGxpc3RlbmVyXSBvZiB0aGlzLmxpc3RlbmVycylcbiAgICAgIHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICAgIHRoaXMubGlzdGVuZXJzLmxlbmd0aCA9IDA7XG4gICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgdGhpcy5tYWNoaW5lLmRpc3Bvc2UoKSkgdGhpcy5hcHBseUVmZmVjdChlZmZlY3QpO1xuICB9XG4gIGdldFRyYWNlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVidWcuZXhwb3J0VHJhY2UoKTtcbiAgfVxuXG4gIHByaXZhdGUgb25Qb2ludGVyRXZlbnQocmF3OiBQb2ludGVyRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAocmF3LnBvaW50ZXJUeXBlICE9PSBcInBlblwiKSByZXR1cm47XG4gICAgY29uc3QgZXZlbnQgPSBub3JtYWxpemVQb2ludGVyRXZlbnQoXG4gICAgICByYXcsXG4gICAgICB0aGlzLmxlYWYudmlldy5jb250YWluZXJFbC5jb250YWlucyhyYXcudGFyZ2V0IGFzIE5vZGUpXG4gICAgKTtcbiAgICB0aGlzLmRlYnVnLmV2ZW50KGV2ZW50KTtcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiB0aGlzLm1hY2hpbmUuaGFuZGxlKGV2ZW50KSkge1xuICAgICAgaWYgKGVmZmVjdC50eXBlID09PSBcInN1cHByZXNzLWNvbnRleHQtbWVudVwiKSByYXcucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMuYXBwbHlFZmZlY3QoZWZmZWN0KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFwcGx5RWZmZWN0KGVmZmVjdDogR2VzdHVyZUVmZmVjdCk6IHZvaWQge1xuICAgIHN3aXRjaCAoZWZmZWN0LnR5cGUpIHtcbiAgICAgIGNhc2UgXCJ0ZW1wb3JhcnktdG9vbC1zdGFydFwiOlxuICAgICAgICBpZiAoIXRoaXMuc2F2ZWRUb29sKSB0aGlzLnNhdmVkVG9vbCA9IHRoaXMuYnJpZGdlLnN0YXJ0VGVtcG9yYXJ5RXJhc2VyKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcInRlbXBvcmFyeS10b29sLWVuZFwiOlxuICAgICAgICBpZiAodGhpcy5zYXZlZFRvb2wpIHRoaXMuYnJpZGdlLnJlc3RvcmVUb29sKHRoaXMuc2F2ZWRUb29sKTtcbiAgICAgICAgdGhpcy5zYXZlZFRvb2wgPSBudWxsO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJidXR0b24tdGFwXCI6XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvblRhcEFjdGlvbiwgZWZmZWN0LnBvaW50LCB0aGlzLmJyaWRnZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImJ1dHRvbi1kb3VibGUtdGFwXCI6XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvbkRvdWJsZVRhcEFjdGlvbiwgZWZmZWN0LnBvaW50LCB0aGlzLmJyaWRnZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImJ1dHRvbi1ob2xkXCI6XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvbkhvbGRBY3Rpb24sIGVmZmVjdC5wb2ludCwgdGhpcy5icmlkZ2UpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2VzdHVyZVNldHRpbmdzKCkge1xuICAgIGNvbnN0IHZhbHVlID0gdGhpcy5zZXR0aW5ncygpO1xuICAgIHJldHVybiB7XG4gICAgICBidXR0b25Db250YWN0QWN0aW9uOiB2YWx1ZS5idXR0b25Db250YWN0QWN0aW9uLFxuICAgICAgZG91YmxlVGFwTXM6IHZhbHVlLmRvdWJsZVRhcE1zLFxuICAgICAgbG9uZ1ByZXNzTXM6IHZhbHVlLmxvbmdQcmVzc01zLFxuICAgICAgbW92ZW1lbnRUaHJlc2hvbGRQeDogdmFsdWUubW92ZW1lbnRUaHJlc2hvbGRQeCxcbiAgICB9IGFzIGNvbnN0O1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBBcHAsIFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IEV4Y2FsaWRyYXdCcmlkZ2UgfSBmcm9tIFwiLi4vZXhjYWxpZHJhdy9FeGNhbGlkcmF3QnJpZGdlXCI7XG5pbXBvcnQgeyBEZWJ1Z0xvZ2dlciB9IGZyb20gXCIuLi9kZWJ1Zy9EZWJ1Z0xvZ2dlclwiO1xuaW1wb3J0IHR5cGUgeyBTdHlsdXNDb250cm9sc1NldHRpbmdzIH0gZnJvbSBcIi4uL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBTdHlsdXNDb250cm9sbGVyLCB0eXBlIEFjdGlvbkhhbmRsZXIgfSBmcm9tIFwiLi9TdHlsdXNDb250cm9sbGVyXCI7XG5cbmV4cG9ydCBjbGFzcyBTdHlsdXNWaWV3UmVnaXN0cnkge1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbnRyb2xsZXJzID0gbmV3IE1hcDxXb3Jrc3BhY2VMZWFmLCBTdHlsdXNDb250cm9sbGVyPigpO1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2V0dGluZ3M6ICgpID0+IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MsXG4gICAgcHJpdmF0ZSByZWFkb25seSBhY3Rpb25IYW5kbGVyOiBBY3Rpb25IYW5kbGVyXG4gICkge31cblxuICBzeW5jKCk6IHZvaWQge1xuICAgIGNvbnN0IGxlYXZlcyA9IG5ldyBTZXQodGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShcImV4Y2FsaWRyYXdcIikpO1xuICAgIGZvciAoY29uc3QgbGVhZiBvZiBsZWF2ZXMpXG4gICAgICBpZiAoIXRoaXMuY29udHJvbGxlcnMuaGFzKGxlYWYpKSB7XG4gICAgICAgIGNvbnN0IGRlYnVnID0gbmV3IERlYnVnTG9nZ2VyKCgpID0+IHRoaXMuc2V0dGluZ3MoKS5kZWJ1Z01vZGUpO1xuICAgICAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IFN0eWx1c0NvbnRyb2xsZXIoXG4gICAgICAgICAgbGVhZixcbiAgICAgICAgICBuZXcgRXhjYWxpZHJhd0JyaWRnZSh0aGlzLmFwcCwgbGVhZiksXG4gICAgICAgICAgdGhpcy5zZXR0aW5ncyxcbiAgICAgICAgICBkZWJ1ZyxcbiAgICAgICAgICB0aGlzLmFjdGlvbkhhbmRsZXJcbiAgICAgICAgKTtcbiAgICAgICAgY29udHJvbGxlci5hdHRhY2goKTtcbiAgICAgICAgdGhpcy5jb250cm9sbGVycy5zZXQobGVhZiwgY29udHJvbGxlcik7XG4gICAgICB9XG4gICAgZm9yIChjb25zdCBbbGVhZiwgY29udHJvbGxlcl0gb2YgdGhpcy5jb250cm9sbGVycylcbiAgICAgIGlmICghbGVhdmVzLmhhcyhsZWFmKSkge1xuICAgICAgICBjb250cm9sbGVyLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5jb250cm9sbGVycy5kZWxldGUobGVhZik7XG4gICAgICB9XG4gIH1cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGNvbnRyb2xsZXIgb2YgdGhpcy5jb250cm9sbGVycy52YWx1ZXMoKSkgY29udHJvbGxlci5kaXNwb3NlKCk7XG4gICAgdGhpcy5jb250cm9sbGVycy5jbGVhcigpO1xuICB9XG4gIHJlZnJlc2goKTogdm9pZCB7XG4gICAgdGhpcy5kaXNwb3NlKCk7XG4gICAgdGhpcy5zeW5jKCk7XG4gIH1cbiAgZXhwb3J0VHJhY2VzKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KFxuICAgICAgWy4uLnRoaXMuY29udHJvbGxlcnMuZW50cmllcygpXS5tYXAoKFtsZWFmLCBjb250cm9sbGVyXSkgPT4gKHtcbiAgICAgICAgbGVhZjogbGVhZi5nZXREaXNwbGF5VGV4dCgpLFxuICAgICAgICBldmVudHM6IEpTT04ucGFyc2UoY29udHJvbGxlci5nZXRUcmFjZSgpKSxcbiAgICAgIH0pKSxcbiAgICAgIG51bGwsXG4gICAgICAyXG4gICAgKTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFBQUEsbUJBQStCOzs7QUNHeEIsSUFBTSxhQUFOLE1BQWlCO0FBQUEsRUFDZCxVQUE4QjtBQUFBLEVBQ3RDLEtBQUssT0FBYyxRQUFnQztBQUNqRCxTQUFLLE1BQU07QUFDWCxVQUFNLE9BQU8sU0FBUyxLQUFLLFVBQVUsRUFBRSxLQUFLLHlCQUF5QixDQUFDO0FBQ3RFLFVBQU1DLFdBQXVDO0FBQUEsTUFDM0MsQ0FBQyxhQUFhLE1BQU0sT0FBTyxRQUFRLFdBQVcsQ0FBQztBQUFBLE1BQy9DLENBQUMsYUFBYSxNQUFNLE9BQU8sUUFBUSxVQUFVLENBQUM7QUFBQSxNQUM5QyxDQUFDLFVBQVUsTUFBTSxPQUFPLFFBQVEsUUFBUSxDQUFDO0FBQUEsTUFDekMsQ0FBQyxhQUFhLE1BQU0sT0FBTyxRQUFRLFdBQVcsQ0FBQztBQUFBLE1BQy9DLENBQUMsU0FBUyxNQUFNLE9BQU8sUUFBUSxPQUFPLENBQUM7QUFBQSxNQUN2QyxDQUFDLFFBQVEsTUFBTSxPQUFPLHFCQUFxQixDQUFDO0FBQUEsTUFDNUMs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
