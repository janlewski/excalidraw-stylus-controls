# Samsung S Pen device test protocol

This protocol validates the real Android WebView event behavior that cannot be
proven by unit tests. It must be run before describing a release as physically
verified.

## Before testing

Record these details in the test report:

- Device model and Android version.
- S Pen model/firmware if available.
- Obsidian mobile version and Excalidraw plugin version.
- Excalidraw Stylus Controls commit or plugin version.
- Whether the test uses a clean vault or an existing vault.

Install the generated `main.js`, `manifest.json`, and `styles.css` in the
vault's `plugins/excalidraw-stylus-controls/` directory. Enable both this plugin
and Excalidraw, then open an Excalidraw drawing in one pane. Repeat the
multi-pane cases with a second drawing open beside it.

## Collect a raw trace first

1. In **Settings → Excalidraw Stylus Controls**, enable **Debug logging** and
   **Debug overlay**.
2. Open Android/Obsidian developer tools or the available log capture path.
3. Export the bounded trace using **Copy latest stylus event trace** after each
   scenario.
4. Sanitize drawing content and personal paths before sharing a trace.
5. Store the trace as a fixture only when its device/version metadata is saved
   alongside it.

The expected starting pattern is hover `pointermove` with `buttons: 0`, hover
barrel press with `buttons: 1`, pen contact (`pointerdown` and possibly a pen
`contextmenu`), lift (`pointerup`), then hover barrel release with `buttons: 0`.
This is an expectation, not an assumption: report any difference.

## Functional cases

For each case, capture a trace and record pass/fail plus observations.

| Case                    | Steps                                                                               | Expected result                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Hover tap               | Hover, press/release side button once.                                              | Default menu opens after the double-tap interval; no canvas mark.                        |
| Hover double tap        | Hover, press/release side button twice inside configured interval.                  | Copy action only; no menu/tap action.                                                    |
| Hover hold              | Hover, hold button past long-press delay.                                           | Paste action only; no tap action upon release.                                           |
| Temporary eraser        | Select free draw, hover with side button held, contact, make a stroke, lift.        | Eraser begins on contact; free draw restores immediately on lift, before barrel release. |
| Repeated eraser strokes | Keep barrel held after lifting, contact/lift twice more, then release.              | Each contact enters/exits eraser; final release does not fire tap, double tap, or hold.  |
| Contact before hold     | Hold side button and contact before long-press delay.                               | Temporary eraser path wins; paste/hold never fires.                                      |
| Cancel/interruption     | Start temporary eraser, then trigger an interruption/cancel path or close the pane. | Previous tool restores; no stuck eraser.                                                 |
| Multiple panes          | Repeat temporary eraser in one pane while another Excalidraw pane is open.          | Only source pane/tool changes; traces and actions do not cross panes.                    |
| Mouse compatibility     | Right-click and draw with mouse.                                                    | No stylus handling or prevented context menu.                                            |
| Touch compatibility     | Pan/draw with finger as appropriate for Excalidraw.                                 | No stylus handling or prevented touch behavior.                                          |
| No-barrel stylus        | Draw with a stylus without a recognized side-button sequence.                       | Normal pen drawing; no temporary tool or menu.                                           |

Repeat temporary-eraser testing while free draw, rectangle, arrow, text, and
selection are active. The exact prior active-tool data must restore after lift.

## Report template

```text
Date:
Plugin commit/version:
Device / Android:
Obsidian / Excalidraw versions:

Case: <name>
Result: pass | fail | blocked
Observed PointerEvent sequence:
Trace fixture: <file or omitted>
Notes / unexpected behavior:
```

## After testing

Turn debug logging and overlay back off. If behavior differs from the expected
sequence, update the normalizer or contact classifier with a corresponding
sanitized fixture and deterministic test. Do not patch gesture or Excalidraw
action code directly around a single device trace.
