import { SearchX, Filter, AlertCircle, Database } from 'lucide-react';
import { Card } from '@tremor/react';

type EmptyStateVariant = 'no-data' | 'no-results' | 'filter-empty' | 'error' | 'loading';

interface EmptyDataStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const defaultConfigs: Record<EmptyStateVariant, { icon: React.ReactNode; title: string; description: string }> = {
  'no-data': {
    icon: <Database className="w-12 h-12 text-slate-300" />,
    title: 'Sem dados disponíveis',
    description: 'Não há registros para exibir neste momento.',
  },
  'no-results': {
    icon: <SearchX className="w-12 h-12 text-slate-300" />,
    title: 'Nenhum resultado encontrado',
    description: 'Tente ajustar os filtros ou critérios de busca.',
  },
  'filter-empty': {
    icon: <Filter className="w-12 h-12 text-slate-300" />,
    title: 'Filtros sem resultados',
    description: 'Os filtros aplicados não retornaram dados. Tente remover alguns filtros.',
  },
  'error': {
    icon: <AlertCircle className="w-12 h-12 text-rose-300" />,
    title: 'Erro ao carregar dados',
    description: 'Ocorreu um problema. Tente recarregar a página.',
  },
  'loading': {
    icon: <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-500 rounded-full animate-spin" />,
    title: 'Carregando...',
    description: 'Aguarde enquanto os dados são processados.',
  },
};

export function EmptyDataState({
  variant = 'no-data',
  title,
  description,
  action,
  icon,
  className = '',
  compact = false,
}: EmptyDataStateProps) {
  const config = defaultConfigs[variant];

  if (compact) {
    return (
      <div className={`flex flex-col items-center justify-center py-6 px-4 text-center ${className}`}>
        <div className="scale-75">{icon || config.icon}</div>
        <p className="mt-2 text-sm font-medium text-slate-600">
          {title || config.title}
        </p>
        {(description || config.description) && (
          <p className="mt-1 text-xs text-slate-400">
            {description || config.description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      {icon || config.icon}
      <h3 className="mt-4 text-lg font-medium text-slate-700">
        {title || config.title}
      </h3>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        {description || config.description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function EmptyDataCard({
  variant = 'no-data',
  title,
  description,
  action,
  className = '',
}: EmptyDataStateProps) {
  return (
    <Card className={className}>
      <EmptyDataState
        variant={variant}
        title={title}
        description={description}
        action={action}
      />
    </Card>
  );
}

export default EmptyDataState;
