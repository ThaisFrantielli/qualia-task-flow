// vite.config.ts (UPDATED FOR LATEST LOVABLE VERSION)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { componentTagger } from "lovable-tagger"

// Define __dirname em ambientes de Módulos ES
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['qr-scanner', 'node-fetch', 'fetch-blob', 'node-domexception'],
  },
  build: {
    rollupOptions: {
      external: [
        'fs', 
        'path', 
        'url', 
        'node-fetch',
        'node:http',
        'node:https', 
        'node:zlib',
        'node:stream',
        'node:buffer',
        'node:util',
        'node:net',
        'node:fs',
        'node:path',
        'node:url',
        'node:process',
        'node:stream/web',
        'worker_threads',
        'buffer',
        'fetch-blob',
        'node-domexception'
      ]
    }
  },
  server: {
    host: "::",
    port: 8080,
    cors: true,
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
  },
}))