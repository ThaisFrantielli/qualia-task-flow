// src/pages/CrmDashboardPage.tsx

import React, { useMemo } from 'react';
import { useAtendimentos } from '@/hooks/useAtendimentos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Headset, MessageCircleQuestion, AlertCircle, Clock, Filter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker'; // Para o seletor de data

const CrmDashboardPage = () => {
  const { atendimentos, loading, error } = useAtendimentos();
  const [date, setDate] = React.useState<DateRange | undefined>();

  // --- ANÁLISE DOS DADOS (similar ao que o Power BI faz) ---
  const stats = useMemo(() => {
    if (!atendimentos.length) return null;

    const total = atendimentos.length;
    const reclamacoes = atendimentos.filter(a => a.final_analysis !== 'Dúvida').length;
    const duvidas = total - reclamacoes;

    // Tempo médio de atendimento (exemplo)
    const resolved = atendimentos.filter(a => a.resolved_at);
    const avgTime = resolved.reduce((acc, curr) => {
        const start = new Date(curr.created_at).getTime();
        const end = new Date(curr.resolved_at!).getTime();
        return acc + (end - start);
    }, 0) / (resolved.length || 1);
    const avgDays = Math.floor(avgTime / (1000 * 60 * 60 * 24));
    const avgHours = Math.floor((avgTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    // Gráfico de Reclamações por Departamento
    const reclamacoesPorDepto = atendimentos.reduce((acc, curr) => {
      const depto = curr.department || 'Não Definido';
      acc[depto] = (acc[depto] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Gráfico de Análise Final
    const analiseFinal = atendimentos.reduce((acc, curr) => {
      const analise = curr.final_analysis || 'Em Branco';
      acc[analise] = (acc[analise] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      reclamacoes,
      duvidas,
      avgTime: `${avgDays}d ${avgHours}h`,
      reclamacoesPorDepto: Object.entries(reclamacoesPorDepto).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      analiseFinal: Object.entries(analiseFinal).map(([name, value]) => ({ name, value })),
    };
  }, [atendimentos]);

  if (loading) return <div className="p-6">Carregando dashboard...</div>;
  if (error || !stats) return <div className="p-6 text-red-500">Erro ao carregar dados.</div>;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-6 space-y-6">
      {/* Header com filtros */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard Pós-Vendas</h1>
        <div className="flex items-center gap-2">
            {/* Lógica para o Date Picker (futura) */}
            <Button variant="outline"><Calendar className="mr-2 h-4 w-4" /> Período</Button>
            <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filtros</Button>
        </div>
      </div>
      
      {/* Cards de KPIs Principais (recriando seu Power BI) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Atendimentos</CardTitle>
            <Headset className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reclamações</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.reclamacoes}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dúvidas</CardTitle>
            <MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.duvidas}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Atendimento</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.avgTime}</div></CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Gráfico de Reclamações por Departamento */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Reclamações por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.reclamacoesPorDepto} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" name="Atendimentos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Análise Final */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Análise Final</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={stats.analiseFinal} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {stats.analiseFinal.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Adicione outros gráficos aqui, como Atendimentos por Mês, Motivos de Reclamações, etc. */}
      </div>

    </div>
  );
};

export default CrmDashboardPage;