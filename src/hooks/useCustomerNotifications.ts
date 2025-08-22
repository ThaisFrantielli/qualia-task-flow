import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export function useCustomerNotifications(atendimentoId: string | number | null) {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!atendimentoId) return;
    setLoading(true);
    supabase
      .from('notifications')
      .select('id, title, message, created_at, read')
      .eq('task_id', String(atendimentoId))
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setNotifications(data || []);
        setLoading(false);
      });
  }, [atendimentoId]);

  return { notifications, loading };
}
