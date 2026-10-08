import type { App, WorkspaceLeaf } from "obsidian";
import { ExcalidrawBridge } from "../excalidraw/ExcalidrawBridge";
import { DebugLogger } from "../debug/DebugLogger";
import type { StylusControlsSettings } from "../settings/settings";
import { StylusController, type ActionHandler } from "./StylusController";

export interface StylusControllerLike {
  attach(): void;
  dispose(): void;
  getTrace(): string;
}

export type StylusControllerFactory = (leaf: WorkspaceLeaf) => StylusControllerLike;

export class StylusViewRegistry {
  private readonly controllers = new Map<WorkspaceLeaf, StylusControllerLike>();
  private readonly createController: StylusControllerFactory;

  constructor(
    private readonly app: App,
    private readonly settings: () => StylusControlsSettings,
    private readonly actionHandler: ActionHandler,
    createController?: StylusControllerFactory
  ) {
    this.createController =
      createController ??
      ((leaf) => {
        const debug = new DebugLogger(() => this.settings().debugMode);
        return new StylusController(
          leaf,
          new ExcalidrawBridge(leaf),
          this.settings,
          debug,
          this.actionHandler
        );
      });
  }

  sync(): void {
    const leaves = new Set(this.app.workspace.getLeavesOfType("excalidraw"));
    for (const leaf of leaves)
      if (!this.controllers.has(leaf)) {
        const controller = this.createController(leaf);
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
      2
    );
  }
}
