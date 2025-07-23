// src/hooks/useTasks.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Task } from '@/types';
import { useAuth } from '@/contexts/AuthContext'; // Assumindo que você tem um hook de autenticação

// O hook useTasks completo e revisado com novos filtros
export const useTasks = (
  periodFilter: string = 'all',
  archiveStatusFilter: 'active' | 'archived' | 'all' = 'active',
  myTasksFilter: boolean = false, // Novo parâmetro
  recentlyCompletedFilter: boolean = false, // Novo parâmetro
  delegatedByMeFilter: boolean = false // Novo parâmetro
) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Obter o usuário logado (ajuste se o nome do hook for diferente)

  // Função para buscar todas as tarefas com filtros
  const fetchTasks = useCallback(async () => {
    if (!user) { // Não busca tarefas se o usuário não estiver logado
      setTasks([]);
      setLoading(false);
      return;
    }

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
          // Sem filtro de data específico por período
          break;
      }
       // --- Fim da lógica de filtro de período ---

      // --- Lógica para aplicar o filtro de arquivamento ---
      if (archiveStatusFilter === 'active') {
        query = query.eq('archived', false);
      } else if (archiveStatusFilter === 'archived') {
        query = query.eq('archived', true);
      }
      // Se archiveStatusFilter for 'all', não adicionamos filtro de arquivamento
      // --- Fim da Lógica de filtro de arquivamento ---

      // --- NOVA Lógica para aplicar os filtros adicionais ---

      // Filtro "Tarefas minhas"
      if (myTasksFilter && user?.id) {
        query = query.eq('assignee_id', user.id);
      }

      // Filtro "Concluídas recentemente"
      if (recentlyCompletedFilter) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.eq('status', 'done').gte('updated_at', sevenDaysAgo.toISOString()); // Assumindo que updated_at muda ao concluir
      }

      // Filtro "Delegadas por mim"
      if (delegatedByMeFilter && user?.id) {
         // Usando delegated_by conforme verificado em types/index.ts
         query = query.eq('delegated_by', user.id);
      }

      // --- Fim da NOVA Lógica de filtros adicionais ---


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
  }, [periodFilter, archiveStatusFilter, myTasksFilter, recentlyCompletedFilter, delegatedByMeFilter, user]); // Adicionado novos filtros e user às dependências

  // Busca as tarefas quando o hook é usado pela primeira vez ou um filtro muda
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]); // A dependência é fetchTasks, que já reage às mudanças dos filtros

  // Função para atualizar o status de uma tarefa
  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status, updated_at: new Date().toISOString() }) // Atualiza updated_at
        .eq('id', taskId);

    if (error) throw error;
    fetchTasks(); // Recarrega a lista
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    throw err;
  }
};

  // Função para atualização genérica (mantida)
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
        // Garante que updated_at seja atualizado em qualquer modificação
        const updatesWithTimestamp = { ...updates, updated_at: new Date().toISOString() };

        const { data, error } = await supabase
          .from('tasks')
          .update(updatesWithTimestamp)
          .eq('id', taskId)
          .select()
          .single();

        if (error) throw error;

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
        .update({ archived: true, updated_at: new Date().toISOString() }) // Atualiza updated_at
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
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks(); // Recarrega a lista

    } catch (err) {
      console.error("Erro ao excluir tarefa:", err);
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
};