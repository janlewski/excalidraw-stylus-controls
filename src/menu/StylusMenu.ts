import type { ExcalidrawBridge } from "../excalidraw/ExcalidrawBridge";
import type { Point } from "../stylus/types";

export class StylusMenu {
  private element: HTMLElement | null = null;
  open(point: Point, bridge: ExcalidrawBridge): void {
    this.close();
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
        callback();
        this.close();
      });
    }
    const left = Math.min(Math.max(8, point.x), window.innerWidth - 180);
    const top = Math.min(Math.max(8, point.y), window.innerHeight - 300);
    menu.setCssProps({ left: `${left}px`, top: `${top}px` });
    this.element = menu;
    window.setTimeout(
      () =>
        document.addEventListener("pointerdown", this.close, {
          once: true,
          capture: true,
        }),
      0
    );
  }
  close = (): void => {
    this.element?.remove();
    this.element = null;
  };
}
