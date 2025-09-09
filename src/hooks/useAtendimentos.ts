// src/hooks/useAtendimentos.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AtendimentoComAssignee } from '@/types';

export const useAtendimentos = () => {
  const [atendimentos, setAtendimentos] = useState<AtendimentoComAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAtendimentos = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('atendimentos')
      .select('*, assignee:profiles(*)')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      const formattedData: AtendimentoComAssignee[] = data.map(at => ({
        ...at,
        assignee: at.assignee,
        cliente: {
          nome: at.client_name,
        },
        descricao: at.summary,
      }));
      setAtendimentos(formattedData);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAtendimentos();
  }, [fetchAtendimentos]);

  return {
    atendimentos,
    setAtendimentos,
    loading,
    error,
    refetch: fetchAtendimentos,
  };
};