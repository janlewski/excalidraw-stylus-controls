import { Notice, Plugin } from "obsidian";
import { StylusMenu } from "./menu/StylusMenu";
import { SettingsTab } from "./settings/SettingsTab";
import {
    DEFAULT_SETTINGS,
    normalizeSettings,
    type StylusControlsSettings,
} from "./settings/settings";
import { StylusViewRegistry } from "./stylus/StylusViewRegistry";

export default class StylusControlsPlugin extends Plugin {
    settings: StylusControlsSettings = DEFAULT_SETTINGS;
    private registry: StylusViewRegistry | null = null;
    private readonly menu = new StylusMenu();

    async onload(): Promise<void> {
        this.settings = normalizeSettings((await this.loadData()) ?? {});
        this.addSettingTab(new SettingsTab(this));
        this.registry = new StylusViewRegistry(
            this.app,
            () => this.settings,
            (action, point, bridge) => {
                if (action === "menu") this.menu.open(point, bridge);
                else if (action === "copy") bridge.copySelectedElements();
                else if (action === "paste") bridge.pasteAt(point);
            },
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
                    new Notice("Stylus event trace copied.");
                } catch {
                    new Notice("Unable to copy event trace. Check the developer console.");
                }
            },
        });
    }
    onunload(): void {
        this.menu.close();
        this.registry?.dispose();
        this.registry = null;
    }
    async updateSettings(patch: Partial<StylusControlsSettings>): Promise<void> {
        this.settings = normalizeSettings({ ...this.settings, ...patch });
        await this.saveData(this.settings);
        this.registry?.refresh();
    }
}
