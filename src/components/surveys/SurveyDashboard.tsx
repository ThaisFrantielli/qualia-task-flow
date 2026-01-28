import { useSurveyMetrics } from '@/hooks/useSurveyMetrics';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Star, TrendingUp, Users, Clock, AlertTriangle } from 'lucide-react';
import { getCSATLevel, getCSATLevelColor, getCSATLevelBg, getNPSLevel, getNPSLevelColor, surveyTypeLabels } from '@/types/surveys';
import { subDays } from 'date-fns';
import { cn } from '@/lib/utils';



export const SurveyDashboard = () => {
  const [preset, setPreset] = useState<'7d'|'30d'|'90d'|'today'|'month'|'custom'>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const computeRange = () => {
    const today = new Date();
    switch (preset) {
      case 'today': return { start: today, end: today };
      case '7d': return { start: subDays(today, 6), end: today };
      case '30d': return { start: subDays(today, 29), end: today };
      case '90d': return { start: subDays(today, 89), end: today };
      case 'month': return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) };
      case 'custom':
        return {
          start: customStart ? new Date(customStart) : subDays(today, 29),
          end: customEnd ? new Date(customEnd) : today,
        };
      default: return { start: subDays(today, 29), end: today };
    }
  };

  const [range, setRange] = useState(() => computeRange());

  useEffect(() => {
    setRange(computeRange());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customStart, customEnd]);

  const { metrics, loading } = useSurveyMetrics(range);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const csatLevel = getCSATLevel(metrics.csat.percentage);
  const npsLevel = getNPSLevel(metrics.nps.score);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-end gap-3">
        <label className="text-sm text-muted-foreground">Período:</label>
        <select value={preset} onChange={(e) => setPreset(e.target.value as any)} className="input">
          <option value="today">Hoje</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
          <option value="month">Mês atual</option>
          <option value="custom">Personalizado</option>
        </select>
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input" />
            <span className="text-sm">—</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input" />
          </div>
        )}
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CSAT Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" />
              CSAT Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className={cn("text-3xl font-bold", getCSATLevelColor(csatLevel))}>
                {metrics.csat.percentage.toFixed(1)}%
              </span>
              <Badge variant="secondary" className={cn("mb-1", getCSATLevelBg(csatLevel))}>
                {csatLevel === 'excellent' ? 'Excelente' : 
                 csatLevel === 'good' ? 'Bom' : 
                 csatLevel === 'attention' ? 'Atenção' : 'Crítico'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.csat.satisfied} satisfeitos de {metrics.csat.total} respostas
            </p>
            <Progress 
              value={metrics.csat.percentage} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        {/* NPS Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              NPS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className={cn("text-3xl font-bold", getNPSLevelColor(npsLevel))}>
                {metrics.nps.score > 0 ? '+' : ''}{metrics.nps.score}
              </span>
              <Badge variant="secondary" className="mb-1">
                {npsLevel === 'excellent' ? 'Excelente' : 
                 npsLevel === 'good' ? 'Bom' : 
                 npsLevel === 'attention' ? 'Atenção' : 'Crítico'}
              </Badge>
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground mt-1">
              <span className="text-green-600">{metrics.nps.promoters} promotores</span>
              <span>•</span>
              <span className="text-red-600">{metrics.nps.detractors} detratores</span>
            </div>
          </CardContent>
        </Card>

        {/* Response Rate Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Taxa de Resposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-primary">
                {metrics.responseRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalResponded} de {metrics.totalSent} pesquisas
            </p>
            <Progress 
              value={metrics.responseRate} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        {/* Avg Response Time Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tempo Médio de Resposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-primary">
                {metrics.avgResponseTime.toFixed(1)}h
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalPending} pesquisas pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detractors Alert */}
      {metrics.detractorsPending > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">
                  {metrics.detractorsPending} cliente(s) detrator(es) aguardando follow-up
                </p>
                <p className="text-sm text-red-600">
                  Clientes com notas 1 ou 2 precisam de atenção imediata
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSAT by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CSAT por Processo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics.byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="type" 
                  tickFormatter={(value) => surveyTypeLabels[value as keyof typeof surveyTypeLabels] || value}
                  fontSize={12}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'CSAT']}
                  labelFormatter={(label) => surveyTypeLabels[label as keyof typeof surveyTypeLabels] || label}
                />
                <Bar dataKey="csat" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CSAT Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução CSAT (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metrics.byPeriod.filter(d => d.count > 0)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  fontSize={12}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'CSAT']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                />
                <Line 
                  type="monotone" 
                  dataKey="csat" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Factors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fatores Mais Citados</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.topFactors.length > 0 ? (
            <div className="space-y-3">
              {metrics.topFactors.slice(0, 5).map((factor, index) => (
                <div key={factor.factor} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-6">
                    {index + 1}.
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{factor.factor}</span>
                      <span className="text-sm text-muted-foreground">
                        {factor.count} ({factor.percentage}%)
                      </span>
                    </div>
                    <Progress value={factor.percentage} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum fator registrado ainda
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
