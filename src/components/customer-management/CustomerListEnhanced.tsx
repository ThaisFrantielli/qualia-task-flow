import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Ticket, Target, AlertCircle, Clock } from 'lucide-react';
import { useClientesStats } from '@/hooks/useClienteStats';
import { formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface CustomerDisplayInfo {
  id: string;
  name: string;
  fantasia?: string;
  status: string;
  primaryContact: string;
  initials: string;
  tipoCliente?: string;
  naturezaCliente?: string;
  ultimoAtendimentoAt?: string | null;
  codigoCliente?: string;
}

interface CustomerListEnhancedProps {
  customers: CustomerDisplayInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const getStatusColor = (status: string) => {
  if (!status) return 'bg-muted text-muted-foreground';
  switch (status.toLowerCase()) {
    case 'ativo':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'inativo':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

// Indicador visual de último contato
const getLastContactIndicator = (lastContactDate: string | null | undefined) => {
  if (!lastContactDate) return { color: 'bg-muted', text: 'Sem contato' };
  
  try {
    const date = parseISO(lastContactDate);
    const daysDiff = differenceInDays(new Date(), date);
    
    if (daysDiff <= 7) {
      return { color: 'bg-green-500', text: formatDistanceToNow(date, { locale: ptBR, addSuffix: true }) };
    } else if (daysDiff <= 30) {
      return { color: 'bg-yellow-500', text: formatDistanceToNow(date, { locale: ptBR, addSuffix: true }) };
    } else {
      return { color: 'bg-red-500', text: formatDistanceToNow(date, { locale: ptBR, addSuffix: true }) };
    }
  } catch {
    return { color: 'bg-muted', text: 'Data inválida' };
  }
};

// Avatar colorido por tipo de cliente
const getAvatarColor = (tipoCliente?: string) => {
  switch (tipoCliente?.toLowerCase()) {
    case 'pj':
    case 'pessoa jurídica':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'pf':
    case 'pessoa física':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    default:
      return 'bg-primary/10 text-primary';
  }
};

export const CustomerListEnhanced: React.FC<CustomerListEnhancedProps> = ({
  customers,
  selectedId,
  onSelect,
}) => {
  const clienteIds = customers.map((c) => c.id);
  const { data: statsMap, isLoading: statsLoading } = useClientesStats(clienteIds);

  const formatCurrency = (value: number) => {
    if (value === 0) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);
  };

  return (
    <div className="bg-card rounded-lg border h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Clientes</h2>
          <Badge variant="secondary">{customers.length}</Badge>
        </div>
      </div>
      
      {/* Lista com altura fixa para ~10 itens (cada item ~60px) e scroll */}
      <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <div className="divide-y">
            {customers.map((customer) => {
              const stats = statsMap?.[customer.id];
              const hasUrgent = (stats?.ticketsAbertos ?? 0) > 0;
              const lastContactInfo = getLastContactIndicator(customer.ultimoAtendimentoAt);

              return (
                <div
                  key={customer.id}
                  className={`p-3 cursor-pointer transition-all hover:bg-muted/50 ${
                    selectedId === customer.id
                      ? 'bg-primary/5 border-l-4 border-l-primary'
                      : 'border-l-4 border-l-transparent'
                  }`}
                  onClick={() => onSelect(customer.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className={`font-semibold text-xs ${getAvatarColor(customer.tipoCliente)}`}>
                          {customer.initials}
                        </AvatarFallback>
                      </Avatar>
                      {/* Indicador de último contato */}
                      <div 
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${lastContactInfo.color}`}
                        title={lastContactInfo.text}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{customer.name}</p>
                        {hasUrgent && (
                          <AlertCircle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs px-1.5 py-0 ${getStatusColor(customer.status)}`}
                        >
                          {customer.status || 'N/D'}
                        </Badge>
                        {customer.tipoCliente && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {customer.tipoCliente}
                          </Badge>
                        )}
                        {customer.codigoCliente && (
                          <span className="text-xs text-muted-foreground">
                            #{customer.codigoCliente}
                          </span>
                        )}
                      </div>

                      {/* Último contato e Mini KPIs */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {customer.ultimoAtendimentoAt && (
                          <div className="flex items-center gap-1" title="Último contato">
                            <Clock className="h-3 w-3" />
                            <span>{lastContactInfo.text}</span>
                          </div>
                        )}
                        {!statsLoading && stats && (
                          <>
                            {stats.ticketsAbertos > 0 && (
                              <div className="flex items-center gap-1">
                                <Ticket className="h-3 w-3" />
                                <span>{stats.ticketsAbertos}</span>
                              </div>
                            )}
                            {stats.valorTotalOportunidades > 0 && (
                              <div className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                <span>{formatCurrency(stats.valorTotalOportunidades)}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
