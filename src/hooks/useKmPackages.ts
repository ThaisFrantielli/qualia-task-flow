import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KmPackage {
  id: string;
  nome: string;
  descricao: string | null;
  km_mensal: number;
  is_ilimitado: boolean;
  valor_km_adicional: number;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const fetchKmPackages = async (): Promise<KmPackage[]> => {
  const { data, error } = await supabase
    .from('km_packages')
    .select('*')
    .eq('ativo', true)
    .order('ordem');

  if (error) throw new Error(error.message);
  return (data || []) as KmPackage[];
};

export function useKmPackages() {
  return useQuery({
    queryKey: ['km-packages'],
    queryFn: fetchKmPackages,
  });
}
