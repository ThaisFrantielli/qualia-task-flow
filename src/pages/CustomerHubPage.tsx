// src/pages/CustomerHubPage.tsx (VERSÃO COM LAYOUT FLEX CORRIGIDO PARA SCROLL)

import React, { useState, useEffect } from 'react';
import { useClientes } from '@/hooks/useClientes';
import CustomerList, { CustomerDisplayInfo } from '@/components/customer-management/CustomerList';
import CustomerDetail from '@/components/customer-management/CustomerDetail';
import ClienteFormModal from '@/components/customer-management/ClienteFormModal';
import { Button } from '@/components/ui/button';
import { Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { ClienteComContatos } from '@/types';

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map((n) => n[0].toUpperCase()).slice(0, 2).join('');
}

const CustomerHubPage: React.FC = () => {
  const { clientes, loading, error, refetch } = useClientes(); 
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clienteToEdit, setClienteToEdit] = useState<ClienteComContatos | null>(null);

  const filteredClientes = clientes.filter(c =>
    (c.razao_social || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.nome_fantasia || '').toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selectedId && filteredClientes.length > 0) setSelectedId(filteredClientes[0].id);
    if (selectedId && !filteredClientes.some(c => c.id === selectedId)) setSelectedId(filteredClientes.length > 0 ? filteredClientes[0].id : null);
  }, [filteredClientes, selectedId]);

  const selectedCliente = filteredClientes.find(c => c.id === selectedId) || null;
  
  const handleOpenNewModal = () => { setClienteToEdit(null); setIsModalOpen(true); };
  const handleOpenEditModal = () => { if (selectedCliente) { setClienteToEdit(selectedCliente); setIsModalOpen(true); } };
  const handleDelete = async () => { if (selectedCliente) { if (window.confirm(`Excluir "${selectedCliente.razao_social}"?`)) { toast.error("Exclusão não implementada."); } } };

  const customersForList: CustomerDisplayInfo[] = filteredClientes.map(c => ({
    id: c.id,
    name: c.nome_fantasia || c.razao_social || 'Sem Nome',
    status: c.situacao || 'Ativo',
    primaryContact: c.cliente_contatos?.[0]?.nome_contato || 'Sem contato',
    initials: getInitials(c.nome_fantasia || c.razao_social),
  }));

  return (
    <>
      {/* --- AJUSTE DE LAYOUT 1: Container principal agora é flex e ocupa toda a altura --- */}
      <div className="h-full bg-background flex flex-col"> 
        <div className="border-b bg-card">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-foreground">Hub de Clientes</h1>
                <p className="text-muted-foreground mt-2">Visualize e gerencie sua base de clientes centralizada.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" placeholder="Buscar por nome ou fantasia..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 pr-4 py-2 w-80 border rounded-lg text-sm" />
                </div>
                <Button onClick={handleOpenNewModal}><Plus className="h-4 w-4 mr-2" /> Novo Cliente</Button>
              </div>
            </div>
          </div>
        </div>

        {/* --- AJUSTE DE LAYOUT 2: Este container vai esticar para preencher o espaço restante --- */}
        <div className="px-8 py-6 flex-1 min-h-0">
          <div className="grid grid-cols-12 gap-8 h-full">
            {/* As colunas agora ocuparão 100% da altura deste container pai */}
            <div className="col-span-4 h-full">
              {loading ? <div className="p-4 text-center">Carregando...</div> : 
               error ? <div className="p-4 text-red-500">Erro: {error.message}</div> :
              <CustomerList customers={customersForList} selectedId={selectedId} onSelect={setSelectedId} />}
            </div>
            
            <div className="col-span-8 h-full">
              {selectedCliente ? (
                <CustomerDetail customer={selectedCliente} onEdit={handleOpenEditModal} onDelete={handleDelete} />
              ) : (
                <div className="bg-card rounded-lg border h-full flex items-center justify-center">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">{loading ? 'Carregando...' : 'Nenhum cliente para exibir'}</h3>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ClienteFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={refetch} cliente={clienteToEdit} />
    </>
  );
};

export default CustomerHubPage;