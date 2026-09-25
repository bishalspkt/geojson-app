import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import fs from 'fs'

const MAPLIBRE_DIST = path.resolve(import.meta.dirname, 'node_modules/maplibre-gl/dist')
const MAPLIBRE_VERSION: string = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, 'node_modules/maplibre-gl/package.json'), 'utf8'),
).version
const MAPLIBRE_FILES = ['maplibre-gl.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl-worker.mjs']
/** Versioned, so it can be cached forever. */
const MAPLIBRE_BASE = `/vendor/maplibre-gl@${MAPLIBRE_VERSION}/`

/**
 * MapLibre 6 ships as three ES modules: the main-thread module and the worker
 * both import `maplibre-gl-shared.mjs`. Bundling would give the worker its own
 * copy of that shared code (~140 kB gzipped, downloaded twice). In production
 * we serve MapLibre's files as-is from a versioned path instead, so the shared
 * module is fetched once and reused by the worker; the app imports
 * `maplibre-gl` from there, and the page preloads it.
 */
function maplibreVendor(): Plugin {
  return {
    name: 'maplibre-vendor',
    apply: 'build',
    config: () => ({
      build: {
        rollupOptions: {
          external: ['maplibre-gl'],
          output: { paths: { 'maplibre-gl': `${MAPLIBRE_BASE}maplibre-gl.mjs` } },
        },
      },
    }),
    generateBundle() {
      for (const file of MAPLIBRE_FILES) {
        this.emitFile({
          type: 'asset',
          fileName: `vendor/maplibre-gl@${MAPLIBRE_VERSION}/${file}`,
          source: fs.readFileSync(path.join(MAPLIBRE_DIST, file)),
        })
      }
    },
    transformIndexHtml: () =>
      ['maplibre-gl.mjs', 'maplibre-gl-shared.mjs'].map((file) => ({
        tag: 'link',
        attrs: { rel: 'modulepreload', href: `${MAPLIBRE_BASE}${file}`, crossorigin: '' },
        injectTo: 'head' as const,
      })),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), maplibreVendor()],
  define: {
    __MAPLIBRE_WORKER_DEV__: JSON.stringify('/node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs'),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
