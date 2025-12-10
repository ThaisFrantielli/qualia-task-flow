import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, DonutChart } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { AlertOctagon, Filter, X } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const s = String(v).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function fmtBRL(v: number): string {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
  catch (e) { return String(v); }
}

function fmtCompact(v: number): string {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return `R$ ${v}`;
}

function getMonthKey(dateString?: string): string {
  if (!dateString || typeof dateString !== 'string') return '';
  return dateString.split('T')[0].substring(0, 7);
}

function monthLabel(ym: string): string {
  if (!ym || ym.length < 7) return ym;
  const [y, m] = ym.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${months[Number(m) - 1]}/${String(y).slice(2)}`;
}

// --- COMPONENTE PRINCIPAL ---
export default function InfractionsDashboard(): JSX.Element {
  // *** USA: fat_multas_*.json ***
  const { data: multasData } = useBIData<AnyObject[]>('fat_multas_*.json');

  const multas = useMemo((): AnyObject[] => {
    const raw = (multasData as any)?.data || multasData;
    return Array.isArray(raw) ? raw : [];
  }, [multasData]);

  // *** ESTADO DE FILTROS INTERATIVOS (PowerBI Style) ***
  const [filterState, setFilterState] = useState<{
    mes: string | null;
    condutor: string | null;
    tipo: string | null;
  }>({
    mes: null,
    condutor: null,
    tipo: null
  });

  const hasActiveFilters = useMemo(() => {
    return !!(filterState.mes || filterState.condutor || filterState.tipo);
  }, [filterState]);

  const clearFilters = () => {
    setFilterState({ mes: null, condutor: null, tipo: null });
  };

  // *** DADOS FILTRADOS (Derivados do filterState) ***
  const filteredMultas = useMemo(() => {
    return multas.filter((r: AnyObject) => {
      if (filterState.mes && getMonthKey(r.DataInfracao || r.Data) !== filterState.mes) return false;
      if (filterState.condutor && r.Condutor !== filterState.condutor) return false;
      if (filterState.tipo && r.TipoInfracao !== filterState.tipo) return false;
      return true;
    });
  }, [multas, filterState]);

  // *** KPIs ***
  const kpis = useMemo(() => {
    const valorTotal = filteredMultas.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorMulta), 0);
    const qtdInfracoes = filteredMultas.length;
    const valorReembolsado = filteredMultas.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorReembolsado || 0), 0);
    const percReembolso = valorTotal > 0 ? (valorReembolsado / valorTotal) * 100 : 0;

    return { valorTotal, qtdInfracoes, valorReembolsado, percReembolso };
  }, [filteredMultas]);

  // === GRÁFICOS INTERATIVOS ===

  // 1. Evolução de Multas (Barras)
  const evolutionData = useMemo(() => {
    const map: Record<string, { Valor: number; Qtd: number }> = {};
    filteredMultas.forEach((r: AnyObject) => {
      const k = getMonthKey(r.DataInfracao || r.Data);
      if (!k) return;
      if (!map[k]) map[k] = { Valor: 0, Qtd: 0 };
      map[k].Valor += parseCurrency(r.ValorMulta);
      map[k].Qtd += 1;
    });
    return Object.keys(map).sort().map(k => ({
      date: k,
      label: monthLabel(k),
      ...map[k]
    }));
  }, [filteredMultas]);

  // 2. Top Infratores (Condutores)
  const topInfratores = useMemo(() => {
    const map: Record<string, number> = {};
    filteredMultas.forEach((r: AnyObject) => {
      const c = r.Condutor || 'Desconhecido';
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredMultas]);

  // 3. Tipos de Infração (Donut)
  const tiposData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredMultas.forEach((r: AnyObject) => {
      const t = r.TipoInfracao || 'Outros';
      map[t] = (map[t] || 0) + parseCurrency(r.ValorMulta);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredMultas]);

  // 4. Gravidade (se houver campo)
  const gravidadeData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredMultas.forEach((r: AnyObject) => {
      const g = r.Gravidade || 'Não Informada';
      map[g] = (map[g] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredMultas]);

  // === HANDLERS DE CLIQUE (Interatividade PowerBI) ===
  const handleMonthClick = (data: any) => {
    setFilterState(prev => ({ ...prev, mes: prev.mes === data.date ? null : data.date }));
  };

  const handleCondutorClick = (data: any) => {
    setFilterState(prev => ({ ...prev, condutor: prev.condutor === data.name ? null : data.name }));
  };

  const handleTipoClick = (data: any) => {
    setFilterState(prev => ({ ...prev, tipo: prev.tipo === data.name ? null : data.name }));
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">Infractions & Fines Dashboard</Title>
          <Text className="mt-1 text-slate-500">
            Análise de multas, infratores e tipos de infração. Clique nos gráficos para filtrar.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <AlertOctagon className="w-4 h-4" /> Hub Operacional
          </div>
        </div>
      </div>

      {/* Botão Limpar Filtros (Flutuante) */}
      {hasActiveFilters && (
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={clearFilters}
            className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105"
          >
            <X className="w-5 h-5" />
            Limpar Filtros
          </button>
        </div>
      )}

      {/* Filtros Ativos */}
      {hasActiveFilters && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-blue-600" />
            <Text className="font-medium text-blue-700">Filtros Ativos:</Text>
            {filterState.mes && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                Mês: <strong>{monthLabel(filterState.mes)}</strong>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterState(prev => ({ ...prev, mes: null }))} />
              </span>
            )}
            {filterState.condutor && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                Condutor: <strong>{filterState.condutor}</strong>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterState(prev => ({ ...prev, condutor: null }))} />
              </span>
            )}
            {filterState.tipo && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                Tipo: <strong>{filterState.tipo}</strong>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterState(prev => ({ ...prev, tipo: null }))} />
              </span>
            )}
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="rose" className="bg-white shadow-sm">
          <Text className="text-slate-500">Valor Multas</Text>
          <Metric className="text-slate-900">{fmtCompact(kpis.valorTotal)}</Metric>
          <Text className="text-xs text-slate-400 mt-1">{kpis.qtdInfracoes} infrações</Text>
        </Card>
        <Card decoration="top" decorationColor="emerald" className="bg-white shadow-sm">
          <Text className="text-slate-500">Valor Reembolsado</Text>
          <Metric className="text-slate-900">{fmtCompact(kpis.valorReembolsado)}</Metric>
          <Text className="text-xs text-slate-400 mt-1">{kpis.percReembolso.toFixed(1)}% do total</Text>
        </Card>
        <Card decoration="top" decorationColor="amber" className="bg-white shadow-sm">
          <Text className="text-slate-500">Qtd Infrações</Text>
          <Metric className="text-slate-900">{kpis.qtdInfracoes}</Metric>
        </Card>
        <Card decoration="top" decorationColor="blue" className="bg-white shadow-sm">
          <Text className="text-slate-500">Ticket Médio</Text>
          <Metric className="text-slate-900">
            {fmtBRL(kpis.qtdInfracoes > 0 ? kpis.valorTotal / kpis.qtdInfracoes : 0)}
          </Metric>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolução de Multas */}
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <Title className="text-slate-900">Evolução de Multas</Title>
          <Text className="text-slate-500 text-sm mb-4">
            {filterState.mes ? `Filtrado: ${monthLabel(filterState.mes)}` : 'Clique nas barras para filtrar'}
          </Text>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtCompact} stroke="#64748b" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'Valor') return fmtBRL(value);
                    return value;
                  }}
                />
                <Bar dataKey="Valor" fill="#f43f5e" radius={[4, 4, 0, 0]} onClick={(data) => handleMonthClick(data)}>
                  {evolutionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={filterState.mes === entry.date ? '#dc2626' : '#f43f5e'}
                      cursor="pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Infratores */}
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <Title className="text-slate-900">Top Infratores (Condutores)</Title>
          <Text className="text-slate-500 text-sm mb-4">
            {filterState.condutor ? `Filtrado: ${filterState.condutor}` : 'Clique para filtrar'}
          </Text>
          <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
            {topInfratores.map((item, idx) => (
              <div
                key={idx}
                className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors ${
                  filterState.condutor === item.name
                    ? 'bg-rose-100 border-l-4 border-rose-500'
                    : 'hover:bg-slate-50'
                }`}
                onClick={() => handleCondutorClick(item)}
              >
                <Text className="text-slate-700 text-sm font-medium truncate">{item.name}</Text>
                <Text className="text-slate-900 font-bold ml-2">{item.value} multas</Text>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2: Tipos e Gravidade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tipos de Infração */}
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <Title className="text-slate-900">Tipos de Infração</Title>
          <Text className="text-slate-500 text-sm mb-4">
            {filterState.tipo ? `Filtrado: ${filterState.tipo}` : 'Clique para filtrar'}
          </Text>
          <DonutChart
            data={tiposData}
            category="value"
            index="name"
            valueFormatter={(v) => fmtBRL(v)}
            colors={['rose', 'amber', 'orange', 'red', 'pink']}
            className="h-60"
            onVolumeChange={(v: any) => v && handleTipoClick(v)}
          />
        </Card>

        {/* Gravidade */}
        <Card className="bg-white shadow-sm">
          <Title className="text-slate-900">Distribuição por Gravidade</Title>
          <div className="h-64 flex items-center justify-center">
            {gravidadeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gravidadeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Text className="text-slate-400">Dados de gravidade não disponíveis</Text>
            )}
          </div>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <Card className="bg-white shadow-sm">
        <Title className="text-slate-900 mb-4">Detalhamento de Infrações</Title>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Placa</th>
                <th className="px-4 py-3">Condutor</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMultas.slice(0, 20).map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {r.DataInfracao || r.Data ? new Date(r.DataInfracao || r.Data).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.Placa}</td>
                  <td className="px-4 py-3">{r.Condutor || 'N/D'}</td>
                  <td className="px-4 py-3 text-xs">{r.TipoInfracao || 'Outros'}</td>
                  <td className="px-4 py-3 text-right font-medium text-rose-600">{fmtBRL(parseCurrency(r.ValorMulta))}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        r.Status === 'Paga' || r.Status === 'Quitada'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {r.Status || 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredMultas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma infração encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
