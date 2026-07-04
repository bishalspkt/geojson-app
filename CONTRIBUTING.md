# Contributing to geojson.app

Thanks for helping build the open web-mapping toolkit. This guide covers setup, conventions, and the fastest path to a merged PR.

## Setup

```bash
git clone https://github.com/bishalspkt/geojson-app
cd geojson-app
npm install        # Node ≥ 20.19
npm run dev        # http://localhost:5173
```

No env vars are required for local development. Analytics (PostHog) only activates when `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` / `VITE_PUBLIC_POSTHOG_HOST` are set.

## Before you open a PR

```bash
npm run lint       # ESLint 10 flat config — zero warnings policy
npm test           # Vitest — stores, executor, ingestion, params (all React-free)
npm run build      # tsc type-check + app build + embed SDK build — must pass
```

CI runs the same three gates plus an embed-size guard on every push/PR (`.github/workflows/ci.yml`).

**Testing**: unit tests live next to their modules (`*.test.ts`) and run in Node with no mocks — the `core/`/`state/`/`integrations/` layers are framework-free by design. New store logic, executor commands, and source providers should land with tests; UI components are currently covered by the manual checklist below (`npm run test:watch` for TDD).

Then verify by hand in the dev server:

1. Import a sample dataset (Import panel → "Volcanoes") — features render, camera fits.
2. Click a feature on the map — it highlights and the Layers panel selects it.
3. Toggle visibility (feature and layer level) — map updates.
4. Right-click → Zoom to Feature / View Properties / Delete.
5. Measure two points; switch theme to dark; switch projection to globe.
6. If you touched embed/integration code: open `/?embed=1&geojson=<url>&chrome=full` and check the panel + data load.

## Where things live

| Change | Start here |
|---|---|
| New panel, context-menu action, data format, tool | [docs/extending.md](docs/extending.md) — registries, no core edits |
| New SDK/agent capability | `src/integrations/commands.ts` → `executor.ts` → `embed/sdk.ts` → docs |
| Map rendering / interactions / overlays | `src/core/` (framework-agnostic — no React imports) |
| App state | `src/state/` zustand stores (no MapLibre objects in state) |
| UI | `src/features/` (reads stores via hooks; never touches MapLibre directly) |
| Basemap / themes | `src/core/basemap/style.ts` + [docs/styling.md](docs/styling.md) |
| Feature styling (simplestyle) | `src/style/` + [docs/styling.md](docs/styling.md) |
| Deploy / tiles / env vars | [docs/deployment.md](docs/deployment.md) |

The architecture, layer model, and invariants: [docs/architecture.md](docs/architecture.md). **Read the invariants section before touching `core/` or `state/`** — namespaced layer ids, `_fid`-only addressing, frozen embed protocol.

## Conventions

- **Commits**: conventional-style prefixes, as in the existing history — `feat: …`, `fix: …`, `chore: …`, optional scope (`feat(embed): …`). Imperative mood, no trailing period.
- **TypeScript**: strict; avoid `any` (the style resolver's MapLibre expression builders are the one sanctioned exception, kept behind eslint-disable lines).
- **Formatting**: match the file you're in; 2-space indent, single quotes in new modules.
- **Styling**: Tailwind utility classes inline, shadcn/ui primitives in `src/components/ui`. The glassy design language (rounded-2xl, `bg-white/70 backdrop-blur`) is deliberate — reuse existing patterns.
- **Analytics**: `posthog.capture('<noun>_<verb>', …)` from UI code only; include `map_center_lat/lng` where relevant. Never in `core/`.
- **Docs**: user-visible or SDK-visible changes update the matching doc in the same PR (`docs/developers-api.md` for SDK, README for app features).

## Public contracts (be careful)

- Embed protocol v1 (methods, events, envelope, error codes) and URL parameter names are **frozen** — additions only. See [docs/integrations.md](docs/integrations.md).
- `embed.js` must stay dependency-free and small (~2 kB gzipped today; hard ceiling ~6 kB).
- Feature properties starting with `_` are internal (`_fid`, `_search_result`) and must be stripped before data leaves the app (copy/export/protocol events).

## Deployment (maintainers)

See [docs/deployment.md](docs/deployment.md) — Pages auto-deploys `main`; the tile worker deploys manually via wrangler; tile archives rotate through dated URLs.
