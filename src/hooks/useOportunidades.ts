import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Oportunidade, OportunidadeWithDetails } from '@/types';
import { toast } from 'sonner';

// Busca todas as oportunidades do usuário logado com detalhes
const fetchOportunidades = async () => {
  const { data, error } = await supabase
    .from('oportunidades')
    .select(`
      *,
      user:profiles(*),
      cliente:clientes(*),
      messages:oportunidade_messages(count),
      produtos:oportunidade_produtos(count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar oportunidades:", error);
    throw new Error(error.message);
  }

  // Mapeia os dados para um formato mais fácil de usar no frontend
  return data.map((opp: any) => ({
    ...opp,
    messages_count: opp.messages[0]?.count || 0,
    produtos_count: opp.produtos[0]?.count || 0,
  })) as OportunidadeWithDetails[];
};

// Cria uma nova oportunidade
const createNewOportunidade = async (newOpp: Partial<Oportunidade> & { user_id: string }) => {
  const { data, error } = await supabase
    .from('oportunidades')
    .insert({ ...newOpp, titulo: newOpp.titulo || '' })
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar oportunidade:", error);
    throw new Error(error.message);
  }
  return data;
};

// Atualiza o estágio de uma oportunidade
const updateOportunidadeEstagioFn = async ({ oportunidadeId, estagioId }: { oportunidadeId: string; estagioId: string }) => {
  const { data, error } = await supabase
    .from('oportunidades')
    .update({ estagio_id: estagioId })
    .eq('id', oportunidadeId)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar estágio:", error);
    throw new Error(error.message);
  }
  return data;
};


export function useOportunidades() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query para buscar os dados
  const { data, isLoading, error } = useQuery({
    queryKey: ['oportunidades', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return fetchOportunidades();
    },
    enabled: !!user?.id, // A query só roda se o usuário estiver logado
  });

  // Mutation para criar um novo registro
  const createMutation = useMutation({
    mutationFn: (newOpp: Partial<Oportunidade>) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      return createNewOportunidade({ ...newOpp, user_id: user.id });
    },
    onSuccess: () => {
      // Invalida a query para forçar o refetch da lista
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
      toast.success('Oportunidade criada com sucesso!');
    },
    onError: (err) => {
      toast.error('Falha ao criar oportunidade', { description: err.message });
    }
  });

  // Mutation para atualizar o estágio
  const updateEstagioMutation = useMutation({
    mutationFn: updateOportunidadeEstagioFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
    },
    onError: (err) => {
      toast.error('Falha ao mover oportunidade', { description: err.message });
    }
  });

  return {
    oportunidades: data || [],
    isLoading,
    error: error as Error | null,
    createOportunidade: createMutation.mutateAsync,
    updateOportunidadeEstagio: updateEstagioMutation.mutateAsync,
  };
}