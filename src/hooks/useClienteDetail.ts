// src/hooks/useClienteDetail.ts (NOVO ARQUIVO)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Cliente, Atendimento, Task } from '@/types';

interface ClienteDetail {
  atendimentos: Atendimento[];
  tarefas: Task[];
}

interface UseClienteDetailReturn {
  detalhes: ClienteDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useClienteDetail = (cliente: Cliente | null): UseClienteDetailReturn => {
  const [detalhes, setDetalhes] = useState<ClienteDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetalhes = useCallback(async () => {
    if (!cliente) {
      setDetalhes(null);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const nomeCliente = cliente.razao_social || cliente.nome_fantasia;
      if (!nomeCliente) {
        setDetalhes({ atendimentos: [], tarefas: [] });
        setLoading(false);
        return;
      }

      const { data: atendimentosData, error: atendimentosError } = await supabase
        .from('atendimentos')
        .select('*')
        .eq('client_name', nomeCliente)
        .order('created_at', { ascending: false });

      if (atendimentosError) throw atendimentosError;

      const idsAtendimentos = (atendimentosData || []).map(at => at.id);
      
      let tarefasData: Task[] = [];
      if (idsAtendimentos.length > 0) {
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('atendimento_id', idsAtendimentos);

        if (tasksError) throw tasksError;
        tarefasData = tasks || [];
      }

      setDetalhes({
        atendimentos: atendimentosData || [],
        tarefas: tarefasData,
      });

    } catch (e: any) {
      console.error("Erro ao buscar detalhes do cliente:", e);
      setError(e.message);
      setDetalhes(null);
    } finally {
      setLoading(false);
    }
  }, [cliente]);

  useEffect(() => {
    fetchDetalhes();
  }, [fetchDetalhes]);

  return { detalhes, loading, error, refetch: fetchDetalhes };
};