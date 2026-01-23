import { useMemo, useState, useRef, useEffect, Fragment } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import {
    ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend, BarChart, LabelList, AreaChart, Area, Brush
} from 'recharts';
import {
    ShoppingBag, Filter, ShieldAlert, ChevronDown, ChevronRight, Car, Search, FileSpreadsheet, ArrowUp, ArrowDown, Check, Square, CheckSquare, ArrowRightLeft
} from 'lucide-react';
import { useChartFilter } from '@/hooks/useChartFilter';
import { ChartFilterBadges, FloatingClearButton } from '@/components/analytics/ChartFilterBadges';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function parseNum(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number): string { return `R$ ${(v / 1000).toFixed(0)}k`; }
function fmtDecimal(v: number): string { return new Intl.NumberFormat('pt-BR').format(v); }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

function calcDelta(current: number, previous: number): number {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
}

function calcParcelasPagas(vencimentoPrimeira: string, totalParcelas: number): number {
    if (!vencimentoPrimeira) return 0;
    const inicio = new Date(vencimentoPrimeira);
    const hoje = new Date();
    if (isNaN(inicio.getTime())) return 0;
    let meses = (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth());
    if (hoje.getDate() >= inicio.getDate()) meses++;
    return Math.max(0, Math.min(meses, totalParcelas));
}

