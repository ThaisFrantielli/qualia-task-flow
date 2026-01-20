import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { Building2, DollarSign, Calendar, TrendingDown, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useChartFilter } from '@/hooks/useChartFilter';
import { ChartFilterBadges, FloatingClearButton } from '@/components/analytics/ChartFilterBadges';
import { useNavigate } from 'react-router-dom';

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    const s = String(v).replace(/[^0-9.\\-]/g, '');
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

function fmtPercent(v: number): string {
    return `${v.toFixed(1)}%`;
}

interface VehicleData {
    placa: string;
    modelo: string;
    valorParcela: number;
    saldoDevedor: number;
    valorOriginal: number;
    parcelasRestantes: number;
    totalParcelas: number;
    situacao: string;
    taxaImplicita: number;
}

interface ContractData {
    banco: string;
    numeroContrato: string;
    tipo: string;
    qtdVeiculos: number;
    saldoTotal: number;
    parcelasRestantes: number;
    totalParcelas: number;
    veiculos: VehicleData[];
}

export default function FundingDashboard(): JSX.Element {
    const navigate = useNavigate();
    const { data: rawAlienacoes } = useBIData<AnyObject[]>('dim_alienacoes.json');

    const { filters, handleChartClick, clearFilter, clearAllFilters, hasActiveFilters, getFilterValues } = useChartFilter();
    const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());

    const toggleContract = (numeroContrato: string) => {
        setExpandedContracts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(numeroContrato)) {
                newSet.delete(numeroContrato);
            } else {
                newSet.add(numeroContrato);
            }
            return newSet;
        });
    };

    const alienacoes = useMemo(() => {
        const raw = (rawAlienacoes as any)?.data || rawAlienacoes || [];
        return Array.isArray(raw) ? raw : [];
    }, [rawAlienacoes]);

    const filteredAlienacoes = useMemo(() => {
        const selectedBanks = getFilterValues('banco');
        return alienacoes.filter((a: any) => {
            const saldo = parseCurrency(a.SaldoDevedor || 0);
            if (saldo <= 0) return false;
            if (selectedBanks.length > 0 && !selectedBanks.includes(a.Instituicao)) return false;
            return true;
        });
    }, [alienacoes, filters, getFilterValues]);

    // AGRUPAMENTO POR CONTRATO
    const groupedContracts = useMemo(() => {
        const contractMap: { [key: string]: ContractData } = {};

        filteredAlienacoes.forEach((a: any) => {
            const numeroContrato = a.NumeroContrato || 'SEM_CONTRATO';
            const parcelasRestantes = a.QuantidadeParcelasRemanescentes || 0;
            const totalParcelas = a.QuantidadeParcelas || 0;
            const valorParcela = parseCurrency(a.ValorParcela || 0);
            const saldoDevedor = parseCurrency(a.SaldoDevedor || 0);
            const valorOriginal = parseCurrency(a.ValorAlienado || 0);

            // Calcular taxa implícita
            const totalAPagar = valorParcela * totalParcelas;
            const jurosTotal = totalAPagar - valorOriginal;
            const taxaImplicita = valorOriginal > 0 ? (jurosTotal / valorOriginal) * 100 : 0;

            const veiculo: VehicleData = {
                placa: a.Placa || 'N/A',
                modelo: a.Modelo || 'N/A',
                valorParcela,
                saldoDevedor,
                valorOriginal,
                parcelasRestantes,
                totalParcelas,
                situacao: a.SituacaoFinanceiraVeiculo || 'N/A',
                taxaImplicita
            };

            if (!contractMap[numeroContrato]) {
                contractMap[numeroContrato] = {
                    banco: a.Instituicao || 'Outros',
                    numeroContrato,
                    tipo: a.TipoFinanciamento || 'N/A',
                    qtdVeiculos: 0,
                    saldoTotal: 0,
                    parcelasRestantes,
                    totalParcelas,
                    veiculos: []
                };
            }

            contractMap[numeroContrato].veiculos.push(veiculo);
            contractMap[numeroContrato].qtdVeiculos++;
            contractMap[numeroContrato].saldoTotal += saldoDevedor;
        });

        return Object.values(contractMap).sort((a, b) => b.saldoTotal - a.saldoTotal);
    }, [filteredAlienacoes]);

    // KPIs
    const kpis = useMemo(() => {
        if (filteredAlienacoes.length === 0) {
            return { saldoTotal: 0, fluxoMensal: 0, qtdContratos: 0, qtdVeiculos: 0, taxaMedia: 0, concentracao: 0 };
        }

        const saldoTotal = filteredAlienacoes.reduce((sum: number, a: any) =>
            sum + parseCurrency(a.SaldoDevedor || 0), 0);

        const fluxoMensal = filteredAlienacoes.reduce((sum: number, a: any) =>
            sum + parseCurrency(a.ValorParcela || 0), 0);

        const qtdVeiculos = filteredAlienacoes.length;
        const qtdContratos = groupedContracts.length;

        let taxaSum = 0;
        let taxaCount = 0;
        filteredAlienacoes.forEach((a: any) => {
            const valorOriginal = parseCurrency(a.ValorAlienado || 0);
            const valorParcela = parseCurrency(a.ValorParcela || 0);
            const totalParcelas = a.QuantidadeParcelas || 0;

            if (valorOriginal > 0 && totalParcelas > 0) {
                const totalAPagar = valorParcela * totalParcelas;
                const jurosTotal = totalAPagar - valorOriginal;
                const taxa = (jurosTotal / valorOriginal) * 100;
                taxaSum += taxa;
                taxaCount++;
            }
        });
        const taxaMedia = taxaCount > 0 ? taxaSum / taxaCount : 0;

        const bancoMap: { [key: string]: number } = {};
        filteredAlienacoes.forEach((a: any) => {
            const banco = a.Instituicao || 'Outros';
            const saldo = parseCurrency(a.SaldoDevedor || 0);
            bancoMap[banco] = (bancoMap[banco] || 0) + saldo;
        });
        const maiorExposicao = Math.max(...Object.values(bancoMap));
        const concentracao = saldoTotal > 0 ? (maiorExposicao / saldoTotal) * 100 : 0;

        return { saldoTotal, fluxoMensal, qtdContratos, qtdVeiculos, taxaMedia, concentracao };
    }, [filteredAlienacoes, groupedContracts.length]);

    const uniqueBanks = useMemo(() => {
        const banks = new Set<string>();
        alienacoes.forEach((a: any) => {
            const banco = a.Instituicao || 'Outros';
            banks.add(banco);
        });
        return Array.from(banks).sort();
    }, [alienacoes]);

    if (alienacoes.length === 0) {
        return (
            <div className="bg-slate-50 min-h-screen p-6">
                <Card className="max-w-2xl mx-auto">
                    <div className="text-center py-12">
                        <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                        <Title>Carregando dados...</Title>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 rounded-lg">
                        <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Gestão de Passivo</h1>
                        <p className="text-sm text-slate-500">Monitoramento de dívidas e financiamentos</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/analytics/compras')}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    ← Voltar
                </button>
            </div>

            {/* Filters */}
            <FloatingClearButton onClick={clearAllFilters} show={hasActiveFilters} />
            <ChartFilterBadges filters={filters} onClearFilter={clearFilter} onClearAll={clearAllFilters} />
            <Card className="bg-white border border-slate-200">
                <Text className="font-medium text-slate-700 mb-3">Filtros</Text>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="text-xs text-slate-500 mb-1 block">Banco</label>
                        <select
                            className="border p-2 rounded text-sm w-full"
                            value={(getFilterValues('banco') || [])[0] || ''}
                            onChange={(e) => {
                                const val = e.target.value || '';
                                if (!val) clearFilter('banco');
                                else handleChartClick('banco', val, { ctrlKey: false } as unknown as React.MouseEvent);
                            }}
                        >
                            <option value="">Todos os Bancos</option>
                            {uniqueBanks.map(bank => (
                                <option key={bank} value={bank}>{bank}</option>
                            ))}
                        </select>
                    </div>
                    {(getFilterValues('banco') || []).length > 0 && (
                        <button
                            onClick={() => clearFilter('banco')}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm"
                        >
                            Limpar
                        </button>
                    )}
                </div>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-0">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-white/80" />
                        <Text className="text-white/90">Saldo Devedor Total</Text>
                    </div>
                    <Metric className="text-white text-3xl">{fmtCompact(kpis.saldoTotal)}</Metric>
                    <Text className="text-white/70 text-xs mt-2">
                        {kpis.qtdContratos} contratos · {kpis.qtdVeiculos} veículos
                    </Text>
                </Card>

                <Card className="bg-white border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <Text className="text-slate-600">Fluxo Mensal</Text>
                    </div>
                    <Metric className="text-blue-600">{fmtBRL(kpis.fluxoMensal)}</Metric>
                    <Text className="text-xs text-slate-500 mt-2">Pagamentos mensais</Text>
                </Card>

                <Card className="bg-white border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-5 h-5 text-purple-600" />
                        <Text className="text-slate-600">% Custo Total Médio</Text>
                    </div>
                    <Metric className="text-purple-600">{fmtPercent(kpis.taxaMedia)}</Metric>
                    <Text className="text-xs text-slate-500 mt-2">Taxa implícita média</Text>
                </Card>

                <Card className={`border ${kpis.concentracao > 40 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className={`w-5 h-5 ${kpis.concentracao > 40 ? 'text-amber-600' : 'text-emerald-600'}`} />
                        <Text className="text-slate-600">Concentração</Text>
                    </div>
                    <Metric className={kpis.concentracao > 40 ? 'text-amber-600' : 'text-emerald-600'}>
                        {fmtPercent(kpis.concentracao)}
                    </Metric>
                    <Text className="text-xs text-slate-500 mt-2">
                        {kpis.concentracao > 40 ? '⚠️ Risco elevado' : '✅ Diversificado'}
                    </Text>
                </Card>
            </div>

            {/* Hierarchical Table */}
            <Card className="bg-white border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <Title>Contratos Agrupados</Title>
                        <Text>Tabela hierárquica com drill-down por veículo</Text>
                    </div>
                    <Badge color="indigo" size="lg">
                        {groupedContracts.length} contratos · {kpis.qtdVeiculos} veículos
                    </Badge>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-indigo-50 text-indigo-700 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 w-10"></th>
                                <th className="px-4 py-3">Banco</th>
                                <th className="px-4 py-3">Nº Contrato</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3 text-center">Qtd Veículos</th>
                                <th className="px-4 py-3 text-right">Saldo Total</th>
                                <th className="px-4 py-3 text-center">Progresso</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {groupedContracts.map((contract) => {
                                const isExpanded = expandedContracts.has(contract.numeroContrato);
                                const parcelasPagas = contract.totalParcelas - contract.parcelasRestantes;
                                const progressPercent = contract.totalParcelas > 0 ? (parcelasPagas / contract.totalParcelas) * 100 : 0;

                                return (
                                    <>
                                        {/* Linha Principal do Contrato */}
                                        <tr
                                            key={contract.numeroContrato}
                                            className="hover:bg-indigo-50/50 cursor-pointer"
                                            onClick={() => toggleContract(contract.numeroContrato)}
                                        >
                                            <td className="px-4 py-3">
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-indigo-600" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-900">{contract.banco}</td>
                                            <td className="px-4 py-3 text-slate-600 font-mono text-xs">{contract.numeroContrato}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                                    {contract.tipo}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-semibold text-slate-700">{contract.qtdVeiculos}</td>
                                            <td className="px-4 py-3 text-right font-bold text-indigo-600">{fmtBRL(contract.saldoTotal)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-xs font-medium text-slate-700">
                                                        {parcelasPagas}/{contract.totalParcelas}
                                                    </span>
                                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                                        <div
                                                            className="bg-indigo-600 h-2 rounded-full transition-all"
                                                            style={{ width: `${progressPercent}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-slate-500">{progressPercent.toFixed(0)}%</span>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Sub-tabela de Veículos (Drill-down) */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={7} className="px-0 py-0 bg-slate-50">
                                                    <table className="w-full text-xs">
                                                        <thead className="bg-slate-100 text-slate-600 uppercase">
                                                            <tr>
                                                                <th className="px-8 py-2 w-10"></th>
                                                                <th className="px-4 py-2">Placa</th>
                                                                <th className="px-4 py-2">Modelo</th>
                                                                <th className="px-4 py-2 text-right">Parcela</th>
                                                                <th className="px-4 py-2 text-right">Saldo</th>
                                                                <th className="px-4 py-2 text-center">% Custo Total</th>
                                                                <th className="px-4 py-2 text-center">Situação</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200">
                                                            {contract.veiculos.map((veiculo, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-100">
                                                                    <td className="px-8 py-2"></td>
                                                                    <td className="px-4 py-2 font-mono font-semibold text-slate-900">{veiculo.placa}</td>
                                                                    <td className="px-4 py-2 text-slate-600">{veiculo.modelo}</td>
                                                                    <td className="px-4 py-2 text-right font-medium text-slate-700">
                                                                        {fmtBRL(veiculo.valorParcela)}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-right font-bold text-indigo-600">
                                                                        {fmtBRL(veiculo.saldoDevedor)}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-center">
                                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${veiculo.taxaImplicita > kpis.taxaMedia
                                                                                ? 'bg-red-100 text-red-700'
                                                                                : 'bg-emerald-100 text-emerald-700'
                                                                            }`}>
                                                                            {fmtPercent(veiculo.taxaImplicita)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-2 text-center">
                                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${veiculo.situacao.toLowerCase().includes('atrasado') || veiculo.situacao.toLowerCase().includes('inadimplente')
                                                                                ? 'bg-red-100 text-red-700'
                                                                                : veiculo.situacao.toLowerCase().includes('em dia') || veiculo.situacao.toLowerCase() === 'regular'
                                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                                    : 'bg-slate-100 text-slate-700'
                                                                            }`}>
                                                                            {veiculo.situacao}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
