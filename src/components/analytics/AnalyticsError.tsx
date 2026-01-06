import { AlertTriangle, RefreshCw, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@tremor/react';

interface AnalyticsErrorProps {
  error: string | Error;
  onRetry?: () => void;
  title?: string;
  showRetry?: boolean;
}

export function AnalyticsError({
  error,
  onRetry,
  title = 'Erro ao carregar dados',
  showRetry = true,
}: AnalyticsErrorProps) {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className="bg-background min-h-screen p-6 flex items-center justify-center">
      <Card className="max-w-md p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-destructive/10 rounded-full">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>

        <div className="pt-2 space-y-2">
          {showRetry && onRetry && (
            <Button onClick={onRetry} variant="default" className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Se o problema persistir, verifique sua conexão ou contate o suporte.
          </p>
        </div>
      </Card>
    </div>
  );
}

export function AnalyticsErrorInline({
  error,
  onRetry,
}: {
  error: string | Error;
  onRetry?: () => void;
}) {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-destructive">Erro ao carregar</p>
          <p className="text-xs text-muted-foreground">{errorMessage}</p>
        </div>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="ghost" size="sm" className="gap-1">
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      )}
    </div>
  );
}

export function AnalyticsNoData({
  message = 'Nenhum dado encontrado',
  suggestion = 'Tente ajustar os filtros ou verifique se há dados disponíveis.',
  icon: Icon = FileWarning,
}: {
  message?: string;
  suggestion?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 bg-muted rounded-full mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">{message}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{suggestion}</p>
    </div>
  );
}

export default AnalyticsError;
