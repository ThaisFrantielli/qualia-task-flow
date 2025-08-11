// src/hooks/useComments.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types';

type Comment = Database['public']['Tables']['comments']['Row'] & { author_name?: string };

export const useComments = (taskId?: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!taskId) {
      setComments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (fetchError) throw fetchError;
      setComments((data as Comment[]) || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar comentários');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // --- FUNÇÃO CORRIGIDA ---
  const addComment = async (content: string, authorName: string, userId: string) => {
    if (!taskId) return;
    try {
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert({ task_id: taskId, content, author_name: authorName, user_id: userId })
        .select()
        .single();
      
      if (insertError) throw insertError; // Lança o erro para o catch
      if (data) setComments(current => [...current, data as Comment]);

    } catch (err: any) { // 'err' é a variável correta aqui
      console.error('Error adding comment:', err);
      setError(err.message || 'Erro ao adicionar comentário');
      throw err; // Re-lança o erro para que o toast.promise possa pegá-lo
    }
  };

  // --- FUNÇÃO CORRIGIDA ---
  const deleteComment = async (id: string) => {
    try {
      const { error: deleteError } = await supabase.from('comments').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setComments(current => current.filter(comment => comment.id !== id));
    } catch (err: any) { // 'err' é a variável correta aqui
      setError(err.message || 'Erro ao excluir comentário');
    }
  };

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return { comments, loading, error, addComment, deleteComment, refetch: fetchComments };
};