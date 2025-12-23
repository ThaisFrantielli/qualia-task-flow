import { Edit, MoreHorizontal, Eye, Copy, Send, FileCheck } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Proposta } from '@/types/proposta';
import { Skeleton } from '@/components/ui/skeleton';

interface PropostaTableProps {
  propostas: Proposta[];
  isLoading: boolean;
  onEdit: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  enviada: { label: 'Enviada', variant: 'outline' },
  em_negociacao: { label: 'Em Negociação', variant: 'default' },
  aprovada: { label: 'Aprovada', variant: 'default' },
  rejeitada: { label: 'Rejeitada', variant: 'destructive' },
  cancelada: { label: 'Cancelada', variant: 'secondary' },
};

export function PropostaTable({
  propostas,
  isLoading,
  onEdit,
}: PropostaTableProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Veículos</TableHead>
              <TableHead>Valor Mensal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criação</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (propostas.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">Nenhuma proposta encontrada</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-center">Veículos</TableHead>
            <TableHead className="text-right">Valor Mensal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criação</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {propostas.map((proposta) => {
            const statusConfig = STATUS_CONFIG[proposta.status || 'rascunho'];
            
            return (
              <TableRow key={proposta.id}>
                <TableCell className="font-mono">
                  #{proposta.numero_proposta.toString().padStart(4, '0')}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{proposta.cliente_nome}</p>
                    {proposta.cliente_cnpj && (
                      <p className="text-xs text-muted-foreground">
                        {proposta.cliente_cnpj}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{proposta.vendedor_nome || '-'}</TableCell>
                <TableCell className="text-center">
                  {proposta.quantidade_veiculos || 0}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(proposta.valor_mensal_total)}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={statusConfig.variant}
                    className={proposta.status === 'aprovada' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
                  >
                    {statusConfig.label}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(proposta.created_at)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(proposta.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(proposta.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {proposta.status === 'rascunho' && (
                        <DropdownMenuItem>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar
                        </DropdownMenuItem>
                      )}
                      {proposta.status === 'aprovada' && (
                        <DropdownMenuItem>
                          <FileCheck className="h-4 w-4 mr-2" />
                          Gerar Contrato
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
