import { useMemo, useState, useRef, useEffect } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Car, Filter, X, ChevronDown, Check, Square, CheckSquare, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, Search, CheckCircle2, XCircle, MapPin, Warehouse, Timer, Archive } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function parseNum(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number) { return `R$ ${(v / 1000).toFixed(0)}k`; }
function fmtDecimal(v: number) { return new Intl.NumberFormat('pt-BR').format(v); }

interface FleetTableItem {
  Placa: string; Modelo: string; Status: string; IdadeVeiculo: number;
  compra: number; fipe: number; manut: number; tco: number; depreciacao: number;
  tipo: string; lat: number; lng: number; KmInformado: number; KmConfirmado: number; pctFipe: number;
  Patio: string; DiasNoStatus: number;
}

const MultiSelect = ({ options, selected, onChange, label }: { options: string[], selected: string[], onChange: (val: string[]) => void, label: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);
    const handleSelect = (val: string) => { if (selected.includes(val)) onChange(selected.filter(v => v !== val)); else onChange([...selected, val]); };
    const toggleAll = () => { if (selected.length === options.length) onChange([]); else onChange([...options]); };
    const allSelected = options.length > 0 && selected.length === options.length;
    return (
        <div className="relative w-full" ref={ref}>
            <label className="text-xs text-slate-500 block mb-1">{label}</label>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white cursor-pointer flex justify-between items-center h-10 hover:border-blue-400 transition-colors">
                <span className="truncate text-slate-700">{selected.length === 0 ? 'Selecione...' : selected.length === options.length ? 'Todos' : `${selected.length} sel.`}</span>
                <ChevronDown size={16} className="text-slate-400" />
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div onClick={toggleAll} className="flex items-center gap-2 p-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 font-medium text-blue-600 sticky top-0 bg-white">{allSelected ? <CheckSquare size={16} /> : <Square size={16} />}<span className="text-sm">Selecionar Todos</span></div>
                    {options.map(opt => (<div key={opt} onClick={() => handleSelect(opt)} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"><div className={`w-4 h-4 border rounded flex items-center justify-center ${selected.includes(opt) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>{selected.includes(opt) && <Check size={12} className="text-white" />}</div><span className="text-sm text-slate-700 truncate">{opt}</span></div>))}
                </div>
            )}
        </div>
    );
};

export default function FleetDashboard(): JSX.Element {
  const { data: frotaData } = useBIData<AnyObject[]>('dim_frota.json');
  const { data: manutencaoData } = useBIData<AnyObject[]>('fat_manutencao_os_*.json');

  const frota = useMemo(() => Array.isArray(frotaData) ? frotaData : [], [frotaData]);
  const manutencao = useMemo(() => (manutencaoData as any)?.data || manutencaoData || [], [manutencaoData]);

  const manutencaoMap = useMemo(() => {
    const map: Record<string, number> = {};
    manutencao.forEach((m: any) => { if(m.Placa) map[m.Placa] = (map[m.Placa] || 0) + parseCurrency(m.ValorTotal); });
    return map;
  }, [manutencao]);

  const [filterState, setFilterState] = useState<{ status: string[]; modelo: string[]; filial: string[]; search: string }>({ status: [], modelo: [], filial: [], search: '' });
  const [productivityFilter, setProductivityFilter] = useState<'todos' | 'produtiva' | 'improdutiva' | 'inativa'>('todos');
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const [sortConfig, setSortConfig] = useState<{ key: keyof FleetTableItem; direction: 'asc' | 'desc' } | null>(null);

  // CLASSIFICAÇÃO DE FROTA
  const getCategory = (status: string) => {
      const s = (status || '').toUpperCase();
      if (['LOCADO', 'LOCADO VEÍCULO RESERVA', 'USO INTERNO'].includes(s)) return 'Produtiva';
      if (['DEVOLVIDO', 'ROUBO / FURTO', 'BAIXADO', 'VENDIDO', 'SINISTRO PERDA TOTAL'].includes(s)) return 'Inativa';
      return 'Improdutiva';
  };

  const uniqueOptions = useMemo(() => ({
    status: Array.from(new Set(frota.map(r => r.Status).filter(Boolean))).sort(),
    modelos: Array.from(new Set(frota.map(r => r.Modelo).filter(Boolean))).sort(),
    filiais: Array.from(new Set(frota.map(r => r.Filial).filter(Boolean))).sort()
  }), [frota]);

  const hasActiveFilters = !!(filterState.status.length || filterState.modelo.length || filterState.filial.length || filterState.search || productivityFilter !== 'todos');

  const handleFilterChange = (key: keyof typeof filterState, values: string[]) => {
      setFilterState(prev => ({ ...prev, [key]: values }));
      setPage(0);
  };

  const filteredData = useMemo(() => {
    return frota.filter(r => {
      const cat = getCategory(r.Status);
      if (productivityFilter === 'produtiva' && cat !== 'Produtiva') return false;
      if (productivityFilter === 'improdutiva' && cat !== 'Improdutiva') return false;
      if (productivityFilter === 'inativa' && cat !== 'Inativa') return false;
      
      if (filterState.status.length > 0 && !filterState.status.includes(r.Status)) return false;
      if (filterState.modelo.length > 0 && !filterState.modelo.includes(r.Modelo)) return false;
      if (filterState.filial.length > 0 && !filterState.filial.includes(r.Filial)) return false;
      
      if (filterState.search) {
        const term = filterState.search.toLowerCase();
        if (!r.Placa?.toLowerCase().includes(term) && !r.Modelo?.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [frota, filterState, productivityFilter]);

  const kpis = useMemo(() => {
    const total = filteredData.length;
    const produtiva = filteredData.filter(r => getCategory(r.Status) === 'Produtiva');
    const improdutiva = filteredData.filter(r => getCategory(r.Status) === 'Improdutiva');
    const inativa = filteredData.filter(r => getCategory(r.Status) === 'Inativa');

    const kmTotal = filteredData.reduce((s, r) => s + parseNum(r.KmInformado), 0);
    const kmMedia = total > 0 ? kmTotal / total : 0;
    const idadeMedia = total > 0 ? filteredData.reduce((s, r) => s + parseNum(r.IdadeVeiculo), 0) / total : 0;
    
    const frotaAtivaTotal = produtiva.length + improdutiva.length;
    const taxaProdutividade = frotaAtivaTotal > 0 ? (produtiva.length / frotaAtivaTotal) * 100 : 0;
    
    const compraProd = produtiva.reduce((s, r) => s + parseCurrency(r.ValorCompra), 0);
    const fipeProd = produtiva.reduce((s, r) => s + parseCurrency(r.ValorFipeAtual), 0);
    const pctFipeProd = fipeProd > 0 ? (compraProd / fipeProd) * 100 : 0;
    
    const compraImprod = improdutiva.reduce((s, r) => s + parseCurrency(r.ValorCompra), 0);
    const fipeImprod = improdutiva.reduce((s, r) => s + parseCurrency(r.ValorFipeAtual), 0);
    const pctFipeImprod = fipeImprod > 0 ? (compraImprod / fipeImprod) * 100 : 0;

    return { 
      total, produtivaQtd: produtiva.length, improdutivaQtd: improdutiva.length, inativaQtd: inativa.length,
      kmMedia, idadeMedia, taxaProdutividade,
      compraProd, fipeProd, pctFipeProd,
      compraImprod, fipeImprod, pctFipeImprod
    };
  }, [filteredData]);

  // Charts
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => { map[r.Status] = (map[r.Status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const mapData = useMemo(() => filteredData.filter(r => r.Latitude && r.Longitude), [filteredData]);

  const kmDifferenceData = useMemo(() => {
    const ranges = { 'Sem Divergência': 0, 'Baixa (<1k)': 0, 'Média (1k-5k)': 0, 'Alta (>5k)': 0 };
    filteredData.forEach(r => {
        const diff = Math.abs(parseNum(r.KmInformado) - parseNum(r.KmConfirmado));
        if (diff === 0) ranges['Sem Divergência']++;
        else if (diff <= 1000) ranges['Baixa (<1k)']++;
        else if (diff <= 5000) ranges['Média (1k-5k)']++;
        else ranges['Alta (>5k)']++;
    });
    return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // ANÁLISE DE PÁTIO
  const agingData = useMemo(() => {
      const ranges = { '0-30 dias': 0, '31-60 dias': 0, '61-90 dias': 0, '90+ dias': 0 };
      filteredData.filter(r => getCategory(r.Status) === 'Improdutiva').forEach(r => {
          const dias = parseNum(r.DiasNoStatus);
          if (dias <= 30) ranges['0-30 dias']++;
          else if (dias <= 60) ranges['31-60 dias']++;
          else if (dias <= 90) ranges['61-90 dias']++;
          else ranges['90+ dias']++;
      });
      return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const patioData = useMemo(() => {
      const map: Record<string, number> = {};
      filteredData.filter(r => getCategory(r.Status) === 'Improdutiva').forEach(r => {
          const patio = r.Patio || 'Não Definido';
          map[patio] = (map[patio] || 0) + 1;
      });
      return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10);
  }, [filteredData]);

  const stuckVehicles = useMemo(() => {
      return filteredData
        .filter(r => getCategory(r.Status) === 'Improdutiva')
        .sort((a, b) => parseNum(b.DiasNoStatus) - parseNum(a.DiasNoStatus))
        .slice(0, 10);
  }, [filteredData]);

  const handleSort = (key: keyof FleetTableItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const tableData = useMemo((): FleetTableItem[] => {
    const data = filteredData.map(r => {
        const compra = parseCurrency(r.ValorCompra);
        const fipe = parseCurrency(r.ValorFipeAtual);
        const manut = manutencaoMap[r.Placa] || 0;
        const tco = compra + manut;
        return {
            Placa: r.Placa, Modelo: r.Modelo, Status: r.Status,
            IdadeVeiculo: parseNum(r.IdadeVeiculo),
            KmInformado: parseNum(r.KmInformado), KmConfirmado: parseNum(r.KmConfirmado),
            lat: parseNum(r.Latitude), lng: parseNum(r.Longitude),
            compra, fipe, manut, tco, depreciacao: compra - fipe,
            tipo: getCategory(r.Status),
            pctFipe: fipe > 0 ? (compra / fipe) * 100 : 0,
            Patio: r.Patio, DiasNoStatus: parseNum(r.DiasNoStatus)
        };
    });
    if (sortConfig !== null) {
      data.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [filteredData, manutencaoMap, sortConfig]);

  const pageItems = tableData.slice(page * pageSize, (page + 1) * pageSize);

  const exportToExcel = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {}).join(';');
    const rows = data.map(obj => Object.values(obj).map(v => typeof v === 'string' ? `"${v}"` : typeof v === 'number' ? v.toLocaleString('pt-BR') : v).join(';'));
    const csvContent = "\uFEFF" + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortIcon = ({ column }: { column: keyof FleetTableItem }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown size={14} className="ml-1 text-slate-400 inline" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-emerald-600 inline" /> : <ArrowDown size={14} className="ml-1 text-emerald-600 inline" />;
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Gestão de Frota</Title><Text className="text-slate-500">Análise de ativos, produtividade e localização.</Text></div>
        <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex gap-2 font-medium"><Car className="w-4 h-4"/> Hub Ativos</div>
      </div>

      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-slate-500"/><Text className="font-medium text-slate-700">Filtros</Text></div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setProductivityFilter('todos')} className={`px-4 py-1 text-xs font-medium rounded-md transition-all ${productivityFilter === 'todos' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Todos</button>
                <button onClick={() => setProductivityFilter('produtiva')} className={`px-4 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${productivityFilter === 'produtiva' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}><CheckCircle2 size={12}/> Produtiva</button>
                <button onClick={() => setProductivityFilter('improdutiva')} className={`px-4 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${productivityFilter === 'improdutiva' ? 'bg-white shadow text-rose-600' : 'text-slate-500'}`}><XCircle size={12}/> Improdutiva</button>
                <button onClick={() => setProductivityFilter('inativa')} className={`px-4 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${productivityFilter === 'inativa' ? 'bg-white shadow text-slate-600' : 'text-slate-500'}`}><Archive size={12}/> Inativa</button>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MultiSelect label="Status" options={uniqueOptions.status} selected={filterState.status} onChange={(v) => handleFilterChange('status', v)} />
            <MultiSelect label="Modelo" options={uniqueOptions.modelos} selected={filterState.modelo} onChange={(v) => handleFilterChange('modelo', v)} />
            <MultiSelect label="Filial" options={uniqueOptions.filiais} selected={filterState.filial} onChange={(v) => handleFilterChange('filial', v)} />
            <div><Text className="text-xs text-slate-500 mb-1">Busca (Placa)</Text><div className="relative"><Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400"/><input type="text" className="border p-2 pl-8 rounded text-sm w-full h-10" placeholder="Placa ou Modelo" value={filterState.search} onChange={e => handleFilterChange('search', [e.target.value] as any)}/></div></div>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
            {filterState.status.map(s => <span key={s} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded flex items-center gap-1">{s} <X size={12} className="cursor-pointer" onClick={() => handleFilterChange('status', filterState.status.filter(i => i !== s))}/></span>)}
            {hasActiveFilters && <button onClick={() => { setFilterState({ status: [], modelo: [], filial: [], search: '' }); setProductivityFilter('todos'); }} className="text-xs text-red-500 underline ml-auto">Limpar Todos</button>}
        </div>
      </Card>

      <Tabs defaultValue="visao-geral" className="space-y-6">
        <TabsList className="bg-white border"><TabsTrigger value="visao-geral">Visão Geral</TabsTrigger><TabsTrigger value="patio">Gestão de Pátio</TabsTrigger><TabsTrigger value="telemetria">Telemetria & Mapa</TabsTrigger></TabsList>

        <TabsContent value="visao-geral" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card decoration="top" decorationColor="blue"><Text>Total Frota Filtrada</Text><Metric>{fmtDecimal(kpis.total)}</Metric></Card>
            <Card decoration="top" decorationColor="emerald"><Text>Produtiva</Text><Metric>{fmtDecimal(kpis.produtivaQtd)}</Metric></Card>
            <Card decoration="top" decorationColor="rose"><Text>Improdutiva</Text><Metric>{fmtDecimal(kpis.improdutivaQtd)}</Metric></Card>
            <Card decoration="top" decorationColor="slate"><Text>Inativa</Text><Metric>{fmtDecimal(kpis.inativaQtd)}</Metric></Card>
            <Card decoration="top" decorationColor="violet"><Text>Idade Média</Text><Metric>{kpis.idadeMedia.toFixed(1)} m</Metric></Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-l-4 border-l-emerald-500"><div className="flex justify-between items-center mb-4"><Title className="text-emerald-700">Frota Produtiva</Title><span className="text-emerald-800 font-bold bg-emerald-100 px-2 py-1 rounded text-xs">{kpis.produtivaQtd} veículos</span></div><div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-slate-500">Valor Compra:</span><span className="font-bold">{fmtCompact(kpis.compraProd)}</span></div><div className="flex justify-between text-sm"><span className="text-slate-500">Valor FIPE:</span><span className="font-bold">{fmtCompact(kpis.fipeProd)}</span></div><div className="flex justify-between text-sm border-t pt-1"><span className="text-slate-500">% FIPE:</span><span className={`font-bold ${kpis.pctFipeProd <= 100 ? 'text-emerald-600' : 'text-red-600'}`}>{kpis.pctFipeProd.toFixed(1)}%</span></div></div></Card>
            <Card className="border-l-4 border-l-rose-500"><div className="flex justify-between items-center mb-4"><Title className="text-rose-700">Frota Improdutiva</Title><span className="text-rose-800 font-bold bg-rose-100 px-2 py-1 rounded text-xs">{kpis.improdutivaQtd} veículos</span></div><div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-slate-500">Valor Compra:</span><span className="font-bold">{fmtCompact(kpis.compraImprod)}</span></div><div className="flex justify-between text-sm"><span className="text-slate-500">Valor FIPE:</span><span className="font-bold">{fmtCompact(kpis.fipeImprod)}</span></div><div className="flex justify-between text-sm border-t pt-1"><span className="text-slate-500">% FIPE:</span><span className={`font-bold ${kpis.pctFipeImprod <= 100 ? 'text-emerald-600' : 'text-red-600'}`}>{kpis.pctFipeImprod.toFixed(1)}%</span></div></div></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><Title>Status da Frota</Title><div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" cursor="pointer" onClick={(d) => handleFilterChange('status', [d.name])}>{statusData.map((_, index) => (<Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#ef4444', '#64748b', '#3b82f6'][index % 5]} />))}</Pie><Tooltip /><Legend verticalAlign="bottom" height={36} /></PieChart></ResponsiveContainer></div></Card>
            <Card><Title>Taxa de Produtividade (Frota Ativa)</Title><div className="mt-8 space-y-4"><div className="flex justify-between text-sm font-medium"><span className="text-rose-600">Improdutiva ({(100 - kpis.taxaProdutividade).toFixed(1)}%)</span><span className="text-emerald-600">Produtiva ({kpis.taxaProdutividade.toFixed(1)}%)</span></div><Progress value={kpis.taxaProdutividade} className="h-4" /><Text className="text-xs text-slate-500 text-center mt-2">Considera apenas veículos ativos na frota.</Text></div></Card>
          </div>

          <Card className="p-0 overflow-hidden mt-6">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center"><div className="flex items-center gap-2"><Title>Detalhamento da Frota</Title><span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{fmtDecimal(tableData.length)} registros</span></div><button onClick={() => exportToExcel(tableData, 'frota_detalhada')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 transition-colors border px-3 py-1 rounded"><FileSpreadsheet size={16}/> Exportar</button></div>
              <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-600 uppercase text-xs"><tr><th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('Placa')}>Placa <SortIcon column="Placa"/></th><th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('Modelo')}>Modelo <SortIcon column="Modelo"/></th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-center cursor-pointer" onClick={() => handleSort('tipo')}>Tipo <SortIcon column="tipo"/></th><th className="px-6 py-3 text-right cursor-pointer" onClick={() => handleSort('compra')}>Compra <SortIcon column="compra"/></th><th className="px-6 py-3 text-right cursor-pointer" onClick={() => handleSort('fipe')}>FIPE <SortIcon column="fipe"/></th><th className="px-6 py-3 text-center cursor-pointer" onClick={() => handleSort('pctFipe')}>% FIPE <SortIcon column="pctFipe"/></th><th className="px-6 py-3 text-center cursor-pointer" onClick={() => handleSort('IdadeVeiculo')}>Idade <SortIcon column="IdadeVeiculo"/></th></tr></thead><tbody className="divide-y divide-slate-100">{pageItems.map((r, i) => (<tr key={i} className="hover:bg-slate-50"><td className="px-6 py-3 font-medium font-mono">{r.Placa}</td><td className="px-6 py-3">{r.Modelo}</td><td className="px-6 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${r.tipo === 'Produtiva' ? 'bg-emerald-100 text-emerald-700' : r.tipo === 'Improdutiva' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>{r.Status}</span></td><td className="px-6 py-3 text-center font-bold text-xs">{r.tipo}</td><td className="px-6 py-3 text-right">{fmtBRL(r.compra)}</td><td className="px-6 py-3 text-right">{fmtBRL(r.fipe)}</td><td className="px-6 py-3 text-center font-bold text-slate-600">{r.pctFipe.toFixed(1)}%</td><td className="px-6 py-3 text-center">{parseNum(r.IdadeVeiculo)} m</td></tr>))}</tbody></table></div>
              <div className="flex justify-between p-4 border-t border-slate-100"><div className="flex gap-2"><button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">←</button><button onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= tableData.length} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">→</button></div></div>
          </Card>
        </TabsContent>

        <TabsContent value="patio" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                <Card><div className="flex items-center gap-2 mb-4"><Timer size={16} className="text-amber-600"/><Title>Aging de Pátio (Dias Parado)</Title></div><div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={agingData} margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" fontSize={12}/><YAxis fontSize={12}/><Tooltip/><Bar dataKey="value" fill="#f59e0b" radius={[4,4,0,0]} barSize={40}><LabelList dataKey="value" position="top" fontSize={12} fill="#666"/></Bar></BarChart></ResponsiveContainer></div></Card>
                <Card><div className="flex items-center gap-2 mb-4"><Warehouse size={16} className="text-blue-600"/><Title>Veículos por Pátio (Improdutivos)</Title></div><div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={patioData} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" fontSize={12}/><YAxis dataKey="name" type="category" width={100} fontSize={10}/><Tooltip/><Bar dataKey="value" fill="#3b82f6" radius={[0,4,4,0]} barSize={20}><LabelList dataKey="value" position="right" fontSize={10} fill="#666"/></Bar></BarChart></ResponsiveContainer></div></Card>
            </div>
            <Card><Title>Top 10 Veículos "Encalhados"</Title><div className="overflow-x-auto mt-4"><table className="w-full text-sm text-left"><thead className="bg-slate-100"><tr><th className="p-2">Placa</th><th className="p-2">Modelo</th><th className="p-2">Pátio</th><th className="p-2">Status</th><th className="p-2 text-right">Dias Parado</th></tr></thead><tbody>{stuckVehicles.map((v, i) => (<tr key={i} className="border-t hover:bg-slate-50"><td className="p-2 font-mono">{v.Placa}</td><td className="p-2">{v.Modelo}</td><td className="p-2">{v.Patio}</td><td className="p-2"><span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs">{v.Status}</span></td><td className="p-2 text-right font-bold text-rose-600">{v.DiasNoStatus} dias</td></tr>))}</tbody></table></div></Card>
        </TabsContent>

        <TabsContent value="telemetria" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card><Title>Diferença de Odômetro (Info vs Conf)</Title><div className="h-72 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={kmDifferenceData} layout="vertical" margin={{ left: 40 }}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" fontSize={10} /><YAxis dataKey="name" type="category" width={100} fontSize={10} tick={{fill: '#475569'}}/><Tooltip /><Bar dataKey="value" fill="#0891b2" radius={[0,4,4,0]} barSize={20}><LabelList dataKey="value" position="right" fontSize={10} fill="#64748b" /></Bar></BarChart></ResponsiveContainer></div></Card>
                <Card className="p-0 overflow-hidden relative"><div className="p-4 border-b border-slate-100 flex items-center gap-2 absolute top-0 left-0 bg-white/90 z-10 w-full rounded-t-lg"><MapPin className="w-5 h-5 text-blue-600" /><Title>Localização</Title></div><div className="h-96 w-full"><MapContainer center={[-15.7942, -47.8822]} zoom={4} style={{ height: '100%', width: '100%' }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />{mapData.slice(0, 500).map((v, idx) => (<Marker key={idx} position={[v.Latitude, v.Longitude]}><Popup><div className="text-sm"><p className="font-bold">{v.Placa}</p><p>{v.Modelo}</p><p className="text-xs text-slate-500">{v.Status}</p></div></Popup></Marker>))}</MapContainer></div></Card>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}