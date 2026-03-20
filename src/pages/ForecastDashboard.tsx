import { useState } from 'react';
import { usePipeline, type OportunidadePipeline } from '@/hooks/usePipeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, Legend,
} from 'recharts';
import {
    TrendingUp, Target, DollarSign, AlertCircle,
    CheckCircle2, XCircle, Loader2, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

const BRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const STAGE_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

// ─── Modal: fechar como perdida ──────────────────────────────────────────────
function ModalPerdida({
    opp,
    motivosPerda,
    onClose,
    onConfirm,
}: {
    opp: OportunidadePipeline;
    motivosPerda: { id: string; nome: string }[];
    onClose: () => void;
    onConfirm: (motivo_perda_id: string, motivo_perda: string) => void;
}) {
    const [motivoId, setMotivoId] = useState('');
    const [motivoTexto, setMotivoTexto] = useState('');

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-destructive" />
                        Registrar Perda — {opp.titulo}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Motivo de perda *</Label>
                        <Select value={motivoId} onValueChange={setMotivoId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o motivo" />
                            </SelectTrigger>
                            <SelectContent>
                                {motivosPerda.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Observação adicional (opcional)</Label>
                        <Textarea
                            value={motivoTexto}
                            onChange={(e) => setMotivoTexto(e.target.value)}
                            placeholder="Descreva o contexto da perda..."
                            rows={3}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button
                        variant="destructive"
                        disabled={!motivoId}
                        onClick={() => {
                            if (!motivoId) {
                                toast.error('Selecione o motivo da perda');
                                return;
                            }
                            onConfirm(motivoId, motivoTexto);
                        }}
                    >
                        Confirmar Perda
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Modal: editar probabilidade ────────────────────────────────────────────
function ModalProbabilidade({
    opp,
    onClose,
    onSave,
}: {
    opp: OportunidadePipeline;
    onClose: () => void;
    onSave: (prob: number, dataFechamento: string) => void;
}) {
    const [prob, setProb] = useState(opp.probabilidade_ganho ?? 50);
    const [dataFechamento, setDataFechamento] = useState(opp.data_fechamento_prevista ?? '');

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Calibrar Pipeline — {opp.titulo}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Probabilidade de Ganho</Label>
                            <span className="text-2xl font-bold text-primary">{prob}%</span>
                        </div>
                        <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[prob]}
                            onValueChange={([v]) => setProb(v)}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0% — Improvável</span>
                            <span>50% — Em negociação</span>
                            <span>100% — Certo</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="data-fechamento">Data de Fechamento Prevista</Label>
                        <Input
                            id="data-fechamento"
                            type="date"
                            value={dataFechamento}
                            onChange={(e) => setDataFechamento(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={() => onSave(prob, dataFechamento)}>Salvar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Dashboard Forecast ──────────────────────────────────────────────────────
export default function ForecastDashboard() {
    const {
        oportunidades,
        isLoading,
        motivosPerda,
        forecast,
        forecastLoading,
        fecharComoPerdida,
        fecharComoGanho,
        updateProbabilidade,
        setDataFechamento,
    } = usePipeline();

    const [oppPerdida, setOppPerdida] = useState<OportunidadePipeline | null>(null);
    const [oppProb, setOppProb] = useState<OportunidadePipeline | null>(null);

    // KPIs
    const abertas = oportunidades.filter((o) => o.status === 'aberta');
    const totalBruto = abertas.reduce((s, o) => s + (Number(o.valor_total) || 0), 0);
    const totalPonderado = abertas.reduce((s, o) => {
        const prob = (o.probabilidade_ganho ?? 50) / 100;
        return s + (Number(o.valor_total) || 0) * prob;
    }, 0);
    const probMedia = abertas.length
        ? (abertas.reduce((s, o) => s + (o.probabilidade_ganho ?? 50), 0) / abertas.length).toFixed(0)
        : '0';

    // Gráfico de forecast por estágio
    const forecastByStage = forecast.reduce<Record<string, { nome: string; valor_ponderado: number; qtd: number }>>(
        (acc, f) => {
            const key = f.estagio_nome ?? 'Sem Estágio';
            if (!acc[key]) acc[key] = { nome: key, valor_ponderado: 0, qtd: 0 };
            acc[key].valor_ponderado += Number(f.valor_ponderado) || 0;
            acc[key].qtd += Number(f.qtd_oportunidades) || 0;
            return acc;
        },
        {},
    );
    const chartDataStage = Object.values(forecastByStage).sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR'),
    );

    // Distribuição por status
    const statusDist = [
        { name: 'Abertas', value: oportunidades.filter((o) => o.status === 'aberta').length, color: '#6366f1' },
        { name: 'Fechadas (Ganho)', value: oportunidades.filter((o) => o.status === 'fechada').length, color: '#22c55e' },
        { name: 'Perdidas', value: oportunidades.filter((o) => o.status === 'cancelada').length, color: '#ef4444' },
    ].filter((d) => d.value > 0);

    if (isLoading || forecastLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Oportunidades Abertas</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{abertas.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{BRL(totalBruto)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Forecast Ponderado</CardTitle>
                        <Target className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{BRL(totalPonderado)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Probabilidade Média</CardTitle>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{probMedia}%</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Forecast por Estágio */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Forecast por Estágio (Valor Ponderado)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {chartDataStage.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8 text-sm">
                                Nenhum dado de forecast disponível. Abra oportunidades e configure os estágios.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={chartDataStage}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                                    <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v: number) => BRL(v)} />
                                    <Bar dataKey="valor_ponderado" name="Valor Ponderado" radius={[4, 4, 0, 0]}>
                                        {chartDataStage.map((_, i) => (
                                            <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Distribuição por Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>Distribuição por Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {statusDist.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8 text-sm">Sem dados</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={statusDist}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="45%"
                                        outerRadius={80}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {statusDist.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                    <Tooltip formatter={(v: number) => `${v} oportunidades`} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Lista de Oportunidades Abertas */}
            <Card>
                <CardHeader>
                    <CardTitle>Oportunidades em Aberto</CardTitle>
                </CardHeader>
                <CardContent>
                    {abertas.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                            Nenhuma oportunidade aberta no momento.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="text-left py-2 pr-4 font-medium">Oportunidade</th>
                                        <th className="text-right py-2 pr-4 font-medium">Valor</th>
                                        <th className="text-center py-2 pr-4 font-medium">Probabilidade</th>
                                        <th className="text-center py-2 pr-4 font-medium">Fechamento Previsto</th>
                                        <th className="text-center py-2 font-medium">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {abertas.map((opp) => (
                                        <tr key={opp.id} className="border-b hover:bg-muted/30 transition-colors">
                                            <td className="py-3 pr-4">
                                                <div className="font-medium">{opp.titulo}</div>
                                                {opp.cliente && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {opp.cliente.nome_fantasia ?? opp.cliente.razao_social}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 pr-4 text-right font-mono">
                                                {BRL(Number(opp.valor_total) || 0)}
                                            </td>
                                            <td className="py-3 pr-4 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        (opp.probabilidade_ganho ?? 50) >= 70
                                                            ? 'border-green-500 text-green-700 dark:text-green-400'
                                                            : (opp.probabilidade_ganho ?? 50) >= 40
                                                                ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                                                                : 'border-red-500 text-red-700 dark:text-red-400'
                                                    }
                                                >
                                                    {opp.probabilidade_ganho ?? 50}%
                                                </Badge>
                                            </td>
                                            <td className="py-3 pr-4 text-center text-muted-foreground">
                                                {opp.data_fechamento_prevista ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(opp.data_fechamento_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground/50">—</span>
                                                )}
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        title="Calibrar probabilidade e prazo"
                                                        onClick={() => setOppProb(opp)}
                                                    >
                                                        <Target className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        title="Fechar como Ganho"
                                                        onClick={async () => {
                                                            await fecharComoGanho({ id: opp.id });
                                                        }}
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        title="Registrar Perda"
                                                        onClick={() => setOppPerdida(opp)}
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            {oppPerdida && (
                <ModalPerdida
                    opp={oppPerdida}
                    motivosPerda={motivosPerda}
                    onClose={() => setOppPerdida(null)}
                    onConfirm={async (motivo_perda_id, motivo_perda) => {
                        await fecharComoPerdida({ id: oppPerdida.id, motivo_perda_id, motivo_perda });
                        setOppPerdida(null);
                    }}
                />
            )}
            {oppProb && (
                <ModalProbabilidade
                    opp={oppProb}
                    onClose={() => setOppProb(null)}
                    onSave={async (prob, dataFechamento) => {
                        await updateProbabilidade({ id: oppProb.id, probabilidade_ganho: prob });
                        if (dataFechamento) {
                            await setDataFechamento({ id: oppProb.id, data_fechamento_prevista: dataFechamento });
                        }
                        setOppProb(null);
                    }}
                />
            )}
        </div>
    );
}
