// FASE 5.2: Hook para obter módulos do usuário
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface UserModule {
  id: string;
  name: string;
  key: string;
  description: string | null;
  icon: string;
  route: string;
  display_order: number;
}

export const useUserModules = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-modules', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .rpc('get_user_modules', { _user_id: user.id });
      
      if (error) {
        console.error('Erro ao buscar módulos do usuário:', error);
        throw error;
      }
      
      return (data || []) as UserModule[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
};
