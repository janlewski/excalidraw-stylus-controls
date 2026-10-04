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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL21lbnUvU3R5bHVzTWVudS50cyIsICJzcmMvc2V0dGluZ3MvU2V0dGluZ3NUYWIudHMiLCAic3JjL3NldHRpbmdzL3NldHRpbmdzLnRzIiwgInNyYy9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2UudHMiLCAic3JjL2RlYnVnL0RlYnVnTG9nZ2VyLnRzIiwgInNyYy9zdHlsdXMvbm9ybWFsaXplUG9pbnRlckV2ZW50LnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzR2VzdHVyZU1hY2hpbmUudHMiLCAic3JjL3N0eWx1cy9TdHlsdXNDb250cm9sbGVyLnRzIiwgInNyYy9zdHlsdXMvU3R5bHVzVmlld1JlZ2lzdHJ5LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBOb3RpY2UsIFBsdWdpbiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgU3R5bHVzTWVudSB9IGZyb20gXCIuL21lbnUvU3R5bHVzTWVudVwiO1xuaW1wb3J0IHsgU2V0dGluZ3NUYWIgfSBmcm9tIFwiLi9zZXR0aW5ncy9TZXR0aW5nc1RhYlwiO1xuaW1wb3J0IHsgREVGQVVMVF9TRVRUSU5HUywgbm9ybWFsaXplU2V0dGluZ3MsIHR5cGUgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB9IGZyb20gXCIuL3NldHRpbmdzL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBTdHlsdXNWaWV3UmVnaXN0cnkgfSBmcm9tIFwiLi9zdHlsdXMvU3R5bHVzVmlld1JlZ2lzdHJ5XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0eWx1c0NvbnRyb2xzUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuICBwcml2YXRlIHJlZ2lzdHJ5OiBTdHlsdXNWaWV3UmVnaXN0cnkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByZWFkb25seSBtZW51ID0gbmV3IFN0eWx1c01lbnUoKTtcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IG5vcm1hbGl6ZVNldHRpbmdzKGF3YWl0IHRoaXMubG9hZERhdGEoKSA/PyB7fSk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTZXR0aW5nc1RhYih0aGlzKSk7XG4gICAgdGhpcy5yZWdpc3RyeSA9IG5ldyBTdHlsdXNWaWV3UmVnaXN0cnkodGhpcy5hcHAsICgpID0+IHRoaXMuc2V0dGluZ3MsIChhY3Rpb24sIHBvaW50LCBicmlkZ2UpID0+IHtcbiAgICAgIGlmIChhY3Rpb24gPT09IFwibWVudVwiKSB0aGlzLm1lbnUub3Blbihwb2ludCwgYnJpZGdlKTtcbiAgICAgIGVsc2UgaWYgKGFjdGlvbiA9PT0gXCJjb3B5XCIpIGJyaWRnZS5jb3B5U2VsZWN0ZWRFbGVtZW50cygpO1xuICAgICAgZWxzZSBpZiAoYWN0aW9uID09PSBcInBhc3RlXCIpIGJyaWRnZS5wYXN0ZUF0KHBvaW50KTtcbiAgICB9KTtcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAud29ya3NwYWNlLm9uKFwibGF5b3V0LWNoYW5nZVwiLCAoKSA9PiB0aGlzLnJlZ2lzdHJ5Py5zeW5jKCkpKTtcbiAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub25MYXlvdXRSZWFkeSgoKSA9PiB0aGlzLnJlZ2lzdHJ5Py5zeW5jKCkpO1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiBcImNvcHktc3R5bHVzLWV2ZW50LXRyYWNlXCIsIG5hbWU6IFwiQ29weSBsYXRlc3Qgc3R5bHVzIGV2ZW50IHRyYWNlXCIsIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCB0cmFjZSA9IHRoaXMucmVnaXN0cnk/LmV4cG9ydFRyYWNlcygpID8/IFwiW11cIjtcbiAgICAgIHRyeSB7IGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHRyYWNlKTsgbmV3IE5vdGljZShcIlN0eWx1cyBldmVudCB0cmFjZSBjb3BpZWQuXCIpOyB9XG4gICAgICBjYXRjaCB7IG5ldyBOb3RpY2UoXCJVbmFibGUgdG8gY29weSBldmVudCB0cmFjZS4gQ2hlY2sgdGhlIGRldmVsb3BlciBjb25zb2xlLlwiKTsgfVxuICAgIH19KTtcbiAgfVxuICBvbnVubG9hZCgpOiB2b2lkIHsgdGhpcy5tZW51LmNsb3NlKCk7IHRoaXMucmVnaXN0cnk/LmRpc3Bvc2UoKTsgdGhpcy5yZWdpc3RyeSA9IG51bGw7IH1cbiAgYXN5bmMgdXBkYXRlU2V0dGluZ3MocGF0Y2g6IFBhcnRpYWw8U3R5bHVzQ29udHJvbHNTZXR0aW5ncz4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnNldHRpbmdzID0gbm9ybWFsaXplU2V0dGluZ3MoeyAuLi50aGlzLnNldHRpbmdzLCAuLi5wYXRjaCB9KTtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICAgIHRoaXMucmVnaXN0cnk/LnJlZnJlc2goKTtcbiAgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgRXhjYWxpZHJhd0JyaWRnZSB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBTdHlsdXNNZW51IHtcbiAgICBwcml2YXRlIGVsZW1lbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gICAgb3Blbihwb2ludDogUG9pbnQsIGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZSk6IHZvaWQge1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIGNvbnN0IG1lbnUgPSBkb2N1bWVudC5ib2R5LmNyZWF0ZURpdih7IGNsczogXCJleGNhbGlkcmF3LXN0eWx1cy1tZW51XCIgfSk7XG4gICAgICAgIGNvbnN0IGFjdGlvbnM6IEFycmF5PFtzdHJpbmcsICgpID0+IHZvaWRdPiA9IFtcbiAgICAgICAgICAgIFtcIlNlbGVjdGlvblwiLCAoKSA9PiBicmlkZ2Uuc2V0VG9vbChcInNlbGVjdGlvblwiKV0sXG4gICAgICAgICAgICBbXCJGcmVlIGRyYXdcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJmcmVlZHJhd1wiKV0sXG4gICAgICAgICAgICBbXCJFcmFzZXJcIiwgKCkgPT4gYnJpZGdlLnNldFRvb2woXCJlcmFzZXJcIildLFxuICAgICAgICAgICAgW1wiUmVjdGFuZ2xlXCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwicmVjdGFuZ2xlXCIpXSxcbiAgICAgICAgICAgIFtcIkFycm93XCIsICgpID0+IGJyaWRnZS5zZXRUb29sKFwiYXJyb3dcIildLFxuICAgICAgICAgICAgW1wiQ29weVwiLCAoKSA9PiBicmlkZ2UuY29weVNlbGVjdGVkRWxlbWVudHMoKV0sXG4gICAgICAgICAgICBbXCJQYXN0ZVwiLCAoKSA9PiBicmlkZ2UucGFzdGVBdChwb2ludCldLFxuICAgICAgICBdO1xuICAgICAgICBmb3IgKGNvbnN0IFtuYW1lLCBjYWxsYmFja10gb2YgYWN0aW9ucykge1xuICAgICAgICAgICAgY29uc3QgYnV0dG9uID0gbWVudS5jcmVhdGVFbChcImJ1dHRvblwiLCB7XG4gICAgICAgICAgICAgICAgdGV4dDogbmFtZSxcbiAgICAgICAgICAgICAgICBjbHM6IFwiZXhjYWxpZHJhdy1zdHlsdXMtbWVudV9faXRlbVwiLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJ1cFwiLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxlZnQgPSBNYXRoLm1pbihNYXRoLm1heCg4LCBwb2ludC54KSwgd2luZG93LmlubmVyV2lkdGggLSAxODApO1xuICAgICAgICBjb25zdCB0b3AgPSBNYXRoLm1pbihNYXRoLm1heCg4LCBwb2ludC55KSwgd2luZG93LmlubmVySGVpZ2h0IC0gMzAwKTtcbiAgICAgICAgbWVudS5zZXRDc3NQcm9wcyh7IGxlZnQ6IGAke2xlZnR9cHhgLCB0b3A6IGAke3RvcH1weGAgfSk7XG4gICAgICAgIHRoaXMuZWxlbWVudCA9IG1lbnU7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KFxuICAgICAgICAgICAgKCkgPT5cbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmRvd25cIiwgdGhpcy5jbG9zZSwge1xuICAgICAgICAgICAgICAgICAgICBvbmNlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjYXB0dXJlOiB0cnVlLFxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgMCxcbiAgICAgICAgKTtcbiAgICB9XG4gICAgY2xvc2UgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIHRoaXMuZWxlbWVudD8ucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuZWxlbWVudCA9IG51bGw7XG4gICAgfTtcbn1cbiIsICJpbXBvcnQgeyBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTdHlsdXNDb250cm9sc1BsdWdpbiBmcm9tIFwiLi4vbWFpblwiO1xuaW1wb3J0IHR5cGUgeyBTdHlsdXNBY3Rpb24gfSBmcm9tIFwiLi9zZXR0aW5nc1wiO1xuXG5jb25zdCBhY3Rpb25zOiBSZWNvcmQ8U3R5bHVzQWN0aW9uLCBzdHJpbmc+ID0geyBtZW51OiBcIk9wZW4gbWVudVwiLCBjb3B5OiBcIkNvcHlcIiwgcGFzdGU6IFwiUGFzdGVcIiwgbm9uZTogXCJEbyBub3RoaW5nXCIgfTtcblxuZXhwb3J0IGNsYXNzIFNldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBTdHlsdXNDb250cm9sc1BsdWdpbikgeyBzdXBlcihwbHVnaW4uYXBwLCBwbHVnaW4pOyB9XG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpczsgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIlJlcXVpcmVzIHRoZSBFeGNhbGlkcmF3IGNvbW11bml0eSBwbHVnaW4uIENvcHkvcGFzdGUgdXNlcyBhIHByaXZhdGUgaW4tbWVtb3J5IGNsaXBib2FyZCBpbiB2ZXJzaW9uIDAuMS5cIiB9KTtcbiAgICB0aGlzLmFjdGlvbihcIlRhcFwiLCBcImJ1dHRvblRhcEFjdGlvblwiKTsgdGhpcy5hY3Rpb24oXCJEb3VibGUgdGFwXCIsIFwiYnV0dG9uRG91YmxlVGFwQWN0aW9uXCIpOyB0aGlzLmFjdGlvbihcIkhvbGRcIiwgXCJidXR0b25Ib2xkQWN0aW9uXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKFwiQnV0dG9uICsgcGVuIGNvbnRhY3RcIikuc2V0RGVzYyhcIlRlbXBvcmFyeSB0b29sIHdoaWxlIHRoZSBzaWRlIGJ1dHRvbiBpcyBoZWxkIGR1cmluZyBwZW4gY29udGFjdC5cIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IGRyb3Bkb3duLmFkZE9wdGlvbihcImVyYXNlclwiLCBcIlRlbXBvcmFyeSBlcmFzZXJcIikuYWRkT3B0aW9uKFwibm9uZVwiLCBcIkRvIG5vdGhpbmdcIikuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYnV0dG9uQ29udGFjdEFjdGlvbikub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlIGFzIFwiZXJhc2VyXCIgfCBcIm5vbmVcIiB9KSkpO1xuICAgIHRoaXMubnVtYmVyKFwiRG91YmxlLXRhcCBpbnRlcnZhbCAobXMpXCIsIFwiZG91YmxlVGFwTXNcIik7IHRoaXMubnVtYmVyKFwiTG9uZy1wcmVzcyBkZWxheSAobXMpXCIsIFwibG9uZ1ByZXNzTXNcIik7IHRoaXMubnVtYmVyKFwiTW92ZW1lbnQgdGhyZXNob2xkIChweClcIiwgXCJtb3ZlbWVudFRocmVzaG9sZFB4XCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKFwiRGVidWcgbG9nZ2luZ1wiKS5zZXREZXNjKFwiTG9ncyBib3VuZGVkIHJhdyBwZW4gZXZlbnQgdHJhY2VzIHRvIHRoZSBkZXZlbG9wZXIgY29uc29sZS5cIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4gdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlYnVnTW9kZSkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB0aGlzLnBsdWdpbi51cGRhdGVTZXR0aW5ncyh7IGRlYnVnTW9kZTogdmFsdWUgfSkpKTtcbiAgfVxuICBwcml2YXRlIGFjdGlvbihuYW1lOiBzdHJpbmcsIGtleTogXCJidXR0b25UYXBBY3Rpb25cIiB8IFwiYnV0dG9uRG91YmxlVGFwQWN0aW9uXCIgfCBcImJ1dHRvbkhvbGRBY3Rpb25cIik6IHZvaWQge1xuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGFpbmVyRWwpLnNldE5hbWUoYFMgUGVuIHNpZGUgYnV0dG9uOiAke25hbWV9YCkuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IFt2YWx1ZSwgbGFiZWxdIG9mIE9iamVjdC5lbnRyaWVzKGFjdGlvbnMpKSBkcm9wZG93bi5hZGRPcHRpb24odmFsdWUsIGxhYmVsKTtcbiAgICAgIGRyb3Bkb3duLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzW2tleV0pLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4gdGhpcy5wbHVnaW4udXBkYXRlU2V0dGluZ3MoeyBba2V5XTogdmFsdWUgYXMgU3R5bHVzQWN0aW9uIH0pKTtcbiAgICB9KTtcbiAgfVxuICBwcml2YXRlIG51bWJlcihuYW1lOiBzdHJpbmcsIGtleTogXCJkb3VibGVUYXBNc1wiIHwgXCJsb25nUHJlc3NNc1wiIHwgXCJtb3ZlbWVudFRocmVzaG9sZFB4XCIpOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRhaW5lckVsKS5zZXROYW1lKG5hbWUpLmFkZFRleHQoKHRleHQpID0+IHRleHQuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzW2tleV0pKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHRoaXMucGx1Z2luLnVwZGF0ZVNldHRpbmdzKHsgW2tleV06IE51bWJlcih2YWx1ZSkgfSkpKTtcbiAgfVxufVxuIiwgImV4cG9ydCB0eXBlIFN0eWx1c0FjdGlvbiA9IFwibWVudVwiIHwgXCJjb3B5XCIgfCBcInBhc3RlXCIgfCBcIm5vbmVcIjtcblxuZXhwb3J0IGludGVyZmFjZSBTdHlsdXNDb250cm9sc1NldHRpbmdzIHtcbiAgYnV0dG9uVGFwQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gIGJ1dHRvbkRvdWJsZVRhcEFjdGlvbjogU3R5bHVzQWN0aW9uO1xuICBidXR0b25Ib2xkQWN0aW9uOiBTdHlsdXNBY3Rpb247XG4gIGJ1dHRvbkNvbnRhY3RBY3Rpb246IFwiZXJhc2VyXCIgfCBcIm5vbmVcIjtcbiAgZG91YmxlVGFwTXM6IG51bWJlcjtcbiAgbG9uZ1ByZXNzTXM6IG51bWJlcjtcbiAgbW92ZW1lbnRUaHJlc2hvbGRQeDogbnVtYmVyO1xuICBjbGVhbnVwU3RyYXlEb3Q6IGJvb2xlYW47XG4gIGRlYnVnTW9kZTogYm9vbGVhbjtcbiAgZGVidWdPdmVybGF5OiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogU3R5bHVzQ29udHJvbHNTZXR0aW5ncyA9IHtcbiAgYnV0dG9uVGFwQWN0aW9uOiBcIm1lbnVcIiwgYnV0dG9uRG91YmxlVGFwQWN0aW9uOiBcImNvcHlcIiwgYnV0dG9uSG9sZEFjdGlvbjogXCJwYXN0ZVwiLFxuICBidXR0b25Db250YWN0QWN0aW9uOiBcImVyYXNlclwiLCBkb3VibGVUYXBNczogMzAwLCBsb25nUHJlc3NNczogNDUwLFxuICBtb3ZlbWVudFRocmVzaG9sZFB4OiA4LCBjbGVhbnVwU3RyYXlEb3Q6IHRydWUsIGRlYnVnTW9kZTogZmFsc2UsIGRlYnVnT3ZlcmxheTogZmFsc2UsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU2V0dGluZ3ModmFsdWU6IFBhcnRpYWw8U3R5bHVzQ29udHJvbHNTZXR0aW5ncz4pOiBTdHlsdXNDb250cm9sc1NldHRpbmdzIHtcbiAgY29uc3QgYWN0aW9uID0gKGNhbmRpZGF0ZTogdW5rbm93biwgZmFsbGJhY2s6IFN0eWx1c0FjdGlvbik6IFN0eWx1c0FjdGlvbiA9PlxuICAgIGNhbmRpZGF0ZSA9PT0gXCJtZW51XCIgfHwgY2FuZGlkYXRlID09PSBcImNvcHlcIiB8fCBjYW5kaWRhdGUgPT09IFwicGFzdGVcIiB8fCBjYW5kaWRhdGUgPT09IFwibm9uZVwiID8gY2FuZGlkYXRlIDogZmFsbGJhY2s7XG4gIGNvbnN0IG51bWJlciA9IChjYW5kaWRhdGU6IHVua25vd24sIGZhbGxiYWNrOiBudW1iZXIsIG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcik6IG51bWJlciA9PlxuICAgIHR5cGVvZiBjYW5kaWRhdGUgPT09IFwibnVtYmVyXCIgJiYgTnVtYmVyLmlzRmluaXRlKGNhbmRpZGF0ZSkgPyBNYXRoLm1pbihtYXgsIE1hdGgubWF4KG1pbiwgTWF0aC5yb3VuZChjYW5kaWRhdGUpKSkgOiBmYWxsYmFjaztcbiAgcmV0dXJuIHtcbiAgICBidXR0b25UYXBBY3Rpb246IGFjdGlvbih2YWx1ZS5idXR0b25UYXBBY3Rpb24sIERFRkFVTFRfU0VUVElOR1MuYnV0dG9uVGFwQWN0aW9uKSxcbiAgICBidXR0b25Eb3VibGVUYXBBY3Rpb246IGFjdGlvbih2YWx1ZS5idXR0b25Eb3VibGVUYXBBY3Rpb24sIERFRkFVTFRfU0VUVElOR1MuYnV0dG9uRG91YmxlVGFwQWN0aW9uKSxcbiAgICBidXR0b25Ib2xkQWN0aW9uOiBhY3Rpb24odmFsdWUuYnV0dG9uSG9sZEFjdGlvbiwgREVGQVVMVF9TRVRUSU5HUy5idXR0b25Ib2xkQWN0aW9uKSxcbiAgICBidXR0b25Db250YWN0QWN0aW9uOiB2YWx1ZS5idXR0b25Db250YWN0QWN0aW9uID09PSBcIm5vbmVcIiA/IFwibm9uZVwiIDogXCJlcmFzZXJcIixcbiAgICBkb3VibGVUYXBNczogbnVtYmVyKHZhbHVlLmRvdWJsZVRhcE1zLCAzMDAsIDEwMCwgMTAwMCksXG4gICAgbG9uZ1ByZXNzTXM6IG51bWJlcih2YWx1ZS5sb25nUHJlc3NNcywgNDUwLCAxNTAsIDIwMDApLFxuICAgIG1vdmVtZW50VGhyZXNob2xkUHg6IG51bWJlcih2YWx1ZS5tb3ZlbWVudFRocmVzaG9sZFB4LCA4LCAxLCAxMDApLFxuICAgIGNsZWFudXBTdHJheURvdDogdmFsdWUuY2xlYW51cFN0cmF5RG90ICE9PSBmYWxzZSxcbiAgICBkZWJ1Z01vZGU6IHZhbHVlLmRlYnVnTW9kZSA9PT0gdHJ1ZSxcbiAgICBkZWJ1Z092ZXJsYXk6IHZhbHVlLmRlYnVnT3ZlcmxheSA9PT0gdHJ1ZSxcbiAgfTtcbn1cbiIsICJpbXBvcnQgeyBOb3RpY2UsIHR5cGUgQXBwLCB0eXBlIFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vc3R5bHVzL3R5cGVzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aXZlVG9vbFNuYXBzaG90IHsgdHlwZTogc3RyaW5nOyBba2V5OiBzdHJpbmddOiB1bmtub3duOyB9XG50eXBlIEltcGVyYXRpdmVBcGkgPSB7IGdldEFwcFN0YXRlPzogKCkgPT4geyBhY3RpdmVUb29sPzogQWN0aXZlVG9vbFNuYXBzaG90IH07IHNldEFjdGl2ZVRvb2w/OiAodG9vbDogQWN0aXZlVG9vbFNuYXBzaG90KSA9PiB2b2lkIH07XG5cbi8qKiBDb21wYXRpYmlsaXR5IGJvdW5kYXJ5IGZvciB0aGUgb3B0aW9uYWwgRXhjYWxpZHJhdyBwbHVnaW4uICovXG5leHBvcnQgY2xhc3MgRXhjYWxpZHJhd0JyaWRnZSB7XG4gIHByaXZhdGUgd2FybmVkID0gZmFsc2U7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgYXBwOiBBcHAsIHByaXZhdGUgcmVhZG9ubHkgbGVhZjogV29ya3NwYWNlTGVhZikge31cblxuICBzdGFydFRlbXBvcmFyeUVyYXNlcigpOiBBY3RpdmVUb29sU25hcHNob3QgfCBudWxsIHtcbiAgICBjb25zdCBhcGkgPSB0aGlzLmdldEFwaSgpO1xuICAgIGNvbnN0IHRvb2wgPSBhcGk/LmdldEFwcFN0YXRlPy4oKS5hY3RpdmVUb29sO1xuICAgIGlmICghYXBpPy5zZXRBY3RpdmVUb29sIHx8ICF0b29sKSByZXR1cm4gbnVsbDtcbiAgICBhcGkuc2V0QWN0aXZlVG9vbCh7IHR5cGU6IFwiZXJhc2VyXCIgfSk7XG4gICAgcmV0dXJuIHsgLi4udG9vbCB9O1xuICB9XG4gIHJlc3RvcmVUb29sKHRvb2w6IEFjdGl2ZVRvb2xTbmFwc2hvdCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGFwaSA9IHRoaXMuZ2V0QXBpKCk7XG4gICAgaWYgKCFhcGk/LnNldEFjdGl2ZVRvb2wpIHJldHVybiBmYWxzZTtcbiAgICBhcGkuc2V0QWN0aXZlVG9vbCh0b29sKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBzZXRUb29sKHR5cGU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGFwaSA9IHRoaXMuZ2V0QXBpKCk7XG4gICAgaWYgKCFhcGk/LnNldEFjdGl2ZVRvb2wpIHJldHVybiBmYWxzZTtcbiAgICBhcGkuc2V0QWN0aXZlVG9vbCh7IHR5cGUgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgY29weVNlbGVjdGVkRWxlbWVudHMoKTogdm9pZCB7IHRoaXMudW5zdXBwb3J0ZWQoXCJDb3B5IHJlcXVpcmVzIGEgY29tcGF0aWJsZSBFeGNhbGlkcmF3IEFQSS5cIik7IH1cbiAgcGFzdGVBdChwb2ludDogUG9pbnQpOiB2b2lkIHsgdm9pZCBwb2ludDsgdGhpcy51bnN1cHBvcnRlZChcIlBhc3RlIHJlcXVpcmVzIGEgY29tcGF0aWJsZSBFeGNhbGlkcmF3IEFQSS5cIik7IH1cblxuICBwcml2YXRlIGdldEFwaSgpOiBJbXBlcmF0aXZlQXBpIHwgbnVsbCB7XG4gICAgLy8gRXhjYWxpZHJhdyBleHBvc2VzIG5vIHN0YWJsZSBDb21tdW5pdHkgUGx1Z2luIEFQSSBmb3IgdGhpcyBwYXRoLiBLZWVwIHRoaXNcbiAgICAvLyBvcHRpb25hbCBjYXBhYmlsaXR5IHByb2JlIGlzb2xhdGVkIHVudGlsIGEgZG9jdW1lbnRlZCBsZWFmLWF3YXJlIEFQSSBleGlzdHMuXG4gICAgY29uc3QgdmlldyA9IHRoaXMubGVhZi52aWV3IGFzIHVua25vd24gYXMgeyBleGNhbGlkcmF3QVBJPzogSW1wZXJhdGl2ZUFwaSB9O1xuICAgIHJldHVybiB2aWV3LmV4Y2FsaWRyYXdBUEkgPz8gbnVsbDtcbiAgfVxuICBwcml2YXRlIHVuc3VwcG9ydGVkKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy53YXJuZWQpIHsgbmV3IE5vdGljZShgRXhjYWxpZHJhdyBTdHlsdXMgQ29udHJvbHM6ICR7bWVzc2FnZX1gKTsgdGhpcy53YXJuZWQgPSB0cnVlOyB9XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCB9IGZyb20gXCIuLi9zdHlsdXMvdHlwZXNcIjtcblxuZXhwb3J0IGNsYXNzIERlYnVnTG9nZ2VyIHtcbiAgcHJpdmF0ZSB0cmFjZTogTm9ybWFsaXplZFN0eWx1c0V2ZW50W10gPSBbXTtcbiAgcHJpdmF0ZSBsYXN0TW92ZUxvZ0F0ID0gLUluZmluaXR5O1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGVuYWJsZWQ6ICgpID0+IGJvb2xlYW4pIHt9XG5cbiAgZXZlbnQoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5lbmFibGVkKCkpIHJldHVybjtcbiAgICBpZiAoZXZlbnQua2luZCA9PT0gXCJtb3ZlXCIgJiYgZXZlbnQudGltZXN0YW1wIC0gdGhpcy5sYXN0TW92ZUxvZ0F0IDwgMTAwKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwibW92ZVwiKSB0aGlzLmxhc3RNb3ZlTG9nQXQgPSBldmVudC50aW1lc3RhbXA7XG4gICAgdGhpcy50cmFjZS5wdXNoKGV2ZW50KTtcbiAgICBpZiAodGhpcy50cmFjZS5sZW5ndGggPiAxMDApIHRoaXMudHJhY2Uuc2hpZnQoKTtcbiAgICBjb25zb2xlLmRlYnVnKFwiW0V4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzXVwiLCBldmVudCk7XG4gIH1cbiAgbWVzc2FnZShtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHsgaWYgKHRoaXMuZW5hYmxlZCgpKSBjb25zb2xlLmRlYnVnKFwiW0V4Y2FsaWRyYXcgU3R5bHVzIENvbnRyb2xzXVwiLCBtZXNzYWdlKTsgfVxuICBleHBvcnRUcmFjZSgpOiBzdHJpbmcgeyByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy50cmFjZSwgbnVsbCwgMik7IH1cbiAgY2xlYXIoKTogdm9pZCB7IHRoaXMudHJhY2UgPSBbXTsgfVxufVxuIiwgImltcG9ydCB0eXBlIHsgTm9ybWFsaXplZFN0eWx1c0V2ZW50LCBTdHlsdXNFdmVudEtpbmQgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5jb25zdCBldmVudEtpbmRzOiBSZWNvcmQ8c3RyaW5nLCBTdHlsdXNFdmVudEtpbmQ+ID0ge1xuICBwb2ludGVyZG93bjogXCJkb3duXCIsIHBvaW50ZXJtb3ZlOiBcIm1vdmVcIiwgcG9pbnRlcnVwOiBcInVwXCIsXG4gIHBvaW50ZXJjYW5jZWw6IFwiY2FuY2VsXCIsIGNvbnRleHRtZW51OiBcImNvbnRleHRtZW51XCIsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplUG9pbnRlckV2ZW50KGV2ZW50OiBQb2ludGVyRXZlbnQsIGlzQ2FudmFzVGFyZ2V0OiBib29sZWFuKTogTm9ybWFsaXplZFN0eWx1c0V2ZW50IHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBldmVudEtpbmRzW2V2ZW50LnR5cGVdID8/IFwibW92ZVwiLFxuICAgIHBvaW50ZXJUeXBlOiBldmVudC5wb2ludGVyVHlwZSxcbiAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICBidXR0b25zOiBldmVudC5idXR0b25zLFxuICAgIGJ1dHRvbjogZXZlbnQuYnV0dG9uLFxuICAgIHByZXNzdXJlOiBldmVudC5wcmVzc3VyZSxcbiAgICB4OiBldmVudC5jbGllbnRYLFxuICAgIHk6IGV2ZW50LmNsaWVudFksXG4gICAgdGltZXN0YW1wOiBldmVudC50aW1lU3RhbXAsXG4gICAgaXNDYW52YXNUYXJnZXQsXG4gIH07XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBHZXN0dXJlRWZmZWN0LCBHZXN0dXJlU2V0dGluZ3MsIE5vcm1hbGl6ZWRTdHlsdXNFdmVudCwgUG9pbnQsIFNjaGVkdWxlciB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmludGVyZmFjZSBQZW5kaW5nVGFwIHsgcG9pbnQ6IFBvaW50OyB0aW1lcjogdW5rbm93bjsgfVxuXG4vKiogUHVyZSBwZXItdmlldyBTIFBlbiBnZXN0dXJlIHBvbGljeS4gSXQgbmV2ZXIgdG91Y2hlcyB0aGUgRE9NIG9yIEV4Y2FsaWRyYXcuICovXG5leHBvcnQgY2xhc3MgU3R5bHVzR2VzdHVyZU1hY2hpbmUge1xuICBwcml2YXRlIGJhcnJlbEJ1dHRvbkhlbGQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBwZW5Db250YWN0ID0gZmFsc2U7XG4gIHByaXZhdGUgY29uc3VtZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBtb3ZlZCA9IGZhbHNlO1xuICBwcml2YXRlIGhvbGRGaXJlZCA9IGZhbHNlO1xuICBwcml2YXRlIHRlbXBvcmFyeVRvb2xBY3RpdmUgPSBmYWxzZTtcbiAgcHJpdmF0ZSBwcmVzc09yaWdpbjogUG9pbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBob2xkVGltZXI6IHVua25vd24gfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwZW5kaW5nVGFwOiBQZW5kaW5nVGFwIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgYWN0aXZlUG9pbnRlcklkOiBudW1iZXIgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHNldHRpbmdzOiBHZXN0dXJlU2V0dGluZ3MsIHByaXZhdGUgcmVhZG9ubHkgc2NoZWR1bGVyOiBTY2hlZHVsZXIpIHt9XG5cbiAgaGFuZGxlKGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiBHZXN0dXJlRWZmZWN0W10ge1xuICAgIGlmIChldmVudC5wb2ludGVyVHlwZSAhPT0gXCJwZW5cIikgcmV0dXJuIFtdO1xuICAgIGNvbnN0IGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSA9IFtdO1xuICAgIGlmIChldmVudC5raW5kID09PSBcImNvbnRleHRtZW51XCIpIHtcbiAgICAgIGlmICh0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUgfHwgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiB0aGlzLnBlbkNvbnRhY3QpKSBlZmZlY3RzLnB1c2goeyB0eXBlOiBcInN1cHByZXNzLWNvbnRleHQtbWVudVwiIH0pO1xuICAgICAgcmV0dXJuIGVmZmVjdHM7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50LmtpbmQgPT09IFwiZG93blwiKSB7XG4gICAgICB0aGlzLnBlbkNvbnRhY3QgPSB0cnVlO1xuICAgICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBldmVudC5wb2ludGVySWQ7XG4gICAgICBpZiAodGhpcy5iYXJyZWxCdXR0b25IZWxkKSB0aGlzLmNvbnN1bWVGb3JDb250YWN0KGV2ZW50LCBlZmZlY3RzKTtcbiAgICAgIHJldHVybiBlZmZlY3RzO1xuICAgIH1cblxuICAgIGlmIChldmVudC5raW5kID09PSBcInVwXCIgfHwgZXZlbnQua2luZCA9PT0gXCJjYW5jZWxcIikge1xuICAgICAgaWYgKHRoaXMuYWN0aXZlUG9pbnRlcklkICE9PSBudWxsICYmIGV2ZW50LnBvaW50ZXJJZCAhPT0gdGhpcy5hY3RpdmVQb2ludGVySWQpIHJldHVybiBlZmZlY3RzO1xuICAgICAgdGhpcy5wZW5Db250YWN0ID0gZmFsc2U7XG4gICAgICB0aGlzLmFjdGl2ZVBvaW50ZXJJZCA9IG51bGw7XG4gICAgICBpZiAodGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlKSB7XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICBlZmZlY3RzLnB1c2goeyB0eXBlOiBcInRlbXBvcmFyeS10b29sLWVuZFwiIH0pO1xuICAgICAgfVxuICAgICAgaWYgKGV2ZW50LmtpbmQgPT09IFwiY2FuY2VsXCIpIHRoaXMuY2FuY2VsUHJlc3MoKTtcbiAgICAgIHJldHVybiBlZmZlY3RzO1xuICAgIH1cblxuICAgIC8vIEhvdmVyIG1vdmVtZW50IGlzIHRoZSBvbmx5IGV2aWRlbmNlIHVzZWQgdG8gaW50ZXJwcmV0IGJ1dHRvbnMgYXMgYmFycmVsIHN0YXRlLlxuICAgIGlmICh0aGlzLnBlbkNvbnRhY3QpIHJldHVybiBlZmZlY3RzO1xuICAgIGNvbnN0IGhlbGROb3cgPSAoZXZlbnQuYnV0dG9ucyAmIDEpICE9PSAwO1xuICAgIGlmICghdGhpcy5iYXJyZWxCdXR0b25IZWxkICYmIGhlbGROb3cpIHRoaXMuc3RhcnRQcmVzcyhldmVudCk7XG4gICAgaWYgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiBoZWxkTm93KSB0aGlzLnRyYWNrSG92ZXJNb3ZlbWVudChldmVudCk7XG4gICAgaWYgKHRoaXMuYmFycmVsQnV0dG9uSGVsZCAmJiAhaGVsZE5vdykgdGhpcy5yZWxlYXNlUHJlc3MoZWZmZWN0cyk7XG4gICAgcmV0dXJuIGVmZmVjdHM7XG4gIH1cblxuICBkaXNwb3NlKCk6IEdlc3R1cmVFZmZlY3RbXSB7XG4gICAgY29uc3QgZWZmZWN0czogR2VzdHVyZUVmZmVjdFtdID0gW107XG4gICAgdGhpcy5jYW5jZWxUaW1lcihcImhvbGRcIik7XG4gICAgdGhpcy5jYW5jZWxQZW5kaW5nVGFwKCk7XG4gICAgaWYgKHRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJ0ZW1wb3JhcnktdG9vbC1lbmRcIiB9KTtcbiAgICB0aGlzLnRlbXBvcmFyeVRvb2xBY3RpdmUgPSBmYWxzZTtcbiAgICB0aGlzLmNhbmNlbFByZXNzKCk7XG4gICAgcmV0dXJuIGVmZmVjdHM7XG4gIH1cblxuICBwcml2YXRlIHN0YXJ0UHJlc3MoZXZlbnQ6IE5vcm1hbGl6ZWRTdHlsdXNFdmVudCk6IHZvaWQge1xuICAgIHRoaXMuYmFycmVsQnV0dG9uSGVsZCA9IHRydWU7XG4gICAgdGhpcy5jb25zdW1lZCA9IGZhbHNlO1xuICAgIHRoaXMubW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmhvbGRGaXJlZCA9IGZhbHNlO1xuICAgIHRoaXMucHJlc3NPcmlnaW4gPSB7IHg6IGV2ZW50LngsIHk6IGV2ZW50LnkgfTtcbiAgICB0aGlzLmhvbGRUaW1lciA9IHRoaXMuc2NoZWR1bGVyLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKCF0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgfHwgdGhpcy5wZW5Db250YWN0IHx8IHRoaXMubW92ZWQgfHwgdGhpcy5jb25zdW1lZCB8fCAhdGhpcy5wcmVzc09yaWdpbikgcmV0dXJuO1xuICAgICAgdGhpcy5ob2xkRmlyZWQgPSB0cnVlO1xuICAgICAgdGhpcy5jb25zdW1lZCA9IHRydWU7XG4gICAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICAgIHRoaXMub25FZmZlY3Q/Lih7IHR5cGU6IFwiYnV0dG9uLWhvbGRcIiwgcG9pbnQ6IHRoaXMucHJlc3NPcmlnaW4gfSk7XG4gICAgfSwgdGhpcy5zZXR0aW5ncy5sb25nUHJlc3NNcyk7XG4gIH1cblxuICAvKiogQ29udHJvbGxlciByZWdpc3RlcnMgdGhpcyBzbyBzY2hlZHVsZXIgY2FsbGJhY2tzIHJldGFpbiBwdXJlIHNlbWFudGljIG91dHB1dC4gKi9cbiAgcHJpdmF0ZSBvbkVmZmVjdDogKChlZmZlY3Q6IEdlc3R1cmVFZmZlY3QpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gIHNldEVmZmVjdFNpbmsoc2luazogKGVmZmVjdDogR2VzdHVyZUVmZmVjdCkgPT4gdm9pZCk6IHZvaWQgeyB0aGlzLm9uRWZmZWN0ID0gc2luazsgfVxuXG4gIHByaXZhdGUgdHJhY2tIb3Zlck1vdmVtZW50KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMucHJlc3NPcmlnaW4gfHwgdGhpcy5tb3ZlZCkgcmV0dXJuO1xuICAgIGNvbnN0IGR4ID0gZXZlbnQueCAtIHRoaXMucHJlc3NPcmlnaW4ueDtcbiAgICBjb25zdCBkeSA9IGV2ZW50LnkgLSB0aGlzLnByZXNzT3JpZ2luLnk7XG4gICAgaWYgKE1hdGguaHlwb3QoZHgsIGR5KSA+IHRoaXMuc2V0dGluZ3MubW92ZW1lbnRUaHJlc2hvbGRQeCkge1xuICAgICAgdGhpcy5tb3ZlZCA9IHRydWU7XG4gICAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNvbnN1bWVGb3JDb250YWN0KGV2ZW50OiBOb3JtYWxpemVkU3R5bHVzRXZlbnQsIGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSk6IHZvaWQge1xuICAgIHRoaXMuY29uc3VtZWQgPSB0cnVlO1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuY2FuY2VsUGVuZGluZ1RhcCgpO1xuICAgIGlmICh0aGlzLnNldHRpbmdzLmJ1dHRvbkNvbnRhY3RBY3Rpb24gPT09IFwiZXJhc2VyXCIgJiYgIXRoaXMudGVtcG9yYXJ5VG9vbEFjdGl2ZSkge1xuICAgICAgdGhpcy50ZW1wb3JhcnlUb29sQWN0aXZlID0gdHJ1ZTtcbiAgICAgIGVmZmVjdHMucHVzaCh7IHR5cGU6IFwidGVtcG9yYXJ5LXRvb2wtc3RhcnRcIiwgcG9pbnQ6IHsgeDogZXZlbnQueCwgeTogZXZlbnQueSB9IH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVsZWFzZVByZXNzKGVmZmVjdHM6IEdlc3R1cmVFZmZlY3RbXSk6IHZvaWQge1xuICAgIHRoaXMuY2FuY2VsVGltZXIoXCJob2xkXCIpO1xuICAgIHRoaXMuYmFycmVsQnV0dG9uSGVsZCA9IGZhbHNlO1xuICAgIGlmICghdGhpcy5jb25zdW1lZCAmJiAhdGhpcy5tb3ZlZCAmJiAhdGhpcy5ob2xkRmlyZWQgJiYgdGhpcy5wcmVzc09yaWdpbikge1xuICAgICAgaWYgKHRoaXMucGVuZGluZ1RhcCkge1xuICAgICAgICB0aGlzLmNhbmNlbFBlbmRpbmdUYXAoKTtcbiAgICAgICAgZWZmZWN0cy5wdXNoKHsgdHlwZTogXCJidXR0b24tZG91YmxlLXRhcFwiLCBwb2ludDogdGhpcy5wcmVzc09yaWdpbiB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHBvaW50ID0gdGhpcy5wcmVzc09yaWdpbjtcbiAgICAgICAgY29uc3QgdGltZXIgPSB0aGlzLnNjaGVkdWxlci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdUYXAgPSBudWxsO1xuICAgICAgICAgIHRoaXMub25FZmZlY3Q/Lih7IHR5cGU6IFwiYnV0dG9uLXRhcFwiLCBwb2ludCB9KTtcbiAgICAgICAgfSwgdGhpcy5zZXR0aW5ncy5kb3VibGVUYXBNcyk7XG4gICAgICAgIHRoaXMucGVuZGluZ1RhcCA9IHsgcG9pbnQsIHRpbWVyIH07XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucHJlc3NPcmlnaW4gPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBjYW5jZWxQcmVzcygpOiB2b2lkIHtcbiAgICB0aGlzLmNhbmNlbFRpbWVyKFwiaG9sZFwiKTtcbiAgICB0aGlzLmJhcnJlbEJ1dHRvbkhlbGQgPSBmYWxzZTtcbiAgICB0aGlzLnBlbkNvbnRhY3QgPSBmYWxzZTtcbiAgICB0aGlzLmNvbnN1bWVkID0gZmFsc2U7XG4gICAgdGhpcy5tb3ZlZCA9IGZhbHNlO1xuICAgIHRoaXMuaG9sZEZpcmVkID0gZmFsc2U7XG4gICAgdGhpcy5wcmVzc09yaWdpbiA9IG51bGw7XG4gICAgdGhpcy5hY3RpdmVQb2ludGVySWQgPSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBjYW5jZWxUaW1lcih3aGljaDogXCJob2xkXCIpOiB2b2lkIHtcbiAgICBpZiAod2hpY2ggPT09IFwiaG9sZFwiICYmIHRoaXMuaG9sZFRpbWVyICE9PSBudWxsKSB7XG4gICAgICB0aGlzLnNjaGVkdWxlci5jbGVhclRpbWVvdXQodGhpcy5ob2xkVGltZXIpO1xuICAgICAgdGhpcy5ob2xkVGltZXIgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2FuY2VsUGVuZGluZ1RhcCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5wZW5kaW5nVGFwKSB0aGlzLnNjaGVkdWxlci5jbGVhclRpbWVvdXQodGhpcy5wZW5kaW5nVGFwLnRpbWVyKTtcbiAgICB0aGlzLnBlbmRpbmdUYXAgPSBudWxsO1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSB7IEV4Y2FsaWRyYXdCcmlkZ2UsIEFjdGl2ZVRvb2xTbmFwc2hvdCB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB0eXBlIHsgRGVidWdMb2dnZXIgfSBmcm9tIFwiLi4vZGVidWcvRGVidWdMb2dnZXJcIjtcbmltcG9ydCB0eXBlIHsgU3R5bHVzQ29udHJvbHNTZXR0aW5ncyB9IGZyb20gXCIuLi9zZXR0aW5ncy9zZXR0aW5nc1wiO1xuaW1wb3J0IHsgbm9ybWFsaXplUG9pbnRlckV2ZW50IH0gZnJvbSBcIi4vbm9ybWFsaXplUG9pbnRlckV2ZW50XCI7XG5pbXBvcnQgeyBTdHlsdXNHZXN0dXJlTWFjaGluZSB9IGZyb20gXCIuL1N0eWx1c0dlc3R1cmVNYWNoaW5lXCI7XG5pbXBvcnQgdHlwZSB7IEdlc3R1cmVFZmZlY3QsIFBvaW50LCBTY2hlZHVsZXIgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgdHlwZSBBY3Rpb25IYW5kbGVyID0gKGFjdGlvbjogXCJtZW51XCIgfCBcImNvcHlcIiB8IFwicGFzdGVcIiB8IFwibm9uZVwiLCBwb2ludDogUG9pbnQsIGJyaWRnZTogRXhjYWxpZHJhd0JyaWRnZSkgPT4gdm9pZDtcblxuZXhwb3J0IGNsYXNzIFN0eWx1c0NvbnRyb2xsZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IG1hY2hpbmU6IFN0eWx1c0dlc3R1cmVNYWNoaW5lO1xuICBwcml2YXRlIHNhdmVkVG9vbDogQWN0aXZlVG9vbFNuYXBzaG90IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZGlzcG9zZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSByZWFkb25seSBsaXN0ZW5lcnM6IEFycmF5PFtrZXlvZiBIVE1MRWxlbWVudEV2ZW50TWFwLCBFdmVudExpc3RlbmVyXT4gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxlYWY6IFdvcmtzcGFjZUxlYWYsXG4gICAgcHJpdmF0ZSByZWFkb25seSBicmlkZ2U6IEV4Y2FsaWRyYXdCcmlkZ2UsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzZXR0aW5nczogKCkgPT4gU3R5bHVzQ29udHJvbHNTZXR0aW5ncyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRlYnVnOiBEZWJ1Z0xvZ2dlcixcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRpc3BhdGNoQWN0aW9uOiBBY3Rpb25IYW5kbGVyLFxuICAgIHNjaGVkdWxlcjogU2NoZWR1bGVyID0gd2luZG93LFxuICApIHtcbiAgICB0aGlzLm1hY2hpbmUgPSBuZXcgU3R5bHVzR2VzdHVyZU1hY2hpbmUodGhpcy5nZXN0dXJlU2V0dGluZ3MoKSwgc2NoZWR1bGVyKTtcbiAgICB0aGlzLm1hY2hpbmUuc2V0RWZmZWN0U2luaygoZWZmZWN0KSA9PiB0aGlzLmFwcGx5RWZmZWN0KGVmZmVjdCkpO1xuICB9XG5cbiAgYXR0YWNoKCk6IHZvaWQge1xuICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLmxlYWYudmlldy5jb250YWluZXJFbDtcbiAgICBmb3IgKGNvbnN0IHR5cGUgb2YgW1wicG9pbnRlcmRvd25cIiwgXCJwb2ludGVybW92ZVwiLCBcInBvaW50ZXJ1cFwiLCBcInBvaW50ZXJjYW5jZWxcIiwgXCJjb250ZXh0bWVudVwiXSBhcyBjb25zdCkge1xuICAgICAgY29uc3QgbGlzdGVuZXI6IEV2ZW50TGlzdGVuZXIgPSAocmF3KSA9PiB0aGlzLm9uUG9pbnRlckV2ZW50KHJhdyBhcyBQb2ludGVyRXZlbnQpO1xuICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgICAgIHRoaXMubGlzdGVuZXJzLnB1c2goW3R5cGUsIGxpc3RlbmVyXSk7XG4gICAgfVxuICB9XG5cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkgcmV0dXJuO1xuICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuICAgIGZvciAoY29uc3QgW3R5cGUsIGxpc3RlbmVyXSBvZiB0aGlzLmxpc3RlbmVycykgdGhpcy5sZWFmLnZpZXcuY29udGFpbmVyRWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgdHJ1ZSk7XG4gICAgdGhpcy5saXN0ZW5lcnMubGVuZ3RoID0gMDtcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiB0aGlzLm1hY2hpbmUuZGlzcG9zZSgpKSB0aGlzLmFwcGx5RWZmZWN0KGVmZmVjdCk7XG4gIH1cbiAgZ2V0VHJhY2UoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuZGVidWcuZXhwb3J0VHJhY2UoKTsgfVxuXG4gIHByaXZhdGUgb25Qb2ludGVyRXZlbnQocmF3OiBQb2ludGVyRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAocmF3LnBvaW50ZXJUeXBlICE9PSBcInBlblwiKSByZXR1cm47XG4gICAgY29uc3QgZXZlbnQgPSBub3JtYWxpemVQb2ludGVyRXZlbnQocmF3LCB0aGlzLmxlYWYudmlldy5jb250YWluZXJFbC5jb250YWlucyhyYXcudGFyZ2V0IGFzIE5vZGUpKTtcbiAgICB0aGlzLmRlYnVnLmV2ZW50KGV2ZW50KTtcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiB0aGlzLm1hY2hpbmUuaGFuZGxlKGV2ZW50KSkge1xuICAgICAgaWYgKGVmZmVjdC50eXBlID09PSBcInN1cHByZXNzLWNvbnRleHQtbWVudVwiKSByYXcucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMuYXBwbHlFZmZlY3QoZWZmZWN0KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFwcGx5RWZmZWN0KGVmZmVjdDogR2VzdHVyZUVmZmVjdCk6IHZvaWQge1xuICAgIHN3aXRjaCAoZWZmZWN0LnR5cGUpIHtcbiAgICAgIGNhc2UgXCJ0ZW1wb3JhcnktdG9vbC1zdGFydFwiOlxuICAgICAgICBpZiAoIXRoaXMuc2F2ZWRUb29sKSB0aGlzLnNhdmVkVG9vbCA9IHRoaXMuYnJpZGdlLnN0YXJ0VGVtcG9yYXJ5RXJhc2VyKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcInRlbXBvcmFyeS10b29sLWVuZFwiOlxuICAgICAgICBpZiAodGhpcy5zYXZlZFRvb2wpIHRoaXMuYnJpZGdlLnJlc3RvcmVUb29sKHRoaXMuc2F2ZWRUb29sKTtcbiAgICAgICAgdGhpcy5zYXZlZFRvb2wgPSBudWxsO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJidXR0b24tdGFwXCI6IHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvblRhcEFjdGlvbiwgZWZmZWN0LnBvaW50LCB0aGlzLmJyaWRnZSk7IGJyZWFrO1xuICAgICAgY2FzZSBcImJ1dHRvbi1kb3VibGUtdGFwXCI6IHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvbkRvdWJsZVRhcEFjdGlvbiwgZWZmZWN0LnBvaW50LCB0aGlzLmJyaWRnZSk7IGJyZWFrO1xuICAgICAgY2FzZSBcImJ1dHRvbi1ob2xkXCI6IHRoaXMuZGlzcGF0Y2hBY3Rpb24odGhpcy5zZXR0aW5ncygpLmJ1dHRvbkhvbGRBY3Rpb24sIGVmZmVjdC5wb2ludCwgdGhpcy5icmlkZ2UpOyBicmVhaztcbiAgICAgIGRlZmF1bHQ6IGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2VzdHVyZVNldHRpbmdzKCkge1xuICAgIGNvbnN0IHZhbHVlID0gdGhpcy5zZXR0aW5ncygpO1xuICAgIHJldHVybiB7IGJ1dHRvbkNvbnRhY3RBY3Rpb246IHZhbHVlLmJ1dHRvbkNvbnRhY3RBY3Rpb24sIGRvdWJsZVRhcE1zOiB2YWx1ZS5kb3VibGVUYXBNcywgbG9uZ1ByZXNzTXM6IHZhbHVlLmxvbmdQcmVzc01zLCBtb3ZlbWVudFRocmVzaG9sZFB4OiB2YWx1ZS5tb3ZlbWVudFRocmVzaG9sZFB4IH0gYXMgY29uc3Q7XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IEFwcCwgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgRXhjYWxpZHJhd0JyaWRnZSB9IGZyb20gXCIuLi9leGNhbGlkcmF3L0V4Y2FsaWRyYXdCcmlkZ2VcIjtcbmltcG9ydCB7IERlYnVnTG9nZ2VyIH0gZnJvbSBcIi4uL2RlYnVnL0RlYnVnTG9nZ2VyXCI7XG5pbXBvcnQgdHlwZSB7IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MgfSBmcm9tIFwiLi4vc2V0dGluZ3Mvc2V0dGluZ3NcIjtcbmltcG9ydCB7IFN0eWx1c0NvbnRyb2xsZXIsIHR5cGUgQWN0aW9uSGFuZGxlciB9IGZyb20gXCIuL1N0eWx1c0NvbnRyb2xsZXJcIjtcblxuZXhwb3J0IGNsYXNzIFN0eWx1c1ZpZXdSZWdpc3RyeSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29udHJvbGxlcnMgPSBuZXcgTWFwPFdvcmtzcGFjZUxlYWYsIFN0eWx1c0NvbnRyb2xsZXI+KCk7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgYXBwOiBBcHAsIHByaXZhdGUgcmVhZG9ubHkgc2V0dGluZ3M6ICgpID0+IFN0eWx1c0NvbnRyb2xzU2V0dGluZ3MsIHByaXZhdGUgcmVhZG9ubHkgYWN0aW9uSGFuZGxlcjogQWN0aW9uSGFuZGxlcikge31cblxuICBzeW5jKCk6IHZvaWQge1xuICAgIGNvbnN0IGxlYXZlcyA9IG5ldyBTZXQodGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShcImV4Y2FsaWRyYXdcIikpO1xuICAgIGZvciAoY29uc3QgbGVhZiBvZiBsZWF2ZXMpIGlmICghdGhpcy5jb250cm9sbGVycy5oYXMobGVhZikpIHtcbiAgICAgIGNvbnN0IGRlYnVnID0gbmV3IERlYnVnTG9nZ2VyKCgpID0+IHRoaXMuc2V0dGluZ3MoKS5kZWJ1Z01vZGUpO1xuICAgICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBTdHlsdXNDb250cm9sbGVyKGxlYWYsIG5ldyBFeGNhbGlkcmF3QnJpZGdlKHRoaXMuYXBwLCBsZWFmKSwgdGhpcy5zZXR0aW5ncywgZGVidWcsIHRoaXMuYWN0aW9uSGFuZGxlcik7XG4gICAgICBjb250cm9sbGVyLmF0dGFjaCgpO1xuICAgICAgdGhpcy5jb250cm9sbGVycy5zZXQobGVhZiwgY29udHJvbGxlcik7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2xlYWYsIGNvbnRyb2xsZXJdIG9mIHRoaXMuY29udHJvbGxlcnMpIGlmICghbGVhdmVzLmhhcyhsZWFmKSkgeyBjb250cm9sbGVyLmRpc3Bvc2UoKTsgdGhpcy5jb250cm9sbGVycy5kZWxldGUobGVhZik7IH1cbiAgfVxuICBkaXNwb3NlKCk6IHZvaWQgeyBmb3IgKGNvbnN0IGNvbnRyb2xsZXIgb2YgdGhpcy5jb250cm9sbGVycy52YWx1ZXMoKSkgY29udHJvbGxlci5kaXNwb3NlKCk7IHRoaXMuY29udHJvbGxlcnMuY2xlYXIoKTsgfVxuICByZWZyZXNoKCk6IHZvaWQgeyB0aGlzLmRpc3Bvc2UoKTsgdGhpcy5zeW5jKCk7IH1cbiAgZXhwb3J0VHJhY2VzKCk6IHN0cmluZyB7IHJldHVybiBKU09OLnN0cmluZ2lmeShbLi4udGhpcy5jb250cm9sbGVycy5lbnRyaWVzKCldLm1hcCgoW2xlYWYsIGNvbnRyb2xsZXJdKSA9PiAoeyBsZWFmOiBsZWFmLmdldERpc3BsYXlUZXh0KCksIGV2ZW50czogSlNPTi5wYXJzZShjb250cm9sbGVyLmdldFRyYWNlKCkpIH0pKSwgbnVsbCwgMik7IH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFBLG1CQUErQjs7O0FDR3hCLElBQU0sYUFBTixNQUFpQjtBQUFBLEVBQ1osVUFBOEI7QUFBQSxFQUN0QyxLQUFLLE9BQWMsUUFBZ0M7QUFDL0MsU0FBSyxNQUFNO0FBQ1gsVUFBTSxPQUFPLFNBQVMsS0FBSyxVQUFVLEVBQUUsS0FBSyx5QkFBeUIsQ0FBQztBQUN0RSxVQUFNQyxXQUF1QztBQUFBLE1BQ3pDLENBQUMsYUFBYSxNQUFNLE9BQU8sUUFBUSxXQUFXLENBQUM7QUFBQSxNQUMvQyxDQUFDLGFBQWEsTUFBTSxPQUFPLFFBQVEsVUFBVSxDQUFDO0FBQUEsTUFDOUMsQ0FBQyxVQUFVLE1BQU0sT0FBTyxRQUFRLFFBQVEsQ0FBQztBQUFBLE1BQ3pDLENBQUMsYUFBYSxNQUFNLE9BQU8sUUFBUSxXQUFXLENBQUM7QUFBQSxNQUMvQyxDQUFDLFNBQVMsTUFBTSxPQUFPLFFBQVEsT0FBTyxDQUFDO0FBQUEsTUFDdkMsQ0FBQyxRQUFRLE1BQU0sT0FBTyxxQkFBcUIsQ0FBQztBQUFBLE1BQzVDLENBQUMsU0FBUyxNQUFNLE9BQU8sUUFBUSxLQUFLLENBQUM7QUFBQSxJQUN6QztBQUNBLGVBQVcsQ0FBQyxNQUFNLFFBQVEsS0FBS0EsVUFBUztBQUNwQyxZQUFN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QUFDO0FBQzVELFNBQUssV0FBVyxFQUFFLElBQUksMkJBQTJCLE1BQU0sa0NBQWtDLFVBQVUsWUFBWTtBQUM3RyxZQUFNLFFBQVEsS0FBSyxVQUFVLGFBQWEsS0FBSztBQUMvQyxVQUFJO0FBQUUsY0FBTSxVQUFVLFVBQVUsVUFBVSxLQUFLO0FBQUcsWUFBSSx3QkFBTyw0QkFBNEI7QUFBQSxNQUFHLFFBQ3RGO0FBQUUsWUFBSSx3QkFBTywwREFBMEQ7QUFBQSxNQUFHO0FBQUEsSUFDbEYsRUFBQyxDQUFDO0FBQUEsRUFDSjtBQUFBLEVBQ0EsV0FBaUI7QUFBRSxTQUFLLEtBQUssTUFBTTtBQUFHLFNBQUssVUFBVSxRQUFRO0FBQUcsU0FBSyxXQUFXO0FBQUEsRUFBTTtBQUFBLEVBQ3RGLE1BQU0sZUFBZSxPQUF1RDtBQUMxRSxTQUFLLFdBQVcsa0JBQWtCLEVBQUUsR0FBRyxLQUFLLFVBQVUsR0FBRyxNQUFNLENBQUM7QUFDaEUsVUFBTSxLQUFLLFNBQVMsS0FBSyxRQUFRO0FBQ2pDLFNBQUssVUFBVSxRQUFRO0FBQUEsRUFDekI7QUFDRjsiLAogICJuYW1lcyI6IFsiaW1wb3J0X29ic2lkaWFuIiwgImFjdGlvbnMiLCAiaW1wb3J0X29ic2lkaWFuIl0KfQo=
