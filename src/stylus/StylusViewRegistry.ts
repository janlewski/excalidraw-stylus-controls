import type { App, WorkspaceLeaf } from "obsidian";
import { ExcalidrawBridge } from "../excalidraw/ExcalidrawBridge";
import { DebugLogger } from "../debug/DebugLogger";
import type { PenSignalHub, RoutedPenTarget } from "../penbridge/PenSignalHub";
import type { StylusControlsSettings } from "../settings/settings";
import { StylusController, type ActionHandler } from "./StylusController";

export interface StylusControllerLike {
  attach(): void;
  dispose(): void;
  getTrace(): string;
  recentMessages?(): string[];
}

export type StylusControllerFactory = (leaf: WorkspaceLeaf) => StylusControllerLike;

export class StylusViewRegistry {
  private readonly controllers = new Map<WorkspaceLeaf, StylusControllerLike>();
  private readonly createController: StylusControllerFactory;

  constructor(
    private readonly app: App,
    private readonly settings: () => StylusControlsSettings,
    private readonly actionHandler: ActionHandler,
    createController?: StylusControllerFactory,
    private readonly hooks?: {
      pen?: PenSignalHub | null;
      diagnostic?: boolean;
      onSync?: () => void;
    }
  ) {
    this.createController =
      createController ??
      ((leaf) => {
        const debug = new DebugLogger(() => this.settings().debugMode, hooks?.diagnostic === true);
        return new StylusController(
          leaf,
          new ExcalidrawBridge(leaf),
          this.settings,
          debug,
          this.actionHandler,
          window,
          hooks?.pen ?? null
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
    this.hooks?.onSync?.();
  }
  size(): number {
    return this.controllers.size;
  }
  fallbackTarget(): RoutedPenTarget | null {
    const active = (this.app.workspace as { activeLeaf?: WorkspaceLeaf }).activeLeaf;
    const controller = active ? this.controllers.get(active) : undefined;
    if (controller && "onExternalButton" in controller && "lastPenPoint" in controller) {
      return controller as unknown as RoutedPenTarget;
    }
    return null;
  }
  recentMessages(): string[] {
    return [...this.controllers.values()].flatMap(
      (controller) => controller.recentMessages?.() ?? []
    );
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
