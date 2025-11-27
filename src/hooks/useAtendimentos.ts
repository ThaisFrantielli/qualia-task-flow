// src/hooks/useAtendimentos.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AtendimentoComAssignee } from '@/types';

export function useAtendimentos() {
  const [atendimentos, setAtendimentos] = useState<AtendimentoComAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchAtendimentos = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('atendimentos')
        .select(`
          *,
          assignee:profiles (id, full_name, avatar_url),
          cliente:clientes (id, nome_fantasia, razao_social)
        `);

      if (queryError) {
        throw queryError;
      }

      if (data) {
        setAtendimentos(data as AtendimentoComAssignee[]);
      }

    } catch (err) {
      setError(err);
      console.error("Erro ao buscar atendimentos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAtendimentos();
  }, [fetchAtendimentos]);

  return { atendimentos, loading, error, refresh: fetchAtendimentos };
}