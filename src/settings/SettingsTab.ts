import { PluginSettingTab, Setting } from "obsidian";
import type StylusControlsPlugin from "../main";
import {
  NUMERIC_SETTING_LIMITS,
  parseNumericSetting,
  type NumericSettingKey,
  type BarrelButtonMask,
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

export class SettingsTab extends PluginSettingTab {
  constructor(private readonly plugin: StylusControlsPlugin) {
    super(plugin.app, plugin);
  }
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
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
  private number(name: string, key: NumericSettingKey): void {
    const { min, max } = NUMERIC_SETTING_LIMITS[key];
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(`Whole milliseconds/pixels from ${min} to ${max}.`)
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
