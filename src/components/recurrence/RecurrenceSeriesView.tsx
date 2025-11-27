import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TaskWithDetails } from '@/types';

interface Props {
  parentTaskId: string;
}

export default function RecurrenceSeriesView({ parentTaskId }: Props) {
  const [items, setItems] = useState<TaskWithDetails[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!parentTaskId) return;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('parent_task_id', parentTaskId)
          .order('due_date', { ascending: true });
        if (error) {
          console.error('Erro buscando série de recorrência', error);
          setItems([]);
        } else {
          setItems(data as TaskWithDetails[]);
        }
      } catch (err) {
        console.error('Erro desconhecido buscando série de recorrência', err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [parentTaskId]);

  if (!parentTaskId) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Série de recorrência</h3>
      {loading && <div>Carregando...</div>}
      {!loading && !items && <div>Nenhuma ocorrência encontrada</div>}
      <ul>
        {items?.map(i => (
          <li key={i.id} className="py-1 border-b">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{i.title}</div>
                <div className="text-xs text-muted-foreground">{i.due_date}</div>
              </div>
              <div className="text-sm">{i.status}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
