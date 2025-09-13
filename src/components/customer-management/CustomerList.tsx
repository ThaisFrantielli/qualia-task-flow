import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Plus, Users } from 'lucide-react';

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
  <div className="col-span-3 space-y-6">
    {/* Header */}
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Clientes</h2>
        </div>
        <Badge variant="secondary">{customers.length}</Badge>
      </div>
      
      {/* Search would go here */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Buscar cliente..." 
          className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>
    </div>

    {/* Customer List */}
    <div className="bg-card rounded-lg border">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Lista de Clientes</span>
          <button className="text-primary hover:text-primary/80 p-1">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="divide-y max-h-96 overflow-y-auto">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
              selectedId === customer.id ? 'bg-primary/5 border-r-2 border-r-primary' : ''
            }`}
            onClick={() => onSelect(customer.id)}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {customer.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{customer.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={getStatusColor(customer.status)}>
                    {customer.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {customer.responsible}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default CustomerList;
