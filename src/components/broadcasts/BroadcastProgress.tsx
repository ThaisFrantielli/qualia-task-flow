import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Play,
  Pause,
  Square,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Broadcast, useBroadcastRecipients, useBroadcastProcessor } from '@/hooks/useBroadcasts';

interface BroadcastProgressProps {
  broadcast: Broadcast;
  onAction: (action: string, broadcast: Broadcast) => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  sent: <CheckCircle className="h-4 w-4 text-green-600" />,
  failed: <XCircle className="h-4 w-4 text-red-600" />,
  skipped: <AlertCircle className="h-4 w-4 text-yellow-600" />,
};

export function BroadcastProgress({ broadcast, onAction }: BroadcastProgressProps) {
  const { recipients, stats, fetchRecipients } = useBroadcastRecipients(broadcast.id);
  const { isProcessing, lastResult, processNext } = useBroadcastProcessor(broadcast.id);
  const [autoProcess, setAutoProcess] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const total = broadcast.total_recipients;
  const processed = broadcast.sent_count + broadcast.failed_count + broadcast.skipped_count;
  const progress = total > 0 ? (processed / total) * 100 : 0;

  useEffect(() => {
    if (broadcast.status === 'running' && autoProcess && !isProcessing) {
      const delay = lastResult?.next_delay_seconds || 10;
      
      intervalRef.current = setTimeout(async () => {
        const shouldContinue = await processNext();
        if (!shouldContinue) {
          setAutoProcess(false);
        }
      }, delay * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [broadcast.status, autoProcess, isProcessing, lastResult, processNext]);

  const handleStartAutoProcess = () => {
    setAutoProcess(true);
    processNext();
  };

  const handleStopAutoProcess = () => {
    setAutoProcess(false);
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
          <p className="text-sm text-muted-foreground">Enviadas</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          <p className="text-sm text-muted-foreground">Falharam</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.skipped}</p>
          <p className="text-sm text-muted-foreground">Ignoradas</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">Progresso</span>
          <span className="text-sm text-muted-foreground">
            {processed} de {total} ({Math.round(progress)}%)
          </span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      <div className="flex items-center justify-between border rounded-lg p-4">
        <div className="flex items-center gap-4">
          {broadcast.status === 'running' && (
            <>
              {autoProcess ? (
                <Button variant="outline" onClick={handleStopAutoProcess}>
                  <Pause className="h-4 w-4 mr-2" />
                  Parar processamento
                </Button>
              ) : (
                <Button onClick={handleStartAutoProcess} disabled={isProcessing}>
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Iniciar processamento
                </Button>
              )}
              <Button variant="outline" onClick={() => processNext()} disabled={isProcessing || autoProcess}>
                Enviar próxima
              </Button>
            </>
          )}

          {broadcast.status === 'draft' && (
            <Button onClick={() => onAction('start', broadcast)}>
              <Play className="h-4 w-4 mr-2" />
              Iniciar campanha
            </Button>
          )}

          {broadcast.status === 'paused' && (
            <Button onClick={() => onAction('resume', broadcast)}>
              <Play className="h-4 w-4 mr-2" />
              Retomar
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => fetchRecipients()}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          {broadcast.status === 'running' && (
            <Button variant="outline" onClick={() => onAction('pause', broadcast)}>
              <Pause className="h-4 w-4 mr-2" />
              Pausar
            </Button>
          )}

          {['running', 'paused'].includes(broadcast.status) && (
            <Button variant="destructive" onClick={() => onAction('cancel', broadcast)}>
              <Square className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {lastResult && (
        <div className={`rounded-lg p-3 text-sm ${
          lastResult.error 
            ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
            : lastResult.sent 
              ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
              : 'bg-muted'
        }`}>
          {lastResult.error ? (
            <span>Erro: {lastResult.error}</span>
          ) : lastResult.completed ? (
            <span>✓ Campanha concluída!</span>
          ) : lastResult.sent ? (
            <span>
              ✓ Enviado para {lastResult.phone} • Próximo em {lastResult.next_delay_seconds}s
              {lastResult.batch_pause && ' (pausa de lote)'}
              • Restam {lastResult.remaining}
            </span>
          ) : (
            <span>Falha ao enviar para {lastResult.phone}</span>
          )}
        </div>
      )}

      <div>
        <h4 className="font-medium mb-3">Destinatários</h4>
        <ScrollArea className="h-[300px] border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.map((recipient) => (
                <TableRow key={recipient.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {statusIcons[recipient.status]}
                      <span className="capitalize">{recipient.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {recipient.clientes?.nome_fantasia || 
                     recipient.clientes?.razao_social || 
                     (recipient.variables as any)?.nome || 
                     '-'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {recipient.phone_number}
                  </TableCell>
                  <TableCell>
                    {recipient.sent_at
                      ? format(new Date(recipient.sent_at), 'dd/MM HH:mm:ss', { locale: ptBR })
                      : '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {recipient.error_message || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3">Configurações Anti-Banimento</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Delay:</span>{' '}
            {broadcast.min_delay_seconds}s - {broadcast.max_delay_seconds}s
          </div>
          <div>
            <span className="text-muted-foreground">Limite diário:</span>{' '}
            {broadcast.daily_limit} msgs
          </div>
          <div>
            <span className="text-muted-foreground">Lote:</span>{' '}
            {broadcast.batch_size} msgs / {broadcast.batch_pause_minutes} min pausa
          </div>
        </div>
      </div>
    </div>
  );
}
