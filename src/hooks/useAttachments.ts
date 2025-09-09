
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

      if (error) throw error;
      setAttachments(data?.map(attachment => ({
        ...attachment,
        content_type: 'application/octet-stream',
        uploaded_by: 'system',
        file_size: attachment.file_size || 0
      })) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar anexos');
    } finally {
      setLoading(false);
    }
  };

  const uploadAttachment = async (file: File, taskId: string) => {
    try {
      // For now, we'll just store the file info in the database
      // In a real implementation, you'd upload to Supabase Storage first
      const { error } = await supabase
        .from('attachments')
        .insert({
          task_id: taskId,
          filename: file.name,
          file_path: `uploads/${file.name}`, // Placeholder path
          file_size: file.size
        });

      if (error) throw error;
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

      if (error) throw error;
      await fetchAttachments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir anexo');
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
