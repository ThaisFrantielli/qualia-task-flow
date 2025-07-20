// src/main.tsx

import React from 'react'; // Adicione a importação do React
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext'; // <-- 1. Importe o AuthProvider

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento root não encontrado no documento.");
}

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AuthProvider>  {/* <-- 2. Envolva o <App /> com o <AuthProvider> */}
      <App />
    </AuthProvider>
  </React.StrictMode>
);