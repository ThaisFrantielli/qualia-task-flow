import { useAttachments } from '@/hooks/useAttachments';
import { useCustomerActivities } from '@/hooks/useCustomerActivities';
import React, { useState } from 'react';
import CustomerList from '@/components/customer-management/CustomerList';
import CustomerDetail from '@/components/customer-management/CustomerDetail';
import CustomerActionsPanel from '@/components/customer-management/CustomerActionsPanel';
import { useCustomers } from '@/hooks/useCustomers';



function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map((n) => n[0].toUpperCase()).slice(0, 2).join('');
}

const CustomerManagementPage: React.FC = () => {
  const { customers, loading, error } = useCustomers();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<string>('Atividades');
  const [search, setSearch] = useState('');

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

  // Exemplo de integração de ação rápida
  const handleCreateActivity = (data: any) => {
    alert('Atividade criada! (mock)');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Barra superior */}
      <header className="bg-white shadow flex items-center px-8 py-4 justify-between">
        <h1 className="text-2xl font-bold text-blue-900">Gerenciamento de Clientes Pós-Venda</h1>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-1 text-sm focus:outline-none focus:ring"
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition">Novo Cliente</button>
          <span className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-blue-900 font-bold">T</span>
        </div>
      </header>
      <main className="flex-1 grid grid-cols-12 gap-6 px-8 py-6">
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
            onEdit={() => alert('Editar cliente (mock)')}
            onCreateAtendimento={() => alert('Criar atendimento (mock)')}
            status={selected.status || 'Sem status'}
            step={selected.status === 'Em Análise' ? 1 : selected.status === 'Resolvido' ? 2 : selected.status === 'Solicitação' ? 3 : 1}
            activities={activities}
            tab={tab}
            onTabChange={setTab}
          />
        )}
        <CustomerActionsPanel onCreate={handleCreateActivity} />
      </main>
    </div>
  );
};

export default CustomerManagementPage;
