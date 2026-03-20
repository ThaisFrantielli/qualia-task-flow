import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type MotivoPerda = {
    id: string;
    nome: string;
    descricao: string | null;
    ativo: boolean;
    ordem: number;
};

export type ForecastPorEstagio = {
    estagio_nome: string;
    estagio_ordem: number;
    qtd_oportunidades: number;
    valor_total_bruto: number;
    valor_ponderado: number;
    probabilidade_media: number;
    responsavel_nome: string | null;
    responsavel_id: string | null;
};

export type OportunidadePipeline = {
    id: string;
    titulo: string;
    descricao: string | null;
    status: string;
    valor_total: number;
    probabilidade_ganho: number | null;
    motivo_perda: string | null;
    motivo_perda_id: string | null;
    data_fechamento_prevista: string | null;
    data_fechamento_real: string | null;
    estagio_id: string | null;
    responsavel_id: string | null;
    cliente_id: string | null;
    created_at: string;
    updated_at: string | null;
    // joins
    cliente?: { id: string; nome_fantasia: string | null; razao_social: string | null } | null;
    responsavel?: { id: string; full_name: string | null } | null;
    motivo_perda_obj?: MotivoPerda | null;
};

// ─── Fetch ──────────────────────────────────────────────────────────────────

const fetchPipeline = async (): Promise<OportunidadePipeline[]> => {
    const { data, error } = await supabase
        .from('oportunidades')
        .select(`
      *,
      cliente:clientes(id, nome_fantasia, razao_social),
      responsavel:profiles!oportunidades_responsavel_id_fkey(id, full_name),
      motivo_perda_obj:motivos_perda_pipeline(id, nome, descricao, ativo, ordem)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        // FK alias pode não existir ainda; fallback sem joins opcionais
        const { data: fallback, error: err2 } = await supabase
            .from('oportunidades')
            .select(`*, cliente:clientes(id, nome_fantasia, razao_social)`)
            .order('created_at', { ascending: false });
        if (err2) throw new Error(err2.message);
        return (fallback ?? []) as unknown as OportunidadePipeline[];
    }

    return (data ?? []) as unknown as OportunidadePipeline[];
};

const fetchMotivosPerdaAtivos = async (): Promise<MotivoPerda[]> => {
    const { data, error } = await supabase
        .from('motivos_perda_pipeline')
        .select('*')
        .eq('ativo', true)
        .order('ordem');
    if (error) throw new Error(error.message);
    return (data ?? []) as MotivoPerda[];
};

const fetchForecast = async (): Promise<ForecastPorEstagio[]> => {
    const { data, error } = await supabase
        .from('vw_forecast_pipeline')
        .select('*')
        .order('estagio_ordem');
    if (error) throw new Error(error.message);
    return (data ?? []) as ForecastPorEstagio[];
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function usePipeline() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const pipelineQuery = useQuery({
        queryKey: ['pipeline', user?.id],
        queryFn: fetchPipeline,
        enabled: !!user?.id,
    });

    const motivosQuery = useQuery({
        queryKey: ['motivos_perda_pipeline'],
        queryFn: fetchMotivosPerdaAtivos,
        staleTime: 5 * 60 * 1000,
    });

    const forecastQuery = useQuery({
        queryKey: ['forecast_pipeline'],
        queryFn: fetchForecast,
        enabled: !!user?.id,
        staleTime: 60 * 1000,
    });

    // Mutation: atualizar probabilidade de ganho
    const updateProbabilidadeMutation = useMutation({
        mutationFn: async ({
            id,
            probabilidade_ganho,
        }: {
            id: string;
            probabilidade_ganho: number;
        }) => {
            const { error } = await supabase
                .from('oportunidades')
                .update({ probabilidade_ganho })
                .eq('id', id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline'] });
            queryClient.invalidateQueries({ queryKey: ['forecast_pipeline'] });
            queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
        },
        onError: (err: Error) => {
            toast.error('Erro ao atualizar probabilidade', { description: err.message });
        },
    });

    // Mutation: fechar oportunidade como perdida (exige motivo)
    const fecharComoPerdidaMutation = useMutation({
        mutationFn: async ({
            id,
            motivo_perda_id,
            motivo_perda,
        }: {
            id: string;
            motivo_perda_id?: string;
            motivo_perda?: string;
        }) => {
            if (!motivo_perda_id && !motivo_perda?.trim()) {
                throw new Error('Informe o motivo da perda antes de continuar.');
            }
            const { error } = await supabase
                .from('oportunidades')
                .update({
                    status: 'cancelada',
                    motivo_perda_id: motivo_perda_id ?? null,
                    motivo_perda: motivo_perda ?? null,
                })
                .eq('id', id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline'] });
            queryClient.invalidateQueries({ queryKey: ['forecast_pipeline'] });
            queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
            toast.success('Oportunidade registrada como perdida.');
        },
        onError: (err: Error) => {
            toast.error('Erro ao registrar perda', { description: err.message });
        },
    });

    // Mutation: fechar como ganho
    const fecharComoGanhoMutation = useMutation({
        mutationFn: async ({ id }: { id: string }) => {
            const { error } = await supabase
                .from('oportunidades')
                .update({ status: 'fechada' })
                .eq('id', id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline'] });
            queryClient.invalidateQueries({ queryKey: ['forecast_pipeline'] });
            queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
            toast.success('Oportunidade fechada como ganha!');
        },
        onError: (err: Error) => {
            toast.error('Erro ao fechar oportunidade', { description: err.message });
        },
    });

    // Mutation: atualizar data de fechamento prevista
    const setDataFechamentoMutation = useMutation({
        mutationFn: async ({
            id,
            data_fechamento_prevista,
        }: {
            id: string;
            data_fechamento_prevista: string;
        }) => {
            const { error } = await supabase
                .from('oportunidades')
                .update({ data_fechamento_prevista })
                .eq('id', id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline'] });
            queryClient.invalidateQueries({ queryKey: ['forecast_pipeline'] });
        },
        onError: (err: Error) => {
            toast.error('Erro ao atualizar prazo', { description: err.message });
        },
    });

    return {
        // dados
        oportunidades: pipelineQuery.data ?? [],
        isLoading: pipelineQuery.isLoading,
        error: pipelineQuery.error as Error | null,

        motivosPerda: motivosQuery.data ?? [],
        motivosLoading: motivosQuery.isLoading,

        forecast: forecastQuery.data ?? [],
        forecastLoading: forecastQuery.isLoading,

        // mutations
        updateProbabilidade: updateProbabilidadeMutation.mutateAsync,
        fecharComoPerdida: fecharComoPerdidaMutation.mutateAsync,
        fecharComoGanho: fecharComoGanhoMutation.mutateAsync,
        setDataFechamento: setDataFechamentoMutation.mutateAsync,
    };
}
