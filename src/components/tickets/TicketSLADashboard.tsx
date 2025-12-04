import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Timer,
  TrendingUp,
  TrendingDown,
  Target
} from "lucide-react";
import { formatDistanceToNow, differenceInMinutes, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TicketSLADashboardProps {
  ticket: {
    id: string;
    created_at: string;
    sla_primeira_resposta: string | null;
    sla_resolucao: string | null;
    tempo_primeira_resposta: string | null;
    tempo_total_resolucao: string | null;
    first_response_at?: string | null;
    status: string | null;
    prioridade: string | null;
  };
}

interface SLAMetric {
  label: string;
  deadline: Date | null;
  completed: boolean;
  completedAt?: Date | null;
  icon: React.ElementType;
}

export function TicketSLADashboard({ ticket }: TicketSLADashboardProps) {
  const now = new Date();

  const metrics = useMemo(() => {
    const slaFirstResponse = ticket.sla_primeira_resposta ? new Date(ticket.sla_primeira_resposta) : null;
    const slaResolution = ticket.sla_resolucao ? new Date(ticket.sla_resolucao) : null;
    const hasFirstResponse = !!ticket.first_response_at || !!ticket.tempo_primeira_resposta;
    const isResolved = ticket.status === 'resolvido' || ticket.status === 'fechado';

    return [
      {
        label: 'Primeira Resposta',
        deadline: slaFirstResponse,
        completed: hasFirstResponse,
        completedAt: ticket.first_response_at ? new Date(ticket.first_response_at) : null,
        icon: Timer
      },
      {
        label: 'Resolução',
        deadline: slaResolution,
        completed: isResolved,
        completedAt: ticket.tempo_total_resolucao ? new Date(ticket.tempo_total_resolucao) : null,
        icon: Target
      }
    ] as SLAMetric[];
  }, [ticket]);

  const getSLAStatus = (metric: SLAMetric) => {
    if (!metric.deadline) return { status: 'unknown', color: 'gray' };
    
    if (metric.completed) {
      if (metric.completedAt && metric.completedAt <= metric.deadline) {
        return { status: 'cumprido', color: 'green', label: 'SLA Cumprido' };
      } else if (metric.completedAt && metric.completedAt > metric.deadline) {
        return { status: 'violado', color: 'red', label: 'SLA Violado' };
      }
      return { status: 'cumprido', color: 'green', label: 'Concluído' };
    }

    const isOverdue = now > metric.deadline;
    const minutesRemaining = differenceInMinutes(metric.deadline, now);
    const isUrgent = minutesRemaining > 0 && minutesRemaining <= 60;
    const isWarning = minutesRemaining > 60 && minutesRemaining <= 120;

    if (isOverdue) {
      return { status: 'violado', color: 'red', label: 'SLA Violado' };
    }
    if (isUrgent) {
      return { status: 'critico', color: 'orange', label: 'Crítico' };
    }
    if (isWarning) {
      return { status: 'alerta', color: 'yellow', label: 'Atenção' };
    }
    return { status: 'ok', color: 'blue', label: 'No Prazo' };
  };

  const getProgressPercentage = (metric: SLAMetric) => {
    if (!metric.deadline) return 0;
    if (metric.completed) return 100;

    const createdAt = new Date(ticket.created_at);
    const totalTime = metric.deadline.getTime() - createdAt.getTime();
    const elapsed = now.getTime() - createdAt.getTime();
    const percentage = Math.min((elapsed / totalTime) * 100, 100);
    
    return Math.round(percentage);
  };

  const getTimeDisplay = (metric: SLAMetric) => {
    if (!metric.deadline) return 'N/A';

    if (metric.completed && metric.completedAt) {
      const diff = differenceInMinutes(metric.completedAt, new Date(ticket.created_at));
      if (diff < 60) return `${diff}min`;
      const hours = differenceInHours(metric.completedAt, new Date(ticket.created_at));
      return `${hours}h ${diff % 60}min`;
    }

    if (now > metric.deadline) {
      return `Vencido ${formatDistanceToNow(metric.deadline, { locale: ptBR })}`;
    }

    return `Vence ${formatDistanceToNow(metric.deadline, { addSuffix: true, locale: ptBR })}`;
  };

  const priorityConfig: Record<string, { label: string; slaHours: number; color: string }> = {
    urgente: { label: 'Urgente', slaHours: 4, color: 'bg-red-500' },
    alta: { label: 'Alta', slaHours: 24, color: 'bg-orange-500' },
    media: { label: 'Média', slaHours: 48, color: 'bg-blue-500' },
    baixa: { label: 'Baixa', slaHours: 72, color: 'bg-gray-500' }
  };

  const priority = priorityConfig[ticket.prioridade || 'media'];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Controle de SLA
          </CardTitle>
          <Badge className={priority.color}>
            {priority.label} - SLA {priority.slaHours}h
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric, index) => {
          const slaStatus = getSLAStatus(metric);
          const progress = getProgressPercentage(metric);
          const Icon = metric.icon;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{metric.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {slaStatus.status === 'cumprido' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {slaStatus.status === 'violado' && (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  {slaStatus.status === 'critico' && (
                    <TrendingDown className="w-4 h-4 text-orange-500" />
                  )}
                  {slaStatus.status === 'ok' && (
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  )}
                  <Badge 
                    variant={
                      slaStatus.color === 'green' ? 'default' :
                      slaStatus.color === 'red' ? 'destructive' :
                      'secondary'
                    }
                    className={
                      slaStatus.color === 'orange' ? 'bg-orange-500 text-white' :
                      slaStatus.color === 'yellow' ? 'bg-yellow-500 text-black' :
                      ''
                    }
                  >
                    {slaStatus.label}
                  </Badge>
                </div>
              </div>
              
              <Progress 
                value={progress} 
                className={`h-2 ${
                  slaStatus.color === 'green' ? '[&>div]:bg-green-500' :
                  slaStatus.color === 'red' ? '[&>div]:bg-red-500' :
                  slaStatus.color === 'orange' ? '[&>div]:bg-orange-500' :
                  slaStatus.color === 'yellow' ? '[&>div]:bg-yellow-500' :
                  '[&>div]:bg-blue-500'
                }`}
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {metric.deadline ? 
                    `Prazo: ${metric.deadline.toLocaleString('pt-BR')}` : 
                    'Prazo não definido'
                  }
                </span>
                <span className={
                  slaStatus.color === 'red' ? 'text-red-500 font-medium' :
                  slaStatus.color === 'orange' ? 'text-orange-500 font-medium' :
                  ''
                }>
                  {getTimeDisplay(metric)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Tempo total desde abertura */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tempo desde abertura:</span>
            <span className="font-medium">
              {formatDistanceToNow(new Date(ticket.created_at), { locale: ptBR })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
