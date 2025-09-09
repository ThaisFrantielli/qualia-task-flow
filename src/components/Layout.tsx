// src/components/Layout.tsx


import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; 
import NotificationCenter from './notifications/NotificationCenter'; 
import { Toaster } from 'sonner';

const Layout = () => {
  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Passar o usuário como 'prop' para a Sidebar */}
      <Sidebar />
      
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