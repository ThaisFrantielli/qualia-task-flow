import { useMemo, useState } from 'react';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import {
  AlertTriangle, Search, CheckCircle2, XCircle, Clock, TrendingUp
} from 'lucide-react';
import useBIData from '@/hooks/useBIData';


type MovimentacaoOcorrencia = {
  Ocorrencia: number;
  Placa: string;
  Tipo: string;
  Etapa: string;
  DataEtapa: string;
  UsuarioEtapa: string;
  DiasAteConclusaoEtapa: number;
  IsAberta: boolean;
  IsConcluida: boolean;
  IsCancelada: boolean;
  MotivoCancelamento: string;
};

type ManutencaoUnificado = {
  Ocorrencia: number;
  Placa: string;
  Modelo: string;
  Fornecedor: string;
  CustoTotalOS: number;
  KmEntrada: number;
  KmSaida: number;
  LeadTimeTotalDias: number;
  DataEntrada: string;
};

type LeadTimeEtapa = {
  Ocorrencia: number;
  Placa: string;
  EtapaAtual: string;
  IsRetrabalho: boolean;
};

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtNum(v: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v);
}

export default function AuditoriaTab() {
  const [buscaOS, setBuscaOS] = useState('');
  const [timelineOS, setTimelineOS] = useState<number | null>(null);

  // Carregar dados
  const { data: movimentacoesRaw, loading } = useBIData<MovimentacaoOcorrencia[]>('fat_movimentacao_ocorrencias.json');
  const { data: manutencoes } = useBIData<ManutencaoUnificado[]>('fat_manutencao_unificado.json');
  const { data: leadTimes } = useBIData<LeadTimeEtapa[]>('agg_lead_time_etapas.json');

  // Filtrar apenas ocorrências de manutenção
  const movimentacoes = useMemo(() => {
    if (!movimentacoesRaw?.length) return [];
    return movimentacoesRaw.filter(m =>
      m.Tipo === 'Manutenção Preventiva' || m.Tipo === 'Manutenção Corretiva'
    );
  }, [movimentacoesRaw]);

  // ========================================================================
  // SEÇÃO 1: ANOMALIAS
  // ========================================================================

  const anomalias = useMemo(() => {
    if (!manutencoes?.length) return {
      semMovimentacao: [],
      custoAnomalo: [],
      kmInvalido: [],
      retrabalhoExcessivo: [],
    };

    const now = new Date();

    // 1. OS sem movimentação >7 dias
    const ultimasMovPorOS = movimentacoes?.reduce((acc, mov) => {
      const key = mov.Ocorrencia;
      if (!acc[key] || new Date(mov.DataEtapa) > new Date(acc[key].DataEtapa)) {
        acc[key] = mov;
      }
      return acc;
    }, {} as Record<number, MovimentacaoOcorrencia>);

    const semMovimentacao = Object.values(ultimasMovPorOS || {}).filter(mov => {
      if (!mov.IsAberta) return false;
      const dataEtapa = new Date(mov.DataEtapa);
      const diasSemMov = Math.floor((now.getTime() - dataEtapa.getTime()) / (1000 * 60 * 60 * 24));
      return diasSemMov > 7;
    }).map(mov => ({
      ...mov,
      diasSemMovimentacao: Math.floor((now.getTime() - new Date(mov.DataEtapa).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // 2. Custo anômalo (>3× ticket médio)
    const custosValidos = manutencoes.filter(m => m.CustoTotalOS > 0);
    const ticketMedio = custosValidos.reduce((sum, m) => sum + m.CustoTotalOS, 0) / (custosValidos.length || 1);
    const custoAnomalo = manutencoes.filter(m => m.CustoTotalOS > ticketMedio * 3);

    // 3. KM inválido (entrada > saída)
    const kmInvalido = manutencoes.filter(m =>
      m.KmEntrada > 0 && m.KmSaida > 0 && m.KmEntrada > m.KmSaida
    );

    // 4. Retrabalho excessivo (>2 retrabalhos)
    const retrabalhosPorOS = leadTimes?.reduce((acc, lt) => {
      if (lt.IsRetrabalho) {
        if (!acc[lt.Ocorrencia]) {
          acc[lt.Ocorrencia] = { ocorrencia: lt.Ocorrencia, placa: lt.Placa, count: 0 };
        }
        acc[lt.Ocorrencia].count++;
      }
      return acc;
    }, {} as Record<number, { ocorrencia: number; placa: string; count: number }>);

    const retrabalhoExcessivo = Object.values(retrabalhosPorOS || {}).filter(r => r.count > 2);

    return {
      semMovimentacao,
      custoAnomalo,
      kmInvalido,
      retrabalhoExcessivo,
    };
  }, [manutencoes, movimentacoes, leadTimes]);

  // ========================================================================
  // SEÇÃO 2: CONFORMIDADE
  // ========================================================================

  const conformidade = useMemo(() => {
    if (!movimentacoes?.length || !manutencoes?.length) {
      return {
        osSemMotivoCancelamento: [],
        fornecedoresComRetrabalho: [],
        percentualConformidade: 0,
      };
    }

    // OS canceladas sem motivo
    const osSemMotivoCancelamento = movimentacoes.filter(mov =>
      mov.IsCancelada && (!mov.MotivoCancelamento || mov.MotivoCancelamento.trim() === '')
    );

    // Fornecedores com >20% retrabalho
    const osPorFornecedor = manutencoes.reduce((acc, m) => {
      if (!acc[m.Fornecedor]) {
        acc[m.Fornecedor] = new Set<number>();
      }
      acc[m.Fornecedor].add(m.Ocorrencia);
      return acc;
    }, {} as Record<string, Set<number>>);

    const retrabalhosPorOS = leadTimes?.reduce((acc, lt) => {
      if (lt.IsRetrabalho) {
        acc[lt.Ocorrencia] = true;
      }
      return acc;
    }, {} as Record<number, boolean>);

    const fornecedoresComRetrabalho = Object.entries(osPorFornecedor)
      .map(([fornecedor, ocorrencias]) => {
        const totalOS = ocorrencias.size;
        const comRetrabalho = Array.from(ocorrencias).filter(oc => retrabalhosPorOS?.[oc]).length;
        const taxaRetrabalho = (comRetrabalho / totalOS) * 100;

        return { fornecedor, totalOS, comRetrabalho, taxaRetrabalho };
      })
      .filter(f => f.taxaRetrabalho > 20)
      .sort((a, b) => b.taxaRetrabalho - a.taxaRetrabalho);

    // Percentual de conformidade geral
    const totalProblemas =
      anomalias.semMovimentacao.length +
      anomalias.custoAnomalo.length +
      anomalias.kmInvalido.length +
      osSemMotivoCancelamento.length;

    const totalOS = manutencoes.length;
    const percentualConformidade = ((totalOS - totalProblemas) / totalOS) * 100;

    return {
      osSemMotivoCancelamento,
      fornecedoresComRetrabalho,
      percentualConformidade,
    };
  }, [movimentacoes, manutencoes, leadTimes, anomalias]);

  // ========================================================================
  // SEÇÃO 3: RASTREABILIDADE
  // ========================================================================

  const timelineData = useMemo(() => {
    if (!timelineOS || !movimentacoes?.length) return [];

    const movimentacoesOS = movimentacoes
      .filter(m => m.Ocorrencia === timelineOS)
      .sort((a, b) => new Date(a.DataEtapa).getTime() - new Date(b.DataEtapa).getTime());

    return movimentacoesOS;
  }, [timelineOS, movimentacoes]);

  const osInfo = useMemo(() => {
    if (!timelineOS || !manutencoes?.length) return null;
    return manutencoes.find(m => m.Ocorrencia === timelineOS);
  }, [timelineOS, manutencoes]);

  const buscarOS = () => {
    const osNum = parseInt(buscaOS);
    if (!isNaN(osNum)) {
      setTimelineOS(osNum);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <Text>Carregando auditoria...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Title>Auditoria & Compliance</Title>
        <Text>Análise de anomalias, conformidade e rastreabilidade de OS</Text>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card decoration="top" decorationColor="red">
          <Text>Sem Movimentação</Text>
          <Metric className="text-red-600">{anomalias.semMovimentacao.length}</Metric>
          <Text className="text-xs text-gray-500 mt-1">&gt;7 dias paradas</Text>
        </Card>

        <Card decoration="top" decorationColor="orange">
          <Text>Custo Anômalo</Text>
          <Metric className="text-orange-600">{anomalias.custoAnomalo.length}</Metric>
          <Text className="text-xs text-gray-500 mt-1">&gt;3× ticket médio</Text>
        </Card>

        <Card decoration="top" decorationColor="yellow">
          <Text>KM Inválido</Text>
          <Metric className="text-yellow-600">{anomalias.kmInvalido.length}</Metric>
          <Text className="text-xs text-gray-500 mt-1">Entrada &gt; Saída</Text>
        </Card>

        <Card decoration="top" decorationColor="purple">
          <Text>Retrabalho Excessivo</Text>
          <Metric className="text-purple-600">{anomalias.retrabalhoExcessivo.length}</Metric>
          <Text className="text-xs text-gray-500 mt-1">&gt;2 retrabalhos</Text>
        </Card>

        <Card decoration="top" decorationColor="green">
          <Text>Conformidade Geral</Text>
          <Metric className="text-green-600">{fmtNum(conformidade.percentualConformidade)}%</Metric>
          <Text className="text-xs text-gray-500 mt-1">OS sem problemas</Text>
        </Card>
      </div>

      {/* Seção 1: Anomalias Detalhadas */}
      <Card>
        <Title className="mb-4">Anomalias Detectadas - Ação Necessária</Title>

        {/* OS Sem Movimentação */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-red-500" />
            <Text className="font-bold">OS sem movimentação há mais de 7 dias ({anomalias.semMovimentacao.length})</Text>
          </div>
          {anomalias.semMovimentacao.length > 0 ? (
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">OS</th>
                    <th className="p-2 text-left">Placa</th>
                    <th className="p-2 text-left">Etapa Atual</th>
                    <th className="p-2 text-left">Responsável</th>
                    <th className="p-2 text-right">Dias Parada</th>
                    <th className="p-2 text-left">Última Atualização</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalias.semMovimentacao.map(os => (
                    <tr key={os.Ocorrencia} className="border-t hover:bg-gray-50">
                      <td className="p-2 font-mono text-blue-600">{os.Ocorrencia}</td>
                      <td className="p-2 font-medium">{os.Placa}</td>
                      <td className="p-2"><Badge color="red" size="xs">{os.Etapa}</Badge></td>
                      <td className="p-2 text-xs">{os.UsuarioEtapa}</td>
                      <td className="p-2 text-right font-bold text-red-600">{os.diasSemMovimentacao}d</td>
                      <td className="p-2 text-xs text-gray-500">
                        {new Date(os.DataEtapa).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Text className="text-gray-500 italic">Nenhuma anomalia detectada</Text>
          )}
        </div>

        {/* Custo Anômalo */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <Text className="font-bold">OS com custo anômalo - &gt;3× ticket médio ({anomalias.custoAnomalo.length})</Text>
          </div>
          {anomalias.custoAnomalo.length > 0 ? (
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">OS</th>
                    <th className="p-2 text-left">Placa</th>
                    <th className="p-2 text-left">Modelo</th>
                    <th className="p-2 text-left">Fornecedor</th>
                    <th className="p-2 text-right">Custo Total</th>
                    <th className="p-2 text-right">Lead Time</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalias.custoAnomalo.map(os => (
                    <tr key={os.Ocorrencia} className="border-t hover:bg-gray-50">
                      <td className="p-2 font-mono text-blue-600">{os.Ocorrencia}</td>
                      <td className="p-2 font-medium">{os.Placa}</td>
                      <td className="p-2 text-gray-600">{os.Modelo}</td>
                      <td className="p-2 text-xs">{os.Fornecedor}</td>
                      <td className="p-2 text-right font-bold text-red-600">
                        {fmtBRL(os.CustoTotalOS)}
                      </td>
                      <td className="p-2 text-right">{os.LeadTimeTotalDias}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Text className="text-gray-500 italic">Nenhuma anomalia detectada</Text>
          )}
        </div>
      </Card>

      {/* Seção 2: Conformidade */}
      <Card>
        <Title className="mb-4">Análise de Conformidade</Title>

        {/* Fornecedores com Alto Retrabalho */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <Text className="font-bold">Fornecedores com taxa de retrabalho &gt;20% ({conformidade.fornecedoresComRetrabalho.length})</Text>
          </div>
          {conformidade.fornecedoresComRetrabalho.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Fornecedor</th>
                    <th className="p-2 text-center">Total OS</th>
                    <th className="p-2 text-center">Com Retrabalho</th>
                    <th className="p-2 text-right">Taxa de Retrabalho</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {conformidade.fornecedoresComRetrabalho.map(f => (
                    <tr key={f.fornecedor} className="border-t hover:bg-gray-50">
                      <td className="p-2 font-medium">{f.fornecedor}</td>
                      <td className="p-2 text-center">{f.totalOS}</td>
                      <td className="p-2 text-center text-red-600 font-bold">{f.comRetrabalho}</td>
                      <td className="p-2 text-right font-bold text-red-600">
                        {fmtNum(f.taxaRetrabalho)}%
                      </td>
                      <td className="p-2 text-center">
                        <Badge color="red" size="xs">CRÍTICO</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Text className="text-green-600 italic flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Todos os fornecedores dentro do padrão de retrabalho aceitável
            </Text>
          )}
        </div>

        {/* OS Canceladas Sem Motivo */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <Text className="font-bold">OS canceladas sem motivo informado ({conformidade.osSemMotivoCancelamento.length})</Text>
          </div>
          {conformidade.osSemMotivoCancelamento.length > 0 ? (
            <Text className="text-red-600">
              {conformidade.osSemMotivoCancelamento.length} OS canceladas requerem justificativa
            </Text>
          ) : (
            <Text className="text-green-600 italic flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Todas as OS canceladas possuem motivo documentado
            </Text>
          )}
        </div>
      </Card>

      {/* Seção 3: Rastreabilidade */}
      <Card>
        <Title className="mb-4">Rastreabilidade de OS - Timeline Completa</Title>
        <div className="flex gap-3 mb-4">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Digite o número da OS..."
              value={buscaOS}
              onChange={(e) => setBuscaOS(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscarOS()}
              className="flex-1 border rounded px-3 py-2 text-sm"
            />
            <button
              onClick={buscarOS}
              className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-600 transition-all"
            >
              <Search className="w-4 h-4" />
              Buscar
            </button>
          </div>
        </div>

        {timelineOS && osInfo && (
          <div className="mt-6">
            {/* Informações da OS */}
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Text className="text-xs text-gray-600">OS / Ocorrência</Text>
                  <Text className="font-bold text-lg">{timelineOS}</Text>
                </div>
                <div>
                  <Text className="text-xs text-gray-600">Placa</Text>
                  <Text className="font-bold">{osInfo.Placa}</Text>
                </div>
                <div>
                  <Text className="text-xs text-gray-600">Modelo</Text>
                  <Text className="font-medium">{osInfo.Modelo}</Text>
                </div>
                <div>
                  <Text className="text-xs text-gray-600">Fornecedor</Text>
                  <Text className="font-medium">{osInfo.Fornecedor}</Text>
                </div>
                <div>
                  <Text className="text-xs text-gray-600">Custo Total</Text>
                  <Text className="font-bold text-blue-600">{fmtBRL(osInfo.CustoTotalOS)}</Text>
                </div>
                <div>
                  <Text className="text-xs text-gray-600">Lead Time</Text>
                  <Text className="font-bold">{osInfo.LeadTimeTotalDias} dias</Text>
                </div>
                <div>
                  <Text className="text-xs text-gray-600">KM Entrada</Text>
                  <Text className="font-medium">{osInfo.KmEntrada.toLocaleString('pt-BR')}</Text>
                </div>
                <div>
                  <Text className="text-xs text-gray-600">KM Saída</Text>
                  <Text className="font-medium">{osInfo.KmSaida.toLocaleString('pt-BR')}</Text>
                </div>
              </div>
            </div>

            {/* Timeline de Movimentações */}
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              <div className="space-y-4">
                {timelineData.map((mov, idx) => (
                  <div key={idx} className="relative flex gap-4 items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold z-10">
                      {idx + 1}
                    </div>
                    <div className="flex-1 bg-white border rounded-lg p-3 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Badge color="blue" size="sm">{mov.Etapa}</Badge>
                          <Text className="text-xs text-gray-500 mt-1">
                            {new Date(mov.DataEtapa).toLocaleString('pt-BR')}
                          </Text>
                          <Text className="text-xs mt-1">
                            Responsável: <span className="font-medium">{mov.UsuarioEtapa || 'N/D'}</span>
                          </Text>
                        </div>
                        <div className="text-right">
                          <Text className="text-xs text-gray-500">Tempo</Text>
                          <Text className="font-bold">{mov.DiasAteConclusaoEtapa}d</Text>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {timelineOS && !osInfo && (
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <Text className="text-red-600">OS {timelineOS} não encontrada</Text>
          </div>
        )}

        {!timelineOS && (
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <Text className="text-gray-500">Digite um número de OS para visualizar a timeline completa</Text>
          </div>
        )}
      </Card>
    </div>
  );
}
