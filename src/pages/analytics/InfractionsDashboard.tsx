import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ComposedChart, Line } from 'recharts';
import { AlertOctagon, TrendingUp } from 'lucide-react';
import { useChartFilter } from '@/hooks/useChartFilter';
import { ChartFilterBadges, FloatingClearButton } from '@/components/analytics/ChartFilterBadges';
import MultasDescontoAlert from '@/components/analytics/infractions/MultasDescontoAlert';
import MultasHeatmap from '@/components/analytics/infractions/MultasHeatmap';
import { MultasFiltersProvider, useMultasFilters } from '@/contexts/MultasFiltersContext';
import { MultasFiltersBar } from '@/components/analytics/infractions/MultasFiltersBar';
import { EmptyDataState } from '@/components/analytics/EmptyDataState';



interface Multa {
  IdOcorrencia: number;
  Ocorrencia: string;
  Placa: string;
  DataInfracao: string;
  TipoInfracao?: string;
  Condutor?: string;
  ValorMulta?: number;
  ValorReembolsado?: number;
  DataLimitePagamento?: string;
  ValorDesconto?: number;
  Status?: string;
  DescricaoInfracao?: string;
  CodigoInfracao?: string;
  OrgaoAutuador?: string;
  Pontuacao?: number;
  Modelo?: string;
  AutoInfracao?: string;
  Latitude?: number;
  Longitude?: number;
  Cidade?: string;
  Estado?: string;
}

