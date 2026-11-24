import { PluginSettingTab, Setting } from "obsidian";
import { PenEventProbe } from "../diagnostics/PenEventProbe";
import { isDiagnosticBuild } from "../diagnostics/report";
import type StylusControlsPlugin from "../main";
import { decodePairingCode } from "../penbridge/protocol";
import {
  NUMERIC_SETTING_LIMITS,
  parseNumericSetting,
  type BarrelButtonMask,
  type EraserStrategy,
  type MidStrokePress,
  type NumericSettingKey,
  type StylusAction,
} from "./settings";

const actions: Record<StylusAction, string> = {
  menu: "Open menu",
  copy: "Copy",
  paste: "Paste",
  none: "Do nothing",
};

const testProfiles: Record<
  string,
  { label: string; mask: BarrelButtonMask; primaryContactMode: "hover-only" | "experimental" }
> = {
  "standard": {
    label: "Standard barrel — buttons: 2",
    mask: 2,
    primaryContactMode: "hover-only",
  },
  "android-hover": {
    label: "Android/WebView primary — buttons: 1, hover only",
    mask: 1,
    primaryContactMode: "hover-only",
  },
  "android-contact": {
    label: "Android/WebView primary — buttons: 1, contact experiment",
    mask: 1,
    primaryContactMode: "experimental",
  },
  "auxiliary": {
    label: "Auxiliary/middle — buttons: 4",
    mask: 4,
    primaryContactMode: "hover-only",
  },
  "back": { label: "Back — buttons: 8", mask: 8, primaryContactMode: "hover-only" },
  "forward": { label: "Forward — buttons: 16", mask: 16, primaryContactMode: "hover-only" },
  "eraser": { label: "Pen eraser — buttons: 32", mask: 32, primaryContactMode: "hover-only" },
};

const TESTER_GUIDE =
  "https://github.com/janlewski/excalidraw-stylus-controls/blob/main/docs/TESTER-GUIDE.md";

export class SettingsTab extends PluginSettingTab {
  private probe: PenEventProbe | null = null;
  private unwatch: (() => void) | null = null;
  private liveStatus: HTMLElement | null = null;
  private checkResults: HTMLElement | null = null;
  private fingerprintEl: HTMLElement | null = null;
  private eraserResult: HTMLElement | null = null;

  constructor(private readonly plugin: StylusControlsPlugin) {
    super(plugin.app, plugin);
  }

