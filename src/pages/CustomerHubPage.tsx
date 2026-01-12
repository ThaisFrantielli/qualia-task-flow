import React, { useState, useEffect } from 'react';
import { useClientes } from '@/hooks/useClientes';
import { CustomerListEnhanced, CustomerDisplayInfo } from '@/components/customer-management/CustomerListEnhanced';
import { CustomerDetailRedesign } from '@/components/customer-management/CustomerDetailRedesign';
import ClienteFormModal from '@/components/customer-management/ClienteFormModal';
import { SyncClientesButton } from '@/components/customer-management/SyncClientesButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Users, X, Filter } from 'lucide-react';
import { toast } from 'sonner';
import type { ClienteComContatos } from '@/types';
import { Badge } from '@/components/ui/badge';

function getInitials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

const CustomerHubPage: React.FC = () => {
  const { clientes, loading, error, refetch } = useClientes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clienteToEdit, setClienteToEdit] = useState<ClienteComContatos | null>(null);

  // Advanced search - searches across multiple fields
  const filteredClientes = clientes.filter((c) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      (c.razao_social || '').toLowerCase().includes(searchLower) ||
      (c.nome_fantasia || '').toLowerCase().includes(searchLower) ||
      (c.cpf_cnpj || '').toLowerCase().includes(searchLower) ||
      (c.telefone || '').toLowerCase().includes(searchLower) ||
      (c.email || '').toLowerCase().includes(searchLower) ||
      c.cliente_contatos?.some(
        (contato) =>
          (contato.nome_contato || '').toLowerCase().includes(searchLower) ||
          (contato.email_contato || '').toLowerCase().includes(searchLower) ||
          (contato.telefone_contato || '').toLowerCase().includes(searchLower)
      );

    const matchesStatus =
      statusFilter === 'all' ||
      (c.situacao || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    // Abrir modal automaticamente se query param ?new=1 estiver presente
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('new') === '1') {
        setClienteToEdit(null);
        setIsModalOpen(true);
        // remove query param
        const url = new URL(window.location.href);
        url.searchParams.delete('new');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      }

      // Abrir modal de edição se ?open=<id> estiver presente
      const openId = params.get('open');
      if (openId) {
        const found = clientes.find((c) => c.id === openId);
        if (found) {
          setClienteToEdit(found);
          setIsModalOpen(true);
        } else {
          // tentar refetch e depois abrir (caso a lista ainda não tenha sido carregada)
          refetch();
          const found2 = clientes.find((c) => c.id === openId);
          setClienteToEdit(found2 || null);
          setIsModalOpen(true);
        }
        // remove query param
        const url2 = new URL(window.location.href);
        url2.searchParams.delete('open');
        window.history.replaceState({}, '', url2.pathname + url2.search + url2.hash);
      }
    } catch {
      // ignore
    }
    if (!selectedId && filteredClientes.length > 0) {
      setSelectedId(filteredClientes[0].id);
    }
    if (selectedId && !filteredClientes.some((c) => c.id === selectedId)) {
      setSelectedId(filteredClientes.length > 0 ? filteredClientes[0].id : null);
    }
  }, [filteredClientes, selectedId]);

  const selectedCliente = filteredClientes.find((c) => c.id === selectedId) || null;

  const handleOpenNewModal = () => {
    setClienteToEdit(null);
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = () => {
    if (selectedCliente) {
      setClienteToEdit(selectedCliente);
      setIsModalOpen(true);
    }
  };
  
  const handleDelete = async () => {
    if (selectedCliente) {
      if (window.confirm(`Excluir "${selectedCliente.razao_social}"?`)) {
        toast.error('Exclusão não implementada.');
      }
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  const hasActiveFilters = search || statusFilter !== 'all';

  const customersForList: CustomerDisplayInfo[] = filteredClientes.map((c) => ({
    id: c.id,
    name: c.nome_fantasia || c.razao_social || 'Sem Nome',
    fantasia: c.nome_fantasia || undefined,
    status: c.situacao || 'Ativo',
    primaryContact: c.cliente_contatos?.[0]?.nome_contato || 'Sem contato',
    initials: getInitials(c.nome_fantasia || c.razao_social),
  }));

  return (
    <>
      <div className="h-full bg-background flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Hub de Clientes</h1>
              <p className="text-sm text-muted-foreground">
                Base de clientes centralizada
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SyncClientesButton onSyncComplete={refetch} />
              <Button onClick={handleOpenNewModal}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nome, CNPJ, telefone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}

            {hasActiveFilters && (
              <Badge variant="secondary">
                {filteredClientes.length} de {clientes.length}
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 p-6">
          <div className="grid grid-cols-12 gap-6 h-full">
            {/* List */}
            <div className="col-span-4 h-full">
              {loading ? (
                <div className="bg-card rounded-lg border h-full flex items-center justify-center">
                  <p className="text-muted-foreground">Carregando...</p>
                </div>
              ) : error ? (
                <div className="bg-card rounded-lg border h-full flex items-center justify-center">
                  <p className="text-destructive">Erro: {error.message}</p>
                </div>
              ) : (
                <CustomerListEnhanced
                  customers={customersForList}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
            </div>

            {/* Detail */}
            <div className="col-span-8 h-full">
              {selectedCliente ? (
                <CustomerDetailRedesign
                  customer={selectedCliente}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDelete}
                />
              ) : (
                <div className="bg-card rounded-lg border h-full flex items-center justify-center">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">
                      {loading ? 'Carregando...' : 'Nenhum cliente para exibir'}
                    </h3>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ClienteFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(id?: string) => {
          refetch();
          if (id) setSelectedId(id);
        }}
        cliente={clienteToEdit}
      />
    </>
  );
};

export default CustomerHubPage;
