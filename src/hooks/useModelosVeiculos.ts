import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ModeloVeiculo, ModeloCor, ModeloItemAdicional, ModeloVeiculoWithDetails } from '@/types/modelos';

// =========================================
// Fetch all modelos with details
// =========================================
const fetchModelosVeiculos = async (): Promise<ModeloVeiculoWithDetails[]> => {
  const { data: modelos, error } = await supabase
    .from('modelos_veiculos')
    .select('*')
    .order('montadora', { ascending: true })
    .order('nome', { ascending: true });

  if (error) throw new Error(error.message);

  // Fetch cores and itens for each modelo
  const modelosWithDetails = await Promise.all(
    (modelos || []).map(async (modelo) => {
      const [{ data: cores }, { data: itens }] = await Promise.all([
        supabase.from('modelo_cores').select('*').eq('modelo_id', modelo.id),
        supabase.from('modelo_itens_adicionais').select('*').eq('modelo_id', modelo.id)
      ]);

      return {
        ...modelo,
        cores: (cores || []) as ModeloCor[],
        itens: (itens || []) as ModeloItemAdicional[]
      } as ModeloVeiculoWithDetails;
    })
  );

  return modelosWithDetails;
};

// =========================================
// Fetch single modelo with details
// =========================================
const fetchModeloById = async (id: string): Promise<ModeloVeiculoWithDetails | null> => {
  const { data: modelo, error } = await supabase
    .from('modelos_veiculos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  if (!modelo) return null;

  const [{ data: cores }, { data: itens }] = await Promise.all([
    supabase.from('modelo_cores').select('*').eq('modelo_id', id),
    supabase.from('modelo_itens_adicionais').select('*').eq('modelo_id', id)
  ]);

  return {
    ...modelo,
    cores: (cores || []) as ModeloCor[],
    itens: (itens || []) as ModeloItemAdicional[]
  } as ModeloVeiculoWithDetails;
};

// =========================================
// Create modelo
// =========================================
const createModelo = async (data: Partial<ModeloVeiculo>): Promise<ModeloVeiculo> => {
  // Calculate valor_final
  const preco = data.preco_publico || 0;
  const desconto = data.percentual_desconto || 0;
  const valorFinal = preco - (preco * desconto);

  const { data: modelo, error } = await supabase
    .from('modelos_veiculos')
    .insert({
      ...data,
      valor_final: valorFinal
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return modelo as ModeloVeiculo;
};

// =========================================
// Update modelo
// =========================================
const updateModelo = async ({ id, ...data }: Partial<ModeloVeiculo> & { id: string }): Promise<ModeloVeiculo> => {
  // Calculate valor_final if prices changed
  let valorFinal = data.valor_final;
  if (data.preco_publico !== undefined || data.percentual_desconto !== undefined) {
    const preco = data.preco_publico || 0;
    const desconto = data.percentual_desconto || 0;
    valorFinal = preco - (preco * desconto);
  }

  const { data: modelo, error } = await supabase
    .from('modelos_veiculos')
    .update({
      ...data,
      valor_final: valorFinal
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return modelo as ModeloVeiculo;
};

// =========================================
// Delete modelo
// =========================================
const deleteModelo = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('modelos_veiculos')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

// =========================================
// Manage cores
// =========================================
const addCor = async (data: Omit<ModeloCor, 'id' | 'created_at'>): Promise<ModeloCor> => {
  const { data: cor, error } = await supabase
    .from('modelo_cores')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return cor as ModeloCor;
};

const updateCor = async ({ id, ...data }: Partial<ModeloCor> & { id: string }): Promise<ModeloCor> => {
  const { data: cor, error } = await supabase
    .from('modelo_cores')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return cor as ModeloCor;
};

const deleteCor = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('modelo_cores')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

// =========================================
// Manage itens
// =========================================
const addItem = async (data: Omit<ModeloItemAdicional, 'id' | 'created_at'>): Promise<ModeloItemAdicional> => {
  const { data: item, error } = await supabase
    .from('modelo_itens_adicionais')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return item as ModeloItemAdicional;
};

const updateItem = async ({ id, ...data }: Partial<ModeloItemAdicional> & { id: string }): Promise<ModeloItemAdicional> => {
  const { data: item, error } = await supabase
    .from('modelo_itens_adicionais')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return item as ModeloItemAdicional;
};

const deleteItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('modelo_itens_adicionais')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

// =========================================
// Main Hook
// =========================================
export function useModelosVeiculos() {
  const queryClient = useQueryClient();

  // Query all modelos
  const { data: modelos, isLoading, error } = useQuery({
    queryKey: ['modelos_veiculos'],
    queryFn: fetchModelosVeiculos
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createModelo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos_veiculos'] });
      toast.success('Modelo criado com sucesso!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao criar modelo', { description: err.message });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: updateModelo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos_veiculos'] });
      toast.success('Modelo atualizado com sucesso!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao atualizar modelo', { description: err.message });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteModelo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos_veiculos'] });
      toast.success('Modelo excluído com sucesso!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao excluir modelo', { description: err.message });
    }
  });

  // Cor mutations
  const addCorMutation = useMutation({
    mutationFn: addCor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos_veiculos'] });
      toast.success('Cor adicionada!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao adicionar cor', { description: err.message });
    }
  });

  const updateCorMutation = useMutation({
    mutationFn: updateCor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos_veiculos'] });
    },
    onError: (err: Error) => {
      toast.error('Erro ao atualizar cor', { description: err.message });
    }
  });

  const deleteCorMutation = useMutation({
    mutationFn: deleteCor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos_veiculos'] });
      toast.success('Cor removida!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao remover cor', { description: err.message });
    }
  });

  // Item mutations
  const addItemMutation = useMutation({
    mutationFn: addItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos_veiculos'] });
      toast.success('Item adicionado!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao adicionar item', { description: err.message });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: updateItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos_veiculos'] });
    },
    onError: (err: Error) => {
      toast.error('Erro ao atualizar item', { description: err.message });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos_veiculos'] });
      toast.success('Item removido!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao remover item', { description: err.message });
    }
  });

  return {
    modelos: modelos || [],
    isLoading,
    error: error as Error | null,
    
    // Modelo CRUD
    createModelo: createMutation.mutateAsync,
    updateModelo: updateMutation.mutateAsync,
    deleteModelo: deleteMutation.mutateAsync,
    
    // Cor CRUD
    addCor: addCorMutation.mutateAsync,
    updateCor: updateCorMutation.mutateAsync,
    deleteCor: deleteCorMutation.mutateAsync,
    
    // Item CRUD
    addItem: addItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutateAsync,
    deleteItem: deleteItemMutation.mutateAsync,
    
    // Utils
    fetchModeloById
  };
}

// =========================================
// Hook for single modelo
// =========================================
export function useModeloVeiculo(id: string | undefined) {
  return useQuery({
    queryKey: ['modelos_veiculos', id],
    queryFn: () => (id ? fetchModeloById(id) : null),
    enabled: !!id
  });
}
