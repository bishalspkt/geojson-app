---
name: add-map-tool
description: Add an interactive map tool (exclusive pointer mode like measure, draw, inspect) to geojson.app. Use when asked to add a drawing tool, editing mode, or any click-driven map interaction.
---

# Add an interactive map tool

Tools are exclusive pointer modes: while one is active, normal feature hover/click is suppressed, the cursor changes, and the tool receives map clicks. Measure is the reference implementation.

## Steps

1. **Define the tool** at `src/extensions/tools/builtin/<name>.ts` implementing `MapTool` from `@/core/tools`:

```ts
import { MapTool } from '@/core/tools';

export const <name>Tool: MapTool = {
  id: '<name>',
  cursor: 'crosshair',                      // CSS cursor while active
  onActivate(ctx) { /* optional setup; ctx.map is the live MapLibre map */ },
  onMapClick(e, ctx) {
    // e.lngLat = {lng, lat}. Write results to a store, never to component state.
  },
  onDeactivate(ctx) { /* cleanup */ },
};
```

2. **Tool state lives in a store.** For small state, extend `src/state/tools-store.ts` (pattern: `measurePoints` + actions, cleared when the tool deactivates via `setActiveTool`). Larger tools get their own store file in `src/state/`.

3. **Register** in `src/extensions/index.ts` → `registerBuiltinExtensions()`: `registerTool(<name>Tool);`. The engine resolves tools by id — no engine changes needed.

4. **Map visualization** (if the tool draws something): add a system overlay in `src/core/overlays/<name>.ts` using `sysId('<name>')` ids (pattern: `measure.ts` — an `ensure<Name>Overlay(map)` + a `set<Name>Data(map, …)` setter). Wire it in `src/core/engine.ts`: ensure it in the initial-paint block AND in the theme-swap `style.load` handler, add its layer ids to the raise list, and subscribe its store slice. This is the one place tools currently touch the engine.

5. **Activate/deactivate from UI**: `useToolsStore.getState().setActiveTool('<name>' | null)`. If the tool pairs with a panel, add the pairing to `src/features/controls/panel-policy.ts` (see the measure pairing) so opening/closing the panel drives the tool.

6. **Tests**: store logic is unit-testable — add cases to `src/state/stores.test.ts` (activation clears state, points accumulate, etc.).

## Rules

- Never bind raw `map.on('click')` yourself — the engine owns tool click routing (single active tool guarantee).
- Overlay ids must come from `sysId()`; data-layer ids are off-limits.
- Don't mutate data layers from a tool directly; go through `useLayersStore` actions so undo/extension hooks stay possible.

## Verify

`npm run lint && npm test && npm run build`, then in the dev server: activate → cursor changes and feature hover stops; clicks drive the tool; switching panels/tools deactivates cleanly; theme swap preserves the tool's overlay.
