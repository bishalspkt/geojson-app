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
npm run size      # initial-load budget (everything before the map draws)
```

Also eyeball the reported `dist/embed.js` size: ~5 kB raw / ~2 kB gzip. CI enforces a 6 KB gzip ceiling; a jump means a dependency crept into the SDK — investigate.

## 2. Browser checklist (dev server or preview build)

Use the preview tools — don't ask the user to check manually. The preview pane is often hidden (MapLibre stalls without animation frames); a headless system Chrome via playwright-core renders WebGL reliably for screenshots at desktop (1280×800), phone (390×844, isMobile) and embed sizes.

Core flows:
1. App loads with basemap; no console errors (PostHog key warnings are fine in local dev).
2. Import panel → load "Volcanoes" sample → features render, camera fits, layers panel opens.
3. Click a map feature → orange highlight + selected row in Layers panel; click again → deselect.
4. Feature eye toggle hides it; category eye hides the group; layer eye (multi-layer) hides the layer.
5. Right-click feature → Zoom to Feature, View Properties (dialog), Copy as GeoJSON, Delete.
6. Measure: panel opens, clicks add points, distances shown, Clear works, closing panel exits measure mode.
7. Search a city → result pins, camera flies, appears under "Search results" in Layers panel.
8. Theme switch (dark) — data + selection survive the style swap. Projection → globe shows starfield.
9. Drag-drop a .geojson file anywhere on the map; paste a GeoJSON link in the Import panel.
10. Phone width: tab bar fits, panels are bottom sheets (header collapses), timeline and compare labels sit above the sheet.
11. Dark basemap: every panel, menu, toast and chart is dark and legible.
12. Story: open a chapter link (`/?story=<name>&chapter=<id>`) with terrain — it lands at the chapter's zoom; step chapters with → and the contents list.
13. Production build under headers: serve `dist/` with `public/_headers` applied and check the console for CSP violations.

Embed flows (if integration code changed):
14. `/?embed=1&geojson=<url>&chrome=full` → left panel (bottom sheet below 640 px), data loads, no top bar.
15. `/?embed=1&chrome=none` → bare canvas, compact attribution, no context menu.
16. Protocol round-trip: postMessage `getZoom` returns `ok: true` (snippet in the add-sdk-command skill).

## 3. Report

State exactly what passed/failed with the failing output. A skipped section is reported as skipped, not passed.
