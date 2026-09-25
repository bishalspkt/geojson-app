# Extending geojson.app

The app is built around four registries. Built-in features register through them at bootstrap (`registerBuiltinExtensions()` in `src/extensions/index.ts`); your extension calls the same functions. Nothing in `core/`, `state/`, or `app/` needs editing for the changes below.

## 1. Add a control-bar panel

A panel is a React component plus a registration. Registered panels automatically get a toolbar button (desktop toolbar and phone tab bar), exclusive open/close behaviour, the standard panel frame (floating card on desktop, bottom sheet on phones, sidebar in wide embeds), Escape-to-close, an error boundary, and code splitting.

```tsx
// src/features/controls/panels/StatsPanel.tsx
import { BarChart3 } from 'lucide-react';
import Panel from '../Panel';
import { useLayersStore, allFeatures } from '@/state/layers-store';

export default function StatsPanel() {
  const layers = useLayersStore((s) => s.layers);
  return (
    <Panel panelId="stats" className="p-3.5">
      <p className="eyebrow">Summary</p>
      <p className="font-heading text-sm font-extrabold">{allFeatures(layers).length} features in {layers.length} layers</p>
    </Panel>
  );
}
```

```ts
// register (built-ins do this in src/features/controls/register-panels.ts)
import { lazyPanel, registerPanel } from '@/extensions/panels/registry';
registerPanel({
  id: 'stats',
  title: 'Stats',
  icon: BarChart3,
  order: 25,                 // between layers (20) and stories (30)
  ...lazyPanel(() => import('./panels/StatsPanel')), // code loads on first open (preloaded on hover)
  embedVisible: false,       // hide in embed chrome=full
  mobileVisible: true,       // keep in the phone tab bar (default); it fits ~5 buttons
  // useHidden: () => boolean  — hook: hide the button while some state holds
  // useBadge: () => number | null — hook: a count on the button
});
```

Panel-local state that must survive close/reopen goes in a colocated micro-store (see `LayersPanel.tsx`), since registry panels take no props. Use the theme tokens (`text-muted-foreground`, `bg-hover`, `eyebrow`, `IconButton`, `Segmented`) so the panel works in dark mode, and pass `footer` / `actions` to `Panel` for sticky controls. Check it at 375 px wide.

## 2. Add a context-menu action

```ts
import { contextMenuRegistry } from '@/extensions/context-menu/registry';
import { useUiStore } from '@/state/ui-store';

contextMenuRegistry.register({
  id: 'open-in-osm',
  label: 'Open in OpenStreetMap',
  group: 'navigate',          // navigate | data | edit | style | danger
  order: 1,
  isVisible: (ctx) => ctx.feature === null,   // coordinate actions only
  execute: (ctx) => {
    window.open(`https://www.openstreetmap.org/#map=15/${ctx.lngLat.lat}/${ctx.lngLat.lng}`);
  },
});
```

The context (`ctx`) is pure data: `{ feature, lngLat, isEmbed }`. Reach stores directly for mutations (`useLayersStore.getState()…`).

## 3. Add a data format (source provider)

Source providers turn input (file, URL, pasted text, raw data) into a `FeatureCollection`. Registering one makes the format work everywhere ingestion happens — file picker, drag-drop, URL params, embed SDK.

```ts
import { registerSourceProvider, SourceProvider } from '@/extensions/sources/registry';

const csvProvider: SourceProvider = {
  id: 'csv-file',
  label: 'CSV with lat/lng columns',
  canHandle: (input) => input.kind === 'file' && input.file.name.endsWith('.csv'),
  async load(input) {
    if (input.kind !== 'file') throw new Error('expected file');
    const text = await input.file.text();
    return { collection: csvToFeatureCollection(text), name: input.file.name };
  },
};
registerSourceProvider(csvProvider);
```

Providers are checked in registration order; the first `canHandle` match wins. Use `ingest(input, opts)` from the same module to trigger the full pipeline (load → layer → camera fit).

## 4. Add an interactive tool

Tools are exclusive pointer modes (like measure). While a tool is active, normal feature hover/click is suppressed and the tool receives map clicks.

```ts
import { registerTool } from '@/extensions/tools/registry';
import { MapTool } from '@/core/tools';

const inspectTool: MapTool = {
  id: 'inspect',
  cursor: 'help',
  onMapClick(e, { map }) {
    console.log('clicked at', e.lngLat, 'zoom', map.getZoom());
  },
  onDeactivate() { /* cleanup */ },
};
registerTool(inspectTool);

// activate from any UI:
useToolsStore.getState().setActiveTool('inspect');
```

Give the tool UI (a panel or button) that sets/unsets it; the measure panel + `panel-policy.ts` show the pattern for pairing a tool with a panel.

## 5. Add an external command (SDK / agents)

Capabilities exposed to embed hosts and agents live in one place:

1. Add the command name + arg/result types to `src/integrations/commands.ts`.
2. Implement it in `src/integrations/executor.ts` (validate args, mutate stores / read map).
3. Add the convenience method to `src/integrations/embed/sdk.ts`.
4. Document it in `docs/developers-api.md`.

The postMessage bridge picks it up automatically (it routes any known command name). Additions are backward-compatible; never change an existing v1 shape — see the versioning rules in `docs/integrations.md`.

## 6. Add an imagery preset

Presets appear in the layers panel's **Imagery → Add** menu. A preset turns an optional date into an imagery-store input — any keyless, CORS-enabled XYZ source works.

```ts
import { registerImageryPreset } from '@/extensions/imagery/registry';

registerImageryPreset({
  id: 'esa-worldcover',
  name: 'ESA WorldCover 2021',
  description: '10 m land cover',
  group: 'Land cover',
  create: () => ({
    name: 'ESA WorldCover 2021',
    source: { type: 'xyz', tiles: ['https://…/{z}/{x}/{y}.png'], maxzoom: 13 },
    attribution: '© ESA WorldCover project 2021',
  }),
});
```

Dated products declare `dated: { default: 'YYYY-MM-DD' }` and receive the picked date. For animation, put `{time}` in the template and set `time: { format, default, stepMinutes }` — the renderer re-resolves it as the timeline plays (see `extensions/imagery/builtin/gibs.ts`).

## 7. Write a story

A story is data, not code: a JSON document plus the GeoJSON/images it references, dropped under `public/stories/<name>/` (or hosted anywhere with CORS). Add it to `FEATURED_STORIES` (`src/features/story/featured.ts`) to list it in the app. Format and conventions: [stories.md](stories.md). Stories built from external datasets should keep their fetch-and-process pipeline beside them (`stories/<name>/pipeline/`) so they can be rebuilt.

## Ground rules

- **Never hand-write MapLibre source/layer id strings** — mint them in `src/core/layers/ids.ts` (`gj:`/`sys:` namespaces).
- **Features are addressed by `_fid` only** — no positional indices.
- **`core/` stays React-free; `state/` stays MapLibre-free.**
- Analytics (`track()` from `@/lib/analytics`) belongs in UI/actions, never in `core/`.
- New code that most sessions won't use loads lazily (`lazyPanel`, `React.lazy`, `core/lazy.ts`); `npm run size` guards the initial load.
- New capability that could serve SDK users should land as a command (rule 5), not a UI-only feature.
