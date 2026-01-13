
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Attachment } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export const useAttachments = (taskId?: string) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [canModify, setCanModify] = useState<boolean>(false);

  const fetchAttachments = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (error) {
        if (/RLS|policy|permission|forbidden/i.test(error.message || '')) {
          setError('Você não tem permissão para realizar esta ação');
          setAttachments([]);
          return;
        }
        throw error;
      }
      setAttachments(data?.map(attachment => ({
        ...attachment,
        content_type: 'application/octet-stream',
        uploaded_by: 'system',
        file_size: attachment.file_size || 0
      })) || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || 'Erro ao carregar anexos');
      if (/RLS|policy|permission|forbidden|403/i.test(msg)) {
        setError('Você não tem permissão para realizar esta ação');
      } else {
        setError(msg || 'Erro ao carregar anexos');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    if (!taskId) return setCanModify(false);
    try {
      // fetch task basic info
      const { data: taskData, error: taskErr } = await supabase.from('tasks').select('id, assignee_id, user_id').eq('id', taskId).single();
      if (taskErr) {
        // if permission error, assume cannot modify
        return setCanModify(false);
      }

      // Admin or creator or assignee
      if (!user) return setCanModify(false);
      if (user.isAdmin) return setCanModify(true);
      if (taskData) {
        if (taskData.assignee_id === user.id) return setCanModify(true);
        if (taskData.user_id === user.id) return setCanModify(true);
      }

      // check task_delegations for co-responsible entries for this user
      const { data: delegations, error: delErr } = await supabase.from('task_delegations').select('id,status,delegated_to_id,delegated_at').eq('task_id', taskId).eq('delegated_to_id', user.id);
      if (delErr) return setCanModify(false);
      if (Array.isArray(delegations) && delegations.length > 0) {
        // if exists any delegation with status containing 'co' or 'co_responsible' or 'temporary_co' -> allow
        const hasCo = delegations.some((d: any) => (d.status || '').toString().toLowerCase().includes('co'));
        if (hasCo) return setCanModify(true);
      }

      setCanModify(false);
    } catch (e) {
      setCanModify(false);
    }
  };

  const uploadAttachment = async (file: File, taskId: string) => {
    try {
      // permission guard (frontend): only allow if user can modify
      if (!canModify) {
        setError('Você não tem permissão para adicionar anexos nesta tarefa');
        return;
      }
      // Upload file to Supabase Storage bucket 'ticket-attachments'
      const bucketName = 'ticket-attachments';
      // Sanitiza o nome do arquivo removendo espaços e caracteres especiais
      const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
      // Mantém o prefixo 'tasks/' para compatibilidade com políticas RLS existentes
      const filePath = `tasks/${taskId}/${Date.now()}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Get public URL (assumes the bucket is public). If bucket is private,
      // consider creating a signed URL on the server instead.
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl || `/${filePath}`;

      const { error } = await supabase
        .from('attachments')
        .insert({
          task_id: taskId,
          filename: file.name,
          file_path: publicUrl,
          file_size: file.size
        });
      if (error) {
        if (/RLS|policy|permission|forbidden/i.test(error.message || '')) {
          setError('Você não tem permissão para realizar esta ação');
          return;
        }
        throw error;
      }

      await fetchAttachments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload do anexo');
    }
  };

  const deleteAttachment = async (id: string) => {
    try {
      if (!canModify) {
        setError('Você não tem permissão para excluir anexos nesta tarefa');
        return;
      }
      // Antes de apagar o registro, tente remover o arquivo do bucket de storage
      const bucketName = 'ticket-attachments';
      try {
        const { data: row, error: rowErr } = await supabase.from('attachments').select('file_path').eq('id', id).single();
        if (!rowErr && row && row.file_path) {
          let storagePath: string | null = null;
          const fp: string = row.file_path;
          // Supabase public URL padrão: /storage/v1/object/public/<bucket>/<path>
          const publicToken = `/object/public/${bucketName}/`;
          const idx = fp.indexOf(publicToken);
          if (idx !== -1) {
            storagePath = fp.substring(idx + publicToken.length);
          } else if (fp.startsWith('/')) {
            storagePath = fp.replace(/^\//, '');
          } else if (fp.includes(bucketName)) {
            // tentar extrair depois do bucketName/
            const after = fp.split(`${bucketName}/`)[1];
            storagePath = after || null;
          }

          if (storagePath) {
            const { error: removeError } = await supabase.storage.from(bucketName).remove([storagePath]);
            if (removeError) {
              // não falhar totalmente se remoção do storage falhar; só logar
              console.error('Erro ao remover arquivo do storage:', removeError.message || removeError);
            }
          }
        }
      } catch (e) {
        // se falhar ao buscar/remover do storage, apenas logamos e continuamos para tentar remover o registro
        console.error('Erro ao tentar remover arquivo do storage (ignorando):', e);
      }

      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', id);
      if (error) {
        if (/RLS|policy|permission|forbidden/i.test(error.message || '')) {
          setError('Você não tem permissão para realizar esta ação');
          return;
        }
        throw error;
      }
      await fetchAttachments();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || 'Erro ao excluir anexo');
      if (/RLS|policy|permission|forbidden|403/i.test(msg)) {
        setError('Você não tem permissão para realizar esta ação');
      } else {
        setError(msg || 'Erro ao excluir anexo');
      }
    }
  };

  useEffect(() => {
    fetchAttachments();
    fetchPermissions();
  }, [taskId]);

  return {
    attachments,
    loading,
    error,
    uploadAttachment,
    deleteAttachment,
    refetch: fetchAttachments
    , canModify
  };
};
