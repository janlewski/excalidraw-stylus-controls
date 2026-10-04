import { Notice, type App, type WorkspaceLeaf } from "obsidian";
import type { Point } from "../stylus/types";

export interface ActiveToolSnapshot {
  type: string;
  [key: string]: unknown;
}
type ImperativeApi = {
  getAppState?: () => { activeTool?: ActiveToolSnapshot };
  setActiveTool?: (tool: ActiveToolSnapshot) => void;
};

/** Compatibility boundary for the optional Excalidraw plugin. */
export class ExcalidrawBridge {
  private warned = false;
  constructor(
    private readonly app: App,
    private readonly leaf: WorkspaceLeaf
  ) {}

  startTemporaryEraser(): ActiveToolSnapshot | null {
    const api = this.getApi();
    const tool = api?.getAppState?.().activeTool;
    if (!api?.setActiveTool || !tool) return null;
    api.setActiveTool({ type: "eraser" });
    return { ...tool };
  }
  restoreTool(tool: ActiveToolSnapshot): boolean {
    const api = this.getApi();
    if (!api?.setActiveTool) return false;
    api.setActiveTool(tool);
    return true;
  }
  setTool(type: string): boolean {
    const api = this.getApi();
    if (!api?.setActiveTool) return false;
    api.setActiveTool({ type });
    return true;
  }
  copySelectedElements(): void {
    this.unsupported("Copy requires a compatible Excalidraw API.");
  }
  pasteAt(point: Point): void {
    void point;
    this.unsupported("Paste requires a compatible Excalidraw API.");
  }

  private getApi(): ImperativeApi | null {
    // Excalidraw exposes no stable Community Plugin API for this path. Keep this
    // optional capability probe isolated until a documented leaf-aware API exists.
    const view = this.leaf.view as unknown as {
      excalidrawAPI?: ImperativeApi;
    };
    return view.excalidrawAPI ?? null;
  }
  private unsupported(message: string): void {
    if (!this.warned) {
      new Notice(`Excalidraw Stylus Controls: ${message}`);
      this.warned = true;
    }
  }
}
