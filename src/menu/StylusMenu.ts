import type { ExcalidrawBridge } from "../excalidraw/ExcalidrawBridge";
import type { Point } from "../stylus/types";

const MENU_MARGIN_PX = 8;
const FALLBACK_MENU_SIZE = { width: 172, height: 300 };

export function clampMenuPosition(
  point: Point,
  viewport: { width: number; height: number },
  menu: { width: number; height: number }
): Point {
  return {
    x: Math.max(MENU_MARGIN_PX, Math.min(point.x, viewport.width - menu.width - MENU_MARGIN_PX)),
    y: Math.max(MENU_MARGIN_PX, Math.min(point.y, viewport.height - menu.height - MENU_MARGIN_PX)),
  };
}

export class StylusMenu {
  private element: HTMLElement | null = null;
  private outsideListener: ((event: PointerEvent) => void) | null = null;
  private openGeneration = 0;

  open(point: Point, bridge: ExcalidrawBridge): void {
    this.close();
    const generation = this.openGeneration;
    const menu = document.body.createDiv({ cls: "excalidraw-stylus-menu" });
    const actions: Array<[string, () => void]> = [
      ["Selection", () => bridge.setTool("selection")],
      ["Free draw", () => bridge.setTool("freedraw")],
      ["Eraser", () => bridge.setTool("eraser")],
      ["Rectangle", () => bridge.setTool("rectangle")],
      ["Arrow", () => bridge.setTool("arrow")],
      ["Copy", () => bridge.copySelectedElements()],
      ["Paste", () => bridge.pasteAt(point)],
    ];
    for (const [name, callback] of actions) {
      const button = menu.createEl("button", {
        text: name,
        cls: "excalidraw-stylus-menu__item",
      });
      button.addEventListener("pointerup", (event) => {
        event.stopPropagation();
        event.preventDefault();
        callback();
        this.close();
      });
    }
    this.element = menu;
    const position = clampMenuPosition(
      point,
      { width: window.innerWidth, height: window.innerHeight },
      {
        width: menu.offsetWidth || FALLBACK_MENU_SIZE.width,
        height: menu.offsetHeight || FALLBACK_MENU_SIZE.height,
      }
    );
    menu.setCssProps({ left: `${position.x}px`, top: `${position.y}px` });
    window.setTimeout(() => {
      if (generation !== this.openGeneration || !this.element) return;
      this.outsideListener = (event) => {
        if (!this.element?.contains(event.target as Node)) this.close();
      };
      document.addEventListener("pointerdown", this.outsideListener, true);
    }, 0);
  }
  close = (): void => {
    this.openGeneration += 1;
    if (this.outsideListener)
      document.removeEventListener("pointerdown", this.outsideListener, true);
    this.outsideListener = null;
    this.element?.remove();
    this.element = null;
  };
}
