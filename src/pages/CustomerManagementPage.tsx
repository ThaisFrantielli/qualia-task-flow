import React, { useState } from 'react';
import CustomerList from '@/components/customer-management/CustomerList';
import CustomerDetail from '@/components/customer-management/CustomerDetail';
import CustomerEditForm from '@/components/customer-management/CustomerEditForm';
import { useCustomers } from '@/hooks/useCustomers';
import { useAttachments } from '@/hooks/useAttachments';
import { useCustomerActivities } from '@/hooks/useCustomerActivities';
import { Button } from '@/components/ui/button';
import { Plus, Search, Users } from 'lucide-react';

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map((n) => n[0].toUpperCase()).slice(0, 2).join('');
}

const CustomerManagementPage: React.FC = () => {
  const { customers } = useCustomers();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<string>('Atividades');
  const [search, setSearch] = useState('');
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  // Filtro de busca simples
  const filtered = customers.filter(c =>
    (c.client_name || '').toLowerCase().includes(search.toLowerCase())
  );

  // Seleciona o primeiro cliente ao carregar
  React.useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = filtered.find((c) => c.id === selectedId) || null;

  // Hooks para dados do cliente selecionado
  const idStr = selectedId ? String(selectedId) : '';
  const { attachments } = useAttachments(idStr);
  const { activities } = useCustomerActivities(idStr);

  const handleEditCustomer = () => {
    setIsEditFormOpen(true);
  };

  const handleSaveCustomer = () => {
    // Refresh data would happen here
    setIsEditFormOpen(false);
  };

  const handleCreateCustomer = () => {
    // Implementation for creating new customer
    console.log('Create new customer');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Clean Header */}
      <div className="border-b bg-card">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Gerenciamento de Clientes</h1>
              <p className="text-muted-foreground mt-2">Visualize, edite e gerencie informações de clientes</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <Button onClick={handleCreateCustomer} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-12 gap-8 h-[calc(100vh-200px)]">
          {/* Customer List - Left Sidebar */}
          <div className="col-span-4">
            <CustomerList
              customers={filtered.map(c => ({
                id: c.id,
                name: c.client_name || 'Sem nome',
                status: c.status || 'Sem status',
                responsible: c.assignee_id || 'Sem responsável',
                initials: getInitials(c.client_name),
              }))}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          
          {/* Customer Details - Center */}
          <div className="col-span-8">
            {selected ? (
              <CustomerDetail
                name={selected.client_name || 'Sem nome'}
                cnpj={selected.client_email || ''}
                phone={selected.client_phone || ''}
                email={selected.client_email || ''}
                department={selected.department}
                responsible={selected.assignee_id}
                createdAt={selected.created_at}
                updatedAt={selected.updated_at}
                motivo={selected.reason}
                origem={selected.lead_source}
                resumo={selected.summary}
                anexos={attachments.map(a => ({ filename: a.filename, url: a.file_path }))}
                resolucao={selected.resolution_details}
                onEdit={handleEditCustomer}
                onCreateAtendimento={() => alert('Criar atendimento (mock)')}
                status={selected.status || 'Sem status'}
                step={selected.status === 'Em Análise' ? 1 : selected.status === 'Resolvido' ? 2 : selected.status === 'Solicitação' ? 3 : 1}
                activities={activities}
                tab={tab}
                onTabChange={setTab}
              />
            ) : (
              <div className="bg-card rounded-lg border h-full flex items-center justify-center">
                <div className="text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Selecione um cliente</h3>
                  <p className="text-muted-foreground">Escolha um cliente da lista para ver os detalhes</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      {selected && (
        <CustomerEditForm
          isOpen={isEditFormOpen}
          onClose={() => setIsEditFormOpen(false)}
          customer={selected}
          onSave={handleSaveCustomer}
        />
      )}
    </div>
  );
};

export default CustomerManagementPage;