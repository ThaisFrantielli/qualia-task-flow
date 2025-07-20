// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // 1. Importe o 'path' do Node.js

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 2. Adicione esta configuração de alias
      //    Ela diz ao Vite que sempre que encontrar '@',
      //    deve substituí-lo pelo caminho absoluto para a pasta 'src'.
      '@': path.resolve(__dirname, './src'),
    },
  },
})