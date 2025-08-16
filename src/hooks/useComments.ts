// src/hooks/useComments.ts (VERSÃO COM DEPURAÇÃO E VALIDAÇÃO)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      setComments(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar comentários:", err);
      setError(err.message || 'Falha ao carregar comentários');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const addComment = async (content: string, authorName: string, userId: string) => {
    // --- PASSO DE DEPURAÇÃO CRÍTICO ---
    console.log('--- DADOS RECEBIDOS ANTES DE INSERIR O COMENTÁRIO ---');
    console.log('Task ID:', taskId);
    console.log('User ID Recebido:', userId);
    console.log('Tipo do User ID:', typeof userId);
    
    // --- VALIDAÇÃO ROBUSTA ---
    if (!taskId) {
      throw new Error("ID da tarefa está faltando. Não é possível adicionar comentário.");
    }

    // Regex para validar o formato de um UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (typeof userId !== 'string' || !uuidRegex.test(userId)) {
      console.error('!!! VALIDAÇÃO FALHOU !!!');
      console.error(`O valor "${userId}" fornecido para user_id NÃO é um UUID válido.`);
      throw new Error(`ID de usuário inválido. Verifique o console para mais detalhes.`);
    }

    // Se a validação passar, tentamos inserir no banco.
    try {
      const commentData = {
        task_id: taskId,
        content: content,
        author_name: authorName,
        user_id: userId
      };

      console.log('Objeto que será inserido:', commentData);

      const { data, error: insertError } = await supabase
        .from('comments')
        .insert(commentData)
        .select()
        .single();
      
      if (insertError) throw insertError;
      
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