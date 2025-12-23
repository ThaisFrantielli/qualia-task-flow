import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  Proposta, 
  PropostaVeiculo, 
  PropostaCenario,
  PropostaHistorico,
  PropostaWithDetails,
  PropostaVeiculoItem,
  PropostaStatus
} from '@/types/proposta';

// =========================================
// Fetch all propostas
// =========================================
const fetchPropostas = async (): Promise<Proposta[]> => {
  const { data, error } = await supabase
    .from('propostas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as Proposta[];
};

// =========================================
// Fetch single proposta with all details
// =========================================
const fetchPropostaById = async (id: string): Promise<PropostaWithDetails | null> => {
  const { data: proposta, error } = await supabase
    .from('propostas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  if (!proposta) return null;

  // Fetch related data in parallel
  const [
    { data: veiculos },
    { data: cenarios },
    { data: historico }
  ] = await Promise.all([
    supabase.from('proposta_veiculos').select('*').eq('proposta_id', id),
    supabase.from('proposta_cenarios').select('*').eq('proposta_id', id).order('prazo_meses'),
    supabase.from('proposta_historico').select('*').eq('proposta_id', id).order('created_at', { ascending: false })
  ]);

  // Fetch itens for each veiculo
  const veiculosWithItems = await Promise.all(
    (veiculos || []).map(async (v) => {
      const { data: itens } = await supabase
        .from('proposta_veiculo_itens')
        .select('*')
        .eq('proposta_veiculo_id', v.id);
      
      return {
        ...v,
        itens: (itens || []) as PropostaVeiculoItem[]
      };
    })
  );

  return {
    ...proposta,
    veiculos: veiculosWithItems,
    cenarios: (cenarios || []) as PropostaCenario[],
    historico: (historico || []) as PropostaHistorico[]
  } as PropostaWithDetails;
};

// =========================================
// Create proposta
// =========================================
const createProposta = async (data: Partial<Proposta>): Promise<Proposta> => {
  const { data: proposta, error } = await supabase
    .from('propostas')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return proposta as Proposta;
};

// =========================================
// Update proposta
// =========================================
const updateProposta = async ({ id, ...data }: Partial<Proposta> & { id: string }): Promise<Proposta> => {
  const { data: proposta, error } = await supabase
    .from('propostas')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return proposta as Proposta;
};

// =========================================
// Delete proposta
// =========================================
const deleteProposta = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('propostas')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

// =========================================
// Update proposta status
// =========================================
const updatePropostaStatus = async ({ id, status }: { id: string; status: PropostaStatus }): Promise<Proposta> => {
  const updates: Partial<Proposta> = { status };
  
  if (status === 'enviada') {
    updates.data_envio = new Date().toISOString();
  } else if (status === 'aprovada') {
    updates.data_aprovacao = new Date().toISOString();
  }

  const { data: proposta, error } = await supabase
    .from('propostas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return proposta as Proposta;
};

// =========================================
// Add veiculo to proposta
// =========================================
const addPropostaVeiculo = async (data: Omit<PropostaVeiculo, 'id' | 'created_at'>): Promise<PropostaVeiculo> => {
  const { data: veiculo, error } = await supabase
    .from('proposta_veiculos')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return veiculo as PropostaVeiculo;
};

// =========================================
// Update veiculo
// =========================================
const updatePropostaVeiculo = async ({ id, ...data }: Partial<PropostaVeiculo> & { id: string }): Promise<PropostaVeiculo> => {
  const { data: veiculo, error } = await supabase
    .from('proposta_veiculos')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return veiculo as PropostaVeiculo;
};

// =========================================
// Delete veiculo
// =========================================
const deletePropostaVeiculo = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('proposta_veiculos')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

// =========================================
// Save cenarios
// =========================================
const saveCenarios = async (propostaId: string, cenarios: Omit<PropostaCenario, 'id' | 'created_at'>[]): Promise<PropostaCenario[]> => {
  // Delete existing cenarios
  await supabase.from('proposta_cenarios').delete().eq('proposta_id', propostaId);

  // Insert new cenarios
  const { data, error } = await supabase
    .from('proposta_cenarios')
    .insert(cenarios.map(c => ({ ...c, proposta_id: propostaId })))
    .select();

  if (error) throw new Error(error.message);
  return (data || []) as PropostaCenario[];
};

// =========================================
// Add historico entry
// =========================================
const addHistorico = async (data: Omit<PropostaHistorico, 'id' | 'created_at'>): Promise<PropostaHistorico> => {
  const { data: historico, error } = await supabase
    .from('proposta_historico')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return historico as PropostaHistorico;
};

// =========================================
// Main Hook
// =========================================
export function usePropostas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query all propostas
  const { data: propostas, isLoading, error } = useQuery({
    queryKey: ['propostas'],
    queryFn: fetchPropostas,
    enabled: !!user?.id
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Proposta>) => {
      const proposta = await createProposta({
        ...data,
        vendedor_id: user?.id,
        vendedor_nome: user?.full_name || user?.email
      });

      // Add creation event to historico
      await addHistorico({
        proposta_id: proposta.id,
        tipo_evento: 'criacao',
        descricao: 'Proposta criada',
        user_id: user?.id,
        user_nome: user?.full_name || user?.email
      });

      return proposta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
      toast.success('Proposta criada com sucesso!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao criar proposta', { description: err.message });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: updateProposta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
      toast.success('Proposta atualizada!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao atualizar proposta', { description: err.message });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteProposta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
      toast.success('Proposta excluída!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao excluir proposta', { description: err.message });
    }
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PropostaStatus }) => {
      const proposta = await updatePropostaStatus({ id, status });

      // Add status change to historico
      await addHistorico({
        proposta_id: id,
        tipo_evento: 'mudanca_status',
        descricao: `Status alterado para: ${status}`,
        detalhes: { novo_status: status },
        user_id: user?.id,
        user_nome: user?.full_name || user?.email
      });

      return proposta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
      toast.success('Status atualizado!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao atualizar status', { description: err.message });
    }
  });

  // Veiculo mutations
  const addVeiculoMutation = useMutation({
    mutationFn: addPropostaVeiculo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
    },
    onError: (err: Error) => {
      toast.error('Erro ao adicionar veículo', { description: err.message });
    }
  });

  const updateVeiculoMutation = useMutation({
    mutationFn: updatePropostaVeiculo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
    },
    onError: (err: Error) => {
      toast.error('Erro ao atualizar veículo', { description: err.message });
    }
  });

  const deleteVeiculoMutation = useMutation({
    mutationFn: deletePropostaVeiculo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
    },
    onError: (err: Error) => {
      toast.error('Erro ao remover veículo', { description: err.message });
    }
  });

  // Cenarios mutation
  const saveCenariosMutation = useMutation({
    mutationFn: ({ propostaId, cenarios }: { propostaId: string; cenarios: Omit<PropostaCenario, 'id' | 'created_at'>[] }) => 
      saveCenarios(propostaId, cenarios),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
    },
    onError: (err: Error) => {
      toast.error('Erro ao salvar cenários', { description: err.message });
    }
  });

  return {
    propostas: propostas || [],
    isLoading,
    error: error as Error | null,
    
    // Proposta CRUD
    createProposta: createMutation.mutateAsync,
    updateProposta: updateMutation.mutateAsync,
    deleteProposta: deleteMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    
    // Veiculo CRUD
    addVeiculo: addVeiculoMutation.mutateAsync,
    updateVeiculo: updateVeiculoMutation.mutateAsync,
    deleteVeiculo: deleteVeiculoMutation.mutateAsync,
    
    // Cenarios
    saveCenarios: saveCenariosMutation.mutateAsync,
    
    // Historico
    addHistorico,
    
    // Fetch single
    fetchPropostaById
  };
}

// =========================================
// Hook for single proposta
// =========================================
export function useProposta(id: string | undefined) {
  return useQuery({
    queryKey: ['propostas', id],
    queryFn: () => (id ? fetchPropostaById(id) : null),
    enabled: !!id
  });
}
