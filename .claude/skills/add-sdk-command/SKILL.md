---
name: add-sdk-command
description: Expose a new capability to the geojson.app embed SDK / external callers (and future MCP agents). Use when asked to add an SDK method, protocol command, embed API, or agent-callable capability.
---

# Add an external command (SDK / protocol / agents)

One capability = one command, implemented once, exposed per transport. Protocol v1 is frozen — additions only; never change an existing method's shape or semantics.

## Steps (in this order)

1. **Schema** — `src/integrations/commands.ts`:
   - Add the name to `COMMAND_NAMES` (camelCase, matches SDK method name).
   - Add/extend the args + result interfaces with doc comments.

2. **Execution** — `src/integrations/executor.ts` `executeCommand` switch:
   - Validate args defensively (`throw new Error('<method>: <what is wrong>')` — the message reaches embedders via `method_failed`).
   - Mutate state via stores (`useLayersStore.getState()…`), read the map via `requireMap()`. Data ingestion goes through `ingest()` from `@/extensions/sources/registry`.
   - Commands must behave identically regardless of transport.

3. **SDK method** — `src/integrations/embed/sdk.ts`:
   - Add to the `EmbedInstance` type and the instance literal in `createEmbed`:
     `myMethod: (args) => controller.call('myMethod', { ...args }).then(() => undefined)` (or typed `controller.call<Result>(…)` for getters).
   - `embed.js` must stay dependency-free; check the built size stays ~2 kB gzipped (`npm run build:embed` reports it).

4. **Docs** — `docs/developers-api.md` (and `docs/embed.md` if the method is user-facing):
   - Method reference entry (args table + example) and the method list under "postMessage Protocol".
   - Mark it "Additive to protocol v1."

5. The postMessage bridge (`src/integrations/embed/bridge.ts`) needs **no changes** — it routes every name in `COMMAND_NAMES` automatically. A future MCP server picks it up from `commands.ts` the same way.

## Verify

- `npm run build && npm run lint`.
- Protocol round-trip from the browser console on a page embedding the local build:

```js
// with the app open in an iframe `f`:
window.addEventListener('message', (e) => console.log(e.data));
f.contentWindow.postMessage({ source: 'geojson.app.embed', v: 1, id: 't1', method: '<name>', args: { /* … */ } }, '*');
// expect { replyTo: 't1', ok: true, … }
```

- Error path: send invalid args → `ok: false, error.code === 'method_failed'` plus an `error` event.
