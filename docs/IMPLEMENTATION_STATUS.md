# Excalidraw Stylus Controls — implementation checklist

This is the living delivery checklist for version 0.1.0. Status reflects the
repository, not an intended design.

Legend: `[x]` complete, `[-]` in progress, `[ ]` not started, `[~]` deferred.

## Product decisions

- [x] Plugin name and ID: **Excalidraw Stylus Controls** /
      `excalidraw-stylus-controls`.
- [x] Primary package manager: `pnpm` (commit `pnpm-lock.yaml`; do not maintain
      `package-lock.json`).
- [x] Copy/paste for 0.1 uses a private, in-memory Excalidraw-element clipboard.
      It is intentionally not the Android/system clipboard.
- [x] The reference project is behavioural research only. No source has been
      copied into this repository.
- [x] Samsung S Pen support is based on known Android WebView PointerEvent
      behaviour and requires physical-device verification before release.

## Repository and delivery hygiene

- [x] Agent working rules and commit attribution policy ([AGENTS.md](AGENTS.md)).
- [x] Plugin scaffold: manifest, package metadata, TypeScript, esbuild, styles,
      version metadata, README, MIT license.
- [x] `pnpm install`, `pnpm dev`, and `pnpm build` workflows.
- [x] Production outputs: `main.js`, `manifest.json`, and `styles.css`.
- [ ] README: controls table, requirements, compatibility, install steps,
      hardware-validation caveat, and attribution.
- [ ] Release verification and generated-bundle inspection.

## Diagnostics first

- [x] Per-Excalidraw-view capture-phase Pointer Event watcher.
- [x] Normalized raw-event format: event kind, pointer type, buttons, button,
      pressure, coordinates, timestamp, contact classification, and state snapshot.
- [x] Debug setting, rate-limited console logger, optional per-view overlay, and
      copyable event trace for device reports.
- [ ] Hardware trace fixtures for supported Samsung/Obsidian versions.

## Excalidraw integration

- [ ] Leaf-aware `ExcalidrawBridge` with public/API-compatible access only.
- [-] Graceful missing-plugin and incompatible-API notices for temporary-tool
  and menu actions. Copy/paste API support remains to be implemented.
- [ ] Capability checks for API acquisition, active-tool get/set, selection, and
      scene updates.
- [ ] Capture and restore the full active-tool value where supported.
- [ ] Internal selection copy and paste at the stylus position.

## Gesture state machine

- [x] DOM-independent normalized-event input and injected clock/timers.
- [x] Explicit hover/contact/barrel-held/consumed/temporary-tool states.
- [x] Hover barrel transition recognition (`buttons` 0 → 1 → 0) for pen input.
- [x] Movement threshold based on Euclidean distance.
- [x] Delayed single-tap resolution and double-tap cancellation.
- [x] Long-hold resolution and gesture consumption.
- [x] Contact-before-timeout priority over hold/tap actions.
- [x] Context-menu suppression only for recognised temporary-eraser interactions.

## Core 0.1 behaviour

- [ ] Button-held pen contact enters temporary eraser.
- [ ] Pen lift immediately restores the prior tool, before barrel release.
- [ ] Repeated strokes during one held physical button each enter/exit eraser.
- [ ] A consumed physical hold triggers no action upon release.
- [ ] Cleanup restores a temporary tool on pointer cancel, watcher/view disposal,
      view closure, and plugin unload.
- [ ] Tap, double-tap, hold, and contact actions map independently to settings.

## UI and settings

- [ ] “S Pen side button” mappings: tap, double tap, hold, and pen contact.
- [ ] Advanced timing: double-tap interval, long-press delay, movement threshold.
- [ ] Diagnostics: debug logging and optional event overlay.
- [ ] Compact anchored stylus menu with large targets, viewport clamping, and
      appropriate dismissal.
- [~] Object tap menu and object workflows. Defer until 0.2; do not expose a
  non-functional setting in 0.1.

## Tests and release acceptance

- [-] Unit tests: normal tap, double tap, long hold, temporary eraser, repeated
  erasing under one hold, contact before hold timeout, and pointer cancel.
- [ ] Compatibility tests: mouse unaffected; normal pen drawing unaffected;
      no-barrel-button styluses degrade gracefully.
- [ ] Lifecycle/multi-view tests: unload restoration, listener disposal, and
      independent controller state per Excalidraw pane.
- [ ] Manual Samsung device matrix with exported raw pointer traces.
- [ ] Validate AC1–AC13 that remain in 0.1 scope; object-tap-specific coverage
      moves with that feature to 0.2.

## Deliberately deferred beyond 0.1

- [~] Object hit-testing, object action menus, connector mode, duplication and
  deletion workflows.
- [~] Rich insertion features such as stickers, embeds, image/note pickers, and
  scene-template commands.
- [~] Custom radial-menu layout, stylus profiles, per-device mappings, and
  configurable temporary tools beyond eraser.
