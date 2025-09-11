import { CalendarIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
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

// Gradientes para avatares baseados no hash do nome
const getAvatarGradient = (name: string): string => {
  const gradients = [
    'bg-gradient-to-br from-purple-600 to-orange-500',
    'bg-gradient-to-br from-blue-600 to-green-600', 
    'bg-gradient-to-br from-orange-500 to-red-500',
    'bg-gradient-to-br from-primary to-purple-600'
  ];
  const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

const KanbanTaskCard = memo(({ 
  id, 
  cliente, 
  resumo, 
  data, 
  motivo, 
  avatar, 
  status,
  created_at,
  department = 'suporte'
}: KanbanTaskCardProps) => {
  const priority = getPriorityFromDate(created_at || data);
  const avatarGradient = getAvatarGradient(cliente);
  
  // Mapear status para departamento se não especificado
  const finalDepartment = department || (
    status === 'analise' ? 'tecnico' :
    status === 'resolvido' ? 'suporte' :
    'suporte'
  );
  
  // Configuração de cores por prioridade
  const priorityConfig = {
    urgent: {
      border: 'border-priority-urgent/30',
      bg: 'bg-priority-urgent/5',
      icon: ExclamationTriangleIcon,
      iconColor: 'text-priority-urgent',
      pulse: 'animate-pulse-glow'
    },
    medium: {
      border: 'border-priority-medium/30', 
      bg: 'bg-priority-medium/5',
      icon: ClockIcon,
      iconColor: 'text-priority-medium',
      pulse: ''
    },
    normal: {
      border: 'border-priority-normal/30',
      bg: 'bg-priority-normal/5', 
      icon: CalendarIcon,
      iconColor: 'text-priority-normal',
      pulse: ''
    }
  };

  const config = priorityConfig[priority];
  const PriorityIcon = config.icon;

  // Configuração de cores por departamento
  const deptColors = {
    vendas: 'bg-department-vendas',
    suporte: 'bg-department-suporte', 
    financeiro: 'bg-department-financeiro',
    tecnico: 'bg-department-tecnico'
  };

  return (
    <div className={`
      group relative cursor-pointer
      border-2 ${config.border} ${config.bg}
      bg-card rounded-xl p-4 min-h-[100px]
      shadow-sm hover:shadow-card-hover
      transition-all duration-300 ease-out
      hover:scale-[1.02] hover:-translate-y-1
      ${config.pulse}
      animate-fade-in
    `}>
      {/* Indicador de prioridade (barra lateral) */}
      <div className={`
        absolute left-0 top-4 bottom-4 w-1 rounded-r-full
        ${priority === 'urgent' ? 'bg-priority-urgent' : 
          priority === 'medium' ? 'bg-priority-medium' : 'bg-priority-normal'}
      `} />

      <div className="flex gap-4 items-center">
        {/* Avatar com gradiente */}
        <div className={`
          relative w-12 h-12 rounded-full flex items-center justify-center 
          font-bold text-lg text-white shadow-md
          ${avatarGradient}
          transition-transform duration-300 group-hover:scale-110
        `}>
          <span className="relative z-10">{avatar || cliente.charAt(0).toUpperCase()}</span>
          <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header com nome e ID */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-card-foreground text-base truncate">
              {cliente}
            </span>
            <span className="text-xs text-muted-foreground">#{id}</span>
            <PriorityIcon className={`w-4 h-4 ${config.iconColor} ml-auto`} />
          </div>

          {/* Info secundária */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs flex items-center gap-1 text-muted-foreground">
              <CalendarIcon className="w-3 h-3" /> {data}
            </span>
            <span className="text-xs text-muted-foreground">• {motivo}</span>
          </div>

          {/* Resumo */}
          {resumo && (
            <div className="text-xs text-card-foreground/80 mb-2 line-clamp-2">
              {resumo}
            </div>
          )}

          {/* Badge de departamento */}
          <div className="flex items-center justify-between">
            <Badge 
              variant="outline" 
              className={`text-xs ${deptColors[finalDepartment]} text-white border-0`}
            >
              {finalDepartment.charAt(0).toUpperCase() + finalDepartment.slice(1)}
            </Badge>
            
            {/* Indicador de tempo */}
            <div className={`
              text-xs px-2 py-1 rounded-full font-medium
              ${priority === 'urgent' ? 'bg-priority-urgent/10 text-priority-urgent' :
                priority === 'medium' ? 'bg-priority-medium/10 text-priority-medium' :
                'bg-priority-normal/10 text-priority-normal'}
            `}>
              {priority === 'urgent' ? 'Urgente' : 
               priority === 'medium' ? 'Médio' : 'Normal'}
            </div>
          </div>
        </div>
      </div>

      {/* Glow effect no hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
});

export default KanbanTaskCard;
