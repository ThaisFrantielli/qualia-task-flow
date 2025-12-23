import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PricingParameters } from '@/types/proposta';

// =========================================
// Fetch active pricing parameters
// =========================================
const fetchPricingParameters = async (): Promise<PricingParameters | null> => {
  const { data, error } = await supabase
    .from('pricing_parameters')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data as PricingParameters | null;
};

// =========================================
// Update pricing parameters
// =========================================
const updatePricingParameters = async (data: Partial<PricingParameters>): Promise<PricingParameters> => {
  const { id, ...params } = data;

  if (id) {
    // Update existing
    const { data: updated, error } = await supabase
      .from('pricing_parameters')
      .update(params)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updated as PricingParameters;
  } else {
    // Create new (shouldn't happen normally)
    const { data: created, error } = await supabase
      .from('pricing_parameters')
      .insert(params)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return created as PricingParameters;
  }
};

// =========================================
// Main Hook
// =========================================
export function usePricingParameters() {
  const queryClient = useQueryClient();

  const { data: parameters, isLoading, error } = useQuery({
    queryKey: ['pricing_parameters'],
    queryFn: fetchPricingParameters
  });

  const updateMutation = useMutation({
    mutationFn: updatePricingParameters,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing_parameters'] });
      toast.success('Parâmetros atualizados!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao atualizar parâmetros', { description: err.message });
    }
  });

  // Default parameters if none exist
  const defaultParameters: PricingParameters = {
    id: '',
    taxa_financiamento: 0.0117,
    taxa_sinistro: 0.01,
    taxa_impostos: 0.06,
    taxa_custo_administrativo: 0.08,
    taxa_comissao_comercial: 0.005,
    taxa_depreciacao_anual: 0.10,
    taxa_ipva_anual: 0.01,
    custo_manutencao_por_km: 0.12,
    preco_combustivel_litro: 6.01,
    consumo_medio_km_litro: 12.3,
    km_mensal_padrao: 3000,
    custo_lavagem_mensal: 200,
    custo_telemetria_mensal: 47.50,
    custo_emplacamento: 160,
    custo_licenciamento: 80,
    multa_0_12_meses: 0.40,
    multa_13_24_meses: 0.25,
    multa_25_36_meses: 0.20,
    multa_37_48_meses: 0.15,
    participacao_perda_parcial: 0.10,
    participacao_perda_total: 0.20,
    created_at: '',
    updated_at: '',
    is_active: true
  };

  return {
    parameters: parameters || defaultParameters,
    isLoading,
    error: error as Error | null,
    updateParameters: updateMutation.mutateAsync
  };
}
