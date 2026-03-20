import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Layers, ListChecks, ShieldAlert, BarChart3, HeadphonesIcon as Headset, AlertCircle, MessageCircleQuestion, Clock, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTickets } from "@/hooks/useTickets";
import { useAtendimentos } from '@/hooks/useAtendimentos';
import { SLAGargalosPanel } from "@/components/tickets/SLAGargalosPanel";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AtendimentoPainelPage() {
    const { user } = useAuth();
    const { data: meusTickets, isLoading: isLoadingTickets } = useTickets({ atendente_id: user?.id });
    const { atendimentos, loading: isLoadingAtendimentos, error } = useAtendimentos();

    const myStats = useMemo(() => {
        const rows = meusTickets || [];
        const now = Date.now();
        const emAberto = rows.filter((t: any) => t.status !== "resolvido" && t.status !== "fechado");
        const slaVencido = emAberto.filter((t: any) => {
            const sla = t.sla_resolucao ? new Date(t.sla_resolucao).getTime() : 0;
            return sla > 0 && sla < now;
        });
        return { total: rows.length, emAberto: emAberto.length, slaVencido: slaVencido.length };
    }, [meusTickets]);

    const dashboardStats = useMemo(() => {
        if (!atendimentos.length) return null;

        const total = atendimentos.length;
        const reclamacoes = atendimentos.filter((a: any) => a.final_analysis !== 'Dúvida').length;
        const duvidas = total - reclamacoes;

        const resolved = atendimentos.filter((a: any) => a.resolved_at);
        const avgTime = resolved.reduce((acc: number, curr: any) => {
            const start = new Date(curr.created_at).getTime();
            const end = new Date(curr.resolved_at!).getTime();
            return acc + (end - start);
        }, 0) / (resolved.length || 1);
        const avgDays = Math.floor(avgTime / (1000 * 60 * 60 * 24));
        const avgHours = Math.floor((avgTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        const reclamacoesPorDepto = atendimentos.reduce((acc: Record<string, number>, curr: any) => {
            const depto = curr.department || 'Não Definido';
            acc[depto] = (acc[depto] || 0) + 1;
            return acc;
        }, {});

        const analiseFinal = atendimentos.reduce((acc: Record<string, number>, curr: any) => {
            const analise = curr.final_analysis || 'Em Branco';
            acc[analise] = (acc[analise] || 0) + 1;
            return acc;
        }, {});

        return {
            total,
            reclamacoes,
            duvidas,
            avgTime: `${avgDays}d ${avgHours}h`,
            reclamacoesPorDepto: Object.entries(reclamacoesPorDepto)
                .map(([name, value]) => ({ name, value: value as number }))
                .sort((a, b) => (b.value as number) - (a.value as number)),
            analiseFinal: Object.entries(analiseFinal)
                .map(([name, value]) => ({ name, value: value as number })),
        };
    }, [atendimentos]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Painel de Atendimento</h1>
                    <p className="text-sm text-muted-foreground">Visão unificada 360° de métricas, fila, casos atribuídos e SLA.</p>
                </div>
            </div>

            <Tabs defaultValue="visao_geral" className="space-y-6">
                <TabsList className="grid grid-cols-3 w-full md:w-auto h-auto">
                    <TabsTrigger value="visao_geral" className="gap-2 py-2"><BarChart3 className="h-4 w-4 hidden sm:block" />Visão Geral</TabsTrigger>
                    <TabsTrigger value="meus_casos" className="gap-2 py-2 relative">
                        <ListChecks className="h-4 w-4 hidden sm:block" />Meus Casos
                        {myStats.emAberto > 0 && <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-blue-500" />}
                    </TabsTrigger>
                    <TabsTrigger value="sla" className="gap-2 py-2 relative">
                        <ShieldAlert className="h-4 w-4 hidden sm:block" />SLA
                        {myStats.slaVencido > 0 && <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="visao_geral" className="space-y-6">
                    {isLoadingAtendimentos ? (
                        <div className="flex items-center justify-center p-12"><p className="text-muted-foreground">Carregando métricas...</p></div>
                    ) : error || !dashboardStats ? (
                        <div className="flex items-center justify-center p-12 border border-dashed rounded-lg bg-red-50/50"><p className="text-red-500">Erro ao carregar dados.</p></div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Total de Atendimentos</CardTitle>
                                        <Headset className="h-4 w-4 text-primary" />
                                    </CardHeader>
                                    <CardContent><div className="text-3xl font-bold">{dashboardStats.total}</div></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Reclamações</CardTitle>
                                        <AlertCircle className="h-4 w-4 text-orange-500" />
                                    </CardHeader>
                                    <CardContent><div className="text-3xl font-bold">{dashboardStats.reclamacoes}</div></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Dúvidas</CardTitle>
                                        <MessageCircleQuestion className="h-4 w-4 text-blue-500" />
                                    </CardHeader>
                                    <CardContent><div className="text-3xl font-bold">{dashboardStats.duvidas}</div></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Médio</CardTitle>
                                        <Clock className="h-4 w-4 text-green-500" />
                                    </CardHeader>
                                    <CardContent><div className="text-3xl font-bold">{dashboardStats.avgTime}</div></CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                <Card className="lg:col-span-3">
                                    <CardHeader>
                                        <CardTitle className="text-base font-semibold">Atendimentos por Departamento</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={dashboardStats.reclamacoesPorDepto} layout="vertical" margin={{ left: 30 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={140} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Bar dataKey="value" fill="#3B82F6" name="Total" radius={[0, 4, 4, 0]} barSize={24} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="text-base font-semibold">Análise Final</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie data={dashboardStats.analiseFinal} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} label>
                                                    {dashboardStats.analiseFinal.map((_entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Legend iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </TabsContent>

                <TabsContent value="meus_casos" className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="bg-slate-50 dark:bg-slate-900 border-dashed">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-muted-foreground">Total Atribuídos</p>
                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-3xl font-bold mt-2">{myStats.total}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Em andamento</p>
                                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <p className="text-3xl font-bold mt-2 text-blue-700 dark:text-blue-300">{myStats.emAberto}</p>
                            </CardContent>
                        </Card>
                        <Card className={`${myStats.slaVencido > 0 ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900' : 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900'}`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <p className={`text-sm font-medium ${myStats.slaVencido > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>SLA Vencido</p>
                                    {myStats.slaVencido > 0 ? <AlertCircle className="h-4 w-4 text-red-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                </div>
                                <p className={`text-3xl font-bold mt-2 ${myStats.slaVencido > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>{myStats.slaVencido}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Fila Pessoal</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingTickets && <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando casos...</div>}
                            {!isLoadingTickets && (meusTickets || []).length === 0 && (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                    <p className="text-lg font-medium text-muted-foreground">Sua fila está limpa!</p>
                                    <p className="text-sm text-muted-foreground/70">Nenhum caso em aberto no momento.</p>
                                </div>
                            )}
                            <div className="space-y-3">
                                {(meusTickets || []).map((t: any) => (
                                    <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-semibold text-primary">#{t.numero_ticket || t.id.substring(0, 8)}</span>
                                                <Badge variant={t.status === "resolvido" || t.status === "fechado" ? "secondary" : "default"} className="text-[10px] h-5">{t.status}</Badge>
                                            </div>
                                            <p className="text-sm font-medium truncate mb-1" title={t.titulo}>{t.titulo}</p>
                                            <p className="text-xs text-muted-foreground truncate">{t.clientes?.nome_fantasia || 'Cliente não identificado'}</p>
                                        </div>
                                        <div className="flex items-center sm:justify-end">
                                            <Link to={`/tickets/${t.id}`} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                                                Abrir Ticket
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sla" className="animate-in fade-in-50 duration-500">
                    <SLAGargalosPanel />
                </TabsContent>
            </Tabs>
        </div>
    );
}
