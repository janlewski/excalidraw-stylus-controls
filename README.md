# Excalidraw Stylus Controls

An Obsidian community plugin in active 0.1.0 development for configurable S Pen
side-button gestures in Excalidraw views.

| Gesture | Default action |
| --- | --- |
| Hover side-button tap | Open tool menu |
| Hover side-button double tap | Copy selection |
| Hover side-button hold | Paste internal clipboard |
| Side button + pen contact | Temporary eraser; restores on lift |

It depends on the Excalidraw community plugin. Version 0.1 uses an internal,
in-memory clipboard; it does not integrate with Android's system clipboard.

Samsung S Pen event behaviour varies by WebView and device. Enable debug logging
in settings and collect a raw trace before relying on gesture mappings. This
project has not yet been physically validated on a Samsung device.

## Development

```sh
pnpm install
pnpm lint
pnpm build
```
