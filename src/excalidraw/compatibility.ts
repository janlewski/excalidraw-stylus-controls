export interface ActiveToolSnapshot {
  type: string;
  [key: string]: unknown;
}

export interface ImperativeApi {
  getAppState?: () => { activeTool?: ActiveToolSnapshot };
  setActiveTool?: (tool: ActiveToolSnapshot) => void;
}

export interface CompatibleImperativeApi extends ImperativeApi {
  getAppState: () => { activeTool?: ActiveToolSnapshot };
  setActiveTool: (tool: ActiveToolSnapshot) => void;
}

export type BridgeFailureCode = "unavailable" | "incompatible" | "failed";

export type BridgeResult<T> =
  { ok: true; value: T } | { ok: false; code: BridgeFailureCode; message: string };

export type BridgeOperationResult = BridgeResult<void>;

export interface ExcalidrawLeafSurface {
  /**
   * This is a compatibility fallback, not a documented Excalidraw plugin API.
   * Keep access to it here until Excalidraw publishes a third-party, leaf-scoped
   * integration point.
   */
  excalidrawAPI?: unknown;
}

export interface ToolCapabilities {
  canReadActiveTool: boolean;
  canSetActiveTool: boolean;
}

export function toolCapabilities(api: ImperativeApi | null): ToolCapabilities {
  return {
    canReadActiveTool: typeof api?.getAppState === "function",
    canSetActiveTool: typeof api?.setActiveTool === "function",
  };
}

export function readActiveTool(api: ImperativeApi): ActiveToolSnapshot | null {
  const activeTool = api.getAppState?.().activeTool;
  return activeTool ? { ...activeTool } : null;
}

export function getLeafApi(view: unknown): BridgeResult<CompatibleImperativeApi> {
  if (!view || typeof view !== "object") {
    return {
      ok: false,
      code: "unavailable",
      message: "This leaf does not expose an Excalidraw view.",
    };
  }
  const api = (view as ExcalidrawLeafSurface).excalidrawAPI;
  if (!api || typeof api !== "object") {
    return {
      ok: false,
      code: "unavailable",
      message: "Excalidraw has not made an API available for this leaf.",
    };
  }
  const capabilities = toolCapabilities(api as ImperativeApi);
  if (!capabilities.canReadActiveTool || !capabilities.canSetActiveTool) {
    return {
      ok: false,
      code: "incompatible",
      message: "This Excalidraw API does not support active-tool read and write operations.",
    };
  }
  return { ok: true, value: api as CompatibleImperativeApi };
}
