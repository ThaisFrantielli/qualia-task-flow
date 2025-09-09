// vite.config.ts (VERSÃO FINAL COM CORREÇÃO DE CORS)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

// Define __dirname em ambientes de Módulos ES
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8080,
    host: '0.0.0.0', 
    
    // --- ADIÇÃO FINAL E MAIS IMPORTANTE ---
    // Habilita o Cross-Origin Resource Sharing (CORS)
    // Isso diz ao servidor Vite: "Qualquer site (incluindo a janela de preview do Firebase)
    // tem permissão para solicitar e exibir seu conteúdo."
    cors: true,
    // ------------------------------------

    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
  },
})