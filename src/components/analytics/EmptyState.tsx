import { FileSearch, Filter, Database, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

type EmptyStateVariant = 'no-data' | 'no-results' | 'filtered' | 'error';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ComponentType<{ className?: string }>;
}

const defaultConfigs: Record<EmptyStateVariant, { icon: React.ComponentType<{ className?: string }>; title: string; description: string }> = {
  'no-data': {
    icon: Database,
    title: 'Nenhum dado disponível',
    description: 'Os dados ainda não foram carregados ou não existem para este período.',
  },
  'no-results': {
    icon: Inbox,
    title: 'Nenhum resultado encontrado',
    description: 'Não encontramos dados correspondentes à sua busca.',
  },
  'filtered': {
    icon: Filter,
    title: 'Nenhum resultado com os filtros atuais',
    description: 'Tente remover ou ajustar os filtros para ver mais resultados.',
  },
  'error': {
    icon: FileSearch,
    title: 'Erro ao carregar dados',
    description: 'Ocorreu um problema ao carregar os dados. Tente novamente.',
  },
};

export function EmptyState({
  variant = 'no-data',
  title,
  description,
  action,
  icon: CustomIcon,
}: EmptyStateProps) {
  const config = defaultConfigs[variant];
  const Icon = CustomIcon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 bg-muted/50 rounded-full mb-4">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {displayTitle}
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {displayDescription}
      </p>

      {action && (
        <Button onClick={action.onClick} variant="outline" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function EmptyStateInline({
  message = 'Sem dados',
}: {
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
      <Inbox className="h-4 w-4 mr-2" />
      {message}
    </div>
  );
}

export function EmptyStateCard({
  variant = 'no-data',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="bg-card border rounded-lg p-8">
      <EmptyState
        variant={variant}
        title={title}
        description={description}
        action={action}
      />
    </div>
  );
}

export default EmptyState;
