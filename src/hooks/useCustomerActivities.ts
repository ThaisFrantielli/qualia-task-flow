import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerActivity {
  id: string;
  label: string;
  date: string;
  done: boolean;
}

export function useCustomerActivities(atendimentoId: string | number | null) {
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!atendimentoId) return;
    setLoading(true);
    supabase
      .from('calendar_events')
      .select('id, title, start_date')
      .eq('task_id', String(atendimentoId))
      .then(({ data }) => {
        setActivities(
          (data || []).map((a) => ({
            id: a.id,
            label: a.title,
            date: a.start_date,
            done: false // ajuste conforme status real
          }))
        );
        setLoading(false);
      });
  }, [atendimentoId]);

  return { activities, loading };
}
