// src/hooks/useUsers.ts - Versão mais robusta

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UserProfile } from '@/types';

export const useUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar se supabase está disponível
      if (!supabase) {
        throw new Error('Supabase client não inicializado');
      }
      
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (fetchError) {
        console.error('Erro do Supabase:', fetchError);
        throw new Error(fetchError.message);
      }
      
      // Garantir que data é um array válido
      if (!data) {
        console.warn('Dados de usuários retornaram null');
        setUsers([]);
      } else if (!Array.isArray(data)) {
        console.warn('Dados de usuários não são um array:', data);
        setUsers([]);
      } else {
        setUsers(data);
      }

    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
      const errorMessage = err?.message || 'Erro desconhecido ao buscar usuários';
      setError(errorMessage);
      setUsers([]); // Sempre garantir array vazio em caso de erro
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Adicionar um pequeno delay para evitar problemas de inicialização
    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [fetchUsers]);

  // Retornar valores sempre válidos
  return {
    users: Array.isArray(users) ? users : [],
    loading: Boolean(loading),
    error: error || null,
    refetch: fetchUsers,
  };
};