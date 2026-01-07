import { useMemo, useState } from 'react';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import {
  Clock, AlertTriangle, Filter, Search
} from 'lucide-react';
import useBIData from '@/hooks/useBIData';
import useMaintenanceAlerts from '@/hooks/useMaintenanceAlerts';

type MovimentacaoOcorrencia = {
  Ocorrencia: number;
  Placa: string;
  ModeloVeiculo: string;
  Tipo: string;
  Etapa: string;
  DataEtapa: string;
  UsuarioEtapa: string;
  DiasAteConclusaoEtapa: number;
  IsAberta: boolean;
  IsConcluida: boolean;
  IsCancelada: boolean;
  Situacao: string;
};

// Ordem das etapas do workflow
const ORDEM_ETAPAS = [
  'Pré-Agendamento',
  'Confirmação de Agenda',
  'Aguardando Chegada',
  'Aguardando Orçamento',
  'Orçamento em Análise',
  'Aguardando Aprovação',
  'Serviço em Execução',
  'Aguardando Retirada do Veículo',
  'Aguardando Nota Fiscal',
  'Ocorrência Finalizada',
];

const COR_ETAPA: Record<string, string> = {
  'Pré-Agendamento': 'blue',
  'Confirmação de Agenda': 'violet',
  'Aguardando Chegada': 'cyan',
  'Aguardando Orçamento': 'amber',
  'Orçamento em Análise': 'orange',
  'Aguardando Aprovação': 'red',
  'Serviço em Execução': 'emerald',
  'Aguardando Retirada do Veículo': 'teal',
  'Aguardando Nota Fiscal': 'indigo',
  'Ocorrência Finalizada': 'green',
};

function fmtNum(v: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v);
}

function getBadgeSLA(dias: number): { cor: string; texto: string } {
  if (dias > 10) return { cor: 'red', texto: 'Crítico' };
  if (dias > 5) return { cor: 'yellow', texto: 'Atenção' };
  return { cor: 'green', texto: 'OK' };
}

