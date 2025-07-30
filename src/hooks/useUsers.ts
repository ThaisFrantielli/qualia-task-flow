// src/hooks/useUsers.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UserProfile } from '@/types'; // Usando o tipo UserProfile que definimos

export const useUsers = () => {
  // 1. INICIE O ESTADO COM UM ARRAY VAZIO
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('profiles') // Sua tabela de perfis/usuários
        .select('*')
        .order('full_name', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);
      
      // 2. SE 'data' FOR NULO, setUsers VAI RECEBER UM ARRAY VAZIO
      setUsers(data || []);

    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
      setError(`Erro ao buscar usuários: ${err.message}`);
      setUsers([]); // 3. EM CASO DE ERRO, TAMBÉM GARANTA UM ARRAY VAZIO
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
};