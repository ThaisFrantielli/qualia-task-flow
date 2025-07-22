// src/hooks/useTasks.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Task } from '@/types'; // Use nosso tipo centralizado

// O hook useTasks completo e revisado
export const useTasks = (periodFilter: string = 'all', archiveStatusFilter: 'active' | 'archived' | 'all' = 'active') => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar todas as tarefas do usuário logado com filtro de período e arquivamento
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('tasks')
        .select(`
          *,
          project:projects(*)
        `);

      // --- Lógica para aplicar o filtro de período ---
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Início do dia

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const startOfYear = new Date(today.getFullYear(), 0, 1);


      switch (periodFilter) {
        case 'today':
          query = query.gte('due_date', today.toISOString()).lt('due_date', tomorrow.toISOString());
          break;
        case 'week':
           query = query.gte('due_date', startOfWeek.toISOString()).lt('due_date', tomorrow.toISOString());
          break;
        case 'month':
           query = query.gte('due_date', startOfMonth.toISOString()).lt('due_date', tomorrow.toISOString());
          break;
        case 'year':
           query = query.gte('due_date', startOfYear.toISOString()).lt('due_date', tomorrow.toISOString());
           break;
        case 'overdue':
             query = query.lt('due_date', today.toISOString()).neq('status', 'done'); // Tarefas vencidas e não concluídas
             break;
        case 'all':
        default:
          // Sem filtro de data
          break;
      }
       // --- Fim da lógica de filtro de período ---

      // --- NOVA Lógica para aplicar o filtro de arquivamento ---
      if (archiveStatusFilter === 'active') {
        query = query.eq('archived', false);
      } else if (archiveStatusFilter === 'archived') {
        query = query.eq('archived', true);
      }
      // Se archiveStatusFilter for 'all', não adicionamos filtro de arquivamento
      // --- Fim da NOVA Lógica de filtro de arquivamento ---

      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTasks(data as Task[] || []);
    } catch (err: any) {
      console.error("Erro ao buscar tarefas:", err);
      setError("Não foi possível carregar as tarefas.");
    } finally {
      setLoading(false);
    }
  }, [periodFilter, archiveStatusFilter]); // Adicionar archiveStatusFilter às dependências

  // Busca as tarefas quando o hook é usado pela primeira vez ou o filtro muda
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Função para atualizar o status de uma tarefa
  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

    if (error) throw error;
    fetchTasks(); // Recarrega a lista
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    // Opcional: Exibir um toast de erro aqui também, se necessário
    // setError("Não foi possível atualizar o status.");
    throw err;
  }
};

  // --- NOVA FUNÇÃO PARA ATUALIZAÇÃO GENÉRICA ---
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
        const { data, error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', taskId)
          .select()
          .single();

        if (error) throw error;

        // Atualiza a lista de tarefas no estado local para refletir a mudança instantaneamente
        setTasks(currentTasks => currentTasks.map(t => t.id === taskId ? data : t));

        return data;
      } catch (error) {
        console.error("Erro ao atualizar tarefa:", error);
        throw error;
      }
  };

  // Função para arquivar uma tarefa (Implementação real)
  const archiveTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ archived: true })
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks(); // Recarrega a lista

    } catch (err) {
      console.error("Erro ao arquivar tarefa:", err);
      setError("Não foi possível arquivar a tarefa.");
      throw err;
    }
  };

  // Função para deletar uma tarefa (Implementação real)
  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()}
    .eq('id', taskId);

      if (error) throw error;
      fetchTasks(); // Recarrega a lista

    } catch (err) {
      console.error("Erro ao excluir tarefa:", err); // Corrigida a aspa simples
      setError("Não foi possível excluir a tarefa.");
      throw err;
    }
  };

  // Retorna todos os valores e funções que os componentes podem usar
  return {
    tasks,
    loading,
    error,
    updateTaskStatus,
    archiveTask,
    deleteTask,
    refetch: fetchTasks,
    updateTask
  };
;
