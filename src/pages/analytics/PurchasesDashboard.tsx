import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList, DonutChart } from '@tremor/react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { ShoppingBag, Filter, ShieldAlert } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  if (typeof v === 'string') {
    const s = v.replace(/[R$\s.]/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }
  return 0;
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
export default function PurchasesDashboard(): JSX.Element {
  // Hooks de Dados
  const { data: rawData } = useBIData<AnyObject[]>('compras_full.json');
  const { data: rawAlienacoes } = useBIData<AnyObject[]>('alienacoes.json');

  const compras: AnyObject[] = useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    return (rawData as any)?.data || [];
  }, [rawData]);

  const alienacoes: AnyObject[] = useMemo(() => {
    if (Array.isArray(rawAlienacoes)) return rawAlienacoes;
    return (rawAlienacoes as any)?.data || [];
  }, [rawAlienacoes]);

  // Filtros Globais
  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [activeTab, setActiveTab] = useState(0);

  // Estados de Filtros Interativos
  const [activeFilters, setActiveFilters] = useState<{
    fornecedor: string | null;
    mes: string | null;
    montadora: string[];
    modelo: string[];
    banco: string[];
  }>({
    fornecedor: null,
    mes: null,
    montadora: [],
    modelo: [],
    banco: []
  });

  // Toggle de Visualização (Valor vs Qtd)
  const [viewModeFornecedor, setViewModeFornecedor] = useState<'valor' | 'qtd'>('valor');
  const [viewModeBanco, setViewModeBanco] = useState<'valor' | 'qtd'>('valor');

  const hasActiveFilters = useMemo(() => {
    return !!(activeFilters.fornecedor || activeFilters.mes || activeFilters.montadora.length > 0 || activeFilters.modelo.length > 0 || activeFilters.banco.length > 0);
  }, [activeFilters]);

  // Listas para Selects
  const filterOptions = useMemo(() => {
    return {
      montadoras: [...new Set(compras.map((r: AnyObject) => r.Montadora).filter(Boolean))].sort(),
      modelos: [...new Set(compras.map((r: AnyObject) => r.Modelo).filter(Boolean))].sort(),
      bancos: [...new Set(compras.map((r: AnyObject) => r.Banco).filter(Boolean))].sort(),
    };
  }, [compras]);

  const handleMultiSelectChange = (field: 'montadora' | 'modelo' | 'banco', value: string) => {
    setActiveFilters(prev => {
      const current = prev[field];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const clearInteractiveFilters = () => {
    setActiveFilters({ fornecedor: null, mes: null, montadora: [], modelo: [], banco: [] });
  };

  // --- FILTRAGEM MESTRA (COMPRAS) ---
  const filteredCompras = useMemo(() => {
    return compras.filter((r: AnyObject) => {
      const d = r.DataCompra;
      if (!d) return false;

      // Filtro de Data
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;

      // Filtros Interativos (AND Logic)
      if (activeFilters.fornecedor && r.Fornecedor !== activeFilters.fornecedor) return false;
      if (activeFilters.mes && getMonthKey(r.DataCompra) !== activeFilters.mes) return false;
      if (activeFilters.montadora.length > 0 && !activeFilters.montadora.includes(r.Montadora)) return false;
      if (activeFilters.modelo.length > 0 && !activeFilters.modelo.includes(r.Modelo)) return false;
      if (activeFilters.banco.length > 0 && !activeFilters.banco.includes(r.Banco)) return false;

      return true;
    });
  }, [compras, dateFrom, dateTo, activeFilters]);

  // --- FILTRAGEM CRUZADA (ALIENAÇÕES) ---
  const filteredAlienacoes = useMemo(() => {
    const placasVisiveis = new Set(filteredCompras.map((c: AnyObject) => c.Placa));
    const isFiltering = hasActiveFilters || (dateFrom !== `${currentYear}-01-01`);

    if (!isFiltering) return alienacoes;

    return alienacoes.filter((a: AnyObject) => placasVisiveis.has(a.Placa));
  }, [alienacoes, filteredCompras, hasActiveFilters, dateFrom, currentYear]);


  // --- CÁLCULOS ABA 1: AQUISIÇÃO ---
  const acquisitionKPIs = useMemo(() => {
    const totalInvest = filteredCompras.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorCompra), 0);
    const count = filteredCompras.length;
    const totalAcessorios = filteredCompras.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorAcessorios), 0);

    let somaDesagio = 0;
    let countDesagio = 0;
    filteredCompras.forEach((r: AnyObject) => {
      const compra = parseCurrency(r.ValorCompra);
      const fipe = parseCurrency(r.ValorFipeNaCompra || r.ValorFipeCompra || 0);
      if (fipe > 0 && compra > 0) {
        somaDesagio += (1 - (compra / fipe));
        countDesagio++;
      }
    });
    const avgDesagio = countDesagio > 0 ? (somaDesagio / countDesagio) * 100 : 0;

    return { totalInvest, count, totalAcessorios, avgDesagio };
  }, [filteredCompras]);

  const supplierRanking = useMemo(() => {
    const map: Record<string, number> = {};
    filteredCompras.forEach((r: AnyObject) => {
      const f = r.Fornecedor || 'Desconhecido';
      const val = viewModeFornecedor === 'valor' ? parseCurrency(r.ValorCompra) : 1;
      map[f] = (map[f] || 0) + val;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredCompras, viewModeFornecedor]);

  const evolutionData = useMemo(() => {
    const map: Record<string, { Valor: number, Qtd: number }> = {};
    filteredCompras.forEach((r: AnyObject) => {
      const k = getMonthKey(r.DataCompra);
      if (!k) return;
      if (!map[k]) map[k] = { Valor: 0, Qtd: 0 };
      map[k].Valor += parseCurrency(r.ValorCompra);
      map[k].Qtd += 1;
    });
    return Object.keys(map).sort().map(k => ({
      date: k,
      label: monthLabel(k),
      ...map[k]
    }));
  }, [filteredCompras]);

  // --- CÁLCULOS ABA 2: FUNDING (ORIGEM) ---
  const fundingKPIs = useMemo(() => {
    const totalFinanced = filteredCompras.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorFinanciado), 0);
    const totalInvest = acquisitionKPIs.totalInvest;
    const leverage = totalInvest > 0 ? (totalFinanced / totalInvest) * 100 : 0;
    return { totalFinanced, leverage };
  }, [filteredCompras, acquisitionKPIs]);

  const capitalMix = useMemo(() => {
    const totalInvest = acquisitionKPIs.totalInvest;
    const totalFinanced = fundingKPIs.totalFinanced;
    return [
      { name: 'Recurso Próprio', value: Math.max(0, totalInvest - totalFinanced) },
      { name: 'Financiado', value: totalFinanced }
    ];
  }, [acquisitionKPIs, fundingKPIs]);

  // --- CÁLCULOS ABA 3: SAÚDE FINANCEIRA (DÍVIDA ATUAL) ---
  const debtKPIs = useMemo(() => {
    const saldoDevedor = filteredAlienacoes.reduce((s: number, r: AnyObject) => s + parseCurrency(r.SaldoRemanescente || r.SaldoDevedor), 0);
    const fluxoMensal = filteredAlienacoes.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorParcela), 0);
    const contratos = filteredAlienacoes.length;
    return { saldoDevedor, fluxoMensal, contratos };
  }, [filteredAlienacoes]);

  const debtByBank = useMemo(() => {
    const map: Record<string, number> = {};
    filteredAlienacoes.forEach((r: AnyObject) => {
      const b = r.Banco || r.Instituicao || 'Outros';
      const val = viewModeBanco === 'valor' ? parseCurrency(r.SaldoRemanescente || r.SaldoDevedor) : 1;
      map[b] = (map[b] || 0) + val;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredAlienacoes, viewModeBanco]);

  // --- CÁLCULOS ABA 4: AUDITORIA ---
  const auditList = useMemo(() => {
    return filteredCompras.map((r: AnyObject) => {
      const compra = parseCurrency(r.ValorCompra);
      const fipe = parseCurrency(r.ValorFipeNaCompra || r.ValorFipeCompra || 0);
      const acessorios = parseCurrency(r.ValorAcessorios);

      const anomalies = [];
      if (fipe > 0 && compra > fipe) anomalies.push('Ágio (Acima da FIPE)');
      if (compra > 0 && (acessorios / compra) > 0.15) anomalies.push('Acessórios Excessivos (> 15%)');

      if (anomalies.length === 0) return null;

      return {
        ...r,
        compra, fipe,
        diff: compra - fipe,
        reason: anomalies.join(', ')
      };
    }).filter(Boolean);
  }, [filteredCompras]);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title className="text-slate-900">Gestão de Compras 2.0</Title>
          <Text className="text-slate-500">Visão integrada de aquisição, funding e compliance.</Text>
        </div>
        <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium flex gap-2">
          <ShoppingBag className="w-4 h-4" /> Hub Compras
        </div>
      </div>

      {/* FILTROS GLOBAIS */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-500" />
          <Text className="font-medium text-slate-700">Filtros de Análise</Text>
          {hasActiveFilters && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Ativos</span>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Período</label>
            <div className="flex gap-2">
              <input type="date" className="border rounded p-2 text-sm w-full" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <input type="date" className="border rounded p-2 text-sm w-full" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          {['montadora', 'modelo', 'banco'].map((field) => (
            <div key={field}>
              <label className="text-xs text-slate-500 block mb-1 capitalize">{field}</label>
              <select className="border rounded p-2 text-sm w-full" onChange={e => e.target.value && handleMultiSelectChange(field as any, e.target.value)} value="">
                <option value="">Selecione...</option>
                {(filterOptions[field + 's' as keyof typeof filterOptions] as string[]).map((opt: string) => (
                  <option key={opt} value={opt} className={activeFilters[field as keyof typeof activeFilters]?.includes(opt) ? 'bg-emerald-100' : ''}>
                    {activeFilters[field as keyof typeof activeFilters]?.includes(opt) ? '✓ ' : ''}{opt}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex items-end">
            {hasActiveFilters && (
              <button onClick={clearInteractiveFilters} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm w-full transition-all">
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* TABS */}
      <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit">
        {['Aquisição e Eficiência', 'Funding (Origem)', 'Saúde Financeira (Dívida)', 'Auditoria (Compliance)'].map((tab, idx) => (
          <button key={idx} onClick={() => setActiveTab(idx)} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === idx ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* ABA 0: AQUISIÇÃO */}
      {activeTab === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card decoration="top" decorationColor="emerald"><Text>Total Investido</Text><Metric>{fmtCompact(acquisitionKPIs.totalInvest)}</Metric></Card>
            <Card decoration="top" decorationColor="emerald"><Text>Veículos</Text><Metric>{acquisitionKPIs.count}</Metric></Card>
            <Card decoration="top" decorationColor="blue"><Text>Deságio Médio</Text><Metric>{acquisitionKPIs.avgDesagio.toFixed(2)}%</Metric></Card>
            <Card decoration="top" decorationColor="violet"><Text>Acessórios</Text><Metric>{fmtCompact(acquisitionKPIs.totalAcessorios)}</Metric></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <Title>Evolução de Compras (Clique para filtrar)</Title>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={evolutionData} onClick={(e) => e && e.activePayload && setActiveFilters(prev => ({ ...prev, mes: prev.mes === e.activePayload![0].payload.date ? null : e.activePayload![0].payload.date }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis yAxisId="left" fontSize={12} tickFormatter={fmtCompact} />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="Valor" fill="#10b981" radius={[4, 4, 0, 0]} cursor="pointer">
                      {evolutionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={activeFilters.mes === entry.date ? '#047857' : '#10b981'} />
                      ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="Qtd" stroke="#f59e0b" strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <div className="flex justify-between items-center mb-4">
                <Title>Top Fornecedores</Title>
                <div className="flex text-xs bg-slate-100 rounded p-1">
                  <button onClick={() => setViewModeFornecedor('valor')} className={`px-2 py-1 rounded ${viewModeFornecedor === 'valor' ? 'bg-white shadow' : ''}`}>R$</button>
                  <button onClick={() => setViewModeFornecedor('qtd')} className={`px-2 py-1 rounded ${viewModeFornecedor === 'qtd' ? 'bg-white shadow' : ''}`}>Qtd</button>
                </div>
              </div>
              <div className="h-80 overflow-y-auto">
                <BarList data={supplierRanking} valueFormatter={viewModeFornecedor === 'valor' ? fmtCompact : undefined} color="emerald" />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ABA 1: FUNDING (ORIGEM) */}
      {activeTab === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card decoration="top" decorationColor="indigo">
              <Text>Total Financiado (Neste Período)</Text>
              <Metric>{fmtBRL(fundingKPIs.totalFinanced)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="indigo">
              <Text>Alavancagem (LTV)</Text>
              <Metric>{fundingKPIs.leverage.toFixed(1)}%</Metric>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Mix de Capital</Title>
              <DonutChart className="mt-6 h-60" data={capitalMix} category="value" index="name" valueFormatter={fmtCompact} colors={['emerald', 'indigo']} />
            </Card>
            <Card>
              <Title>Bancos Utilizados na Compra</Title>
              <Text className="text-xs text-slate-500">Baseado nos veículos filtrados</Text>
              <div className="mt-6 h-60 overflow-y-auto">
                <BarList
                  data={Object.entries(filteredCompras.reduce((acc: any, r: AnyObject) => {
                    const b = r.Banco || 'N/A';
                    acc[b] = (acc[b] || 0) + parseCurrency(r.ValorFinanciado);
                    return acc;
                  }, {})).map(([name, value]: any) => ({ name, value })).sort((a, b) => b.value - a.value)}
                  valueFormatter={fmtCompact}
                  color="indigo"
                />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ABA 2: SAÚDE FINANCEIRA (DÍVIDA ATUAL) */}
      {activeTab === 2 && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3">
            <ShieldAlert className="text-blue-600 w-6 h-6" />
            <div>
              <Text className="text-blue-900 font-medium">Filtro Inteligente Ativo</Text>
              <Text className="text-blue-700 text-sm">
                Os dados abaixo mostram a dívida atual APENAS dos veículos selecionados nos filtros acima (Ex: Se filtrou "Toyota", mostra a dívida dos Toyotas).
              </Text>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card decoration="top" decorationColor="rose"><Text>Saldo Devedor Atual</Text><Metric>{fmtBRL(debtKPIs.saldoDevedor)}</Metric></Card>
            <Card decoration="top" decorationColor="rose"><Text>Fluxo Mensal (Parcelas)</Text><Metric>{fmtBRL(debtKPIs.fluxoMensal)}</Metric></Card>
            <Card decoration="top" decorationColor="rose"><Text>Contratos Ativos</Text><Metric>{debtKPIs.contratos}</Metric></Card>
          </div>

          <Card>
            <div className="flex justify-between items-center mb-4">
              <Title>Exposição por Banco (Saldo Devedor)</Title>
              <div className="flex text-xs bg-slate-100 rounded p-1">
                <button onClick={() => setViewModeBanco('valor')} className={`px-2 py-1 rounded ${viewModeBanco === 'valor' ? 'bg-white shadow' : ''}`}>R$</button>
                <button onClick={() => setViewModeBanco('qtd')} className={`px-2 py-1 rounded ${viewModeBanco === 'qtd' ? 'bg-white shadow' : ''}`}>Qtd</button>
              </div>
            </div>
            <div className="h-80 overflow-y-auto">
              <BarList data={debtByBank} valueFormatter={viewModeBanco === 'valor' ? fmtCompact : undefined} color="rose" />
            </div>
          </Card>
        </div>
      )}

      {/* ABA 3: AUDITORIA */}
      {activeTab === 3 && (
        <Card>
          <Title className="mb-4">Compras Fora do Padrão</Title>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-2">Placa</th>
                  <th className="px-4 py-2">Modelo</th>
                  <th className="px-4 py-2 text-right">Compra</th>
                  <th className="px-4 py-2 text-right">FIPE Data</th>
                  <th className="px-4 py-2 text-center">Alerta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditList.map((r: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium">{r.Placa}</td>
                    <td className="px-4 py-2 text-slate-500">{r.Modelo}</td>
                    <td className="px-4 py-2 text-right">{fmtBRL(r.compra)}</td>
                    <td className="px-4 py-2 text-right">{fmtBRL(r.fipe)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{r.reason}</span>
                    </td>
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