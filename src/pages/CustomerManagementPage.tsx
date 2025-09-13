import React, { useState } from 'react';
import CustomerList from '@/components/customer-management/CustomerList';
import CustomerDetail from '@/components/customer-management/CustomerDetail';
import CustomerActionsPanel from '@/components/customer-management/CustomerActionsPanel';
import CustomerEditForm from '@/components/customer-management/CustomerEditForm';
import { useCustomers } from '@/hooks/useCustomers';
import { useAttachments } from '@/hooks/useAttachments';
import { useCustomerActivities } from '@/hooks/useCustomerActivities';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, TrendingUp, Clock } from 'lucide-react';

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

  // Métricas do dashboard
  const totalCustomers = customers.length;
  const resolvedCustomers = customers.filter(c => c.status === 'Resolvido').length;
  const pendingCustomers = customers.filter(c => c.status === 'Em Análise').length;
  const newCustomers = customers.filter(c => c.status === 'Solicitação').length;

  const handleEditCustomer = () => {
    setIsEditFormOpen(true);
  };

  const handleSaveCustomer = () => {
    // Refresh data would happen here
    setIsEditFormOpen(false);
  };

  const handleCreateActivity = () => {
    // Implementation for creating activities
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center px-4 sm:px-8 py-6 gap-4 sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Clientes</h1>
            <p className="text-muted-foreground mt-1">Acompanhe e gerencie todos os seus clientes pós-venda</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-0 flex-1 sm:flex-none sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="px-4 sm:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Clientes
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <div className="px-6 pb-4">
              <div className="text-2xl font-bold">{totalCustomers}</div>
            </div>
          </Card>
          
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Resolvidos
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <div className="px-6 pb-4">
              <div className="text-2xl font-bold text-green-600">{resolvedCustomers}</div>
            </div>
          </Card>
          
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Análise
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <div className="px-6 pb-4">
              <div className="text-2xl font-bold text-yellow-600">{pendingCustomers}</div>
            </div>
          </Card>
          
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Novas Solicitações
              </CardTitle>
              <Building2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <div className="px-6 pb-4">
              <div className="text-2xl font-bold text-blue-600">{newCustomers}</div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
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
          
          {selected && (
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
          )}
          
          <CustomerActionsPanel onCreate={handleCreateActivity} />
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