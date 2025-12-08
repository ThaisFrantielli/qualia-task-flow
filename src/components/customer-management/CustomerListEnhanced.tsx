import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Ticket, Target, AlertCircle } from 'lucide-react';
import { useClientesStats } from '@/hooks/useClienteStats';

export interface CustomerDisplayInfo {
  id: string;
  name: string;
  fantasia?: string;
  status: string;
  primaryContact: string;
  initials: string;
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
      return 'bg-green-100 text-green-700';
    case 'inativo':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-muted text-muted-foreground';
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
      
      <div className="flex-1 overflow-y-auto">
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
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {customer.initials}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{customer.name}</p>
                        {hasUrgent && (
                          <AlertCircle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge
                          variant="outline"
                          className={`text-xs px-1.5 py-0 ${getStatusColor(customer.status)}`}
                        >
                          {customer.status || 'N/D'}
                        </Badge>
                      </div>

                      {/* Mini KPIs */}
                      {!statsLoading && stats && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                        </div>
                      )}
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