  display(): void {
    this.teardown();
    const { containerEl } = this;
    containerEl.empty();
    const diagnostic = isDiagnosticBuild(this.plugin.manifest.version);
    if (diagnostic) this.renderDiagnostics();
    containerEl.createEl("p", {
      text: "Requires the Excalidraw community plugin. Copy and paste await a compatible Excalidraw integration and are currently unavailable.",
    });
    this.action("Tap", "buttonTapAction");
    this.action("Double tap", "buttonDoubleTapAction");
    this.action("Hold", "buttonHoldAction");
    new Setting(containerEl)
      .setName("Button + pen contact")
      .setDesc("Temporary tool while the side button is held during pen contact.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("eraser", "Temporary eraser")
          .addOption("none", "Do nothing")
          .setValue(this.plugin.settings.buttonContactAction)
          .onChange(async (value) =>
            this.plugin.updateSettings({
              buttonContactAction: value as "eraser" | "none",
            })
          )
      );
    this.number("Double-tap interval (ms)", "doubleTapMs");
    this.number("Long-press delay (ms)", "longPressMs");
    this.number("Movement threshold (px)", "movementThresholdPx");
    new Setting(containerEl)
      .setName("S Pen test mode")
      .setDesc(
        "Suppresses menu, clipboard, and temporary-tool changes while still showing recognized state and effects in the debug overlay. Use this while trying signal profiles."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.stylusTestMode)
          .onChange(async (value) => this.plugin.updateSettings({ stylusTestMode: value }))
      );
    new Setting(containerEl)
      .setName("S Pen signal test profile")
      .setDesc(
        "Try one profile at a time with test mode enabled, then export the trace. The Android contact experiment may recognize every ordinary pen stroke; use it only in a disposable drawing."
      )
      .addDropdown((dropdown) => {
        for (const [value, profile] of Object.entries(testProfiles))
          dropdown.addOption(value, profile.label);
        dropdown.setValue(this.currentTestProfile()).onChange(async (value) => {
          const profile = testProfiles[value];
          if (!profile) return;
          await this.plugin.updateSettings({
            barrelButtonMask: profile.mask,
            primaryContactMode: profile.primaryContactMode,
            stylusTestMode: true,
          });
          this.display();
        });
      });
    this.renderBridge();
    new Setting(containerEl)
      .setName("Debug logging")
      .setDesc("Logs bounded raw pen event traces to the developer console.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.debugMode)
          .onChange(async (value) => this.plugin.updateSettings({ debugMode: value }))
      );
    new Setting(containerEl)
      .setName("Debug overlay")
      .setDesc(
        "Shows the latest pen event and stylus state in the Excalidraw view. Requires debug logging."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.debugOverlay)
          .onChange(async (value) => this.plugin.updateSettings({ debugOverlay: value }))
      );
    new Setting(containerEl)
      .setName("Export debug trace")
      .setDesc(
        "Copies buffered pen events from every open Excalidraw view as JSON, ready to attach to a bug report."
      )
      .addButton((button) =>
        button.setButtonText("Copy trace").onClick(() => this.plugin.copyStylusEventTrace())
      );
    if (!diagnostic) this.renderDiagnostics();
    this.unwatch = this.plugin.watchBridge(() => this.refreshLive());
  }

  hide(): void {
    this.teardown();
    super.hide();
  }

  private teardown(): void {
    this.unwatch?.();
    this.unwatch = null;
    this.probe?.dispose();
    this.probe = null;
    this.liveStatus = null;
    this.checkResults = null;
    this.fingerprintEl = null;
    this.eraserResult = null;
  }

  private renderDiagnostics(): void {
    const { containerEl } = this;
    containerEl.createEl("h3", { text: "Diagnostics" });
    containerEl.createEl("p", {
      text: "How to test: docs/TESTER-GUIDE.md. The report never includes the pairing code, vault name, note text, or pointer coordinates.",
    });
    containerEl.createEl("a", { text: "How to test", href: TESTER_GUIDE });
    containerEl.createEl("p", {
      text: `Plugin ${this.plugin.manifest.version}. Open a new empty drawing before the eraser test.`,
    });
    new Setting(containerEl)
      .setName("Check bridge connection")
      .setDesc(
        "Tries HTTP, WebSocket, hello, pairing, and the pen source. Nothing else needs to be open."
      )
      .addButton((button) =>
        button.setButtonText("Check").onClick(() => {
          button.setDisabled(true);
          if (this.checkResults) this.checkResults.setText("Checking…");
          void this.plugin.checkBridge().then((checks) => {
            button.setDisabled(false);
            if (this.checkResults)
              this.checkResults.setText(this.plugin.bridgeCheckLines().join("\n"));
            void checks;
          });
        })
      );
    this.checkResults = containerEl.createEl("pre");
    this.checkResults.setText(this.plugin.bridgeCheckLines().join("\n"));
    containerEl.createEl("h4", { text: "Live bridge status" });
    this.liveStatus = containerEl.createEl("p");
    this.refreshLive();
    containerEl.createEl("h4", { text: "Pen event probe" });
    this.probe = new PenEventProbe(containerEl, () => {
      if (this.probe) this.plugin.setProbeEvents(this.probe.snapshot());
    });
    containerEl.createEl("h4", { text: "Excalidraw check" });
    this.eraserResult = containerEl.createEl("p", { text: this.plugin.temporaryEraserNote });
    new Setting(containerEl)
      .setName("Test temporary eraser")
      .setDesc(
        'Shows "Open a new, empty drawing first" unless an Excalidraw view is active, then asks before running.'
      )
      .addButton((button) =>
        button.setButtonText("Test temporary eraser").onClick(() => {
          void this.plugin.runTemporaryEraserTest().then((note) => {
            if (this.eraserResult) this.eraserResult.setText(note);
          });
        })
      );
    new Setting(containerEl)
      .setName("Copy report")
      .setDesc(
        "Copies a short summary and a JSON block. You can also run “Copy diagnostics report” from the command palette."
      )
      .addButton((button) =>
        button.setButtonText("Copy report").onClick(() => void this.plugin.copyDiagnosticsReport())
      );
  }

  private renderBridge(): void {
    const { containerEl } = this;
    containerEl.createEl("h3", { text: "S Pen bridge (Android companion)" });
    containerEl.createEl("p", {
      text: "Turn off Samsung Air command, or a hover press can open that panel instead of reaching Obsidian. Without the bridge, Android uses the hover-latch fallback.",
    });
    new Setting(containerEl)
      .setName("Enable bridge")
      .setDesc("Connects while an Excalidraw view is open and this note is visible.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.penBridgeEnabled)
          .onChange(async (value) => this.plugin.updateSettings({ penBridgeEnabled: value }))
      );
    new Setting(containerEl)
      .setName("Pairing code")
      .setDesc(
        "Paste the code from the bridge app. It is stored on this device only, not in the vault."
      )
      .addText((text) => {
        text.inputEl.type = "password";
        text.setPlaceholder("Pairing code");
        text.setValue(this.plugin.pairingCode());
        text.onChange((value) => void this.commitPairing(value));
      })
      .addButton((button) =>
        button.setButtonText("Paste").onClick(() => {
          void navigator.clipboard.readText().then((value) => {
            void this.commitPairing(value);
            this.display();
          });
        })
      );
    this.fingerprintEl = containerEl.createEl("p", { text: this.fingerprintLabel() });
    new Setting(containerEl)
      .setName("Status")
      .setDesc(
        "Ready means mid-stroke erase can use the bridge. Reconnect after a wrong code or a protocol error."
      )
      .addButton((button) =>
        button.setButtonText("Reconnect").onClick(() => this.plugin.reconnectBridge())
      );
    this.number(
      "Late press window (ms)",
      "lateWindowMs",
      "Whole milliseconds from 0 to 100. Presses inside this window delete the tiny ink dot."
    );
    new Setting(containerEl)
      .setName("Mid-stroke press")
      .setDesc(
        "Split turns the rest of the current stroke into the eraser. Next contact waits until you lift."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption("split", "Split this stroke")
          .addOption("next-contact", "Erase the next contact")
          .setValue(this.plugin.settings.midStrokePress)
          .onChange(async (value) =>
            this.plugin.updateSettings({ midStrokePress: value as MidStrokePress })
          )
      );
    new Setting(containerEl)
      .setName("Eraser method")
      .setDesc(
        "Synthetic button 5 uses Excalidraw's momentary eraser. Set active tool is the fallback."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption("synthetic-button5", "Synthetic button 5")
          .addOption("set-active-tool", "Set active tool")
          .setValue(this.plugin.settings.eraserStrategy)
          .onChange(async (value) =>
            this.plugin.updateSettings({ eraserStrategy: value as EraserStrategy })
          )
      );
    new Setting(containerEl)
      .setName("Suppress hover button events")
      .setDesc(
        "Stops a zero-pressure pen event with buttons 1 from starting a stroke in mid-air while the barrel is held."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.suppressHoverButtonEvents)
          .onChange(async (value) =>
            this.plugin.updateSettings({ suppressHoverButtonEvents: value })
          )
      );
  }

  private async commitPairing(value: string): Promise<void> {
    const trimmed = value.trim();
    if (!trimmed) await this.plugin.clearPairingCode();
    else if (decodePairingCode(trimmed)) await this.plugin.setPairingCode(trimmed);
    if (this.fingerprintEl) this.fingerprintEl.setText(this.fingerprintLabel());
    this.refreshLive();
  }

  private fingerprintLabel(): string {
    return this.plugin.pairingFingerprint
      ? `Fingerprint ${this.plugin.pairingFingerprint} (must match the bridge app)`
      : "Fingerprint: paste a valid pairing code. It must match the bridge app.";
  }

  private refreshLive(): void {
    if (this.liveStatus) this.liveStatus.setText(this.plugin.bridgeStatusText());
  }

  private action(
    name: string,
    key: "buttonTapAction" | "buttonDoubleTapAction" | "buttonHoldAction"
  ): void {
    new Setting(this.containerEl).setName(`S Pen side button: ${name}`).addDropdown((dropdown) => {
      for (const [value, label] of Object.entries(actions)) dropdown.addOption(value, label);
      dropdown
        .setValue(this.plugin.settings[key])
        .onChange(async (value) => this.plugin.updateSettings({ [key]: value as StylusAction }));
    });
  }

  private number(name: string, key: NumericSettingKey, desc?: string): void {
    const { min, max } = NUMERIC_SETTING_LIMITS[key];
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(desc ?? `Whole milliseconds/pixels from ${min} to ${max}.`)
      .addText((text) =>
        text.setValue(String(this.plugin.settings[key])).onChange(async (value) => {
          const parsed = parseNumericSetting(key, value);
          text.inputEl.setCustomValidity(
            parsed === null ? `Enter a whole number from ${min} to ${max}.` : ""
          );
          if (parsed === null) return;
          await this.plugin.updateSettings({ [key]: parsed });
        })
      );
  }

  private currentTestProfile(): string {
    const { barrelButtonMask, primaryContactMode } = this.plugin.settings;
    return (
      Object.entries(testProfiles).find(
        ([, profile]) =>
          profile.mask === barrelButtonMask && profile.primaryContactMode === primaryContactMode
      )?.[0] ?? "standard"
    );
  }
}
