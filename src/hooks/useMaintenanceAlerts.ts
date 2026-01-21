import { useMemo } from 'react';
import useBIData from './useBIData';

export type AlertaSeveridade = 'critico' | 'atencao' | 'info';
export type AlertaTipo = 
  | 'os_critica' 
  | 'os_atencao' 
  | 'etapa_travada' 
  | 'fornecedor_lento' 
  | 'retrabalho_alto' 
  | 'custo_anomalo'
  | 'sem_movimentacao';

export interface Alerta {
  id: string;
  tipo: AlertaTipo;
  severidade: AlertaSeveridade;
  ocorrencia: number;
  placa: string;
  titulo: string;
  mensagem: string;
  valorAtual: number;
  valorEsperado: number;
  unidade: string;
  dataDeteccao: Date;
  acaoSugerida: string;
  metadados?: {
    fornecedor?: string;
    etapa?: string;
    diasParado?: number;
    leadTime?: number;
    custo?: number;
    usuario?: string;
  };
}

interface ConfiguracaoAlertas {
  alerta_os_critica_dias: number;
  alerta_os_atencao_dias: number;
  alerta_etapa_travada_dias: number;
  alerta_fornecedor_lead_time_variacao_pct: number;
  alerta_retrabalho_max_pct: number;
  alerta_custo_anomalo_multiplicador: number;
  // Flags de ativo
  alerta_os_critica_ativo: boolean;
  alerta_os_atencao_ativo: boolean;
  alerta_etapa_travada_ativo: boolean;
  alerta_fornecedor_lead_time_ativo: boolean;
  alerta_retrabalho_ativo: boolean;
  alerta_custo_anomalo_ativo: boolean;
  alerta_sem_movimentacao_72h_ativo: boolean;
}

// Configurações padrão (fallback se não carregar do backend)
const CONFIG_PADRAO: ConfiguracaoAlertas = {
  alerta_os_critica_dias: 10,
  alerta_os_atencao_dias: 5,
  alerta_etapa_travada_dias: 5,
  alerta_fornecedor_lead_time_variacao_pct: 30,
  alerta_retrabalho_max_pct: 15,
  alerta_custo_anomalo_multiplicador: 3,
  alerta_os_critica_ativo: true,
  alerta_os_atencao_ativo: true,
  alerta_etapa_travada_ativo: true,
  alerta_fornecedor_lead_time_ativo: true,
  alerta_retrabalho_ativo: true,
  alerta_custo_anomalo_ativo: true,
  alerta_sem_movimentacao_72h_ativo: true,
};

type MovimentacaoOcorrencia = {
  Ocorrencia: number;
  Placa: string;
  Tipo: string;
  Situacao: string;
  Etapa: string;
  DataEtapa: string;
  Usuario: string;
  DiasAteConclusaoEtapa: number;
  IsAberta: boolean;
  IsConcluida: boolean;
  IsCancelada: boolean;
};

type LeadTimeEtapa = {
  Ocorrencia: number;
  Placa: string;
  EtapaAtual: string;
  TempoEntreEtapas_Dias: number;
  IsRetrabalho: boolean;
};

type ManutencaoUnificado = {
  Ocorrencia: number;
  Placa: string;
  Fornecedor: string;
  LeadTimeTotalDias: number;
  CustoTotalOS: number;
  DataEntrada: string;
};

/**
 * Hook para gerenciar alertas do dashboard de manutenção
 * Analisa dados em tempo real e gera alertas baseados em regras configuráveis
 */
