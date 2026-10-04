import { PluginSettingTab, Setting } from "obsidian";
import type StylusControlsPlugin from "../main";
import type { StylusAction } from "./settings";

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
      text: "Requires the Excalidraw community plugin. Copy/paste uses a private in-memory clipboard in version 0.1.",
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
      .setName("Debug logging")
      .setDesc("Logs bounded raw pen event traces to the developer console.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.debugMode)
          .onChange(async (value) => this.plugin.updateSettings({ debugMode: value }))
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
  private number(name: string, key: "doubleTapMs" | "longPressMs" | "movementThresholdPx"): void {
    new Setting(this.containerEl)
      .setName(name)
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings[key]))
          .onChange(async (value) => this.plugin.updateSettings({ [key]: Number(value) }))
      );
  }
}
