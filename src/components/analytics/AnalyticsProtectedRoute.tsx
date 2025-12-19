// Componente de proteção para rotas do Analytics
import { ReactNode } from 'react';
import { useAnalyticsPageAccess } from '@/hooks/useAnalyticsAccess';
import { Loader2, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AnalyticsProtectedRouteProps {
  pageKey: string;
  children: ReactNode;
}

export default function AnalyticsProtectedRoute({ pageKey, children }: AnalyticsProtectedRouteProps) {
  const { hasAccess, loading } = useAnalyticsPageAccess(pageKey);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar este dashboard.
              Entre em contato com o administrador para solicitar acesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => window.history.back()}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
