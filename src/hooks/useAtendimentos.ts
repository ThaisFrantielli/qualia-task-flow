// src/hooks/useAtendimentos.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Atendimento } from '@/types';

export const useAtendimentos = () => {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAtendimentos = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('atendimentos')
      .select('*, assignee:profiles(full_name)')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      // Mapeia os dados do JOIN para o formato plano que usamos
      const formattedData = data.map(at => ({
        ...at,
        assignee_name: at.assignee?.full_name,
      }));
      setAtendimentos(formattedData as unknown as Atendimento[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAtendimentos();
  }, [fetchAtendimentos]);

  // A CORREÇÃO PRINCIPAL ESTÁ AQUI: RETORNAR setAtendimentos
  return {
    atendimentos,
    setAtendimentos, // <-- Adicionado!
    loading,
    error,
    refetch: fetchAtendimentos,
  };
};