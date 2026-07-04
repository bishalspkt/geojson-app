---
name: release-check
description: Run geojson.app's full pre-merge/pre-deploy verification — build, lint, and the manual browser checklist. Use before committing significant changes, opening a PR, or deploying.
---

# Release check

This pipeline mirrors CI (`.github/workflows/ci.yml`) plus the browser checklist CI can't run. Run all of it; report results honestly.

## 1. Static gates (all must pass)

```bash
npm run lint      # zero-warnings policy — a single warning fails
npm test          # Vitest — stores, executor, ingestion, params
npm run build     # tsc + app build + embed SDK build
```

Also eyeball the reported `dist/embed.js` size: ~5 kB raw / ~2 kB gzip. CI enforces a 6 KB gzip ceiling; a jump means a dependency crept into the SDK — investigate.

## 2. Browser checklist (dev server or preview build)

Use the preview tools (`preview_start`, `preview_snapshot`, `preview_console_logs`, `preview_click`) — don't ask the user to check manually.

Core flows:
1. App loads with basemap; no console errors (PostHog key warnings are fine in local dev).
2. Import panel → load "Volcanoes" sample → features render, camera fits, layers panel opens.
3. Click a map feature → orange highlight + selected row in Layers panel; click again → deselect.
4. Feature eye toggle hides it; category eye hides the group; layer eye (multi-layer) hides the layer.
5. Right-click feature → Zoom to Feature, View Properties (dialog), Copy as GeoJSON, Delete.
6. Measure: panel opens, clicks add points, distances shown, Clear works, closing panel exits measure mode.
7. Search a city → result pins, camera flies, appears under "Search results" in Layers panel.
8. Theme switch (dark) — data + selection survive the style swap. Projection → globe shows starfield.
9. Drag-drop a .geojson file anywhere on the map.

Embed flows (if integration code changed):
10. `/?embed=1&geojson=<url>&chrome=full` → left panel, data loads, no top bar.
11. `/?embed=1&chrome=none` → bare canvas, compact attribution, no context menu.
12. Protocol round-trip: postMessage `getZoom` returns `ok: true` (snippet in the add-sdk-command skill).

## 3. Report

State exactly what passed/failed with the failing output. A skipped section is reported as skipped, not passed.
