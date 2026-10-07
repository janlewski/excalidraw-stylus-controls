export interface ActiveToolSnapshot {
  type: string;
  [key: string]: unknown;
}

export interface ImperativeApi {
  getAppState?: () => { activeTool?: ActiveToolSnapshot };
  setActiveTool?: (tool: ActiveToolSnapshot) => void;
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
