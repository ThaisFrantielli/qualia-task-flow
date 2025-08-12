// src/hooks/useTaskHistory.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types';

// O tipo base para uma entrada de histórico
type HistoryEntry = Database['public']['Tables']['task_history']['Row'];

// Nosso novo tipo, que define a forma exata do que receberemos da query
export type TaskHistoryWithProfile = HistoryEntry & {
  // A propriedade 'profiles' será um objeto ou nulo
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export const useTaskHistory = (taskId?: string) => {
  const [history, setHistory] = useState<TaskHistoryWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!taskId) {
      setLoading(false);
      setHistory([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // --- A NOVA QUERY EXPLÍCITA ---
      // Dizemos exatamente como juntar as tabelas.
      const { data, error: fetchError } = await supabase
        .from('task_history')
        .select(`
          id, 
          created_at, 
          action, 
          field_changed, 
          old_value, 
          new_value,
          profiles ( full_name, avatar_url )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        // Se a query explícita ainda der erro, o problema é na definição da FK no DB
        if (fetchError.message.includes("relation")) {
            console.error("ERRO DE RELAÇÃO NO SUPABASE. Verifique a Foreign Key 'user_id' na tabela 'task_history' apontando para 'profiles(id)'.");
            throw new Error("Relação entre tabelas não encontrada no banco de dados.");
        }
        throw fetchError;
      }

      // O TypeScript pode reclamar aqui porque não sabe que 'data' agora
      // corresponde a TaskHistoryWithProfile. Fazemos uma coerção de tipo explícita.
      setHistory(data as TaskHistoryWithProfile[]);

    } catch (err: any) {
      console.error("Erro ao buscar histórico da tarefa:", err);
      setError('Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
};