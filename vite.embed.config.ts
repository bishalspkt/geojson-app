import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(import.meta.dirname, 'src/integrations/embed/sdk.ts'),
      name: 'GeoJSONApp',
      formats: ['iife'],
      fileName: () => 'embed.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
})
