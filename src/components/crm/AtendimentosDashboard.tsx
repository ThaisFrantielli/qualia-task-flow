// src/components/crm/AtendimentosDashboard.tsx
import React from 'react';
import type { Database } from '@/types/supabase';
type Atendimento = Database['public']['Tables']['atendimentos']['Row'];

interface AtendimentosDashboardProps {
  atendimentos: Atendimento[];
}

const getSlaStatus = (created_at: string, resolved_at: string | null) => {
  const created = new Date(created_at);
  const resolved = resolved_at ? new Date(resolved_at) : new Date();
  const diff = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  if (diff <= 2) return 'ok';
  if (diff <= 5) return 'warning';
  return 'late';
};

const AtendimentosDashboard: React.FC<AtendimentosDashboardProps> = ({ atendimentos }) => {
  const total = atendimentos.length;
  const abertos = atendimentos.filter(a => a.status !== 'Resolvido').length;
  const resolvidos = atendimentos.filter(a => a.status === 'Resolvido').length;
  const atrasados = atendimentos.filter(a => getSlaStatus(a.created_at, a.resolved_at) === 'late' && a.status !== 'Resolvido').length;
  const tempoMedio = (() => {
    const resolvidosArr = atendimentos.filter(a => a.status === 'Resolvido' && a.resolved_at);
    if (!resolvidosArr.length) return '-';
    const totalDias = resolvidosArr.reduce((acc, a) => acc + ((new Date(a.resolved_at!).getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24)), 0);
    return (totalDias / resolvidosArr.length).toFixed(1) + ' dias';
  })();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
        <span className="text-2xl font-bold">{total}</span>
        <span className="text-muted-foreground text-sm">Total</span>
      </div>
      <div className="bg-blue-50 rounded-lg shadow p-4 flex flex-col items-center">
        <span className="text-2xl font-bold text-blue-700">{abertos}</span>
        <span className="text-blue-700 text-sm">Em Aberto</span>
      </div>
      <div className="bg-green-50 rounded-lg shadow p-4 flex flex-col items-center">
        <span className="text-2xl font-bold text-green-700">{resolvidos}</span>
        <span className="text-green-700 text-sm">Resolvidos</span>
      </div>
      <div className="bg-red-50 rounded-lg shadow p-4 flex flex-col items-center">
        <span className="text-2xl font-bold text-red-700">{atrasados}</span>
        <span className="text-red-700 text-sm">Atrasados</span>
      </div>
      <div className="col-span-2 md:col-span-4 bg-gray-50 rounded-lg shadow p-4 flex flex-col items-center">
        <span className="text-lg font-semibold">Tempo médio de resolução</span>
        <span className="text-2xl font-bold">{tempoMedio}</span>
      </div>
    </div>
  );
};

export default AtendimentosDashboard;
