import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Tipos
export type Funil = {
    id: string;
    nome: string;
    descricao: string | null;
    tipo: string;
    ativo: boolean;
    created_at: string;
    created_by: string | null;
};

export type FunilEstagio = {
    id: string;
    funil_id: string;
    nome: string;
    ordem: number;
    cor: string | null;
    created_at: string;
};

export type FunilComEstagios = Funil & {
    estagios: FunilEstagio[];
};

// Hook para listar todos os funis
export function useFunis() {
    return useQuery({
        queryKey: ['funis'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('funis')
                .select('*')
                .eq('ativo', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Funil[];
        },
    });
}

// Hook para buscar um funil específico com seus estágios
export function useFunil(funilId: string | null) {
    return useQuery({
        queryKey: ['funil', funilId],
        queryFn: async () => {
            if (!funilId) return null;

            const { data: funil, error: funilError } = await supabase
                .from('funis')
                .select('*')
                .eq('id', funilId)
                .single();

            if (funilError) throw funilError;

            const { data: estagios, error: estagiosError } = await supabase
                .from('funil_estagios')
                .select('*')
                .eq('funil_id', funilId)
                .order('ordem', { ascending: true });

            if (estagiosError) throw estagiosError;

            return {
                ...funil,
                estagios: estagios || [],
            } as FunilComEstagios;
        },
        enabled: !!funilId,
    });
}

// Hook para criar funil
export function useCreateFunil() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { nome: string; descricao?: string; tipo: string }) => {
            const { data: funil, error } = await supabase
                .from('funis')
                .insert(data)
                .select()
                .single();

            if (error) throw error;
            return funil;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['funis'] });
            toast.success('Funil criado com sucesso!');
        },
        onError: (error: any) => {
            toast.error('Erro ao criar funil: ' + error.message);
        },
    });
}

// Hook para atualizar funil
export function useUpdateFunil() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Funil> }) => {
            const { data, error } = await supabase
                .from('funis')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['funis'] });
            queryClient.invalidateQueries({ queryKey: ['funil', variables.id] });
            toast.success('Funil atualizado!');
        },
        onError: (error: any) => {
            toast.error('Erro ao atualizar funil: ' + error.message);
        },
    });
}

// Hook para deletar funil (soft delete - marca como inativo)
export function useDeleteFunil() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('funis')
                .update({ ativo: false })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['funis'] });
            toast.success('Funil removido!');
        },
        onError: (error: any) => {
            toast.error('Erro ao remover funil: ' + error.message);
        },
    });
}

// Hook para criar estágio
export function useCreateEstagio() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { funil_id: string; nome: string; ordem: number; cor?: string }) => {
            const { data: estagio, error } = await supabase
                .from('funil_estagios')
                .insert(data)
                .select()
                .single();

            if (error) throw error;
            return estagio;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['funil', variables.funil_id] });
            toast.success('Estágio adicionado!');
        },
        onError: (error: any) => {
            toast.error('Erro ao adicionar estágio: ' + error.message);
        },
    });
}

// Hook para atualizar estágio
export function useUpdateEstagio() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, funilId, updates }: { id: string; funilId: string; updates: Partial<FunilEstagio> }) => {
            const { data, error } = await supabase
                .from('funil_estagios')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['funil', variables.funilId] });
            toast.success('Estágio atualizado!');
        },
        onError: (error: any) => {
            toast.error('Erro ao atualizar estágio: ' + error.message);
        },
    });
}

// Hook para deletar estágio
export function useDeleteEstagio() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, funilId }: { id: string; funilId: string }) => {
            const { error } = await supabase
                .from('funil_estagios')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['funil', variables.funilId] });
            toast.success('Estágio removido!');
        },
        onError: (error: any) => {
            toast.error('Erro ao remover estágio: ' + error.message);
        },
    });
}

// Hook para reordenar estágios
export function useReorderEstagios() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ funilId, estagios }: { funilId: string; estagios: { id: string; ordem: number }[] }) => {
            // Atualizar ordem de cada estágio
            const promises = estagios.map(({ id, ordem }) =>
                supabase
                    .from('funil_estagios')
                    .update({ ordem })
                    .eq('id', id)
            );

            const results = await Promise.all(promises);
            const error = results.find(r => r.error)?.error;
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['funil', variables.funilId] });
            toast.success('Ordem atualizada!');
        },
        onError: (error: any) => {
            toast.error('Erro ao reordenar estágios: ' + error.message);
        },
    });
}
