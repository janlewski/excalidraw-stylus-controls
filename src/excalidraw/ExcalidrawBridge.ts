import { Notice, type WorkspaceLeaf } from "obsidian";
import type { Point } from "../stylus/types";
import {
  getGlobalAutomate,
  getLeafApi,
  readActiveTool,
  readNewElementId,
  type ActiveToolSnapshot,
  type BridgeOperationResult,
  type BridgeResult,
  type CompatibleImperativeApi,
  type SceneElementLike,
} from "./compatibility";
import { dispatchContextMenu, dispatchPointer } from "./syntheticPointer";
import { clientToScene, strokesToErase, zoomOf } from "./strokeHit";

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

  beginMomentaryEraser(raw: PointerEvent): BridgeResult<ActiveToolSnapshot> {
    const apiResult = this.getApi();
    if (!apiResult.ok) return this.report(apiResult);
    const tool = readActiveTool(apiResult.value);
    if (!tool) {
      return this.failure(
        "incompatible",
        "Temporary eraser could not read the current active tool."
      );
    }
    if (typeof raw.stopImmediatePropagation === "function") raw.stopImmediatePropagation();
    raw.preventDefault();
    const target = eventTarget(raw);
    if (!target) {
      return this.failure("failed", "Temporary eraser could not find the pointer target.");
    }
    dispatchPointer(target, "pointerdown", raw, { button: 5, buttons: 32 });
    const api = apiResult.value;
    nextFrame(() => {
      if (readActiveTool(api)?.type === "eraser") return;
      try {
        api.setActiveTool({ type: "eraser" });
      } catch {
        this.unsupported("Temporary eraser could not switch tools.");
        return;
      }
      this.unsupported("Fork temp-eraser is not available; using setActiveTool.");
    });
    return { ok: true, value: tool };
  }

  splitStrokeToEraser(
    last: PointerEvent,
    discardStroke: boolean
  ): BridgeResult<ActiveToolSnapshot> {
    const apiResult = this.getApi();
    if (!apiResult.ok) return this.report(apiResult);
    const tool = readActiveTool(apiResult.value);
    if (!tool) {
      return this.failure(
        "incompatible",
        "Temporary eraser could not read the current active tool."
      );
    }
    const target = eventTarget(last);
    if (!target) return this.failure("failed", "Stroke split could not find the pointer target.");
    const id = discardStroke ? readNewElementId(apiResult.value) : null;
    dispatchPointer(target, "pointerup", last, { button: 0, buttons: 0, pressure: 0 });
    dispatchPointer(target, "pointerdown", last, { button: 5, buttons: 32 });
    if (id) nextFrame(() => this.deleteElement(apiResult.value, id));
    return { ok: true, value: tool };
  }

  splitStrokeWithActiveTool(last: PointerEvent): BridgeResult<ActiveToolSnapshot> {
    const target = eventTarget(last);
    if (target) dispatchPointer(target, "pointerup", last, { button: 0, buttons: 0, pressure: 0 });
    const started = this.startTemporaryEraser();
    if (target) {
      dispatchPointer(target, "pointerdown", last, {
        button: 0,
        buttons: 1,
        pressure: last.pressure,
      });
    }
    return started;
  }

  endMomentaryEraser(saved: ActiveToolSnapshot): BridgeOperationResult {
    const apiResult = this.getApi();
    if (!apiResult.ok) return this.report(apiResult);
    const api = apiResult.value;
    nextFrame(() => {
      if (readActiveTool(api)?.type === "eraser") this.restoreTool(saved);
    });
    return { ok: true, value: undefined };
  }

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

  /** Ids present before a pen-down, so a barrel tap can delete that speck and the stroke under it. */
  currentSceneIds(): ReadonlySet<string> | null {
    const api = this.tryApi();
    if (!api?.getSceneElements) return null;
    const ids = new Set<string>();
    for (const element of api.getSceneElements()) {
      if (typeof element.id === "string") ids.add(element.id);
    }
    return ids;
  }

  eraseStrokeAt(client: Point, priorIds: ReadonlySet<string> | null): BridgeOperationResult {
    const api = this.tryApi();
    if (!api?.getSceneElements) {
      return this.failure("unavailable", "Stroke eraser could not read this drawing.");
    }
    const box = this.canvasBox();
    if (!box) return this.failure("failed", "Stroke eraser could not find the canvas.");
    const state = api.getAppState();
    const zoom = zoomOf(state.zoom);
    const scene = clientToScene(client, {
      left: box.left,
      top: box.top,
      scrollX: typeof state.scrollX === "number" ? state.scrollX : 0,
      scrollY: typeof state.scrollY === "number" ? state.scrollY : 0,
      zoom,
    });
    const doomed = strokesToErase(api.getSceneElements(), scene, priorIds, undefined, zoom);
    if (doomed.length === 0) return { ok: true, value: undefined };
    if (!this.deleteElements(doomed)) {
      return this.failure(
        "failed",
        "The tapped stroke could not be erased in this Excalidraw view."
      );
    }
    return { ok: true, value: undefined };
  }

  openContextMenu(point: Point): BridgeOperationResult {
    const target =
      (typeof document !== "undefined" && document.elementFromPoint(point.x, point.y)) ||
      this.leaf.view.containerEl;
    dispatchContextMenu(target, point);
    return { ok: true, value: undefined };
  }

  private tryApi(): CompatibleImperativeApi | null {
    try {
      const result = getLeafApi(this.leaf.view);
      return result.ok ? result.value : null;
    } catch {
      return null;
    }
  }

  private canvasBox(): { left: number; top: number } | null {
    const root = this.leaf.view.containerEl;
    const canvas =
      root.querySelector("canvas.excalidraw__canvas") ?? root.querySelector(".excalidraw__canvas");
    const rect = (canvas ?? root).getBoundingClientRect?.();
    if (!rect) return null;
    return { left: rect.left, top: rect.top };
  }

  private deleteElements(elements: SceneElementLike[]): boolean {
    const automate = getGlobalAutomate();
    if (typeof automate?.deleteViewElements !== "function") return false;
    try {
      automate.setView(this.leaf.view);
      return automate.deleteViewElements(elements) !== false;
    } catch {
      return false;
    }
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

  private deleteElement(api: CompatibleImperativeApi, id: string): void {
    const automate = getGlobalAutomate();
    const elements = api.getSceneElements?.() ?? [];
    const element = elements.find((candidate) => candidate.id === id);
    if (!element || typeof automate?.deleteViewElements !== "function") {
      this.unsupported("The late-press ink dot could not be deleted in this Excalidraw build.");
      return;
    }
    try {
      automate.setView(this.leaf.view);
      automate.deleteViewElements([element]);
    } catch {
      this.unsupported("The late-press ink dot could not be deleted in this Excalidraw build.");
    }
  }
}

function eventTarget(event: PointerEvent): EventTarget | null {
  return event.target ?? event.currentTarget;
}

function nextFrame(callback: () => void): void {
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => callback());
  else setTimeout(callback, 0);
}
