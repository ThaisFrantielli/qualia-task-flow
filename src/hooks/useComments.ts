import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Comment = Database['public']['Tables']['comments']['Row'];

export const useComments = (taskId?: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      // Recebendo data como any para contornar erros de tipagem
      const { data, error } = await supabase
        .from('comments')
        .select('id, task_id, content, author_name, created_at') // Usando string
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Verificação básica e asserção de tipo antes de atualizar o estado
      if (Array.isArray(data) && data.every(item => typeof item === 'object' && item !== null && 'id' in item && 'task_id' in item && 'content' in item && 'author_name' in item && 'created_at' in item)) {
          setComments(data as Comment[] || []);
      } else if (data === null) {
          setComments([]);
      } else {
          console.error('Unexpected data format from Supabase fetch:', data);
          setError('Formato de dados inesperado ao carregar comentários');
      }

    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar comentários');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const addComment = async (content: string, authorName: string) => {
    if (!taskId) return;
    console.log('Attempting to add comment...', { taskId, content, authorName });
    
    try {
      // Recebendo data como any para contornar erros de tipagem
      const { data, error } = await supabase
        .from('comments')
        .insert({
          task_id: taskId,
          content,
          author_name: authorName
        })
        .select('id, task_id, content, author_name, created_at') // Usando string
        .single();

      console.log('Supabase insert response:', { data, error });

      if (error) {
        throw error;
      }

      // Verificação básica e asserção de tipo antes de adicionar ao estado local
      if (data && typeof data === 'object' && data !== null && 'id' in data && 'task_id' in data && 'content' in data && 'author_name' in data && 'created_at' in data) {
          console.log('Adding comment to local state...', data);
          setComments(currentComments => [...currentComments, data as Comment]); // Asserção aqui
      } else if (data === null) {
          console.warn('Supabase insert successful but returned no data.');
      } else {
           console.error('Unexpected data format from Supabase insert:', data);
           setError('Formato de dados inesperado ao adicionar comentário');
      }

    } catch (err: any) {
      console.error('Error adding comment:', err);
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
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir comentário');
    }
  };

  useEffect(() => {
    fetchComments();
  }, [fetchComments, taskId]);

  // TODO: Implementar Realtime Subscription para atualizações em tempo real
  // useEffect(() => {
  //   const subscription = supabase
  //     .from('comments')
  //     .on('INSERT', payload => {
  //       if (payload.new.task_id === taskId) {
  //         setComments(currentComments => [...currentComments, payload.new as Comment]);
  //       }
  //     })
  //     .on('DELETE', payload => {
  //       if (payload.old.task_id === taskId) {
  //          setComments(currentComments => currentComments.filter(comment => comment.id !== payload.old.id));
  //       }
  //     })
  //     .subscribe();
  //
  //   return () => { subscription.unsubscribe(); };
  // }, [taskId]);

  return {
    comments,
    loading,
    error,
    addComment,
    deleteComment,
    refetch: fetchComments
  };
};
