import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Play,
  Pause,
  Square,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Broadcast } from '@/hooks/useBroadcasts';
import { Skeleton } from '@/components/ui/skeleton';

interface BroadcastListProps {
  broadcasts: Broadcast[];
  loading: boolean;
  onAction: (action: string, broadcast: Broadcast) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground', icon: <Clock className="h-3 w-3" /> },
  scheduled: { label: 'Agendada', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: <Calendar className="h-3 w-3" /> },
  running: { label: 'Enviando', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  paused: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: <Pause className="h-3 w-3" /> },
  completed: { label: 'Concluída', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300', icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: <XCircle className="h-3 w-3" /> },
};

export function BroadcastList({ broadcasts, loading, onAction }: BroadcastListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (broadcasts.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhuma campanha criada</h3>
        <p className="text-muted-foreground">
          Crie sua primeira campanha de transmissão para começar a enviar mensagens em massa.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campanha</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progresso</TableHead>
            <TableHead>Instância</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {broadcasts.map((broadcast) => {
            const status = statusConfig[broadcast.status] || statusConfig.draft;
            const total = broadcast.total_recipients;
            const processed = broadcast.sent_count + broadcast.failed_count + broadcast.skipped_count;
            const progress = total > 0 ? (processed / total) * 100 : 0;

            return (
              <TableRow key={broadcast.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{broadcast.name}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                      {broadcast.message_template.slice(0, 60)}...
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`gap-1 ${status.color}`}>
                    {status.icon}
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="w-32 space-y-1">
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{processed}/{total}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="text-green-600">{broadcast.sent_count} ✓</span>
                      <span className="text-red-600">{broadcast.failed_count} ✗</span>
                      <span className="text-muted-foreground">{broadcast.skipped_count} ⊘</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {broadcast.whatsapp_instances?.name || '-'}
                </TableCell>
                <TableCell>
                  {format(new Date(broadcast.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        •••
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border shadow-lg z-50">
                      <DropdownMenuItem onClick={() => onAction('view', broadcast)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalhes
                      </DropdownMenuItem>
                      
                      {broadcast.status === 'draft' && (
                        <DropdownMenuItem onClick={() => onAction('start', broadcast)}>
                          <Play className="h-4 w-4 mr-2" />
                          Iniciar envio
                        </DropdownMenuItem>
                      )}
                      
                      {broadcast.status === 'running' && (
                        <DropdownMenuItem onClick={() => onAction('pause', broadcast)}>
                          <Pause className="h-4 w-4 mr-2" />
                          Pausar
                        </DropdownMenuItem>
                      )}
                      
                      {broadcast.status === 'paused' && (
                        <DropdownMenuItem onClick={() => onAction('resume', broadcast)}>
                          <Play className="h-4 w-4 mr-2" />
                          Retomar
                        </DropdownMenuItem>
                      )}
                      
                      {['running', 'paused'].includes(broadcast.status) && (
                        <DropdownMenuItem onClick={() => onAction('cancel', broadcast)} className="text-orange-600">
                          <Square className="h-4 w-4 mr-2" />
                          Cancelar
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      
                      {['draft', 'completed', 'cancelled'].includes(broadcast.status) && (
                        <DropdownMenuItem onClick={() => onAction('delete', broadcast)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
