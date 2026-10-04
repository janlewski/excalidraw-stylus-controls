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
      const button = menu.createEl("button", { text: name, cls: "excalidraw-stylus-menu__item" });
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
    window.setTimeout(() => document.addEventListener("pointerdown", this.close, { once: true, capture: true }), 0);
  }
  close = () => {
    this.element?.remove();
    this.element = null;
  };
};

// src/settings/SettingsTab.ts
var import_obsidian = require("obsidian");
var actions = { menu: "Open menu", copy: "Copy", paste: "Paste", none: "Do nothing" };
var SettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("p", { text: "Requires the Excalidraw community plugin. Copy/paste uses a private in-memory clipboard in version 0.1." });
    this.action("Tap", "buttonTapAction");
    this.action("Double tap", "buttonDoubleTapAction");
    this.action("Hold", "buttonHoldAction");
    new import_obsidian.Setting(containerEl).setName("Button + pen contact").setDesc("Temporary tool while the side button is held during pen contact.").addDropdown((dropdown) => dropdown.addOption("eraser", "Temporary eraser").addOption("none", "Do nothing").setValue(this.plugin.settings.buttonContactAction).onChange(async (value) => this.plugin.updateSettings({ buttonContactAction: value })));
    this.number("Double-tap interval (ms)", "doubleTapMs");
    this.number("Long-press delay (ms)", "longPressMs");
    this.number("Movement threshold (px)", "movementThresholdPx");
    new import_obsidian.Setting(containerEl).setName("Debug logging").setDesc("Logs bounded raw pen event traces to the developer console.").addToggle((toggle) => toggle.setValue(this.plugin.settings.debugMode).onChange(async (value) => this.plugin.updateSettings({ debugMode: value })));
  }
  action(name, key) {
    new import_obsidian.Setting(this.containerEl).setName(`S Pen side button: ${name}`).addDropdown((dropdown) => {
      for (const [value, label] of Object.entries(actions)) dropdown.addOption(value, label);
      dropdown.setValue(this.plugin.settings[key]).onChange(async (value) => this.plugin.updateSettings({ [key]: value }));
    });
  }
  number(name, key) {
    new import_obsidian.Setting(this.containerEl).setName(name).addText((text) => text.setValue(String(this.plugin.settings[key])).onChange(async (value) => this.plugin.updateSettings({ [key]: Number(value) })));
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
    buttonDoubleTapAction: action(value.buttonDoubleTapAction, DEFAULT_SETTINGS.buttonDoubleTapAction),
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
  pasteAt(_point) {
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
      if (this.temporaryToolActive || this.barrelButtonHeld && this.penContact) effects.push({ type: "suppress-context-menu" });
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
      if (!this.barrelButtonHeld || this.penContact || this.moved || this.consumed || !this.pressOrigin) return;
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
    for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "contextmenu"]) {
      const listener = (raw) => this.onPointerEvent(raw);
      element.addEventListener(type, listener, true);
      this.listeners.push([type, listener]);
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const [type, listener] of this.listeners) this.leaf.view.containerEl.removeEventListener(type, listener, true);
    this.listeners.length = 0;
    for (const effect of this.machine.dispose()) this.applyEffect(effect);
  }
  getTrace() {
    return this.debug.exportTrace();
  }
  onPointerEvent(raw) {
    if (raw.pointerType !== "pen") return;
    const event = normalizePointerEvent(raw, this.leaf.view.containerEl.contains(raw.target));
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
    return { buttonContactAction: value.buttonContactAction, doubleTapMs: value.doubleTapMs, longPressMs: value.longPressMs, movementThresholdPx: value.movementThresholdPx };
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
    for (const leaf of leaves) if (!this.controllers.has(leaf)) {
      const debug = new DebugLogger(() => this.settings().debugMode);
      const controller = new StylusController(leaf, new ExcalidrawBridge(this.app, leaf), this.settings, debug, this.actionHandler);
      controller.attach();
      this.controllers.set(leaf, controller);
    }
    for (const [leaf, controller] of this.controllers) if (!leaves.has(leaf)) {
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
    return JSON.stringify([...this.controllers.entries()].map(([leaf, controller]) => ({ leaf: leaf.getDisplayText(), events: JSON.parse(controller.getTrace()) })), null, 2);
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
    this.registry = new StylusViewRegistry(this.app, () => this.settings, (action, point, bridge) => {
      if (action === "menu") this.menu.open(point, bridge);
      else if (action === "copy") bridge.copySelectedElements();
      else if (action === "paste") bridge.pasteAt(point);
    });
    this.registerEvent(this.app.workspace.on("layout-change", () => this.registry?.sync()));
    this.app.workspace.onLayoutReady(() => this.registry?.sync());
    this.addCommand({ id: "copy-stylus-event-trace", name: "Copy latest stylus event trace", callback: async () => {
      const trace = this.registry?.exportTraces() ?? "[]";
      try {
        await navigator.clipboard.writeText(trace);
        new import_obsidian3.Notice("Stylus event trace copied.");
      } catch {
        new import_obsidian3.Notice("Unable to copy event trace. Check the developer console.");
      }
    } });
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL21lbnUvU3R5bHVzTWVudS50cyIsICJzcmMvc2V0dGluZ3MvU2V0dGluZ3NUYWIudHMiLCAic3JjL3NldHRpbmdzL3NldHRpbmdzLnRzIiwgInNyYy9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2UudHMiLCAic3JjL2RlYnVnL0RlYnVnTG9nZ2VyLnRzIiwgInNyYy9zdHlsdXMvbm9ybWFsaXplUG9pbnRlckV2ZW50LnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzR2VzdHVyZU1hY2hpbmUudHMiLCAic3JjL3N0eWx1cy9TdHlsdXNDb250cm9sbGVyLnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzVmlld1JlZ2lzdHJ5LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBOb3RpY2UsIFBsdWdpbiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgU3R5bHVzTWVudSB9IGZyb20gXCIuL21lbnUvU3R5bHVzTWVudVwiO1xuaW1wb3J0IHsgU2V0dGluZ3NUYWIgfSBmcm9tIFwiLi9zZXR0aW5ncy9TZXR0aW5nc1RhYlwiO1xuaW1wb3J0IHsgREVGQVVMVF9TRVRUSU5HUywgbm9ybWFsaXplU2V0dGluZ3MsIHR5cGUgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB9IGZyb20gXCIuL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBTdHlsdXNWaWV3UmVnaXN0cnkgfSBmcm9tIFwiLi9zdHlsdXMvU3R5bHVzVmlld1JlZ2lzdHJ5XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0eWx1c0NvbnRyb2xzUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuICBwcml2YXRlIHJlZ2lzdHJ5OiBTdHlsdXNWaWV3UmVnaXN0cnkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByZWFkb25seSBtZW51ID0gbmV3IFN0eWx1c01lbnUoKTtcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IG5vcm1hbGl6ZVNldHRpbmdzKGF3YWl0IHRoaXMubG9hZERhdGEoKSA/PyB7fSk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTZXR0aW5nc1RhYih0aGlzKSk7XG4gICAgdGhpcy5yZWdpc3RyeSA9IG5ldyBTdHlsdXNWaWV3UmVnaXN0cnkodGhpcy5hcHAsICgpID0+IHRoaXMuc2V0dGluZ3MsIChhY3Rpb24sIHBvaW50LCBicmlkZ2UpID0+IHtcbiAgICAgIGlmIChhY3Rpb24gPT09IFwibWVudVwiKSB0aGlzLm1lbnUub3Blbihwb2ludCwgYnJpZGdlKTtcbiAgICAgIGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJjb3B5XCIpIGJyaWRnZS5jb3B5U2VsZWN0ZWRFbGVtZW50cygpO1xuICAgICAgZWxzZSBpZiAoYWN0aW9uID09PSBcInBhc3RlXCIpIGJyaWRnZS5wYXN0ZUF0KHBvaW50KTtcbiAgICB9KTtcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAud29ya3NwYWNlLm9uKFwibGF5b3V0LWNoYW5nZVwiLCAoKSA9PiB0aGlzLnJlZ2lzdHJ5Py5zeW5jKCkpKTtcbiAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub25MYXlvdXRSZWFkeSgoKSA9PiB0aGlzLnJlZ2lzdHJ5Py5zeW5jKCkpO1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiBcImNvcHktc3R5bHVzLWV2ZW50LXRyYWNlXCIsIG5hbWU6IFwiQ29weSBsYXRlc3Qgc3R5bHVzIGV2ZW50IHRyYWNlXCIsIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCB0cmFjZSA9IHRoaXMucmVnaXN0cnk/LmV4cG9ydFRyYWNlcygpID8/IFwiW11cIjtcbiAgICAgIHRyeSB7IGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHRyYWNlKTsgbmV3IE5vdGljZShcIlN0eWx1cyBldmVudCB0cmFjZSBjb3BpZWQuXCIpOyB9XG4gICAgICBjYXRjaCB7IG5ldyBOb3RpY2UoXCJVbmFibGUgdG8gY29weSBldmVudCB0cmFjZS4gQ2hlY2sgdGhlIGRldmVsb3BlciBjb25zb2xlLlwiKTsgfVxuICAgIH19KTtcbiAgfVxuICBvbnVubG9hZCgpOiB2b2lkIHsgdGhpcy5tZW51LmNsb3NlKCk7IHRoaXMucmVnaXN0cnk/LmRpc3Bvc2UoKTsgdGhpcy5yZWdpc3RyeSA9IG51bGw7IH1cbiAgYXN5bmMgdXBkYXRlU2V0dGluZ3MocGF0Y2g6IFBhcnRpYWw8U3R5bHVzQ29udHJvbHNTZXR0aW5ncz4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnNldHRpbmdzID0gbm9ybWFsaXplU2V0dGluZ3MoeyAuLi50aGlzLnNldHRpbmdzLCAuLi5wYXRjaCB9KTtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICAgIHRoaXMucmVnaXN0cnk/LnJlZnJlc2goKTtcbiAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgRXhjYWxpZHJhd0JyaWRnZSB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBTdHlsdXNNZW51IHtcbiAgcHJpdmF0ZSBlbGVtZW50OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICBvcGVuKHBvaW50OiBQb2ludCwgYnJpZGdlOiBFeGNhbGlkcmF3QnJpZGdlKTogdm9pZCB7XG4gICAgdGhpcy5jbG9zZSgpO1xuICAgIGNvbnN0IG1lbnUgPSBkb2N1bWVudC5ib2R5LmNyZWF0ZURpdih7IGNsczogXCJleGNhbGlkcmF3LXN0eWx1cy1tZW51XCIgfSk7XG4gICAgY29uc3QgYWN0aW9uczogQXJyYXk8W3N0cmluZywgKCkgPT4gdm9pZF0+ID0gW1xuICAgICAgW1wiU2VsZWN0aW9uXCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwic2VsZWN0aW9uXCIpXSwgW1wiRnJlZSBkcmF3XCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiZnJlZWRyYXdcIildLFxuICAgICAgW1wiRXJhc2VyXCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiZXJhc2VyXCIpXSwgW1wiUmVjdGFuZ2xlXCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwicmVjdGFuZ2xlXCIpXSxcbiAgICAgIFtcIkFycm93XCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiYXJyb3dcIildLCBbXCJDb3B5XCIsICgpID0+IGJyaWRnZS5jb3B5U2VsZWN0ZWRFbGVtZW50cygpXSwgW1wiUGFzdGVcIiwgKCkgPT4gYnJpZGdlLnBhc3RlQXQocG9pbnQpXSxcbiAgICBdO1xuICAgIGZvciAoY29uc3QgW25hbWUsIGNhbGxiYWNrXSBvZiBhY3Rpb25zKSB7XG4gICAgICBjb25zdCBidXR0b24gPSBtZW51LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogbmFtZSwgY2xzOiBcImV4Y2FsaWRyYXctc3R5bHVzLW1lbnVfX2l0ZW1cIiB9KTtcbiAgICAgIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcnVwXCIsIChldmVudCkgPT4geyBldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgY2FsbGJhY2soKTsgdGhpcy5jbG9zZSgpOyB9KTtcbiAgICB9XG4gICAgY29uc3QgbGVmdCA9IE1hdGgubWluKE1hdGgubWF4KDgsIHBvaW50LngpLCB3aW5kb3cuaW5uZXJXaWR0aCAtIDE4MCk7XG4gICAgY29uc3QgdG9wID0gTWF0aC5taW4oTWF0aC5tYXgoOCwgcG9pbnQueSksIHdpbmRvdy5pbm5lckhlaWdodCAtIDMwMCk7XG4gICAgbWVudS5zZXRDc3NQcm9wcyh7IGxlZnQ6IGAke2xlZnR9cHhgLCB0b3A6IGAke3RvcH1weGAgfSk7XG4gICAgdGhpcy5lbGVtZW50ID0gbWVudTtcbiAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmRvd25cIiwgdGhpcy5jbG9zZSwgeyBvbmNlOiB0cnVlLCBjYXB0dXJlOiB0cnVlIH0pLCAwKTtcbiAgfVxuICBjbG9zZSA9ICgpOiB2b2lkID0+IHsgdGhpcy5lbGVtZW50Py5yZW1vdmUoKTsgdGhpcy5lbGVtZW50ID0gbnVsbDsgfTtcbn1cbiIsICJpbXBvcnQgeyBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTdHlsdXNDb250cm9sc1BsdWdpbiBmcm9tIFwiLi4vbWFpblwiO1xuaW1wb3J0IHR5cGUgeyBTdHlsdXNBY3Rpb24gfSBmcm9tIFwiLi9zZXR0aW5nc1wiO1xuXG5jb25zdCBhY3Rpb25zOiBSZWNvcmQ8U3R5bHVzQWN0aW9uLCBzdHJpbmc+ID0geyBtZW51OiBcIk9wZW4gbWVudVwiLCBjb3B5OiBcIkNvcHlcIiwgcGFzdGU6IFwiUGFzdGVcIiwgbm9uZTogXCJEbyBub3RoaW5nXCIgfTtcblxuZXhwb3J0IGNsYXNzIFNldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBTdHlsdXNDb250cm9sc1BsdWdpbikgeyBzdXBlcihwbHVnaW4uYXBwLCBwbHVnaW4pOyB9XG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpczsgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIlJlcXVpcmVzIHRoZSBFeGNhbGlkcmF3IGNvbW11bml0eSBwbHVnaW4uIENvcHkvcGFzdGUgdXNlcyBhIHByaXZhdGUgaW4tbWVtb3J5IGNsaXBib2FyZCBpbiB2ZXJzaW9uIDAuMS5cIiB9KTtcbiAgICB0aGlzLmFjdGlvbihcIlRhcFwiLCBcImJ1dHRvblRhcEFjdGlvblwiKTsgdGhpcy5hY3Rpb24oXCJEb3VibGUgdGFwXCIsIFwiYnV0dG9uRG91YmxlVGFwQWN0aW9uXCIpOyB0aGlzLmFjdGlvbihcIkhvbGRcIiwgXCJidXR0b25Ib2xkQWN0aW9uXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKFwiQnV0dG9uICsgcGVuIGNvbnRhY3RcIikuc2V0RGVzYyhcIlRlbXBvcmFyeSB0b29sIHdoaWxlIHRoZSBzaWRlIGJ1dHRvbiBpcyBoZWxkIGR1cmluZyBwZW4gY29udGFjdC5cIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IGRyb3Bkb3duLmFkZE9wdGlvbihcImVyYXNlclwiLCBcIlRlbXBvcmFyeSBlcmFzZXJcIikuYWRkT3B0aW9uKFwibm9uZVwiLCBcIkRvIG5vdGhpbmdcIikuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYnV0dG9uQ29udGFjdEFjdGlvbikub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlIGFzIFwiZXJhc2VyXCIgfCBcIm5vbmVcIiB9KSkpO1xuICAgIHRoaXMubnVtYmVyKFwiRG91YmxlLXRhcCBpbnRlcnZhbCAobXMpXCIsIFwiZG91YmxlVGFwTXNcIik7IHRoaXMubnVtYmVyKFwiTG9uZy1wcmVzcyBkZWxheSAobXMpXCIsIFwibG9uZ1ByZXNzTXNcIik7IHRoaXMubnVtYmVyKFwiTW92ZW1lbnQgdGhyZXNob2xkIChweClcIiwgXCJtb3ZlbWVudFRocmVzaG9sZFB4XCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKFwiRGVidWcgbG9nZ2luZ1wiKS5zZXREZXNjKFwiTG9ncyBib3VuZGVkIHJhdyBwZW4gZXZlbnQgdHJhY2VzIHRvIHRoZSBkZXZlbG9wZXIgY29uc29sZS5cIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4gdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlYnVnTW9kZSkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IGRlYnVnTW9kZTogdmFsdWUgfSkpKTtcbiAgfVxuICBwcml2YXRlIGFjdGlvbihuYW1lOiBzdHJpbmcsIGtleTogXCJidXR0b25UYXBBY3Rpb25cIiB8IFwiYnV0dG9uRG91YmxlVGFwQWN0aW9uXCIgfCBcImJ1dHRvbkhvbGRBY3Rpb25cIik6IHZvaWQge1xuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGFpbmVyRWwpLnNldE5hbWUoYFMgUGVuIHNpZGUgYnV0dG9uOiAke25hbWV9YCkuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IFt2YWx1ZSwgbGFiZWxdIG9mIE9iamVjdC5lbnRyaWVzKGFjdGlvbnMpKSBkcm9wZG93bi5hZGRPcHRpb24odmFsdWUsIGxhYmVsKTtcbiAgICAgIGRyb3Bkb3duLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzW2tleV0pLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4gdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBba2V5XTogdmFsdWUgYXMgU3R5bHVzQWN0aW9uIH0pKTtcbiAgICB9KTtcbiAgfVxuICBwcml2YXRlIG51bWJlcihuYW1lOiBzdHJpbmcsIGtleTogXCJkb3VibGVUYXBNc1wiIHwgXCJsb25nUHJlc3NNc1wiIHwgXCJtb3ZlbWVudFRocmVzaG9sZFB4XCIpOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRhaW5lckVsKS5zZXROYW1lKG5hbWUpLmFkZFRleHQoKHRleHQpID0+IHRleHQuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzW2tleV0pKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgW2tleV06IE51bWJlcih2YWx1ZSkgfSkpKTtcbiAgfVxufVxuIiwgImV4cG9ydCB0eXBlIFN0eWx1c0FjdGlvbiA9IFwibWVudVwiIHwgXCJjb3B5XCIgfCBcInBhc3RlXCIgfCBcIm5vbmVcIjtcblxuZXhwb3J0IGludGVyZmFjZSBTdHlsdXNDb250cm9sc1NldHRpbmdzIHtcbiAgYnV0dG9uVGFwQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gIGJ1dHRvbkRvdWJsZVRhcEFjdGlvbjogU3R5bHVzQWN0aW9uO1xuICBidXR0b25Ib2xkQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gIGJ1dHRvbkNvbnRhY3RBY3Rpb246IFwiZXJhc2VyXCIgfCBcIm5vbmVcIjtcbiAgZG91YmxlVGFwTXM6IG51bWJlcjtcbiAgbG9uZ1ByZXNzTXM6IG51bWJlcjtcbiAgbW92ZW1lbnRUaHJlc2hvbGRQeDogbnVtYmVyO1xuICBjbGVhbnVwU3RyYXlEb3Q6IGJvb2xlYW47XG4gIGRlYnVnTW9kZTogYm9vbGVhbjtcbiAgZGVidWdPdmVybGF5OiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogU3R5bHVzQ29udHJvbHNTZXR0aW5ncyA9IHtcbiAgYnV0dG9uVGFwQWN0aW9uOiBcIm1lbnVcIiwgYnV0dG9uRG91YmxlVGFwQWN0aW9uOiBcImNvcHlcIiwgYnV0dG9uSG9sZEFjdGlvbjogXCJwYXN0ZVwiLFxuICBidXR0b25Db250YWN0QWN0aW9uOiBcImVyYXNlclwiLCBkb3VibGVUYXBNczogMzAwLCBsb25nUHJlc3NNczogNDUwLFxuICBtb3ZlbWVudFRocmVzaG9sZFB4OiA4LCBjbGVhbnVwU3RyYXlEb3Q6IHRydWUsIGRlYnVnTW9kZTogZmFsc2UsIGRlYnVnT3ZlcmxheTogZmFsc2UsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU2V0dGluZ3ModmFsdWU6IFBhcnRpYWw8U3R5bHVzQ29udHJvbHNTZXR0aW5ncz4pOiBTdHlsdXNDb250cm9sc1NldHRpbmdzIHtcbiAgY29uc3QgYWN0aW9uID0gKGNhbmRpZGF0ZTogdW5rbm93biwgZmFsbGJhY2s6IFN0eWx1c0FjdGlvbik6IFN0eWx1c0FjdGlvbiA9PlxuICAgIGNhbmRpZGF0ZSA9PT0gXCJtZW51XCIgfHwgY2FuZGlkYXRlID09PSBcImNvcHlcIiB8fCBjYW5kaWRhdGUgPT09IFwicGFzdGVcIiB8fCBjYW5kaWRhdGUgPT09IFwibm9uZVwiID8gY2FuZGlkYXRlIDogZmFsbGJhY2s7XG4gIGNvbnN0IG51bWJlciA9IChjYW5kaWRhdGU6IHVua25vd24sIGZhbGxiYWNrOiBudW1iZXIsIG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcik6IG51bWJlciA9PlxuICAgIHR5cGVvZiBjYW5kaWRhdGUgPT09IFwibnVtYmVyXCIgJiYgTnVtYmVyLmlzRmluaXRlKGNhbmRpZGF0ZSkgPyBNYXRoLm1pbihtYXgsIE1hdGgubWF4KG1pbiwgTWF0aC5yb3VuZChjYW5kaWRhdGUpKSkgOiBmYWxsYmFjaztcbiAgcmV0dXJuIHtcbiAgICBidXR0b25UYXBBY3Rpb246IGFjdGlvbih2YWx1ZS5idXR0b25UYXBBY3Rpb24sIERFRkFVTFRfU0VUVElOR1MuYnV0dG9uVGFwQWN0aW9uKSxcbiAgICBidXR0b25Eb3VibGVUYXBBY3Rpb246IGFjdGlvbih2YWx1ZS5idXR0b25Eb3VibGVUYXBBY3Rpb24sIERFRkFVTFRfU0VUVElOR1MuYnV0dG9uRG91YmxlVGFwQWN0aW9uKSxcbiAgICBidXR0b25Ib2xkQWN0aW9uOiBhY3Rpb24odmFsdWUuYnV0dG9uSG9sZEFjdGlvbiwgREVGQVVMVF9TRVRUSU5HUy5idXR0b25Ib2xkQWN0aW9uKSxcbiAgICBidXR0b25Db250YWN0QWN0aW9uOiB2YWx1ZS5idXR0b25Db250YWN0QWN0aW9uID09PSBcIm5vbmVcIiA/IFwibm9uZVwiIDogXCJlcmFzZXJcIixcbiAgICBkb3VibGVUYXBNczogbnVtYmVyKHZhbHVlLmRvdWJsZVRhcE1zLCAzMDAsIDEwMCwgMTAwMCksXG4gICAgbG9uZ1ByZXNzTXM6IG51bWJlcih2YWx1ZS5sb25nUHJlc3NNcywgNDUwLCAxNTAsIDIwMDApLFxuICAgIG1vdmVtZW50VGhyZXNob2xkUHg6IG51bWJlcih2YWx1ZS5tb3ZlbWVudFRocmVzaG9sZFB4LCA4LCAxLCAxMDApLFxuICAgIGNsZWFudXBTdHJheURvdDogdmFsdWUuY2xlYW51cFN0cmF5RG90ICE9PSBmYWxzZSxcbiAgICBkZWJ1Z01vZGU6IHZhbHVlLmRlYnVnTW9kZSA9PT0gdHJ1ZSxcbiAgICBkZWJ1Z092ZXJsYXk6IHZhbHVlLmRlYnVnT3ZlcmxheSA9PT0gdHJ1ZSxcbiAgfTtcbn1cbiIsICJpbXBvcnQgeyBOb3RpY2UsIHR5cGUgQXBwLCB0eXBlIFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aXZlVG9vbFNuYXBzaG90IHsgdHlwZTogc3RyaW5nOyBba2V5OiBzdHJpbmddOiB1bmtub3duOyB9XG50eXBlIEltcGVyYXRpdmVBcGkgPSB7IGdldEFwcFN0YXRlPzogKCkgPT4geyBhY3RpdmVUb29sPzogQWN0aXZlVG9vbFNuYXBzaG90IH07IHNldEFjdGl2ZVRvb2w/OiAodG9vbDogQWN0aXZlVG9vbFNuYXBzaG90KSA9PiB2b2lkIH07XG5cbi8qKiBDb21wYXRpYmlsaXR5IGJvdW5kYXJ5IGZvciB0aGUgb3B0aW9uYWwgRXhjYWxpZHJhdyBwbHVnaW4uICovXG5leHBvcnQgY2xhc3MgRXhjYWxpZHJhd0JyaWRnZSB7XG4gIHByaXZhdGUgd2FybmVkID0gZmFsc2U7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgYXBwOiBBcHAsIHByaXZhdGUgcmVhZG9ubHkgbGVhZjogV29ya3NwYWNlTGVhZikge31cblxuICBzdGFydFRlbXBvcmFyeUVyYXNlcigpOiBBY3RpdmVUb29sU25hcHNob3QgfCBudWxsIHtcbiAgICBjb25zdCBhcGkgPSB0aGlzLmdldEFwaSgpO1xuICAgIGNvbnN0IHRvb2wgPSBhcGk/LmdldEFwcFN0YXRlPy4oKS5hY3RpdmVUb29sO1xuICAgIGlmICghYXBpPy5zZXRBY3RpdmVUb29sIHx8ICF0b29sKSByZXR1cm4gbnVsbDtcbiAgICBhcGkuc2V0QWN0aXZlVG9vbCh7IHR5cGU6IFwiZXJhc2VyXCIgfSk7XG4gICAgcmV0dXJuIHsgLi4udG9vbCB9O1xuICB9XG4gIHJlc3RvcmVUb29sKHRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGFwaSA9IHRoaXMuZ2V0QXBpKCk7XG4gICAgaWYgKCFhcGk/LnNldEFjdGl2ZVRvb2wpIHJldHVybiBmYWxzZTtcbiAgICBhcGkuc2V0QWN0aXZlVG9vbCh0b29sKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBzZXRUb29sKHR5cGU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGFwaSA9IHRoaXMuZ2V0QXBpKCk7XG4gICAgaWYgKCFhcGk/LnNldEFjdGl2ZVRvb2wpIHJldHVybiBmYWxzZTtcbiAgICBhcGkuc2V0QWN0aXZlVG9vbCh7IHR5cGUgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgY29weVNlbGVjdGVkRWxlbWVudHMoKTogdm9pZCB7IHRoaXMudW5zdXBwb3J0ZWQoXCJDb3B5IHJlcXVpcmVzIGEgY29tcGF0aWJsZSBFeGNhbGlkcmF3IEFQSS5cIik7IH1cbiAgcGFzdGVBdChfcG9pbnQ6IFBvaW50KTogdm9pZCB7IHRoaXMudW5zdXBwb3J0ZWQoXCJQYXN0ZSByZXF1aXJlcyBhIGNvbXBhdGlibGUgRXhjYWxpZHJhdyBBUEkuXCIpOyB9XG5cbiAgcHJpdmF0ZSBnZXRBcGkoKTogSW1wZXJhdGl2ZUFwaSB8IG51bGwge1xuICAgIC8vIEV4Y2FsaWRyYXcgZXhwb3NlcyBubyBzdGFibGUgQ29tbXVuaXR5IFBsdWdpbiBBUEkgZm9yIHRoaXMgcGF0aC4gS2VlcCB0aGlzXG4gICAgLy8gb3B0aW9uYWwgY2FwYWJpbGl0eSBwcm9iZSBpc29sYXRlZCB1bnRpbCBhIGRvY3VtZW50ZWQgbGVhZi1hd2FyZSBBUEkgZXhpc3RzLlxuICAgIGNvbnN0IHZpZXcgPSB0aGlzLmxlYWYudmlldyBhcyB1bmtub3duIGFzIHsgZXhjYWxpZHJhd0FQST86IEltcGVyYXRpdmVBcGkgfTtcbiAgICByZXR1cm4gdmlldy5leGNhbGlkcmF3QVBJID8/IG51bGw7XG4gIH1cbiAgcHJpdmF0ZSB1bnN1cHBvcnRlZChtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMud2FybmVkKSB7IG5ldyBOb3RpY2UoYEV4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzOiAke21lc3NhZ2V9YCk7IHRoaXMud2FybmVkID0gdHJ1ZTsgfVxuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBOb3JtYWxpemVkU3R5bHVzRXZlbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBEZWJ1Z0xvZ2dlciB7XG4gIHByaXZhdGUgdHJhY2U6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudFtdID0gW107XG4gIHByaXZhdGUgbGFzdE1vdmVMb2dBdCA9IC1JbmZpbml0eTtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBlbmFibGVkOiAoKSA9PiBib29sZWFuKSB7fVxuXG4gIGV2ZW50KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCgpKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwibW92ZVwiICYmIGV2ZW50LnRpbWVzdGFtcCAtIHRoaXMubGFzdE1vdmVMb2dBdCA8IDEwMCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5raW5kID09PSBcIm1vdmVcIikgdGhpcy5sYXN0TW92ZUxvZ0F0ID0gZXZlbnQudGltZXN0YW1wO1xuICAgIHRoaXMudHJhY2UucHVzaChldmVudCk7XG4gICAgaWYgKHRoaXMudHJhY2UubGVuZ3RoID4gMTAwKSB0aGlzLnRyYWNlLnNoaWZ0KCk7XG4gICAgY29uc29sZS5kZWJ1ZyhcIltFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9sc11cIiwgZXZlbnQpO1xuICB9XG4gIG1lc3NhZ2UobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7IGlmICh0aGlzLmVuYWJsZWQoKSkgY29uc29sZS5kZWJ1ZyhcIltFeGNhbGlkcmF3IFN0eWx1cyBDb250cm9sc11cIiwgbWVzc2FnZSk7IH1cbiAgZXhwb3J0VHJhY2UoKTogc3RyaW5nIHsgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMudHJhY2UsIG51bGwsIDIpOyB9XG4gIGNsZWFyKCk6IHZvaWQgeyB0aGlzLnRyYWNlID0gW107IH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgU3R5bHVzRXZlbnRLaW5kIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuY29uc3QgZXZlbnRLaW5kczogUmVjb3JkPHN0cmluZywgU3R5bHVzRXZlbnRLaW5kPiA9IHtcbiAgcG9pbnRlcmRvd246IFwiZG93blwiLCBwb2ludGVybW92ZTogXCJtb3ZlXCIsIHBvaW50ZXJ1cDogXCJ1cFwiLFxuICBwb2ludGVyY2FuY2VsOiBcImNhbmNlbFwiLCBjb250ZXh0bWVudTogXCJjb250ZXh0bWVudVwiLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVBvaW50ZXJFdmVudChldmVudDogUG9pbnRlckV2ZW50LCBpc0NhbnZhc1RhcmdldDogYm9vbGVhbik6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCB7XG4gIHJldHVybiB7XG4gICAga2luZDogZXZlbnRLaW5kc1tldmVudC50eXBlXSA/PyBcIm1vdmVcIixcbiAgICBwb2ludGVyVHlwZTogZXZlbnQucG9pbnRlclR5cGUsXG4gICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgYnV0dG9uczogZXZlbnQuYnV0dG9ucyxcbiAgICBidXR0b246IGV2ZW50LmJ1dHRvbixcbiAgICBwcmVzc3VyZTogZXZlbnQucHJlc3N1cmUsXG4gICAgeDogZXZlbnQuY2xpZW50WCxcbiAgICB5OiBldmVudC5jbGllbnRZLFxuICAgIHRpbWVzdGFtcDogZXZlbnQudGltZVN0YW1wLFxuICAgIGlzQ2FudmFzVGFyZ2V0LFxuICB9O1xufVxuIiwgImltcG9ydCB0eXBlIHsgR2VzdHVyZUVmZmVjdCwgR2VzdHVyZVNldHRpbmdzLCBOb3JtYWxpemVkU3R5bHVzRXZlbnQsIFBvaW50LCBTY2hlZHVsZXIgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5pbnRlcmZhY2UgUGVuZGluZ1RhcCB7IHBvaW50OiBQb2ludDsgdGltZXI6IHVua25vd247IH1cblxuLyoqIFB1cmUgcGVyLXZpZXcgUyBQZW4gZ2VzdHVyZSBwb2xpY3kuIEl0IG5ldmVyIHRvdWNoZXMgdGhlIERPTSBvciBFeGNhbGlkcmF3LiAqL1xuZXhwb3J0IGNsYXNzIFN0eWx1c0dlc3R1cmVNYWNoaW5lIHtcbiAgcHJpdmF0ZSBiYXJyZWxCdXR0b25IZWxkID0gZmFsc2U7XG4gIHByaXZhdGUgcGVuQ29udGFjdCA9IGZhbHNlO1xuICBwcml2YXRlIGNvbnN1bWVkID0gZmFsc2U7XG4gIHByaXZhdGUgbW92ZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBob2xkRmlyZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSB0ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gIHByaXZhdGUgcHJlc3NPcmlnaW46IFBvaW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaG9sZFRpbWVyOiB1bmtub3duIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGVuZGluZ1RhcDogUGVuZGluZ1RhcCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGFjdGl2ZVBvaW50ZXJJZDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogR2VzdHVyZVNldHRpbmdzLCBwcml2YXRlIHJlYWRvbmx5IHNjaGVkdWxlcjogU2NoZWR1bGVyKSB7fVxuXG4gIGhhbmRsZShldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50KTogR2VzdHVyZUVmZmVjdFtdIHtcbiAgICBpZiAoZXZlbnQucG9pbnRlclR5cGUgIT09IFwicGVuXCIpIHJldHVybiBbXTtcbiAgICBjb25zdCBlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10gPSBbXTtcbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJjb250ZXh0bWVudVwiKSB7XG4gICAgICBpZiAodGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlIHx8ICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgdGhpcy5wZW5Db250YWN0KSkgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJzdXBwcmVzcy1jb250ZXh0LW1lbnVcIiB9KTtcbiAgICAgIHJldHVybiBlZmZlY3RzO1xuICAgIH1cblxuICAgIGlmIChldmVudC5raW5kID09PSBcImRvd25cIikge1xuICAgICAgdGhpcy5wZW5Db250YWN0ID0gdHJ1ZTtcbiAgICAgIHRoaXMuYWN0aXZlUG9pbnRlcklkID0gZXZlbnQucG9pbnRlcklkO1xuICAgICAgaWYgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCkgdGhpcy5jb25zdW1lRm9yQ29udGFjdChldmVudCwgZWZmZWN0cyk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJ1cFwiIHx8IGV2ZW50LmtpbmQgPT09IFwiY2FuY2VsXCIpIHtcbiAgICAgIGlmICh0aGlzLmFjdGl2ZVBvaW50ZXJJZCAhPT0gbnVsbCAmJiBldmVudC5wb2ludGVySWQgIT09IHRoaXMuYWN0aXZlUG9pbnRlcklkKSByZXR1cm4gZWZmZWN0cztcbiAgICAgIHRoaXMucGVuQ29udGFjdCA9IGZhbHNlO1xuICAgICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBudWxsO1xuICAgICAgaWYgKHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkge1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJ0ZW1wb3JhcnktdG9vbC1lbmRcIiB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChldmVudC5raW5kID09PSBcImNhbmNlbFwiKSB0aGlzLmNhbmNlbFByZXNzKCk7XG4gICAgICByZXR1cm4gZWZmZWN0cztcbiAgICB9XG5cbiAgICAvLyBIb3ZlciBtb3ZlbWVudCBpcyB0aGUgb25seSBldmlkZW5jZSB1c2VkIHRvIGludGVycHJldCBidXR0b25zIGFzIGJhcnJlbCBzdGF0ZS5cbiAgICBpZiAodGhpcy5wZW5Db250YWN0KSByZXR1cm4gZWZmZWN0cztcbiAgICBjb25zdCBoZWxkTm93ID0gKGV2ZW50LmJ1dHRvbnMgJiAxKSAhPT0gMDtcbiAgICBpZiAoIXRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiBoZWxkTm93KSB0aGlzLnN0YXJ0UHJlc3MoZXZlbnQpO1xuICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgaGVsZE5vdykgdGhpcy50cmFja0hvdmVyTW92ZW1lbnQoZXZlbnQpO1xuICAgIGlmICh0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgJiYgIWhlbGROb3cpIHRoaXMucmVsZWFzZVByZXNzKGVmZmVjdHMpO1xuICAgIHJldHVybiBlZmZlY3RzO1xuICB9XG5cbiAgZGlzcG9zZSgpOiBHZXN0dXJlRWZmZWN0W10ge1xuICAgIGNvbnN0IGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSA9IFtdO1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgIGlmICh0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUpIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtZW5kXCIgfSk7XG4gICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5jYW5jZWxQcmVzcygpO1xuICAgIHJldHVybiBlZmZlY3RzO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGFydFByZXNzKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgPSB0cnVlO1xuICAgIHRoaXMuY29uc3VtZWQgPSBmYWxzZTtcbiAgICB0aGlzLm1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5ob2xkRmlyZWQgPSBmYWxzZTtcbiAgICB0aGlzLnByZXNzT3JpZ2luID0geyB4OiBldmVudC54LCB5OiBldmVudC55IH07XG4gICAgdGhpcy5ob2xkVGltZXIgPSB0aGlzLnNjaGVkdWxlci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmICghdGhpcy5iYXJyZWxCdXR0b25IZWxkIHx8IHRoaXMucGVuQ29udGFjdCB8fCB0aGlzLm1vdmVkIHx8IHRoaXMuY29uc3VtZWQgfHwgIXRoaXMucHJlc3NPcmlnaW4pIHJldHVybjtcbiAgICAgIHRoaXMuaG9sZEZpcmVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY29uc3VtZWQgPSB0cnVlO1xuICAgICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgICB0aGlzLm9uRWZmZWN0Py4oeyB0eXBlOiBcImJ1dHRvbi1ob2xkXCIsIHBvaW50OiB0aGlzLnByZXNzT3JpZ2luIH0pO1xuICAgIH0sIHRoaXMuc2V0dGluZ3MubG9uZ1ByZXNzTXMpO1xuICB9XG5cbiAgLyoqIENvbnRyb2xsZXIgcmVnaXN0ZXJzIHRoaXMgc28gc2NoZWR1bGVyIGNhbGxiYWNrcyByZXRhaW4gcHVyZSBzZW1hbnRpYyBvdXRwdXQuICovXG4gIHByaXZhdGUgb25FZmZlY3Q6ICgoZWZmZWN0OiBHZXN0dXJlRWZmZWN0KSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICBzZXRFZmZlY3RTaW5rKHNpbms6IChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QpID0+IHZvaWQpOiB2b2lkIHsgdGhpcy5vbkVmZmVjdCA9IHNpbms7IH1cblxuICBwcml2YXRlIHRyYWNrSG92ZXJNb3ZlbWVudChldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnByZXNzT3JpZ2luIHx8IHRoaXMubW92ZWQpIHJldHVybjtcbiAgICBjb25zdCBkeCA9IGV2ZW50LnggLSB0aGlzLnByZXNzT3JpZ2luLng7XG4gICAgY29uc3QgZHkgPSBldmVudC55IC0gdGhpcy5wcmVzc09yaWdpbi55O1xuICAgIGlmIChNYXRoLmh5cG90KGR4LCBkeSkgPiB0aGlzLnNldHRpbmdzLm1vdmVtZW50VGhyZXNob2xkUHgpIHtcbiAgICAgIHRoaXMubW92ZWQgPSB0cnVlO1xuICAgICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjb25zdW1lRm9yQ29udGFjdChldmVudDogTm9ybWFsaXplZFN0eWx1c0V2ZW50LCBlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10pOiB2b2lkIHtcbiAgICB0aGlzLmNvbnN1bWVkID0gdHJ1ZTtcbiAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5idXR0b25Db250YWN0QWN0aW9uID09PSBcImVyYXNlclwiICYmICF0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUpIHtcbiAgICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IHRydWU7XG4gICAgICBlZmZlY3RzLnB1c2goeyB0eXBlOiBcInRlbXBvcmFyeS10b29sLXN0YXJ0XCIsIHBvaW50OiB7IHg6IGV2ZW50LngsIHk6IGV2ZW50LnkgfSB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbGVhc2VQcmVzcyhlZmZlY3RzOiBHZXN0dXJlRWZmZWN0W10pOiB2b2lkIHtcbiAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgPSBmYWxzZTtcbiAgICBpZiAoIXRoaXMuY29uc3VtZWQgJiYgIXRoaXMubW92ZWQgJiYgIXRoaXMuaG9sZEZpcmVkICYmIHRoaXMucHJlc3NPcmlnaW4pIHtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdUYXApIHtcbiAgICAgICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwiYnV0dG9uLWRvdWJsZS10YXBcIiwgcG9pbnQ6IHRoaXMucHJlc3NPcmlnaW4gfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwb2ludCA9IHRoaXMucHJlc3NPcmlnaW47XG4gICAgICAgIGNvbnN0IHRpbWVyID0gdGhpcy5zY2hlZHVsZXIuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5wZW5kaW5nVGFwID0gbnVsbDtcbiAgICAgICAgICB0aGlzLm9uRWZmZWN0Py4oeyB0eXBlOiBcImJ1dHRvbi10YXBcIiwgcG9pbnQgfSk7XG4gICAgICAgIH0sIHRoaXMuc2V0dGluZ3MuZG91YmxlVGFwTXMpO1xuICAgICAgICB0aGlzLnBlbmRpbmdUYXAgPSB7IHBvaW50LCB0aW1lciB9O1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnByZXNzT3JpZ2luID0gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgY2FuY2VsUHJlc3MoKTogdm9pZCB7XG4gICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgdGhpcy5iYXJyZWxCdXR0b25IZWxkID0gZmFsc2U7XG4gICAgdGhpcy5wZW5Db250YWN0ID0gZmFsc2U7XG4gICAgdGhpcy5jb25zdW1lZCA9IGZhbHNlO1xuICAgIHRoaXMubW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmhvbGRGaXJlZCA9IGZhbHNlO1xuICAgIHRoaXMucHJlc3NPcmlnaW4gPSBudWxsO1xuICAgIHRoaXMuYWN0aXZlUG9pbnRlcklkID0gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgY2FuY2VsVGltZXIod2hpY2g6IFwiaG9sZFwiKTogdm9pZCB7XG4gICAgaWYgKHdoaWNoID09PSBcImhvbGRcIiAmJiB0aGlzLmhvbGRUaW1lciAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5zY2hlZHVsZXIuY2xlYXJUaW1lb3V0KHRoaXMuaG9sZFRpbWVyKTtcbiAgICAgIHRoaXMuaG9sZFRpbWVyID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNhbmNlbFBlbmRpbmdUYXAoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucGVuZGluZ1RhcCkgdGhpcy5zY2hlZHVsZXIuY2xlYXJUaW1lb3V0KHRoaXMucGVuZGluZ1RhcC50aW1lcik7XG4gICAgdGhpcy5wZW5kaW5nVGFwID0gbnVsbDtcbiAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgeyBFeGNhbGlkcmF3QnJpZGdlLCBBY3RpdmVUb29sU25hcHNob3QgfSBmcm9tIFwiLi4vZXhjYWxpZHJhdy9FeGNhbGlkcmF3QnJpZGdlXCI7XG5pbXBvcnQgdHlwZSB7IERlYnVnTG9nZ2VyIH0gZnJvbSBcIi4uL2RlYnVnL0RlYnVnTG9nZ2VyXCI7XG5pbXBvcnQgdHlwZSB7IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgfSBmcm9tIFwiLi4vc2V0dGluZ3Mvc2V0dGluZ3NcIjtcbmltcG9ydCB7IG5vcm1hbGl6ZVBvaW50ZXJFdmVudCB9IGZyb20gXCIuL25vcm1hbGl6ZVBvaW50ZXJFdmVudFwiO1xuaW1wb3J0IHsgU3R5bHVzR2VzdHVyZU1hY2hpbmUgfSBmcm9tIFwiLi9TdHlsdXNHZXN0dXJlTWFjaGluZVwiO1xuaW1wb3J0IHR5cGUgeyBHZXN0dXJlRWZmZWN0LCBQb2ludCwgU2NoZWR1bGVyIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IHR5cGUgQWN0aW9uSGFuZGxlciA9IChhY3Rpb246IFwibWVudVwiIHwgXCJjb3B5XCIgfCBcInBhc3RlXCIgfCBcIm5vbmVcIiwgcG9pbnQ6IFBvaW50LCBicmlkZ2U6IEV4Y2FsaWRyYXdCcmlkZ2UpID0+IHZvaWQ7XG5cbmV4cG9ydCBjbGFzcyBTdHlsdXNDb250cm9sbGVyIHtcbiAgcHJpdmF0ZSByZWFkb25seSBtYWNoaW5lOiBTdHlsdXNHZXN0dXJlTWFjaGluZTtcbiAgcHJpdmF0ZSBzYXZlZFRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRpc3Bvc2VkID0gZmFsc2U7XG4gIHByaXZhdGUgcmVhZG9ubHkgbGlzdGVuZXJzOiBBcnJheTxba2V5b2YgSFRNTEVsZW1lbnRFdmVudE1hcCwgRXZlbnRMaXN0ZW5lcl0+ID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBsZWFmOiBXb3Jrc3BhY2VMZWFmLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgYnJpZGdlOiBFeGNhbGlkcmF3QnJpZGdlLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2V0dGluZ3M6ICgpID0+IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MsXG4gICAgcHJpdmF0ZSByZWFkb25seSBkZWJ1ZzogRGVidWdMb2dnZXIsXG4gICAgcHJpdmF0ZSByZWFkb25seSBkaXNwYXRjaEFjdGlvbjogQWN0aW9uSGFuZGxlcixcbiAgICBzY2hlZHVsZXI6IFNjaGVkdWxlciA9IHdpbmRvdyxcbiAgKSB7XG4gICAgdGhpcy5tYWNoaW5lID0gbmV3IFN0eWx1c0dlc3R1cmVNYWNoaW5lKHRoaXMuZ2VzdHVyZVNldHRpbmdzKCksIHNjaGVkdWxlcik7XG4gICAgdGhpcy5tYWNoaW5lLnNldEVmZmVjdFNpbmsoKGVmZmVjdCkgPT4gdGhpcy5hcHBseUVmZmVjdChlZmZlY3QpKTtcbiAgfVxuXG4gIGF0dGFjaCgpOiB2b2lkIHtcbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWw7XG4gICAgZm9yIChjb25zdCB0eXBlIG9mIFtcInBvaW50ZXJkb3duXCIsIFwicG9pbnRlcm1vdmVcIiwgXCJwb2ludGVydXBcIiwgXCJwb2ludGVyY2FuY2VsXCIsIFwiY29udGV4dG1lbnVcIl0gYXMgY29uc3QpIHtcbiAgICAgIGNvbnN0IGxpc3RlbmVyOiBFdmVudExpc3RlbmVyID0gKHJhdykgPT4gdGhpcy5vblBvaW50ZXJFdmVudChyYXcgYXMgUG9pbnRlckV2ZW50KTtcbiAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgdHJ1ZSk7XG4gICAgICB0aGlzLmxpc3RlbmVycy5wdXNoKFt0eXBlLCBsaXN0ZW5lcl0pO1xuICAgIH1cbiAgfVxuXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZGlzcG9zZWQpIHJldHVybjtcbiAgICB0aGlzLmRpc3Bvc2VkID0gdHJ1ZTtcbiAgICBmb3IgKGNvbnN0IFt0eXBlLCBsaXN0ZW5lcl0gb2YgdGhpcy5saXN0ZW5lcnMpIHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICAgIHRoaXMubGlzdGVuZXJzLmxlbmd0aCA9IDA7XG4gICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgdGhpcy5tYWNoaW5lLmRpc3Bvc2UoKSkgdGhpcy5hcHBseUVmZmVjdChlZmZlY3QpO1xuICB9XG4gIGdldFRyYWNlKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLmRlYnVnLmV4cG9ydFRyYWNlKCk7IH1cblxuICBwcml2YXRlIG9uUG9pbnRlckV2ZW50KHJhdzogUG9pbnRlckV2ZW50KTogdm9pZCB7XG4gICAgaWYgKHJhdy5wb2ludGVyVHlwZSAhPT0gXCJwZW5cIikgcmV0dXJuO1xuICAgIGNvbnN0IGV2ZW50ID0gbm9ybWFsaXplUG9pbnRlckV2ZW50KHJhdywgdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWwuY29udGFpbnMocmF3LnRhcmdldCBhcyBOb2RlKSk7XG4gICAgdGhpcy5kZWJ1Zy5ldmVudChldmVudCk7XG4gICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgdGhpcy5tYWNoaW5lLmhhbmRsZShldmVudCkpIHtcbiAgICAgIGlmIChlZmZlY3QudHlwZSA9PT0gXCJzdXBwcmVzcy1jb250ZXh0LW1lbnVcIikgcmF3LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLmFwcGx5RWZmZWN0KGVmZmVjdCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBseUVmZmVjdChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QpOiB2b2lkIHtcbiAgICBzd2l0Y2ggKGVmZmVjdC50eXBlKSB7XG4gICAgICBjYXNlIFwidGVtcG9yYXJ5LXRvb2wtc3RhcnRcIjpcbiAgICAgICAgaWYgKCF0aGlzLnNhdmVkVG9vbCkgdGhpcy5zYXZlZFRvb2wgPSB0aGlzLmJyaWRnZS5zdGFydFRlbXBvcmFyeUVyYXNlcigpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJ0ZW1wb3JhcnktdG9vbC1lbmRcIjpcbiAgICAgICAgaWYgKHRoaXMuc2F2ZWRUb29sKSB0aGlzLmJyaWRnZS5yZXN0b3JlVG9vbCh0aGlzLnNhdmVkVG9vbCk7XG4gICAgICAgIHRoaXMuc2F2ZWRUb29sID0gbnVsbDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiYnV0dG9uLXRhcFwiOiB0aGlzLmRpc3BhdGNoQWN0aW9uKHRoaXMuc2V0dGluZ3MoKS5idXR0b25UYXBBY3Rpb24sIGVmZmVjdC5wb2ludCwgdGhpcy5icmlkZ2UpOyBicmVhaztcbiAgICAgIGNhc2UgXCJidXR0b24tZG91YmxlLXRhcFwiOiB0aGlzLmRpc3BhdGNoQWN0aW9uKHRoaXMuc2V0dGluZ3MoKS5idXR0b25Eb3VibGVUYXBBY3Rpb24sIGVmZmVjdC5wb2ludCwgdGhpcy5icmlkZ2UpOyBicmVhaztcbiAgICAgIGNhc2UgXCJidXR0b24taG9sZFwiOiB0aGlzLmRpc3BhdGNoQWN0aW9uKHRoaXMuc2V0dGluZ3MoKS5idXR0b25Ib2xkQWN0aW9uLCBlZmZlY3QucG9pbnQsIHRoaXMuYnJpZGdlKTsgYnJlYWs7XG4gICAgICBkZWZhdWx0OiBicmVhaztcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdlc3R1cmVTZXR0aW5ncygpIHtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMuc2V0dGluZ3MoKTtcbiAgICByZXR1cm4geyBidXR0b25Db250YWN0QWN0aW9uOiB2YWx1ZS5idXR0b25Db250YWN0QWN0aW9uLCBkb3VibGVUYXBNczogdmFsdWUuZG91YmxlVGFwTXMsIGxvbmdQcmVzc01zOiB2YWx1ZS5sb25nUHJlc3NNcywgbW92ZW1lbnRUaHJlc2hvbGRQeDogdmFsdWUubW92ZW1lbnRUaHJlc2hvbGRQeCB9IGFzIGNvbnN0O1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBBcHAsIFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IEV4Y2FsaWRyYXdCcmlkZ2UgfSBmcm9tIFwiLi4vZXhjYWxpZHJhdy9FeGNhbGlkcmF3QnJpZGdlXCI7XG5pbXBvcnQgeyBEZWJ1Z0xvZ2dlciB9IGZyb20gXCIuLi9kZWJ1Zy9EZWJ1Z0xvZ2dlclwiO1xuaW1wb3J0IHR5cGUgeyBTdHlsdXNDb250cm9sc1NldHRpbmdzIH0gZnJvbSBcIi4uL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBTdHlsdXNDb250cm9sbGVyLCB0eXBlIEFjdGlvbkhhbmRsZXIgfSBmcm9tIFwiLi9TdHlsdXNDb250cm9sbGVyXCI7XG5cbmV4cG9ydCBjbGFzcyBTdHlsdXNWaWV3UmVnaXN0cnkge1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbnRyb2xsZXJzID0gbmV3IE1hcDxXb3Jrc3BhY2VMZWFmLCBTdHlsdXNDb250cm9sbGVyPigpO1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGFwcDogQXBwLCBwcml2YXRlIHJlYWRvbmx5IHNldHRpbmdzOiAoKSA9PiBTdHlsdXNDb250cm9sc1NldHRpbmdzLCBwcml2YXRlIHJlYWRvbmx5IGFjdGlvbkhhbmRsZXI6IEFjdGlvbkhhbmRsZXIpIHt9XG5cbiAgc3luYygpOiB2b2lkIHtcbiAgICBjb25zdCBsZWF2ZXMgPSBuZXcgU2V0KHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoXCJleGNhbGlkcmF3XCIpKTtcbiAgICBmb3IgKGNvbnN0IGxlYWYgb2YgbGVhdmVzKSBpZiAoIXRoaXMuY29udHJvbGxlcnMuaGFzKGxlYWYpKSB7XG4gICAgICBjb25zdCBkZWJ1ZyA9IG5ldyBEZWJ1Z0xvZ2dlcigoKSA9PiB0aGlzLnNldHRpbmdzKCkuZGVidWdNb2RlKTtcbiAgICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgU3R5bHVzQ29udHJvbGxlcihsZWFmLCBuZXcgRXhjYWxpZHJhd0JyaWRnZSh0aGlzLmFwcCwgbGVhZiksIHRoaXMuc2V0dGluZ3MsIGRlYnVnLCB0aGlzLmFjdGlvbkhhbmRsZXIpO1xuICAgICAgY29udHJvbGxlci5hdHRhY2goKTtcbiAgICAgIHRoaXMuY29udHJvbGxlcnMuc2V0KGxlYWYsIGNvbnRyb2xsZXIpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtsZWFmLCBjb250cm9sbGVyXSBvZiB0aGlzLmNvbnRyb2xsZXJzKSBpZiAoIWxlYXZlcy5oYXMobGVhZikpIHsgY29udHJvbGxlci5kaXNwb3NlKCk7IHRoaXMuY29udHJvbGxlcnMuZGVsZXRlKGxlYWYpOyB9XG4gIH1cbiAgZGlzcG9zZSgpOiB2b2lkIHsgZm9yIChjb25zdCBjb250cm9sbGVyIG9mIHRoaXMuY29udHJvbGxlcnMudmFsdWVzKCkpIGNvbnRyb2xsZXIuZGlzcG9zZSgpOyB0aGlzLmNvbnRyb2xsZXJzLmNsZWFyKCk7IH1cbiAgcmVmcmVzaCgpOiB2b2lkIHsgdGhpcy5kaXNwb3NlKCk7IHRoaXMuc3luYygpOyB9XG4gIGV4cG9ydFRyYWNlcygpOiBzdHJpbmcgeyByZXR1cm4gSlNPTi5zdHJpbmdpZnkoWy4uLnRoaXMuY29udHJvbGxlcnMuZW50cmllcygpXS5tYXAoKFtsZWFmLCBjb250cm9sbGVyXSkgPT4gKHsgbGVhZjogbGVhZi5nZXREaXNwbGF5VGV4dCgpLCBldmVudHM6IEpTT04ucGFyc2UoY29udHJvbGxlci5nZXRUcmFjZSgpKSB9KSksIG51bGwsIDIpOyB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUFBQSxtQkFBK0I7OztBQ0d4QixJQUFNLGFBQU4sTUFBaUI7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
