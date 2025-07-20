// src/components/auth/ProtectedRoute.tsx

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // 1. Tela de carregamento global enquanto a sessão é verificada
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // 2. Se o carregamento terminou e NÃO há usuário, redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Se há usuário, permite a renderização do conteúdo (AppLayout e as páginas)
  return <Outlet />;
};

export default ProtectedRoute;