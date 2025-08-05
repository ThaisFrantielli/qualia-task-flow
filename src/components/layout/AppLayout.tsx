// src/components/layout/AppLayout.tsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar'; // Garanta que este caminho está correto para sua estrutura
import NotificationCenter from '../notifications/NotificationCenter'; // Garanta que este caminho está correto
import { Toaster } from 'sonner';

// A chamada ao useAuth() foi removida, tornando este um componente de layout "puro".
const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* A Sidebar é responsável por buscar os dados do usuário que ela precisa */}
      <Sidebar /> 
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header da sua aplicação */}
        <header className="bg-white shadow-sm border-b border-gray-200 z-10">
          <div className="flex items-center justify-end h-16 px-6">
            <div className="flex items-center space-x-4">
              <NotificationCenter />
            </div>
          </div>
        </header>

        {/* O Outlet renderiza a página atual (Dashboard, Tasks, etc.) */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default AppLayout;