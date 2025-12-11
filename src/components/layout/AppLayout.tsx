// src/components/layout/AppLayout.tsx (VERSÃO CORRIGIDA PARA SCROLL)

import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';
import NotificationCenter from '../notifications/NotificationCenter';
import { Toaster } from 'sonner';
import { useForcePasswordChange } from '@/hooks/useForcePasswordChange';

const AppLayout: React.FC = () => {
  // Verificar se usuário precisa trocar senha
  useForcePasswordChange();

  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar /> 
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header da sua aplicação */}
        <header className="bg-white shadow-sm border-b border-gray-200 z-10 flex-shrink-0">
          <div className="flex items-center justify-end h-16 px-6">
            <div className="flex items-center space-x-4">
              <NotificationCenter />
            </div>
          </div>
        </header>

        {/* --- CORREÇÃO APLICADA AQUI --- */}
        {/* A área principal agora é um container flex que permite ao filho crescer */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {/* Este div garante que o conteúdo da página (Outlet) ocupe toda a altura disponível */}
          <div className="flex-1">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default AppLayout;