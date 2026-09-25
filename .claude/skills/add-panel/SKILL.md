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
    <Panel panelId="<id>" className="p-3.5">
      {/* panel body; sticky controls go in footer={…} / header actions={…} */}
    </Panel>
  );
}
```

- Read app state with store hooks: `useLayersStore`, `useToolsStore`, `useSettingsStore`, `useUiStore` from `@/state/*`.
- Panels take NO props. State that must survive close/reopen goes in a colocated micro zustand store (pattern: `LayersPanel.tsx` → `usePanelUiStore`).
- Match the visual language with theme tokens so dark mode works: `font-heading text-sm font-extrabold` headings, `eyebrow` section labels, `text-xs text-muted-foreground` hints, `bg-hover` hovers, `IconButton` / `Segmented` from `@/components/ui`. Never raw greys or `bg-white/…`. Copy structure from `MeasurePanel.tsx` (simplest full example; shows `footer`).
- Analytics: `track('<noun>_<verb>', {...})` from `@/lib/analytics`. User-facing errors: `notify(message)` from `@/state/notify-store` (no `alert()`).

2. **Register it** in `src/features/controls/register-panels.ts` inside `registerBuiltinPanels()`:

```ts
registerPanel({
  id: '<id>',            // lowercase string, becomes activePanel value
  title: '<Label>',      // toolbar button text (keep it one short word: the phone tab bar fits ~5)
  icon: <LucideIcon>,    // import from 'lucide-react'
  order: <N>,            // 10=Import, 20=Layers, 30=Stories, 40=Measure, 50=Embed; pick a gap
  ...lazyPanel(() => import('./panels/<Name>Panel')), // code-split; preloaded on toolbar hover
  embedVisible: false,   // true → also shown in embed chrome=full
  // mobileVisible: false  → desktop-only (like Embed)
  // useHidden / useBadge  → hooks for conditional visibility / a count badge
});
```

3. **Panel open/close side effects** (only if needed — e.g. pairing with a tool): extend `src/features/controls/panel-policy.ts` `setPanelWithPolicy`. The measure panel/tool pairing is the pattern.

4. **If the panel activates an interactive tool**, register the tool separately (see the add-tool section of `docs/extending.md`) and pair it in panel-policy.

## Verify

- `npm run lint && npm test && npm run build && npm run size` — clean, and the initial-load budget still holds (a lazily registered panel adds ~nothing).
- Dev server: button appears in the toolbar, opens/closes exclusively with other panels, Escape closes it, it works as a bottom sheet at 375 px, in a dark basemap theme, and (if `embedVisible`) in `/?embed=1&chrome=full` at 800 and 360 px wide.
