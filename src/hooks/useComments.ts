// src/hooks/useComments.ts (VERSÃO COM DEPURAÇÃO E VALIDAÇÃO)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sendPushNotificationFCM } from '@/lib/sendPushNotificationFCM';
import type { Comment } from '@/types';

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
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (fetchError) throw fetchError;
      // Garante que todos os comentários tenham o campo 'updated_at' para satisfazer o tipo Comment
      const commentsWithUpdatedAt = (data || []).map((c: any) => ({
        ...c,
        updated_at: c.updated_at ?? c.created_at ?? null
      }));
      setComments(commentsWithUpdatedAt);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar comentários');
    } finally {
      setLoading(false);
    }
  }, [taskId]);
  const addComment = async (
    content: string,
    authorName: string,
    userId: string,
    contextType: 'task' | 'pos_venda',
    contextId?: string
  ) => {
    try {
      const commentData = {
        task_id: taskId!,
        content,
        author_name: authorName,
        user_id: userId
      };

      // 1. Inserir comentário
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert(commentData)
        .select()
        .single();
      if (insertError) throw insertError;

      // 2. Detectar menções no conteúdo e inserir em comment_mentions + notifications
      if (data && data.id && typeof content === 'string') {
        // Regex para @menções (ex: @Melissa)
        const mentionRegex = /@([\w\-.]+)/g;
        const mentions = Array.from(content.matchAll(mentionRegex)).map(m => m[1]);
        if (mentions.length > 0) {
          // Buscar usuários mencionados pelo nome (ajuste se necessário para buscar por username/email)
          const { data: users } = await supabase
            .from('profiles')
            .select('id, full_name, push_token')
            .in('full_name', mentions);
          if (users && users.length > 0) {
            // 2.1. Persistir menções com contexto
            const mentionsToInsert = users.map((u: { id: string; full_name: string | null; push_token?: string | null }) => ({
              comment_id: data.id,
              mentioned_user: u.id,
              context_type: contextType,
              context_id: contextId || taskId
            }));
            await supabase.from('comment_mentions').insert(mentionsToInsert);

            // 2.2. Criar notificação para cada usuário mencionado
            const notificationInserts = users.map((u: { id: string; full_name: string | null; push_token?: string | null }) => ({
              user_id: u.id,
              title: 'Você foi mencionado',
              message: `${authorName} mencionou você em um comentário${contextType === 'pos_venda' ? ' no Pós-Vendas' : ' na tarefa'}.`,
              type: 'mention',
              task_id: contextType === 'task' ? (contextId || taskId) : null,
              data: {
                comment_id: data.id,
                context_type: contextType,
                context_id: contextId || taskId
              },
              read: false
            }));
            await supabase.from('notifications').insert(notificationInserts);

            // 2.3. Disparar push notification
            for (const u of users as Array<{ id: string; full_name: string | null; push_token?: string | null }>) {
              if (u.push_token) {
                try {
                  await sendPushNotificationFCM(
                    u.push_token,
                    'Você foi mencionado',
                    `${authorName} mencionou você em um comentário${contextType === 'pos_venda' ? ' no Pós-Vendas' : ' na tarefa'}.`,
                    {
                      comment_id: data.id,
                      context_type: contextType,
                      context_id: contextId || taskId
                    }
                  );
                } catch (e) {
                  // Falha ao enviar push, ignora
                }
              }
            }
          }
        }
      }

      if (data) {
        setComments(current => [...current, data as Comment]);
      }
    } catch (err: any) {
      console.error('Erro do Supabase ao tentar inserir:', err);
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

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return { comments, loading, error, addComment, deleteComment, refetch: fetchComments };
};