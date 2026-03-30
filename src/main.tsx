// src/main.tsx
import React from 'react';

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// Initialize global interaction guards early to prevent select-originated
// events from triggering document-level handlers that cause view jumps.
import './init/interactionGuards';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { UsersProvider } from './contexts/UsersContext'; // <-- IMPORTE O NOVO PROVIDER
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Elemento root não encontrado.");

const root = createRoot(rootElement);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/whatsapp-sw.js').catch((error) => {
      console.warn('Falha ao registrar Service Worker de notificações:', error);
    });
  });
}

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* --- ENVOLVA O APP COM O USERS PROVIDER --- */}
        <UsersProvider>
          <App />
        </UsersProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);