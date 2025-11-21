import React, { useState, useEffect } from 'react';
import { useSubtasks } from '@/hooks/useSubtasks';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfiles } from '@/hooks/useProfiles';
import { getInitials } from '@/lib/utils';
import { formatDateSafe } from '@/lib/dateUtils';
import { toast } from 'sonner';

interface SubtasksCascadeProps {
  taskId: string;
}

const SubtasksCascade: React.FC<SubtasksCascadeProps> = ({ taskId }) => {
  const { subtasks, isLoading, update: updateSubtask } = useSubtasks(taskId);
  const { profiles } = useProfiles();
  const [localSubtasks, setLocalSubtasks] = useState(subtasks || []);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocalSubtasks(subtasks || []);
  }, [subtasks]);

  if (isLoading) return <tr><td colSpan={4} className="pl-12 py-2 text-muted-foreground">Carregando subtarefas...</td></tr>;
  if (!subtasks || subtasks.length === 0) return null;

  return (
    <>
      {localSubtasks.map(subtask => (
        <tr key={subtask.id} className="bg-muted/20">
          <td className="pl-12 py-2 text-sm" colSpan={2}>
            <div className="flex items-center gap-2">
                <input
                type="checkbox"
                checked={!!subtask.completed}
                disabled={updatingIds.has(subtask.id)}
                onChange={async (e) => {
                  e.stopPropagation();
                  const next = !subtask.completed;
                  // optimistic update
                  setLocalSubtasks(prev => prev.map(s => s.id === subtask.id ? { ...s, completed: next } : s));
                  setUpdatingIds(prev => new Set(prev).add(subtask.id));
                  try {
                    await updateSubtask({ id: subtask.id, updates: { completed: next } as any });
                    toast.success(next ? 'Subtarefa concluída' : 'Subtarefa marcada como pendente');
                  } catch (err: any) {
                    console.error('Erro atualizando subtarefa:', err);
                    // revert
                    setLocalSubtasks(prev => prev.map(s => s.id === subtask.id ? { ...s, completed: subtask.completed } : s));
                    toast.error('Não foi possível atualizar subtarefa', { description: err?.message });
                  } finally {
                    setUpdatingIds(prev => {
                      const nextSet = new Set(prev);
                      nextSet.delete(subtask.id);
                      return nextSet;
                    });
                  }
                }}
                className="form-checkbox h-4 w-4 rounded text-primary border-gray-300 focus:ring-primary cursor-pointer"
              />
              <span className={subtask.completed ? 'line-through text-muted-foreground' : ''}>{subtask.title}</span>
              {(() => {
                const needsApproval = (subtask as any).needs_approval === true || subtask.status === 'awaiting_approval';
                const approvedAt = (subtask as any).approved_at;
                const requestedApprover = (subtask as any).requested_approver?.full_name || (subtask as any).requested_approver_name || null;
                const approvedByField = (subtask as any).approved_by?.full_name || (subtask as any).approved_by_name || (subtask as any).approved_by_id || null;
                const approvedBy = approvedByField && profiles?.find(p => p.id === approvedByField)?.full_name || approvedByField || null;
                if (needsApproval) {
                  if (requestedApprover) {
                    return (
                      <span className="ml-2 inline-block text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">Aguardando aprovação de {requestedApprover}</span>
                    );
                  }
                  return (
                    <span className="ml-2 inline-block text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">Pendente aprovação</span>
                  );
                }
                if (approvedAt) {
                  return (
                    <span className="ml-2 inline-block text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">Aprovado por {approvedBy ?? '—'} • {formatDateSafe(approvedAt, 'dd/MM/yyyy HH:mm')}</span>
                  );
                }
                return null;
              })()}
            </div>
          </td>
          <td className="py-2">
            <div className="flex items-center gap-2 text-xs">
              <Avatar className="h-5 w-5">
                <AvatarImage src={subtask.assignee?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">{getInitials(subtask.assignee?.full_name)}</AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground">{subtask.assignee?.full_name ?? 'N/A'}</span>
            </div>
          </td>
          <td className="py-2 text-xs text-muted-foreground">
            {subtask.due_date ? formatDateSafe(subtask.due_date, 'dd/MM/yyyy') : '-'}
          </td>
        </tr>
      ))}
    </>
  );
};

export default SubtasksCascade;
