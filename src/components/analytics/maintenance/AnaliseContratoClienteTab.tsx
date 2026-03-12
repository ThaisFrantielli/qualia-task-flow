import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Building2, Car, DollarSign, TrendingUp, Download, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

type AnyObject = Record<string, any>;

// ─────────────────────── helpers ───────────────────────
function parseCurrency(v: any): number {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  return parseFloat(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0;
}

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtCompact(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function fmtNum(v: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(v));
}

function fmtDate(v: any): string {
  if (!v) return '—';
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}

function getDiasVencimento(dataFinal: any): number | null {
  if (!dataFinal) return null;
  const diff = new Date(String(dataFinal)).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function deriveTipo(grupoDespesa: string): string {
  const g = (grupoDespesa || '').toUpperCase();
  if (g.includes('PNEU')) return 'Pneus';
  if (g.includes('PREVENTIVA') || g.includes('REVISÃO') || g.includes('REVISAO')) return 'Preventiva';
  if (g.includes('CORRETIVA')) return 'Corretiva';
  if (g.includes('ADAPT')) return 'Adaptação';
  if (g.includes('ACESSO')) return 'Acessório';
  if (g.includes('TRANSLADO')) return 'Translado';
  if (g.includes('FUNILARIA') || g.includes('SINISTRO') || g.includes('COLISAO') || g.includes('COLISÃO')) return 'Sinistro/Funilaria';
  return g.split(/[-–]/)[0].trim() || 'Outros';
}

// ─────────────────────── KPI card ───────────────────────
function KpiCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-start gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
        <p className="text-lg font-bold text-foreground truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────── sort helper ───────────────────────
function useSortable<T extends AnyObject>(initial: string, dir: 'asc' | 'desc' = 'desc') {
  const [sortKey, setSortKey] = useState(initial);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(dir);
  const toggle = (key: string) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };
  const sort = (arr: T[]) =>
    [...arr].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  return { sortKey, sortDir, toggle, sort };
}

function SortTh({
  label,
  field,
  sortKey,
  sortDir,
  toggle,
  align = 'left',
}: {
  label: string;
  field: string;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  toggle: (k: string) => void;
  align?: 'left' | 'right' | 'center';
}) {
  const active = sortKey === field;
  return (
    <th
      className={`px-3 py-2 text-xs font-semibold cursor-pointer select-none hover:bg-muted/60 transition-colors whitespace-nowrap text-${align}`}
      onClick={() => toggle(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#a78bfa',
];

// ═══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function AnaliseContratoClienteTab() {
  // ── Global filters ──
  const { filters } = useMaintenanceFilters();

  // ── Data loads ──
  const { data: manutRaw, loading: loadManut } = useBIData<AnyObject[]>('fat_manutencao_unificado');
  const { data: frotaRaw, loading: loadFrota } = useBIData<AnyObject[]>('dim_frota');
  const { data: contratosLocRaw } = useBIData<AnyObject[]>('dim_contratos_locacao');
  const { data: itens2022, loading: loadI22 } = useBIData<AnyObject[]>('fat_detalhe_itens_os_2022');
  const { data: itens2023, loading: loadI23 } = useBIData<AnyObject[]>('fat_detalhe_itens_os_2023');
  const { data: itens2024, loading: loadI24 } = useBIData<AnyObject[]>('fat_detalhe_itens_os_2024');
  const { data: itens2025, loading: loadI25 } = useBIData<AnyObject[]>('fat_detalhe_itens_os_2025');
  const { data: itens2026, loading: loadI26 } = useBIData<AnyObject[]>('fat_detalhe_itens_os_2026');

  const loadingItems = loadI22 || loadI23 || loadI24 || loadI25 || loadI26;

  // ── Local UI state ──
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState<'contratos' | 'veiculos' | 'itens'>('contratos');

  // ── dim_frota map por Placa ──
  const frotaMap = useMemo(() => {
    const m = new Map<string, AnyObject>();
    (Array.isArray(frotaRaw) ? frotaRaw : []).forEach(v => {
      if (v.Placa) m.set(v.Placa, v);
    });
    return m;
  }, [frotaRaw]);

  // ── dim_contratos_locacao map por ContratoLocacao ──
  const contratosLocMap = useMemo(() => {
    const m = new Map<string, AnyObject>();
    (Array.isArray(contratosLocRaw) ? contratosLocRaw : []).forEach(c => {
      if (c.ContratoLocacao) m.set(c.ContratoLocacao, c);
    });
    return m;
  }, [contratosLocRaw]);

  // ── Apply global + local filters to fat_manutencao_unificado ──
  const filteredManut = useMemo(() => {
    let items = Array.isArray(manutRaw) ? manutRaw : [];

    // Global filters
    if (filters.dateRange?.from) {
      const from = filters.dateRange.from.getTime();
      const to = filters.dateRange.to?.getTime() ?? Date.now();
      items = items.filter(r => {
        const d = r.DataEntrada ? new Date(r.DataEntrada) : null;
        return d && d.getTime() >= from && d.getTime() <= to;
      });
    }
    if (filters.status && filters.status !== 'Todos') {
      items = items.filter(r => String(r.SituacaoOcorrencia || '').includes(filters.status));
    }
    if (filters.fornecedores.length > 0)
      items = items.filter(r => filters.fornecedores.includes(r.Fornecedor) || filters.fornecedores.includes(r.FornecedorOS));
    if (filters.tipos.length > 0)
      items = items.filter(r => filters.tipos.includes(r.Tipo) || filters.tipos.includes(r.TipoManutencao));
    if (filters.placas.length > 0)
      items = items.filter(r => filters.placas.includes(r.Placa));

    // Local client/contract filters (now from global context)
    if (filters.clientes.length > 0)
      items = items.filter(r => filters.clientes.includes(r.NomeCliente));
    if (filters.contratos.length > 0)
      items = items.filter(r => filters.contratos.includes(r.ContratoLocacao));

    return items;
  }, [manutRaw, filters]);

  // ── OS → metadata map (for item enrichment) ──
  const osMap = useMemo(() => {
    const m = new Map<string, { cliente: string; contrato: string; valorReembolsavel: number; tipoManutencao: string }>();
    filteredManut.forEach(r => {
      if (r.OrdemServico)
        m.set(r.OrdemServico, {
          cliente: r.NomeCliente || '',
          contrato: r.ContratoLocacao || '',
          valorReembolsavel: parseCurrency(r.ValorReembolsavel),
          tipoManutencao: r.TipoManutencao || '',
        });
    });
    return m;
  }, [filteredManut]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const totalOS = filteredManut.length;
    const totalValor = filteredManut.reduce((s, r) => s + parseCurrency(r.ValorTotal), 0);
    const totalReemb = filteredManut.reduce((s, r) => s + parseCurrency(r.ValorReembolsavel), 0);
    const totalNaoReemb = filteredManut.reduce((s, r) => s + parseCurrency(r.ValorNaoReembolsavel), 0);
    const pctReemb = totalValor > 0 ? (totalReemb / totalValor) * 100 : 0;

    // Custo/KM: sum(ValorTotal) / sum(KmConfirmado do frota por placa única)
    const placasUsadas = new Set(filteredManut.map(r => r.Placa).filter(Boolean));
    let totalKm = 0;
    placasUsadas.forEach(placa => {
      const frota = frotaMap.get(placa);
      const km = parseCurrency(frota?.KmConfirmado ?? frota?.KmInformado ?? 0);
      if (km > 0) totalKm += km;
    });
    const custoKm = totalKm > 0 ? totalValor / totalKm : 0;
    const totalVeiculos = placasUsadas.size;
    const ticketMedio = totalOS > 0 ? totalValor / totalOS : 0;

    return { totalOS, totalValor, totalReemb, totalNaoReemb, pctReemb, custoKm, totalVeiculos, ticketMedio };
  }, [filteredManut, frotaMap]);

  // ── Summary table by Contrato ──
  const contratoSummary = useMemo(() => {
    // Build OS aggregation from filteredManut
    const osAgg = new Map<string, {
      cliente: string; os: number; valorTotal: number;
      valReemb: number; valNaoReemb: number; placas: Set<string>;
    }>();
    filteredManut.forEach(r => {
      const key = r.ContratoLocacao || 'Sem Contrato';
      if (!osAgg.has(key)) osAgg.set(key, { cliente: r.NomeCliente || '-', os: 0, valorTotal: 0, valReemb: 0, valNaoReemb: 0, placas: new Set() });
      const e = osAgg.get(key)!;
      if (!e.cliente || e.cliente === '-') e.cliente = r.NomeCliente || '-';
      e.os += 1;
      e.valorTotal += parseCurrency(r.ValorTotal);
      e.valReemb += parseCurrency(r.ValorReembolsavel);
      e.valNaoReemb += parseCurrency(r.ValorNaoReembolsavel);
      if (r.Placa) e.placas.add(r.Placa);
    });

    // When client or contract filter is active → use dim_contratos_locacao as base so all
    // contracts appear even when they have zero OS in the current period.
    // Without any filter → use OS-only base to avoid loading all 7 k+ dim rows.
    const hasFilter = filters.clientes.length > 0 || filters.contratos.length > 0;
    let dimBase: AnyObject[] = [];
    if (hasFilter) {
      dimBase = Array.isArray(contratosLocRaw) ? contratosLocRaw : [];
      if (filters.clientes.length > 0)  dimBase = dimBase.filter(c => filters.clientes.includes(c.NomeCliente));
      if (filters.contratos.length > 0) dimBase = dimBase.filter(c => filters.contratos.includes(c.ContratoLocacao));
    }

    const buildEntry = (
      key: string,
      agg: { cliente: string; os: number; valorTotal: number; valReemb: number; valNaoReemb: number; placas: Set<string> },
      dim: AnyObject,
    ) => ({
      contrato: key,
      cliente: agg.cliente || String(dim.NomeCliente || '-'),
      os: agg.os,
      valorTotal: agg.valorTotal,
      valReemb: agg.valReemb,
      valNaoReemb: agg.valNaoReemb,
      placas: agg.placas,
      pctReemb: agg.valorTotal > 0 ? (agg.valReemb / agg.valorTotal) * 100 : 0,
      qtdVeiculos: agg.placas.size,
      situacaoContrato: String(dim.SituacaoContratoLocacao || '—'),
      dataInicial: dim.DataInicial,
      dataFinal: dim.DataFinal,
      periodoMeses: dim.PeriodoEmMeses ?? null,
      ultimoValorLocacao: parseCurrency(dim.UltimoValorLocacao ?? dim.ValorMensalAtual),
      valorMensalAtual: parseCurrency(dim.UltimoValorLocacao ?? dim.ValorMensalAtual),
      tipoDeContrato: String(dim.TipoDeContrato || dim.TipoLocacao || '—'),
      tipoLocacao: String(dim.TipoLocacao || '—'),
      custoAtualManutDim: parseCurrency(dim.CustoAtualManutencao),
      nomeClienteDim: String(dim.NomeCliente || '—'),
      nomeCondutor: String(dim.NomeCondutor || '—'),
      refContratoCliente: String(dim.RefContratoCliente || '—'),
      contratoComercial: String(dim.ContratoComercial || '—'),
      classificacao: String(dim.ClassificacaoContrato || '—'),
      nomePromotor: String(dim.NomePromotor || '—'),
    });

    const seen = new Set<string>();
    const result: ReturnType<typeof buildEntry>[] = [];

    // First pass: dim base (all contracts for the selected client even with 0 OS)
    dimBase.forEach(c => {
      const key = String(c.ContratoLocacao || 'Sem Contrato');
      if (seen.has(key)) return;
      seen.add(key);
      const agg = osAgg.get(key) ?? { cliente: String(c.NomeCliente || '-'), os: 0, valorTotal: 0, valReemb: 0, valNaoReemb: 0, placas: new Set<string>() };
      result.push(buildEntry(key, agg, c));
    });

    // Second pass: OS-only contracts not already in dimBase (e.g. "Sem Contrato")
    osAgg.forEach((agg, key) => {
      if (seen.has(key)) return;
      seen.add(key);
      const dim = contratosLocMap.get(key) ?? ({} as AnyObject);
      result.push(buildEntry(key, agg, dim));
    });

    return result;
  }, [filteredManut, contratosLocMap, contratosLocRaw, filters.clientes, filters.contratos]);

  // ── Summary by Cliente (for chart) ──
  const topClientesChart = useMemo(() => {
    const map: Record<string, number> = {};
    filteredManut.forEach(r => {
      const k = r.NomeCliente || r.Cliente || 'Sem Cliente';
      map[k] = (map[k] || 0) + parseCurrency(r.ValorTotal);
    });
    return Object.entries(map)
      .map(([name, valor]) => ({ name, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 12);
  }, [filteredManut]);

  // ── Vehicle table ──
  const vehicleTable = useMemo(() => {
    const map = new Map<string, { placa: string; cliente: string; contrato: string; custoTotal: number; qtdOS: number; kmConfirmado: number; kmInformado: number; idadeMeses: number; modelo: string; categoria: string }>();

    filteredManut.forEach(r => {
      const placa = r.Placa || 'N/D';
      if (!map.has(placa)) {
        const frota = frotaMap.get(placa);
        map.set(placa, {
          placa,
          cliente: r.NomeCliente || r.Cliente || '-',
          contrato: r.ContratoLocacao || '-',
          custoTotal: 0,
          qtdOS: 0,
          kmConfirmado: parseCurrency(frota?.KmConfirmado ?? 0),
          kmInformado: parseCurrency(frota?.KmInformado ?? 0),
          idadeMeses: parseCurrency(frota?.IdadeVeiculo ?? 0),
          modelo: frota?.Modelo || r.Modelo || '-',
          categoria: frota?.Categoria || r.CategoriaVeiculo || '-',
        });
      }
      const e = map.get(placa)!;
      e.custoTotal += parseCurrency(r.ValorTotal);
      e.qtdOS += 1;
    });

    return [...map.values()].map(e => ({
      ...e,
      custoKm: e.kmConfirmado > 0 ? e.custoTotal / e.kmConfirmado : 0,
    }));
  }, [filteredManut, frotaMap]);

  // ── All items enriched ──
  const allItens = useMemo(() => [
    ...(Array.isArray(itens2022) ? itens2022 : []),
    ...(Array.isArray(itens2023) ? itens2023 : []),
    ...(Array.isArray(itens2024) ? itens2024 : []),
    ...(Array.isArray(itens2025) ? itens2025 : []),
    ...(Array.isArray(itens2026) ? itens2026 : []),
  ], [itens2022, itens2023, itens2024, itens2025, itens2026]);

  const itensEnriched = useMemo(() => {
    // Only enrich items that belong to OS in our filtered manut set
    return allItens
      .map(item => {
        const os = osMap.get(item.OS);
        if (!os) return null;
        return {
          os: item.OS,
          placa: item.Placa || '-',
          grupoDespesa: item.GrupoDespesa || 'Outros',
          descricaoItem: item.DescricaoItem || '-',
          tipoItem: deriveTipo(item.GrupoDespesa || ''),
          quantidade: item.Quantidade || 1,
          valorItem: parseCurrency(item.Valor),
          valorReembolsavel: os.valorReembolsavel,
          tipoManutencao: os.tipoManutencao,
          cliente: os.cliente,
          contrato: os.contrato,
        };
      })
      .filter(Boolean) as NonNullable<typeof allItens[number]>[];
  }, [allItens, osMap]);

  // ── GrupoDespesa aggregation (for chart + table) ──
  const grupoDespesaAgg = useMemo(() => {
    const map: Record<string, { grupo: string; tipo: string; valorTotal: number; qtd: number; reembolsavel: number }> = {};
    itensEnriched.forEach(item => {
      const k = item.grupoDespesa;
      if (!map[k]) map[k] = { grupo: k, tipo: item.tipoItem, valorTotal: 0, qtd: 0, reembolsavel: 0 };
      map[k].valorTotal += item.valorItem;
      map[k].qtd += 1;
      map[k].reembolsavel += item.valorReembolsavel;
    });
    return Object.values(map).sort((a, b) => b.valorTotal - a.valorTotal);
  }, [itensEnriched]);

  // ── Sort hooks ──
  const contratoSort = useSortable<typeof contratoSummary[0]>('valorTotal');
  const veiculoSort = useSortable<typeof vehicleTable[0]>('custoTotal');
  const itensSort = useSortable<typeof itensEnriched[0]>('valorItem');

  // ── Pagination state ──
  const PAGE_SIZE = 50;
  const [pageContrato, setPageContrato] = useState(1);
  const [pageVeiculo, setPageVeiculo] = useState(1);
  const [pageItens, setPageItens] = useState(1);

  // ── Expanded rows (contrato + veículo) ──
  const [expandedContratos, setExpandedContratos] = useState<Set<string>>(new Set());
  const [expandedVeiculos, setExpandedVeiculos] = useState<Set<string>>(new Set());

  const toggleContrato = (key: string) =>
    setExpandedContratos(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
  const toggleVeiculo = (key: string) =>
    setExpandedVeiculos(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  // Reset páginas ao mudar seção
  const handleSectionChange = (s: typeof activeSection) => {
    setActiveSection(s);
    setPageContrato(1); setPageVeiculo(1); setPageItens(1);
  };

  // ── OS por contrato (para expand) ──
  const osByContrato = useMemo(() => {
    const m = new Map<string, AnyObject[]>();
    filteredManut.forEach(r => {
      const k = r.ContratoLocacao || 'Sem Contrato';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    });
    return m;
  }, [filteredManut]);

  // ── OS por placa (para expand) ──
  const osByPlaca = useMemo(() => {
    const m = new Map<string, AnyObject[]>();
    filteredManut.forEach(r => {
      const k = r.Placa || 'N/D';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    });
    return m;
  }, [filteredManut]);

  // ── Searched items (raw rows table) ──
  const itensFiltered = useMemo(() => {
    let rows = itensEnriched;
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        r.descricaoItem.toLowerCase().includes(s) ||
        r.grupoDespesa.toLowerCase().includes(s) ||
        r.placa.toLowerCase().includes(s) ||
        r.os.toLowerCase().includes(s) ||
        r.cliente.toLowerCase().includes(s)
      );
    }
    return itensSort.sort(rows);
  }, [itensEnriched, search, itensSort]);

  // ── CSV export ──
  const exportContratos = () => {
    const rows = contratoSort.sort(contratoSummary);
    const hdrs = ['Contrato', 'Cliente (OS)', 'Cliente (DIM)', 'Contrato Comercial', 'Ref. Cliente', 'Tipo Contrato (ERP)', 'Tipo Locação', 'Situação', 'Data Início', 'Data Fim', 'Período (meses)', 'Último Valor Locação', 'Promotor', 'Qtd OS', 'Custo Total Manut (OS)', 'Custo Manut DW', 'Reembolsável', 'Não Reemb.', '% Reemb.', 'Qtd Veículos'];
    const data = rows.map(r => [
      r.contrato, r.cliente, r.nomeClienteDim, r.contratoComercial, r.refContratoCliente,
      r.tipoDeContrato, r.tipoLocacao, r.situacaoContrato,
      fmtDate(r.dataInicial), fmtDate(r.dataFinal), r.periodoMeses ?? '',
      r.ultimoValorLocacao.toFixed(2), r.nomePromotor,
      r.os, r.valorTotal.toFixed(2), r.custoAtualManutDim.toFixed(2),
      r.valReemb.toFixed(2), r.valNaoReemb.toFixed(2), r.pctReemb.toFixed(1), r.qtdVeiculos
    ].join(';'));
    const csv = [hdrs.join(';'), ...data].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'manutencao_contratos.csv';
    a.click();
  };

  const exportVeiculos = () => {
    const rows = veiculoSort.sort(vehicleTable);
    const hdrs = ['Placa', 'Modelo', 'Categoria', 'Cliente', 'Contrato', 'Qtd OS', 'Custo Total', 'KM Confirmado', 'KM Informado', 'Idade (meses)', 'Custo/KM'];
    const data = rows.map(r => [r.placa, r.modelo, r.categoria, r.cliente, r.contrato, r.qtdOS, r.custoTotal.toFixed(2), r.kmConfirmado, r.kmInformado, r.idadeMeses, (r.custoKm || 0).toFixed(4)].join(';'));
    const csv = [hdrs.join(';'), ...data].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'manutencao_veiculos.csv';
    a.click();
  };

  const exportItens = () => {
    const hdrs = ['OS', 'Placa', 'Cliente', 'Contrato', 'Grupo Despesa', 'Descrição Item', 'Tipo Item', 'Qtd', 'Valor Item', 'Val. Reemb. (OS)', 'Tipo Manutenção'];
    const data = itensFiltered.map(r => [r.os, r.placa, r.cliente, r.contrato, r.grupoDespesa, r.descricaoItem, r.tipoItem, r.quantidade, r.valorItem.toFixed(2), r.valorReembolsavel.toFixed(2), r.tipoManutencao].join(';'));
    const csv = [hdrs.join(';'), ...data].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'manutencao_itens.csv';
    a.click();
  };

  const loading = loadManut || loadFrota;

  // ─────────────────────── RENDER ───────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-indigo-600" />
        <div>
          <h2 className="text-lg font-bold text-foreground">Análise por Contrato / Cliente</h2>
          <p className="text-xs text-muted-foreground">
            Custos, veículos e itens de OS segmentados por contrato e cliente
          </p>
        </div>
      </div>

      {/* ── Filtros ativos (indicador) ── */}
      {(filters.clientes.length > 0 || filters.contratos.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2">
          <span className="font-medium text-indigo-700 dark:text-indigo-400">Filtros ativos:</span>
          {filters.clientes.length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">
              {filters.clientes.length} cliente{filters.clientes.length > 1 ? 's' : ''}
            </span>
          )}
          {filters.contratos.length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">
              {filters.contratos.length} contrato{filters.contratos.length > 1 ? 's' : ''}
            </span>
          )}
          <span className="ml-auto tabular-nums">
            {filteredManut.length.toLocaleString('pt-BR')} OS· {kpis.totalVeiculos} veículos
          </span>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Qtd. OS"
          value={fmtNum(kpis.totalOS)}
          icon={TrendingUp}
          color="bg-indigo-500"
        />
        <KpiCard
          label="Valor Total Manutenção"
          value={fmtCompact(kpis.totalValor)}
          sub={fmtBRL(kpis.totalValor)}
          icon={DollarSign}
          color="bg-emerald-500"
        />
        <KpiCard
          label="Valor Reembolsável"
          value={fmtCompact(kpis.totalReemb)}
          sub={`${kpis.pctReemb.toFixed(1)}% do total`}
          icon={DollarSign}
          color="bg-sky-500"
        />
        <KpiCard
          label="Valor Não Reembolsável"
          value={fmtCompact(kpis.totalNaoReemb)}
          sub={`${(100 - kpis.pctReemb).toFixed(1)}% do total`}
          icon={DollarSign}
          color="bg-orange-500"
        />
        <KpiCard
          label="Custo / KM"
          value={`R$ ${kpis.custoKm.toFixed(4)}`}
          sub="(frota do filtro)"
          icon={Car}
          color="bg-violet-500"
        />
        <KpiCard
          label="Ticket Médio OS"
          value={fmtCompact(kpis.ticketMedio)}
          icon={Building2}
          color="bg-rose-500"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Top Clientes */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top Clientes por Custo de Manutenção</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topClientesChart} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                {topClientesChart.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* GrupoDespesa */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Breakdown por Grupo de Despesa</h3>
            {loadingItems && (
              <span className="text-xs text-muted-foreground animate-pulse">carregando itens…</span>
            )}
          </div>
          {grupoDespesaAgg.length === 0 && !loadingItems ? (
            <p className="text-xs text-muted-foreground text-center py-10">
              {loadManut ? 'Carregando…' : 'Selecione um cliente ou contrato para ver o breakdown de itens.'}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={grupoDespesaAgg.slice(0, 12)} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="grupo" tick={{ fontSize: 9 }} width={150} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Bar dataKey="valorTotal" radius={[0, 4, 4, 0]}>
                  {grupoDespesaAgg.slice(0, 12).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Section Tabs ── */}
      <div className="flex gap-1 border-b border-border">
        {(['contratos', 'veiculos', 'itens'] as const).map(s => (
          <button
            key={s}
            onClick={() => handleSectionChange(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeSection === s
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'contratos' ? '📋 Resumo' : s === 'veiculos' ? '🚗 Veículos' : '🔩 Itens de OS'}
          </button>
        ))}
      </div>

      {/* ═════════ SECTION: Contratos ═════════ */}
      {activeSection === 'contratos' && (() => {
        const sorted = contratoSort.sort(contratoSummary);
        const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
        const paged = sorted.slice((pageContrato - 1) * PAGE_SIZE, pageContrato * PAGE_SIZE);
        return (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">
                Resumo por Contrato de Locação ({contratoSummary.length})
              </span>
              <Button variant="outline" size="sm" onClick={exportContratos} className="text-xs h-7">
                <Download className="w-3 h-3 mr-1" /> CSV
              </Button>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 w-6" />
                    <SortTh label="Contrato" field="contrato" {...contratoSort} />
                    <SortTh label="Cliente" field="cliente" {...contratoSort} />
                    <SortTh label="Contrato Comercial" field="contratoComercial" {...contratoSort} />
                    <SortTh label="Tipo Contrato" field="tipoDeContrato" {...contratoSort} />
                    <SortTh label="Situação" field="situacaoContrato" {...contratoSort} />
                    <SortTh label="Início" field="dataInicial" {...contratoSort} />
                    <SortTh label="Fim" field="dataFinal" {...contratoSort} />
                    <SortTh label="Período" field="periodoMeses" {...contratoSort} align="right" />
                    <SortTh label="Últ. Valor Loc." field="ultimoValorLocacao" {...contratoSort} align="right" />
                    <SortTh label="Qtd OS" field="os" {...contratoSort} align="right" />
                    <SortTh label="Custo Manut. (OS)" field="valorTotal" {...contratoSort} align="right" />
                    <SortTh label="Custo Manut. DW" field="custoAtualManutDim" {...contratoSort} align="right" />
                    <SortTh label="Reembolsável" field="valReemb" {...contratoSort} align="right" />
                    <SortTh label="% Reemb." field="pctReemb" {...contratoSort} align="right" />
                    <SortTh label="Veículos" field="qtdVeiculos" {...contratoSort} align="right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.map((row, i) => {
                    const dias = getDiasVencimento(row.dataFinal);
                    const vencendo = dias !== null && dias >= 0 && dias <= 60;
                    const vencido = dias !== null && dias < 0;
                    const isOpen = expandedContratos.has(row.contrato);
                    const osRows = osByContrato.get(row.contrato) || [];
                    return (
                      <>
                        <tr key={`c-${i}`} className={`hover:bg-muted/30 transition-colors ${isOpen ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => toggleContrato(row.contrato)} className="text-muted-foreground hover:text-indigo-600 transition-colors" title={isOpen ? 'Recolher' : 'Expandir ocorrências'}>
                              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-indigo-600 whitespace-nowrap">{row.contrato}</td>
                          <td className="px-3 py-2 text-xs font-medium truncate max-w-[160px]">{row.cliente}</td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">{row.contratoComercial}</td>
                          <td className="px-3 py-2 text-xs whitespace-nowrap font-medium text-indigo-700">{row.tipoDeContrato}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                              row.situacaoContrato === 'Em andamento' ? 'bg-emerald-100 text-emerald-700'
                              : row.situacaoContrato === 'Encerrado' ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-100 text-amber-700'
                            }`}>{row.situacaoContrato}</span>
                          </td>
                          <td className="px-3 py-2 text-xs whitespace-nowrap tabular-nums">{fmtDate(row.dataInicial)}</td>
                          <td className={`px-3 py-2 text-xs whitespace-nowrap tabular-nums ${
                            vencido ? 'text-rose-600 font-semibold' : vencendo ? 'text-amber-600 font-semibold' : ''
                          }`}>
                            {fmtDate(row.dataFinal)}
                            {vencido && <span className="ml-1 text-xs">(vencido)</span>}
                            {vencendo && <span className="ml-1 text-xs">({dias}d)</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums">{row.periodoMeses ?? '—'}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums font-semibold text-emerald-700">
                            {row.ultimoValorLocacao > 0 ? fmtBRL(row.ultimoValorLocacao) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums">{row.os}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums font-semibold">{fmtBRL(row.valorTotal)}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums text-violet-600">{row.custoAtualManutDim > 0 ? fmtBRL(row.custoAtualManutDim) : '—'}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums text-sky-600">{fmtBRL(row.valReemb)}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              row.pctReemb >= 50 ? 'bg-sky-100 text-sky-700' : 'bg-orange-100 text-orange-700'
                            }`}>{row.pctReemb.toFixed(1)}%</span>
                          </td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums">{row.qtdVeiculos}</td>
                        </tr>
                        {isOpen && osRows.map((os, j) => (
                          <tr key={`c-${i}-os-${j}`} className="bg-indigo-50/60 dark:bg-indigo-950/30 border-l-2 border-indigo-300">
                            <td className="px-2 py-1" />
                            <td className="px-3 py-1 font-mono text-xs text-muted-foreground pl-6">{os.OrdemServico || '—'}</td>
                            <td className="px-3 py-1 text-xs text-muted-foreground">{fmtDate(os.DataCriacao || os.DataEntrada)}</td>
                            <td className="px-3 py-1 text-xs">{os.Fornecedor || '—'}</td>
                            <td className="px-3 py-1 text-xs">{os.Tipo || os.TipoManutencao || '—'}</td>
                            <td className="px-3 py-1">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                String(os.SituacaoOcorrencia || '').includes('Concluí') ? 'bg-emerald-50 text-emerald-700'
                                : String(os.SituacaoOcorrencia || '').includes('Ativa') ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-50 text-slate-600'
                              }`}>{os.SituacaoOcorrencia || '—'}</span>
                            </td>
                            <td className="px-3 py-1 font-mono text-xs text-indigo-500">{os.Placa || '—'}</td>
                            <td className="px-3 py-1 text-xs text-muted-foreground">{os.Etapa || '—'}</td>
                            <td />
                            <td />
                            <td className="px-3 py-1 text-right text-xs tabular-nums text-muted-foreground">1</td>
                            <td className="px-3 py-1 text-right text-xs tabular-nums font-medium">{fmtBRL(parseCurrency(os.ValorTotal))}</td>
                            <td />
                            <td className="px-3 py-1 text-right text-xs tabular-nums text-sky-600">{fmtBRL(parseCurrency(os.ValorReembolsavel))}</td>
                            <td className="px-3 py-1 text-right text-xs tabular-nums text-muted-foreground">
                              {parseCurrency(os.ValorTotal) > 0 ? ((parseCurrency(os.ValorReembolsavel) / parseCurrency(os.ValorTotal)) * 100).toFixed(1) + '%' : '—'}
                            </td>
                            <td />
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/30 font-semibold border-t border-border sticky bottom-0">
                  <tr>
                    <td className="px-3 py-2 text-xs" colSpan={2}>TOTAL ({contratoSummary.length})</td>
                    <td /><td /><td /><td /><td /><td />
                    <td className="px-3 py-2 text-right text-xs tabular-nums font-semibold text-emerald-700">{fmtBRL(contratoSummary.reduce((s,r)=>s+r.ultimoValorLocacao,0))}</td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">{kpis.totalOS}</td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">{fmtBRL(kpis.totalValor)}</td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums text-violet-600">{fmtBRL(contratoSummary.reduce((s,r)=>s+r.custoAtualManutDim,0))}</td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums text-sky-600">{fmtBRL(kpis.totalReemb)}</td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">{kpis.pctReemb.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">{kpis.totalVeiculos}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                <span>Página {pageContrato} de {totalPages} · {contratoSummary.length} contratos</span>
                <div className="flex gap-1">
                  <button onClick={() => setPageContrato(1)} disabled={pageContrato === 1} className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40">«</button>
                  <button onClick={() => setPageContrato(p => Math.max(1, p - 1))} disabled={pageContrato === 1} className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40">‹</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, k) => {
                    const start = Math.max(1, Math.min(pageContrato - 2, totalPages - 4));
                    return start + k;
                  }).map(p => (
                    <button key={p} onClick={() => setPageContrato(p)} className={`px-2 py-1 rounded border ${ p === pageContrato ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold' : 'border-border hover:bg-muted'}`}>{p}</button>
                  ))}
                  <button onClick={() => setPageContrato(p => Math.min(totalPages, p + 1))} disabled={pageContrato === totalPages} className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40">›</button>
                  <button onClick={() => setPageContrato(totalPages)} disabled={pageContrato === totalPages} className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40">»</button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ═════════ SECTION: Veículos ═════════ */}
      {activeSection === 'veiculos' && (() => {
        const sortedV = veiculoSort.sort(vehicleTable);
        const totalPagesV = Math.ceil(sortedV.length / PAGE_SIZE);
        const pagedV = sortedV.slice((pageVeiculo - 1) * PAGE_SIZE, pageVeiculo * PAGE_SIZE);
        return (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">
                Veículos — custo, KM e idade ({vehicleTable.length})
              </span>
              <Button variant="outline" size="sm" onClick={exportVeiculos} className="text-xs h-7">
                <Download className="w-3 h-3 mr-1" /> CSV
              </Button>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 w-6" />
                    <SortTh label="Placa" field="placa" {...veiculoSort} />
                    <SortTh label="Modelo" field="modelo" {...veiculoSort} />
                    <SortTh label="Categoria" field="categoria" {...veiculoSort} />
                    <SortTh label="Cliente" field="cliente" {...veiculoSort} />
                    <SortTh label="Contrato" field="contrato" {...veiculoSort} />
                    <SortTh label="Qtd OS" field="qtdOS" {...veiculoSort} align="right" />
                    <SortTh label="Custo Total" field="custoTotal" {...veiculoSort} align="right" />
                    <SortTh label="KM Confirmado" field="kmConfirmado" {...veiculoSort} align="right" />
                    <SortTh label="KM Informado" field="kmInformado" {...veiculoSort} align="right" />
                    <SortTh label="Idade (meses)" field="idadeMeses" {...veiculoSort} align="right" />
                    <SortTh label="Custo/KM" field="custoKm" {...veiculoSort} align="right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagedV.map((row, i) => {
                    const isOpenV = expandedVeiculos.has(row.placa);
                    const osRowsV = osByPlaca.get(row.placa) || [];
                    return (
                      <>
                        <tr key={`v-${i}`} className={`hover:bg-muted/30 transition-colors ${isOpenV ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => toggleVeiculo(row.placa)} className="text-muted-foreground hover:text-indigo-600 transition-colors" title={isOpenV ? 'Recolher' : 'Expandir OS'}>
                              {isOpenV ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-indigo-600">{row.placa}</td>
                          <td className="px-3 py-2 text-xs truncate max-w-[160px]">{row.modelo}</td>
                          <td className="px-3 py-2 text-xs">{row.categoria}</td>
                          <td className="px-3 py-2 text-xs truncate max-w-[140px]">{row.cliente}</td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.contrato}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums">{row.qtdOS}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums font-semibold">{fmtBRL(row.custoTotal)}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums">{row.kmConfirmado > 0 ? fmtNum(row.kmConfirmado) : '—'}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">{row.kmInformado > 0 ? fmtNum(row.kmInformado) : '—'}</td>
                          <td className={`px-3 py-2 text-right text-xs tabular-nums ${row.idadeMeses > 60 ? 'text-rose-600 font-medium' : ''}`}>{row.idadeMeses || '—'}</td>
                          <td className={`px-3 py-2 text-right text-xs tabular-nums ${(row.custoKm || 0) > 0.5 ? 'bg-rose-50 text-rose-700 font-semibold' : ''}`}>
                            {row.kmConfirmado > 0 ? `R$ ${(row.custoKm || 0).toFixed(2)}` : '—'}
                          </td>
                        </tr>
                        {isOpenV && osRowsV.map((os, j) => (
                          <tr key={`v-${i}-os-${j}`} className="bg-indigo-50/60 dark:bg-indigo-950/30 border-l-2 border-indigo-300">
                            <td className="px-2 py-1" />
                            <td className="px-3 py-1 font-mono text-xs text-muted-foreground pl-6">{os.Placa || '—'}</td>
                            <td className="px-3 py-1 text-xs text-muted-foreground">{fmtDate(os.DataCriacao || os.DataEntrada)}</td>
                            <td className="px-3 py-1 text-xs">{os.Tipo || os.TipoManutencao || '—'}</td>
                            <td className="px-3 py-1 text-xs truncate max-w-[130px]">{os.Fornecedor || '—'}</td>
                            <td className="px-3 py-1 font-mono text-xs text-muted-foreground">{os.OrdemServico || '—'}</td>
                            <td className="px-3 py-1 text-right text-xs tabular-nums text-muted-foreground">1</td>
                            <td className="px-3 py-1 text-right text-xs tabular-nums font-medium">{fmtBRL(parseCurrency(os.ValorTotal))}</td>
                            <td /><td /><td />
                            <td className="px-3 py-1">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                String(os.SituacaoOcorrencia || '').includes('Concluí') ? 'bg-emerald-50 text-emerald-700'
                                : String(os.SituacaoOcorrencia || '').includes('Ativa') ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-50 text-slate-600'
                              }`}>{os.SituacaoOcorrencia || '—'}</span>
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/30 font-semibold border-t border-border sticky bottom-0">
                  <tr>
                    <td className="px-3 py-2 text-xs" colSpan={2}>TOTAL ({vehicleTable.length})</td>
                    <td /><td /><td />
                    <td className="px-3 py-2 text-right text-xs tabular-nums">{vehicleTable.reduce((s,r)=>s+r.qtdOS,0)}</td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">{fmtBRL(vehicleTable.reduce((s,r)=>s+r.custoTotal,0))}</td>
                    <td /><td /><td />
                    <td className="px-3 py-2 text-right text-xs tabular-nums">
                      {vehicleTable.reduce((s,r)=>s+r.kmConfirmado,0) > 0
                        ? `R$ ${(vehicleTable.reduce((s,r)=>s+r.custoTotal,0) / vehicleTable.reduce((s,r)=>s+r.kmConfirmado,0)).toFixed(2)}`
                        : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {totalPagesV > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                <span>Página {pageVeiculo} de {totalPagesV} · {vehicleTable.length} veículos</span>
                <div className="flex gap-1">
                  <button onClick={() => setPageVeiculo(1)} disabled={pageVeiculo === 1} className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40">«</button>
                  <button onClick={() => setPageVeiculo(p => Math.max(1, p - 1))} disabled={pageVeiculo === 1} className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40">‹</button>
                  {Array.from({ length: Math.min(5, totalPagesV) }, (_, k) => {
                    const start = Math.max(1, Math.min(pageVeiculo - 2, totalPagesV - 4));
                    return start + k;
                  }).map(p => (
                    <button key={p} onClick={() => setPageVeiculo(p)} className={`px-2 py-1 rounded border ${ p === pageVeiculo ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold' : 'border-border hover:bg-muted'}`}>{p}</button>
                  ))}
                  <button onClick={() => setPageVeiculo(p => Math.min(totalPagesV, p + 1))} disabled={pageVeiculo === totalPagesV} className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40">›</button>
                  <button onClick={() => setPageVeiculo(totalPagesV)} disabled={pageVeiculo === totalPagesV} className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40">»</button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ═════════ SECTION: Itens de OS ═════════ */}
      {activeSection === 'itens' && (() => {
        const totalPagesI = Math.ceil(itensFiltered.length / PAGE_SIZE);
        const pagedI = itensFiltered.slice((pageItens - 1) * PAGE_SIZE, pageItens * PAGE_SIZE);
        return (
        <div className="space-y-4">
          {/* GrupoDespesa summary table */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Itens Agrupados por Grupo de Despesa</span>
            </div>
            {loadingItems ? (
              <div className="p-6 space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Grupo de Despesa</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Tipo Item</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold">Qtd Itens</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold">Valor Total Itens</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold">Val. Reemb. (OS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {grupoDespesaAgg.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 text-xs font-medium">{row.grupo}</td>
                        <td className="px-3 py-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {row.tipo}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-xs tabular-nums">{row.qtd}</td>
                        <td className="px-3 py-2 text-right text-xs tabular-nums font-semibold">{fmtBRL(row.valorTotal)}</td>
                        <td className="px-3 py-2 text-right text-xs tabular-nums text-sky-600">{fmtBRL(row.reembolsavel)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {grupoDespesaAgg.length > 0 && (
                    <tfoot className="bg-muted/30 font-semibold border-t border-border">
                      <tr>
                        <td className="px-3 py-2 text-xs">TOTAL</td>
                        <td />
                        <td className="px-3 py-2 text-right text-xs tabular-nums">{grupoDespesaAgg.reduce((s, r) => s + r.qtd, 0)}</td>
                        <td className="px-3 py-2 text-right text-xs tabular-nums">{fmtBRL(grupoDespesaAgg.reduce((s, r) => s + r.valorTotal, 0))}</td>
                        <td className="px-3 py-2 text-right text-xs tabular-nums text-sky-600">{fmtBRL(grupoDespesaAgg.reduce((s, r) => s + r.reembolsavel, 0))}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>

          {/* Detailed items table */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-wrap gap-2">
              <span className="text-sm font-semibold text-foreground">
                Detalhamento de Itens de OS
                {itensFiltered.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({itensFiltered.length.toLocaleString('pt-BR')} itens
                    {loadingItems ? ' — carregando…' : ''})
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar item, OS, placa…"
                    className="pl-7 pr-3 h-8 text-xs rounded-md border border-border bg-background w-52 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={exportItens} className="text-xs h-7">
                  <Download className="w-3 h-3 mr-1" /> CSV
                </Button>
              </div>
            </div>

            {loadingItems && itensFiltered.length === 0 ? (
              <div className="p-6 space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : itensFiltered.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                {allItens.length === 0
                  ? 'Aguardando carregamento dos itens de OS…'
                  : 'Nenhum item encontrado para os filtros selecionados. Selecione um cliente ou contrato no filtro acima.'}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border sticky top-0 z-10">
                    <tr>
                      <SortTh label="OS" field="os" {...itensSort} />
                      <SortTh label="Placa" field="placa" {...itensSort} />
                      <SortTh label="Cliente" field="cliente" {...itensSort} />
                      <SortTh label="Contrato" field="contrato" {...itensSort} />
                      <SortTh label="Grupo Despesa" field="grupoDespesa" {...itensSort} />
                      <SortTh label="Despesa / Item" field="descricaoItem" {...itensSort} />
                      <SortTh label="Tipo Item" field="tipoItem" {...itensSort} />
                      <SortTh label="Tipo Manut." field="tipoManutencao" {...itensSort} />
                      <SortTh label="Qtd" field="quantidade" {...itensSort} align="right" />
                      <SortTh label="Valor Item" field="valorItem" {...itensSort} align="right" />
                      <SortTh label="Val. Reemb. (OS)" field="valorReembolsavel" {...itensSort} align="right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagedI.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{row.os}</td>
                        <td className="px-3 py-1.5 font-mono text-xs font-semibold text-indigo-600">{row.placa}</td>
                        <td className="px-3 py-1.5 text-xs truncate max-w-[130px]">{row.cliente}</td>
                        <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{row.contrato}</td>
                        <td className="px-3 py-1.5 text-xs truncate max-w-[160px]">{row.grupoDespesa}</td>
                        <td className="px-3 py-1.5 text-xs truncate max-w-[200px]">{row.descricaoItem}</td>
                        <td className="px-3 py-1.5">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                            {row.tipoItem}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-xs">{row.tipoManutencao || '—'}</td>
                        <td className="px-3 py-1.5 text-right text-xs tabular-nums">{row.quantidade}</td>
                        <td className="px-3 py-1.5 text-right text-xs tabular-nums font-semibold">{fmtBRL(row.valorItem)}</td>
                        <td className="px-3 py-1.5 text-right text-xs tabular-nums text-sky-600">
                          {row.valorReembolsavel > 0 ? fmtBRL(row.valorReembolsavel) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 font-semibold border-t border-border sticky bottom-0">
                    <tr>
                      <td className="px-3 py-2 text-xs" colSpan={8}>TOTAL ({itensFiltered.length})</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">{itensFiltered.reduce((s,r)=>s+(r.quantidade||1),0)}</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">{fmtBRL(itensFiltered.reduce((s,r)=>s+r.valorItem,0))}</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-sky-600">{fmtBRL(itensFiltered.reduce((s,r)=>s+r.valorReembolsavel,0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            {totalPagesI > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                <span>Página {pageItens} de {totalPagesI} · {itensFiltered.length} itens</span>
                <div className="flex gap-1">
                  <button onClick={() => setPageItens(1)} disabled={pageItens === 1} className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40">«</button>
                  <button onClick={() => setPageItens(p => Math.max(1, p - 1))} disabled={pageItens === 1} className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40">‹</button>
                  {Array.from({ length: Math.min(5, totalPagesI) }, (_, k) => {
                    const start = Math.max(1, Math.min(pageItens - 2, totalPagesI - 4));
                    return start + k;
                  }).map(p => (
                    <button key={p} onClick={() => setPageItens(p)} className={`px-2 py-1 rounded border ${ p === pageItens ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold' : 'border-border hover:bg-muted'}`}>{p}</button>
                  ))}
                  <button onClick={() => setPageItens(p => Math.min(totalPagesI, p + 1))} disabled={pageItens === totalPagesI} className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40">›</button>
                  <button onClick={() => setPageItens(totalPagesI)} disabled={pageItens === totalPagesI} className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40">»</button>
                </div>
              </div>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
