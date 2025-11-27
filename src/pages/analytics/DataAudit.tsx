import React, { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { AlertOctagon, AlertTriangle, BarChart2 } from 'lucide-react';

type AnyObject = { [k: string]: any };

function formatCurrency(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '-';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DataAudit(): JSX.Element {
  const { data } = useBIData<AnyObject[]>('auditoria_vendas.json');

  const records: AnyObject[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data as AnyObject[];
    if ((data as any).data && Array.isArray((data as any).data)) return (data as any).data;
    const keys = Object.keys(data as any);
    for (const k of keys) {
      if (Array.isArray((data as any)[k])) return (data as any)[k];
    }
    return [];
  }, [data]);

  // Pagination for table
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const pageItems = useMemo(() => {
    return records.slice((page - 1) * pageSize, page * pageSize);
  }, [records, page]);

  // Tabs (simple implementation)
  const tabs = [
    { key: 'vendas', label: 'Vendas & Comercial', count: 38 },
    { key: 'cadastro', label: 'Cadastro & Frota', count: 0 },
    { key: 'financeiro', label: 'Financeiro', count: 0 },
  ];
  const [activeTab, setActiveTab] = useState<string>('vendas');

  return (
    <div className="bg-slate-50 min-h-screen p-6">
      <div>
        <Title>Monitoramento de Qualidade de Dados</Title>
        <Text className="mt-1">Centro de controle para identificar e priorizar correções de dados.</Text>
      </div>

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-red-50">
              <AlertOctagon className="text-red-600" size={20} />
            </div>
            <div>
              <Text className="text-sm">Erros Críticos</Text>
              <Metric className="text-red-600">38</Metric>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-amber-50">
              <AlertTriangle className="text-amber-600" size={20} />
            </div>
            <div>
              <Text className="text-sm">Alertas de Cadastro</Text>
              <Metric className="text-amber-700">0</Metric>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-sky-50">
              <BarChart2 className="text-sky-600" size={20} />
            </div>
            <div>
              <Text className="text-sm">Score de Qualidade</Text>
              <Metric className="text-sky-600">98%</Metric>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <div className="flex gap-2 border-b pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setPage(1); }}
              className={`px-3 py-1 rounded-t ${activeTab === t.key ? 'bg-white shadow' : 'bg-transparent text-gray-600'}`}
            >
              {`${t.label} (${t.count})`}
            </button>
          ))}
        </div>

        <div>
          {activeTab === 'vendas' && (
            <Card className="mt-4">
              <Text className="mb-3">Registros com datas nulas / inconsistências (prioridade Alta)</Text>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th className="text-left p-2">Placa</th>
                      <th className="text-left p-2">Modelo</th>
                      <th className="text-left p-2">Gravidade</th>
                      <th className="text-left p-2">Erro</th>
                      <th className="text-left p-2">Ação Recomendada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((r, i) => (
                      <tr key={`audit-${i}`} className="border-t">
                        <td className="p-2">{r.Placa || <span className="inline-block bg-gray-200 text-gray-600 px-2 py-1 rounded">N/A</span>}</td>
                        <td className="p-2">{r.Modelo || '-'}</td>
                        <td className="p-2">
                          <span className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded">Alta</span>
                        </td>
                        <td className="p-2 text-sm text-gray-800">{r.Motivo || r.MensagemErro || r.MotivoErro || 'Inconsistência'}</td>
                        <td className="p-2 text-sm text-gray-500">{r.Recomendacao || 'Verificar Data de Saída no ERP'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, records.length)} de {records.length}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Anterior</button>
                  <Text>Página {page} / {Math.max(1, Math.ceil(records.length / pageSize))}</Text>
                  <button onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(records.length / pageSize)), p + 1))} disabled={page >= Math.max(1, Math.ceil(records.length / pageSize))} className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Próximo</button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'cadastro' && (
            <Card className="mt-4">
              <Text>Cadastro & Frota</Text>
              <Text className="mt-2 text-sm text-gray-500">Nenhum alerta por enquanto.</Text>
            </Card>
          )}

          {activeTab === 'financeiro' && (
            <Card className="mt-4">
              <Text>Financeiro</Text>
              <Text className="mt-2 text-sm text-gray-500">Nenhum alerta por enquanto.</Text>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
