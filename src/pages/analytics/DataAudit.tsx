import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { AlertOctagon, CheckCircle, BarChart2, AlertTriangle, Shield } from 'lucide-react';

type AnyObject = { [k: string]: any };

export default function DataAudit(): JSX.Element {
  const { data: rawData } = useBIData<AnyObject[]>('auditoria_consolidada.json');
  const records = useMemo(() => Array.isArray(rawData) ? rawData : [], [rawData]);
  const [activeTab, setActiveTab] = useState<string>('Comercial');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const tabs = ['Comercial', 'Frota', 'Compras', 'Manutenção'];
  
  const filtered = useMemo(() => records.filter(r => r.Area === activeTab), [records, activeTab]);
  const paginated = useMemo(() => filtered.slice(page * pageSize, (page + 1) * pageSize), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const kpis = useMemo(() => {
    const total = records.length;
    const alta = records.filter(r => r.Gravidade === 'Alta').length;
    const media = records.filter(r => r.Gravidade === 'Média').length;
    const score = total > 0 ? Math.max(0, 100 - (alta * 5) - (media * 1)) : 100; // Score fictício de qualidade
    return { total, alta, media, score };
  }, [records]);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Monitoramento de Qualidade de Dados</Title><Text className="text-slate-500">Auditoria contínua da base de dados.</Text></div>
        <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full flex gap-2 font-medium"><Shield className="w-4 h-4"/> Governança</div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card decoration="top" decorationColor="rose">
            <div className="flex items-center gap-2 mb-2"><AlertOctagon className="w-5 h-5 text-rose-600"/><Text>Erros Críticos (Alta)</Text></div>
            <Metric className="text-rose-600">{kpis.alta}</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-amber-600"/><Text>Alertas (Média)</Text></div>
            <Metric className="text-amber-600">{kpis.media}</Metric>
        </Card>
        <Card decoration="top" decorationColor={kpis.score >= 90 ? 'emerald' : 'blue'}>
            <div className="flex items-center gap-2 mb-2"><BarChart2 className="w-5 h-5 text-blue-600"/><Text>Score de Qualidade</Text></div>
            <Metric>{kpis.score}%</Metric>
        </Card>
      </div>

      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
        {tabs.map(t => {
            const count = records.filter(r => r.Area === t).length;
            return (
                <button 
                    key={t} 
                    onClick={() => { setActiveTab(t); setPage(0); }} 
                    className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === t ? 'bg-white shadow text-rose-600' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    {t} ({count})
                </button>
            );
        })}
      </div>

      <Card>
        <Title className="mb-4">Inconsistências: {activeTab}</Title>
        {filtered.length > 0 ? (
            <>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                        <tr><th className="p-3">Placa</th><th className="p-3">Modelo</th><th className="p-3">Erro Detectado</th><th className="p-3">Gravidade</th><th className="p-3">Ação Recomendada</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {paginated.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-bold text-slate-800">{r.Placa}</td>
                                <td className="p-3 text-slate-600">{r.Modelo}</td>
                                <td className="p-3 font-medium text-rose-700">{r.Erro}</td>
                                <td className="p-3"><span className={`px-2 py-1 rounded text-xs text-white font-bold ${r.Gravidade === 'Alta' ? 'bg-rose-500' : 'bg-amber-500'}`}>{r.Gravidade}</span></td>
                                <td className="p-3 text-blue-600 underline cursor-pointer">{r.Recomendacao}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex justify-between mt-4 border-t pt-4">
                    <Text className="text-sm">Página {page + 1} de {totalPages}</Text>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">←</button>
                        <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">→</button>
                    </div>
                </div>
            </>
        ) : (
            <div className="text-center py-12 text-emerald-600 flex flex-col items-center">
                <CheckCircle size={48} className="mb-4 opacity-50"/>
                <Title className="text-emerald-700">Tudo limpo!</Title>
                <Text>Nenhuma inconsistência encontrada nesta área.</Text>
            </div>
        )}
      </Card>
    </div>
  );
}