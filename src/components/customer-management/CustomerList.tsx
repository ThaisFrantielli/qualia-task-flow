// src/components/customer-management/CustomerList.tsx (VERSÃO COM LAYOUT FLEX PARA SCROLL)

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users } from 'lucide-react';

export interface CustomerDisplayInfo {
  id: string;
  name: string;
  status: string;
  primaryContact: string;
  initials: string;
}

interface CustomerListProps {
  customers: CustomerDisplayInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const getStatusColor = (status: string) => {
  if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
  switch (status.toLowerCase()) {
    case 'ativo':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'inativo':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const CustomerList: React.FC<CustomerListProps> = ({ customers, selectedId, onSelect }) => (
  // --- AJUSTE DE LAYOUT: O card inteiro agora é um container flexível vertical ---
  <div className="bg-card rounded-lg border h-full flex flex-col">
    <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Clientes</h2>
        <Badge variant="secondary" className="ml-2">{customers.length}</Badge>
      </div>
    </div>
    {/* --- AJUSTE DE LAYOUT: Este div vai crescer e rolar o conteúdo interno --- */}
    <div className="flex-1 overflow-y-auto">
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-sm font-medium text-foreground mb-2">Nenhum cliente encontrado</h3>
        </div>
      ) : (
        <div className="divide-y">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className={`p-4 cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
                selectedId === customer.id ? 'bg-primary/5 border-r-4 border-r-primary' : ''
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
                  <p className="font-medium text-sm text-foreground truncate mb-1">
                    {customer.name}
                  </p>
                  <Badge variant="outline" className={`text-xs ${getStatusColor(customer.status)}`}>
                    {customer.status || 'Não definido'}
                  </Badge>
                  <p className="text-xs text-muted-foreground truncate mt-1.5">
                    Contato: {customer.primaryContact}
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