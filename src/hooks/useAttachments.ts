
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Attachment } from '@/types';

export const useAttachments = (taskId?: string) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const uploadAttachment = async (file: File, taskId: string) => {
    try {
      // Upload file to Supabase Storage bucket 'attachments'
      const bucketName = 'attachments';
      const filePath = `${taskId}/${Date.now()}_${file.name}`;

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
  }, [taskId]);

  return {
    attachments,
    loading,
    error,
    uploadAttachment,
    deleteAttachment,
    refetch: fetchAttachments
  };
};