// --- COMPONENTE CUSTOMIZADO MULTI-SELECT ---
const MultiSelect = ({ options, selected, onChange, label }: { options: string[], selected: string[], onChange: (val: string[]) => void, label: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    const handleSelect = (val: string) => {
        if (selected.includes(val)) onChange(selected.filter(v => v !== val));
        else onChange([...selected, val]);
    };

    const toggleAll = () => {
        if (selected.length === options.length) onChange([]);
        else onChange([...options]);
    };

    const allSelected = options.length > 0 && selected.length === options.length;

    return (
        <div className="relative w-full" ref={ref}>
            <label className="text-xs text-slate-500 block mb-1">{label}</label>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white cursor-pointer flex justify-between items-center h-10 hover:border-blue-400 transition-colors"
            >
                <span className="truncate text-slate-700">
                    {selected.length === 0 ? 'Selecione...' : selected.length === options.length ? 'Todos selecionados' : `${selected.length} selecionados`}
                </span>
                <ChevronDown size={16} className="text-slate-400" />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {options.length > 0 && (
                        <div
                            onClick={toggleAll}
                            className="flex items-center gap-2 p-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 font-medium text-blue-600 sticky top-0 bg-white"
                        >
                            {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            <span className="text-sm">Selecionar Todos</span>
                        </div>
                    )}

                    {options.map(opt => (
                        <div
                            key={opt}
                            onClick={() => handleSelect(opt)}
                            className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                        >
                            <div className={`w-4 h-4 border rounded flex items-center justify-center ${selected.includes(opt) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                {selected.includes(opt) && <Check size={12} className="text-white" />}
                            </div>
                            <span className="text-sm text-slate-700 truncate">{opt}</span>
                        </div>
                    ))}
                    {options.length === 0 && <div className="p-2 text-xs text-slate-400 text-center">Sem opções</div>}
                </div>
            )}
        </div>
    );
};

// Tooltip Customizado
const CustomTooltipEvolution = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const delta = data.Delta || 0;
        const valorAnterior = data.ValorPrev || 0;
        const isPositive = delta >= 0;

        return (
            <div className="bg-white p-3 border border-slate-200 rounded shadow-lg text-sm min-w-[200px] z-50">
                <p className="font-bold mb-2 border-b pb-1 text-slate-700 capitalize">{label}</p>
                <div className="flex justify-between gap-4 mb-1"><span className="text-slate-500">Valor Atual:</span><span className="font-bold text-blue-600">{fmtBRL(data.Valor)}</span></div>
                <div className="flex justify-between gap-4 mb-1"><span className="text-slate-400 text-xs">Ano Anterior:</span><span className="text-slate-500 text-xs">{fmtBRL(valorAnterior)}</span></div>
                <div className="flex justify-between gap-4 mb-1"><span className="text-slate-500">Qtd:</span><span className="font-medium text-amber-600">{data.Qtd} veíc.</span></div>
                <div className="flex justify-between gap-4 border-t pt-2 mt-1 items-center">
                    <span className="text-slate-700 font-medium">Variação (YoY):</span>
                    <span className={`font-bold flex items-center px-2 py-0.5 rounded ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {isPositive ? <ArrowUp size={14} className="mr-1" /> : <ArrowDown size={14} className="mr-1" />}
                        {Math.abs(delta).toFixed(1)}%
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

export default function PurchasesDashboard(): JSX.Element {
    const { data: rawCompras } = useBIData<AnyObject[]>('dim_compras.json');
    const { data: rawAlienacoes } = useBIData<AnyObject[]>('dim_alienacoes.json');
    const { data: rawFrota } = useBIData<AnyObject[]>('dim_frota.json');

    const compras = useMemo(() => Array.isArray(rawCompras) ? rawCompras : [], [rawCompras]);
    const alienacoes = useMemo(() => Array.isArray(rawAlienacoes) ? rawAlienacoes : [], [rawAlienacoes]);
    const frota = useMemo(() => Array.isArray(rawFrota) ? rawFrota : [], [rawFrota]);

    const frotaMap = useMemo(() => {
        const map: Record<string, AnyObject> = {};
        frota.forEach(v => { if (v.Placa) map[v.Placa] = v; });
        return map;
    }, [frota]);

    const { filters, handleChartClick, clearFilter, clearAllFilters, hasActiveFilters, getFilterValues } = useChartFilter();

    const placaSituacaoFinanceiraMap = useMemo(() => {
        const map: Record<string, string> = {};
        alienacoes.forEach((a: AnyObject) => {
            if (a.Placa) {
                const saldo = parseCurrency(a.SaldoDevedor);
                map[a.Placa] = saldo > 100 ? (a.Situacao || 'Alienado') : 'Quitado';
            }
        });
        return map;
    }, [alienacoes]);

    const currentYear = new Date().getFullYear();
    const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
    const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
    const [activeTab, setActiveTab] = useState(0);
    const [page, setPage] = useState(0);
    const pageSize = 10;
    const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());
    const [forecastMonths, setForecastMonths] = useState<number | 'MAX'>(24);
    const [viewModelo, setViewModelo] = useState<'qtd' | 'fipe'>('qtd');

    // Filtros Multi-Select handled via useChartFilter
    const uniqueOptions = useMemo(() => ({
        montadoras: Array.from(new Set([...compras.map(r => r.Montadora), ...alienacoes.map(r => r.marca || r.Montadora)].filter(Boolean))).sort(),
        bancos: Array.from(new Set([...compras.map(r => r.Banco), ...alienacoes.map(r => r.banco || r.Banco)].filter(Boolean))).sort(),
        situacoesVeiculo: Array.from(new Set(frota.map(r => r.Status).filter(Boolean))).sort()
    }), [compras, frota, alienacoes]);

    const hasLocalActiveFilters = hasActiveFilters; // alias from hook
    const setFilterValues = (key: string, values: string[]) => {
        if (!values || values.length === 0) {
            clearFilter(key);
        } else {
            clearFilter(key);
            values.forEach(v => handleChartClick(key, v, { ctrlKey: true } as unknown as React.MouseEvent));
        }
    };

    // --- FILTRAGEM ---
    const filterFunction = (r: AnyObject, start: string, end: string) => {
        const d = r.DataCompra;
        const veiculoInfo = frotaMap[r.Placa] || {};
        const statusAtual = veiculoInfo.Status || 'Vendido/Inativo';
        const prop = veiculoInfo.Proprietario || 'Locadora';

        if (start && d < start) return false;
        if (end && d > end) return false;
        const fornecedores = getFilterValues('fornecedor');
        const montadoras = getFilterValues('montadora');
        const bancos = getFilterValues('banco');
        const situacoes = getFilterValues('situacaoVeiculo');
        const mes = (getFilterValues('mes') || [])[0] || null;
        const modelo = (getFilterValues('modelo') || [])[0] || null;
        const proprietario = (getFilterValues('proprietario') || [])[0] || null;
        const search = (getFilterValues('search') || [])[0] || '';

        if (fornecedores.length > 0 && !fornecedores.includes(r.Fornecedor)) return false;
        if (montadoras.length > 0 && !montadoras.includes(r.Montadora)) return false;
        if (bancos.length > 0 && !bancos.includes(r.Banco)) return false;
        if (situacoes.length > 0 && !situacoes.includes(statusAtual)) return false;
        if (mes && getMonthKey(d) !== mes) return false;
        if (modelo && r.Modelo !== modelo) return false;
        if (proprietario && prop !== proprietario) return false;

        if (search) {
            const term = search.toLowerCase();
            if (!r.Placa?.toLowerCase().includes(term) && !r.Modelo?.toLowerCase().includes(term)) return false;
        }
        return true;
    };

    const filteredCompras = useMemo(() => compras.filter(r => filterFunction(r, dateFrom, dateTo)), [compras, dateFrom, dateTo, filters, frotaMap]);

    // Ano Anterior (YoY)
    const prevDateFrom = useMemo(() => dateFrom.replace(String(currentYear), String(currentYear - 1)), [dateFrom, currentYear]);
    const prevDateTo = useMemo(() => dateTo.replace(String(currentYear), String(currentYear - 1)), [dateTo, currentYear]);
    const prevFilteredCompras = useMemo(() => compras.filter(r => filterFunction(r, prevDateFrom, prevDateTo)), [compras, prevDateFrom, prevDateTo, filters, frotaMap]);

    // CORRIGIDO: Mostra TODAS as alienações com saldo devedor, não apenas as das compras filtradas por data
    const filteredAlienacoes = useMemo(() => {
        return alienacoes.filter(a => parseCurrency(a.saldo_devedor) > 0 || parseCurrency(a.SaldoDevedor) > 0);
    }, [alienacoes]);


    // --- KPIs ---
    const calculateKPIs = (dataSet: AnyObject[]) => {
        const totalInvest = dataSet.reduce((s, r) => s + parseCurrency(r.ValorCompra), 0);
        const count = dataSet.length;
        const totalFipe = dataSet.reduce((s, r) => s + parseCurrency(r.ValorFipeAtual), 0);
        const totalAcessorios = dataSet.reduce((s, r) => s + parseCurrency(r.ValorAcessorios), 0);

        // Novo Cálculo: Média Ponderada da % FIPE
        const avgPctFipe = totalFipe > 0 ? (totalInvest / totalFipe) * 100 : 0;

        return { totalInvest, count, totalAcessorios, avgPctFipe, totalFipe };
    };

    const currentKPIs = useMemo(() => calculateKPIs(filteredCompras), [filteredCompras]);
    const prevKPIs = useMemo(() => calculateKPIs(prevFilteredCompras), [prevFilteredCompras]);

    const deltas = useMemo(() => ({
        invest: calcDelta(currentKPIs.totalInvest, prevKPIs.totalInvest),
        count: calcDelta(currentKPIs.count, prevKPIs.count),
        fipe: calcDelta(currentKPIs.totalFipe, prevKPIs.totalFipe)
    }), [currentKPIs, prevKPIs]);

    const fundingKPIs = useMemo(() => {
        const totalFinanced = filteredCompras.reduce((s, r) => s + parseCurrency(r.ValorFinanciado), 0);
        const totalInvest = currentKPIs.totalInvest;
        const leverage = totalInvest > 0 ? (totalFinanced / totalInvest) * 100 : 0;
        return { totalFinanced, leverage };
    }, [filteredCompras, currentKPIs]);

    const debtKPIs = useMemo(() => {
        const saldo = filteredAlienacoes.reduce((s, r) => s + parseCurrency(r.SaldoDevedor), 0);
        const fluxo = filteredAlienacoes.reduce((s, r) => s + parseCurrency(r.ValorParcela), 0);
        return { saldo, fluxo, contratos: new Set(filteredAlienacoes.map(a => a.NumeroContrato)).size };
    }, [filteredAlienacoes]);

    // --- CHART DATA ---
    const evolutionData = useMemo(() => {
        const map: any = {};
        filteredCompras.forEach(r => {
            const k = getMonthKey(r.DataCompra);
            if (!k) return;
            if (!map[k]) map[k] = { Valor: 0, Qtd: 0, ValorPrev: 0 };
            map[k].Valor += parseCurrency(r.ValorCompra);
            map[k].Qtd += 1;
        });
        prevFilteredCompras.forEach(r => {
            const kPrev = getMonthKey(r.DataCompra);
            if (!kPrev) return;
            const [y, m] = kPrev.split('-');
            const kCurrent = `${Number(y) + 1}-${m}`;
            if (!map[kCurrent]) map[kCurrent] = { Valor: 0, Qtd: 0, ValorPrev: 0 };
            map[kCurrent].ValorPrev += parseCurrency(r.ValorCompra);
        });
        return Object.keys(map).sort().map(k => ({
            date: k, label: monthLabel(k), ...map[k], Delta: calcDelta(map[k].Valor, map[k].ValorPrev)
        }));
    }, [filteredCompras, prevFilteredCompras]);

    const cashFlowForecast = useMemo(() => {
        const map: Record<string, number> = {};
        const today = new Date();
        const maxDate = new Date();
        if (forecastMonths === 'MAX') maxDate.setFullYear(today.getFullYear() + 10);
        else maxDate.setMonth(today.getMonth() + forecastMonths);

        filteredAlienacoes.forEach(a => {
            const parc = parseCurrency(a.ValorParcela);
            const venc = a.DataPrimeiroVencimento ? new Date(a.DataPrimeiroVencimento) : null;
            if (!venc || isNaN(venc.getTime())) return;

            const rest = parseNum(a.QuantidadeParcelasRemanescentes);
            if (rest <= 0 || parc <= 0) return;

            let currentMonth = new Date(Math.max(today.getTime(), venc.getTime()));
            if (today.getDate() > venc.getDate() && currentMonth.getMonth() === today.getMonth()) {
                currentMonth.setMonth(currentMonth.getMonth() + 1);
            }

            for (let i = 0; i < rest; i++) {
                if (currentMonth > maxDate) break;
                const k = getMonthKey(currentMonth.toISOString());
                map[k] = (map[k] || 0) + parc;
                currentMonth.setMonth(currentMonth.getMonth() + 1);
            }
        });

        return Object.keys(map).sort().map(k => ({ date: k, label: monthLabel(k), Fluxo: map[k] }));
    }, [filteredAlienacoes, forecastMonths]);

    const financialSitData = useMemo(() => {
        const map = { 'Alienado': { compra: 0, fipe: 0, qtd: 0 }, 'Próprio': { compra: 0, fipe: 0, qtd: 0 }, 'Quitado': { compra: 0, fipe: 0, qtd: 0 } };
        filteredCompras.forEach(r => {
            const sit = placaSituacaoFinanceiraMap[r.Placa] === 'Alienado' ? 'Alienado' : (placaSituacaoFinanceiraMap[r.Placa] === 'Quitado' ? 'Quitado' : 'Próprio');
            if (map[sit]) {
                map[sit].compra += parseCurrency(r.ValorCompra);
                map[sit].fipe += parseCurrency(r.ValorFipeAtual);
                map[sit].qtd += 1;
            }
        });
        return Object.entries(map).map(([name, v]) => ({ name, ...v })).filter(d => d.qtd > 0);
    }, [filteredCompras, placaSituacaoFinanceiraMap]);

    const qtdPorModelo = useMemo(() => {
        const map: any = {};
        filteredCompras.forEach(r => { const m = r.Modelo || 'Outros'; map[m] = (map[m] || 0) + 1; });
        return Object.entries(map).map(([name, value]: any) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredCompras]);

    const fipePorModelo = useMemo(() => {
        const map: any = {};
        filteredCompras.forEach(r => {
            const m = r.Modelo || 'Outros';
            const c = parseCurrency(r.ValorCompra);
            const f = parseCurrency(r.ValorFipeAtual);
            if (c > 0 && f > 0) { if (!map[m]) map[m] = { c: 0, f: 0 }; map[m].c += c; map[m].f += f; }
        });
        return Object.entries(map).map(([name, v]: any) => ({ name, value: (v.c / v.f) * 100 })).sort((a, b) => a.value - b.value).slice(0, 50);
    }, [filteredCompras]);

    const modelChartData = useMemo(() => {
        return viewModelo === 'qtd' ? qtdPorModelo.slice(0, 50) : fipePorModelo.slice(0, 50);
    }, [qtdPorModelo, fipePorModelo, viewModelo]);

    const qtdPorMontadora = useMemo(() => {
        const map: any = {};
        filteredCompras.forEach(r => { const m = r.Montadora || 'Outros'; map[m] = (map[m] || 0) + 1; });
        return Object.entries(map).map(([name, value]: any) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredCompras]);

    const ownerData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredCompras.forEach(r => { const prop = frotaMap[r.Placa]?.Proprietario || 'Locadora'; map[prop] = (map[prop] || 0) + 1; });
        return Object.entries(map).map(([name, value]: any) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredCompras, frotaMap]);

    // supplierData and bankData - computed but used in charts via other aggregations
    void filteredCompras.length; // Used for supplier stats

    const capitalMix = useMemo(() => {
        const prop = Math.max(0, currentKPIs.totalInvest - fundingKPIs.totalFinanced);
        return [{ name: 'Recurso Próprio', value: prop }, { name: 'Financiado', value: fundingKPIs.totalFinanced }];
    }, [currentKPIs, fundingKPIs]);

    const groupedContracts = useMemo(() => {
        const map: any = {};
        filteredAlienacoes.forEach((a: AnyObject) => {
            const num = a.NumeroContrato || 'N/D';
            const parc = parseCurrency(a.ValorParcela);
            const totalP = parseNum(a.TotalParcelas) || 36;
            const restP = parseNum(a.QuantidadeParcelasRemanescentes);
            const pagas = calcParcelasPagas(a.DataPrimeiroVencimento, totalP);

            if (!map[num]) map[num] = {
                id: num, banco: a.Banco, saldo: 0, parcela: 0, valorAlienado: 0, totalPago: 0,
                veiculos: [], totalP, restP, vencimento: a.DataPrimeiroVencimento
            };
            map[num].saldo += parseCurrency(a.SaldoDevedor);
            map[num].parcela += parc;
            map[num].valorAlienado += parseCurrency(a.ValorAlienado);
            map[num].totalPago += (parc * pagas);
            map[num].veiculos.push(a);
        });
        return Object.values(map).sort((a: any, b: any) => b.saldo - a.saldo);
    }, [filteredAlienacoes]);

    const tableData = useMemo(() => {
        return filteredCompras.map(r => {
            const compra = parseCurrency(r.ValorCompra);
            const fipe = parseCurrency(r.ValorFipeAtual);
            const acessorios = parseCurrency(r.ValorAcessorios);
            return {
                Placa: r.Placa, Modelo: r.Modelo, Fornecedor: r.Fornecedor,
                AnoFab: r.AnoFabricacao || r.AnoModelo,
                AnoMod: r.AnoModelo,
                compra, fipe, acessorios,
                pct: fipe > 0 ? (compra / fipe) * 100 : 0,
                situacao: placaSituacaoFinanceiraMap[r.Placa] || 'Próprio'
            };
        });
    }, [filteredCompras, placaSituacaoFinanceiraMap]);

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

    return (
        <div className="bg-slate-50 min-h-screen p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><Title className="text-slate-900">Gestão de Compras</Title><Text className="text-slate-500">Aquisição, Funding e Compliance.</Text></div>
                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex gap-2"><ShoppingBag className="w-4 h-4" /> Hub Ativos</div>
            </div>

            <FloatingClearButton onClick={clearAllFilters} show={hasLocalActiveFilters} />
            <ChartFilterBadges filters={filters} onClearFilter={clearFilter} onClearAll={clearAllFilters} />

            <Card className="bg-white shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4"><Filter className="w-4 h-4 text-slate-500" /><Text className="font-medium text-slate-700">Filtros</Text></div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div><Text className="text-xs text-slate-500 mb-1">Período</Text><div className="flex gap-2"><input type="date" className="border p-2 rounded text-sm w-full" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /><input type="date" className="border p-2 rounded text-sm w-full" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div></div>
                    <MultiSelect label="Situação Veículo" options={uniqueOptions.situacoesVeiculo} selected={getFilterValues('situacaoVeiculo')} onChange={(v) => setFilterValues('situacaoVeiculo', v)} />
                    <MultiSelect label="Montadora" options={uniqueOptions.montadoras} selected={getFilterValues('montadora')} onChange={(v) => setFilterValues('montadora', v)} />
                    <MultiSelect label="Banco" options={uniqueOptions.bancos} selected={getFilterValues('banco')} onChange={(v) => setFilterValues('banco', v)} />
                    <div><Text className="text-xs text-slate-500 mb-1">Busca (Placa)</Text><div className="relative"><Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" /><input type="text" className="border p-2 pl-8 rounded text-sm w-full h-10" placeholder="Placa ou Modelo" value={(getFilterValues('search') || [])[0] || ''} onChange={e => setFilterValues('search', [e.target.value])} /></div></div>
                </div>
                <div className="flex gap-2 mt-4 flex-wrap">
                    {/* badges rendered by ChartFilterBadges */}
                    {hasLocalActiveFilters && <button onClick={() => clearAllFilters()} className="text-xs text-red-500 underline ml-auto">Limpar Todos</button>}
                </div>
            </Card>

            <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
                {['Aquisição', 'Funding', 'Auditoria'].map((tab, idx) => (
                    <button key={idx} onClick={() => setActiveTab(idx)} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === idx ? 'bg-white shadow text-blue-600' : 'text-slate-600'}`}>{tab}</button>
                ))}
            </div>

            {activeTab === 0 && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <Card decoration="top" decorationColor="blue">
                            <Text>Investimento Total</Text>
                            <Metric>{fmtCompact(currentKPIs.totalInvest)}</Metric>
                            <Text className={`text-xs mt-1 ${deltas.invest >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{deltas.invest > 0 ? '▲' : '▼'} {Math.abs(deltas.invest).toFixed(1)}% vs ano anterior</Text>
                        </Card>
                        <Card decoration="top" decorationColor="emerald"><Text>Total FIPE</Text><Metric>{fmtCompact(currentKPIs.totalFipe)}</Metric><Text className="text-xs mt-1 text-slate-400">Patrimônio</Text></Card>
                        <Card decoration="top" decorationColor="amber"><Text>Acessórios</Text><Metric>{fmtCompact(currentKPIs.totalAcessorios)}</Metric></Card>
                        <Card decoration="top" decorationColor="violet"><Text>% Média FIPE (Pago)</Text><Metric>{fmtDecimal(currentKPIs.avgPctFipe)}%</Metric><Text className="text-xs text-slate-400">Compra / FIPE</Text></Card>
                        <Card decoration="top" decorationColor="slate">
                            <Text>Veículos Adquiridos</Text>
                            <Metric>{fmtDecimal(currentKPIs.count)}</Metric>
                            <Text className={`text-xs mt-1 ${deltas.count >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{deltas.count > 0 ? '▲' : '▼'} {Math.abs(deltas.count).toFixed(1)}% vs ano anterior</Text>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2"><Title>Evolução de Compras (YoY)</Title><div className="h-72 mt-4"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={evolutionData} margin={{ right: 30 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" fontSize={12} /><YAxis yAxisId="left" fontSize={12} tickFormatter={fmtCompact} /><YAxis yAxisId="right" orientation="right" fontSize={12} /><Tooltip content={<CustomTooltipEvolution />} /><Bar yAxisId="left" dataKey="Valor" fill="#3b82f6" radius={[4, 4, 0, 0]} onClick={(d, e) => handleChartClick('mes', d.date, e as unknown as React.MouseEvent)} cursor="pointer"><LabelList dataKey="Valor" position="top" formatter={fmtCompact} fontSize={10} /></Bar><Line yAxisId="right" type="monotone" dataKey="Qtd" stroke="#f59e0b" strokeWidth={2} /></ComposedChart></ResponsiveContainer></div></Card>
                        <Card><Title>Compra vs FIPE por Situação</Title><div className="h-72 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={financialSitData} margin={{ top: 20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} tickFormatter={fmtCompact} /><Tooltip formatter={fmtBRL} /><Legend verticalAlign="bottom" /><Bar dataKey="compra" name="Compra" fill="#3b82f6" radius={[4, 4, 0, 0]}><LabelList dataKey="compra" position="top" formatter={fmtCompact} fontSize={10} fill="#3b82f6" /></Bar><Bar dataKey="fipe" name="FIPE" fill="#10b981" radius={[4, 4, 0, 0]}><LabelList dataKey="fipe" position="top" formatter={fmtCompact} fontSize={10} fill="#10b981" /></Bar></BarChart></ResponsiveContainer></div></Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card>
                            <div className="flex justify-between items-center mb-2">
                                <Title>Por Modelo</Title>
                                <button onClick={() => setViewModelo(p => p === 'qtd' ? 'fipe' : 'qtd')} className="text-xs bg-slate-100 px-2 py-1 rounded flex gap-1 items-center hover:bg-slate-200">
                                    <ArrowRightLeft size={12} /> {viewModelo === 'qtd' ? 'Ver % FIPE' : 'Ver Qtd'}
                                </button>
                            </div>
                            <div className="h-80 mt-2 overflow-y-auto pr-2">
                                <div style={{ height: Math.max(300, modelChartData.length * 30) }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={modelChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" fontSize={10} hide />
                                            <YAxis dataKey="name" type="category" width={100} fontSize={10} tick={{ fill: '#475569' }} />
                                            <Tooltip formatter={(v: any, n) => [n === 'value' ? (viewModelo === 'qtd' ? v : `${v.toFixed(1)}%`) : v, n]} />
                                            <Bar dataKey="value" fill={viewModelo === 'qtd' ? "#8b5cf6" : "#10b981"} radius={[0, 4, 4, 0]} barSize={20} onClick={(d, e) => handleChartClick('modelo', d.name, e as unknown as React.MouseEvent)} cursor="pointer">
                                                <LabelList dataKey="value" position="right" fontSize={10} fill="#64748b" formatter={(v: number) => viewModelo === 'qtd' ? v : `${v.toFixed(0)}%`} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </Card>
                        <Card><Title>Por Montadora (Qtd)</Title><div className="h-80 mt-4 overflow-y-auto pr-2"><div style={{ height: Math.max(300, qtdPorMontadora.length * 30) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={qtdPorMontadora} layout="vertical" margin={{ left: 10, right: 30 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" fontSize={10} hide /><YAxis dataKey="name" type="category" width={90} fontSize={10} tick={{ fill: '#475569' }} /><Tooltip /><Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={20} onClick={(d, e) => handleChartClick('montadora', d.name, e as unknown as React.MouseEvent)} cursor="pointer"><LabelList dataKey="value" position="right" fontSize={10} fill="#64748b" /></Bar></BarChart></ResponsiveContainer></div></div></Card>
                        <Card><Title>Por Proprietário (Qtd)</Title><div className="h-80 mt-4 overflow-y-auto pr-2"><div style={{ height: Math.max(200, ownerData.length * 40) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={ownerData} layout="vertical" margin={{ left: 10, right: 30 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" fontSize={10} hide /><YAxis dataKey="name" type="category" width={90} fontSize={10} tick={{ fill: '#475569' }} /><Tooltip /><Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={25} onClick={(d, e) => handleChartClick('proprietario', d.name, e as unknown as React.MouseEvent)} cursor="pointer"><LabelList dataKey="value" position="right" fontSize={10} fill="#64748b" /></Bar></BarChart></ResponsiveContainer></div></div></Card>
                    </div>

                    <Card className="p-0 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-2"><Title>Detalhamento de Aquisições</Title><span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{fmtDecimal(tableData.length)} registros</span></div>
                            <button onClick={() => exportToExcel(tableData, 'aquisicao_detalhada')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 transition-colors border px-3 py-1 rounded"><FileSpreadsheet size={16} /> Exportar Excel</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                                    <tr><th className="px-4 py-3">Placa</th><th className="px-4 py-3">Modelo</th><th className="px-4 py-3">Ano Fab/Mod</th><th className="px-4 py-3">Fornecedor</th><th className="px-4 py-3 text-right">Compra</th><th className="px-4 py-3 text-right">Acessórios</th><th className="px-4 py-3 text-right">FIPE</th><th className="px-4 py-3 text-center">% FIPE</th><th className="px-4 py-3">Situação</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pageItems.map((r) => (
                                        <tr key={r.Placa} className="hover:bg-blue-50">
                                            <td className="px-4 py-3 font-mono">{r.Placa}</td><td className="px-4 py-3">{r.Modelo}</td><td className="px-4 py-3 text-xs">{r.AnoFab}/{r.AnoMod}</td><td className="px-4 py-3 truncate max-w-[150px]">{r.Fornecedor}</td><td className="px-4 py-3 text-right font-bold">{fmtBRL(r.compra)}</td><td className="px-4 py-3 text-right text-slate-500">{fmtBRL(r.acessorios)}</td><td className="px-4 py-3 text-right text-slate-500">{fmtBRL(r.fipe)}</td><td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded text-xs ${r.pct <= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{r.pct.toFixed(1)}%</span></td><td className="px-4 py-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{r.situacao}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-between p-4 border-t border-slate-100"><div className="flex gap-2"><button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">←</button><button onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= tableData.length} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">→</button></div></div>
                    </Card>
                </div>
            )}

            {activeTab === 1 && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card decoration="top" decorationColor="purple"><Text>Total Financiado</Text><Metric>{fmtCompact(fundingKPIs.totalFinanced)}</Metric></Card>
                        <Card decoration="top" decorationColor="indigo"><Text>Alavancagem (LTV)</Text><Metric>{fundingKPIs.leverage.toFixed(1)}%</Metric></Card>
                        <Card decoration="top" decorationColor="rose"><Text>Saldo Devedor (Atual)</Text><Metric>{fmtCompact(debtKPIs.saldo)}</Metric></Card>
                        <Card decoration="top" decorationColor="cyan"><Text>Contratos</Text><Metric>{debtKPIs.contratos}</Metric></Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card><Title>Mix de Capital</Title><div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={capitalMix} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"><Cell fill="#10b981" /><Cell fill="#8b5cf6" /></Pie><Tooltip formatter={fmtBRL} /><Legend verticalAlign="bottom" /></PieChart></ResponsiveContainer></div></Card>
                        <Card>
                            <div className="flex justify-between items-center mb-4">
                                <Title>Previsão de Desencaixe</Title>
                                <div className="flex gap-1">
                                    {[12, 24, 36, 48].map(m => (<button key={m} onClick={() => setForecastMonths(m)} className={`text-xs px-2 py-1 rounded border ${forecastMonths === m ? 'bg-purple-600 text-white' : 'bg-white text-slate-600'}`}>{m}m</button>))}
                                    <button onClick={() => setForecastMonths('MAX')} className={`text-xs px-2 py-1 rounded border ${forecastMonths === 'MAX' ? 'bg-purple-600 text-white' : 'bg-white text-slate-600'}`}>Max</button>
                                </div>
                            </div>
                            <div className="h-64 mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={cashFlowForecast}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="label" fontSize={10} />
                                        <YAxis fontSize={10} tickFormatter={fmtCompact} />
                                        <Tooltip formatter={fmtBRL} />
                                        <Area type="monotone" dataKey="Fluxo" stroke="#f43f5e" fill="#ffe4e6" />
                                        <Brush dataKey="date" height={30} stroke="#f43f5e" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    <Card className="p-0 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <Title>Detalhamento de Funding (Contratos)</Title>
                            <button onClick={() => exportToExcel(groupedContracts, 'funding_contratos')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 transition-colors border px-3 py-1 rounded"><FileSpreadsheet size={16} /> Exportar Excel</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-purple-50 text-purple-800 uppercase text-xs"><tr><th className="p-3 w-10"></th><th className="p-3">Banco</th><th className="p-3">Contrato (Cód)</th><th className="p-3 text-center">Prazo</th><th className="p-3 text-right">Financiado</th><th className="p-3 text-right">Total Contrato</th><th className="p-3 text-right">Pago (Est.)</th><th className="p-3 text-right">Saldo Devedor</th><th className="p-3 text-center">Vencimento 1ª</th></tr></thead>
                                <tbody className="divide-y">
                                    {groupedContracts.map((c: any) => {
                                        const isExpanded = expandedContracts.has(c.id);
                                        const pagas = calcParcelasPagas(c.vencimento, c.totalP);
                                        return (
                                            <Fragment key={c.id}>
                                                <tr onClick={() => setExpandedContracts(prev => { const n = new Set(prev); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} className="hover:bg-purple-50/50 cursor-pointer">
                                                    <td className="p-3">{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                                                    <td className="p-3 font-medium">{c.banco}</td><td className="p-3 font-mono">{c.id}</td>
                                                    <td className="p-3 text-center text-xs bg-slate-100 rounded">{pagas}/{c.totalP}</td>
                                                    <td className="p-3 text-right text-slate-600">{fmtBRL(c.valorAlienado)}</td>
                                                    <td className="p-3 text-right text-slate-600">{fmtBRL(c.valorAlienado + (c.parcela * c.totalP))}</td>
                                                    <td className="p-3 text-right text-emerald-600">{fmtBRL(c.totalPago)}</td>
                                                    <td className="p-3 text-right font-bold text-rose-600">{fmtBRL(c.saldo)}</td>
                                                    <td className="p-3 text-center">{c.vencimento ? new Date(c.vencimento).toLocaleDateString('pt-BR') : '-'}</td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr><td colSpan={9} className="bg-slate-50 p-4"><table className="w-full text-xs bg-white rounded border"><thead className="bg-slate-100"><tr><th className="p-2">Placa</th><th className="p-2">Modelo</th><th className="p-2 text-right">Compra</th><th className="p-2 text-right">Entrada</th><th className="p-2 text-right">Vlr Financiado</th><th className="p-2 text-right">Vlr Parcela</th><th className="p-2 text-right">Saldo Devedor</th></tr></thead><tbody>{c.veiculos.map((v: any) => { const vlrCompra = parseCurrency(frotaMap[v.Placa]?.ValorCompra || 0); const vlrEntrada = parseCurrency(v.ValorEntrada || 0); return (<tr key={v.Placa} className="border-t"><td className="p-2 font-mono flex items-center gap-2"><Car size={12} />{v.Placa}</td><td className="p-2">{v.Modelo}</td><td className="p-2 text-right">{fmtBRL(vlrCompra)}</td><td className="p-2 text-right text-emerald-600">{fmtBRL(vlrEntrada)}</td><td className="p-2 text-right">{fmtBRL(parseCurrency(v.ValorAlienado))}</td><td className="p-2 text-right">{fmtBRL(parseCurrency(v.ValorParcela))}</td><td className="p-2 text-right">{fmtBRL(parseCurrency(v.SaldoDevedor))}</td></tr>); })}</tbody></table></td></tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 2 && (
                <Card><Title>Auditoria de Compras</Title><div className="flex items-center gap-2 mb-4 text-amber-600"><ShieldAlert /><Title className="text-amber-700">Anomalias</Title></div>{auditList.length > 0 ? (<table className="w-full text-sm text-left"><thead className="bg-amber-50 text-amber-800"><tr><th className="p-3">Placa</th><th className="p-3">Modelo</th><th className="p-3 text-right">Compra</th><th className="p-3 text-right">FIPE</th><th className="p-3">Alerta</th></tr></thead><tbody>{auditList.map((r: any) => (<tr key={r.Placa} className="border-t hover:bg-slate-50"><td className="p-3 font-mono">{r.Placa}</td><td className="p-3">{r.Modelo}</td><td className="p-3 text-right">{fmtBRL(r.compra)}</td><td className="p-3 text-right">{fmtBRL(r.fipe)}</td><td className="p-3"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{r.anomalies}</span></td></tr>))}</tbody></table>) : <div className="text-center py-10 text-emerald-600"><Text>Nenhuma anomalia crítica.</Text></div>}</Card>
            )}
        </div>
    );
}