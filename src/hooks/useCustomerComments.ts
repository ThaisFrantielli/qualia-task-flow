import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerComment {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export function useCustomerComments(atendimentoId: string | number | null) {
  const [comments, setComments] = useState<CustomerComment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!atendimentoId) return;
    setLoading(true);
    supabase
      .from('comments')
      .select('id, content, author_name, created_at')
      .eq('task_id', String(atendimentoId))
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setComments(data || []);
        setLoading(false);
      });
  }, [atendimentoId]);

  return { comments, loading };
}
