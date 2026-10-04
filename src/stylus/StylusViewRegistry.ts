import type { App, WorkspaceLeaf } from "obsidian";
import { ExcalidrawBridge } from "../excalidraw/ExcalidrawBridge";
import { DebugLogger } from "../debug/DebugLogger";
import type { StylusControlsSettings } from "../settings/settings";
import { StylusController, type ActionHandler } from "./StylusController";

export class StylusViewRegistry {
    private readonly controllers = new Map<WorkspaceLeaf, StylusController>();
    constructor(
        private readonly app: App,
        private readonly settings: () => StylusControlsSettings,
        private readonly actionHandler: ActionHandler,
    ) {}

    sync(): void {
        const leaves = new Set(this.app.workspace.getLeavesOfType("excalidraw"));
        for (const leaf of leaves)
            if (!this.controllers.has(leaf)) {
                const debug = new DebugLogger(() => this.settings().debugMode);
                const controller = new StylusController(
                    leaf,
                    new ExcalidrawBridge(this.app, leaf),
                    this.settings,
                    debug,
                    this.actionHandler,
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
    dispose(): void {
        for (const controller of this.controllers.values()) controller.dispose();
        this.controllers.clear();
    }
    refresh(): void {
        this.dispose();
        this.sync();
    }
    exportTraces(): string {
        return JSON.stringify(
            [...this.controllers.entries()].map(([leaf, controller]) => ({
                leaf: leaf.getDisplayText(),
                events: JSON.parse(controller.getTrace()),
            })),
            null,
            2,
        );
    }
}
