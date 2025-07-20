// src/components/layout/AppLayout.tsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
// A imagem da sua estrutura de pastas mostra Sidebar.tsx na raiz de /components
import Sidebar from '../Sidebar';

const AppLayout = () => {
  // O AppLayout busca a informação do usuário.
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-white">
      {/* 
        Passamos o objeto 'user' que acabamos de buscar como uma prop.
        Mesmo que 'user' seja nulo durante o carregamento, a Sidebar 
        agora está preparada para lidar com isso.
      */}
      <Sidebar user={user} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;