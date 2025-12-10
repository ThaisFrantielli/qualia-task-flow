import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, DonutChart } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { ShieldX, Filter, X } from 'lucide-react';

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
export default function ClaimsDashboard(): JSX.Element {
  // *** USA: fat_sinistros_*.json ***
  const { data: sinistrosData } = useBIData<AnyObject[]>('fat_sinistros_*.json');

  const sinistros = useMemo((): AnyObject[] => {
    const raw = (sinistrosData as any)?.data || sinistrosData;
    return Array.isArray(raw) ? raw : [];
  }, [sinistrosData]);

  // *** ESTADO DE FILTROS INTERATIVOS (PowerBI Style) ***
  const [filterState, setFilterState] = useState<{
    mes: string | null;
    culpa: string | null;
    tipoDano: string | null;
  }>({
    mes: null,
    culpa: null,
    tipoDano: null
  });

  const hasActiveFilters = useMemo(() => {
    return !!(filterState.mes || filterState.culpa || filterState.tipoDano);
  }, [filterState]);

  const clearFilters = () => {
    setFilterState({ mes: null, culpa: null, tipoDano: null });
  };

  // *** DADOS FILTRADOS (Derivados do filterState) ***
  const filteredSinistros = useMemo(() => {
    return sinistros.filter((r: AnyObject) => {
      if (filterState.mes && getMonthKey(r.DataSinistro || r.Data) !== filterState.mes) return false;
      if (filterState.culpa && r.Culpabilidade !== filterState.culpa) return false;
      if (filterState.tipoDano && r.TipoDano !== filterState.tipoDano) return false;
      return true;
    });
  }, [sinistros, filterState]);

  // *** KPIs ***
  const kpis = useMemo(() => {
    const valorSinistros = filteredSinistros.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorSinistro), 0);
    const valorRecuperado = filteredSinistros.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorRecuperado || r.ValorSeguradora), 0);
    const qtdSinistros = filteredSinistros.length;
    
    // Sinistralidade % (Qtd Batidas / Total Frota) - Assumindo uma frota de referência
    // Como não temos dim_frota aqui, vamos calcular a taxa de sinistros por mês
    const uniqueVeiculos = new Set(filteredSinistros.map((r: AnyObject) => r.Placa).filter(Boolean)).size;
    const sinistralidade = uniqueVeiculos; // Veículos únicos envolvidos

    return { valorSinistros, valorRecuperado, qtdSinistros, sinistralidade };
  }, [filteredSinistros]);

  // === GRÁFICOS INTERATIVOS ===

  // 1. Evolução de Sinistros
  const evolutionData = useMemo(() => {
    const map: Record<string, { Valor: number; Qtd: number }> = {};
    filteredSinistros.forEach((r: AnyObject) => {
      const k = getMonthKey(r.DataSinistro || r.Data);
      if (!k) return;
      if (!map[k]) map[k] = { Valor: 0, Qtd: 0 };
      map[k].Valor += parseCurrency(r.ValorSinistro);
      map[k].Qtd += 1;
    });
    return Object.keys(map).sort().map(k => ({
      date: k,
      label: monthLabel(k),
      ...map[k]
    }));
  }, [filteredSinistros]);

  // 2. Culpabilidade (Motorista vs Terceiro)
  const culpaData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSinistros.forEach((r: AnyObject) => {
      const c = r.Culpabilidade || r.Culpa || 'Não Informada';
      map[c] = (map[c] || 0) + parseCurrency(r.ValorSinistro);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredSinistros]);

  // 3. Tipos de Dano (Lataria, Vidro, etc)
  const tipoDanoData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSinistros.forEach((r: AnyObject) => {
      const t = r.TipoDano || 'Outros';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredSinistros]);

  // 4. Top Veículos Sinistrados
  const topVeiculos = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSinistros.forEach((r: AnyObject) => {
      const p = r.Placa || 'N/A';
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredSinistros]);

  // === HANDLERS DE CLIQUE (Interatividade PowerBI) ===
  const handleMonthClick = (data: any) => {
    setFilterState(prev => ({ ...prev, mes: prev.mes === data.date ? null : data.date }));
  };

  const handleCulpaClick = (data: any) => {
    setFilterState(prev => ({ ...prev, culpa: prev.culpa === data.name ? null : data.name }));
  };

  const handleTipoDanoClick = (data: any) => {
    setFilterState(prev => ({ ...prev, tipoDano: prev.tipoDano === data.name ? null : data.name }));
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">Claims & Accidents Dashboard</Title>
          <Text className="mt-1 text-slate-500">
            Análise de sinistros, culpabilidade e tipos de dano. Clique nos gráficos para filtrar.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <ShieldX className="w-4 h-4" /> Hub Operacional
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
            {filterState.culpa && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                Culpabilidade: <strong>{filterState.culpa}</strong>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterState(prev => ({ ...prev, culpa: null }))} />
              </span>
            )}
            {filterState.tipoDano && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                Tipo Dano: <strong>{filterState.tipoDano}</strong>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterState(prev => ({ ...prev, tipoDano: null }))} />
              </span>
            )}
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="red" className="bg-white shadow-sm">
          <Text className="text-slate-500">Valor Sinistros</Text>
          <Metric className="text-slate-900">{fmtCompact(kpis.valorSinistros)}</Metric>
          <Text className="text-xs text-slate-400 mt-1">{kpis.qtdSinistros} ocorrências</Text>
        </Card>
        <Card decoration="top" decorationColor="emerald" className="bg-white shadow-sm">
          <Text className="text-slate-500">Valor Recuperado</Text>
          <Metric className="text-slate-900">{fmtCompact(kpis.valorRecuperado)}</Metric>
          <Text className="text-xs text-slate-400 mt-1">Seguradora</Text>
        </Card>
        <Card decoration="top" decorationColor="amber" className="bg-white shadow-sm">
          <Text className="text-slate-500">Veículos Envolvidos</Text>
          <Metric className="text-slate-900">{kpis.sinistralidade}</Metric>
          <Text className="text-xs text-slate-400 mt-1">Únicos</Text>
        </Card>
        <Card decoration="top" decorationColor="blue" className="bg-white shadow-sm">
          <Text className="text-slate-500">Ticket Médio</Text>
          <Metric className="text-slate-900">
            {fmtBRL(kpis.qtdSinistros > 0 ? kpis.valorSinistros / kpis.qtdSinistros : 0)}
          </Metric>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolução de Sinistros */}
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <Title className="text-slate-900">Evolução de Sinistros</Title>
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
                <Bar dataKey="Valor" fill="#dc2626" radius={[4, 4, 0, 0]} onClick={(data) => handleMonthClick(data)}>
                  {evolutionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={filterState.mes === entry.date ? '#991b1b' : '#dc2626'}
                      cursor="pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Culpabilidade */}
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <Title className="text-slate-900">Culpabilidade</Title>
          <Text className="text-slate-500 text-sm mb-4">
            {filterState.culpa ? `Filtrado: ${filterState.culpa}` : 'Clique para filtrar'}
          </Text>
          <DonutChart
            data={culpaData}
            category="value"
            index="name"
            valueFormatter={(v) => fmtBRL(v)}
            colors={['red', 'amber', 'slate']}
            className="h-60"
            onVolumeChange={(v: any) => v && handleCulpaClick(v)}
          />
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tipos de Dano */}
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <Title className="text-slate-900">Tipos de Dano</Title>
          <Text className="text-slate-500 text-sm mb-4">
            {filterState.tipoDano ? `Filtrado: ${filterState.tipoDano}` : 'Clique para filtrar'}
          </Text>
          <DonutChart
            data={tipoDanoData}
            category="value"
            index="name"
            colors={['rose', 'orange', 'amber', 'yellow', 'lime']}
            className="h-60"
            onVolumeChange={(v: any) => v && handleTipoDanoClick(v)}
          />
        </Card>

        {/* Top Veículos */}
        <Card className="bg-white shadow-sm">
          <Title className="text-slate-900">Top Veículos Sinistrados</Title>
          <Text className="text-slate-500 text-sm mb-4">Por quantidade de ocorrências</Text>
          <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
            {topVeiculos.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center p-2 rounded hover:bg-slate-50 transition-colors"
              >
                <Text className="text-slate-700 text-sm font-medium">{item.name}</Text>
                <Text className="text-slate-900 font-bold ml-2">{item.value} sinistros</Text>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <Card className="bg-white shadow-sm">
        <Title className="text-slate-900 mb-4">Detalhamento de Sinistros</Title>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Placa</th>
                <th className="px-4 py-3">Culpabilidade</th>
                <th className="px-4 py-3">Tipo Dano</th>
                <th className="px-4 py-3 text-right">Valor Sinistro</th>
                <th className="px-4 py-3 text-right">Valor Recuperado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSinistros.slice(0, 20).map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {r.DataSinistro || r.Data ? new Date(r.DataSinistro || r.Data).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.Placa}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        r.Culpabilidade === 'Terceiro' || r.Culpa === 'Terceiro'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {r.Culpabilidade || r.Culpa || 'N/D'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{r.TipoDano || 'Outros'}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">{fmtBRL(parseCurrency(r.ValorSinistro))}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">
                    {fmtBRL(parseCurrency(r.ValorRecuperado || r.ValorSeguradora))}
                  </td>
                </tr>
              ))}
              {filteredSinistros.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Nenhum sinistro encontrado com os filtros selecionados.
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
