import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Timer, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketTempoCounterProps {
  createdAt: string;
  dataConlusao?: string | null;
  dataPrimeiraInteracao?: string | null;
  compact?: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getTempoColor(seconds: number, isConcluido: boolean): string {
  if (isConcluido) return 'text-green-600 dark:text-green-400';
  
  const hours = seconds / 3600;
  
  if (hours < 4) return 'text-green-600 dark:text-green-400';
  if (hours < 24) return 'text-blue-600 dark:text-blue-400';
  if (hours < 48) return 'text-yellow-600 dark:text-yellow-400';
  if (hours < 72) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

export function TicketTempoCounter({ 
  createdAt, 
  dataConlusao,
  dataPrimeiraInteracao,
  compact = false 
}: TicketTempoCounterProps) {
  const [tempoTotal, setTempoTotal] = useState(0);
  const [tempoPrimeiraResposta, setTempoPrimeiraResposta] = useState<number | null>(null);
  
  const isConcluido = !!dataConlusao;
  
  useEffect(() => {
    const calcularTempo = () => {
      const inicio = new Date(createdAt).getTime();
      const fim = dataConlusao ? new Date(dataConlusao).getTime() : Date.now();
      const diffSeconds = Math.floor((fim - inicio) / 1000);
      setTempoTotal(Math.max(0, diffSeconds));
      
      if (dataPrimeiraInteracao) {
        const primeiraResposta = new Date(dataPrimeiraInteracao).getTime();
        const diffResposta = Math.floor((primeiraResposta - inicio) / 1000);
        setTempoPrimeiraResposta(Math.max(0, diffResposta));
      }
    };
    
    calcularTempo();
    
    // Atualizar a cada minuto se não estiver concluído
    if (!isConcluido) {
      const interval = setInterval(calcularTempo, 60000);
      return () => clearInterval(interval);
    }
  }, [createdAt, dataConlusao, dataPrimeiraInteracao, isConcluido]);
  
  const colorClass = getTempoColor(tempoTotal, isConcluido);
  
  if (compact) {
    return (
      <Badge 
        variant="outline" 
        className={cn("gap-1 font-mono", colorClass)}
      >
        {isConcluido ? (
          <CheckCircle className="h-3 w-3" />
        ) : (
          <Timer className="h-3 w-3 animate-pulse" />
        )}
        {formatDuration(tempoTotal)}
      </Badge>
    );
  }
  
  return (
    <div className={cn(
      "flex flex-col gap-1 p-3 rounded-lg border",
      isConcluido 
        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
        : "bg-muted border-border"
    )}>
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-full", isConcluido ? "bg-green-100 dark:bg-green-900/50" : "bg-background")}>
          {isConcluido ? (
            <CheckCircle className={cn("h-4 w-4", colorClass)} />
          ) : (
            <Timer className={cn("h-4 w-4 animate-pulse", colorClass)} />
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {isConcluido ? 'Tempo Total' : 'Tempo Aberto'}
          </p>
          <p className={cn("font-mono font-semibold text-lg", colorClass)}>
            {formatDuration(tempoTotal)}
          </p>
        </div>
      </div>
      
      {tempoPrimeiraResposta !== null && (
        <div className="flex items-center gap-2 pt-2 border-t mt-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="text-xs">
            <span className="text-muted-foreground">1ª Resposta: </span>
            <span className="font-medium">{formatDuration(tempoPrimeiraResposta)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
