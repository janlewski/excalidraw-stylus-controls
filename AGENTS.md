# Repository rules for agents

## Scope and safety

- Build an independent Obsidian community plugin with the ID
  `excalidraw-stylus-controls`; do not copy the architecture or source files of
  `../excalidraw-stylus-menu`.
- The reference plugin may be inspected for behavioural evidence only. If code
  is directly reused, preserve its MIT licence and copyright notice, identify
  the reused portion in `NOTICE`/the README, and explain why reuse was needed.
- Prefer public, documented Obsidian and Excalidraw APIs. Keep compatibility
  checks in a dedicated bridge; do not scatter private-plugin access through
  gesture or UI code.
- Preserve existing user changes. Do not reset, clean, force-push, or delete
  files unless the user explicitly authorizes the exact operation.

## Stylus implementation rules

- Treat Samsung S Pen input as a per-view, testable state machine operating on
  normalized Pointer Events. The DOM watcher must not contain gesture policy or
  Excalidraw API calls.
- Implement and retain the raw Pointer Event logger before relying on hardware
  assumptions. Do not claim physical-device validation without the user's test
  results.
- Only observe pen events for stylus behaviour. Mouse, touch, and unrelated
  context menus must remain unaffected.
- Temporary tool cleanup is mandatory on `pointerup`, `pointercancel`, watcher
  destruction, view detach, and plugin unload. A consumed barrel-button hold
  must never later trigger a tap, double-tap, or hold action.
- Attach at most one watcher to each Excalidraw view and dispose every listener
  and timer with that watcher.

## Quality gates

- Add deterministic unit tests for the gesture state machine using fake time;
  hardware-specific DOM traces belong in fixtures and manual test notes.
- Run the declared typecheck, unit tests, and production build after relevant
  changes. Inspect generated artifacts before release work.
- Keep 0.1.0 deliberately small: reliable diagnostics, temporary eraser,
  configurable hover actions, and a small menu take priority over secondary
  object workflows.

## Dependencies and package management

- `pnpm` is the preferred package manager for this repository. Commit
  `pnpm-lock.yaml`; do not introduce or update `package-lock.json`.
- Do not bundle Excalidraw or add a runtime dependency on it. Missing or
  incompatible Excalidraw must fail gracefully with an actionable notice.

## Git commits and attribution

- Never change `user.name`, `user.email`, `GIT_AUTHOR_*`, or `GIT_COMMITTER_*`.
  Agents are not commit authors and must not add `Co-authored-by` trailers.
- When asked to create a commit, use the repository's configured identity and
  append this final message trailer, after any other trailers:

    `Assisted-by: Codex`

- Do not create a commit unless the user explicitly asks for one.
