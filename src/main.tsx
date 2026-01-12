// src/main.tsx
import React from 'react';

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { UsersProvider } from './contexts/UsersContext'; // <-- IMPORTE O NOVO PROVIDER
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Elemento root não encontrado.");

const root = createRoot(rootElement);

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