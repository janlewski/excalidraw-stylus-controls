# Excalidraw Stylus Controls — implementation checklist

This is the living delivery checklist for version 0.1.0. Status reflects the
repository, not an intended design.

Legend: `[x]` complete, `[-]` in progress, `[ ]` not started, `[~]` deferred.

## Product decisions

- [x] Plugin name and ID: **Excalidraw Stylus Controls** /
      `excalidraw-stylus-controls`.
- [x] Primary package manager: `pnpm` (commit `pnpm-lock.yaml`; do not maintain
      `package-lock.json`).
- [~] Internal, in-memory selection copy/paste is deferred. It will never be
  represented as Android or system clipboard support.
- [x] The reference project is behavioural research only. No source has been
      copied into this repository.
- [x] Samsung S Pen support is based on known Android WebView PointerEvent
      behaviour and requires physical-device verification before release.

## Repository and delivery hygiene

- [x] Agent working rules and commit attribution policy ([AGENTS.md](AGENTS.md)).
- [x] Plugin scaffold: manifest, package metadata, TypeScript, esbuild, styles,
      version metadata, README, MIT license.
- [x] `pnpm install`, `pnpm dev`, and `pnpm build` workflows.
- [x] Pull-request quality gates: format, lint, typecheck, tests, and bundle
      each run as an independent GitHub Actions check.
- [x] Production outputs: `main.js`, `manifest.json`, and `styles.css`.
- [x] README: controls table, requirements, compatibility, install steps,
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

- [-] Leaf-aware `ExcalidrawBridge` with an isolated optional API probe. A stable
  public plugin-to-plugin acquisition API remains unavailable.
- [x] Graceful, once-per-view missing/incompatible-API notices for temporary-tool
      and menu actions. Copy/paste API support remains deliberately deferred.
- [-] Capability checks for API acquisition and active-tool get/set. Selection
  and scene-update capabilities remain deferred with clipboard work.
- [x] Capture and restore the full active-tool value where supported.
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

- [x] Button-held pen contact enters temporary eraser when the compatible bridge
      accepts the tool switch.
- [x] Pen lift immediately restores the prior tool, before barrel release.
- [x] Repeated strokes during one held physical button each enter/exit eraser.
- [x] A consumed physical hold triggers no action upon release.
- [x] Cleanup restores a temporary tool on pointer cancel, watcher/view disposal,
      view closure, and plugin unload.
- [x] Tap, double-tap, hold, and contact actions map independently to settings.

## UI and settings

- [x] “S Pen side button” mappings: tap, double tap, hold, and pen contact.
- [x] Advanced timing: double-tap interval, long-press delay, movement threshold.
- [x] Diagnostics: debug logging and optional event overlay.
- [x] Compact anchored stylus menu with large targets, viewport clamping, and
      appropriate dismissal.
- [~] Object tap menu and object workflows. Defer until 0.2; do not expose a
  non-functional setting in 0.1.

## Tests and release acceptance

- [x] Unit tests: normal tap, double tap, long hold, movement cancellation,
      temporary eraser, repeated erasing under one hold, contact before hold timeout,
      pointer cancel, context-menu isolation, and disposal.
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
