// src/hooks/useTasks.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Task } from '@/types'; // Use nosso tipo centralizado

// O hook useTasks completo e revisado
export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar todas as tarefas do usuário logado
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(*)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTasks(data as Task[] || []);
    } catch (err: any) {
      console.error("Erro ao buscar tarefas:", err);
      setError("Não foi possível carregar as tarefas.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Busca as tarefas quando o hook é usado pela primeira vez
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

  // Funções para arquivar e deletar (placeholder)
  const archiveTask = async (taskId: string) => { console.log(`Arquivando ${taskId}`); };
  const deleteTask = async (taskId: string) => { console.log(`Deletando ${taskId}`); };

  // Retorna todos os valores e funções que os componentes podem usar
  return {
    tasks,
    loading,
    error,
    updateTaskStatus,
    archiveTask,
    deleteTask,
    refetch: fetchTasks,
    updateTask // <-- Exportando a nova função
  };
};