import { useMemo } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Package, TrendingUp } from 'lucide-react';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number {
    return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
}

function fmtBRL(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtCompact(v: number): string {
    if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
    return `R$ ${v.toFixed(0)}`;
}

export default function AnalisePecasTab() {
    // Carregar dados de itens de OS (sharded por ano)
    const { data: itensRaw2022 } = useBIData<AnyObject[]>('fat_detalhe_itens_os_2022.json');
    const { data: itensRaw2023 } = useBIData<AnyObject[]>('fat_detalhe_itens_os_2023.json');
    const { data: itensRaw2024 } = useBIData<AnyObject[]>('fat_detalhe_itens_os_2024.json');
    const { data: itensRaw2025 } = useBIData<AnyObject[]>('fat_detalhe_itens_os_2025.json');
    const { data: itensRaw2026 } = useBIData<AnyObject[]>('fat_detalhe_itens_os_2026.json');

    const { filters: globalFilters } = useMaintenanceFilters();

    // Consolidar todos os anos
    const itensData = useMemo(() => {
        const allYears = [
            ...(Array.isArray(itensRaw2022) ? itensRaw2022 : []),
            ...(Array.isArray(itensRaw2023) ? itensRaw2023 : []),
            ...(Array.isArray(itensRaw2024) ? itensRaw2024 : []),
            ...(Array.isArray(itensRaw2025) ? itensRaw2025 : []),
            ...(Array.isArray(itensRaw2026) ? itensRaw2026 : []),
        ];
        return allYears;
    }, [itensRaw2022, itensRaw2023, itensRaw2024, itensRaw2025, itensRaw2026]);

    // Aplicar filtros
    const filteredItens = useMemo(() => {
        return itensData.filter((item: AnyObject) => {
            // Filtrar por placa se houver filtro global
            if (globalFilters.placas.length > 0 && !globalFilters.placas.includes(item.Placa)) {
                return false;
            }
            return true;
        });
    }, [itensData, globalFilters]);

    // KPIs de peças
    const kpis = useMemo(() => {
        const totalValor = filteredItens.reduce((s, i) => s + parseCurrency(i.Valor), 0);
        const totalItens = filteredItens.length;
        const valorMedio = totalItens > 0 ? totalValor / totalItens : 0;
        const totalQuantidade = filteredItens.reduce((s, i) => s + (i.Quantidade || 1), 0);

        return { totalValor, totalItens, valorMedio, totalQuantidade };
    }, [filteredItens]);

    // Top 10 peças mais caras
    const top10Pecas = useMemo(() => {
        const map: Record<string, { valor: number; quantidade: number; count: number }> = {};

        filteredItens.forEach((item: AnyObject) => {
            const desc = item.DescricaoItem || 'Não especificado';
            if (!map[desc]) map[desc] = { valor: 0, quantidade: 0, count: 0 };
            map[desc].valor += parseCurrency(item.Valor);
            map[desc].quantidade += item.Quantidade || 1;
            map[desc].count += 1;
        });

        return Object.entries(map)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 10);
    }, [filteredItens]);

    // Distribuição por grupo de despesa
    const porGrupoDespesa = useMemo(() => {
        const map: Record<string, number> = {};

        filteredItens.forEach((item: AnyObject) => {
            const grupo = item.GrupoDespesa || 'Outros';
            map[grupo] = (map[grupo] || 0) + parseCurrency(item.Valor);
        });

        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredItens]);

    // Top 10 veículos com mais gastos em peças
    const top10Veiculos = useMemo(() => {
        const map: Record<string, { valor: number; count: number }> = {};

        filteredItens.forEach((item: AnyObject) => {
            const placa = item.Placa || 'N/D';
            if (!map[placa]) map[placa] = { valor: 0, count: 0 };
            map[placa].valor += parseCurrency(item.Valor);
            map[placa].count += 1;
        });

        return Object.entries(map)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 10);
    }, [filteredItens]);

    const COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#f43f5e', '#06b6d4'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <Package className="h-6 w-6 text-blue-600" />
                <div>
                    <Title>Análise de Peças e Serviços</Title>
                    <Text className="text-slate-500">Detalhamento de itens utilizados nas ordens de serviço</Text>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card decoration="top" decorationColor="blue">
                    <Text>Valor Total</Text>
                    <Metric>{fmtCompact(kpis.totalValor)}</Metric>
                    <Text className="text-xs text-slate-400">Em peças e serviços</Text>
                </Card>
                <Card decoration="top" decorationColor="emerald">
                    <Text>Total de Itens</Text>
                    <Metric>{kpis.totalItens.toLocaleString('pt-BR')}</Metric>
                    <Text className="text-xs text-slate-400">Peças/serviços</Text>
                </Card>
                <Card decoration="top" decorationColor="amber">
                    <Text>Valor Médio</Text>
                    <Metric>{fmtBRL(kpis.valorMedio)}</Metric>
                    <Text className="text-xs text-slate-400">Por item</Text>
                </Card>
                <Card decoration="top" decorationColor="cyan">
                    <Text>Quantidade Total</Text>
                    <Metric>{kpis.totalQuantidade.toLocaleString('pt-BR')}</Metric>
                    <Text className="text-xs text-slate-400">Unidades</Text>
                </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 10 Peças Mais Caras */}
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <Title>Top 10 Peças/Serviços Mais Caros</Title>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={top10Pecas} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" fontSize={10} tickFormatter={fmtCompact} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={150}
                                    fontSize={9}
                                    tick={{ fill: '#64748b' }}
                                />
                                <Tooltip
                                    formatter={(v: any, name: string) => {
                                        if (name === 'valor') return [fmtBRL(v), 'Valor'];
                                        if (name === 'count') return [v, 'Ocorrências'];
                                        if (name === 'quantidade') return [v, 'Quantidade'];
                                        return [v, name];
                                    }}
                                />
                                <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={20}>
                                    {top10Pecas.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Distribuição por Grupo de Despesa */}
                <Card>
                    <Title className="mb-4">Distribuição por Tipo de Despesa</Title>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={porGrupoDespesa}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {porGrupoDespesa.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={fmtBRL} />
                                <Legend
                                    wrapperStyle={{ fontSize: '12px' }}
                                    formatter={(value, entry: any) => `${value}: ${fmtCompact(entry.payload.value)}`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Top 10 Veículos */}
            <Card>
                <Title className="mb-4">Top 10 Veículos com Maior Gasto em Peças</Title>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={top10Veiculos}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={11} angle={-45} textAnchor="end" height={80} />
                            <YAxis fontSize={11} tickFormatter={fmtCompact} />
                            <Tooltip
                                formatter={(v: any, name: string) => {
                                    if (name === 'valor') return [fmtBRL(v), 'Valor'];
                                    if (name === 'count') return [v, 'Itens'];
                                    return [v, name];
                                }}
                            />
                            <Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                {top10Veiculos.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* Tabela de Detalhes */}
            <Card>
                <Title className="mb-4">Detalhamento de Itens (Últimos 50)</Title>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 sticky top-0">
                            <tr>
                                <th className="p-2">OS</th>
                                <th className="p-2">Placa</th>
                                <th className="p-2">Grupo</th>
                                <th className="p-2">Descrição</th>
                                <th className="p-2 text-right">Qtd</th>
                                <th className="p-2 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItens.slice(0, 50).map((item: AnyObject, idx: number) => (
                                <tr key={idx} className="border-t hover:bg-slate-50">
                                    <td className="p-2 text-xs font-mono">{item.OS || '-'}</td>
                                    <td className="p-2 text-xs font-mono font-bold">{item.Placa || '-'}</td>
                                    <td className="p-2 text-xs">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                            {item.GrupoDespesa || 'Outros'}
                                        </span>
                                    </td>
                                    <td className="p-2 text-xs truncate max-w-xs">{item.DescricaoItem || '-'}</td>
                                    <td className="p-2 text-right text-xs">{item.Quantidade || 1}</td>
                                    <td className="p-2 text-right font-bold text-blue-600 text-xs">
                                        {fmtBRL(parseCurrency(item.Valor))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredItens.length > 50 && (
                    <Text className="text-xs text-slate-500 mt-2">
                        Mostrando 50 de {filteredItens.length.toLocaleString('pt-BR')} itens. Use os filtros para refinar a busca.
                    </Text>
                )}
            </Card>
        </div>
    );
}
