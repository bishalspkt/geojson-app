# Integrations: one command surface, many transports

geojson.app is scriptable. This document describes how external callers — web pages, other apps, and AI agents — drive a map, and how the pieces are designed so that adding a new transport never forks the feature set.

## The core idea

There is exactly **one** description of what an external caller can do to a map: [`src/integrations/commands.ts`](../src/integrations/commands.ts). Camera, appearance, data, and inspection commands plus the event set (`load`, `move`, `moveend`, `click`, `theme:change`, `projection:change`, `error`).

Every command executes through [`src/integrations/executor.ts`](../src/integrations/executor.ts), which talks to the zustand stores and the live MapLibre instance. Transports are thin adapters that parse their channel's envelope, call `executeCommand(name, args)`, and ship the result back.

```
   web page                 agent (Claude, …)            link / README
      │                          │                            │
   embed.js SDK             MCP server                   URL params
      │ postMessage              │ (tools 1:1 commands)       │ ?geojson=&theme=…
      ▼                          ▼                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    integrations/executor.ts                         │
│         executeCommand(name, args) → stores + MapLibre              │
└─────────────────────────────────────────────────────────────────────┘
```

Because the layers-first store is the single source of truth, anything a transport ingests shows up everywhere: the layers panel lists SDK-added layers, simplestyle styling applies, hit-testing and the context menu work, and `listLayers` reports them.

## Transport 1: URL parameters (one-shot)

The simplest integration is a link. All parameters work on `https://geojson.app/?…`:

| Param | Example | Notes |
|---|---|---|
| `geojson` | `?geojson=https://…/data.geojson` | Loads and auto-fits. Works with or without `embed=1`. CORS required. |
| `embed=1` | | Switches to embed chrome. |
| `center`, `zoom` | `?center=85.3,27.7&zoom=11` | Initial camera. |
| `theme`, `projection` | `?theme=dark&projection=globe` | Appearance. |
| `interactive`, `chrome`, `attribution` | | Embed behavior — see `docs/developers-api.md`. |

Parameter names are frozen (v1 contract).

## Transport 2: the embed SDK (live iframes)

`https://geojson.app/embed.js` (~2 kB gzipped, zero deps) creates an iframe and drives it over a versioned postMessage protocol. Full reference: [`docs/developers-api.md`](developers-api.md).

- Protocol v1 wire format is **frozen**: envelope `{source: "geojson.app.embed", v: 1, …}`, method names, event names, error codes.
- v1 grew two **additive** methods in the 2026 rewrite: `listLayers()` and `setLayerVisibility(id, visible)`. Additions are backward-compatible; old SDKs simply don't call them.
- In-iframe half: `src/integrations/embed/bridge.ts` (validation + envelope only — all behavior lives in the executor).
- Host half: `src/integrations/embed/sdk.ts`, built standalone by `vite.embed.config.ts`.

## Transport 3: MCP (AI agents)

The Model Context Protocol is how agents (Claude, and MCP-compatible tooling generally) discover and call tools. The design goal: **an agent should be able to do exactly what an embed host can do — no more, no less** — by mapping MCP tools 1:1 onto the command surface.

### Architecture (two deployment shapes)

**Shape A — companion server (works today, no infra):** an MCP server that runs alongside the agent and *produces geojson.app artifacts* rather than driving a live session:

- `geojson_view_link(data | url, theme?, camera?)` → returns a `https://geojson.app/?geojson=…` link (data uploaded to a paste service or inlined as a data URL when small).
- `geojson_embed_snippet(options)` → returns a ready-to-paste `embed.js` snippet.
- `geojson_validate(data)` → validation + feature stats without leaving the agent.

This shape needs no session plumbing because it targets the **URL transport**.

**Shape B — live session bridge (the end state):** the agent drives a map the user is looking at.

1. The user opens `https://geojson.app/?session=<id>` (or an embed with `session`).
2. The app connects to a lightweight relay — a **Cloudflare Durable Object** (fits the existing Cloudflare-only operational model; one DO per session, hibernates when idle, ~zero cost).
3. The MCP server exposes the command surface as tools (`map_fly_to`, `map_set_geojson`, `map_add_layer`, `map_list_layers`, …). Each tool call posts `{method, args}` to the relay; the open tab executes it via the same `executeCommand` and returns the result.
4. Events (`click`, `moveend`) stream back through the relay so agents can *react* to what the user does — "the user clicked feature X; explain it."

The wire format for Shape B reuses the postMessage protocol envelope verbatim (`{source, v, id, method, args}` / `{replyTo, ok, result|error}`) — the relay is just a different pipe for the same messages. That means the bridge code in the app needs only a second listener (WebSocket instead of `window.message`), and SDK/agent behavior stays perfectly consistent.

### Why not "MCP server does maplibre headless"?

Rendering server-side would abandon the core economics (static app + cheap tiles) and produce dead screenshots instead of live maps. The product's differentiator for agents is a *live, shareable, user-visible* map — links and sessions deliver that; headless rendering doesn't.

### Tool naming & schema conventions

- Tools are named `map_<command_in_snake_case>` (`map_fly_to`, `map_set_geo_json` → prefer `map_set_geojson`).
- Tool input schemas mirror the arg shapes in `commands.ts` exactly; results mirror command results.
- Destructive-ish tools (`map_set_geojson` replaces the primary layer) say so in their descriptions.
- Every tool description ends with the same one-liner pointing at `docs/developers-api.md` so agents can self-serve details.

### Status

Shape A can be built any time as a standalone `mcp/` package (`@geojson.app/mcp`) with the official TypeScript MCP SDK; it has no coupling to this repo's build. Shape B needs the relay Worker + a `session` param in `parseEmbedParams` + `startSessionBridge()` alongside `startEmbedBridge()` — the internal seams for it are already in place (`executeCommand`, protocol envelope reuse). Both are tracked in [`docs/roadmap.md`](roadmap.md).

## Rules for extending integrations

1. **Add capability in `commands.ts` + `executor.ts` first**, then expose it per transport. Never implement a feature inside a single transport.
2. Additions to protocol v1 must be additive (new methods/events). Changing an existing shape means `v: 2` alongside v1 support.
3. Update `docs/developers-api.md` in the same PR that adds a command.
4. Keep `embed.js` dependency-free and under ~6 kB gzipped — it's on other people's pages.
5. Transports validate and translate; they never reach into MapLibre or the stores directly (the executor does).