// Fallbacks robustos para campos
function parseCurrency(v: any): number { 
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v.replace(/[^0-9.-]/g, '')) || 0;
  return 0;
}
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number): string { 
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`; 
  return `R$ ${v.toFixed(0)}`;
}
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

// Fallbacks para campos de multa
function getValorMulta(r: Multa): number {
  return parseCurrency(r.ValorMulta) || parseCurrency((r as any).Valor) || 0;
}
function getValorReembolsado(r: Multa): number {
  return parseCurrency(r.ValorReembolsado) || parseCurrency((r as any).Reembolso) || 0;
}
function getCondutor(r: Multa): string {
  return r.Condutor || (r as any).NomeCondutor || 'Não identificado';
}
function getTipoInfracao(r: Multa): string {
  return r.TipoInfracao || r.DescricaoInfracao || (r as any).Tipo || 'Outros';
}
function getStatus(r: Multa): string {
  return r.Status || (r as any).Situacao || 'Pendente';
}

const COLORS = ['#f43f5e', '#f97316', '#fbbf24', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

function InfractionsDashboardContent(): JSX.Element {
  const { data: multasData, loading } = useBIData<Multa[]>('fat_multas_*.json');
  const multas = useMemo<Multa[]>(() => Array.isArray(multasData) ? multasData : [], [multasData]);

  const { filters: globalFilters, hasActiveFilters: hasGlobalFilters, clearAllFilters: clearGlobalFilters } = useMultasFilters();
  const [activeTab, setActiveTab] = useState(0);
  const { filters, handleChartClick, clearFilter, clearAllFilters, hasActiveFilters, isValueSelected, getFilterValues } = useChartFilter();

  // Listas para filtros
  const condutoresList = useMemo(() => [...new Set(multas.map(m => getCondutor(m)).filter(Boolean))].sort(), [multas]);
  const placasList = useMemo(() => [...new Set(multas.map(m => m.Placa).filter(Boolean))].sort(), [multas]);
  const tiposInfracaoList = useMemo(() => [...new Set(multas.map(m => getTipoInfracao(m)).filter(Boolean))].sort(), [multas]);
  const statusList = useMemo(() => [...new Set(multas.map(m => getStatus(m)).filter(Boolean))].sort(), [multas]);

  const filteredMultas = useMemo<Multa[]>(() => {
    return multas.filter((r) => {
      // Filtros globais
      if (globalFilters.dateRange?.from && r.DataInfracao) {
        const data = new Date(r.DataInfracao);
        if (data < globalFilters.dateRange.from) return false;
        if (globalFilters.dateRange.to && data > globalFilters.dateRange.to) return false;
      }
      if (globalFilters.condutores.length > 0 && !globalFilters.condutores.includes(getCondutor(r))) return false;
      if (globalFilters.placas.length > 0 && !globalFilters.placas.includes(r.Placa)) return false;
      if (globalFilters.tiposInfracao.length > 0 && !globalFilters.tiposInfracao.includes(getTipoInfracao(r))) return false;
      if (globalFilters.status.length > 0 && !globalFilters.status.includes(getStatus(r))) return false;

      // Filtros de click
      const mesValues = getFilterValues('mes');
      const condutorValues = getFilterValues('condutor');
      const tipoValues = getFilterValues('tipo');
      const placaValues = getFilterValues('placa');
      
      if (mesValues.length > 0 && !mesValues.includes(getMonthKey(r.DataInfracao))) return false;
      if (condutorValues.length > 0 && !condutorValues.includes(getCondutor(r))) return false;
      if (tipoValues.length > 0 && !tipoValues.includes(getTipoInfracao(r))) return false;
      if (placaValues.length > 0 && !placaValues.includes(r.Placa)) return false;
      return true;
    });
  }, [multas, globalFilters, filters, getFilterValues]);

  const kpis = useMemo(() => {
    const valorTotal = filteredMultas.reduce((s, r) => s + getValorMulta(r), 0);
    const qtdInfracoes = filteredMultas.length;
    const valorReembolsado = filteredMultas.reduce((s, r) => s + getValorReembolsado(r), 0);
    const percReembolso = valorTotal > 0 ? (valorReembolsado / valorTotal) * 100 : 0;
    const ticketMedio = qtdInfracoes > 0 ? valorTotal / qtdInfracoes : 0;
    const totalPontos = filteredMultas.reduce((s, r) => s + (r.Pontuacao || 0), 0);
    return { valorTotal, qtdInfracoes, valorReembolsado, percReembolso, ticketMedio, totalPontos };
  }, [filteredMultas]);

  const evolutionData = useMemo(() => {
    const map: Record<string, { Valor: number; Qtd: number }> = {};
    filteredMultas.forEach(r => {
      const k = getMonthKey(r.DataInfracao);
      if (!k) return;
      if (!map[k]) map[k] = { Valor: 0, Qtd: 0 };
      map[k].Valor += getValorMulta(r);
      map[k].Qtd += 1;
    });
    return Object.keys(map).sort().slice(-24).map(k => ({ date: k, label: monthLabel(k), ...map[k] }));
  }, [filteredMultas]);

  const topInfratores = useMemo(() => {
    const map: Record<string, { qtd: number; valor: number }> = {};
    filteredMultas.forEach(r => {
      const c = getCondutor(r);
      if (!map[c]) map[c] = { qtd: 0, valor: 0 };
      map[c].qtd += 1;
      map[c].valor += getValorMulta(r);
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.qtd - a.qtd).slice(0, 10);
  }, [filteredMultas]);

  const tiposData = useMemo(() => {
    const map: Record<string, { valor: number; qtd: number }> = {};
    filteredMultas.forEach(r => {
      const t = getTipoInfracao(r);
      if (!map[t]) map[t] = { valor: 0, qtd: 0 };
      map[t].valor += getValorMulta(r);
      map[t].qtd += 1;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name: name.length > 40 ? name.substring(0, 40) + '...' : name, fullName: name, ...data }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 12);
  }, [filteredMultas]);

  const placasData = useMemo(() => {
    const map: Record<string, { valor: number; qtd: number }> = {};
    filteredMultas.forEach(r => {
      const p = r.Placa || 'N/D';
      if (!map[p]) map[p] = { valor: 0, qtd: 0 };
      map[p].valor += getValorMulta(r);
      map[p].qtd += 1;
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.valor - a.valor).slice(0, 12);
  }, [filteredMultas]);

  // Abas consolidadas: 4 ao invés de 5
  const tabs = ['Visão Geral', 'Análise', 'Por Veículo', 'Mapa'];

  if (loading) return <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center"><div className="animate-pulse text-slate-500">Carregando dados de multas...</div></div>;

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <Title className="text-slate-900">Gestão de Multas</Title>
          <Text className="text-slate-500">Controle de infrações e condutores</Text>
        </div>
        <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full flex gap-2 font-medium text-sm">
          <AlertOctagon className="w-4 h-4" /> Hub Operacional
        </div>
      </div>

      {/* Barra de Filtros Globais */}
      <MultasFiltersBar
        condutoresList={condutoresList}
        placasList={placasList}
        tiposInfracaoList={tiposInfracaoList}
        statusList={statusList}
      />

      <FloatingClearButton onClick={() => { clearAllFilters(); clearGlobalFilters(); }} show={hasActiveFilters || hasGlobalFilters} />
      <ChartFilterBadges filters={filters} onClearFilter={clearFilter} onClearAll={clearAllFilters} />

      {/* Alerta de Descontos Expirando - colapsável */}
      <MultasDescontoAlert multas={filteredMultas} diasAlerta={7} />

      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
        {tabs.map((tab, idx) => (
          <button key={idx} onClick={() => setActiveTab(idx)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === idx ? 'bg-white shadow text-rose-600' : 'text-slate-600 hover:text-slate-900'}`}>{tab}</button>
        ))}
      </div>

      {/* Aba Visão Geral */}
      {activeTab === 0 && (
        <div className="space-y-4">
          {/* KPIs compactos */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <Card decoration="top" decorationColor="rose">
              <Text>Valor Total</Text>
              <Metric>{fmtCompact(kpis.valorTotal)}</Metric>
              <Text className="text-xs text-slate-400">{kpis.qtdInfracoes.toLocaleString('pt-BR')} infrações</Text>
            </Card>
            <Card decoration="top" decorationColor="emerald">
              <Text>Reembolsado</Text>
              <Metric className="text-emerald-600">{fmtCompact(kpis.valorReembolsado)}</Metric>
              <Text className="text-xs text-emerald-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {kpis.percReembolso.toFixed(0)}%
              </Text>
            </Card>
            <Card decoration="top" decorationColor="amber">
              <Text>Qtd Infrações</Text>
              <Metric>{kpis.qtdInfracoes.toLocaleString('pt-BR')}</Metric>
            </Card>
            <Card decoration="top" decorationColor="blue">
              <Text>Ticket Médio</Text>
              <Metric>{fmtBRL(kpis.ticketMedio)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="violet">
              <Text>Total Pontos</Text>
              <Metric>{kpis.totalPontos.toLocaleString('pt-BR')}</Metric>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <Title>Evolução (24 meses)</Title>
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={10} interval={Math.max(0, Math.floor(evolutionData.length / 12) - 1)} />
                    <YAxis yAxisId="left" fontSize={10} tickFormatter={fmtCompact} />
                    <YAxis yAxisId="right" orientation="right" fontSize={10} />
                    <Tooltip formatter={(v: any, n) => [n === 'Valor' ? fmtBRL(v) : v, n === 'Valor' ? 'Valor' : 'Quantidade']} />
                    <Bar yAxisId="left" dataKey="Valor" fill="#f43f5e" radius={[4, 4, 0, 0]} onClick={(d, _, e) => handleChartClick('mes', d.date, e as unknown as React.MouseEvent)} cursor="pointer">
                      {evolutionData.map((e, i) => <Cell key={i} fill={isValueSelected('mes', e.date) ? '#be123c' : '#f43f5e'} />)}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="Qtd" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <Title>Top 10 Infratores</Title>
              <div className="mt-4 space-y-1.5 max-h-64 overflow-y-auto">
                {topInfratores.length === 0 ? (
                  <EmptyDataState variant="no-data" title="Sem infratores" description="Nenhum condutor identificado." />
                ) : (
                  topInfratores.map((item, idx) => (
                    <div 
                      key={idx} 
                      onClick={(e) => handleChartClick('condutor', item.name, e)} 
                      className={`flex justify-between items-center p-2 rounded cursor-pointer transition-all text-sm ${isValueSelected('condutor', item.name) ? 'bg-rose-100 ring-1 ring-rose-500' : 'hover:bg-slate-100'}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 text-xs flex items-center justify-center font-bold flex-shrink-0">{idx + 1}</span>
                        <Text className="truncate text-xs">{item.name}</Text>
                      </div>
                      <Text className="font-bold text-rose-600 flex-shrink-0 ml-2 text-xs">{item.qtd}</Text>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Aba Análise = Por Tipo + Por Condutor lado a lado */}
      {activeTab === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <Title>Top Tipos de Infração (R$)</Title>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tiposData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={10} tickFormatter={fmtCompact} />
                    <YAxis dataKey="name" type="category" width={180} fontSize={9} tick={{ fill: '#475569' }} interval={0} />
                    <Tooltip 
                      formatter={(v: any) => fmtBRL(v)} 
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={16} cursor="pointer" onClick={(d, _, e) => handleChartClick('tipo', d.fullName, e as unknown as React.MouseEvent)}>
                      {tiposData.map((entry, i) => (
                        <Cell key={i} fill={isValueSelected('tipo', entry.fullName) ? '#be123c' : COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <Title>Multas por Condutor (Top 15)</Title>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topInfratores.slice(0, 15)} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={10} />
                    <YAxis dataKey="name" type="category" width={140} fontSize={9} tick={{ fill: '#475569' }} interval={0} />
                    <Tooltip />
                    <Bar dataKey="qtd" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={14} name="Qtd Multas" cursor="pointer" onClick={(d, _, e) => handleChartClick('condutor', d.name, e as unknown as React.MouseEvent)}>
                      {topInfratores.map((entry, i) => (
                        <Cell key={i} fill={isValueSelected('condutor', entry.name) ? '#be123c' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Tabela de tipos */}
          <Card>
            <Title>Detalhamento por Tipo de Infração</Title>
            <div className="mt-4 overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Tipo de Infração</th>
                    <th className="p-2 text-center">Qtd</th>
                    <th className="p-2 text-right">Valor Total</th>
                    <th className="p-2 text-right">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {tiposData.map((t, idx) => (
                    <tr key={idx} className={`border-t hover:bg-slate-50 cursor-pointer ${isValueSelected('tipo', t.fullName) ? 'bg-rose-50' : ''}`} onClick={(e) => handleChartClick('tipo', t.fullName, e)}>
                      <td className="p-2 max-w-[300px]"><span className="line-clamp-1 text-xs">{t.fullName}</span></td>
                      <td className="p-2 text-center text-xs">{t.qtd}</td>
                      <td className="p-2 text-right font-medium text-rose-600 text-xs">{fmtBRL(t.valor)}</td>
                      <td className="p-2 text-right text-xs">{fmtBRL(t.qtd > 0 ? t.valor / t.qtd : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Aba Por Veículo */}
      {activeTab === 2 && (
        <div className="space-y-4">
          <Card>
            <Title>Top 12 Veículos com Mais Multas (R$)</Title>
            <div className="h-72 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={placasData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={10} tickFormatter={fmtCompact} />
                  <YAxis dataKey="name" type="category" width={80} fontSize={10} tick={{ fill: '#475569' }} interval={0} />
                  <Tooltip formatter={(v: any) => fmtBRL(v)} />
                  <Bar dataKey="valor" fill="#f97316" radius={[0, 4, 4, 0]} barSize={16} name="Valor" cursor="pointer" onClick={(d, _, e) => handleChartClick('placa', d.name, e as unknown as React.MouseEvent)}>
                    {placasData.map((entry, i) => <Cell key={i} fill={isValueSelected('placa', entry.name) ? '#c2410c' : COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <Title>Detalhamento por Veículo</Title>
            <div className="mt-4 overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Placa</th>
                    <th className="p-2 text-center">Qtd Multas</th>
                    <th className="p-2 text-right">Valor Total</th>
                    <th className="p-2 text-right">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {placasData.map((p, idx) => (
                    <tr key={idx} className={`border-t hover:bg-slate-50 cursor-pointer ${isValueSelected('placa', p.name) ? 'bg-amber-50' : ''}`} onClick={(e) => handleChartClick('placa', p.name, e)}>
                      <td className="p-2 font-mono text-xs">{p.name}</td>
                      <td className="p-2 text-center text-xs">{p.qtd}</td>
                      <td className="p-2 text-right font-medium text-rose-600 text-xs">{fmtBRL(p.valor)}</td>
                      <td className="p-2 text-right text-xs">{fmtBRL(p.qtd > 0 ? p.valor / p.qtd : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Aba Mapa = Mapa de Calor + Detalhamento */}
      {activeTab === 3 && (
        <div className="space-y-4">
          <MultasHeatmap multas={filteredMultas} />

          <Card>
            <Title>Detalhamento de Multas</Title>
            <div className="mt-4 overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-rose-50 text-rose-800 sticky top-0">
                  <tr>
                    <th className="p-2">Data</th>
                    <th className="p-2">Placa</th>
                    <th className="p-2">Condutor</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMultas.slice(0, 50).map((r, idx) => (
                    <tr key={idx} className="border-t hover:bg-slate-50">
                      <td className="p-2 text-xs">{r.DataInfracao ? new Date(r.DataInfracao).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="p-2 font-mono text-xs cursor-pointer hover:text-rose-600" onClick={(e) => handleChartClick('placa', r.Placa, e)}>{r.Placa}</td>
                      <td className="p-2 truncate max-w-[120px] text-xs cursor-pointer hover:text-rose-600" onClick={(e) => handleChartClick('condutor', getCondutor(r), e)}>{getCondutor(r)}</td>
                      <td className="p-2 truncate max-w-[150px] text-xs cursor-pointer hover:text-rose-600" onClick={(e) => handleChartClick('tipo', getTipoInfracao(r), e)}>{getTipoInfracao(r)}</td>
                      <td className="p-2 text-xs">
                        <span className={`px-2 py-0.5 rounded text-xs ${getStatus(r) === 'Paga' ? 'bg-emerald-100 text-emerald-700' : getStatus(r) === 'Pendente' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                          {getStatus(r)}
                        </span>
                      </td>
                      <td className="p-2 text-right font-bold text-rose-600 text-xs">{fmtBRL(getValorMulta(r))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredMultas.length > 50 && (
              <Text className="text-xs text-slate-400 mt-2 text-center">Exibindo 50 de {filteredMultas.length} registros</Text>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default function InfractionsDashboard(): JSX.Element {
  return (
    <MultasFiltersProvider>
      <InfractionsDashboardContent />
    </MultasFiltersProvider>
  );
}
