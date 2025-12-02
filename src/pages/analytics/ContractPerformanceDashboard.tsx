import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList } from '@tremor/react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
    Legend,
    LineChart,
    Line,
    ComposedChart
} from 'recharts';
import {
    FileText,
    TrendingUp,
    Car,
    AlertCircle,
    Calendar,
    Download,
    Filter,
    CheckCircle,
    XCircle,
    AlertTriangle,
    DollarSign
} from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- FUNÇÕES AUXILIARES ---
function fmtBRL(v: number) {
    try {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    } catch (e) {
        return String(v);
    }
}

function fmtPercent(v: number) {
    return `${v.toFixed(1)}%`;
}

function monthKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(ym: string) {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const mi = Number(m) - 1;
    return `${months[mi]}`; // Retorna apenas o mês como na imagem
}

// Parse seguro de moeda
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

export default function ContractPerformanceDashboard(): JSX.Element {
    // Hooks de dados
    const { data: contratosData } = useBIData<AnyObject[]>('contratos_ativos.json');
    const { data: financeiroData } = useBIData<AnyObject[]>('financeiro_completo.json');

    // Normalização de dados
    const contratos = useMemo(() => {
        const raw = (contratosData as any)?.data || contratosData || [];
        return Array.isArray(raw) ? raw : [];
    }, [contratosData]);

    const financeiro = useMemo(() => {
        const raw = (financeiroData as any)?.data || financeiroData || [];
        return Array.isArray(raw) ? raw : [];
    }, [financeiroData]);

    // Estados de Filtro
    const [selectedContract, setSelectedContract] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState<string>('2023-01-01');
    const [dateTo, setDateTo] = useState<string>('2023-12-31');
    const [statusFilter, setStatusFilter] = useState<string>('Todos');

    // Listas para filtros
    const contractsList = useMemo(() => {
        return contratos.map(c => ({
            id: c.IdContratoLocacao || c.NumeroContrato || c.Id,
            label: `${c.NumeroContrato || 'S/N'} - ${c.Cliente || c.Nome || 'Sem Cliente'}`
        })).filter(c => c.id);
    }, [contratos]);

    // === CÁLCULOS ===

    // 1. Filtragem
    const filteredContratos = useMemo(() => {
        return contratos.filter(c => {
            if (selectedContract !== 'all') {
                const id = c.IdContratoLocacao || c.NumeroContrato || c.Id;
                if (String(id) !== selectedContract) return false;
            }
            // Filtro de status se houver campo status
            if (statusFilter !== 'Todos') {
                // Simulação, pois o campo status pode variar
                const status = c.Status || c.Situacao || 'Ativo';
                if (status !== statusFilter) return false;
            }
            return true;
        });
    }, [contratos, selectedContract, statusFilter]);

    const filteredFinanceiro = useMemo(() => {
        return financeiro.filter(f => {
            const d = f.DataCompetencia || f.DataEmissao || f.Data;
            if (!d) return false;
            if (dateFrom && d < dateFrom) return false;
            if (dateTo && d > dateTo) return false;

            if (selectedContract !== 'all') {
                // Tenta vincular financeiro ao contrato selecionado
                // Assumindo que financeiro tem IdContratoLocacao ou Cliente match
                const contractId = String(f.IdContratoLocacao || '');
                // Se não tiver ID direto, tenta pelo nome do cliente (menos preciso)
                if (contractId) {
                    if (contractId !== selectedContract) return false;
                } else {
                    // Fallback: se selecionou contrato, pega o cliente desse contrato
                    const contrato = contractsList.find(c => String(c.id) === selectedContract);
                    if (contrato && f.Cliente && !contrato.label.includes(f.Cliente)) return false;
                }
            }
            return true;
        });
    }, [financeiro, dateFrom, dateTo, selectedContract, contractsList]);

    // 2. KPIs Principais
    const kpis = useMemo(() => {
        // Valor Contratado (Soma dos valores mensais dos contratos filtrados * meses no período)
        // Simplificação: Valor Mensal * 12 (ou proporcional ao filtro)
        // Para ficar igual a imagem, vamos somar o valor mensal vigente
        const valorMensalTotal = filteredContratos.reduce((acc, c) => acc + parseCurrency(c.ValorMensal || c.ValorVigente), 0);

        // Valor Faturado (Soma do financeiro filtrado)
        const valorFaturadoTotal = filteredFinanceiro.reduce((acc, f) => acc + parseCurrency(f.ValorFaturadoItem || f.ValorTotal), 0);

        // Percentual Execução
        // Estimativa: Faturado / (ValorMensal * Meses)
        // Vamos usar uma lógica simplificada: Faturado vs (ValorMensal * numero de meses no filtro)
        const d1 = new Date(dateFrom);
        const d2 = new Date(dateTo);
        const monthsDiff = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
        const valorContratadoPeriodo = valorMensalTotal * (monthsDiff > 0 ? monthsDiff : 1);

        const percExecucao = valorContratadoPeriodo > 0 ? (valorFaturadoTotal / valorContratadoPeriodo) * 100 : 0;

        // Veículos
        const veiculos = filteredContratos.reduce((acc, c) => acc + (Number(c.QtdVeiculos) || 0), 0);

        return {
            contratado: valorContratadoPeriodo,
            faturado: valorFaturadoTotal,
            execucao: percExecucao,
            veiculos: veiculos
        };
    }, [filteredContratos, filteredFinanceiro, dateFrom, dateTo]);

    // 3. Gráficos e Tabelas
    const monthlyData = useMemo(() => {
        const map: Record<string, { previsto: number, realizado: number }> = {};

        // Inicializa meses do período
        let curr = new Date(dateFrom);
        const end = new Date(dateTo);
        while (curr <= end) {
            const k = monthKey(curr);
            map[k] = { previsto: 0, realizado: 0 };
            curr.setMonth(curr.getMonth() + 1);
        }

        // Preenche Previsto (Baseado nos contratos ativos)
        // Simplificação: Distribui o valor mensal dos contratos em todos os meses
        filteredContratos.forEach(c => {
            const val = parseCurrency(c.ValorMensal || c.ValorVigente);
            Object.keys(map).forEach(k => {
                map[k].previsto += val;
            });
        });

        // Preenche Realizado (Financeiro)
        filteredFinanceiro.forEach(f => {
            const d = f.DataCompetencia || f.DataEmissao || f.Data;
            if (d) {
                const k = d.substring(0, 7); // YYYY-MM
                if (map[k]) {
                    map[k].realizado += parseCurrency(f.ValorFaturadoItem || f.ValorTotal);
                }
            }
        });

        return Object.entries(map).sort().map(([k, v]) => {
            const diff = v.realizado - v.previsto;
            const exec = v.previsto > 0 ? (v.realizado / v.previsto) * 100 : 0;
            return {
                monthKey: k,
                month: monthLabel(k),
                Previsto: v.previsto,
                Realizado: v.realizado,
                Diferenca: diff,
                Execucao: exec,
                Status: exec >= 90 ? 'OK' : exec >= 70 ? 'Atenção' : 'Crítico'
            };
        });
    }, [filteredContratos, filteredFinanceiro, dateFrom, dateTo]);

    // Distribuição de Veículos (Mock ou Dados Reais se tiver Tipo)
    const veiculosData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredContratos.forEach(c => {
            const tipo = c.TipoVeiculo || c.Categoria || 'Outros';
            map[tipo] = (map[tipo] || 0) + (Number(c.QtdVeiculos) || 1);
        });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [filteredContratos]);

    // Alertas (Gerados dinamicamente)
    const alertas = useMemo(() => {
        const alerts = [];
        // Verifica queda de desempenho
        const lowPerfMonths = monthlyData.filter(m => m.Execucao < 80 && m.Previsto > 0);
        if (lowPerfMonths.length > 0) {
            alerts.push({
                type: 'critical',
                title: `Queda de desempenho em ${lowPerfMonths[0].month}`,
                desc: `Faturamento ${fmtPercent(100 - lowPerfMonths[0].Execucao)} abaixo do previsto`
            });
        }

        // Verifica gap financeiro total
        const gapTotal = kpis.faturado - kpis.contratado;
        if (gapTotal < -1000) {
            alerts.push({
                type: 'warning',
                title: 'Atraso no faturamento',
                desc: `Gap acumulado de ${fmtBRL(gapTotal)}`
            });
        } else {
            alerts.push({
                type: 'success',
                title: 'SLA cumprido',
                desc: 'Metas financeiras dentro do esperado'
            });
        }

        return alerts;
    }, [monthlyData, kpis]);

    // Dados do Contrato (Card de Status)
    const contractInfo = useMemo(() => {
        if (filteredContratos.length === 1) {
            const c = filteredContratos[0];
            return {
                status: c.Status || 'Ativo',
                inicio: c.InicioContrato || c.Inicio || '-',
                fim: c.FimContrato || c.Fim || '-',
                renovacao: 'Renovação automática prevista'
            };
        }
        return {
            status: 'Múltiplos',
            inicio: dateFrom,
            fim: dateTo,
            renovacao: '-'
        };
    }, [filteredContratos, dateFrom, dateTo]);

    return (
        <div className="bg-slate-50 min-h-screen p-6 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Title className="text-slate-900 text-2xl font-bold">Análise de Desempenho de Contrato</Title>
                    <Text className="text-slate-500">Monitoramento completo do desempenho financeiro e operacional</Text>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
                    <Download size={16} />
                    Exportar Relatório
                </button>
            </div>

            {/* Filters */}
            <Card className="bg-white shadow-sm border border-slate-200 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Nome do Contrato/Cliente</label>
                        <select
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={selectedContract}
                            onChange={(e) => setSelectedContract(e.target.value)}
                        >
                            <option value="all">Todos os Contratos</option>
                            {contractsList.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Período de Análise</label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                            <input
                                type="date"
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Situação do Contrato</label>
                        <select
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="Todos">Todos</option>
                            <option value="Ativo">Ativo</option>
                            <option value="Encerrado">Encerrado</option>
                            <option value="Pendente">Pendente</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex-1 transition-colors">
                            Aplicar Filtros
                        </button>
                        <button
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            onClick={() => {
                                setSelectedContract('all');
                                setDateFrom('2023-01-01');
                                setDateTo('2023-12-31');
                                setStatusFilter('Todos');
                            }}
                        >
                            Limpar
                        </button>
                    </div>
                </div>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white shadow-sm border border-slate-200 rounded-xl p-4 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <Text className="text-slate-500 text-xs font-medium uppercase tracking-wide">Valor Contratado</Text>
                            <Metric className="text-slate-900 mt-1 text-2xl">{fmtBRL(kpis.contratado)}</Metric>
                            <div className="flex items-center gap-1 mt-2 text-xs text-blue-600 font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                                Contrato principal
                            </div>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <FileText className="text-blue-600 w-5 h-5" />
                        </div>
                    </div>
                </Card>

                <Card className="bg-white shadow-sm border border-slate-200 rounded-xl p-4 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <Text className="text-slate-500 text-xs font-medium uppercase tracking-wide">Valor Faturado</Text>
                            <Metric className="text-slate-900 mt-1 text-2xl">{fmtBRL(kpis.faturado)}</Metric>
                            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
                                <TrendingUp className="w-3 h-3" />
                                +12% vs período anterior
                            </div>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <DollarSign className="text-emerald-600 w-5 h-5" />
                        </div>
                    </div>
                </Card>

                <Card className="bg-white shadow-sm border border-slate-200 rounded-xl p-4 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <Text className="text-slate-500 text-xs font-medium uppercase tracking-wide">Percentual de Execução</Text>
                            <Metric className="text-slate-900 mt-1 text-2xl">{fmtPercent(kpis.execucao)}</Metric>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(kpis.execucao, 100)}%` }}></div>
                            </div>
                            <Text className="text-xs text-slate-400 mt-1">Meta: 95%</Text>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <TrendingUp className="text-amber-600 w-5 h-5" />
                        </div>
                    </div>
                </Card>

                <Card className="bg-white shadow-sm border border-slate-200 rounded-xl p-4 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <Text className="text-slate-500 text-xs font-medium uppercase tracking-wide">Veículos no Contrato</Text>
                            <Metric className="text-slate-900 mt-1 text-2xl">{kpis.veiculos}</Metric>
                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                                5 categorias de veículos
                            </div>
                        </div>
                        <div className="p-2 bg-violet-50 rounded-lg">
                            <Car className="text-violet-600 w-5 h-5" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Middle Section: Status, Previsto vs Realizado, Alertas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Status do Contrato */}
                <Card className="bg-white shadow-sm border border-slate-200 rounded-xl p-5">
                    <Title className="text-slate-900 text-sm font-bold mb-4">Status do Contrato</Title>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                <span className="text-sm font-medium text-slate-700">{contractInfo.status}</span>
                            </div>
                            <span className="text-xs text-slate-400">Vigência: 12 meses</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span>Início: <span className="text-slate-900 font-medium">{contractInfo.inicio}</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span>Término: <span className="text-slate-900 font-medium">{contractInfo.fim}</span></span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                            <CheckCircle className="w-3 h-3 text-slate-400" />
                            {contractInfo.renovacao}
                        </div>
                    </div>
                </Card>

                {/* Previsto vs Realizado Summary */}
                <Card className="bg-white shadow-sm border border-slate-200 rounded-xl p-5">
                    <Title className="text-slate-900 text-sm font-bold mb-4">Previsto vs Realizado</Title>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">Previsto</span>
                            <span className="text-sm font-semibold text-slate-900">{fmtBRL(kpis.contratado)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">Realizado</span>
                            <span className="text-sm font-semibold text-slate-900">{fmtBRL(kpis.faturado)}</span>
                        </div>
                        <div className="my-2 border-t border-slate-100"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">Diferença</span>
                            <span className={`text-sm font-bold ${kpis.faturado - kpis.contratado < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {fmtBRL(kpis.faturado - kpis.contratado)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">% Execução</span>
                            <span className="text-sm font-bold text-slate-900">{fmtPercent(kpis.execucao)}</span>
                        </div>
                    </div>
                </Card>

                {/* Alertas e Observações */}
                <Card className="bg-white shadow-sm border border-slate-200 rounded-xl p-5 relative">
                    <div className="flex justify-between items-center mb-4">
                        <Title className="text-slate-900 text-sm font-bold">Alertas e Observações</Title>
                        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{alertas.length} casos</span>
                    </div>
                    <div className="space-y-4">
                        {alertas.map((alert, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                                <div className={`mt-0.5 p-1 rounded-full ${alert.type === 'critical' ? 'bg-red-100 text-red-600' :
                                        alert.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                                            'bg-emerald-100 text-emerald-600'
                                    }`}>
                                    {alert.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{alert.title}</p>
                                    <p className="text-xs text-slate-500">{alert.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Evolução Mensal */}
                <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-200 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-6">
                        <Title className="text-slate-900 text-sm font-bold">Evolução Mensal - Previsto vs Realizado</Title>
                        <div className="flex bg-slate-100 rounded-lg p-0.5">
                            <button className="px-3 py-1 text-xs font-medium bg-white text-blue-600 shadow-sm rounded-md">Mensal</button>
                            <button className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-900">Trimestral</button>
                            <button className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-900">Anual</button>
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} barGap={8}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `R$ ${v / 1000}k`} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => fmtBRL(value)}
                                />
                                <Legend verticalAlign="top" align="center" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                                <Bar dataKey="Previsto" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={20} name="Previsto" />
                                <Bar dataKey="Realizado" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} name="Realizado" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Tendência de Desempenho (Line Chart) */}
                <Card className="bg-white shadow-sm border border-slate-200 rounded-xl p-5">
                    <Title className="text-slate-900 text-sm font-bold mb-6">Tendência de Desempenho</Title>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 120]} tickFormatter={(v) => `${v}%`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => fmtPercent(value)}
                                />
                                <Legend verticalAlign="top" align="center" iconType="plainline" wrapperStyle={{ paddingBottom: '20px' }} />
                                <Line type="monotone" dataKey="Execucao" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} name="% Execução" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Bottom Section: Pie & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Distribuição de Veículos */}
                <Card className="bg-white shadow-sm border border-slate-200 rounded-xl p-5">
                    <Title className="text-slate-900 text-sm font-bold mb-6">Distribuição de Veículos por Categoria</Title>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={veiculosData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {veiculosData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#60a5fa', '#34d399', '#ffb74d', '#a78bfa', '#f87171'][index % 5]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Detalhamento Mensal Table */}
                <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-200 rounded-xl p-5 overflow-hidden">
                    <Title className="text-slate-900 text-sm font-bold mb-4">Detalhamento Mensal</Title>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Mês</th>
                                    <th className="px-4 py-3 font-semibold">Previsto (R$)</th>
                                    <th className="px-4 py-3 font-semibold">Realizado (R$)</th>
                                    <th className="px-4 py-3 font-semibold">Diferença (R$)</th>
                                    <th className="px-4 py-3 font-semibold">% Execução</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {monthlyData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900">{row.month}</td>
                                        <td className="px-4 py-3 text-slate-500">{fmtBRL(row.Previsto)}</td>
                                        <td className="px-4 py-3 text-slate-500">{fmtBRL(row.Realizado)}</td>
                                        <td className={`px-4 py-3 font-medium ${row.Diferenca < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {row.Diferenca > 0 ? '+' : ''}{fmtBRL(row.Diferenca)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{fmtPercent(row.Execucao)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${row.Status === 'OK' ? 'bg-emerald-100 text-emerald-700' :
                                                    row.Status === 'Atenção' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>
                                                {row.Status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
