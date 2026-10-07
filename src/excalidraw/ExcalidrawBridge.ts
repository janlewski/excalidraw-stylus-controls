import { Notice, type WorkspaceLeaf } from "obsidian";
import type { Point } from "../stylus/types";
import {
  readActiveTool,
  toolCapabilities,
  type ActiveToolSnapshot,
  type ImperativeApi,
} from "./compatibility";

export type { ActiveToolSnapshot } from "./compatibility";

/** Compatibility boundary for the optional Excalidraw plugin. */
export class ExcalidrawBridge {
  private warned = false;
  constructor(private readonly leaf: WorkspaceLeaf) {}

  startTemporaryEraser(): ActiveToolSnapshot | null {
    const api = this.getApi();
    const capabilities = toolCapabilities(api);
    if (!api || !capabilities.canReadActiveTool || !capabilities.canSetActiveTool) {
      this.unsupported("Temporary eraser requires active-tool read and write support.");
      return null;
    }
    try {
      const tool = readActiveTool(api);
      if (!tool) {
        this.unsupported("Temporary eraser could not read the current active tool.");
        return null;
      }
      api.setActiveTool?.({ type: "eraser" });
      return tool;
    } catch {
      this.unsupported("Temporary eraser is unavailable in this Excalidraw view.");
      return null;
    }
  }
  restoreTool(tool: ActiveToolSnapshot): boolean {
    const api = this.getApi();
    if (!toolCapabilities(api).canSetActiveTool) {
      this.unsupported("Restoring the previous tool requires active-tool write support.");
      return false;
    }
    try {
      api?.setActiveTool?.(tool);
      return true;
    } catch {
      this.unsupported("The previous tool could not be restored in this Excalidraw view.");
      return false;
    }
  }
  setTool(type: string): boolean {
    const api = this.getApi();
    if (!toolCapabilities(api).canSetActiveTool) {
      this.unsupported("Tool switching requires active-tool write support.");
      return false;
    }
    try {
      api?.setActiveTool?.({ type });
      return true;
    } catch {
      this.unsupported("Tool switching is unavailable in this Excalidraw view.");
      return false;
    }
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
    try {
      const view = this.leaf.view as unknown as { excalidrawAPI?: ImperativeApi };
      return view.excalidrawAPI ?? null;
    } catch {
      return null;
    }
  }
  private unsupported(message: string): void {
    if (!this.warned) {
      new Notice(`Excalidraw Stylus Controls: ${message}`);
      this.warned = true;
    }
  }
}
