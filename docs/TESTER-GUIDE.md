# Tester guide

You do not need a computer, adb, or the developer console. Use a test vault and a new empty Excalidraw drawing. After each part, tap **Copy diagnostics report** (or run that command from the command palette) and paste the result with one sentence about what you saw.

Install this plugin from the GitHub pre-release with BRAT, and enable pre-releases in BRAT. The version in Diagnostics contains `-diag`.

## A. Without the bridge

1. Settings → Diagnostics shows this plugin version, the Obsidian version, and the Excalidraw version.
2. On the pen probe, hover, press and release the side button, then draw while holding it. Note whether "Pen seen" is yes, and the `buttons` values while hovering and while touching.
3. Open an empty drawing and tap **Test temporary eraser**. It should say the fork eraser is available, or that it is using the fallback.
4. Copy the report and paste it. That alone says whether the hover latch can work.

## B. Hover latch

Leave the bridge off or unpaired.

5. With the pen tool selected: hover, hold the side button, touch and draw, then lift. The stroke erases and the pen tool comes back.
6. Do that three times without letting go of the button, then let go. Each stroke erases. The menu does not open at the end.
7. Hover and tap the side button once. The stylus menu opens. Pressing the button over the canvas while hovering does not draw a stray line.

## C. With the bridge

You need a Samsung tablet, Shizuku started, and the bridge app running. Turn off Air command first.

8. **Check bridge connection**. If any line is not ok, copy the report and stop. The verdict line says why.
9. Paste the pairing code and compare fingerprints. Live status says ready, and a side-button press shows a latency.
10. Hold the button, then draw. There is no ink dot. Lift, and the previous tool is back. Try the pen tool and the rectangle tool.
11. Start a line and press the button halfway. The line so far stays. The rest of the same stroke erases.
12. Start while holding the button, then let go of the button before you lift. It keeps erasing until you lift. The next stroke draws.
13. Press the button at almost the same moment you touch, 20 times. Count leftover ink dots. The target is at most 2.
14. A hover tap opens the menu. Double tap and hold show their notices.
15. Two drawings side by side: only the one under the pen changes tool.
16. Stop Shizuku, or force-stop the bridge, while holding the button. Status shows the pen is unavailable or the bridge is disconnected. The next lift returns the pen tool. Start them again and the status returns to ready within about 5 seconds. Leaving Obsidian and coming back reconnects right away.
17. Finger pan and zoom still work. A mouse, if you have one, still works.
18. Copy the report and note which of 10–13 worked, and how many dots you saw in 13.

The report does not contain your pairing code, vault name, note text, or where you touched the screen.
