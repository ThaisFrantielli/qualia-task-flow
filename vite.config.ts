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
  // Quando rodando sob `vercel dev`, $PORT é injetado pelo CLI e o Vite recebe
  // a porta dele. Não devemos sobrescrever o HMR nesse caso — o vercel dev tem
  // seu próprio mecanismo de refresh (refresh.js) e conflita com o HMR fixado.
  const underVercelDev = !!process.env.PORT
  // Allow forcing WSS (useful when running behind HTTPS reverse proxies).
  const forceWss = String(env.VITE_FORCE_WSS ?? 'false').toLowerCase() === 'true'
  const hmrProtocol = forceWss ? 'wss' : 'ws'
  const hmrClientPort = forceWss ? 443 : devPort

  // Build plugins list and only import `lovable-tagger` when needed to avoid
  // side-effects during development that can trigger file watch loops.
  const plugins = [react()];
  if (mode !== 'development') {
    const mod = await import('lovable-tagger');
    if (mod?.componentTagger) {
      const maybe = mod.componentTagger();
      // componentTagger may return a single Plugin or an array of Plugin
      if (Array.isArray(maybe)) {
        plugins.push(...maybe as any[]);
      } else {
        plugins.push(maybe as any);
      }
    }
  }

  return {
  plugins: plugins.filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Garante uma única instância do React para evitar erros de hooks
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
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
    // HMR: só configurar explicitamente quando rodando standalone (npm run dev).
    // Sob `vercel dev` ($PORT definido), deixar o Vite auto-detectar a porta
    // para evitar conflito com o refresh.js injetado pelo CLI do Vercel.
    hmr: underVercelDev ? true : {
      protocol: hmrProtocol,
      host: 'localhost',
      port: devPort,
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
    proxy: {
      '/api': {
        // Em dev, rode `npm run dev:api` e defina VITE_API_TARGET=http://localhost:3001 no .env.local
        // Sem VITE_API_TARGET, as requisições vão para produção Vercel.
        target: env.VITE_API_TARGET || 'https://qualityconecta.vercel.app',
        changeOrigin: true,
        secure: !(env.VITE_API_TARGET),
        ws: false,
        configure: (proxy: any) => {
          proxy.on('error', (err: Error) => {
            console.error('[vite-proxy] /api error:', err.message);
          });
        },
      },
    },
    },
  }
})