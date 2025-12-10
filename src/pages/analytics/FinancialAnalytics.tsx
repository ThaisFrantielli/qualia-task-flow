import { useMemo, useState, useEffect } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList } from '@tremor/react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart } from 'recharts';
import { Wallet, Search } from 'lucide-react';

type AnyObject = { [k: string]: any };
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// --- FUNÇÕES AUXILIARES ---

// Garante chave de mês consistente (YYYY-MM) ignorando fuso horário
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

// Converte strings financeiras ou números para Float seguro
function parseCurrency(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  let s = String(v).trim();
  if (s === '') return 0;
  // Remove R$ e espaços
  s = s.replace(/R\$|\s/g, '');
  // Tratamento para formato brasileiro
  if (s.includes(',') && !s.includes('.')) {
    // '1234,56' -> '1234.56'
    s = s.replace(',', '.');
  } else if (s.includes('.') && s.includes(',')) {
    // '1.234.567,89' -> '1234567.89'
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes('.') && !s.includes(',')) {
    // Ambiguous: could be '1234.56' (decimal) or '1.234' (thousands).
    // Heuristic: if dot groups look like thousands (e.g. 1.234 or 12.345.678) remove dots.
    if (/^[-+]?\d{1,3}(?:\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    }
    // otherwise keep dot as decimal separator
  }
  // Remove tudo que não é dígito, ponto ou sinal
  s = s.replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Tenta ler várias chaves possíveis para quantidade de veículos
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
  // Hooks de Dados (ETL)
  const { data: financeiroData } = useBIData<AnyObject[]>('fat_faturamento_*.json');
  const { data: contratosData } = useBIData<AnyObject[]>('dim_contratos.json');
  const { data: lancamentosData } = useBIData<AnyObject[]>('fat_lancamentos_*.json');

  // Normalização de Arrays
  const financeiro = useMemo(() => {
    const raw = (financeiroData as any)?.data || financeiroData || [];
    return Array.isArray(raw) ? raw : [];
  }, [financeiroData]);

  const contratos = useMemo(() => {
    const raw = (contratosData as any)?.data || contratosData || [];
    return Array.isArray(raw) ? raw : [];
  }, [contratosData]);

  const lancamentos = useMemo(() => {
    const raw = (lancamentosData as any)?.data || lancamentosData || [];
    return Array.isArray(raw) ? raw : [];
  }, [lancamentosData]);

  // Estados de Controle
  const [activeTab, setActiveTab] = useState(0);
  const currentYear = new Date().getFullYear();

  // Filtros Visão Geral
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);

  // Filtros Auditoria
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Debug toggle
  const [showDebug, setShowDebug] = useState(false);

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

  // Seleciona mês inicial automaticamente
  useEffect(() => {
    if (!selectedMonth && availableMonths.length > 0) setSelectedMonth(availableMonths[0]);
  }, [availableMonths, selectedMonth]);


  // === CÁLCULOS ABA 1: VISÃO GERAL ===

  // Filtra dados pelo período selecionado (compara strings de data)
  const filteredFin = useMemo(() => {
    return financeiro.filter((r) => {
      const d = r.DataCompetencia || r.DataEmissao || r.Data;
      if (!d) return false;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (selectedClientes.length > 0 && !selectedClientes.includes(String(r.Cliente))) return false;
      return true;
    });
  }, [financeiro, dateFrom, dateTo, selectedClientes]);

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

  // === CÁLCULOS ABA 3: INADIMPLÊNCIA (AGING) ===
  const inadimplenciaData = useMemo(() => {
    const hoje = new Date();
    const aging = {
      'A Vencer': 0,
      '1-30 dias': 0,
      '31-60 dias': 0,
      '61-90 dias': 0,
      '+90 dias': 0
    };
    
    const devedoresList: any[] = [];
    const clienteMap: Record<string, number> = {};
    
    lancamentos.forEach(l => {
      // Filtrar apenas contas a receber não pagas
      if (l.TipoLancamento !== 'Receber' && l.TipoLancamento !== 'Receita') return;
      if (l.PagoRecebido === 'Sim' || l.PagoRecebido === true) return;
      
      const valor = parseCurrency(l.ValorBruto || l.ValorLiquido || l.ValorPagoRecebido);
      if (valor <= 0) return;
      
      const dataVencimento = l.DataVencimento || l.DataCompetencia;
      if (!dataVencimento) return;
      
      const venc = new Date(dataVencimento);
      const diffTime = hoje.getTime() - venc.getTime();
      const diffDays = Math.floor(diffTime / MS_PER_DAY);
      
      if (diffDays < 0) aging['A Vencer'] += valor;
      else if (diffDays <= 30) aging['1-30 dias'] += valor;
      else if (diffDays <= 60) aging['31-60 dias'] += valor;
      else if (diffDays <= 90) aging['61-90 dias'] += valor;
      else aging['+90 dias'] += valor;
      
      const cliente = l.PagarReceberDe || 'N/D';
      clienteMap[cliente] = (clienteMap[cliente] || 0) + valor;
    });
    
    Object.entries(clienteMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([name, value]) => {
        devedoresList.push({ name, value });
      });
    
    const agingChart = Object.entries(aging).map(([name, value]) => ({ name, value }));
    
    return {
      aging: agingChart,
      topDevedores: devedoresList,
      totalInadimplencia: Object.values(aging).reduce((s, v) => s + v, 0)
    };
  }, [lancamentos]);

  // === CÁLCULOS ABA 4: MIX DE RECEITA ===
  const mixReceitaData = useMemo(() => {
    const map: Record<string, number> = {};
    
    lancamentos.forEach(l => {
      if (l.TipoLancamento !== 'Receber' && l.TipoLancamento !== 'Receita') return;
      
      const natureza = l.Natureza || 'Outros';
      const valor = parseCurrency(l.ValorBruto || l.ValorLiquido || l.ValorPagoRecebido);
      
      if (valor > 0) {
        map[natureza] = (map[natureza] || 0) + valor;
      }
    });
    
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [lancamentos]);


  // === CÁLCULOS ABA 2: AUDITORIA (REVENUE ASSURANCE) ===
  const auditData = useMemo(() => {
    if (!selectedMonth) return { expected: 0, realized: 0, gap: 0, details: [] };

    // --- 1. REALIZADO (Soma dos Itens da Nota) ---
    const itemsInMonth = financeiro.filter(f => getMonthKey(f.DataCompetencia || f.DataEmissao || f.Data) === selectedMonth);
    const realizedTotal = itemsInMonth.reduce((s, i) => s + parseCurrency(i.ValorFaturadoItem || i.ValorTotal || i.ValorLocacao), 0);

    // Mapeia Realizado por Contrato (se IdContratoLocacao disponível)
    const realizedMap: Record<string, number> = {};
    itemsInMonth.forEach(item => {
      const val = parseCurrency(item.ValorFaturadoItem || item.ValorTotal || item.ValorLocacao);
      if (item.IdContratoLocacao) {
        realizedMap[String(item.IdContratoLocacao)] = (realizedMap[String(item.IdContratoLocacao)] || 0) + val;
      }
    });

    // --- 2. PREVISTO (Cálculo Comercial Base 30) ---
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

    // --- 3. CRUZAMENTO E GAP ---
    contractDetails.forEach(d => {
      if (d.id && realizedMap[String(d.id)]) {
        d.realizado = realizedMap[String(d.id)];
      }
      d.gap = d.realizado - d.esperado; // positivo = mais faturado que esperado
    });

    const filteredDetails = contractDetails.filter((d: any) =>
      searchTerm === '' ||
      (d.cliente && d.cliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.placa && d.placa.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Ordenação: maiores gaps negativos primeiro (mais défict)
    filteredDetails.sort((a: any, b: any) => a.gap - b.gap);

    return {
      expected: expectedTotal,
      realized: realizedTotal,
      gap: realizedTotal - expectedTotal,
      details: filteredDetails
    };

  }, [selectedMonth, financeiro, contratos, searchTerm]);

  // --- Diagnostic helpers (mostra diferenças de parsing) ---
  const diagnostics = useMemo(() => {
    const totalRows = financeiro.length;
    const sumNum = { valorLocacao: 0, valorTotal: 0, qtdVeiculos: 0 };
    const sumParsed = { valorLocacao: 0, valorTotal: 0, qtdVeiculos: 0 };
    let nanCounts = { valorLocacao: 0, valorTotal: 0, qtdVeiculos: 0 };
    const problematic: AnyObject[] = [];

    let realizedCountForMonth = 0;
    let realizedSumForMonth = 0;

    financeiro.forEach((r, i) => {
      const rawLoc = r.ValorLocacao ?? r.ValorFaturadoItem ?? r.ValorTotal;
      const rawTotal = r.ValorTotal ?? r.ValorFaturadoItem;
      const rawQtd = r.QtdVeiculos ?? r.QtdVeiculo ?? r.QuantidadeVeiculos ?? r.QuantidadeVeiculo ?? r.QtdVeic ?? r.qtdVeiculos ?? r.qtd ?? 0;

      const nLoc = Number(rawLoc);
      const nTot = Number(rawTotal);
      const nQtd = Number(rawQtd);

      const pLoc = parseCurrency(rawLoc);
      const pTot = parseCurrency(rawTotal);
      const pQtd = parseCurrency(rawQtd);

      if (!isFinite(nLoc)) nanCounts.valorLocacao++;
      if (!isFinite(nTot)) nanCounts.valorTotal++;
      if (!isFinite(nQtd)) nanCounts.qtdVeiculos++;

      sumNum.valorLocacao += isFinite(nLoc) ? nLoc : 0;
      sumNum.valorTotal += isFinite(nTot) ? nTot : 0;
      sumNum.qtdVeiculos += isFinite(nQtd) ? nQtd : 0;

      sumParsed.valorLocacao += pLoc;
      sumParsed.valorTotal += pTot;
      sumParsed.qtdVeiculos += pQtd;

      if (selectedMonth) {
        const ds = String(r.DataCompetencia || r.DataEmissao || r.Data || '');
        if (ds && getMonthKey(ds) === selectedMonth) {
          realizedCountForMonth += 1;
          realizedSumForMonth += pLoc;
        }
      }

      if (Math.abs((pLoc || 0) - (isFinite(nLoc) ? nLoc : 0)) > 0.001 || Math.abs((pTot || 0) - (isFinite(nTot) ? nTot : 0)) > 0.001 || Math.abs((pQtd || 0) - (isFinite(nQtd) ? nQtd : 0)) > 0.001) {
        problematic.push({ idx: i, Cliente: r.Cliente, ValorLocacao: rawLoc, ValorTotal: rawTotal, QtdVeiculos: rawQtd, parsed: { pLoc, pTot, pQtd }, num: { nLoc, nTot, nQtd } });
      }
    });

    const sampleKeys = financeiro.length > 0 ? Object.keys(financeiro[0]).slice(0, 40) : [];
    return { totalRows, sumNum, sumParsed, nanCounts, problematic: problematic.slice(0, 20), realizedCountForMonth, realizedSumForMonth, sampleKeys };
  }, [financeiro, selectedMonth]);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">Financial Core</Title>
          <Text className="mt-1 text-slate-500">Gestão financeira e auditoria de contratos.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Hub Financeiro
          </div>
        </div>
      </div>

      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
        <button onClick={() => setActiveTab(0)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === 0 ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Visão Geral</button>
        <button onClick={() => setActiveTab(1)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === 1 ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Auditoria de Receita</button>
        <button onClick={() => setActiveTab(2)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === 2 ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Inadimplência</button>
        <button onClick={() => setActiveTab(3)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === 3 ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Mix de Receita</button>
      </div>

      <div className="mt-3">
        <button onClick={() => setShowDebug(s => !s)} className="px-3 py-1 text-xs bg-slate-100 rounded-md border border-slate-200">{showDebug ? 'Ocultar Diagnóstico' : 'Mostrar Diagnóstico'}</button>
      </div>

      {showDebug && (
        <Card className="bg-white shadow-sm border border-red-100 mt-4">
          <Text className="text-red-600 font-medium mb-2">Diagnostic (ERP mismatch)</Text>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded">
              <Text className="text-slate-500 text-xs">Linhas processadas</Text>
              <Metric className="text-slate-900">{diagnostics.totalRows}</Metric>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <Text className="text-slate-500 text-xs">Soma ValorLocacao (Number)</Text>
              <Metric className="text-slate-900">{fmtBRL(diagnostics.sumNum.valorLocacao)}</Metric>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <Text className="text-slate-500 text-xs">Soma ValorLocacao (parse)</Text>
              <Metric className="text-slate-900">{fmtBRL(diagnostics.sumParsed.valorLocacao)}</Metric>
            </div>
          </div>

          <div className="mt-4">
            <Text className="text-slate-500 text-xs">Contagens NaN (Number parsing)</Text>
            <div className="flex gap-4 mt-2 text-xs text-slate-700">
              <div>ValorLocacao: {diagnostics.nanCounts.valorLocacao}</div>
              <div>ValorTotal: {diagnostics.nanCounts.valorTotal}</div>
              <div>QtdVeiculos: {diagnostics.nanCounts.qtdVeiculos}</div>
            </div>
          </div>

          <div className="mt-4">
            <Text className="text-slate-500 text-xs mb-2">Amostra de linhas com diferença de parse (até 20)</Text>
            <div className="overflow-x-auto max-h-48">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500"><th className="p-2">#</th><th>Cliente</th><th>ValorLocacao</th><th>ValorTotal</th><th>QtdVeiculos</th><th>parsed</th></tr>
                </thead>
                <tbody>
                  {diagnostics.problematic.map((p: any, i: number) => (
                    <tr key={i} className="odd:bg-white even:bg-slate-50">
                      <td className="p-2">{p.idx}</td>
                      <td className="p-2">{p.Cliente}</td>
                      <td className="p-2">{String(p.ValorLocacao)}</td>
                      <td className="p-2">{String(p.ValorTotal)}</td>
                      <td className="p-2">{String(p.QtdVeiculos)}</td>
                      <td className="p-2">Loc:{fmtBRL(p.parsed.pLoc)} Tot:{fmtBRL(p.parsed.pTot)} Qtd:{p.parsed.pQtd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* === CONTEÚDO DA VISÃO GERAL === */}
      {activeTab === 0 && (
        <>
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card decoration="top" decorationColor="blue" className="bg-white border border-slate-200">
              <Text>Receita Core (Locação)</Text>
              <Metric>{fmtBRL(kpisOverview.faturamentoLocacao)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="emerald" className="bg-white border border-slate-200">
              <Text>Receita Total (com Multas)</Text>
              <Metric>{fmtBRL(kpisOverview.faturamentoTotal)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="violet" className="bg-white border border-slate-200">
              <Text>Ticket Médio (Locação)</Text>
              <Metric>{fmtBRL(kpisOverview.ticket)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="blue" className="bg-white border border-slate-200">
              <Text>Veículos Faturados</Text>
              <Metric>{kpisOverview.veiculos}</Metric>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 bg-white border border-slate-200">
              <Title>Evolução Mensal</Title>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyOverview}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtCompact} />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtCompact} />
                    <Tooltip formatter={(v: any) => fmtBRL(v)} contentStyle={{ borderRadius: '8px' }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="faturamentoLocacao" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Receita (Locação)" />
                    <Line yAxisId="right" type="monotone" dataKey="ticket" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Ticket Médio" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="bg-white border border-slate-200">
              <Title>Top 10 Clientes</Title>
              <div className="mt-4 h-80 overflow-y-auto pr-2">
                <BarList data={topClients} valueFormatter={(v) => fmtBRL(v)} color="blue" />
              </div>
            </Card>
          </div>
        </>
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

      {/* === ABA 3: INADIMPLÊNCIA === */}
      {activeTab === 2 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card decoration="top" decorationColor="rose" className="bg-white border border-slate-200">
              <Text>Total Inadimplência</Text>
              <Metric className="text-rose-600">{fmtBRL(inadimplenciaData.totalInadimplencia)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="amber" className="bg-white border border-slate-200">
              <Text>Vencido +90 dias</Text>
              <Metric className="text-amber-600">{fmtBRL(inadimplenciaData.aging.find(a => a.name === '+90 dias')?.value || 0)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="orange" className="bg-white border border-slate-200">
              <Text>Vencido 61-90 dias</Text>
              <Metric>{fmtBRL(inadimplenciaData.aging.find(a => a.name === '61-90 dias')?.value || 0)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="yellow" className="bg-white border border-slate-200">
              <Text>Vencido 1-60 dias</Text>
              <Metric>{fmtBRL((inadimplenciaData.aging.find(a => a.name === '1-30 dias')?.value || 0) + (inadimplenciaData.aging.find(a => a.name === '31-60 dias')?.value || 0))}</Metric>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
            <Card className="bg-white border border-slate-200">
              <Title>Aging List - Distribuição por Faixa</Title>
              <div className="mt-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inadimplenciaData.aging}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtCompact} />
                    <Tooltip formatter={(v: any) => fmtBRL(v)} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="bg-white border border-slate-200">
              <Title>Top 10 Clientes Devedores</Title>
              <div className="mt-4 h-80 overflow-y-auto pr-2">
                <BarList data={inadimplenciaData.topDevedores} valueFormatter={(v) => fmtBRL(v)} color="rose" />
              </div>
            </Card>
          </div>
        </>
      )}

      {/* === ABA 4: MIX DE RECEITA === */}
      {activeTab === 3 && (
        <>
          <Card className="bg-white border border-slate-200 mb-6">
            <Title>Composição da Receita por Natureza</Title>
            <Text className="text-slate-500 mb-4">Distribuição da receita entre diferentes fontes (Locação, Multas, Reembolsos, etc.)</Text>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <div className="flex items-center justify-center h-full">
                    <div className="w-full max-w-md">
                      {mixReceitaData.slice(0, 6).map((item, idx) => {
                        const total = mixReceitaData.reduce((s, i) => s + i.value, 0);
                        const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                        return (
                          <div key={idx} className="mb-4">
                            <div className="flex justify-between items-center mb-1">
                              <Text className="text-sm font-medium text-slate-700">{item.name}</Text>
                              <Text className="text-sm font-bold text-slate-900">{percent}%</Text>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                              <div 
                                className="h-3 rounded-full transition-all"
                                style={{ 
                                  width: `${percent}%`, 
                                  backgroundColor: colors[idx % colors.length] 
                                }}
                              />
                            </div>
                            <Text className="text-xs text-slate-500 mt-1">{fmtBRL(item.value)}</Text>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ResponsiveContainer>
              </div>

              <div>
                <Title className="text-lg mb-4">Detalhamento por Natureza</Title>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {mixReceitaData.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <Text className="font-medium text-slate-700">{item.name}</Text>
                      <Metric className="text-slate-900 text-lg">{fmtBRL(item.value)}</Metric>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-slate-200">
            <Title>Evolução Mensal por Natureza (Top 5)</Title>
            <div className="h-80 mt-4">
              <Text className="text-sm text-slate-500 mb-2">Gráfico temporal em desenvolvimento - requer agregação por mês</Text>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}