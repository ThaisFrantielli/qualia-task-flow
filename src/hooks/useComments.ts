
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Comment = Database['public']['Tables']['comments']['Row'];

export const useComments = (taskId?: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar comentários');
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (content: string, authorName: string) => {
    if (!taskId) return;
    
    try {
      const { error } = await supabase
        .from('comments')
        .insert({ 
          task_id: taskId, 
          content, 
          author_name: authorName 
        });

      if (error) throw error;
      await fetchComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar comentário');
    }
  };

  const deleteComment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir comentário');
    }
  };

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  return {
    comments,
    loading,
    error,
    addComment,
    deleteComment,
    refetch: fetchComments
  };
};
