const STORAGE_KEY = "excalidraw-stylus-controls:pairing";

export interface PairingApp {
  vault: { getName(): string };
  saveLocalStorage?: (key: string, value: string | null) => void;
  loadLocalStorage?: (key: string) => unknown;
}

/** Pairing code stays out of data.json so vault sync cannot copy it. */
export class PairingStore {
  constructor(private readonly app: PairingApp) {}

  load(): string {
    if (typeof this.app.loadLocalStorage === "function") {
      const value = this.app.loadLocalStorage(STORAGE_KEY);
      return typeof value === "string" ? value : "";
    }
    return this.storage().getItem(this.fallbackKey()) ?? "";
  }

  save(code: string): void {
    if (typeof this.app.saveLocalStorage === "function") {
      this.app.saveLocalStorage(STORAGE_KEY, code);
      return;
    }
    this.storage().setItem(this.fallbackKey(), code);
  }

  clear(): void {
    if (typeof this.app.saveLocalStorage === "function") {
      this.app.saveLocalStorage(STORAGE_KEY, null);
      return;
    }
    this.storage().removeItem(this.fallbackKey());
  }

  private fallbackKey(): string {
    return `excalidraw-stylus-controls:${this.app.vault.getName()}:pairing`;
  }

  private storage(): Storage {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    throw new Error("Local pairing storage is unavailable.");
  }
}
