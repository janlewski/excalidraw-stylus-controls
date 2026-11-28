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

1. In **Settings → Excalidraw Stylus Controls**, enable **Debug logging**,
   **Debug overlay**, and **S Pen test mode**. Test mode records recognition
   but suppresses menu, clipboard, and temporary-tool changes.
2. Open Android/Obsidian developer tools or the available log capture path.
3. Export the bounded trace after each scenario using **Export debug trace →
   Copy trace** in the plugin settings (or the **Copy latest stylus event trace**
   command).
4. Sanitize drawing content and personal paths before sharing a trace.
5. Store the trace as a fixture only when its device/version metadata is saved
   alongside it.

Try each **S Pen signal test profile** in a disposable drawing. Selecting a
profile enables test mode automatically. The standard
expected pattern is hover `pointermove` with `buttons: 0`, hover
barrel press with `buttons: 2`, pen contact with tip plus barrel (`pointerdown`
with `buttons: 3`, and possibly a pen `contextmenu`), lift (`pointerup`), then
hover barrel release with `buttons: 0`. `buttons: 1` by itself is only pen-tip
contact, not a barrel-button signal. The trace retains every received pen event
in its bounded buffer, so perform the hover-press test separately from drawing
and export immediately afterward. The debug overlay also exposes `button`,
pressure, tilt, twist, tangential pressure, and contact size. If the side button
uses another `buttons` bit on a device, select its candidate test profile and
capture a trace. This is an expectation, not an assumption: report any difference.

On Android, test `buttons: 1` only while hovering. Android System WebView may
translate the native primary stylus button to that same DOM bit as pen contact,
which makes it impossible to distinguish a barrel press from normal drawing
after the pen touches the screen. The plugin therefore uses bit `1` only for a
hover gesture that is established before contact; it will not infer a barrel
press from a contact-only `buttons: 1` event.

The **Android/WebView primary — buttons: 1, contact experiment** profile exists
only to make this ambiguity observable. It may recognize every ordinary pen
stroke; test mode must remain enabled and the test must use a disposable drawing.

## Functional cases

For each case, capture a trace and record pass/fail plus observations.

| Case                    | Steps                                                                               | Expected result                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Hover tap               | Hover, press/release side button once.                                              | Default menu opens after the double-tap interval; no canvas mark.                        |
| Hover double tap        | Hover, press/release side button twice inside configured interval.                  | Excalidraw's right-click menu opens at the pen. No tool menu and no eraser.              |
| Hover hold              | Hover, hold the button past the long-press delay, then release without touching.    | Nothing happens. Holding the button and then touching erases and does not fire the hold. |
| Barrel tap eraser       | Draw a stroke. Hold the side button and tap that stroke.                            | The whole stroke is deleted. The right-click menu does not open.                         |
| Temporary eraser        | Select free draw, hover with side button held, drag, lift.                          | Eraser begins on contact; free draw restores immediately on lift, before barrel release. |
| Repeated eraser strokes | Keep barrel held after lifting, contact/lift twice more, then release.              | Each contact enters/exits eraser; final release does not fire tap, double tap, or hold.  |
| Contact before hold     | Hold side button and contact before long-press delay.                               | Temporary eraser path wins; paste/hold never fires.                                      |
| Cancel/interruption     | Start temporary eraser, then trigger an interruption/cancel path or close the pane. | Previous tool restores; no stuck eraser.                                                 |
| Multiple panes          | Repeat temporary eraser in one pane while another Excalidraw pane is open.          | Only source pane/tool changes; traces and actions do not cross panes.                    |
| Mouse compatibility     | Right-click and draw with mouse.                                                    | No stylus handling or prevented context menu.                                            |
| Touch compatibility     | Pan/draw with finger as appropriate for Excalidraw.                                 | No stylus handling or prevented touch behavior.                                          |
| No-barrel stylus        | Draw with a stylus without a recognized side-button sequence.                       | Normal pen drawing; no temporary tool or menu.                                           |

Repeat temporary-eraser testing while free draw, rectangle, arrow, text, and
selection are active. The exact prior active-tool data must restore after lift.

## Bridge and hover-latch cases

Use a new empty drawing. After each part, run **Copy diagnostics report** and paste it with one line about what happened. No developer console is required.

| Case                   | Steps                                                                        | Expected                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Probe                  | Hover the settings probe, press the side button, then draw while holding it. | Pen seen: yes. Note `buttons` while hovering and while touching.                                 |
| Hover latch, no bridge | Hover with the button held, draw, lift. Repeat three times, then release.    | Each stroke erases. The menu does not open at the end.                                           |
| Hover tap              | Tap the side button once while hovering.                                     | The stylus menu opens. No stray line appears.                                                    |
| Bridge check           | Diagnostics → Check bridge connection.                                       | Every line through Source is ok, or the verdict says why it is not.                              |
| Press before contact   | Hold the button, then tap an existing stroke. Drag across others.            | The tap deletes that stroke and does not open the right-click menu. A drag erases along the pen. |
| Press mid-stroke       | Start a line, press halfway.                                                 | Ink so far stays. The rest of that contact erases.                                               |
| Release mid-stroke     | Start erasing, release the button before lift.                               | Keeps erasing until lift. The next stroke draws.                                                 |
| Quick press            | Press as you touch, 20 times.                                                | At most 2 leftover ink dots.                                                                     |
| Two panes              | Two drawings side by side.                                                   | Only the drawing under the pen changes tool.                                                     |
| Bridge dies            | Stop Shizuku while holding the button.                                       | Status shows pen unavailable or disconnected. The next lift restores the pen tool.               |
| Mouse and touch        | Pan, zoom, and use a mouse if you have one.                                  | Unchanged.                                                                                       |

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
