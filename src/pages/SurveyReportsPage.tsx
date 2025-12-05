import { useState } from 'react';
import { useSurveyMetrics } from '@/hooks/useSurveyMetrics';
import { useSurveys } from '@/hooks/useSurveys';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  Download, TrendingUp, TrendingDown, Minus, Users, 
  Clock, AlertTriangle
} from 'lucide-react';
import { surveyTypeLabels } from '@/types/surveys';
import { format, subDays } from 'date-fns';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

const SurveyReportsPage = () => {
  const [dateRange, setDateRange] = useState('30');
  
  const startDate = subDays(new Date(), parseInt(dateRange));
  const { metrics, loading } = useSurveyMetrics({ start: startDate, end: new Date() });
  const { surveys } = useSurveys({ status: 'responded' });

  const getCSATLevel = (score: number) => {
    if (score >= 85) return { label: 'Excelente', color: 'text-green-600', icon: TrendingUp };
    if (score >= 70) return { label: 'Bom', color: 'text-blue-600', icon: TrendingUp };
    if (score >= 50) return { label: 'Regular', color: 'text-yellow-600', icon: Minus };
    return { label: 'Crítico', color: 'text-red-600', icon: TrendingDown };
  };

  const getNPSLevel = (score: number) => {
    if (score >= 50) return { label: 'Excelente', color: 'text-green-600' };
    if (score >= 0) return { label: 'Bom', color: 'text-blue-600' };
    if (score >= -50) return { label: 'Regular', color: 'text-yellow-600' };
    return { label: 'Crítico', color: 'text-red-600' };
  };

  // NPS Distribution data
  const npsDistribution = metrics ? [
    { name: 'Promotores (9-10)', value: metrics.nps.promoters, color: '#10b981' },
    { name: 'Neutros (7-8)', value: metrics.nps.passives, color: '#f59e0b' },
    { name: 'Detratores (0-6)', value: metrics.nps.detractors, color: '#ef4444' },
  ] : [];

  // CSAT Distribution data
  const csatDistribution = metrics ? [
    { name: 'Satisfeitos (4-5)', value: metrics.csat.satisfied, color: '#10b981' },
    { name: 'Neutros (3)', value: metrics.csat.neutral, color: '#f59e0b' },
    { name: 'Insatisfeitos (1-2)', value: metrics.csat.dissatisfied, color: '#ef4444' },
  ] : [];

  // Goals comparison
  const goals = {
    csat: 85,
    nps: 50,
    responseRate: 70,
  };

  const handleExport = () => {
    const csvData = surveys.map(s => ({
      cliente: s.client_name,
      tipo: surveyTypeLabels[s.type],
      csat: s.response?.csat_score || '',
      nps: s.response?.nps_score || '',
      fatores: s.response?.influencing_factors?.join('; ') || '',
      comentario: s.response?.feedback_comment || '',
      data: s.responded_at ? format(new Date(s.responded_at), 'dd/MM/yyyy HH:mm') : '',
    }));

    const headers = ['Cliente', 'Tipo', 'CSAT', 'NPS', 'Fatores', 'Comentário', 'Data'];
    const csv = [
      headers.join(','),
      ...csvData.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-pesquisas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const csatLevel = metrics ? getCSATLevel(metrics.csat.percentage) : null;
  const npsLevel = metrics ? getNPSLevel(metrics.nps.score) : null;

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios de Satisfação</h1>
          <p className="text-muted-foreground">Análise detalhada das métricas CSAT e NPS</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CSAT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{metrics?.csat.percentage.toFixed(1)}%</div>
                <p className={`text-sm ${csatLevel?.color}`}>
                  {csatLevel?.label}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Meta: {goals.csat}%</div>
                {metrics && (
                  <Badge variant={metrics.csat.percentage >= goals.csat ? "default" : "destructive"}>
                    {metrics.csat.percentage >= goals.csat ? 'Atingida' : 'Abaixo'}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">NPS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{metrics?.nps.score}</div>
                <p className={`text-sm ${npsLevel?.color}`}>
                  {npsLevel?.label}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Meta: {goals.nps}</div>
                {metrics && (
                  <Badge variant={metrics.nps.score >= goals.nps ? "default" : "destructive"}>
                    {metrics.nps.score >= goals.nps ? 'Atingida' : 'Abaixo'}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Resposta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{metrics?.responseRate.toFixed(1)}%</div>
                <p className="text-sm text-muted-foreground">
                  {metrics?.totalResponded} de {metrics?.totalSent} pesquisas
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {Math.round((metrics?.avgResponseTime || 0) * 60)}min
                </div>
                <p className="text-sm text-muted-foreground">
                  para responder
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {metrics && metrics.detractorsPending > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">
                  {metrics.detractorsPending} detratores aguardando follow-up
                </p>
                <p className="text-sm text-red-600">
                  Clientes insatisfeitos precisam de atenção imediata
                </p>
              </div>
              <Button variant="destructive" size="sm" className="ml-auto" asChild>
                <a href="/pesquisas">Ver Alertas</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="distribution">Distribuição</TabsTrigger>
          <TabsTrigger value="factors">Fatores</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CSAT by Type */}
            <Card>
              <CardHeader>
                <CardTitle>CSAT por Tipo de Pesquisa</CardTitle>
                <CardDescription>Comparativo de satisfação por categoria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics?.byType || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="type" 
                        tickFormatter={(value) => surveyTypeLabels[value as keyof typeof surveyTypeLabels] || value}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'CSAT']}
                        labelFormatter={(label) => surveyTypeLabels[label as keyof typeof surveyTypeLabels] || label}
                      />
                      <Bar dataKey="csat" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* NPS Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição NPS</CardTitle>
                <CardDescription>Promotores, Neutros e Detratores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={npsDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {npsDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* CSAT Evolution */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução do CSAT</CardTitle>
              <CardDescription>Tendência nos últimos {dateRange} dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics?.byPeriod || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'CSAT']}
                      labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="csat" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.2)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Response Volume */}
          <Card>
            <CardHeader>
              <CardTitle>Volume de Respostas</CardTitle>
              <CardDescription>Quantidade diária de pesquisas respondidas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics?.byPeriod || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy')}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CSAT Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição CSAT</CardTitle>
                <CardDescription>Satisfeitos, Neutros e Insatisfeitos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={csatDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {csatDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Responses by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Respostas por Tipo</CardTitle>
                <CardDescription>Volume por categoria de pesquisa</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(metrics?.byType || []).map((item, index) => ({
                          name: surveyTypeLabels[item.type as keyof typeof surveyTypeLabels] || item.type,
                          value: item.count,
                          color: COLORS[index % COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {(metrics?.byType || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="factors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Principais Fatores de Influência</CardTitle>
              <CardDescription>O que mais impacta a satisfação dos clientes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.topFactors?.slice(0, 10).map((factor, index) => (
                  <div key={factor.factor} className="flex items-center gap-4">
                    <span className="w-6 text-center text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{factor.factor}</span>
                        <span className="text-sm text-muted-foreground">
                          {factor.count} menções
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ 
                            width: `${(factor.count / (metrics?.topFactors?.[0]?.count || 1)) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {(!metrics?.topFactors || metrics.topFactors.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum fator registrado no período
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SurveyReportsPage;
