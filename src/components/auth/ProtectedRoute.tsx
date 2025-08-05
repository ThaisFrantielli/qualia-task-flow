// src/components/auth/ProtectedRoute.tsx

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // 1. Enquanto a autenticação está sendo verificada, mostra uma tela de carregamento.
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 2. Se o carregamento terminou e NÃO há usuário, redireciona para a página de login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Se o carregamento terminou e HÁ um usuário, renderiza o conteúdo protegido (os Layouts e as páginas).
  return <Outlet />;
};

export default ProtectedRoute;