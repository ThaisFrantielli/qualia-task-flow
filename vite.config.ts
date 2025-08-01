// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // --- ADICIONE ESTA SEÇÃO ---
  server: {
    host: '0.0.0.0', // Ouve em todas as interfaces de rede disponíveis
    port: 8080,      // Usa a porta 8080
  }
  // --------------------------
})