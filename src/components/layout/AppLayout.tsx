// src/components/layout/AppLayout.tsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';
import NotificationCenter from '../notifications/NotificationCenter'; // <-- CORREÇÃO AQUI
import { Toaster } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const AppLayout = () => {
  const { user } = useAuth(); // Embora não seja mais passado para a Sidebar, pode ser útil aqui no futuro

  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar /> 
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 z-10">
          <div className="flex items-center justify-end h-16 px-6">
            <div className="flex items-center space-x-4">
              <NotificationCenter />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default AppLayout;