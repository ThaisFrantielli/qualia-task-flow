import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// --- INÍCIO DA CORREÇÃO PARA MÓDULOS ES ---
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// --- FIM DA CORREÇÃO ---

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Agora o '__dirname' existirá e o alias funcionará
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
  },
})