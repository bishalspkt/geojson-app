#!/usr/bin/env node
// Load budget, gzipped:
//   shell     — what dist/index.html fetches up front (entry, modulepreloads, CSS,
//               MapLibre preloads): enough to paint the UI;
//   map-ready — the shell plus the map runtime chunk and its static imports,
//               which the shell requests immediately (features/map/map-runtime.ts).
// Optional features (stories, timeline, imagery, panels) are lazy and don't count.
//   node scripts/check-bundle.mjs [--budget-kb 440]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dist = path.resolve(import.meta.dirname, '../dist');
const budgetArg = process.argv.indexOf('--budget-kb');
const budgetKb = budgetArg > 0 ? Number(process.argv[budgetArg + 1]) : 440;

const gz = (rel) => zlib.gzipSync(fs.readFileSync(path.join(dist, rel)), { level: 9 }).length;
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const shell = new Set([...html.matchAll(/(?:src|href)="\/((?:assets|vendor)\/[^"]+\.(?:m?js|css))"/g)].map((m) => m[1]));

// Static imports of a chunk (relative "./x.js" or absolute "/vendor/…"), recursively.
function staticClosure(rel, seen = new Set()) {
  if (seen.has(rel)) return seen;
  seen.add(rel);
  const code = fs.readFileSync(path.join(dist, rel), 'utf8');
  for (const m of code.matchAll(/(?:^|[;\n}])\s*import\s*(?:[^'"()]*?from\s*)?["']([^"']+\.m?js)["']/g)) {
    const spec = m[1];
    const next = spec.startsWith('/') ? spec.slice(1) : path.posix.join(path.posix.dirname(rel), spec);
    if (fs.existsSync(path.join(dist, next))) staticClosure(next, seen);
  }
  return seen;
}

const runtimeChunk = fs.readdirSync(path.join(dist, 'assets')).find((f) => /^map-runtime-.*\.js$/.test(f));
const mapReady = new Set(shell);
if (runtimeChunk) for (const f of staticClosure(`assets/${runtimeChunk}`)) mapReady.add(f);

const sum = (files) => [...files].reduce((a, f) => a + gz(f), 0) / 1024;
const rows = [...mapReady].map((f) => [f, gz(f)]).sort((a, b) => b[1] - a[1]);
for (const [f, size] of rows.slice(0, 8)) console.log(`${(size / 1024).toFixed(1).padStart(7)} kB  ${f}${shell.has(f) ? '' : '  (map runtime)'}`);
const shellKb = sum(shell);
const readyKb = sum(mapReady);
console.log(`fetched up front (UI + MapLibre preloads): ${shellKb.toFixed(1)} kB in ${shell.size} files`);
console.log(`initial load (map ready): ${readyKb.toFixed(1)} kB gzipped in ${mapReady.size} files, budget ${budgetKb} kB`);
if (!runtimeChunk) console.warn('::warning::no map-runtime chunk found — did the map stop being code-split?');
if (readyKb > budgetKb) {
  console.error(`::error::initial load ${readyKb.toFixed(1)} kB exceeds the ${budgetKb} kB budget — lazy-load the new code (see docs/architecture.md, "Performance")`);
  process.exit(1);
}
