---
name: debug-map
description: Diagnose geojson.app map issues — features not rendering, selection/highlight broken, theme swap losing layers, embed commands failing, blank map. Use when debugging map behavior or verifying map internals in the browser preview.
---

# Debug the map

The architecture gives you clean probe points: stores are importable in the browser console / `preview_eval` via Vite's module URLs, and every MapLibre id is namespaced.

## Probe the state (works even when the map is broken)

```js
const { useLayersStore } = await import('/src/state/layers-store.ts');
const { useMapStore } = await import('/src/state/map-store.ts');
const { useToolsStore } = await import('/src/state/tools-store.ts');
useLayersStore.getState().layers.map(l => ({ id: l.id, n: l.features.length, visible: l.visible }));
useMapStore.getState().ready;              // false → engine never started (see below)
useLayersStore.getState().selection;       // {layerId, featureId} | null
```

## Probe the map

```js
const map = (await import('/src/state/map-store.ts')).getMap();
map.getStyle().layers.map(l => l.id).filter(id => id.includes(':'));  // app layers: gj:<layer>:<bucket>:<role>, sys:<overlay>
map.getFilter('gj:L1:point:main');          // hidden-feature filter (['!', ['in', ['get','_fid'], …]])
await map.getSource('sys:highlight').getData();  // use getData(), not the private _data
map.isStyleLoaded(); map.loaded();
```

## Failure-mode map

| Symptom | Check | Usual cause |
|---|---|---|
| Store has layers, map shows nothing | `useMapStore.getState().ready` | Engine starts on map `load`; if the style can't finish (tiles/sprite/glyphs unreachable) `load` never fires. Check the Network tab for `tiles.geojson.app` / `protomaps.github.io`. |
| Features gone after theme switch | app layers list empty after swap | The `style.load` re-add didn't run. The engine must register `once('style.load')` **before** `setStyle` — MapLibre ≥5.24 fires it synchronously for inline styles. Any new setStyle call site must follow this order. |
| One feature won't hide/highlight | `feature.properties._fid` vs `feature.id` | `_fid` is the only addressing key (promoteId). A feature missing `_fid` bypassed the store — data must enter via `ingest()`/store actions. |
| Clicks select nothing | `interactiveLayerIds` vs existing layers | Interactions query `gj:*:main`/`:symbol` layers; suppressed while `useToolsStore.getState().activeTool != null`. |
| Embed command times out | bridge only accepts `ev.source === window.parent` | Commands must come from the direct parent window with the exact envelope (`source: "geojson.app.embed", v: 1, id, method`). |
| Embed command `method_failed` | `error.message` | Executor validation message — arg shape is wrong; compare with `docs/developers-api.md`. |

## Preview-tool quirk (Claude Code verification)

The preview tab is `document.visibilityState === 'hidden'`, so rAF never fires and MapLibre never completes frame 1 → `ready` stays false and the canvas is blank **even when the code is correct**. To unstick for testing:

```js
window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
const map = (await import('/src/state/map-store.ts')).getMap();
map._frameRequest?.abort(); map._frameRequest = null; map.triggerRepaint();
// give style fetches wall-clock time first; hidden-tab setTimeout is ~1s-clamped, so no tight loops
```

External hosts may also be blocked in the sandbox — for rendering checks, `map.setStyle({version: 8, sources: {}, layers: [{id: 'bg', type: 'background', paint: {'background-color': '#eee'}}]})` gives a dependency-free style that loads instantly, letting the engine start and data layers paint.

Store-level flows (ingest, selection, panels, executor) are all testable without any map — prefer store probes and `npm test` before fighting the canvas.
