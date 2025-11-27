// FASE 8: Componente de Rota Protegida por Módulo
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ModuleProtectedRouteProps {
  moduleKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ModuleProtectedRoute: React.FC<ModuleProtectedRouteProps> = ({
  moduleKey,
  children,
  fallback,
}) => {
  const { hasAccess, loading } = useModuleAccess(moduleKey);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Você não tem permissão para acessar este módulo. 
          Entre em contato com o administrador do sistema.
        </p>
        <Navigate to="/dashboard" replace />
      </div>
    );
  }

  return <>{children}</>;
};

export default ModuleProtectedRoute;