export default function useMaintenanceAlerts() {
  // Carregar configurações (TODO: integrar com API/Supabase)
  const config = CONFIG_PADRAO;

  // Carregar dados necessários
  const { data: movimentacoes } = useBIData<MovimentacaoOcorrencia[]>('fat_movimentacao_ocorrencias.json');
  const { data: leadTimes } = useBIData<LeadTimeEtapa[]>('agg_lead_time_etapas.json');
  const { data: manutencoes } = useBIData<ManutencaoUnificado[]>('fat_manutencao_unificado.json');

  const alertas = useMemo<Alerta[]>(() => {
    if (!movimentacoes?.length && !manutencoes?.length) return [];

    const alertasGerados: Alerta[] = [];
    const now = new Date();

    // PRÉ-FILTRO: Apenas ocorrências de MANUTENÇÃO (excluir Carro Reserva, Sinistro, Multa, Infração, etc.)
    const manutencoesFiltradas = manutencoes?.filter((m: any) => {
      const status = (m.SituacaoOcorrencia || m.StatusSimplificado || '').toLowerCase();
      
      // Excluir status canceladas
      if (status === 'cancelada') {
        return false;
      }
      
      // Filtro por IdTipo: 1=Preventiva, 2=Corretiva, 3=Preditiva (apenas manutenção)
      // Excluir: 4=Sinistro, 5=Carro Reserva, 6=Multa, 7=Infração, etc.
      const idTipo = m.IdTipo;
      if (idTipo) {
        return idTipo === 1 || idTipo === 2 || idTipo === 3;
      }
      
      // Fallback: validar por texto se IdTipo não estiver disponível
      const tipo = (m.Tipo || '').toLowerCase();
      if (tipo.includes('sinistro') || tipo.includes('reserva') || tipo.includes('multa') || tipo.includes('infra')) {
        return false;
      }
      
      return tipo.includes('manuten') || tipo.includes('preventiv') || 
             tipo.includes('corretiv') || tipo.includes('preditiv') || 
             !m.Tipo; // Manter OS sem tipo definido
    }) || [];

    // ========================================================================
    // ALERTA 1: OS Críticas (>10 dias totais)
    // ========================================================================
    if (config.alerta_os_critica_ativo && manutencoesFiltradas.length > 0) {
      const osCriticas = manutencoesFiltradas.filter(m => {
        const leadTime = m.LeadTimeTotalDias || 0;
        return leadTime > config.alerta_os_critica_dias;
      });

      osCriticas.forEach(os => {
        alertasGerados.push({
          id: `os_critica_${os.Ocorrencia}`,
          tipo: 'os_critica',
          severidade: 'critico',
          ocorrencia: os.Ocorrencia,
          placa: os.Placa,
          titulo: `OS ${os.Ocorrencia} está há ${os.LeadTimeTotalDias} dias aberta`,
          mensagem: `A OS está com ${os.LeadTimeTotalDias - config.alerta_os_critica_dias} dias além do limite crítico de ${config.alerta_os_critica_dias} dias.`,
          valorAtual: os.LeadTimeTotalDias,
          valorEsperado: config.alerta_os_critica_dias,
          unidade: 'dias',
          dataDeteccao: now,
          acaoSugerida: `Contatar fornecedor ${os.Fornecedor} urgentemente e solicitar atualização do status da OS ${os.Ocorrencia}.`,
          metadados: {
            fornecedor: os.Fornecedor,
            diasParado: os.LeadTimeTotalDias,
            leadTime: os.LeadTimeTotalDias,
            custo: os.CustoTotalOS,
          },
        });
      });
    }

    // ========================================================================
    // ALERTA 2: OS de Atenção (5-10 dias)
    // ========================================================================
    if (config.alerta_os_atencao_ativo && manutencoesFiltradas.length > 0) {
      const osAtencao = manutencoesFiltradas.filter(m => {
        const leadTime = m.LeadTimeTotalDias || 0;
        return leadTime > config.alerta_os_atencao_dias && leadTime <= config.alerta_os_critica_dias;
      });

      osAtencao.forEach(os => {
        alertasGerados.push({
          id: `os_atencao_${os.Ocorrencia}`,
          tipo: 'os_atencao',
          severidade: 'atencao',
          ocorrencia: os.Ocorrencia,
          placa: os.Placa,
          titulo: `OS ${os.Ocorrencia} requer atenção (${os.LeadTimeTotalDias} dias)`,
          mensagem: `A OS está próxima ao limite crítico. Verificar andamento com fornecedor.`,
          valorAtual: os.LeadTimeTotalDias,
          valorEsperado: config.alerta_os_atencao_dias,
          unidade: 'dias',
          dataDeteccao: now,
          acaoSugerida: `Acompanhar evolução da OS ${os.Ocorrencia} junto ao fornecedor ${os.Fornecedor}.`,
          metadados: {
            fornecedor: os.Fornecedor,
            diasParado: os.LeadTimeTotalDias,
            leadTime: os.LeadTimeTotalDias,
          },
        });
      });
    }

    // ========================================================================
    // ALERTA 3: Etapa Travada (>5 dias na mesma etapa)
    // ========================================================================
    if (config.alerta_etapa_travada_ativo && movimentacoes) {
      // Agrupar por Ocorrencia para pegar última movimentação
      const ultimasPorOcorrencia = movimentacoes.reduce((acc, mov) => {
        const key = mov.Ocorrencia;
        if (!acc[key] || new Date(mov.DataEtapa) > new Date(acc[key].DataEtapa)) {
          acc[key] = mov;
        }
        return acc;
      }, {} as Record<number, MovimentacaoOcorrencia>);

      const etapasTravadas = Object.values(ultimasPorOcorrencia).filter(mov => {
        if (!mov.IsAberta) return false;
        
        const dataEtapa = new Date(mov.DataEtapa);
        const diasNaEtapa = Math.floor((now.getTime() - dataEtapa.getTime()) / (1000 * 60 * 60 * 24));
        
        return diasNaEtapa > config.alerta_etapa_travada_dias;
      });

      etapasTravadas.forEach(mov => {
        const dataEtapa = new Date(mov.DataEtapa);
        const diasNaEtapa = Math.floor((now.getTime() - dataEtapa.getTime()) / (1000 * 60 * 60 * 24));

        alertasGerados.push({
          id: `etapa_travada_${mov.Ocorrencia}`,
          tipo: 'etapa_travada',
          severidade: diasNaEtapa > 7 ? 'critico' : 'atencao',
          ocorrencia: mov.Ocorrencia,
          placa: mov.Placa,
          titulo: `OS ${mov.Ocorrencia} travada em "${mov.Etapa}" há ${diasNaEtapa} dias`,
          mensagem: `A OS não teve movimentação há ${diasNaEtapa} dias. Última atualização: ${new Date(mov.DataEtapa).toLocaleDateString('pt-BR')}.`,
          valorAtual: diasNaEtapa,
          valorEsperado: config.alerta_etapa_travada_dias,
          unidade: 'dias',
          dataDeteccao: now,
          acaoSugerida: `Verificar com responsável ${mov.Usuario} o motivo da paralisação na etapa "${mov.Etapa}".`,
          metadados: {
            etapa: mov.Etapa,
            usuario: mov.Usuario,
            diasParado: diasNaEtapa,
          },
        });
      });
    }

    // ========================================================================
    // ALERTA 4: Sem Movimentação por 72h
    // ========================================================================
    if (config.alerta_sem_movimentacao_72h_ativo && movimentacoes) {
      const ultimasPorOcorrencia = movimentacoes.reduce((acc, mov) => {
        const key = mov.Ocorrencia;
        if (!acc[key] || new Date(mov.DataEtapa) > new Date(acc[key].DataEtapa)) {
          acc[key] = mov;
        }
        return acc;
      }, {} as Record<number, MovimentacaoOcorrencia>);

      const semMovimentacao = Object.values(ultimasPorOcorrencia).filter(mov => {
        if (!mov.IsAberta) return false;
        
        const dataEtapa = new Date(mov.DataEtapa);
        const horasSemMovimentacao = (now.getTime() - dataEtapa.getTime()) / (1000 * 60 * 60);
        
        return horasSemMovimentacao > 72;
      });

      semMovimentacao.forEach(mov => {
        const dataEtapa = new Date(mov.DataEtapa);
        const horasSemMovimentacao = Math.floor((now.getTime() - dataEtapa.getTime()) / (1000 * 60 * 60));

        alertasGerados.push({
          id: `sem_movimentacao_${mov.Ocorrencia}`,
          tipo: 'sem_movimentacao',
          severidade: 'atencao',
          ocorrencia: mov.Ocorrencia,
          placa: mov.Placa,
          titulo: `OS ${mov.Ocorrencia} sem movimentação há ${Math.floor(horasSemMovimentacao / 24)} dias`,
          mensagem: `A OS não tem atualizações há ${horasSemMovimentacao} horas (${Math.floor(horasSemMovimentacao / 24)} dias).`,
          valorAtual: horasSemMovimentacao,
          valorEsperado: 72,
          unidade: 'horas',
          dataDeteccao: now,
          acaoSugerida: `Solicitar atualização de status ao responsável ${mov.Usuario}.`,
          metadados: {
            etapa: mov.Etapa,
            usuario: mov.Usuario,
          },
        });
      });
    }

    // ========================================================================
    // ALERTA 5: Retrabalho Detectado
    // ========================================================================
    if (config.alerta_retrabalho_ativo && leadTimes) {
      const retrabalhos = leadTimes.filter(lt => lt.IsRetrabalho);
      
      // Agrupar por ocorrência e contar retrabalhos
      const retrabalhosPorOS = retrabalhos.reduce((acc, lt) => {
        if (!acc[lt.Ocorrencia]) {
          acc[lt.Ocorrencia] = { count: 0, placa: lt.Placa, etapas: [] as string[] };
        }
        acc[lt.Ocorrencia].count++;
        acc[lt.Ocorrencia].etapas.push(lt.EtapaAtual);
        return acc;
      }, {} as Record<number, { count: number; placa: string; etapas: string[] }>);

      // Alertar OS com 2 ou mais retrabalhos
      Object.entries(retrabalhosPorOS).forEach(([ocorrenciaStr, data]) => {
        if (data.count >= 2) {
          const ocorrencia = parseInt(ocorrenciaStr);
          alertasGerados.push({
            id: `retrabalho_${ocorrencia}`,
            tipo: 'retrabalho_alto',
            severidade: 'atencao',
            ocorrencia,
            placa: data.placa,
            titulo: `OS ${ocorrencia} com ${data.count} retrabalhos detectados`,
            mensagem: `A OS voltou ${data.count} vezes para etapas anteriores: ${data.etapas.join(', ')}.`,
            valorAtual: data.count,
            valorEsperado: 0,
            unidade: 'retrabalhos',
            dataDeteccao: now,
            acaoSugerida: `Investigar motivo dos retrabalhos e ajustar processo para evitar recorrência.`,
            metadados: {
              etapa: data.etapas.join(', '),
            },
          });
        }
      });
    }

    // ========================================================================
    // ALERTA 6: Custo Anômalo (>3× ticket médio)
    // ========================================================================
    if (config.alerta_custo_anomalo_ativo && manutencoes) {
      const custosValidos = manutencoes
        .map(m => m.CustoTotalOS)
        .filter(c => c > 0);
      
      if (custosValidos.length > 0) {
        const ticketMedio = custosValidos.reduce((sum, c) => sum + c, 0) / custosValidos.length;
        const limiteAnomal = ticketMedio * config.alerta_custo_anomalo_multiplicador;

        const custosAnomalo = manutencoes.filter(m => m.CustoTotalOS > limiteAnomal);

        custosAnomalo.forEach(os => {
          const vezesAcima = (os.CustoTotalOS / ticketMedio).toFixed(1);
          
          alertasGerados.push({
            id: `custo_anomalo_${os.Ocorrencia}`,
            tipo: 'custo_anomalo',
            severidade: parseFloat(vezesAcima) > 5 ? 'critico' : 'atencao',
            ocorrencia: os.Ocorrencia,
            placa: os.Placa,
            titulo: `OS ${os.Ocorrencia} com custo ${vezesAcima}× acima da média`,
            mensagem: `Custo de R$ ${os.CustoTotalOS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} está ${vezesAcima}× acima do ticket médio de R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
            valorAtual: os.CustoTotalOS,
            valorEsperado: ticketMedio,
            unidade: 'R$',
            dataDeteccao: now,
            acaoSugerida: `Auditar custos da OS ${os.Ocorrencia} junto ao fornecedor ${os.Fornecedor} e validar itens cobrados.`,
            metadados: {
              fornecedor: os.Fornecedor,
              custo: os.CustoTotalOS,
            },
          });
        });
      }
    }

    // Ordenar por severidade (crítico primeiro) e depois por valor
    return alertasGerados.sort((a, b) => {
      if (a.severidade !== b.severidade) {
        return a.severidade === 'critico' ? -1 : 1;
      }
      return b.valorAtual - a.valorAtual;
    });
  }, [movimentacoes, leadTimes, manutencoes, config]);

  // Resumo de alertas por severidade
  const resumo = useMemo(() => {
    return {
      total: alertas.length,
      criticos: alertas.filter(a => a.severidade === 'critico').length,
      atencao: alertas.filter(a => a.severidade === 'atencao').length,
      info: alertas.filter(a => a.severidade === 'info').length,
    };
  }, [alertas]);

  // Retornar alertas e utilidades
  return {
    alertas,
    resumo,
    config,
    temAlertasCriticos: resumo.criticos > 0,
    temAlertasAtencao: resumo.atencao > 0,
  };
}
