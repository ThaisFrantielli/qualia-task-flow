// vite.config.ts (UPDATED FOR LATEST LOVABLE VERSION)

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
// Import `lovable-tagger` dynamically below to avoid running it at module-import
// time (some versions execute file modifications on import which can trigger
// Vite's watcher and create restart loops). We'll only load it for non-dev builds.

// Define __dirname em ambientes de Módulos ES
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devPort = Number(env.VITE_DEV_SERVER_PORT || 8080)
  // Allow forcing WSS (useful when running behind HTTPS reverse proxies)
  const forceWss = String(env.VITE_FORCE_WSS || 'false').toLowerCase() === 'true'
  const hmrProtocol = forceWss ? 'wss' : 'ws'
  const hmrClientPort = forceWss ? 443 : devPort

  // Build plugins list and only import `lovable-tagger` when needed to avoid
  // side-effects during development that can trigger file watch loops.
  const plugins = [react()];
  if (mode !== 'development') {
    const mod = await import('lovable-tagger');
    if (mod?.componentTagger) plugins.push(mod.componentTagger());
  }

  return {
  plugins: plugins.filter(Boolean),
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
    port: devPort,
    cors: true,
    // Use plain websocket (ws) and the dev server port for HMR in local dev.
    hmr: {
      protocol: hmrProtocol,
      clientPort: hmrClientPort,
    },
    // Prevent external services or build artifacts from triggering Vite's watcher
    // (e.g., whatsapp-service writing files to the workspace or generated `dist` files).
    watch: {
      // ignore heavy folders and external service output
      ignored: [
        '**/whatsapp-service/**',
        '**/whatsapp-service/.wwebjs_cache/**',
        '**/.wwebjs_cache/**',
        '**/dist/**',
        '**/nome-do-projeto/**',
        '**/whatsapp-session-default/**'
      ]
    },
    }
  }
})