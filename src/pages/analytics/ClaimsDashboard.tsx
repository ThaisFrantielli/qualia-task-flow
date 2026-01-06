import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend, ComposedChart, Line } from 'recharts';
import { ShieldX, TrendingDown, TrendingUp, Car, DollarSign, Users, AlertTriangle, FileText } from 'lucide-react';
import { SinistrosFiltersProvider, useSinistrosFilters } from '@/contexts/SinistrosFiltersContext';
import { SinistrosFiltersBar } from '@/components/analytics/claims/SinistrosFiltersBar';
import SinistrosMapView from '@/components/analytics/claims/SinistrosMapView';
import SinistrosCulpaChart from '@/components/analytics/claims/SinistrosCulpaChart';
import { EmptyDataState } from '@/components/analytics/EmptyDataState';
import { Badge } from '@/components/ui/badge';
import { isWithinInterval, parseISO } from 'date-fns';

type AnyObject = { [k: string]: any };

// --- HELPERS ROBUSTOS ---
function parseCurrency(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  return parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
}

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtCompact(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmtBRL(v);
}

function getMonthKey(dateString?: string): string {
  if (!dateString) return '';
  return dateString.split('T')[0].substring(0, 7);
}

function monthLabel(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${months[Number(m) - 1]}/${String(y).slice(2)}`;
}

// Fallbacks robustos para campos
function getValorSinistro(r: AnyObject): number {
  return parseCurrency(r.ValorTotal) || parseCurrency(r.ValorSinistro) || parseCurrency(r.ValorOrcado) || 0;
}

function getValorRecuperado(r: AnyObject): number {
  return parseCurrency(r.ValorRecuperado) || parseCurrency(r.IndenizacaoSeguradora) || 0;
}

function getCulpabilidade(r: AnyObject): string {
  if (r.Culpabilidade && r.Culpabilidade.trim()) return r.Culpabilidade;
  if (r.MotoristaCulpado === 'Sim' || r.MotoristaCulpado === '1' || r.MotoristaCulpado === true) return 'Motorista';
  if (r.ResponsavelCulpado === 'Sim' || r.ResponsavelCulpado === '1' || r.ResponsavelCulpado === true) return 'Empresa';
  return 'Terceiros';
}

function getTipoDano(r: AnyObject): string {
  return r.TipoDano || r.TipoSinistro || r.Tipo || r.TipoOcorrencia || 'Outros';
}

function getStatus(r: AnyObject): string {
  return r.Status || r.Situacao || r.StatusSinistro || 'Em Análise';
}

function getCondutor(r: AnyObject): string {
  return r.Condutor || r.Motorista || r.NomeCondutor || 'Não identificado';
}

function ClaimsDashboardContent(): JSX.Element {
  const { data: sinistrosData } = useBIData<AnyObject[]>('fat_sinistros_*.json');
  const sinistros = useMemo(() => Array.isArray(sinistrosData) ? sinistrosData : [], [sinistrosData]);
  const { filters } = useSinistrosFilters();
  const [activeTab, setActiveTab] = useState('visao-geral');

  // Extrair listas únicas para filtros
  const filterLists = useMemo(() => {
    const culpabilidadeSet = new Set<string>();
    const tiposDanoSet = new Set<string>();
    const placasSet = new Set<string>();
    const statusSet = new Set<string>();

    sinistros.forEach((r: AnyObject) => {
      const culpa = getCulpabilidade(r);
      const tipo = getTipoDano(r);
      const status = getStatus(r);
      if (culpa) culpabilidadeSet.add(culpa);
      if (tipo) tiposDanoSet.add(tipo);
      if (r.Placa) placasSet.add(r.Placa);
      if (status) statusSet.add(status);
    });

    return {
      culpabilidade: Array.from(culpabilidadeSet).sort(),
      tiposDano: Array.from(tiposDanoSet).sort(),
      placas: Array.from(placasSet).sort(),
      status: Array.from(statusSet).sort(),
    };
  }, [sinistros]);

  // Aplicar filtros globais
  const filteredSinistros = useMemo(() => {
    return sinistros.filter((r: AnyObject) => {
      // Filtro de data
      if (filters.dateRange?.from) {
        const dataStr = r.DataSinistro || r.DataOcorrencia;
        if (dataStr) {
          try {
            const dataEvento = parseISO(dataStr.split('T')[0]);
            const from = filters.dateRange.from;
            const to = filters.dateRange.to || filters.dateRange.from;
            if (!isWithinInterval(dataEvento, { start: from, end: to })) return false;
          } catch { /* ignore */ }
        }
      }
      // Filtro de culpabilidade
      if (filters.culpabilidade.length > 0) {
        const culpa = getCulpabilidade(r);
        if (!filters.culpabilidade.includes(culpa)) return false;
      }
      // Filtro de tipo de dano
      if (filters.tiposDano.length > 0) {
        const tipo = getTipoDano(r);
        if (!filters.tiposDano.includes(tipo)) return false;
      }
      // Filtro de placas
      if (filters.placas.length > 0) {
        if (!r.Placa || !filters.placas.includes(r.Placa)) return false;
      }
      // Filtro de status
      if (filters.status.length > 0) {
        const status = getStatus(r);
        if (!filters.status.includes(status)) return false;
      }
      return true;
    });
  }, [sinistros, filters]);

  // KPIs com fallbacks robustos
  const kpis = useMemo(() => {
    const valorSinistros = filteredSinistros.reduce((s, r) => s + getValorSinistro(r), 0);
    const valorRecuperado = filteredSinistros.reduce((s, r) => s + getValorRecuperado(r), 0);
    const qtd = filteredSinistros.length;
    const uniqueVeiculos = new Set(filteredSinistros.map(r => r.Placa).filter(Boolean)).size;
    const ticketMedio = qtd > 0 ? valorSinistros / qtd : 0;
    const taxaRecuperacao = valorSinistros > 0 ? (valorRecuperado / valorSinistros) * 100 : 0;
    const custoLiquido = valorSinistros - valorRecuperado;
    
    // Contagem por culpabilidade
    const motoristaCulpado = filteredSinistros.filter(r => getCulpabilidade(r) === 'Motorista').length;
    const terceiros = filteredSinistros.filter(r => getCulpabilidade(r) === 'Terceiros').length;
    
    return { valorSinistros, valorRecuperado, qtd, uniqueVeiculos, ticketMedio, taxaRecuperacao, custoLiquido, motoristaCulpado, terceiros };
  }, [filteredSinistros]);

  // Evolução mensal
  const evolutionData = useMemo(() => {
    const map: Record<string, { Valor: number; Qtd: number; Recuperado: number }> = {};
    filteredSinistros.forEach(r => {
      const k = getMonthKey(r.DataSinistro || r.DataOcorrencia);
      if (!k) return;
      if (!map[k]) map[k] = { Valor: 0, Qtd: 0, Recuperado: 0 };
      map[k].Valor += getValorSinistro(r);
      map[k].Qtd += 1;
      map[k].Recuperado += getValorRecuperado(r);
    });
    return Object.keys(map).sort().slice(-24).map(k => ({
      date: k,
      label: monthLabel(k),
      ...map[k],
      Liquido: map[k].Valor - map[k].Recuperado,
    }));
  }, [filteredSinistros]);

  // Distribuição por culpabilidade
  const culpaData = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    filteredSinistros.forEach(r => {
      const c = getCulpabilidade(r);
      if (!map[c]) map[c] = { count: 0, value: 0 };
      map[c].count += 1;
      map[c].value += getValorSinistro(r);
    });
    const colors: Record<string, string> = { 'Motorista': '#ef4444', 'Empresa': '#f59e0b', 'Terceiros': '#10b981' };
    return Object.entries(map).map(([name, data]) => ({
      name,
      value: data.count,
      valorTotal: data.value,
      color: colors[name] || '#64748b',
    }));
  }, [filteredSinistros]);

  // Top tipos de dano
  const tipoDanoData = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    filteredSinistros.forEach(r => {
      const t = getTipoDano(r);
      if (!map[t]) map[t] = { count: 0, value: 0 };
      map[t].count += 1;
      map[t].value += getValorSinistro(r);
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, count: data.count, value: data.value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredSinistros]);

  // Top veículos sinistrados
  const topVeiculos = useMemo(() => {
    const map: Record<string, { count: number; value: number; modelo?: string }> = {};
    filteredSinistros.forEach(r => {
      if (!r.Placa) return;
      if (!map[r.Placa]) map[r.Placa] = { count: 0, value: 0, modelo: r.Modelo };
      map[r.Placa].count += 1;
      map[r.Placa].value += getValorSinistro(r);
    });
    return Object.entries(map)
      .map(([placa, data]) => ({ placa, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredSinistros]);

  // Top condutores
  const topCondutores = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    filteredSinistros.forEach(r => {
      const condutor = getCondutor(r);
      if (condutor === 'Não identificado') return;
      if (!map[condutor]) map[condutor] = { count: 0, value: 0 };
      map[condutor].count += 1;
      map[condutor].value += getValorSinistro(r);
    });
    return Object.entries(map)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredSinistros]);

  if (sinistros.length === 0) {
    return (
      <div className="bg-background min-h-screen p-6">
        <EmptyDataState
          title="Nenhum dado de sinistros"
          description="Não há dados de sinistros disponíveis para exibição."
        />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen p-6 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Sinistros</h1>
          <p className="text-muted-foreground text-sm">Controle de acidentes, custos e recuperação</p>
        </div>
        <Badge variant="destructive" className="flex gap-2">
          <ShieldX className="w-4 h-4" /> Hub Operacional
        </Badge>
      </div>

      {/* Filtros Globais */}
      <SinistrosFiltersBar
        culpabilidadeList={filterLists.culpabilidade}
        tiposDanoList={filterLists.tiposDano}
        placasList={filterLists.placas}
        statusList={filterLists.status}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <DollarSign className="h-4 w-4 text-destructive" />
              <TrendingDown className="h-3 w-3 text-destructive" />
            </div>
            <p className="text-2xl font-bold mt-2">{fmtCompact(kpis.valorSinistros)}</p>
            <p className="text-xs text-muted-foreground">Custo Total</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-emerald-600">{kpis.taxaRecuperacao.toFixed(0)}%</span>
            </div>
            <p className="text-2xl font-bold mt-2">{fmtCompact(kpis.valorRecuperado)}</p>
            <p className="text-xs text-muted-foreground">Recuperado</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <DollarSign className="h-4 w-4 text-amber-500" />
            <p className="text-2xl font-bold mt-2">{fmtCompact(kpis.custoLiquido)}</p>
            <p className="text-xs text-muted-foreground">Custo Líquido</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <FileText className="h-4 w-4 text-blue-500" />
            <p className="text-2xl font-bold mt-2">{kpis.qtd}</p>
            <p className="text-xs text-muted-foreground">Ocorrências</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <Car className="h-4 w-4 text-purple-500" />
            <p className="text-2xl font-bold mt-2">{kpis.uniqueVeiculos}</p>
            <p className="text-xs text-muted-foreground">Veículos</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-500">
          <CardContent className="p-4">
            <AlertTriangle className="h-4 w-4 text-slate-500" />
            <p className="text-2xl font-bold mt-2">{fmtBRL(kpis.ticketMedio)}</p>
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="analise">Análise</TabsTrigger>
          <TabsTrigger value="veiculos">Por Veículo</TabsTrigger>
          <TabsTrigger value="mapa">Mapa</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Evolução */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evolução de Sinistros</CardTitle>
                <CardDescription>Últimos 24 meses</CardDescription>
              </CardHeader>
              <CardContent>
                {evolutionData.length === 0 ? (
                  <EmptyDataState title="Sem dados" description="Nenhum sinistro no período" compact />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={evolutionData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" fontSize={10} />
                        <YAxis fontSize={10} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(v: number, name: string) => [
                            name === 'Qtd' ? v : fmtBRL(v),
                            name === 'Valor' ? 'Custo' : name === 'Recuperado' ? 'Recuperado' : name
                          ]}
                        />
                        <Bar dataKey="Valor" fill="#ef4444" radius={[4, 4, 0, 0]} name="Custo" />
                        <Bar dataKey="Recuperado" fill="#10b981" radius={[4, 4, 0, 0]} name="Recuperado" />
                        <Line type="monotone" dataKey="Qtd" stroke="#6366f1" strokeWidth={2} dot={false} yAxisId={0} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distribuição Culpabilidade */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Distribuição por Culpabilidade</CardTitle>
                <CardDescription>Quantidade de ocorrências</CardDescription>
              </CardHeader>
              <CardContent>
                {culpaData.length === 0 ? (
                  <EmptyDataState title="Sem dados" description="Nenhuma ocorrência" compact />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={culpaData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {culpaData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number, name: string, props: any) => [
                          `${v} ocorrências (${fmtBRL(props.payload.valorTotal)})`,
                          name
                        ]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Tipos e Resumo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top 10 Tipos de Dano</CardTitle>
              </CardHeader>
              <CardContent>
                {tipoDanoData.length === 0 ? (
                  <EmptyDataState title="Sem dados" description="Nenhum tipo de dano" compact />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tipoDanoData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" fontSize={10} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                        <YAxis dataKey="name" type="category" width={120} fontSize={9} />
                        <Tooltip formatter={(v: number) => [fmtBRL(v), 'Valor']} />
                        <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <SinistrosCulpaChart sinistros={filteredSinistros as any} />
          </div>
        </TabsContent>

        {/* Tab: Análise */}
        <TabsContent value="analise" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Por Tipo de Dano */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Análise por Tipo de Dano</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {tipoDanoData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="text-sm truncate max-w-40">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{fmtBRL(item.value)}</p>
                        <p className="text-xs text-muted-foreground">{item.count} ocorrências</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Por Condutor */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Top 10 Condutores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topCondutores.length === 0 ? (
                  <EmptyDataState title="Sem dados" description="Nenhum condutor identificado" compact />
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {topCondutores.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </span>
                          <span className="text-sm truncate max-w-40">{item.nome}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{fmtBRL(item.value)}</p>
                          <p className="text-xs text-muted-foreground">{item.count} sinistros</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Por Veículo */}
        <TabsContent value="veiculos" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4" />
                Ranking de Veículos Sinistrados
              </CardTitle>
              <CardDescription>Top 10 veículos com mais ocorrências</CardDescription>
            </CardHeader>
            <CardContent>
              {topVeiculos.length === 0 ? (
                <EmptyDataState title="Sem dados" description="Nenhum veículo com sinistro" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Placa</th>
                        <th className="p-2 text-left">Modelo</th>
                        <th className="p-2 text-center">Ocorrências</th>
                        <th className="p-2 text-right">Valor Total</th>
                        <th className="p-2 text-right">Ticket Médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topVeiculos.map((item, i) => (
                        <tr key={i} className="border-t hover:bg-muted/50">
                          <td className="p-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              i < 3 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="p-2 font-mono font-bold">{item.placa}</td>
                          <td className="p-2 text-muted-foreground">{item.modelo || '-'}</td>
                          <td className="p-2 text-center">
                            <Badge variant={item.count >= 3 ? 'destructive' : 'secondary'}>
                              {item.count}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-bold text-destructive">{fmtBRL(item.value)}</td>
                          <td className="p-2 text-right text-muted-foreground">
                            {fmtBRL(item.count > 0 ? item.value / item.count : 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabela de Detalhamento */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detalhamento de Sinistros</CardTitle>
              <CardDescription>{filteredSinistros.length} registros</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-left">Placa</th>
                      <th className="p-2 text-left">Condutor</th>
                      <th className="p-2 text-left">Tipo</th>
                      <th className="p-2 text-left">Culpa</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSinistros.slice(0, 50).map((r: AnyObject, i: number) => (
                      <tr key={i} className="border-t hover:bg-muted/50">
                        <td className="p-2 whitespace-nowrap">
                          {r.DataSinistro ? new Date(r.DataSinistro).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="p-2 font-mono">{r.Placa || '-'}</td>
                        <td className="p-2 truncate max-w-32">{getCondutor(r)}</td>
                        <td className="p-2 truncate max-w-32">{getTipoDano(r)}</td>
                        <td className="p-2">
                          <Badge variant={getCulpabilidade(r) === 'Motorista' ? 'destructive' : getCulpabilidade(r) === 'Terceiros' ? 'default' : 'secondary'}>
                            {getCulpabilidade(r)}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant="outline">{getStatus(r)}</Badge>
                        </td>
                        <td className="p-2 text-right font-bold text-destructive">{fmtBRL(getValorSinistro(r))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Mapa */}
        <TabsContent value="mapa" className="space-y-4">
          <SinistrosMapView sinistros={filteredSinistros as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ClaimsDashboard(): JSX.Element {
  return (
    <SinistrosFiltersProvider>
      <ClaimsDashboardContent />
    </SinistrosFiltersProvider>
  );
}
