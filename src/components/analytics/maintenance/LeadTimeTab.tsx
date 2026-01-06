import { useMemo } from 'react';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, FunnelChart, Funnel, LabelList, Cell } from 'recharts';
import { Clock, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';
import { EmptyDataState } from '@/components/analytics/EmptyDataState';

type AnyObject = { [k: string]: any };

function parseNum(v: any): number { 
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v.replace(/[^0-9.-]/g, '')) || 0;
  return 0;
}

// Calcula dias entre duas datas
function calcDias(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const d1 = new Date(start);
  const d2 = new Date(end);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return Math.max(0, (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

// Extrai lead time com fallbacks robustos
function getLeadTimeTotal(r: AnyObject): number {
  return parseNum(r.LeadTimeTotaldias) || 
         parseNum(r.LeadTimeTotal) || 
         parseNum(r.TempoTotal) ||
         calcDias(r.DataSolicitacao || r.DataAbertura, r.DataConclusao || r.DataSaida);
}

function getLeadTimeOficina(r: AnyObject): number {
  return parseNum(r.LeadTimeOficina) || 
         parseNum(r.TempoOficina) ||
         parseNum(r.DiasOficina) ||
         calcDias(r.DataEntradaOficina || r.DataEntrada, r.DataConclusao || r.DataSaida);
}

function getLeadTimeAgendamento(r: AnyObject): number {
  return parseNum(r.LeadTimeAgendamento) || 
         parseNum(r.TempoAgendamento) ||
         calcDias(r.DataSolicitacao || r.DataAbertura, r.DataEntradaOficina || r.DataEntrada);
}

interface LeadTimeTabProps {
  manutencaoData: AnyObject[];
}

export default function LeadTimeTab({ manutencaoData }: LeadTimeTabProps) {
  const { filters } = useMaintenanceFilters();

  const filteredData = useMemo(() => {
    return manutencaoData.filter((r: AnyObject) => {
      if (filters.dateRange?.from && r.DataEntradaOficina) {
        const data = new Date(r.DataEntradaOficina);
        if (data < filters.dateRange.from) return false;
        if (filters.dateRange.to && data > filters.dateRange.to) return false;
      }
      if (filters.fornecedores.length > 0 && !filters.fornecedores.includes(r.Fornecedor)) return false;
      if (filters.tiposOcorrencia.length > 0 && !filters.tiposOcorrencia.includes(r.TipoOcorrencia)) return false;
      if (filters.clientes.length > 0 && !filters.clientes.includes(r.Cliente)) return false;
      if (filters.modelos.length > 0 && !filters.modelos.includes(r.Modelo)) return false;
      return true;
    });
  }, [manutencaoData, filters]);

  const kpis = useMemo(() => {
    // Considera registros com qualquer lead time > 0 (usando fallbacks)
    const validData = filteredData.filter(r => getLeadTimeTotal(r) > 0);
    const count = validData.length;
    if (count === 0) return { avgAgendamento: 0, avgOficina: 0, avgTotal: 0, count: 0, slaAtingido: 0 };

    const totalAgendamento = validData.reduce((s, r) => s + getLeadTimeAgendamento(r), 0);
    const totalOficina = validData.reduce((s, r) => s + getLeadTimeOficina(r), 0);
    const totalTotal = validData.reduce((s, r) => s + getLeadTimeTotal(r), 0);
    
    // SLA: % de OS concluídas em até 5 dias
    const dentroDeSLA = validData.filter(r => getLeadTimeTotal(r) <= 5).length;

    return {
      avgAgendamento: totalAgendamento / count,
      avgOficina: totalOficina / count,
      avgTotal: totalTotal / count,
      count,
      slaAtingido: (dentroDeSLA / count) * 100,
    };
  }, [filteredData]);

  const funnelData = useMemo(() => {
    return [
      { name: 'Solicitação → Entrada', value: kpis.avgAgendamento, fill: '#3b82f6' },
      { name: 'Entrada → Conclusão', value: kpis.avgOficina, fill: '#f59e0b' },
      { name: 'Tempo Total', value: kpis.avgTotal, fill: '#10b981' },
    ];
  }, [kpis]);

  const distribuicao = useMemo(() => {
    const faixas = [
      { label: '0-2 dias', min: 0, max: 2, count: 0, color: '#10b981' },
      { label: '3-5 dias', min: 3, max: 5, count: 0, color: '#22c55e' },
      { label: '6-10 dias', min: 6, max: 10, count: 0, color: '#f59e0b' },
      { label: '11-15 dias', min: 11, max: 15, count: 0, color: '#f97316' },
      { label: '+15 dias', min: 16, max: Infinity, count: 0, color: '#ef4444' },
    ];

    filteredData.forEach(r => {
      const leadTime = getLeadTimeTotal(r);
      const faixa = faixas.find(f => leadTime >= f.min && leadTime <= f.max);
      if (faixa) faixa.count++;
    });

    return faixas;
  }, [filteredData]);

  const topVeiculos = useMemo(() => {
    const map: Record<string, { leadTime: number; count: number }> = {};
    filteredData.forEach(r => {
      const placa = r.Placa || 'N/D';
      const lt = getLeadTimeTotal(r);
      if (lt <= 0) return;
      if (!map[placa]) map[placa] = { leadTime: 0, count: 0 };
      map[placa].leadTime += lt;
      map[placa].count += 1;
    });

    return Object.entries(map)
      .map(([placa, data]) => ({ placa, avgLeadTime: data.leadTime / data.count, count: data.count }))
      .filter(v => v.avgLeadTime > 0)
      .sort((a, b) => b.avgLeadTime - a.avgLeadTime)
      .slice(0, 10);
  }, [filteredData]);

  // Se não há dados
  if (filteredData.length === 0) {
    return (
      <EmptyDataState 
        variant="filter-empty"
        title="Sem dados de manutenção"
        description="Não há ordens de serviço para o período e filtros selecionados."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs com semáforo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card decoration="top" decorationColor="blue">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <Text>Lead Time Agendamento</Text>
          </div>
          <Metric>{kpis.avgAgendamento.toFixed(1)} dias</Metric>
          <Text className="text-xs text-slate-500">Solicitação → Entrada</Text>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <Text>Lead Time Oficina</Text>
          </div>
          <Metric>{kpis.avgOficina.toFixed(1)} dias</Metric>
          <Text className="text-xs text-slate-500">Entrada → Conclusão</Text>
        </Card>
        <Card decoration="top" decorationColor="emerald">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <Text>Lead Time Total</Text>
          </div>
          <Metric>{kpis.avgTotal.toFixed(1)} dias</Metric>
          <Text className="text-xs text-slate-500">Ciclo completo</Text>
        </Card>
        <Card decoration="top" decorationColor={kpis.slaAtingido >= 80 ? 'emerald' : kpis.slaAtingido >= 60 ? 'amber' : 'rose'}>
          <div className="flex items-center gap-2">
            {kpis.slaAtingido >= 70 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-rose-600" />}
            <Text>SLA Atingido</Text>
          </div>
          <Metric className={kpis.slaAtingido >= 80 ? 'text-emerald-600' : kpis.slaAtingido >= 60 ? 'text-amber-600' : 'text-rose-600'}>
            {kpis.slaAtingido.toFixed(0)}%
          </Metric>
          <Text className="text-xs text-slate-500">Meta: ≤5 dias</Text>
        </Card>
        <Card decoration="top" decorationColor="slate">
          <Text>Total de OS</Text>
          <Metric>{kpis.count.toLocaleString('pt-BR')}</Metric>
          <Text className="text-xs text-slate-500">Ordens analisadas</Text>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Title>Funil de Lead Times</Title>
          <Text className="text-xs text-slate-500 mb-4">Tempo médio em cada etapa do processo</Text>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip formatter={(v: any) => `${parseFloat(v).toFixed(1)} dias`} />
                <Funnel dataKey="value" data={funnelData}>
                  <LabelList position="center" fill="#fff" stroke="none" dataKey="name" />
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <Title>Distribuição por Faixa de Tempo</Title>
          <Text className="text-xs text-slate-500 mb-4">Quantidade de OS por prazo de conclusão</Text>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribuicao}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <Title>Top 10 Veículos com Maior Lead Time</Title>
        <Text className="text-xs text-slate-500 mb-4">Placas que demoram mais para concluir manutenção</Text>
        {topVeiculos.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sem dados de lead time para exibir ranking</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topVeiculos.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-slate-50 rounded hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full text-sm flex items-center justify-center font-bold ${
                    item.avgLeadTime > 15 ? 'bg-rose-100 text-rose-600' : 
                    item.avgLeadTime > 10 ? 'bg-amber-100 text-amber-600' : 
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-mono font-medium">{item.placa}</div>
                    <div className="text-xs text-slate-500">{item.count} OS</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${
                    item.avgLeadTime > 15 ? 'text-rose-600' : 
                    item.avgLeadTime > 10 ? 'text-amber-600' : 
                    'text-emerald-600'
                  }`}>{item.avgLeadTime.toFixed(1)} dias</div>
                  <div className="text-xs text-slate-500">média</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
