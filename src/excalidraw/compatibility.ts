export interface ActiveToolSnapshot {
  type: string;
  [key: string]: unknown;
}

export interface SceneElementLike {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  angle?: number;
  isDeleted?: boolean;
  locked?: boolean;
}

export interface AppStateLike {
  activeTool?: ActiveToolSnapshot;
  newElement?: { id?: string } | null;
  draggingElement?: { id?: string } | null;
  scrollX?: number;
  scrollY?: number;
  zoom?: { value?: number } | number;
}

export interface ImperativeApi {
  getAppState?: () => AppStateLike;
  setActiveTool?: (tool: ActiveToolSnapshot) => void;
  getSceneElements?: () => SceneElementLike[];
}

export interface CompatibleImperativeApi extends ImperativeApi {
  getAppState: () => AppStateLike;
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

/** The documented, view-targeted portion of ExcalidrawAutomate used by this plugin. */
export interface ExcalidrawAutomateSurface {
  setView: (view: unknown) => unknown;
  getExcalidrawAPI: () => unknown;
  deleteViewElements?: (elements: unknown[]) => boolean;
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

export function readNewElementId(api: ImperativeApi): string | null {
  const state = api.getAppState?.();
  const id = state?.newElement?.id ?? state?.draggingElement?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function hasNewElementField(state: unknown): boolean {
  return (
    !!state && typeof state === "object" && ("newElement" in state || "draggingElement" in state)
  );
}

export interface InstalledExcalidraw {
  installed: boolean;
  enabled: boolean;
  version: string | null;
}

interface PluginHost {
  plugins?: Record<string, { manifest?: { version?: string } } | undefined>;
  enabledPlugins?: { has?: (id: string) => boolean };
}

export function readInstalledExcalidraw(app: object): InstalledExcalidraw {
  const host = app as { plugins?: PluginHost };
  const plugin = host.plugins?.plugins?.["obsidian-excalidraw-plugin"];
  return {
    installed: Boolean(plugin),
    enabled: host.plugins?.enabledPlugins?.has?.("obsidian-excalidraw-plugin") === true,
    version: plugin?.manifest?.version ?? null,
  };
}

export function getLeafApi(
  view: unknown,
  automate = getGlobalAutomate()
): BridgeResult<CompatibleImperativeApi> {
  if (!view || typeof view !== "object") {
    return {
      ok: false,
      code: "unavailable",
      message: "This leaf does not expose an Excalidraw view.",
    };
  }
  if (automate) {
    try {
      // ExcalidrawAutomate documents setView(view) specifically so operations
      // are scoped to that view. Never pass "active" here.
      automate.setView(view);
      return validateImperativeApi(automate.getExcalidrawAPI());
    } catch {
      return {
        ok: false,
        code: "failed",
        message: "Excalidraw could not target this leaf's canvas.",
      };
    }
  }

  // This fallback is deliberately isolated: it is not part of Excalidraw's
  // documented third-party API surface.
  const api = (view as ExcalidrawLeafSurface).excalidrawAPI;
  return validateImperativeApi(api);
}

export function getGlobalAutomate(): ExcalidrawAutomateSurface | null {
  const candidate = (globalThis as { ExcalidrawAutomate?: unknown }).ExcalidrawAutomate;
  if (
    candidate &&
    typeof candidate === "object" &&
    typeof (candidate as ExcalidrawAutomateSurface).setView === "function" &&
    typeof (candidate as ExcalidrawAutomateSurface).getExcalidrawAPI === "function"
  ) {
    return candidate as ExcalidrawAutomateSurface;
  }
  return null;
}

function validateImperativeApi(api: unknown): BridgeResult<CompatibleImperativeApi> {
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
