import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users } from 'lucide-react';

export interface Customer {
  id: number;
  name: string;
  status: string;
  responsible: string;
  initials: string;
}

interface CustomerListProps {
  customers: Customer[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Resolvido':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Em Análise':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Solicitação':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const CustomerList: React.FC<CustomerListProps> = ({ customers, selectedId, onSelect }) => (
  <div className="bg-card rounded-lg border h-full flex flex-col">
    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Clientes</h2>
        <Badge variant="secondary" className="ml-2">{customers.length}</Badge>
      </div>
    </div>

    {/* Customer List */}
    <div className="flex-1 overflow-y-auto">
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-sm font-medium text-foreground mb-2">Nenhum cliente encontrado</h3>
          <p className="text-xs text-muted-foreground">Tente ajustar sua busca</p>
        </div>
      ) : (
        <div className="divide-y">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className={`p-4 cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
                selectedId === customer.id 
                  ? 'bg-primary/5 border-r-4 border-r-primary' 
                  : ''
              }`}
              onClick={() => onSelect(customer.id)}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {customer.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm text-foreground truncate">
                      {customer.name}
                    </p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs mb-2 ${getStatusColor(customer.status)}`}
                  >
                    {customer.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground truncate">
                    {customer.responsible}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default CustomerList;
