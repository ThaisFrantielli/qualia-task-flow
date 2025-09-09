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
    exclude: ['qr-scanner'],
  },
  build: {
    rollupOptions: {
      external: ['fs', 'path', 'url']
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