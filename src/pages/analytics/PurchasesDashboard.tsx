import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { ShoppingBag, Filter, ShieldAlert, X } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number): string { return `R$ ${(v / 1000).toFixed(0)}k`; }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

export default function PurchasesDashboard(): JSX.Element {
  const { data: rawCompras } = useBIData<AnyObject[]>('dim_compras.json');
  const { data: rawAlienacoes } = useBIData<AnyObject[]>('dim_alienacoes.json');

  const compras = useMemo(() => Array.isArray(rawCompras) ? rawCompras : [], [rawCompras]);
  const alienacoes = useMemo(() => Array.isArray(rawAlienacoes) ? rawAlienacoes : [], [rawAlienacoes]);

  const placaSituacaoMap = useMemo(() => {
    const map: Record<string, string> = {};
    alienacoes.forEach((a: AnyObject) => { if (a.Placa) map[a.Placa] = a.Situacao || 'Financiado'; });
    return map;
  }, [alienacoes]);

  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const [filterState, setFilterState] = useState<{ fornecedor: string | null; mes: string | null; montadora: string | null; banco: string | null; }>({ fornecedor: null, mes: null, montadora: null, banco: null });

  const uniqueOptions = useMemo(() => ({
    montadoras: Array.from(new Set(compras.map(r => r.Montadora).filter(Boolean))).sort(),
    bancos: Array.from(new Set(compras.map(r => r.Banco).filter(Boolean))).sort()
  }), [compras]);

  const hasActiveFilters = !!(filterState.fornecedor || filterState.mes || filterState.montadora || filterState.banco);

  const filteredCompras = useMemo(() => {
    return compras.filter((r: AnyObject) => {
      const d = r.DataCompra;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (filterState.fornecedor && r.Fornecedor !== filterState.fornecedor) return false;
      if (filterState.mes && getMonthKey(d) !== filterState.mes) return false;
      if (filterState.montadora && r.Montadora !== filterState.montadora) return false;
      if (filterState.banco && r.Banco !== filterState.banco) return false;
      return true;
    });
  }, [compras, dateFrom, dateTo, filterState]);

  const filteredAlienacoes = useMemo(() => {
    const placasVisiveis = new Set(filteredCompras.map(c => c.Placa));
    return alienacoes.filter(a => placasVisiveis.has(a.Placa));
  }, [alienacoes, filteredCompras]);

  const acquisitionKPIs = useMemo(() => {
    const totalInvest = filteredCompras.reduce((s, r) => s + parseCurrency(r.ValorCompra), 0);
    const count = filteredCompras.length;
    const totalAcessorios = filteredCompras.reduce((s, r) => s + parseCurrency(r.ValorAcessorios), 0);
    let somaDesagio = 0, countDesagio = 0;
    filteredCompras.forEach(r => {
      const c = parseCurrency(r.ValorCompra);
      const f = parseCurrency(r.ValorFipeAtual);
      if (f > 0 && c > 0) { somaDesagio += (1 - (c / f)); countDesagio++; }
    });
    return { totalInvest, count, totalAcessorios, avgDesagio: countDesagio > 0 ? (somaDesagio / countDesagio) * 100 : 0 };
  }, [filteredCompras]);

  const fundingKPIs = useMemo(() => {
    const totalFinanced = filteredCompras.reduce((s, r) => s + parseCurrency(r.ValorFinanciado), 0);
    const leverage = acquisitionKPIs.totalInvest > 0 ? (totalFinanced / acquisitionKPIs.totalInvest) * 100 : 0;
    return { totalFinanced, leverage };
  }, [filteredCompras, acquisitionKPIs]);

  const debtKPIs = useMemo(() => {
    const saldo = filteredAlienacoes.reduce((s, r) => s + parseCurrency(r.SaldoDevedor), 0);
    const fluxo = filteredAlienacoes.reduce((s, r) => s + parseCurrency(r.ValorParcela), 0);
    return { saldo, fluxo, contratos: filteredAlienacoes.length };
  }, [filteredAlienacoes]);

  const evolutionData = useMemo(() => {
    const map: any = {};
    filteredCompras.forEach(r => {
      const k = getMonthKey(r.DataCompra);
      if (!k) return;
      if (!map[k]) map[k] = { Valor: 0, Qtd: 0 };
      map[k].Valor += parseCurrency(r.ValorCompra);
      map[k].Qtd += 1;
    });
    return Object.keys(map).sort().map(k => ({ date: k, label: monthLabel(k), ...map[k] }));
  }, [filteredCompras]);

  const supplierData = useMemo(() => {
    const map: any = {};
    filteredCompras.forEach(r => {
      const f = r.Fornecedor || 'N/D';
      map[f] = (map[f] || 0) + parseCurrency(r.ValorCompra);
    });
    return Object.entries(map).map(([name, value]: any) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10);
  }, [filteredCompras]);

  const capitalMix = useMemo(() => {
    const prop = Math.max(0, acquisitionKPIs.totalInvest - fundingKPIs.totalFinanced);
    return [{ name: 'Recurso Próprio', value: prop }, { name: 'Financiado', value: fundingKPIs.totalFinanced }];
  }, [acquisitionKPIs, fundingKPIs]);

  const bankData = useMemo(() => {
    const map: any = {};
    filteredCompras.forEach(r => {
      const b = r.Banco || 'N/D';
      map[b] = (map[b] || 0) + parseCurrency(r.ValorFinanciado);
    });
    return Object.entries(map).map(([name, value]: any) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filteredCompras]);

  const auditList = useMemo(() => {
    return filteredCompras.map(r => {
      const compra = parseCurrency(r.ValorCompra);
      const fipe = parseCurrency(r.ValorFipeAtual);
      const access = parseCurrency(r.ValorAcessorios);
      const anomalies = [];
      if (fipe > 0 && compra > (fipe * 1.15)) anomalies.push('Valor > 115% FIPE');
      if (compra > 0 && (access / compra) > 0.20) anomalies.push('Acessórios > 20%');
      if (anomalies.length === 0) return null;
      return { ...r, compra, fipe, anomalies: anomalies.join(', ') };
    }).filter(Boolean);
  }, [filteredCompras]);

  const tableData = useMemo(() => {
    return filteredCompras.map(r => {
        const compra = parseCurrency(r.ValorCompra);
        const fipe = parseCurrency(r.ValorFipeAtual);
        const situacao = placaSituacaoMap[r.Placa] || 'Quitado/Próprio';
        
        // Aqui definimos um novo objeto com tipos explícitos para o TS não reclamar
        return {
            Placa: r.Placa,
            Modelo: r.Modelo,
            Fornecedor: r.Fornecedor,
            compra, 
            fipe, 
            pct: fipe > 0 ? (compra/fipe)*100 : 0,
            situacao
        };
    });
  }, [filteredCompras, placaSituacaoMap]);

  const pageItems = tableData.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Gestão de Compras</Title><Text className="text-slate-500">Aquisição, Funding e Compliance.</Text></div>
        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex gap-2"><ShoppingBag className="w-4 h-4"/> Hub Ativos</div>
      </div>

      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4"><Filter className="w-4 h-4 text-slate-500"/><Text className="font-medium text-slate-700">Filtros</Text></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
                <Text className="text-xs text-slate-500 mb-1">Período</Text>
                <div className="flex gap-2">
                    <input type="date" className="border p-2 rounded text-sm w-full" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    <input type="date" className="border p-2 rounded text-sm w-full" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
            </div>
            <div>
                <Text className="text-xs text-slate-500 mb-1">Montadora</Text>
                <select className="border p-2 rounded text-sm w-full" value={filterState.montadora || ''} onChange={e => setFilterState(p => ({...p, montadora: e.target.value || null}))}>
                    <option value="">Todas</option>
                    {uniqueOptions.montadoras.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
            <div>
                <Text className="text-xs text-slate-500 mb-1">Banco</Text>
                <select className="border p-2 rounded text-sm w-full" value={filterState.banco || ''} onChange={e => setFilterState(p => ({...p, banco: e.target.value || null}))}>
                    <option value="">Todos</option>
                    {uniqueOptions.bancos.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
            </div>
            <div className="flex items-end">
                {hasActiveFilters && (
                    <button onClick={() => setFilterState({ fornecedor: null, mes: null, montadora: null, banco: null })} className="bg-slate-100 text-slate-700 px-4 py-2 rounded text-sm flex items-center gap-2 hover:bg-slate-200"><X size={14}/> Limpar Filtros</button>
                )}
            </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
            {filterState.fornecedor && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Fornecedor: {filterState.fornecedor}</span>}
            {filterState.mes && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Mês: {monthLabel(filterState.mes)}</span>}
        </div>
      </Card>

      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
        {['Aquisição', 'Funding', 'Auditoria'].map((tab, idx) => (
            <button key={idx} onClick={() => setActiveTab(idx)} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === idx ? 'bg-white shadow text-blue-600' : 'text-slate-600'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card decoration="top" decorationColor="blue"><Text>Investimento Total</Text><Metric>{fmtCompact(acquisitionKPIs.totalInvest)}</Metric></Card>
                <Card decoration="top" decorationColor="emerald"><Text>Deságio Médio (vs FIPE)</Text><Metric>{acquisitionKPIs.avgDesagio.toFixed(1)}%</Metric></Card>
                <Card decoration="top" decorationColor="amber"><Text>Acessórios</Text><Metric>{fmtCompact(acquisitionKPIs.totalAcessorios)}</Metric></Card>
                <Card decoration="top" decorationColor="violet"><Text>Veículos</Text><Metric>{acquisitionKPIs.count}</Metric></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <Title>Evolução de Compras (Clique para filtrar)</Title>
                    <div className="h-72 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={evolutionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="label" fontSize={12}/>
                                <YAxis yAxisId="left" fontSize={12} tickFormatter={fmtCompact}/>
                                <YAxis yAxisId="right" orientation="right" fontSize={12}/>
                                <Tooltip formatter={(v:any, n) => [n==='Valor'?fmtBRL(v):v, n]}/>
                                <Bar yAxisId="left" dataKey="Valor" fill="#3b82f6" radius={[4,4,0,0]} onClick={(d) => setFilterState(p => ({...p, mes: p.mes === d.date ? null : d.date}))} cursor="pointer">
                                    {evolutionData.map((e, i) => <Cell key={i} fill={filterState.mes === e.date ? '#2563eb' : '#93c5fd'} />)}
                                </Bar>
                                <Line yAxisId="right" type="monotone" dataKey="Qtd" stroke="#f59e0b" strokeWidth={2}/>
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <Title>Top Fornecedores (R$)</Title>
                    <div className="mt-4 space-y-2 h-72 overflow-y-auto">
                        {supplierData.map((item: any, idx: number) => {
                            const isSelected = filterState.fornecedor === item.name;
                            return (
                                <div key={idx} onClick={() => setFilterState(p => ({...p, fornecedor: isSelected ? null : item.name}))} className={`p-2 rounded cursor-pointer flex justify-between text-sm ${isSelected ? 'bg-blue-100 ring-1 ring-blue-500' : 'hover:bg-slate-50'}`}>
                                    <span className="truncate max-w-[70%]">{item.name}</span>
                                    <span className="font-bold">{fmtCompact(item.value)}</span>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            <Card>
                <Title className="mb-4">Detalhamento</Title>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                            <tr><th className="p-3">Placa</th><th className="p-3">Modelo</th><th className="p-3">Fornecedor</th><th className="p-3 text-right">Compra</th><th className="p-3 text-right">FIPE</th><th className="p-3 text-center">% FIPE</th><th className="p-3">Situação</th></tr>
                        </thead>
                        <tbody>
                            {pageItems.map((r, i) => (
                                <tr key={i} className="border-t hover:bg-slate-50">
                                    <td className="p-3 font-mono">{r.Placa}</td>
                                    <td className="p-3">{r.Modelo}</td>
                                    <td className="p-3 truncate max-w-[150px]">{r.Fornecedor}</td>
                                    <td className="p-3 text-right font-bold">{fmtBRL(r.compra)}</td>
                                    <td className="p-3 text-right text-slate-500">{fmtBRL(r.fipe)}</td>
                                    <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs ${r.pct <= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{r.pct.toFixed(1)}%</span></td>
                                    <td className="p-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{r.situacao}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-between mt-4">
                    <Text className="text-sm">Página {page + 1} de {Math.ceil(tableData.length / pageSize)}</Text>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">←</button>
                        <button onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= tableData.length} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">→</button>
                    </div>
                </div>
            </Card>
        </div>
      )}

      {activeTab === 1 && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card decoration="top" decorationColor="purple"><Text>Total Financiado</Text><Metric>{fmtCompact(fundingKPIs.totalFinanced)}</Metric></Card>
                <Card decoration="top" decorationColor="indigo"><Text>Alavancagem (LTV)</Text><Metric>{fundingKPIs.leverage.toFixed(1)}%</Metric></Card>
                <Card decoration="top" decorationColor="rose"><Text>Saldo Devedor (Atual)</Text><Metric>{fmtCompact(debtKPIs.saldo)}</Metric></Card>
                <Card decoration="top" decorationColor="cyan"><Text>Contratos de Dívida</Text><Metric>{debtKPIs.contratos}</Metric></Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <Title>Mix de Capital</Title>
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={capitalMix} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    <Cell fill="#10b981" />
                                    <Cell fill="#8b5cf6" />
                                </Pie>
                                <Tooltip formatter={fmtBRL} />
                                <Legend verticalAlign="bottom"/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <Title>Top Bancos (Financiado)</Title>
                    <div className="mt-4 space-y-2 h-64 overflow-y-auto">
                        {bankData.map((item: any, idx: number) => {
                            const isSelected = filterState.banco === item.name;
                            return (
                                <div key={idx} onClick={() => setFilterState(p => ({...p, banco: isSelected ? null : item.name}))} className={`p-2 rounded cursor-pointer flex justify-between text-sm ${isSelected ? 'bg-purple-100 ring-1 ring-purple-500' : 'hover:bg-slate-50'}`}>
                                    <span className="truncate">{item.name}</span>
                                    <span className="font-bold">{fmtCompact(item.value)}</span>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
      )}

      {activeTab === 2 && (
        <Card>
            <div className="flex items-center gap-2 mb-4 text-amber-600">
                <ShieldAlert />
                <Title className="text-amber-700">Anomalias Detectadas</Title>
            </div>
            {auditList.length > 0 ? (
                <table className="w-full text-sm text-left">
                    <thead className="bg-amber-50 text-amber-800">
                        <tr><th className="p-3">Placa</th><th className="p-3">Modelo</th><th className="p-3 text-right">Compra</th><th className="p-3 text-right">FIPE</th><th className="p-3">Alerta</th></tr>
                    </thead>
                    <tbody>
                        {auditList.map((r: any, i: number) => (
                            <tr key={i} className="border-t hover:bg-slate-50">
                                <td className="p-3 font-mono">{r.Placa}</td>
                                <td className="p-3">{r.Modelo}</td>
                                <td className="p-3 text-right">{fmtBRL(r.compra)}</td>
                                <td className="p-3 text-right">{fmtBRL(r.fipe)}</td>
                                <td className="p-3"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{r.anomalies}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="text-center py-10 text-emerald-600"><Text>Nenhuma anomalia crítica encontrada nos filtros atuais.</Text></div>
            )}
        </Card>
      )}
    </div>
  );
}