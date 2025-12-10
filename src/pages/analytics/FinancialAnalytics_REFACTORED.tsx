import { useMemo, useState, useEffect } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell } from 'recharts';
import { Wallet, Search, X, Filter } from 'lucide-react';

type AnyObject = { [k: string]: any };
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// --- FUNÇÕES AUXILIARES ---
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

function fmtBRL(v: number): string {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
  catch (e) { return String(v); }
}

function fmtCompact(v: number): string {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return `R$ ${v}`;
}

function parseCurrency(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  let s = String(v).trim();
  if (s === '') return 0;
  s = s.replace(/R\$|\s/g, '');
  if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  } else if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes('.') && !s.includes(',')) {
    if (/^[-+]?\d{1,3}(?:\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    }
  }
  s = s.replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function getQty(row: AnyObject): number {
  if (!row) return 0;
  const candidates = ['QtdVeiculos', 'QtdVeiculo', 'QtdVeic', 'QuantidadeVeiculos', 'QuantidadeVeiculo', 'qtdVeiculos', 'qtd', 'Quantidade'];
  for (const k of candidates) {
    if (k in row) return parseCurrency(row[k]);
  }
  return 0;
}

// --- COMPONENTE PRINCIPAL ---
export default function FinancialAnalytics(): JSX.Element {
  // *** MIGRAÇÃO: Usa fat_faturamento_*.json e dim_contratos.json ***
  const { data: financeiroData } = useBIData<AnyObject[]>('fat_faturamento_*.json');
  const { data: contratosData } = useBIData<AnyObject[]>('dim_contratos.json');

  const financeiro = useMemo(() => {
    const raw = (financeiroData as any)?.data || financeiroData || [];
    return Array.isArray(raw) ? raw : [];
  }, [financeiroData]);

  const contratos = useMemo(() => {
    const raw = (contratosData as any)?.data || contratosData || [];
    return Array.isArray(raw) ? raw : [];
  }, [contratosData]);

  // *** ESTADOS ***
  const [activeTab, setActiveTab] = useState(0);
  const currentYear = new Date().getFullYear();

  // Filtros Visão Geral
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);

  // *** ESTADO DE FILTROS INTERATIVOS (PowerBI Style) ***
  const [filterState, setFilterState] = useState<{
    mes: string | null;
    cliente: string | null;
  }>({
    mes: null,
    cliente: null
  });

  // Filtros Auditoria
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const hasActiveFilters = useMemo(() => {
    return !!(filterState.mes || filterState.cliente);
  }, [filterState]);

  const clearFilters = () => {
    setFilterState({ mes: null, cliente: null });
  };

  // Listas Auxiliares
  const clientesList = useMemo(() =>
    Array.from(new Set(financeiro.map(r => r.Cliente).filter(Boolean))).sort()
  , [financeiro]);

  const availableMonths = useMemo(() => {
    const s = new Set<string>();
    financeiro.forEach(r => {
      const k = getMonthKey(r.DataCompetencia || r.DataEmissao || r.Data || '');
      if (k.length === 7) s.add(k);
    });
    return Array.from(s).sort().reverse();
  }, [financeiro]);

  useEffect(() => {
    if (!selectedMonth && availableMonths.length > 0) setSelectedMonth(availableMonths[0]);
  }, [availableMonths, selectedMonth]);

  // === CÁLCULOS ABA 1: VISÃO GERAL ===

  // Filtra dados pelo período e filtros interativos
  const filteredFin = useMemo(() => {
    return financeiro.filter((r) => {
      const d = r.DataCompetencia || r.DataEmissao || r.Data;
      if (!d) return false;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (selectedClientes.length > 0 && !selectedClientes.includes(String(r.Cliente))) return false;
      
      // Filtros Interativos
      if (filterState.mes && getMonthKey(d) !== filterState.mes) return false;
      if (filterState.cliente && r.Cliente !== filterState.cliente) return false;
      
      return true;
    });
  }, [financeiro, dateFrom, dateTo, selectedClientes, filterState]);

  const kpisOverview = useMemo(() => {
    const totalLocacao = filteredFin.reduce((s, r) => s + parseCurrency(r.ValorLocacao || r.ValorFaturadoItem || 0), 0);
    const totalWithMultas = filteredFin.reduce((s, r) => s + parseCurrency(r.ValorTotal || r.ValorFaturadoItem || r.ValorLocacao || 0), 0);
    const veiculosSet = new Set(filteredFin.map(r => r.IdVeiculo).filter(Boolean));
    const qtdVeiculosFallback = filteredFin.reduce((s, r) => s + getQty(r), 0);
    const qtdVeiculos = veiculosSet.size > 0 ? veiculosSet.size : Math.round(qtdVeiculosFallback);
    return {
      faturamentoLocacao: totalLocacao,
      faturamentoTotal: totalWithMultas,
      veiculos: qtdVeiculos,
      ticket: qtdVeiculos > 0 ? totalLocacao / qtdVeiculos : 0
    };
  }, [filteredFin]);

  const monthlyOverview = useMemo(() => {
    const map: Record<string, { fatLoc: number; fatTotal: number; veicSet: Set<any> }> = {};
    filteredFin.forEach((r) => {
      const k = getMonthKey(r.DataCompetencia || r.DataEmissao || r.Data);
      if (!k) return;
      if (!map[k]) map[k] = { fatLoc: 0, fatTotal: 0, veicSet: new Set() };
      map[k].fatLoc += parseCurrency(r.ValorLocacao || r.ValorFaturadoItem || 0);
      map[k].fatTotal += parseCurrency(r.ValorTotal || r.ValorFaturadoItem || r.ValorLocacao || 0);
      if (r.IdVeiculo) map[k].veicSet.add(r.IdVeiculo);
    });

    return Object.keys(map).sort().map(k => ({
      date: k,
      month: monthLabel(k),
      faturamentoLocacao: map[k].fatLoc,
      faturamentoTotal: map[k].fatTotal,
      ticket: map[k].veicSet.size > 0 ? map[k].fatLoc / map[k].veicSet.size : 0
    }));
  }, [filteredFin]);

  const topClients = useMemo(() => {
    const map: Record<string, number> = {};
    filteredFin.forEach(r => {
      const c = r.Cliente || 'N/A';
      map[c] = (map[c] || 0) + parseCurrency(r.ValorFaturadoItem || r.ValorTotal || r.ValorLocacao);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredFin]);

  // === CÁLCULOS ABA 2: AUDITORIA (REVENUE ASSURANCE) ===
  const auditData = useMemo(() => {
    if (!selectedMonth) return { expected: 0, realized: 0, gap: 0, details: [] };

    // Realizado
    const itemsInMonth = financeiro.filter(f => getMonthKey(f.DataCompetencia || f.DataEmissao || f.Data) === selectedMonth);
    const realizedTotal = itemsInMonth.reduce((s, i) => s + parseCurrency(i.ValorFaturadoItem || i.ValorTotal || i.ValorLocacao), 0);

    const realizedMap: Record<string, number> = {};
    itemsInMonth.forEach(item => {
      const val = parseCurrency(item.ValorFaturadoItem || item.ValorTotal || item.ValorLocacao);
      if (item.IdContratoLocacao) {
        realizedMap[String(item.IdContratoLocacao)] = (realizedMap[String(item.IdContratoLocacao)] || 0) + val;
      }
    });

    // Previsto (Base 30)
    const [y, m] = selectedMonth.split('-').map(Number);
    const startM = new Date(y, m - 1, 1);
    const endM = new Date(y, m, 0);
    const COMMERCIAL_BASE = 30;

    let expectedTotal = 0;
    const contractDetails: any[] = [];

    contratos.forEach(c => {
      const rawStart = c.InicioVigenciaPreco || c.InicioContrato || c.Inicio;
      const rawEnd = c.FimVigenciaPreco || c.FimContrato || c.Fim;
      if (!rawStart) return;

      const startC = new Date(String(rawStart).split('T')[0] + 'T12:00:00');
      const endC = rawEnd ? new Date(String(rawEnd).split('T')[0] + 'T12:00:00') : new Date('2099-12-31T12:00:00');

      if (endC < startM || startC > endM) return;

      const overlapStart = startC > startM ? startC : startM;
      const overlapEnd = endC < endM ? endC : endM;

      let daysActive = COMMERCIAL_BASE;
      if (overlapStart > startM || overlapEnd < endM) {
        const diffTime = Math.abs(overlapEnd.getTime() - overlapStart.getTime());
        daysActive = Math.ceil(diffTime / MS_PER_DAY) + 1;
        if (daysActive > COMMERCIAL_BASE) daysActive = COMMERCIAL_BASE;
        if (daysActive < 1) daysActive = 1;
      }

      const valMensal = parseCurrency(c.ValorVigente || c.ValorMensal || c.ValorMensalidade || c.Valor);
      const expected = (valMensal / COMMERCIAL_BASE) * daysActive;

      expectedTotal += expected;

      contractDetails.push({
        id: c.IdContratoLocacao || c.NumeroContrato || c.Id || null,
        cliente: c.Cliente || c.NomeCliente || 'N/D',
        placa: c.Placa || c.PlacaVeiculo || 'N/D',
        contrato: c.ContratoLocacao || c.NumeroContrato || c.IdContratoLocacao || 'N/D',
        dias: daysActive,
        esperado: expected,
        realizado: 0,
        gap: 0
      });
    });

    // Cruzamento e Gap
    contractDetails.forEach(d => {
      if (d.id && realizedMap[String(d.id)]) {
        d.realizado = realizedMap[String(d.id)];
      }
      d.gap = d.realizado - d.esperado;
    });

    const filteredDetails = contractDetails.filter((d: any) =>
      searchTerm === '' ||
      (d.cliente && d.cliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.placa && d.placa.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    filteredDetails.sort((a: any, b: any) => a.gap - b.gap);

    return {
      expected: expectedTotal,
      realized: realizedTotal,
      gap: realizedTotal - expectedTotal,
      details: filteredDetails
    };

  }, [selectedMonth, financeiro, contratos, searchTerm]);

  // === HANDLERS DE CLIQUE (Interatividade PowerBI) ===
  const handleMonthClick = (data: any) => {
    setFilterState(prev => ({ ...prev, mes: prev.mes === data.date ? null : data.date }));
  };

  const handleClienteClick = (data: any) => {
    setFilterState(prev => ({ ...prev, cliente: prev.cliente === data.name ? null : data.name }));
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">Financial Core Dashboard</Title>
          <Text className="mt-1 text-slate-500">
            Gestão financeira e auditoria de contratos. Clique nos gráficos para filtrar.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Hub Financeiro
          </div>
        </div>
      </div>

      {/* Botão Limpar Filtros (Flutuante) */}
      {hasActiveFilters && activeTab === 0 && (
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
      {hasActiveFilters && activeTab === 0 && (
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
            {filterState.cliente && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                Cliente: <strong>{filterState.cliente}</strong>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterState(prev => ({ ...prev, cliente: null }))} />
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Abas */}
      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
        <button onClick={() => setActiveTab(0)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === 0 ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Visão Geral</button>
        <button onClick={() => setActiveTab(1)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === 1 ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Auditoria de Receita</button>
      </div>

      {/* === CONTEÚDO DA VISÃO GERAL === */}
      {activeTab === 0 && (
        <div className="space-y-6">
          <Card className="bg-white shadow-sm border border-slate-200">
            <Text className="font-medium mb-2">Filtros</Text>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Text className="text-xs text-slate-500">Período</Text>
                <div className="flex gap-2">
                  <input type="date" className="border p-1 rounded w-full text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  <input type="date" className="border p-1 rounded w-full text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>
              <div>
                <Text className="text-xs text-slate-500">Cliente</Text>
                <select multiple className="w-full border rounded p-1 text-sm h-10" value={selectedClientes} onChange={e => setSelectedClientes(Array.from(e.target.selectedOptions).map(o => o.value))}>
                  {clientesList.slice(0, 50).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button className="bg-slate-100 hover:bg-slate-200 w-full py-1.5 rounded text-sm transition-colors" onClick={() => { setDateFrom(`${currentYear}-01-01`); setDateTo(`${currentYear}-12-31`); setSelectedClientes([]) }}>Ano Atual</button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card decoration="top" decorationColor="blue" className="bg-white border border-slate-200">
              <Text>Receita Core (Locação)</Text>
              <Metric>{fmtCompact(kpisOverview.faturamentoLocacao)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="emerald" className="bg-white border border-slate-200">
              <Text>Receita Total (com Multas)</Text>
              <Metric>{fmtCompact(kpisOverview.faturamentoTotal)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="violet" className="bg-white border border-slate-200">
              <Text>Ticket Médio (Locação)</Text>
              <Metric>{fmtBRL(kpisOverview.ticket)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="violet" className="bg-white border border-slate-200">
              <Text>Veículos Faturados</Text>
              <Metric>{kpisOverview.veiculos}</Metric>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 bg-white border border-slate-200 hover:shadow-md transition-shadow">
              <Title>Evolução Mensal</Title>
              <Text className="text-slate-500 text-sm mb-4">
                {filterState.mes ? `Filtrado: ${monthLabel(filterState.mes)}` : 'Clique nas barras para filtrar'}
              </Text>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyOverview}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtCompact} />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtCompact} />
                    <Tooltip formatter={(v: any) => fmtBRL(v)} contentStyle={{ borderRadius: '8px' }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="faturamento" radius={[4, 4, 0, 0]} name="Faturamento" onClick={(data) => handleMonthClick(data)}>
                      {monthlyOverview.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={filterState.mes === entry.date ? '#dc2626' : '#3b82f6'}
                          cursor="pointer"
                        />
                      ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="ticket" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Ticket Médio" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="bg-white border border-slate-200 hover:shadow-md transition-shadow">
              <Title>Top 10 Clientes</Title>
              <Text className="text-slate-500 text-sm mb-4">
                {filterState.cliente ? `Filtrado: ${filterState.cliente}` : 'Clique para filtrar'}
              </Text>
              <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
                {topClients.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors ${
                      filterState.cliente === item.name
                        ? 'bg-blue-100 border-l-4 border-blue-500'
                        : 'hover:bg-slate-50'
                    }`}
                    onClick={() => handleClienteClick(item)}
                  >
                    <Text className="text-slate-700 text-sm font-medium truncate">{item.name}</Text>
                    <Text className="text-slate-900 font-bold ml-2">{fmtCompact(item.value)}</Text>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* === CONTEÚDO DA AUDITORIA === */}
      {activeTab === 1 && (
        <Card className="bg-white shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div>
              <Title className="text-slate-900">Conciliação de Receita (Revenue Assurance)</Title>
              <Text className="text-slate-500">Comparativo mês a mês: Previsto (Contratos) vs Realizado (Notas Fiscais).</Text>
            </div>
            <div className="w-full md:w-48">
              <Text className="text-xs text-slate-500 mb-1">Mês de Referência</Text>
              <select className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none bg-white" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <Text className="text-slate-500">Receita Esperada (Base 30)</Text>
              <Metric className="text-blue-600">{fmtBRL(auditData.expected)}</Metric>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <Text className="text-slate-500">Receita Realizada (Notas)</Text>
              <Metric className="text-emerald-600">{fmtBRL(auditData.realized)}</Metric>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <Text className="text-slate-500">Gap (Diferença)</Text>
              <Metric className={`${auditData.gap < -100 ? 'text-red-500' : 'text-emerald-500'}`}>{fmtBRL(auditData.gap)}</Metric>
            </div>
          </div>

          {/* Tabela Detalhada */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex justify-between items-center mb-4">
              <Title>Detalhamento por Contrato ({auditData.details.length})</Title>
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input type="text" placeholder="Buscar cliente ou placa..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div className="overflow-auto max-h-[500px] border rounded-lg">
              <table className="w-full text-sm text-left bg-white">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Contrato</th>
                    <th className="px-4 py-3 font-semibold">Placa</th>
                    <th className="px-4 py-3 font-semibold text-center">Dias Ativos</th>
                    <th className="px-4 py-3 font-semibold text-right">Esperado</th>
                    <th className="px-4 py-3 font-semibold text-right">Faturado</th>
                    <th className="px-4 py-3 font-semibold text-right">Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditData.details.length > 0 ? (
                    auditData.details.slice(0, 100).map((d: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{d.cliente}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{d.contrato}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono">{d.placa}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${d.dias < 30 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                            {d.dias}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600">{fmtBRL(d.esperado)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">{fmtBRL(d.realizado)}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {Math.abs(d.gap) > 1 ? (
                            <span className={d.gap < 0 ? 'text-red-500' : 'text-emerald-500'}>{fmtBRL(d.gap)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhum registro encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center text-xs text-slate-400">Mostrando os 100 maiores gaps.</div>
          </div>
        </Card>
      )}
    </div>
  );
}
