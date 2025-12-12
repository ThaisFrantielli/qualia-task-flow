import { useMemo, useState, useEffect } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Wallet, Search, Filter, X } from 'lucide-react';

type AnyObject = { [k: string]: any };
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// --- HELPERS ---
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
  return `R$ ${v.toFixed(0)}`; // Ajuste para não mostrar decimais no compacto
}

function parseCurrency(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  return parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
}

export default function FinancialAnalytics(): JSX.Element {
  // Consome os arquivos gerados pelo ETL v6
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

  const [activeTab, setActiveTab] = useState(0);
  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  
  // Filtros Interativos
  const [filterState, setFilterState] = useState<{ mes: string | null; cliente: string | null; }>({ mes: null, cliente: null });
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // LISTA DE CLIENTES
  const clientesList = useMemo(() => Array.from(new Set(financeiro.map(r => r.Cliente).filter(Boolean))).sort(), [financeiro]);

  const availableMonths = useMemo(() => {
    const s = new Set<string>();
    financeiro.forEach(r => {
      const k = getMonthKey(r.DataCompetencia);
      if (k.length === 7) s.add(k);
    });
    return Array.from(s).sort().reverse();
  }, [financeiro]);

  useEffect(() => {
    if (!selectedMonth && availableMonths.length > 0) setSelectedMonth(availableMonths[0]);
  }, [availableMonths, selectedMonth]);

  const clearFilters = () => {
    setFilterState({ mes: null, cliente: null });
    setSelectedClientes([]);
  };

  // --- FILTRAGEM ---
  const filteredFin = useMemo(() => {
    return financeiro.filter((r) => {
      const d = r.DataCompetencia || r.DataEmissao;
      if (!d) return false;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (selectedClientes.length > 0 && !selectedClientes.includes(String(r.Cliente))) return false;
      if (filterState.mes && getMonthKey(d) !== filterState.mes) return false;
      if (filterState.cliente && r.Cliente !== filterState.cliente) return false;
      return true;
    });
  }, [financeiro, dateFrom, dateTo, selectedClientes, filterState]);

  // --- KPIs ---
  const kpisOverview = useMemo(() => {
    const totalLocacao = filteredFin.reduce((s, r) => s + parseCurrency(r.ValorLocacao), 0);
    const totalWithMultas = filteredFin.reduce((s, r) => s + parseCurrency(r.ValorTotal), 0);
    const veiculosSet = new Set(filteredFin.map(r => r.IdVeiculo).filter(Boolean));
    const qtdVeiculos = veiculosSet.size;
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
      const k = getMonthKey(r.DataCompetencia);
      if (!k) return;
      if (!map[k]) map[k] = { fatLoc: 0, fatTotal: 0, veicSet: new Set() };
      map[k].fatLoc += parseCurrency(r.ValorLocacao);
      map[k].fatTotal += parseCurrency(r.ValorTotal);
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
      map[c] = (map[c] || 0) + parseCurrency(r.ValorTotal);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredFin]);

  // --- CÁLCULO AUDITORIA (Revenue Assurance) ---
  const auditData = useMemo(() => {
    if (!selectedMonth) return { expected: 0, realized: 0, gap: 0, details: [] };

    // Realizado (Agrupado por Contrato)
    const itemsInMonth = financeiro.filter(f => getMonthKey(f.DataCompetencia) === selectedMonth);
    const realizedTotal = itemsInMonth.reduce((s, i) => s + parseCurrency(i.ValorTotal), 0);
    const realizedMap: Record<string, number> = {};
    itemsInMonth.forEach(item => {
      if (item.IdContratoLocacao) {
        realizedMap[String(item.IdContratoLocacao)] = (realizedMap[String(item.IdContratoLocacao)] || 0) + parseCurrency(item.ValorTotal);
      }
    });

    // Previsto (Base 30 dias - Comercial)
    const [y, m] = selectedMonth.split('-').map(Number);
    const startM = new Date(y, m - 1, 1);
    const endM = new Date(y, m, 0);
    const COMMERCIAL_BASE = 30;
    let expectedTotal = 0;
    const contractDetails: any[] = [];

    contratos.forEach(c => {
      const startC = c.InicioContrato ? new Date(c.InicioContrato + 'T12:00:00') : null;
      const endC = c.FimContrato ? new Date(c.FimContrato + 'T12:00:00') : new Date('2099-12-31');
      if (!startC) return;

      if (endC < startM || startC > endM) return;

      const overlapStart = startC > startM ? startC : startM;
      const overlapEnd = endC < endM ? endC : endM;
      let daysActive = COMMERCIAL_BASE;
      if (overlapStart > startM || overlapEnd < endM) {
        const diffTime = Math.abs(overlapEnd.getTime() - overlapStart.getTime());
        daysActive = Math.ceil(diffTime / MS_PER_DAY) + 1;
        if (daysActive > COMMERCIAL_BASE) daysActive = COMMERCIAL_BASE;
      }

      const valMensal = parseCurrency(c.ValorVigente || c.ValorMensal);
      const expected = (valMensal / COMMERCIAL_BASE) * daysActive;
      expectedTotal += expected;

      contractDetails.push({
        id: c.IdContratoLocacao,
        cliente: c.Cliente, 
        placa: c.Placa,
        dias: daysActive,
        esperado: expected,
        realizado: 0,
        gap: 0
      });
    });

    contractDetails.forEach(d => {
      if (d.id && realizedMap[String(d.id)]) d.realizado = realizedMap[String(d.id)];
      d.gap = d.realizado - d.esperado;
    });

    const filteredDetails = contractDetails.filter((d: any) =>
      searchTerm === '' || (d.cliente && d.cliente.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a: any, b: any) => a.gap - b.gap);

    return { expected: expectedTotal, realized: realizedTotal, gap: realizedTotal - expectedTotal, details: filteredDetails };
  }, [selectedMonth, financeiro, contratos, searchTerm]);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Financial Core</Title><Text className="text-slate-500">Gestão de Receita e Auditoria</Text></div>
        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex gap-2"><Wallet className="w-4 h-4" /> Hub Financeiro</div>
      </div>

      {/* Botão Limpar Filtros Flutuante */}
      {(filterState.mes || filterState.cliente) && (
        <div className="fixed bottom-8 right-8 z-50">
          <button onClick={clearFilters} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105">
            <X className="w-5 h-5" /> Limpar Filtros
          </button>
        </div>
      )}

      {/* Filtros Ativos */}
      {(filterState.mes || filterState.cliente) && (
        <Card className="bg-blue-50 border-blue-200 py-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <Text className="font-medium text-blue-700">Filtros Ativos:</Text>
            {filterState.mes && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">Mês: {monthLabel(filterState.mes)}</span>}
            {filterState.cliente && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">Cliente: {filterState.cliente}</span>}
          </div>
        </Card>
      )}

      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
        <button onClick={() => setActiveTab(0)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === 0 ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Visão Geral</button>
        <button onClick={() => setActiveTab(1)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === 1 ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Auditoria de Receita</button>
      </div>

      {activeTab === 0 && (
        <>
          <Card className="bg-white shadow-sm border border-slate-200">
            <Text className="font-medium mb-2">Filtros Globais</Text>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Text className="text-xs text-slate-500">Período</Text>
                <div className="flex gap-2">
                  <input type="date" className="border p-1 rounded w-full text-sm outline-none" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  <input type="date" className="border p-1 rounded w-full text-sm outline-none" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>
              <div>
                <Text className="text-xs text-slate-500">Cliente (Multi-seleção)</Text>
                <select multiple className="w-full border rounded p-1 text-sm h-10 outline-none" value={selectedClientes} onChange={e => setSelectedClientes(Array.from(e.target.selectedOptions).map(o => o.value))}>
                  {clientesList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button className="bg-slate-100 hover:bg-slate-200 text-slate-600 w-full py-1.5 rounded text-sm transition-colors" onClick={() => { setDateFrom(`${currentYear}-01-01`); setDateTo(`${currentYear}-12-31`); setSelectedClientes([]) }}>Resetar Ano Atual</button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card decoration="top" decorationColor="blue"><Text>Receita Core (Locação)</Text><Metric>{fmtBRL(kpisOverview.faturamentoLocacao)}</Metric></Card>
            <Card decoration="top" decorationColor="emerald"><Text>Receita Total</Text><Metric>{fmtBRL(kpisOverview.faturamentoTotal)}</Metric></Card>
            <Card decoration="top" decorationColor="violet"><Text>Ticket Médio</Text><Metric>{fmtBRL(kpisOverview.ticket)}</Metric></Card>
            <Card decoration="top" decorationColor="amber"><Text>Veículos Faturados</Text><Metric>{kpisOverview.veiculos}</Metric></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <Title>Evolução Mensal (Clique para filtrar)</Title>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyOverview}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis yAxisId="left" fontSize={12} tickFormatter={fmtCompact} />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={fmtCompact} />
                    <Tooltip formatter={(v: any) => fmtBRL(v)} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="faturamentoLocacao" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Locação" onClick={(d) => setFilterState(p => ({ ...p, mes: p.mes === d.date ? null : d.date }))} cursor="pointer" />
                    <Line yAxisId="right" type="monotone" dataKey="ticket" stroke="#10b981" strokeWidth={2} name="Ticket Médio" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <Title>Top 10 Clientes (Clique para filtrar)</Title>
              <div className="mt-4 overflow-y-auto max-h-80 space-y-2">
                {/* Custom List replacing BarList to allow onClick */}
                {topClients.map((item) => {
                  const isSelected = filterState.cliente === item.name;
                  const maxValue = topClients[0]?.value || 1;
                  const width = `${(item.value / maxValue) * 100}%`;
                  
                  return (
                    <div 
                      key={item.name} 
                      onClick={() => setFilterState(p => ({ ...p, cliente: isSelected ? null : item.name }))}
                      className={`group cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`truncate max-w-[70%] font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{item.name}</span>
                        <span className="text-slate-600">{fmtCompact(item.value)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${isSelected ? 'bg-blue-600' : 'bg-blue-400 group-hover:bg-blue-500'}`} 
                          style={{ width }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}

      {activeTab === 1 && (
        <Card>
          <div className="flex justify-between items-center mb-6">
            <Title>Revenue Assurance (Previsto vs Realizado)</Title>
            <div className="w-48">
                <Text className="text-xs text-slate-500 mb-1">Mês de Referência</Text>
                <select className="border p-2 rounded text-sm w-full outline-none" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-slate-50 border rounded"><Text>Esperado (Base 30)</Text><Metric className="text-blue-600">{fmtBRL(auditData.expected)}</Metric></div>
            <div className="p-4 bg-slate-50 border rounded"><Text>Realizado (Faturado)</Text><Metric className="text-emerald-600">{fmtBRL(auditData.realized)}</Metric></div>
            <div className="p-4 bg-slate-50 border rounded"><Text>Gap</Text><Metric className={auditData.gap < 0 ? 'text-red-600' : 'text-emerald-600'}>{fmtBRL(auditData.gap)}</Metric></div>
          </div>
          
          <div className="flex justify-between items-center mb-2">
             <Title>Detalhamento por Contrato</Title>
             <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input type="text" placeholder="Buscar cliente..." className="w-full pl-10 pr-4 py-2 border rounded-md text-sm outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             </div>
          </div>

          <div className="overflow-auto max-h-[500px] border rounded">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 sticky top-0 uppercase text-xs">
                <tr><th className="p-3">Cliente</th><th className="p-3">Placa</th><th className="p-3 text-center">Dias</th><th className="p-3 text-right">Esperado</th><th className="p-3 text-right">Realizado</th><th className="p-3 text-right">Gap</th></tr>
              </thead>
              <tbody>
                {auditData.details.slice(0, 100).map((d: any, i: number) => (
                  <tr key={i} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">{d.cliente}</td><td className="p-3 font-mono">{d.placa}</td>
                    <td className="p-3 text-center"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{d.dias}</span></td>
                    <td className="p-3 text-right text-blue-600">{fmtBRL(d.esperado)}</td>
                    <td className="p-3 text-right text-emerald-600">{fmtBRL(d.realizado)}</td>
                    <td className={`p-3 text-right font-bold ${d.gap < -1 ? 'text-red-600' : 'text-emerald-600'}`}>{fmtBRL(d.gap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}