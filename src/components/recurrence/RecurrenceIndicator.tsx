import type { TaskWithDetails } from '@/types';

interface Props {
  task: Partial<TaskWithDetails>;
}

export default function RecurrenceIndicator({ task }: Props) {
  if (!task?.is_recurring && !task?.parent_task_id) return null;

  const title = task.is_recurring ? 'Tarefa recorrente' : 'Ocorrência de série recorrente';

  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground" title={title}>
      <span>🔁</span>
      <span className="text-xs">{title}</span>
    </span>
  );
}
