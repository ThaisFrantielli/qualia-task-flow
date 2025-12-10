import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export type LeadTriagem = {
    id: string;
    nome_fantasia: string | null;
    razao_social: string | null;
    email: string | null;
    telefone: string | null;
    whatsapp_number: string | null;
    origem: string | null;
    status_triagem: string | null;
    created_at?: string;
    cadastro_cliente?: string;
};

// Hook para buscar leads aguardando triagem
export function useLeadsTriagem() {
    return useQuery({
        queryKey: ['leads-triagem'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .eq('status_triagem', 'aguardando')
                // Some deployments use `cadastro_cliente` instead of `created_at`.
                // Order by `cadastro_cliente` to be compatible with the DB schema.
                .order('cadastro_cliente', { ascending: true }); // Mais antigos primeiro

            if (error) throw error;
            return data as LeadTriagem[];
        },
    });
}

// Hook para encaminhar lead para comercial (cria oportunidade)
export function useEncaminharParaComercial() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ clienteId, funilId }: { clienteId: string; funilId?: string }) => {
            // 1. Buscar dados do cliente
            const { data: cliente, error: clienteError } = await supabase
                .from('clientes')
                .select('*')
                .eq('id', clienteId)
                .single();

            if (clienteError) throw clienteError;

            // 2. Buscar primeiro estágio do funil (se fornecido)
            let estagioId = null;
            if (funilId) {
                const { data: estagios, error: estagiosError } = await supabase
                    .from('funil_estagios')
                    .select('id')
                    .eq('funil_id', funilId)
                    .order('ordem', { ascending: true })
                    .limit(1);

                if (estagiosError) throw estagiosError;
                estagioId = estagios?.[0]?.id || null;
            }

            // 3. Criar oportunidade
            const { data: oportunidade, error: oppError } = await supabase
                .from('oportunidades')
                .insert({
                    titulo: `Oportunidade - ${cliente.nome_fantasia || cliente.razao_social}`,
                    cliente_id: clienteId,
                    status: 'aberta',
                    funil_id: funilId || null,
                    estagio_id: estagioId,
                    user_id: user?.id,
                })
                .select()
                .single();

            if (oppError) throw oppError;

            // 4. Atualizar status do cliente
            const { error: updateError } = await supabase
                .from('clientes')
                .update({ status_triagem: 'comercial' })
                .eq('id', clienteId);

            if (updateError) throw updateError;

            return oportunidade;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads-triagem'] });
            queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
            toast.success('Lead encaminhado para Comercial!');
        },
        onError: (error: any) => {
            toast.error('Erro ao encaminhar lead: ' + error.message);
        },
    });
}

// Hook para criar ticket de atendimento
export function useCriarTicketAtendimento() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ clienteId, titulo, descricao, prioridade }: {
            clienteId: string;
            titulo: string;
            descricao: string;
            prioridade?: string;
        }) => {
            // 1. Criar ticket
            const { data: ticket, error: ticketError } = await supabase
                .from('tickets')
                .insert({
                    cliente_id: clienteId,
                    titulo,
                    descricao,
                    prioridade: prioridade || 'media',
                    status: 'aberto',
                    atendente_id: user?.id,
                })
                .select()
                .single();

            if (ticketError) throw ticketError;

            // 2. Atualizar status do cliente
            const { error: updateError } = await supabase
                .from('clientes')
                .update({
                    status_triagem: 'em_atendimento',
                    ultimo_atendente_id: user?.id,
                })
                .eq('id', clienteId);

            if (updateError) throw updateError;

            return ticket;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads-triagem'] });
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            toast.success('Ticket criado! Lead em atendimento.');
        },
        onError: (error: any) => {
            toast.error('Erro ao criar ticket: ' + error.message);
        },
    });
}

// Hook para descartar lead
export function useDescartarLead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ clienteId, motivo }: { clienteId: string; motivo?: string }) => {
            const { error } = await supabase
                .from('clientes')
                .update({ 
                    status_triagem: 'descartado',
                    descartado_motivo: motivo || null,
                    descartado_em: new Date().toISOString()
                })
                .eq('id', clienteId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads-triagem'] });
            toast.success('Lead descartado');
        },
        onError: (error: any) => {
            toast.error('Erro ao descartar lead: ' + error.message);
        },
    });
}
