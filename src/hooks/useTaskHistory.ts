// src/hooks/useTaskHistory.ts (VERSÃO FINAL CORRIGIDA)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Profile } from '@/types';

// O tipo base para uma entrada de histórico, extraído corretamente  
type HistoryEntry = Database['public']['Tables']['task_history']['Row'];

// --- CORREÇÃO DO TIPO: 'profiles' agora é um objeto, não um array ---
// Este tipo agora corresponde exatamente ao que o Supabase retorna.
export type TaskHistoryWithProfile = HistoryEntry & {
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

// Mapa para buscar nomes de responsáveis (assignees)
type ProfileMap = { [id: string]: Profile };

export const useTaskHistory = (taskId?: string) => {
  const [history, setHistory] = useState<TaskHistoryWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileMap, setProfileMap] = useState<ProfileMap>({});

  const fetchHistory = useCallback(async () => {
    if (!taskId) {
      setLoading(false);
      setHistory([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setProfileMap({});

      // --- CORREÇÃO DA QUERY: Usando '*' para pegar todas as colunas de 'task_history' ---
      // E mantendo a junção com 'profiles'.
      const { data, error: fetchError } = await supabase
        .from('task_history')
        .select(`
          *,
          profiles ( full_name, avatar_url )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Agora a coerção de tipo é segura e correta.
      const historyData = data as TaskHistoryWithProfile[];
      setHistory(historyData);

      // Lógica para buscar os nomes dos responsáveis mencionados (nenhuma mudança aqui)
      const assigneeIds = new Set<string>();
      historyData.forEach(entry => {
        if (entry.field_changed === 'assignee_id') {
          if (entry.old_value) assigneeIds.add(entry.old_value);
          if (entry.new_value) assigneeIds.add(entry.new_value);
        }
      });

      if (assigneeIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', Array.from(assigneeIds));

        if (profilesError) throw profilesError;

        const map: ProfileMap = {};
        if (profilesData) {
          profilesData.forEach(profile => {
            map[profile.id] = profile;
          });
        }
        setProfileMap(map);
      }

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

  return { history, loading, error, refetch: fetchHistory, profileMap };
};