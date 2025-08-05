// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import dotenv from 'dotenv' // 1. Importar o dotenv

// 2. Carregar as variáveis do arquivo .env
dotenv.config();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8080,
    // (sua configuração de hmr aqui)
  }
})