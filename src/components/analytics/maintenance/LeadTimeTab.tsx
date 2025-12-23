import { useMemo } from 'react';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, FunnelChart, Funnel, LabelList, Cell } from 'recharts';
import { Clock } from 'lucide-react';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';

type AnyObject = { [k: string]: any };

function parseNum(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v)) || 0; }

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
    const validData = filteredData.filter(r => r.LeadTimeTotal > 0);
    const count = validData.length;
    if (count === 0) return { avgAgendamento: 0, avgOficina: 0, avgTotal: 0, count: 0 };

    const totalAgendamento = validData.reduce((s, r) => s + parseNum(r.LeadTimeAgendamento), 0);
    const totalOficina = validData.reduce((s, r) => s + parseNum(r.LeadTimeOficina), 0);
    const totalTotal = validData.reduce((s, r) => s + parseNum(r.LeadTimeTotal), 0);

    return {
      avgAgendamento: totalAgendamento / count,
      avgOficina: totalOficina / count,
      avgTotal: totalTotal / count,
      count,
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
      { label: '0-2 dias', min: 0, max: 2, count: 0 },
      { label: '3-5 dias', min: 3, max: 5, count: 0 },
      { label: '6-10 dias', min: 6, max: 10, count: 0 },
      { label: '11-15 dias', min: 11, max: 15, count: 0 },
      { label: '+15 dias', min: 16, max: Infinity, count: 0 },
    ];

    filteredData.forEach(r => {
      const leadTime = parseNum(r.LeadTimeTotal);
      const faixa = faixas.find(f => leadTime >= f.min && leadTime <= f.max);
      if (faixa) faixa.count++;
    });

    return faixas;
  }, [filteredData]);

  const topVeiculos = useMemo(() => {
    const map: Record<string, { leadTime: number; count: number }> = {};
    filteredData.forEach(r => {
      const placa = r.Placa || 'N/D';
      if (!map[placa]) map[placa] = { leadTime: 0, count: 0 };
      map[placa].leadTime += parseNum(r.LeadTimeTotal);
      map[placa].count += 1;
    });

    return Object.entries(map)
      .map(([placa, data]) => ({ placa, avgLeadTime: data.leadTime / data.count, count: data.count }))
      .sort((a, b) => b.avgLeadTime - a.avgLeadTime)
      .slice(0, 10);
  }, [filteredData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <Card decoration="top" decorationColor="slate">
          <Text>Total de OS</Text>
          <Metric>{kpis.count}</Metric>
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
        <div className="space-y-2">
          {topVeiculos.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-slate-50 rounded hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 text-sm flex items-center justify-center font-bold">
                  {idx + 1}
                </span>
                <div>
                  <div className="font-mono font-medium">{item.placa}</div>
                  <div className="text-xs text-slate-500">{item.count} OS</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-amber-600">{item.avgLeadTime.toFixed(1)} dias</div>
                <div className="text-xs text-slate-500">média</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
