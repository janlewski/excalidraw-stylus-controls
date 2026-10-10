# Excalidraw Stylus Controls

An Obsidian community plugin in active 0.1.4 development for configurable S Pen
side-button gestures in Excalidraw views.

| Gesture                      | Default action                     |
| ---------------------------- | ---------------------------------- |
| Hover side-button tap        | Open the stylus tool menu          |
| Hover side-button double tap | Copy selection*                    |
| Hover side-button hold       | Paste*                             |
| Side button + pen contact    | Temporary eraser; restores on lift |

\*Selection copy and paste await a compatible Excalidraw integration and are
currently unavailable. Remap those actions to **Do nothing** in settings if you
do not need them. This plugin does not use Android's system clipboard.

## Requirements and compatibility

- Obsidian 1.6.0 or later.
- The Excalidraw community plugin enabled, with an Excalidraw drawing open.
- A pen that exposes its side button through browser Pointer Events.

The temporary tool and menu use an optional Excalidraw compatibility boundary.
If its required API is unavailable, the plugin leaves the drawing unchanged.
Samsung S Pen event behaviour varies by WebView and device. Enable debug logging
and the debug overlay in settings, then collect a raw trace before relying on
gesture mappings. The default barrel mapping follows Pointer Events
(`buttons: 2`); the diagnostic settings include documented alternatives when a
device reports a different bit. This project has not yet been physically
validated on a Samsung device.

## Install for testing

Build the plugin, then copy `main.js`, `manifest.json`, and `styles.css` into
`<vault>/.obsidian/plugins/excalidraw-stylus-controls/`. Enable the plugin in
Obsidian's Community Plugins settings after enabling Excalidraw. See
[the device test protocol](docs/DEVICE_TESTING.md) before reporting S Pen
compatibility.

## Development

```sh
pnpm install
pnpm format:check
pnpm lint
pnpm build
```

No code has been reused from the behavioural reference plugin.
