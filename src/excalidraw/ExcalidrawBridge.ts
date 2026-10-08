import { Notice, type WorkspaceLeaf } from "obsidian";
import type { Point } from "../stylus/types";
import {
  getLeafApi,
  readActiveTool,
  type ActiveToolSnapshot,
  type BridgeOperationResult,
  type BridgeResult,
  type CompatibleImperativeApi,
} from "./compatibility";

export type {
  ActiveToolSnapshot,
  BridgeFailureCode,
  BridgeOperationResult,
  BridgeResult,
} from "./compatibility";

/** Compatibility boundary for the optional Excalidraw plugin. */
export class ExcalidrawBridge {
  private warned = false;
  constructor(private readonly leaf: WorkspaceLeaf) {}

  startTemporaryEraser(): BridgeResult<ActiveToolSnapshot> {
    const apiResult = this.getApi();
    if (!apiResult.ok) return this.report(apiResult);
    try {
      const tool = readActiveTool(apiResult.value);
      if (!tool) {
        return this.failure(
          "incompatible",
          "Temporary eraser could not read the current active tool."
        );
      }
      apiResult.value.setActiveTool({ type: "eraser" });
      return { ok: true, value: tool };
    } catch {
      return this.failure("failed", "Temporary eraser is unavailable in this Excalidraw view.");
    }
  }
  restoreTool(tool: ActiveToolSnapshot): BridgeOperationResult {
    const apiResult = this.getApi();
    if (!apiResult.ok) return this.report(apiResult);
    try {
      apiResult.value.setActiveTool(tool);
      return { ok: true, value: undefined };
    } catch {
      return this.failure(
        "failed",
        "The previous tool could not be restored in this Excalidraw view."
      );
    }
  }
  setTool(type: string): BridgeOperationResult {
    const apiResult = this.getApi();
    if (!apiResult.ok) return this.report(apiResult);
    try {
      apiResult.value.setActiveTool({ type });
      return { ok: true, value: undefined };
    } catch {
      return this.failure("failed", "Tool switching is unavailable in this Excalidraw view.");
    }
  }
  copySelectedElements(): BridgeOperationResult {
    return this.failure("unavailable", "Copy requires a compatible Excalidraw API.");
  }
  pasteAt(point: Point): BridgeOperationResult {
    void point;
    return this.failure("unavailable", "Paste requires a compatible Excalidraw API.");
  }

  private getApi(): BridgeResult<CompatibleImperativeApi> {
    try {
      return getLeafApi(this.leaf.view);
    } catch {
      return {
        ok: false,
        code: "failed",
        message: "Excalidraw API lookup failed for this leaf.",
      };
    }
  }

  private report<T>(result: Exclude<BridgeResult<T>, { ok: true }>): BridgeResult<never> {
    this.unsupported(result.message);
    return result;
  }
  private failure(
    code: "unavailable" | "incompatible" | "failed",
    message: string
  ): BridgeResult<never> {
    this.unsupported(message);
    return { ok: false, code, message };
  }
  private unsupported(message: string): void {
    if (!this.warned) {
      new Notice(`Excalidraw Stylus Controls: ${message}`);
      this.warned = true;
    }
  }
}
