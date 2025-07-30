// src/components/Layout.tsx

import React from 'react';
import { Outlet } from 'react-router-dom';

// --- CAMINHOS DE IMPORTAÇÃO CORRIGIDOS ---
// Como Layout.tsx e Sidebar.tsx estão na mesma pasta (components), o caminho é './'
import Sidebar from './Sidebar'; 
// A pasta 'notifications' é uma subpasta de 'components', então o caminho é './'
import NotificationCenter from './notifications/NotificationCenter'; 
// ------------------------------------------

import { Toaster } from 'sonner';
import { useAuth } from '@/contexts/AuthContext'; // O alias '@/` geralmente aponta para 'src/', então este deve estar correto

const Layout = () => {
  // Pegar o usuário do contexto
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Passar o usuário como 'prop' para a Sidebar */}
      <Sidebar user={user} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header simplificado */}
        <header className="bg-white shadow-sm border-b border-gray-200 z-10">
          <div className="flex items-center justify-end h-16 px-6">
            <div className="flex items-center space-x-4">
              <NotificationCenter />
            </div>
          </div>
        </header>

        {/* Conteúdo Principal da Página */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default Layout;