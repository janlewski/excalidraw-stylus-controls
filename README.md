# Excalidraw Stylus Controls

An Obsidian community plugin for configurable S Pen side-button gestures in
Excalidraw views.

| Gesture                         | Default action                                         |
| ------------------------------- | ------------------------------------------------------ |
| Hold the side button, then tap  | Erase that whole stroke                                |
| Hold the side button and drag   | Erase along the pen; the previous tool returns on lift |
| Hover side-button tap           | Open the stylus tool menu                              |
| Hover side-button double tap    | Open Excalidraw's right-click menu                     |
| Hover side-button hold, release | Do nothing (change this in settings)                   |

Copy and paste are still listed in settings, and they still do nothing until
Excalidraw exposes a compatible API. This plugin does not use Android's system
clipboard. A long hover press does nothing unless you assign that action.

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

## Samsung Notes gestures with the Android bridge

On a Samsung tablet the WebView reports the side button as `buttons: 1`, which is the same bit as pen contact. A tap with the button held also arrives as a right-click. The companion app `excalidraw-spen-bridge` reads the real button from the kernel and sends that level to this plugin on `ws://127.0.0.1:47631/v1/pen`. The gesture change itself is in this plugin.

1. Install the bridge APK and [Shizuku](https://shizuku.rikka.app/). Start Shizuku with Wireless debugging (any Wi-Fi network; a PC is not required) and grant this bridge access.
2. In the bridge, copy the pairing code. In this plugin, enable the bridge and paste the code. The fingerprint under the field must match the bridge.
3. Turn off Samsung Air command (Settings → Advanced features → S Pen → Air command). A hover press can otherwise open that panel instead of reaching Obsidian.
4. Hold the side button, then tap a stroke to erase the whole stroke, or drag to erase along the pen. That tap does not open the right-click menu. Hover and double-tap the button for Excalidraw's right-click menu. Hover and tap once for the tool menu. Releasing the button mid-stroke keeps erasing until you lift. The previous tool comes back on lift.

If the bridge is not connected, Android falls back to a hover latch: the side button must already be down while the pen is hovering, and the whole next stroke erases. A press that begins after contact does not. Diagnostics → Check bridge connection explains which path is active. The report never includes the pairing code. See [the tester guide](docs/TESTER-GUIDE.md) and [the wire protocol](docs/PEN_BRIDGE_PROTOCOL.md).

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
