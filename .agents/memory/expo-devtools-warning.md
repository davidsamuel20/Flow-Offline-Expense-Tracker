---
name: Expo DevTools warning
description: Non-blocking React Native DevTools startup error in the Replit Expo environment.
---

When the Expo workflow reports that React Native DevTools cannot load `libglib-2.0.so.0`, Metro may still bundle and serve the app normally. Confirm the web bundle and preview before treating this optional DevTools warning as an app failure.

**Why:** The current Replit Expo runtime lacks this system library, but the app itself successfully bundled and rendered.

**How to apply:** If the same warning appears, verify the preview and runtime logs first; do not add system dependencies unless the app or required debugging tools actually fail.
