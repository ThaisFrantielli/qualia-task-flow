import { CalendarIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { memo } from 'react';

export interface KanbanTaskCardProps {
  id: number | string;
  cliente: string;
  resumo?: string;
  data: string;
  motivo: string;
  avatar?: string;
  status?: string;
  created_at?: string;
  department?: 'vendas' | 'suporte' | 'financeiro' | 'tecnico';
}

// Função para calcular prioridade baseada no tempo (SLA)
const getPriorityFromDate = (dateStr: string): 'urgent' | 'medium' | 'normal' => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffHours > 48) return 'urgent';    // +48h = Urgente
  if (diffHours > 24) return 'medium';    // +24h = Médio
  return 'normal';                        // -24h = Normal
};

// Cores simples para avatares baseados no hash do nome
const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500', 
    'bg-purple-500',
    'bg-orange-500'
  ];
  const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const KanbanTaskCard = memo(({ 
  id, 
  cliente, 
  resumo, 
  data, 
  motivo, 
  avatar,
  created_at
}: KanbanTaskCardProps) => {
  const priority = getPriorityFromDate(created_at || data);
  const avatarColor = getAvatarColor(cliente);
  
  // Configuração simplificada por prioridade
  const priorityConfig = {
    urgent: {
      border: 'border-priority-urgent/50',
      icon: ExclamationTriangleIcon,
      iconColor: 'text-priority-urgent'
    },
    medium: {
      border: 'border-priority-medium/50', 
      icon: ClockIcon,
      iconColor: 'text-priority-medium'
    },
    normal: {
      border: 'border-border',
      icon: CalendarIcon,
      iconColor: 'text-muted-foreground'
    }
  };

  const config = priorityConfig[priority];
  const PriorityIcon = config.icon;

  return (
    <div className={`
      cursor-pointer
      border ${config.border}
      bg-card rounded-lg p-3
      hover:shadow-sm
      transition-shadow duration-200
    `}>
      {/* Indicador de prioridade (barra lateral) */}
      {priority !== 'normal' && (
        <div className={`
          absolute left-0 top-3 bottom-3 w-0.5 rounded-r
          ${priority === 'urgent' ? 'bg-priority-urgent' : 'bg-priority-medium'}
        `} />
      )}

      <div className="flex gap-3 items-center">
        {/* Avatar simples */}
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center 
          font-medium text-sm text-white
          ${avatarColor}
        `}>
          <span>{avatar || cliente.charAt(0).toUpperCase()}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header com nome e ID */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-foreground text-sm truncate">
              {cliente}
            </span>
            <span className="text-xs text-muted-foreground">#{id}</span>
            {priority !== 'normal' && (
              <PriorityIcon className={`w-3 h-3 ${config.iconColor} ml-auto`} />
            )}
          </div>

          {/* Info secundária */}
          <div className="text-xs text-muted-foreground mb-1">
            {data} • {motivo}
          </div>

          {/* Resumo */}
          {resumo && (
            <div className="text-xs text-foreground/70 mb-2 line-clamp-1">
              {resumo}
            </div>
          )}

          {/* Status */}
          {priority !== 'normal' && (
            <div className="flex justify-end">
              <span className={`
                text-xs px-2 py-0.5 rounded font-medium
                ${priority === 'urgent' ? 'bg-priority-urgent/10 text-priority-urgent' :
                  'bg-priority-medium/10 text-priority-medium'}
              `}>
                {priority === 'urgent' ? 'Urgente' : 'Médio'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default KanbanTaskCard;
