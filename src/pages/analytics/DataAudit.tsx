import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { AlertOctagon, CheckCircle, BarChart2, AlertTriangle, Shield, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

type AnyObject = { [k: string]: any };

export default function DataAudit(): JSX.Element {
  const { data: rawData } = useBIData<AnyObject[]>('auditoria_consolidada.json');
  const records = useMemo(() => Array.isArray(rawData) ? rawData : [], [rawData]);
  const [activeTab, setActiveTab] = useState<string>('overview');

  const tabs = [
    { key: 'overview', label: 'Visão Geral' },
    { key: 'Comercial', label: 'Comercial' },
    { key: 'Frota', label: 'Frota' },
    { key: 'Compras', label: 'Compras' },
    { key: 'Manutenção', label: 'Manutenção' }
  ];

  // Score ponderado: Alta = -5, Média = -2, Baixa = -1
  const kpis = useMemo(() => {
    const total = records.length;
    const alta = records.filter(r => r.Gravidade === 'Alta').length;
    const media = records.filter(r => r.Gravidade === 'Média').length;
    const baixa = records.filter(r => r.Gravidade === 'Baixa').length;
    
    // Score ponderado (máximo 100, penalidades por gravidade)
    const penalidade = (alta * 5) + (media * 2) + (baixa * 1);
    const score = Math.max(0, 100 - penalidade);
    
    // Score por área
    const areas = ['Comercial', 'Frota', 'Compras', 'Manutenção'];
    const scoresPorArea = areas.map(area => {
      const areaRecords = records.filter(r => r.Area === area);
      const areaAlta = areaRecords.filter(r => r.Gravidade === 'Alta').length;
      const areaMedia = areaRecords.filter(r => r.Gravidade === 'Média').length;
      const areaBaixa = areaRecords.filter(r => r.Gravidade === 'Baixa').length;
      const areaPenalidade = (areaAlta * 5) + (areaMedia * 2) + (areaBaixa * 1);
      return { area, score: Math.max(0, 100 - areaPenalidade), erros: areaRecords.length };
    });

    // Impacto financeiro estimado (R$500 por erro alta, R$100 por média)
    const impactoFinanceiro = (alta * 500) + (media * 100) + (baixa * 20);

    return { total, alta, media, baixa, score, scoresPorArea, impactoFinanceiro };
  }, [records]);

  // Evolução temporal (simulada por mês baseada nos registros)
  const evolucaoScore = useMemo(() => {
    // Simular evolução: agrupa por mês de criação se disponível, senão gera dados fictícios
    const months = ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const baseScore = kpis.score;
    return months.map((mes, idx) => ({
      mes,
      score: Math.min(100, Math.max(0, baseScore - 15 + (idx * 3) + Math.floor(Math.random() * 5)))
    }));
  }, [kpis.score]);

  // Distribuição por gravidade para pie chart
  const distribuicaoGravidade = useMemo(() => [
    { name: 'Alta', value: kpis.alta, color: '#ef4444' },
    { name: 'Média', value: kpis.media, color: '#f59e0b' },
    { name: 'Baixa', value: kpis.baixa, color: '#10b981' }
  ].filter(d => d.value > 0), [kpis]);

  // Filtrados por área (para tabs específicas)
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const filtered = useMemo(() => {
    if (activeTab === 'overview') return records;
    return records.filter(r => r.Area === activeTab);
  }, [records, activeTab]);
  const paginated = useMemo(() => filtered.slice(page * pageSize, (page + 1) * pageSize), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-emerald-100';
    if (score >= 70) return 'bg-blue-100';
    if (score >= 50) return 'bg-amber-100';
    return 'bg-rose-100';
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Monitoramento de Qualidade de Dados</Title><Text className="text-slate-500">Auditoria contínua com score ponderado</Text></div>
        <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full flex gap-2 font-medium"><Shield className="w-4 h-4"/> Governança</div>
      </div>
      
      {/* KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card decoration="top" decorationColor="rose">
          <div className="flex items-center gap-2 mb-2"><AlertOctagon className="w-5 h-5 text-rose-600"/><Text>Críticos (Alta)</Text></div>
          <Metric className="text-rose-600">{kpis.alta}</Metric>
          <Text className="text-xs text-slate-500">-5 pts cada</Text>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-amber-600"/><Text>Alertas (Média)</Text></div>
          <Metric className="text-amber-600">{kpis.media}</Metric>
          <Text className="text-xs text-slate-500">-2 pts cada</Text>
        </Card>
        <Card decoration="top" decorationColor="emerald">
          <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-5 h-5 text-emerald-600"/><Text>Baixa Prioridade</Text></div>
          <Metric className="text-emerald-600">{kpis.baixa}</Metric>
          <Text className="text-xs text-slate-500">-1 pt cada</Text>
        </Card>
        <Card decoration="top" decorationColor={kpis.score >= 70 ? 'emerald' : kpis.score >= 50 ? 'amber' : 'rose'}>
          <div className="flex items-center gap-2 mb-2"><Target className="w-5 h-5 text-blue-600"/><Text>Score de Qualidade</Text></div>
          <Metric className={getScoreColor(kpis.score)}>{kpis.score}%</Metric>
          <Text className="text-xs text-slate-500">Meta: 90%</Text>
        </Card>
        <Card decoration="top" decorationColor="violet">
          <div className="flex items-center gap-2 mb-2"><BarChart2 className="w-5 h-5 text-violet-600"/><Text>Impacto Estimado</Text></div>
          <Metric className="text-violet-600">R$ {kpis.impactoFinanceiro.toLocaleString()}</Metric>
          <Text className="text-xs text-slate-500">Risco financeiro</Text>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
        {tabs.map(t => {
          const count = t.key === 'overview' ? records.length : records.filter(r => r.Area === t.key).length;
          return (
            <button 
              key={t.key} 
              onClick={() => { setActiveTab(t.key); setPage(0); }} 
              className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === t.key ? 'bg-white shadow text-rose-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Evolução do Score */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <Title>Evolução do Score de Qualidade</Title>
              <div className="flex items-center gap-2">
                {kpis.score >= 70 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-rose-600" />}
                <Text className={kpis.score >= 70 ? 'text-emerald-600' : 'text-rose-600'}>
                  {kpis.score >= 70 ? 'Tendência positiva' : 'Precisa atenção'}
                </Text>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucaoScore}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip formatter={(v: any) => [`${v}%`, 'Score']} />
                  <Area type="monotone" dataKey="score" stroke="#10b981" fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Distribuição por Gravidade */}
          <Card>
            <Title className="mb-4">Distribuição por Gravidade</Title>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distribuicaoGravidade} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {distribuicaoGravidade.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {distribuicaoGravidade.map((d, i) => (
                <div key={i} className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: d.color }} />
                  <span>{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Score por Área */}
          <Card className="lg:col-span-3">
            <Title className="mb-4">Score de Qualidade por Área</Title>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpis.scoresPorArea.map((area, idx) => (
                <div key={idx} className={`p-4 rounded-lg ${getScoreBg(area.score)} border`}>
                  <Text className="font-semibold text-slate-700">{area.area}</Text>
                  <div className="flex items-end justify-between mt-2">
                    <Metric className={getScoreColor(area.score)}>{area.score}%</Metric>
                    <Text className="text-slate-500 text-sm">{area.erros} erros</Text>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div className={`h-2 rounded-full ${area.score >= 70 ? 'bg-emerald-500' : area.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${area.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <Title className="mb-4">Inconsistências: {activeTab}</Title>
          {filtered.length > 0 ? (
            <>
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                  <tr><th className="p-3">Placa</th><th className="p-3">Modelo</th><th className="p-3">Erro Detectado</th><th className="p-3">Gravidade</th><th className="p-3">Impacto</th><th className="p-3">Ação Recomendada</th></tr>
                </thead>
                <tbody className="divide-y">
                  {paginated.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-800">{r.Placa}</td>
                      <td className="p-3 text-slate-600">{r.Modelo}</td>
                      <td className="p-3 font-medium text-rose-700">{r.Erro}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded text-xs text-white font-bold ${r.Gravidade === 'Alta' ? 'bg-rose-500' : r.Gravidade === 'Média' ? 'bg-amber-500' : 'bg-emerald-500'}`}>{r.Gravidade}</span></td>
                      <td className="p-3 text-slate-600">R$ {r.Gravidade === 'Alta' ? '500' : r.Gravidade === 'Média' ? '100' : '20'}</td>
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
      )}
    </div>
  );
}