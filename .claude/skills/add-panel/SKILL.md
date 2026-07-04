---
name: add-panel
description: Add a new control-bar panel to geojson.app (toolbar button + panel UI). Use when asked to add a panel, sidebar section, or toolbar feature to the map controls.
---

# Add a control-bar panel

Panels are registry-driven: a React component + one registration. No edits to MapControls or app shell.

## Steps

1. **Create the component** at `src/features/controls/panels/<Name>Panel.tsx`:

```tsx
import Panel from '../Panel';

export default function <Name>Panel() {
  return (
    <Panel panelId="<id>" className="p-3">
      {/* panel body */}
    </Panel>
  );
}
```

- Read app state with store hooks: `useLayersStore`, `useToolsStore`, `useSettingsStore`, `useUiStore` from `@/state/*`.
- Panels take NO props. State that must survive close/reopen goes in a colocated micro zustand store (pattern: `LayersPanel.tsx` → `usePanelUiStore`).
- Match the visual language: `p-3` body, `text-sm font-bold` headings, `text-xs text-gray-400` hints, rounded-xl buttons. Copy structure from `MeasurePanel.tsx` (simplest full example).

2. **Register it** in `src/features/controls/register-panels.ts` inside `registerBuiltinPanels()`:

```ts
registerPanel({
  id: '<id>',            // lowercase string, becomes activePanel value
  title: '<Label>',      // toolbar button text
  icon: <LucideIcon>,    // import from 'lucide-react'
  component: <Name>Panel,
  order: <N>,            // 10=Import, 20=Layers, 30=Measure, 40=Embed; pick a gap
  embedVisible: false,   // true → also shown in embed chrome=full
});
```

3. **Panel open/close side effects** (only if needed — e.g. pairing with a tool): extend `src/features/controls/panel-policy.ts` `setPanelWithPolicy`. The measure panel/tool pairing is the pattern.

4. **If the panel activates an interactive tool**, register the tool separately (see the add-tool section of `docs/extending.md`) and pair it in panel-policy.

## Verify

- `npm run build && npm run lint` — must be clean (zero warnings).
- Dev server: button appears in toolbar, opens/closes exclusively with other panels, works on mobile width (375px), and (if `embedVisible`) in `/?embed=1&chrome=full`.
