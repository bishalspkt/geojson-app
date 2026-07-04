---
name: add-source-format
description: Add support for a new geo data format (CSV, GPX, KML, TopoJSON, WKT, …) to geojson.app via a source provider. Use when asked to support importing/loading a new file type or data format.
---

# Add a data-source format

Source providers convert input into a `FeatureCollection`. One registration makes the format work in every ingestion path: file picker, drag & drop, `?geojson=` URLs, paste, and the embed SDK.

## Steps

1. **Create the provider** at `src/extensions/sources/builtin/<format>.ts`:

```ts
import { SourceProvider } from '../registry';

export const <format>FileProvider: SourceProvider = {
  id: '<format>-file',
  label: '<Format> file',
  canHandle: (input) =>
    input.kind === 'file' && input.file.name.toLowerCase().endsWith('.<ext>'),
  async load(input) {
    if (input.kind !== 'file') throw new Error('expected file input');
    const text = await input.file.text();
    return { collection: parse<Format>(text), name: input.file.name };
  },
};
```

- `SourceInput` kinds: `file`, `url`, `text`, `data`. Implement each kind the format sensibly supports (a URL variant usually mirrors the file variant).
- The parser must return a spec-valid `FeatureCollection`; throw `Error` with a human-readable message on bad input (surfaced to the caller / SDK error event).
- Keep parsers dependency-light. If a parsing library is genuinely needed, prefer small, tree-shakeable ones and note the bundle impact in the PR.

2. **Register** in `src/extensions/index.ts` → `registerBuiltinExtensions()`:

```ts
registerSourceProvider(<format>FileProvider);
```

Order matters: providers are matched first-`canHandle`-wins. File-extension matchers are safe anywhere, but URL matchers must be registered BEFORE `geojsonUrlProvider` (which accepts any `url` input) and sniff the extension.

3. **Constraints**: respect the 25 MB file cap (`MAX_FILE_SIZE_BYTES` in `builtin/geojson.ts`) unless there's a reason not to.

4. **Analytics**: if a UI surface triggers this ingestion, capture `geojson_uploaded` with a distinct `source` value (see `UploadPanel.tsx`).

## Verify

- `npm run build && npm run lint`.
- Dev server: drag-drop a sample file of the new format → features render, camera fits, layer named after the file, Layers panel lists it.
- Malformed file → graceful console error, no crash.
