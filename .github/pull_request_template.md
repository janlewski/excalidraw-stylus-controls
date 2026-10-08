## Summary

<!-- What changed, why it matters, and any intentional scope limits. -->

## User-visible behavior

<!-- Describe gestures, settings, menus, notices, or compatibility changes. -->

## Validation

- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Generated `main.js`, `manifest.json`, and `styles.css` inspected when release-relevant

## Excalidraw and stylus safety

- [ ] The change targets the originating Excalidraw leaf; it does not route through the active leaf.
- [ ] Temporary-tool cleanup is covered for pointer up, cancel, disposal, view closure, and unload as applicable.
- [ ] Mouse, touch, and unrelated context menus remain unaffected.
- [ ] Compatibility probes and non-public integration points remain contained in the bridge.
- [ ] Copy/paste behavior and limitations are accurately described.

## Hardware validation

- [ ] Not required (explain why), or device testing was completed using `docs/DEVICE_TESTING.md`.
- [ ] Sanitized traces and device/version metadata are attached or linked when hardware behavior changed.

## Release notes

<!-- State `None` or give a concise user-facing note. -->

## Checklist

- [ ] Commit messages follow Conventional Commits.
- [ ] Documentation and tests reflect the change.
- [ ] No source was copied from the behavioral reference plugin without required attribution.
