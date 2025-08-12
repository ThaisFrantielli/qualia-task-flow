// src/hooks/useComments.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Comment } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export const useComments = (taskId?: string) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CORREÇÃO 1: A função de busca agora está dentro do useEffect ou é um useCallback
  // estável que só depende de 'taskId'.
  const fetchComments = useCallback(async () => {
    // Guarda de segurança: se não houver taskId, não faz nada e para de carregar.
    if (!taskId) {
      setComments([]);
      setLoading(false);
      return;
    }

    // Inicia o carregamento
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
        
      if (fetchError) throw fetchError;
      
      setComments(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar comentários:", err);
      setError(err.message || 'Falha ao carregar comentários');
    } finally {
      // Finaliza o carregamento, independentemente de sucesso ou erro
      setLoading(false);
    }
  }, [taskId]); // A função só será recriada se o taskId mudar.

  const addComment = async (content: string, authorName: string) => {
    if (!taskId || !user?.id) {
      throw new Error("Usuário não autenticado ou tarefa inválida.");
    }
    
    try {
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert({
          task_id: taskId,
          content: content,
          author_name: authorName,
          user_id: user.id
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      if (data) {
        // Atualiza o estado local para feedback instantâneo
        setComments(current => [...current, data as Comment]);
      }
    } catch (err: any) {
      console.error('Error adding comment:', err);
      throw err;
    }
  };

  const deleteComment = async (id: string) => {
    try {
      const { error: deleteError } = await supabase.from('comments').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setComments(current => current.filter(comment => comment.id !== id));
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir comentário');
    }
  };

  // CORREÇÃO 2: O useEffect agora chama a função fetchComments.
  useEffect(() => {
    fetchComments();
  }, [fetchComments]); // Ele só vai rodar quando a função fetchComments for recriada (ou seja, quando taskId mudar).

  return { comments, loading, error, addComment, deleteComment, refetch: fetchComments };
};