import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, DonutChart } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ScatterChart, Scatter, Cell, ComposedChart } from 'recharts';
import { ShoppingBag, Filter, ShieldAlert } from 'lucide-react';

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

// Helper to safely get FIPE value with fallbacks
function getFipeValue(record: any): number {
  // Try multiple possible field names
  const fipeValue = record.ValorFipeNaCompra
    || record.ValorFipeCompra
    || record.ValorAtualFIPE
    || record.ValorFipe
    || 0;

  return parseCurrency(fipeValue);
}

function getMonthKey(dateString?: string): string {
  if (!dateString || typeof dateString !== 'string') return '';
  return dateString.split('T')[0].substring(0, 7);
}

// --- COMPONENTE PRINCIPAL ---
export default function PurchasesDashboard(): JSX.Element {
  // Novo Hook com dados ricos
  const { data: rawData } = useBIData<AnyObject[]>('compras_full.json');

  // Hook para dados de Alienação (Funding)
  const { data: rawAlienacoes } = useBIData<AnyObject[]>('alienacoes.json');

  const compras = useMemo(() => {
    const raw = (rawData as any)?.data || rawData || [];
    const result = Array.isArray(raw) ? raw : [];

    // Debug: Log first record to understand data structure
    if (result.length > 0) {
      console.log('🔍 DEBUG - First purchase record:', result[0]);
      console.log('🔍 DEBUG - ValorFipeNaCompra value:', result[0].ValorFipeNaCompra);
      console.log('🔍 DEBUG - Available fields:', Object.keys(result[0]));

      // Check for FIPE code variations
      console.log('🔍 DEBUG - CodigoFIPE:', result[0].CodigoFIPE);
      console.log('🔍 DEBUG - CodigoFipe:', result[0].CodigoFipe);
      console.log('🔍 DEBUG - codigoFIPE:', result[0].codigoFIPE);

      // Check for Situacao variations
      console.log('🔍 DEBUG - SituacaoVeiculo:', result[0].SituacaoVeiculo);
      console.log('🔍 DEBUG - SituacaoFinanceiraVeiculo:', result[0].SituacaoFinanceiraVeiculo);
    }

    return result;
  }, [rawData]);

  const alienacoes = useMemo(() => {
    const raw = (rawAlienacoes as any)?.data || rawAlienacoes || [];
    const result = Array.isArray(raw) ? raw : [];

    if (result.length > 0) {
      console.log('💰 DEBUG - First alienacao record:', result[0]);
      console.log('💰 DEBUG - Available alienacao fields:', Object.keys(result[0]));
    }

    return result;
  }, [rawAlienacoes]);

  // Filtros Globais
  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);

  // Tab State
  const [activeTab, setActiveTab] = useState(0);

  // ========== INTERACTIVE FILTERS (PowerBI-style) ==========
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

  // Check if any interactive filter is active
  const hasActiveFilters = useMemo(() => {
    return !!(
      activeFilters.fornecedor ||
      activeFilters.mes ||
      activeFilters.montadora.length > 0 ||
      activeFilters.modelo.length > 0 ||
      activeFilters.banco.length > 0
    );
  }, [activeFilters]);

  // Extract unique values for multi-select filters
  const filterOptions = useMemo(() => {
    const montadoras = [...new Set(compras.map(r => r.Montadora).filter(Boolean))].sort();
    const modelos = [...new Set(compras.map(r => r.Modelo).filter(Boolean))].sort();
    const fornecedores = [...new Set(compras.map(r => r.Fornecedor).filter(Boolean))].sort();
    const bancos = [...new Set(compras.map(r => r.Banco).filter(Boolean))].sort();
    return { montadoras, modelos, fornecedores, bancos };
  }, [compras]);

  // Multi-select filter handlers
  const handleMultiSelectChange = (field: 'montadora' | 'modelo' | 'banco', value: string) => {
    setActiveFilters(prev => {
      const currentValues = prev[field];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [field]: newValues };
    });
  };

  // Clear all interactive filters
  const clearInteractiveFilters = () => {
    setActiveFilters({
      fornecedor: null,
      mes: null,
      montadora: [],
      modelo: [],
      banco: []
    });
  };

  // ========== CHART CLICK HANDLERS (PowerBI-style) ==========

  const handleMonthClick = (mes: string) => {
    setActiveFilters(prev => ({
      ...prev,
      mes: prev.mes === mes ? null : mes // Toggle
    }));
  };

  const handleSupplierClick = (fornecedor: string) => {
    setActiveFilters(prev => ({
      ...prev,
      fornecedor: prev.fornecedor === fornecedor ? null : fornecedor // Toggle
    }));
  };

  // Dados Filtrados (Date Range + Interactive Filters with AND logic)
  const filteredData = useMemo(() => {
    return compras.filter(r => {
      // Date range filter
      const d = r.DataCompra;
      if (!d) return false;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;

      // Interactive filter: Fornecedor (single selection from chart click)
      if (activeFilters.fornecedor && r.Fornecedor !== activeFilters.fornecedor) {
        return false;
      }

      // Interactive filter: Mes (single selection from chart click)
      if (activeFilters.mes) {
        const recordMonth = getMonthKey(r.DataCompra);
        if (recordMonth !== activeFilters.mes) return false;
      }

      // Multi-select filter: Montadora (AND logic - must be in selected list)
      if (activeFilters.montadora.length > 0) {
        if (!activeFilters.montadora.includes(r.Montadora)) return false;
      }

      // Multi-select filter: Modelo (AND logic)
      if (activeFilters.modelo.length > 0) {
        if (!activeFilters.modelo.includes(r.Modelo)) return false;
      }

      // Multi-select filter: Banco (AND logic)
      if (activeFilters.banco.length > 0) {
        if (!activeFilters.banco.includes(r.Banco)) return false;
      }

      return true;
    });
  }, [compras, dateFrom, dateTo, activeFilters]);

  // --- ABA 1: AQUISIÇÃO E EFICIÊNCIA ---
  const acquisitionKPIs = useMemo(() => {
    const totalInvest = filteredData.reduce((s, r) => s + parseCurrency(r.ValorCompra), 0);
    const count = filteredData.length;
    const totalAcessorios = filteredData.reduce((s, r) => s + parseCurrency(r.ValorAcessorios), 0);

    // % FIPE/Compra Médio (quanto pagamos em relação à FIPE)
    let totalFipeCompra = 0;
    let validCount = 0;
    filteredData.forEach(r => {
      const fipe = getFipeValue(r);
      const compra = parseCurrency(r.ValorCompra);
      if (fipe > 0 && compra > 0) {
        totalFipeCompra += (compra / fipe) * 100;
        validCount++;
      }
    });
    const avgFipeCompra = validCount > 0 ? totalFipeCompra / validCount : 0;

    return { totalInvest, count, totalAcessorios, avgFipeCompra };
  }, [filteredData]);

  const supplierRanking = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      const f = r.Fornecedor || 'Desconhecido';
      map[f] = (map[f] || 0) + parseCurrency(r.ValorCompra);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  const evolutionData = useMemo(() => {
    const mapValor: Record<string, number> = {};
    const mapQtd: Record<string, number> = {};

    filteredData.forEach(r => {
      const k = getMonthKey(r.DataCompra);
      if (!k) return;
      mapValor[k] = (mapValor[k] || 0) + parseCurrency(r.ValorCompra);
      mapQtd[k] = (mapQtd[k] || 0) + 1;
    });

    return Object.keys(mapValor).sort().map(k => ({
      date: k,
      Valor: mapValor[k],
      Quantidade: mapQtd[k] || 0
    }));
  }, [filteredData]);

  const modelQuantityData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      const m = r.Modelo || 'Desconhecido';
      map[m] = (map[m] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 Models
  }, [filteredData]);



  const scatterData = useMemo(() => {
    return filteredData.map(r => ({
      x: new Date(r.DataCompra).getTime(),
      y: parseCurrency(r.ValorCompra),
      name: r.Modelo || 'Veículo'
    }));
  }, [filteredData]);

  // --- DETAILED ACQUISITIONS TABLE DATA ---
  const [acquisitionPage, setAcquisitionPage] = useState(0);
  const ACQUISITION_PAGE_SIZE = 15;

  const detailedAcquisitions = useMemo(() => {
    const hoje = new Date();

    return filteredData.map(r => {
      const valorCompra = parseCurrency(r.ValorCompra);
      const valorFipe = getFipeValue(r);
      const percentFipe = valorFipe > 0 ? (valorCompra / valorFipe) * 100 : 0;

      // Calcular tempo em frota (em meses)
      const dataCompra = r.DataCompra ? new Date(r.DataCompra) : null;
      let tempoEmFrota = 0;
      if (dataCompra && !isNaN(dataCompra.getTime())) {
        const diffTime = hoje.getTime() - dataCompra.getTime();
        tempoEmFrota = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30)); // meses aproximados
      }

      return {
        placa: r.Placa || 'N/A',
        montadora: r.Montadora || 'N/A',
        modelo: r.Modelo || 'N/A',
        ano: r.AnoFabricacao || 'N/A',
        cor: r.Cor || 'N/A',
        km: r.Km || r.Quilometragem || 'N/A',
        dataCompra: r.DataCompra,
        codigoFipe: r.CodigoFIPE || r.CodigoFipe || 'N/A',
        fornecedor: r.Fornecedor || 'N/A',
        valorCompra,
        valorFipe,
        percentFipe,
        situacao: r.SituacaoVeiculo || 'N/A',
        tempoEmFrota
      };
    }).sort((a, b) => b.valorCompra - a.valorCompra);
  }, [filteredData]);

  const paginatedAcquisitions = useMemo(() => {
    const start = acquisitionPage * ACQUISITION_PAGE_SIZE;
    return detailedAcquisitions.slice(start, start + ACQUISITION_PAGE_SIZE);
  }, [detailedAcquisitions, acquisitionPage]);

  const totalAcquisitionPages = Math.ceil(detailedAcquisitions.length / ACQUISITION_PAGE_SIZE);

  // --- ABA 2: FUNDING E DÍVIDA ---
  const fundingKPIs = useMemo(() => {
    const totalFinanced = filteredData.reduce((s, r) => s + parseCurrency(r.ValorFinanciado), 0);
    const totalCompra = filteredData.reduce((s, r) => s + parseCurrency(r.ValorCompra), 0);
    const leverage = totalCompra > 0 ? (totalFinanced / totalCompra) * 100 : 0;

    const totalParcela = filteredData.reduce((s, r) => s + parseCurrency(r.ValorParcela), 0);
    // Média de parcela por contrato financiado
    const financedCount = filteredData.filter(r => parseCurrency(r.ValorFinanciado) > 0).length;
    const avgParcela = financedCount > 0 ? totalParcela / financedCount : 0;

    return { totalFinanced, leverage, avgParcela };
  }, [filteredData]);

  const capitalMix = useMemo(() => {
    const totalCompra = filteredData.reduce((s, r) => s + parseCurrency(r.ValorCompra), 0);
    const totalFinanced = filteredData.reduce((s, r) => s + parseCurrency(r.ValorFinanciado), 0);
    const ownCapital = Math.max(0, totalCompra - totalFinanced);

    return [
      { name: 'Recurso Próprio', value: ownCapital },
      { name: 'Financiado (Dívida)', value: totalFinanced }
    ];
  }, [filteredData]);

  const debtByBank = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      const b = r.Banco || 'N/A';
      map[b] = (map[b] || 0) + parseCurrency(r.ValorFinanciado);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const maturitySchedule = useMemo(() => {
    // Estimativa: DataCompra + 36 meses
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      if (!r.DataCompra || parseCurrency(r.ValorFinanciado) <= 0) return;
      const d = new Date(r.DataCompra);
      d.setMonth(d.getMonth() + 36); // +3 anos
      const k = getMonthKey(d.toISOString());
      map[k] = (map[k] || 0) + parseCurrency(r.ValorFinanciado); // Valor total vencendo (simplificado)
    });
    return Object.keys(map).sort().map(k => ({
      date: k,
      Vencimento: map[k]
    }));
  }, [filteredData]);

  // --- ABA 3: AUDITORIA ---
  const [auditPage, setAuditPage] = useState(1);
  const AUDIT_PAGE_SIZE = 10;

  const auditList = useMemo(() => {
    return filteredData.map(r => {
      const compra = parseCurrency(r.ValorCompra);
      const fipe = getFipeValue(r);
      const acessorios = parseCurrency(r.ValorAcessorios);
      const anoFabricacao = parseInt(r.AnoFabricacao);
      const dataCompra = r.DataCompra ? new Date(r.DataCompra) : null;
      const hoje = new Date();

      const anomalies = [];

      // 1. Dados Incompletos
      if (!r.Placa || !r.Modelo) anomalies.push('Dados Incompletos (Placa/Modelo)');
      if (!r.Fornecedor) anomalies.push('Fornecedor N/A');

      // 2. Valores Zerados ou Suspeitos
      if (compra <= 1000) anomalies.push('Valor Compra Baixo/Zero');
      if (fipe <= 0) anomalies.push('FIPE Não Mapeada');
      if (anoFabricacao < 1990 || anoFabricacao > (hoje.getFullYear() + 2)) anomalies.push('Ano Fabricação Inválido');

      // 3. Datas Estranhas
      if (dataCompra && dataCompra > hoje) anomalies.push('Data Futura');
      if (dataCompra && dataCompra.getFullYear() < 2010) anomalies.push('Data Muito Antiga');

      // 4. Regras de Negócio
      if (compra > 0 && (acessorios / compra) > 0.20) anomalies.push('Acessórios Excessivos (>20%)');

      // Ágio apenas se for muito significativo (> 5% acima da FIPE)
      if (fipe > 0 && compra > (fipe * 1.05)) anomalies.push('Preço Acima da FIPE (>5%)');

      if (anomalies.length === 0) return null;

      const percentFipe = fipe > 0 ? (compra / fipe) * 100 : 0;

      return {
        placa: r.Placa || 'N/A',
        modelo: r.Modelo || 'N/A',
        fornecedor: r.Fornecedor || 'N/A',
        dataCompra: r.DataCompra,
        codigoFipe: r.CodigoFIPE || r.CodigoFipe || 'N/A',
        situacao: r.SituacaoVeiculo || 'N/A',
        compra,
        fipe,
        percentFipe,
        diff: compra - fipe,
        reason: anomalies.join(', ') // Join multiple errors
      };
    }).filter(Boolean) as any[];
  }, [filteredData]);

  // Paginated audit list
  const paginatedAuditList = useMemo(() => {
    const start = (auditPage - 1) * AUDIT_PAGE_SIZE;
    return auditList.slice(start, start + AUDIT_PAGE_SIZE);
  }, [auditList, auditPage]);

  const totalAuditPages = Math.ceil(auditList.length / AUDIT_PAGE_SIZE);

  // --- ABA 3: SAÚDE FINANCEIRA (FUNDING) ---

  // KPIs de Saúde Financeira
  const financialHealthKPIs = useMemo(() => {
    if (!alienacoes || alienacoes.length === 0) {
      return {
        saldoDevedorTotal: 0,
        parcelaMedia: 0,
        percentualEmDia: 0,
        prazoMedioRestante: 0,
        veiculosFinanciados: 0
      };
    }

    const veiculosAtivos = alienacoes.filter((a: any) => parseCurrency(a.SaldoRemanescente || a.SaldoDevedor) > 0);

    const saldoTotal = veiculosAtivos.reduce((sum: number, a: any) =>
      sum + parseCurrency(a.SaldoRemanescente || a.SaldoDevedor || 0), 0);

    const parcelaTotal = veiculosAtivos.reduce((sum: number, a: any) =>
      sum + parseCurrency(a.ValorParcela || 0), 0);

    const emDia = veiculosAtivos.filter((a: any) =>
      (a.SituacaoFinanceiraVeiculo || '').toLowerCase().includes('em dia') ||
      (a.SituacaoFinanceiraVeiculo || '').toLowerCase() === 'regular'
    ).length;

    const prazoSomado = veiculosAtivos.reduce((sum: number, a: any) =>
      sum + (a.QuantidadeParcelasRemanescentes || 0), 0);

    return {
      saldoDevedorTotal: saldoTotal,
      parcelaMedia: veiculosAtivos.length > 0 ? parcelaTotal / veiculosAtivos.length : 0,
      percentualEmDia: veiculosAtivos.length > 0 ? (emDia / veiculosAtivos.length) * 100 : 0,
      prazoMedioRestante: veiculosAtivos.length > 0 ? prazoSomado / veiculosAtivos.length : 0,
      veiculosFinanciados: veiculosAtivos.length
    };
  }, [alienacoes]);

  // Cronograma de Vencimentos (36 meses)
  const paymentSchedule = useMemo(() => {
    if (!alienacoes || alienacoes.length === 0) return [];

    const hoje = new Date();
    const schedule: { [key: string]: number } = {};

    // Inicializar próximos 36 meses
    for (let i = 0; i < 36; i++) {
      const futureDate = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const key = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
      schedule[key] = 0;
    }

    // Projetar parcelas futuras
    alienacoes.forEach((a: any) => {
      const parcelasRestantes = a.QuantidadeParcelasRemanescentes || 0;
      const valorParcela = parseCurrency(a.ValorParcela || 0);
      const vencimento = a.VencimentoPrimeiraParcela || a.VencimentoPrimeira;

      if (parcelasRestantes > 0 && valorParcela > 0 && vencimento) {
        const dataVenc = new Date(vencimento);

        for (let i = 0; i < Math.min(parcelasRestantes, 36); i++) {
          const mesVenc = new Date(dataVenc.getFullYear(), dataVenc.getMonth() + i, 1);
          const key = `${mesVenc.getFullYear()}-${String(mesVenc.getMonth() + 1).padStart(2, '0')}`;

          if (schedule[key] !== undefined) {
            schedule[key] += valorParcela;
          }
        }
      }
    });

    return Object.keys(schedule)
      .sort()
      .map(key => ({
        mes: key,
        valor: schedule[key]
      }))
      .filter(item => item.valor > 0);
  }, [alienacoes]);

  // Exposição por Banco
  const bankExposure = useMemo(() => {
    if (!alienacoes || alienacoes.length === 0) return [];

    const exposureMap: { [key: string]: number } = {};

    alienacoes.forEach((a: any) => {
      const saldo = parseCurrency(a.SaldoRemanescente || a.SaldoDevedor || 0);
      if (saldo > 0) {
        const banco = a.Instituicao || 'Outros';
        exposureMap[banco] = (exposureMap[banco] || 0) + saldo;
      }
    });

    return Object.entries(exposureMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [alienacoes]);

  // Veículos em Risco (Atrasados)
  const riskVehicles = useMemo(() => {
    if (!alienacoes || alienacoes.length === 0) return [];

    return alienacoes
      .filter((a: any) => {
        const situacao = (a.SituacaoFinanceiraVeiculo || '').toLowerCase();
        return situacao.includes('atrasado') || situacao.includes('inadimplente');
      })
      .map((a: any) => ({
        placa: a.Placa,
        modelo: a.Modelo,
        banco: a.Instituicao,
        saldoDevedor: parseCurrency(a.SaldoRemanescente || a.SaldoDevedor || 0),
        parcelasRestantes: a.QuantidadeParcelasRemanescentes || 0,
        situacao: a.SituacaoFinanceiraVeiculo
      }));
  }, [alienacoes]);


  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">Gestão de Compras 2.0</Title>
          <Text className="mt-1 text-slate-500">Visão integrada de aquisição, funding e compliance.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" /> Hub Compras
          </div>
        </div>
      </div>

      {/* Global Filters */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-500" />
          <Text className="font-medium text-slate-700">Filtros de Análise</Text>
          {hasActiveFilters && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full ml-2">
              Filtros ativos
            </span>
          )}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Data Início</label>
            <input type="date" className="border p-2 rounded text-sm w-full" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Data Fim</label>
            <input type="date" className="border p-2 rounded text-sm w-full" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>

          {/* Multi-select: Montadora */}
          <div className="relative">
            <label className="text-xs text-slate-500 mb-1 block">Montadora</label>
            <select
              className="border p-2 rounded text-sm w-full"
              onChange={e => e.target.value && handleMultiSelectChange('montadora', e.target.value)}
              value=""
            >
              <option value="">Selecione...</option>
              {filterOptions.montadoras.map(m => (
                <option key={m} value={m} className={activeFilters.montadora.includes(m) ? 'bg-emerald-100' : ''}>
                  {activeFilters.montadora.includes(m) ? '✓ ' : ''}{m}
                </option>
              ))}
            </select>
            {activeFilters.montadora.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilters.montadora.length}
              </span>
            )}
          </div>

          {/* Multi-select: Modelo */}
          <div className="relative">
            <label className="text-xs text-slate-500 mb-1 block">Modelo</label>
            <select
              className="border p-2 rounded text-sm w-full"
              onChange={e => e.target.value && handleMultiSelectChange('modelo', e.target.value)}
              value=""
            >
              <option value="">Selecione...</option>
              {filterOptions.modelos.slice(0, 50).map(m => (
                <option key={m} value={m}>
                  {activeFilters.modelo.includes(m) ? '✓ ' : ''}{m}
                </option>
              ))}
            </select>
            {activeFilters.modelo.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilters.modelo.length}
              </span>
            )}
          </div>

          {/* Multi-select: Banco */}
          <div className="relative">
            <label className="text-xs text-slate-500 mb-1 block">Banco</label>
            <select
              className="border p-2 rounded text-sm w-full"
              onChange={e => e.target.value && handleMultiSelectChange('banco', e.target.value)}
              value=""
            >
              <option value="">Selecione...</option>
              {filterOptions.bancos.map(b => (
                <option key={b} value={b}>
                  {activeFilters.banco.includes(b) ? '✓ ' : ''}{b}
                </option>
              ))}
            </select>
            {activeFilters.banco.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilters.banco.length}
              </span>
            )}
          </div>

          {/* Clear button inline */}
          <div className="flex items-end">
            {hasActiveFilters && (
              <button
                onClick={clearInteractiveFilters}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm transition-all"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Custom Tabs */}
      <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit">
        {['Aquisição e Eficiência', 'Funding e Saúde Financeira', 'Auditoria (Compliance)'].map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === idx
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {/* ABA 1: AQUISIÇÃO */}
        {activeTab === 0 && (
          <div className="space-y-6">
            {/* KPIs */}
            {/* Compact KPIs Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="mx-auto max-w-full p-4 flex items-center justify-between shadow-sm border border-slate-200 decoration-l-4 decoration-emerald-500">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Total Investido</p>
                  <p className="text-lg font-bold text-slate-900">{fmtCompact(acquisitionKPIs.totalInvest)}</p>
                </div>
                <ShoppingBag className="w-5 h-5 text-emerald-100 bg-emerald-600 rounded p-1" />
              </Card>
              <Card className="mx-auto max-w-full p-4 flex items-center justify-between shadow-sm border border-slate-200 decoration-l-4 decoration-blue-500">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Veículos</p>
                  <p className="text-lg font-bold text-slate-900">{acquisitionKPIs.count}</p>
                </div>
                <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {fmtBRL(acquisitionKPIs.totalInvest / (acquisitionKPIs.count || 1))} med
                </div>
              </Card>
              <Card className="mx-auto max-w-full p-4 flex items-center justify-between shadow-sm border border-slate-200 decoration-l-4 decoration-amber-500">
                <div>
                  <p className="text-xs text-slate-500 font-medium">% Médio FIPE</p>
                  <p className="text-lg font-bold text-slate-900">{acquisitionKPIs.avgFipeCompra.toFixed(1)}%</p>
                </div>
                <div className={`text-xs font-medium px-2 py-1 rounded ${acquisitionKPIs.avgFipeCompra < 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {acquisitionKPIs.avgFipeCompra < 100 ? 'Bom' : 'Atenção'}
                </div>
              </Card>
              <Card className="mx-auto max-w-full p-4 flex items-center justify-between shadow-sm border border-slate-200 decoration-l-4 decoration-violet-500">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Acessórios</p>
                  <p className="text-lg font-bold text-slate-900">{fmtCompact(acquisitionKPIs.totalAcessorios)}</p>
                </div>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-white border border-slate-200">
                <Title>Evolução de Compras</Title>
                <Text className="text-xs text-slate-500 mt-1">Clique em uma barra para filtrar por mês</Text>
                <div className="h-80 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={evolutionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                      <YAxis yAxisId="left" fontSize={12} tickFormatter={fmtCompact} />
                      <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={(v) => `${v} un`} />
                      <Tooltip formatter={(v: any, name: string) => name === 'Quantidade' ? `${v} un` : fmtBRL(v)} />
                      <Bar
                        yAxisId="left"
                        dataKey="Valor"
                        radius={[4, 4, 0, 0]}
                        barSize={50}
                        onClick={(data) => handleMonthClick(data.date)}
                        cursor="pointer"
                      >
                        {evolutionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={activeFilters.mes === entry.date ? '#059669' : '#10b981'}
                          />
                        ))}
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="Quantidade" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <div className="space-y-6">
                <Card className="bg-white border border-slate-200">
                  <Title>Top Fornecedores</Title>
                  <Text className="text-xs text-slate-500 mt-1">Clique em um fornecedor para filtrar</Text>
                  <div className="mt-4 h-40 overflow-y-auto space-y-2">
                    {supplierRanking.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSupplierClick(item.name)}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all ${activeFilters.fornecedor === item.name
                          ? 'bg-emerald-100 border border-emerald-500'
                          : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                          }`}
                      >
                        <span className="text-xs font-medium text-slate-700 truncate flex-1">{item.name}</span>
                        <span className="text-xs font-bold text-emerald-600 ml-2">{fmtCompact(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </Card>


                <Card className="bg-white border border-slate-200">
                  <Title>Dispersão de Preços (Scatter)</Title>
                  <Text className="text-xs text-slate-500 mt-1">Relação Data vs Valor</Text>
                  <div className="h-48 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="x" name="Data" domain={['auto', 'auto']} tickFormatter={(v) => new Date(v).toLocaleDateString()} fontSize={10} />
                        <YAxis type="number" dataKey="y" name="Valor" tickFormatter={fmtCompact} fontSize={10} width={40} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: any, name: string) => name === 'Data' ? new Date(v).toLocaleDateString() : fmtBRL(v)} />
                        <Scatter name="Compras" data={scatterData} fill="#8884d8">
                          {scatterData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill="#10b981" />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </div>

            <Card className="mt-6 p-0">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <Title>Detalhamento de Aquisições</Title>
                  <Text className="text-slate-500">Visão completa de cada veículo adquirido</Text>
                </div>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">
                  {detailedAcquisitions.length} veículos
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-emerald-50 text-emerald-700 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Placa</th>
                      <th className="px-4 py-3">Montadora</th>
                      <th className="px-4 py-3">Modelo</th>
                      <th className="px-4 py-3">Ano/Cor</th>
                      <th className="px-4 py-3">Km</th>
                      <th className="px-4 py-3">Data Compra</th>
                      <th className="px-4 py-3">Fornecedor</th>
                      <th className="px-4 py-3 text-right">Valor Compra</th>
                      <th className="px-4 py-3 text-center">% FIPE</th>
                      <th className="px-4 py-3 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedAcquisitions.map((item, idx) => (
                      <tr key={idx} className="hover:bg-emerald-50/50">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">{item.placa}</td>
                        <td className="px-4 py-3 text-slate-700">{item.montadora}</td>
                        <td className="px-4 py-3 text-slate-700">{item.modelo}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {item.ano} <span className="text-slate-400">|</span> {item.cor}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{item.km}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.dataCompra ? new Date(item.dataCompra).toLocaleDateString('pt-BR') : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate" title={item.fornecedor}>
                          {item.fornecedor}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{fmtBRL(item.valorCompra)}</td>
                        <td className="px-4 py-3 text-center">
                          {item.percentFipe > 0 ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.percentFipe < 85 ? 'bg-emerald-100 text-emerald-700' :
                              item.percentFipe < 100 ? 'bg-blue-100 text-blue-700' :
                                item.percentFipe < 105 ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                              }`}>
                              {item.percentFipe.toFixed(1)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.situacao === 'Vendido' ? 'bg-slate-100 text-slate-600' :
                            item.situacao === 'Locado' ? 'bg-emerald-100 text-emerald-700' :
                              item.situacao === 'Bloqueado' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                            {item.situacao}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.tempoEmFrota < 12 ? 'bg-emerald-100 text-emerald-700' :
                            item.tempoEmFrota < 24 ? 'bg-blue-100 text-blue-700' :
                              item.tempoEmFrota < 36 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                            {item.tempoEmFrota} meses
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalAcquisitionPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                  <Text className="text-slate-500">
                    Página {acquisitionPage + 1} de {totalAcquisitionPages}
                  </Text>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAcquisitionPage(p => Math.max(0, p - 1))}
                      disabled={acquisitionPage === 0}
                      className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200"
                    >
                      ← Anterior
                    </button>
                    <button
                      onClick={() => setAcquisitionPage(p => Math.min(totalAcquisitionPages - 1, p + 1))}
                      disabled={acquisitionPage >= totalAcquisitionPages - 1}
                      className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-200"
                    >
                      Próxima →
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )
        }

        {/* ABA 2: FUNDING */}
        {
          activeTab === 1 && (

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card decoration="top" decorationColor="indigo" className="bg-white border border-slate-200">
                  <Text className="text-slate-500">Total Financiado</Text>
                  <Metric className="text-slate-900">{fmtCompact(fundingKPIs.totalFinanced)}</Metric>
                </Card>
                <Card decoration="top" decorationColor="indigo" className="bg-white border border-slate-200">
                  <Text className="text-slate-500">Alavancagem (LTV)</Text>
                  <Metric className="text-slate-900">{fundingKPIs.leverage.toFixed(1)}%</Metric>
                </Card>
                <Card decoration="top" decorationColor="indigo" className="bg-white border border-slate-200">
                  <Text className="text-slate-500">Parcela Média</Text>
                  <Metric className="text-slate-900">{fmtBRL(fundingKPIs.avgParcela)}</Metric>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white border border-slate-200">
                  <Title>Mix de Capital</Title>
                  <DonutChart
                    className="mt-6 h-60"
                    data={capitalMix}
                    category="value"
                    index="name"
                    valueFormatter={fmtCompact}
                    colors={['emerald', 'indigo']}
                  />
                </Card>
                <Card className="bg-white border border-slate-200">
                  <Title>Exposição por Banco</Title>
                  <div className="mt-4 h-60 overflow-y-auto space-y-2">
                    {debtByBank.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded bg-slate-50"
                      >
                        <span className="text-sm font-medium text-slate-700 truncate flex-1">{item.name}</span>
                        <span className="text-sm font-bold text-indigo-600 ml-2">{fmtCompact(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card className="bg-white border border-slate-200">
                <Title>Cronograma Estimado de Vencimento (36 meses)</Title>
                <div className="h-72 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={maturitySchedule}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                      <YAxis fontSize={12} tickFormatter={fmtCompact} />
                      <Tooltip formatter={(v: any) => fmtBRL(v)} />
                      <Line type="monotone" dataKey="Vencimento" stroke="#6366f1" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

      {/* SEÇÃO: SAÚDE FINANCEIRA */}
        <div className="mt-6 space-y-6">
          {/* Header with Link to Full Dashboard */}
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <Text className="font-semibold text-indigo-900">Visão Resumida da Saúde Financeira</Text>
                <Text className="text-sm text-indigo-600 mt-1">
                  Acesse a Gestão Completa de Passivo para análises avançadas, alertas e simulações
                </Text>
              </div>
              <a
                href="/analytics/funding"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                Ver Gestão Completa →
              </a>
            </div>
          </Card>

          {/* KPIs Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white border border-slate-200">
              <Text className="text-slate-600">Saldo Devedor Total</Text>
              <Metric className="text-indigo-600">{fmtCompact(financialHealthKPIs.saldoDevedorTotal)}</Metric>
              <Text className="text-xs text-slate-500 mt-2">{financialHealthKPIs.veiculosFinanciados} veículos financiados</Text>
            </Card>

            <Card className="bg-white border border-slate-200">
              <Text className="text-slate-600">Parcela Média</Text>
              <Metric className="text-blue-600">{fmtBRL(financialHealthKPIs.parcelaMedia)}</Metric>
              <Text className="text-xs text-slate-500 mt-2">Por veículo</Text>
            </Card>

            <Card className="bg-white border border-slate-200">
              <Text className="text-slate-600">% Em Dia</Text>
              <Metric className={financialHealthKPIs.percentualEmDia >= 90 ? "text-emerald-600" : "text-amber-600"}>
                {financialHealthKPIs.percentualEmDia.toFixed(1)}%
              </Metric>
              <Text className="text-xs text-slate-500 mt-2">
                {financialHealthKPIs.percentualEmDia >= 90 ? '✅ Excelente' : '⚠️ Atenção'}
              </Text>
            </Card>

            <Card className="bg-white border border-slate-200">
              <Text className="text-slate-600">Prazo Médio Restante</Text>
              <Metric className="text-slate-700">{financialHealthKPIs.prazoMedioRestante.toFixed(0)} meses</Metric>
              <Text className="text-xs text-slate-500 mt-2">Tempo médio para quitação</Text>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Schedule Chart */}
            <Card className="bg-white border border-slate-200">
              <Title>Cronograma de Vencimentos (36 meses)</Title>
              <Text className="mb-4">Projeção de fluxo de caixa futuro</Text>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentSchedule.slice(0, 24)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="mes"
                      fontSize={11}
                      tickFormatter={(v) => {
                        const [year, month] = v.split('-');
                        return `${month}/${year.slice(2)}`;
                      }}
                    />
                    <YAxis fontSize={12} tickFormatter={fmtCompact} />
                    <Tooltip
                      formatter={(v: any) => fmtBRL(v)}
                      labelFormatter={(label) => {
                        const [year, month] = label.split('-');
                        return `${month}/${year}`;
                      }}
                    />
                    <Bar dataKey="valor" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Bank Exposure Chart */}
            <Card className="bg-white border border-slate-200">
              <Title>Exposição por Banco</Title>
              <Text className="mb-4">Saldo devedor por instituição financeira</Text>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={bankExposure}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={12} tickFormatter={fmtCompact} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      fontSize={12}
                      tick={{ fill: '#475569' }}
                    />
                    <Tooltip formatter={(v: any) => fmtBRL(v)} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Risk Vehicles Table */}
          {riskVehicles.length > 0 && (
            <Card className="bg-white border border-red-200">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <Title className="text-red-700">Veículos em Situação de Risco</Title>
              </div>
              <Text className="mb-4 text-red-600">
                {riskVehicles.length} {riskVehicles.length === 1 ? 'veículo identificado' : 'veículos identificados'} com pagamento atrasado
              </Text>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-red-50 text-red-700 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Placa</th>
                      <th className="px-4 py-3">Modelo</th>
                      <th className="px-4 py-3">Banco</th>
                      <th className="px-4 py-3 text-right">Saldo Devedor</th>
                      <th className="px-4 py-3 text-center">Parcelas Restantes</th>
                      <th className="px-4 py-3 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {riskVehicles.map((v, i) => (
                      <tr key={i} className="hover:bg-red-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{v.placa}</td>
                        <td className="px-4 py-3 text-slate-600">{v.modelo}</td>
                        <td className="px-4 py-3 text-slate-600">{v.banco}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">{fmtBRL(v.saldoDevedor)}</td>
                        <td className="px-4 py-3 text-center text-slate-700">{v.parcelasRestantes}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            {v.situacao}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Empty State */}
          {riskVehicles.length === 0 && (
            <Card className="bg-white border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <Title className="text-emerald-700">Saúde Financeira Excelente</Title>
              </div>
              <Text className="text-emerald-600">
                Nenhum veículo com pagamento atrasado identificado no momento.
              </Text>
            </Card>
          )}
        </div>
      </div>
      )}

      {/* ABA 4: AUDITORIA */}
      {
        activeTab === 2 && (
          <div className="mt-6">
            <Card className="bg-white border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <Title>Compras Fora do Padrão</Title>
              </div>
              <Text className="mb-4">Listando compras com dados incompletos, valores suspeitos, datas inválidas ou discrepâncias financeiras acentuadas.</Text>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Placa</th>
                      <th className="px-4 py-3">Modelo</th>
                      <th className="px-4 py-3">Data Compra</th>
                      <th className="px-4 py-3">Código FIPE</th>
                      <th className="px-4 py-3">Fornecedor</th>
                      <th className="px-4 py-3 text-right">Compra</th>
                      <th className="px-4 py-3 text-right">FIPE na Data</th>
                      <th className="px-4 py-3 text-center">% Fipe</th>
                      <th className="px-4 py-3 text-right">Diferença</th>
                      <th className="px-4 py-3 text-center">Situação</th>
                      <th className="px-4 py-3 text-center">Motivo Auditoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedAuditList.map((r, i) => {
                      const getBadgeColor = (situacao: string) => {
                        if (!situacao) return 'bg-slate-100 text-slate-700';
                        const s = situacao.toLowerCase();
                        if (s.includes('disponível') || s.includes('disponivel')) return 'bg-emerald-100 text-emerald-700';
                        if (s.includes('locado') || s.includes('alugado')) return 'bg-blue-100 text-blue-700';
                        if (s.includes('manutenção') || s.includes('manutencao')) return 'bg-amber-100 text-amber-700';
                        if (s.includes('vendido') || s.includes('baixado')) return 'bg-slate-100 text-slate-700';
                        return 'bg-slate-100 text-slate-700';
                      };

                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">{r.placa}</td>
                          <td className="px-4 py-3 text-slate-600">{r.modelo}</td>
                          <td className="px-4 py-3 text-slate-500 text-sm">{r.dataCompra ? new Date(r.dataCompra).toLocaleDateString('pt-BR') : '-'}</td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs">{r.codigoFipe || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{r.fornecedor}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">{fmtBRL(r.compra)}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{fmtBRL(r.fipe)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${r.percentFipe < 100 ? 'bg-emerald-100 text-emerald-700' :
                              r.percentFipe <= 105 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                              {r.percentFipe.toFixed(1)}%
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${r.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {r.diff > 0 ? '+' : ''}{fmtBRL(r.diff)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(r.situacao)}`}>
                              {r.situacao || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              {r.reason}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {auditList.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-4 py-8 text-center text-slate-400">Nenhuma inconformidade encontrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalAuditPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                  <div className="text-sm text-slate-500">
                    Mostrando {((auditPage - 1) * AUDIT_PAGE_SIZE) + 1} - {Math.min(auditPage * AUDIT_PAGE_SIZE, auditList.length)} de {auditList.length} registros
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                      disabled={auditPage === 1}
                      className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-slate-600">
                      Página {auditPage} de {totalAuditPages}
                    </span>
                    <button
                      onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))}
                      disabled={auditPage === totalAuditPages}
                      className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}

            </Card>
          </div>
        )
      }

      {/* Floating Clear Filters Button */}
      {
        hasActiveFilters && (
          <button
            onClick={clearInteractiveFilters}
            className="fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all z-50"
          >
            <Filter className="w-5 h-5" />
            Limpar Filtros
          </button>
        )
      }
    </div>
    </div >
  );
}