export default function OperacionalTab() {
  const [busca, setBusca] = useState('');
  const [etapaFiltro, setEtapaFiltro] = useState<string>('Todas');

  // Carregar dados
  const { data: movimentacoes, loading } = useBIData<MovimentacaoOcorrencia[]>('fat_movimentacao_ocorrencias.json');
  const { alertas, resumo } = useMaintenanceAlerts();

  // Pegar última movimentação de cada ocorrência
  const ultimasMovimentacoes = useMemo(() => {
    if (!movimentacoes?.length) return [];

    const porOcorrencia = movimentacoes.reduce((acc, mov) => {
      const key = mov.Ocorrencia;
      if (!acc[key] || new Date(mov.DataEtapa) > new Date(acc[key].DataEtapa)) {
        acc[key] = mov;
      }
      return acc;
    }, {} as Record<number, MovimentacaoOcorrencia>);

    return Object.values(porOcorrencia);
  }, [movimentacoes]);

  // OS abertas apenas
  const osAbertas = useMemo(() => {
    return ultimasMovimentacoes.filter(m => m.IsAberta);
  }, [ultimasMovimentacoes]);

  // Calcular dias parada para cada OS
  const osComDias = useMemo(() => {
    if (!osAbertas.length) return [];

    const now = new Date();
    return osAbertas.map(os => {
      const dataEtapa = new Date(os.DataEtapa);
      const diasNaEtapa = Math.floor((now.getTime() - dataEtapa.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...os,
        DiasNaEtapa: diasNaEtapa,
        LeadTimeTotal: os.DiasAteConclusaoEtapa || diasNaEtapa,
      };
    });
  }, [osAbertas]);

  // Contador por etapa
  const contadorPorEtapa = useMemo(() => {
    const contador: Record<string, { total: number; mediaDias: number; criticos: number }> = {};

    ORDEM_ETAPAS.forEach(etapa => {
      const osEtapa = osComDias.filter(os => os.Etapa === etapa);
      const mediaDias = osEtapa.length > 0
        ? osEtapa.reduce((sum, os) => sum + os.DiasNaEtapa, 0) / osEtapa.length
        : 0;
      const criticos = osEtapa.filter(os => os.DiasNaEtapa > 5).length;

      contador[etapa] = {
        total: osEtapa.length,
        mediaDias,
        criticos,
      };
    });

    return contador;
  }, [osComDias]);

  // Filtrar OS abertas por busca e etapa
  const osFiltradas = useMemo(() => {
    let filtradas = osComDias;

    if (busca) {
      const buscaLower = busca.toLowerCase();
      filtradas = filtradas.filter(os => 
        os.Placa.toLowerCase().includes(buscaLower) ||
        os.Ocorrencia.toString().includes(busca) ||
        os.ModeloVeiculo?.toLowerCase().includes(buscaLower)
      );
    }

    if (etapaFiltro !== 'Todas') {
      filtradas = filtradas.filter(os => os.Etapa === etapaFiltro);
    }

    // Ordenar por dias na etapa (maior primeiro)
    return filtradas.sort((a, b) => b.DiasNaEtapa - a.DiasNaEtapa);
  }, [osComDias, busca, etapaFiltro]);

  // Alertas críticos (top 5)
  const alertasCriticosTop = useMemo(() => {
    return alertas.filter(a => a.severidade === 'critico').slice(0, 5);
  }, [alertas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <Text>Carregando dados operacionais...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Contador de Alertas */}
      <div className="flex items-center justify-between">
        <div>
          <Title>Monitoramento Operacional - Tempo Real</Title>
          <Text>Acompanhamento de OS abertas e alertas críticos</Text>
        </div>
        <div className="flex gap-3">
          <Card decoration="left" decorationColor="red" className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <Text className="text-xs">Alertas Críticos</Text>
                <Metric className="text-lg">{resumo.criticos}</Metric>
              </div>
            </div>
          </Card>
          <Card decoration="left" decorationColor="yellow" className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <Text className="text-xs">Atenção</Text>
                <Metric className="text-lg">{resumo.atencao}</Metric>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Seção 1: OS Ativas por Etapa */}
      <div>
        <Title className="mb-4">OS Abertas por Etapa do Workflow</Title>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {ORDEM_ETAPAS.map(etapa => {
            const dados = contadorPorEtapa[etapa];
            const cor = COR_ETAPA[etapa] || 'gray';
            const temCritico = dados.criticos > 0;

            return (
              <Card
                key={etapa}
                decoration="top"
                decorationColor={(temCritico ? 'red' : cor) as any}
                className="cursor-pointer hover:ring-2 hover:ring-blue-200 transition-all"
                onClick={() => setEtapaFiltro(etapa)}
              >
                <Text className="text-xs truncate" title={etapa}>{etapa}</Text>
                <Metric className="text-2xl mt-1">{dados.total}</Metric>
                <div className="flex items-center justify-between mt-2">
                  <Text className="text-xs text-gray-500">
                    Média: {fmtNum(dados.mediaDias)}d
                  </Text>
                  {temCritico && (
                    <Badge color="red" size="xs">
                      {dados.criticos} críticas
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Seção 2: Alertas Críticos */}
      {alertasCriticosTop.length > 0 && (
        <Card decoration="left" decorationColor="red">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <Title>Alertas Críticos - Ação Imediata</Title>
          </div>
          <div className="space-y-3">
            {alertasCriticosTop.map(alerta => (
              <div
                key={alerta.id}
                className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color="red" size="sm">CRÍTICO</Badge>
                      <Text className="font-bold text-red-700">
                        OS {alerta.ocorrencia} - {alerta.placa}
                      </Text>
                    </div>
                    <Text className="text-sm text-gray-700">{alerta.titulo}</Text>
                    <Text className="text-xs text-gray-500 mt-1">{alerta.mensagem}</Text>
                  </div>
                  <div className="text-right ml-4">
                    <Metric className="text-red-600">{alerta.valorAtual}</Metric>
                    <Text className="text-xs text-gray-500">{alerta.unidade}</Text>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-red-200">
                  <Text className="text-xs font-medium text-red-700">
                    💡 Ação: {alerta.acaoSugerida}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Seção 3: Tabela Interativa de OS Abertas */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <Title>OS Abertas - Detalhamento ({osFiltradas.length})</Title>
          <div className="flex gap-3">
            {/* Filtro por Etapa */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={etapaFiltro}
                onChange={(e) => setEtapaFiltro(e.target.value)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="Todas">Todas as Etapas</option>
                {ORDEM_ETAPAS.map(etapa => (
                  <option key={etapa} value={etapa}>{etapa}</option>
                ))}
              </select>
            </div>

            {/* Busca */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="Buscar placa, OS, modelo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="border rounded pl-8 pr-3 py-1 text-sm w-64"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2 text-left">OS</th>
                <th className="p-2 text-left">Placa</th>
                <th className="p-2 text-left">Modelo</th>
                <th className="p-2 text-left">Etapa Atual</th>
                <th className="p-2 text-right">Dias na Etapa</th>
                <th className="p-2 text-right">Lead Time Total</th>
                <th className="p-2 text-left">Responsável</th>
                <th className="p-2 text-center">SLA</th>
              </tr>
            </thead>
            <tbody>
              {osFiltradas.map(os => {
                const sla = getBadgeSLA(os.LeadTimeTotal);
                
                return (
                  <tr key={os.Ocorrencia} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-mono text-blue-600">{os.Ocorrencia}</td>
                    <td className="p-2 font-medium">{os.Placa}</td>
                    <td className="p-2 text-gray-600">{os.ModeloVeiculo || 'N/D'}</td>
                    <td className="p-2">
                      <Badge color={COR_ETAPA[os.Etapa] as any || 'gray'} size="sm">
                        {os.Etapa}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">
                      <span className={os.DiasNaEtapa > 5 ? 'text-red-600 font-bold' : ''}>
                        {os.DiasNaEtapa}d
                      </span>
                    </td>
                    <td className="p-2 text-right font-medium">
                      {os.LeadTimeTotal}d
                    </td>
                    <td className="p-2 text-gray-600 text-xs">{os.UsuarioEtapa || 'N/D'}</td>
                    <td className="p-2 text-center">
                      <Badge color={sla.cor as any} size="xs">
                        {sla.texto}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
