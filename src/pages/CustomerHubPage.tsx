// src/pages/CustomerHubPage.tsx (VERSÃO FINAL E CORRETA)

import React, { useState, useEffect } from 'react';
import { useClientes } from '@/hooks/useClientes'; // Hook correto que busca de 'clientes'
import CustomerList, { CustomerDisplayInfo } from '@/components/customer-management/CustomerList';
import CustomerDetail from '@/components/customer-management/CustomerDetail';
import { Button } from '@/components/ui/button';
import { Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

// Função auxiliar
function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map((n) => n[0].toUpperCase()).slice(0, 2).join('');
}

const CustomerHubPage: React.FC = () => {
  const { clientes, loading, error } = useClientes(); 
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredClientes = clientes.filter(c =>
    (c.razao_social || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.nome_fantasia || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.cpf_cnpj || '').toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selectedId && filteredClientes.length > 0) {
      setSelectedId(filteredClientes[0].id);
    }
    if (selectedId && !filteredClientes.some(c => c.id === selectedId)) {
        setSelectedId(filteredClientes.length > 0 ? filteredClientes[0].id : null);
    }
  }, [filteredClientes, selectedId]);

  const selectedCliente = filteredClientes.find((c) => c.id === selectedId) || null;
  
  const handleEdit = () => {
    if (selectedCliente) toast.info("Formulário de edição para clientes a ser implementado.");
  };
  
  const handleDelete = async () => {
    if (selectedCliente) toast.error("Funcionalidade de exclusão de cliente ainda não implementada.");
  };

  const customersForList: CustomerDisplayInfo[] = filteredClientes.map(c => ({
    id: c.id,
    name: c.nome_fantasia || c.razao_social || 'Sem Nome',
    status: c.situacao || 'Ativo',
    primaryContact: c.cliente_contatos?.[0]?.nome_contato || 'Sem contato',
    initials: getInitials(c.nome_fantasia || c.razao_social),
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Hub de Clientes</h1>
              <p className="text-muted-foreground mt-2">Visualize e gerencie sua base de clientes centralizada.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por nome, fantasia ou CNPJ..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <Button onClick={() => toast.info("Formulário de novo cliente a ser implementado.")}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="grid grid-cols-12 gap-8 h-[calc(100vh-200px)]">
          <div className="col-span-4">
            {loading ? <div className="p-4 text-center text-muted-foreground">Carregando clientes...</div> : 
             error ? <div className="p-4 text-red-500">Erro ao carregar: {error.message}</div> :
            <CustomerList customers={customersForList} selectedId={selectedId} onSelect={setSelectedId} />}
          </div>
          
          <div className="col-span-8">
            {selectedCliente ? (
              <CustomerDetail customer={selectedCliente} onEdit={handleEdit} onDelete={handleDelete} />
            ) : (
              <div className="bg-card rounded-lg border h-full flex items-center justify-center">
                <div className="text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {loading ? 'Carregando...' : (clientes.length > 0 ? 'Selecione um cliente' : 'Nenhum cliente cadastrado')}
                  </h3>
                  <p className="text-muted-foreground">
                    {loading ? 'Aguarde um momento.' : (clientes.length > 0 ? 'Escolha um cliente da lista para ver os detalhes.' : 'Cadastre um novo cliente para começar.')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerHubPage;