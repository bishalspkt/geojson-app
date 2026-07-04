---
name: add-context-action
description: Add a right-click context-menu action to the geojson.app map. Use when asked to add a context menu item, right-click action, or per-feature action.
---

# Add a context-menu action

Actions are data-only registrations. The menu component, positioning, and dispatch already exist.

## Steps

1. **Register the action** in `src/extensions/context-menu/builtin/actions.ts` inside `registerBuiltinContextMenuActions()` (or a new module called from `src/extensions/index.ts` if it's a distinct feature):

```ts
contextMenuRegistry.register({
  id: '<kebab-id>',
  label: '<Menu Label>',
  group: 'navigate' | 'data' | 'edit' | 'style' | 'danger',  // menu section order
  order: <n>,                                                 // within group
  isVisible: (ctx) => ctx.feature !== null && !ctx.isEmbed,   // when to show
  execute: (ctx) => { /* ... */ },
});
```

2. **The context is pure data**: `ctx = { feature: IdentifiedFeature | null, lngLat: {lng, lat}, isEmbed: boolean }`. For behavior, call stores imperatively:
   - Mutate data: `useLayersStore.getState().removeFeature(ctx.feature.id)` etc.
   - Camera: `useUiStore.getState().requestFocus({ kind: 'feature', featureId })` (consistent padding policy) — do NOT call MapLibre directly.
   - Dialogs: `useUiStore.getState().showProperties(fid)`.
   - Tools: `useToolsStore.getState().setActiveTool('measure')`.

3. **Icon** (optional but expected): add the id → lucide icon mapping to `ICON_MAP` in `src/features/context-menu/ContextMenu.tsx`.

4. **Embed rules**: destructive/editing actions must set `isVisible: (ctx) => !ctx.isEmbed`. Read-only actions may stay visible in embeds.

5. **Copy-to-clipboard actions** must strip internal properties (`_fid`, `_search_result`) — see the `copy-geojson` builtin for the pattern.

## Verify

- `npm run build && npm run lint`.
- Dev server: right-click on a feature AND on empty basemap — action appears only where intended, executes, and the menu closes. Check embed mode if visibility differs there.
