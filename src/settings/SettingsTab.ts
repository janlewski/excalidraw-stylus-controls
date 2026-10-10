import { PluginSettingTab, Setting } from "obsidian";
import type StylusControlsPlugin from "../main";
import {
  NUMERIC_SETTING_LIMITS,
  parseNumericSetting,
  type NumericSettingKey,
  type StylusAction,
} from "./settings";

const actions: Record<StylusAction, string> = {
  menu: "Open menu",
  copy: "Copy",
  paste: "Paste",
  none: "Do nothing",
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
      .setName("Barrel button signal")
      .setDesc(
        "The standard pen barrel signal is buttons: 2. If the debug overlay shows a different bit while the side button is held, select that bit."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption("2", "Standard barrel (buttons: 2)")
          .addOption("1", "Primary/tip bit (buttons: 1)")
          .addOption("32", "Eraser bit (buttons: 32)")
          .setValue(String(this.plugin.settings.barrelButtonMask))
          .onChange(async (value) =>
            this.plugin.updateSettings({ barrelButtonMask: Number(value) as 1 | 2 | 32 })
          )
      );
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
}
