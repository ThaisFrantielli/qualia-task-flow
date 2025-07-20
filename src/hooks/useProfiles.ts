// src/hooks/useProfiles.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
// IMPORTANTE: Importamos o tipo 'Profile' do nosso arquivo de tipos centralizado
import type { Profile } from '@/types'; 

export const useProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;

      // Garantimos que 'data' seja do tipo 'Profile[]' antes de setar o estado
      setProfiles(data as Profile[] || []);
    } catch (error) {
      console.error("Erro ao buscar perfis de usuários:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return { profiles, loading, refetch: fetchProfiles };
};