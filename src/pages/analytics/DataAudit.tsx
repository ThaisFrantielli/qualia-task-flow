import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { AlertOctagon, AlertTriangle, BarChart2, Shield } from 'lucide-react';

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

  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));

  // Tabs
  const tabs = [
    { key: 'vendas', label: 'Vendas & Comercial', count: 38 },
    { key: 'cadastro', label: 'Cadastro & Frota', count: 0 },
    { key: 'financeiro', label: 'Financeiro', count: 0 },
  ];
  const [activeTab, setActiveTab] = useState<string>('vendas');

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title className="text-slate-900">Monitoramento de Qualidade de Dados</Title>
          <Text className="mt-1 text-slate-500">Centro de controle para identificar e priorizar correções de dados.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Hub Qualidade & Auditoria
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <AlertOctagon className="text-red-600" size={20} />
            </div>
            <div>
              <Text className="text-slate-500 text-sm">Erros Críticos</Text>
              <Metric className="text-red-600">38</Metric>
            </div>
          </div>
        </Card>

        <Card className="bg-white shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <AlertTriangle className="text-amber-600" size={20} />
            </div>
            <div>
              <Text className="text-slate-500 text-sm">Alertas de Cadastro</Text>
              <Metric className="text-amber-700">0</Metric>
            </div>
          </div>
        </Card>

        <Card className="bg-white shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <BarChart2 className="text-emerald-600" size={20} />
            </div>
            <div>
              <Text className="text-slate-500 text-sm">Score de Qualidade</Text>
              <Metric className="text-emerald-600">98%</Metric>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === t.key ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              {`${t.label} (${t.count})`}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {activeTab === 'vendas' && (
            <Card className="bg-white shadow-sm border border-slate-200">
              <Title className="text-slate-900 mb-4">Registros com datas nulas / inconsistências (prioridade Alta)</Title>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Placa</th>
                      <th className="px-4 py-3 font-medium">Modelo</th>
                      <th className="px-4 py-3 font-medium">Gravidade</th>
                      <th className="px-4 py-3 font-medium">Erro</th>
                      <th className="px-4 py-3 font-medium">Ação Recomendada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageItems.map((r, i) => (
                      <tr key={`audit-${i}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {r.Placa || <span className="inline-block bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs">N/A</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.Modelo || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                            Alta
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {r.Motivo || r.MensagemErro || r.MotivoErro || 'Inconsistência'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {r.Recomendacao || 'Verificar Data de Saída no ERP'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-slate-500">
                  Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, records.length)} de {records.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors"
                  >
                    Anterior
                  </button>
                  <Text className="text-slate-600">Página {page} / {totalPages}</Text>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'cadastro' && (
            <Card className="bg-white shadow-sm border border-slate-200">
              <Title className="text-slate-900">Cadastro & Frota</Title>
              <div className="mt-4 p-6 rounded-lg bg-slate-50 border border-slate-100 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
                  <BarChart2 className="text-emerald-600" size={24} />
                </div>
                <Text className="text-slate-600">Nenhum alerta por enquanto.</Text>
                <Text className="text-xs text-slate-400 mt-1">Todos os registros estão em conformidade.</Text>
              </div>
            </Card>
          )}

          {activeTab === 'financeiro' && (
            <Card className="bg-white shadow-sm border border-slate-200">
              <Title className="text-slate-900">Financeiro</Title>
              <div className="mt-4 p-6 rounded-lg bg-slate-50 border border-slate-100 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
                  <BarChart2 className="text-emerald-600" size={24} />
                </div>
                <Text className="text-slate-600">Nenhum alerta por enquanto.</Text>
                <Text className="text-xs text-slate-400 mt-1">Todos os registros estão em conformidade.</Text>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
