import React, { useState, useEffect } from 'react';
import { Users, Send, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProfiles } from '@/hooks/useProfiles';
import { useQueryClient } from '@tanstack/react-query';
import { useSubtasks } from '@/hooks/useSubtasks';
import { useAuth } from '@/contexts/AuthContext';

interface TaskDelegationProps {
  taskId: string;
  currentAssigneeId: string | null;
  onDelegationSuccess: () => void;
}

const TaskDelegation: React.FC<TaskDelegationProps> = ({ taskId, currentAssigneeId, onDelegationSuccess }) => {
  const { profiles, loading: profilesLoading } = useProfiles();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [isTemporary, setIsTemporary] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [addCoResponsible, setAddCoResponsible] = useState(false);
  const [delegations, setDelegations] = useState<any[]>([]);
  const [editingDelegationId, setEditingDelegationId] = useState<string | null>(null);
  const [editSelectedUserId, setEditSelectedUserId] = useState<string | undefined>(undefined);
  const { subtasks, update: updateSubtask } = useSubtasks(taskId);
  const queryClient = useQueryClient();

  const handleDelegate = async () => {
    if (!selectedUserId) {
      toast({ title: "Erro", description: "Selecione um usuário.", variant: "destructive" });
      return;
    }
    if (!addCoResponsible && selectedUserId === currentAssigneeId) {
      toast({ title: "Aviso", description: "A tarefa já está atribuída a este usuário." });
      return;
    }

    // Confirmação se houver reatribuição (substituir responsável)
    if (!addCoResponsible && currentAssigneeId) {
      const currentName = profiles.find(p => p.id === currentAssigneeId)?.full_name || 'Usuário atual';
      const newName = profiles.find(p => p.id === selectedUserId)?.full_name || 'Usuário selecionado';
      const confirmMsg = `Confirmar reatribuição de ${currentName} para ${newName}?` + (isTemporary && endDate ? `\nDelegação temporária até ${endDate}.` : '');
      if (!window.confirm(confirmMsg)) return;
    }

    setIsSubmitting(true);
    try {
      // Se for apenas adicionar co-responsável, criamos um registro em task_delegations
      if (addCoResponsible) {
        const delegatedBy = user?.full_name || user?.email || 'Sistema';
        const delegatedTo = profiles.find(p => p.id === selectedUserId)?.full_name || '';
        const notes = isTemporary ? `Delegação temporária ${startDate || ''} -> ${endDate || ''}` : null;

        const insertPayload = {
          delegated_at: new Date().toISOString(),
          delegated_by: delegatedBy,
          delegated_by_id: user?.id || null,
          delegated_to: delegatedTo,
          delegated_to_id: selectedUserId,
          task_id: taskId,
          notes: notes,
          status: isTemporary ? 'temporary_co' : 'co_responsible'
        };
        const { data: insertData, error: insertErr } = await supabase.from('task_delegations').insert(insertPayload).select();

        if (insertErr) {
          console.error('Insert task_delegations error', insertErr);
          throw insertErr;
        }
        if (insertData && insertData.length > 0) {
          setDelegations(prev => [insertData[0], ...prev]);
        }
        
        // Criar notificação para o co-responsável
        try {
          if (selectedUserId) {
            await supabase.from('notifications').insert({
              user_id: selectedUserId,
              title: 'Você foi adicionado como co-responsável',
              message: `${delegatedBy} adicionou você como co-responsável em uma tarefa.`,
              type: 'task_assigned',
              task_id: taskId,
              data: { delegation_id: insertData?.[0]?.id || null, is_co_responsible: true },
              read: false
            });
          }
        } catch (notifErr) {
          console.warn('Erro criando notificação de co-responsável:', notifErr);
        }

        toast({ title: "Sucesso!", description: "Co-responsável adicionado.", });
        onDelegationSuccess();
        return;
      }

      // Substituir responsável: atualiza tarefa e registra delegação (opcionalmente temporária)
      const { error } = await supabase
        .from('tasks')
        .update({ assignee_id: selectedUserId })
        .eq('id', taskId);

      if (error) throw error;

      // Registrar delegação histórica (task_delegations)
      const delegatedBy = user?.full_name || user?.email || 'Sistema';
      const delegatedTo = profiles.find(p => p.id === selectedUserId)?.full_name || '';
      const notes = isTemporary ? `Delegação temporária ${startDate || ''} -> ${endDate || ''}` : null;
      const insertPayload = {
        delegated_at: new Date().toISOString(),
        delegated_by: delegatedBy,
        delegated_by_id: user?.id || null,
        delegated_to: delegatedTo,
        delegated_to_id: selectedUserId,
        task_id: taskId,
        notes: notes,
        status: isTemporary ? 'temporary' : 'assigned'
      };
      const { data: insertData, error: insertErr } = await supabase.from('task_delegations').insert(insertPayload).select();

      if (insertErr) console.warn('Não foi possível registrar delegação:', insertErr);
      if (insertData && insertData.length > 0) {
        setDelegations(prev => [insertData[0], ...prev]);
      }

      // Criar notificação para o novo responsável
      try {
        if (selectedUserId) {
          await supabase.from('notifications').insert({
            user_id: selectedUserId,
            title: 'Tarefa atribuída',
            message: `${delegatedBy} atribuiu a você a tarefa.`,
            type: 'task_assigned',
            task_id: taskId,
            data: { delegation_id: insertData?.[0]?.id || null },
            read: false
          });
        }
      } catch (notifErr) {
        console.warn('Erro criando notificação de atribuição:', notifErr);
      }

      toast({ title: "Sucesso!", description: "Tarefa atribuída com sucesso." });
      onDelegationSuccess();

    } catch (error: any) {
      console.error('Erro ao atribuir tarefa:', error);
      const msg = error?.message || JSON.stringify(error) || 'Não foi possível atribuir a tarefa.';
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Busca contagem de tarefas abertas por assignee para mostrar no dropdown
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('assignee_id')
          .neq('status', 'done');
        if (error) throw error;
        const counts: Record<string, number> = {};
        (data || []).forEach((row: any) => {
          const id = row.assignee_id as string | null;
          if (!id) return;
          counts[id] = (counts[id] || 0) + 1;
        });
        if (mounted) setTaskCounts(counts);
      } catch (err) {
        console.warn('Erro ao buscar contagens de tarefas:', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Busca delegações existentes para a tarefa
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.from('task_delegations').select('*').eq('task_id', taskId).order('delegated_at', { ascending: false });
        if (error) throw error;
        if (mounted) setDelegations(data || []);
      } catch (err) {
        console.warn('Erro ao buscar delegações:', err);
      }
    })();
    return () => { mounted = false; };
  }, [taskId]);

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" />Atribuir Responsável</CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="space-y-3">
          {currentAssigneeId ? (
            <div className="flex items-center gap-3 p-2 border rounded">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                {profiles.find(p => p.id === currentAssigneeId)?.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <div className="text-sm font-medium">Responsável atual</div>
                <div className="text-xs text-muted-foreground">{profiles.find(p => p.id === currentAssigneeId)?.full_name || 'Não atribuído'}</div>
              </div>
            </div>
          ) : (
            <div className="p-2 text-sm text-muted-foreground">Nenhum responsável atual</div>
          )}

          {/* Lista de delegações (co-responsáveis / histórico local) */}
          {delegations.length > 0 && (
            <div className="p-3 border rounded bg-white">
              <div className="text-sm font-medium mb-2">Co-responsáveis</div>
              <ul className="space-y-2 text-sm">
                {delegations
                  .filter(d => (d.status || '').includes('co') || (d.status || '') === 'co_responsible' || (d.status || '') === 'temporary_co')
                  .map(d => (
                    <li key={d.id} className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium">{d.delegated_to || d.delegated_to_id}</div>
                        <div className="text-xs text-muted-foreground">{d.notes ? d.notes + ' • ' : ''}{new Date(d.delegated_at).toLocaleString()} {d.status ? `• ${d.status}` : ''}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingDelegationId === d.id ? (
                          <div className="flex items-center gap-2">
                            <Select onValueChange={setEditSelectedUserId} value={editSelectedUserId}>
                              <SelectTrigger className="w-48"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                              <SelectContent>
                                {profiles.map(p => (
                                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={async () => {
                              if (!editSelectedUserId) { toast({ title: 'Erro', description: 'Selecione um usuário.', variant: 'destructive' }); return; }
                              try {
                                const delegatedTo = profiles.find(p => p.id === editSelectedUserId)?.full_name || '';
                                const { data: updated, error: updateErr } = await supabase.from('task_delegations').update({ delegated_to: delegatedTo, delegated_to_id: editSelectedUserId }).eq('id', d.id).select().single();
                                if (updateErr) throw updateErr;
                                setDelegations(prev => prev.map(x => x.id === d.id ? updated : x));
                                toast({ title: 'Atualizado', description: 'Co-responsável atualizado.' });
                                setEditingDelegationId(null);
                                setEditSelectedUserId(undefined);
                                onDelegationSuccess();
                              } catch (err: any) {
                                console.error('Erro atualizando co-responsável', err);
                                toast({ title: 'Erro', description: err?.message || 'Não foi possível atualizar', variant: 'destructive' });
                              }
                            }}>Salvar</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingDelegationId(null); setEditSelectedUserId(undefined); }}>Cancelar</Button>
                          </div>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" title="Editar co-responsável" onClick={() => { setEditingDelegationId(d.id); setEditSelectedUserId(d.delegated_to_id || undefined); }}>
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" title="Remover co-responsável" onClick={async () => {
                              if (!window.confirm('Remover este co-responsável?')) return;
                              try {
                                const { error: delErr } = await supabase.from('task_delegations').delete().eq('id', d.id);
                                if (delErr) throw delErr;
                                setDelegations(prev => prev.filter(x => x.id !== d.id));
                                toast({ title: 'Removido', description: 'Co-responsável removido.' });
                                onDelegationSuccess();
                              } catch (err: any) {
                                console.error('Erro removendo co-responsável', err);
                                toast({ title: 'Erro', description: err?.message || 'Não foi possível remover', variant: 'destructive' });
                              }
                            }}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Atribuir para:</label>
            <Select onValueChange={setSelectedUserId} disabled={profilesLoading}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={profilesLoading ? "Carregando..." : "Selecione um usuário"} /></SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email} {taskCounts[profile.id] ? `(${taskCounts[profile.id]} tarefas)` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Subtarefas pendentes de aprovação */}
          {(subtasks && subtasks.length > 0) && (
            <div className="p-3 border rounded bg-white">
              <div className="text-sm font-medium mb-2">Subtarefas pendentes de aprovação</div>
              <ul className="space-y-2 text-sm">
                {subtasks
                  .filter(s => ((s as any).needs_approval === true) || s.status === 'awaiting_approval' || (s.completed && s.status !== 'done'))
                  .map(s => (
                    <li key={s.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="font-medium">{s.title}</div>
                        <div className="text-xs text-muted-foreground">Responsável: {s.assignee?.full_name || 'N/A'} • Prazo: {s.due_date ? new Date(s.due_date).toLocaleDateString() : '-'}</div>
                        {(() => {
                          // prefer the view fields provided by `subtasks_with_approvers`
                          const requestedApproverName = (s as any).requested_approver_full_name || (s as any).requested_approver?.full_name || (s as any).requested_approver_name || null;
                          const approvedAt = (s as any).approved_at;
                          const approvedByField = (s as any).approved_by_full_name || (s as any).approved_by?.full_name || (s as any).approved_by_name || (s as any).approved_by_id || null;
                          // if approvedByField contains an id, try to resolve via profiles
                          const resolvedApprovedBy = approvedByField && profiles.find(p => p.id === approvedByField)?.full_name || approvedByField;
                          if (requestedApproverName) {
                            return <div className="text-xs text-yellow-700">Aguardando aprovação de {requestedApproverName}</div>;
                          }
                          if (approvedAt) {
                            return <div className="text-xs text-green-700">Aprovado por {resolvedApprovedBy ?? '—'} • {new Date(approvedAt).toLocaleString()}</div>;
                          }
                          return null;
                        })()}
                      </div>
                      <div>
                        {(() => {
                          const requestedApproverId = (s as any).requested_approver_id || (s as any).requested_approver?.id || null;
                          const isApprover = !!user && requestedApproverId && user.id === requestedApproverId;
                          const isAdmin = !!user && !!user.isAdmin;
                          const isRequester = !!user && user.id === s.assignee_id;

                          if (isApprover || isAdmin) {
                            return (
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={async () => {
                                  const confirmMsg = `Você tem certeza que deseja aprovar "${s.title}"?`;
                                  if (!window.confirm(confirmMsg)) return;
                                  try {
                                    const updates: any = {
                                      status: 'done',
                                      completed: true,
                                      needs_approval: false,
                                      approved_by_id: user?.id || null,
                                      approved_at: new Date().toISOString(),
                                    };
                                    const result = await updateSubtask({ id: s.id, updates });
                                    console.log('[TaskDelegation] approve result', { result });
                                    try { queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] }); } catch (e) { console.warn(e) }
                                    toast({ title: 'Subtarefa aprovada', description: `${s.title}` });
                                    // Notificar o solicitante (assignee) que a subtarefa foi aprovada
                                    try {
                                      const requesterId = s.assignee_id || (s as any).assignee_id || null;
                                      if (requesterId) {
                                        await supabase.from('notifications').insert({
                                          user_id: requesterId,
                                          title: 'Subtarefa aprovada',
                                          message: `${user?.full_name || 'Um usuário'} aprovou a subtarefa "${s.title}".`,
                                          type: 'approval_granted',
                                          task_id: taskId,
                                          data: { subtask_id: s.id },
                                          read: false
                                        });
                                      }
                                    } catch (notifErr) {
                                      console.warn('Erro criando notificação de aprovação:', notifErr);
                                    }
                                  } catch (err: any) {
                                    console.error('Erro aprovando subtarefa', err);
                                    toast({ title: 'Erro', description: err?.message || 'Não foi possível aprovar subtarefa', variant: 'destructive' });
                                  }
                                }}>Aprovar</Button>
                                <Button size="sm" variant="ghost" onClick={async () => {
                                  const confirmMsg = `Você tem certeza que deseja recusar "${s.title}"?`;
                                  if (!window.confirm(confirmMsg)) return;
                                  try {
                                    const updates: any = {
                                      needs_approval: false,
                                      approval_notes: `Rejeitado por ${user?.full_name || user?.email || user?.id} em ${new Date().toISOString()}`,
                                    };
                                    const result = await updateSubtask({ id: s.id, updates });
                                    console.log('[TaskDelegation] reject result', { result });
                                    try { queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] }); } catch (e) { console.warn(e) }
                                    toast({ title: 'Subtarefa recusada', description: `${s.title}` });
                                    // Notificar o solicitante que a subtarefa foi recusada
                                    try {
                                      const requesterId = s.assignee_id || (s as any).assignee_id || null;
                                      if (requesterId) {
                                        await supabase.from('notifications').insert({
                                          user_id: requesterId,
                                          title: 'Subtarefa recusada',
                                          message: `${user?.full_name || 'Um usuário'} recusou a subtarefa "${s.title}".`,
                                          type: 'approval_rejected',
                                          task_id: taskId,
                                          data: { subtask_id: s.id },
                                          read: false
                                        });
                                      }
                                    } catch (notifErr) {
                                      console.warn('Erro criando notificação de recusa:', notifErr);
                                    }
                                  } catch (err: any) {
                                    console.error('Erro recusando subtarefa', err);
                                    toast({ title: 'Erro', description: err?.message || 'Não foi possível recusar subtarefa', variant: 'destructive' });
                                  }
                                }}>Recusar</Button>
                              </div>
                            );
                          }

                          if (isRequester) {
                            return (
                              <Button size="sm" variant="ghost" onClick={async () => {
                                const confirmMsg = `Cancelar solicitação de aprovação para "${s.title}"?`;
                                if (!window.confirm(confirmMsg)) return;
                                try {
                                  const updates: any = {
                                    needs_approval: false,
                                    requested_approver_id: null,
                                    approval_notes: null,
                                  };
                                  const result = await updateSubtask({ id: s.id, updates });
                                  console.log('[TaskDelegation] cancel request result', { result });
                                  try { queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] }); } catch (e) { console.warn(e) }
                                  toast({ title: 'Solicitação cancelada', description: `${s.title}` });
                                  // Notificar o aprovador que a solicitação foi cancelada (se houver)
                                  try {
                                    const requestedApproverId = (s as any).requested_approver_id || (s as any).requested_approver?.id || null;
                                    if (requestedApproverId) {
                                      await supabase.from('notifications').insert({
                                        user_id: requestedApproverId,
                                        title: 'Solicitação cancelada',
                                        message: `${user?.full_name || 'O solicitante'} cancelou a solicitação de aprovação da subtarefa "${s.title}".`,
                                        type: 'approval_canceled',
                                        task_id: taskId,
                                        data: { subtask_id: s.id },
                                        read: false
                                      });
                                    }
                                  } catch (notifErr) {
                                    console.warn('Erro criando notificação de cancelamento:', notifErr);
                                  }
                                } catch (err: any) {
                                  console.error('Erro cancelando solicitação', err);
                                  toast({ title: 'Erro', description: err?.message || 'Não foi possível cancelar solicitação', variant: 'destructive' });
                                }
                              }}>Cancelar solicitação</Button>
                            );
                          }

                          return <div className="text-xs text-muted-foreground">Você não pode aprovar</div>;
                        })()}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={addCoResponsible} onChange={(e) => setAddCoResponsible(e.target.checked)} />
              <span>Adicionar co-responsável</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isTemporary} onChange={(e) => setIsTemporary(e.target.checked)} />
              <span>Temporário</span>
            </label>
          </div>

          {isTemporary && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs">Início</label>
                <input type="date" value={startDate || ''} onChange={(e) => setStartDate(e.target.value || null)} className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="text-xs">Término</label>
                <input type="date" value={endDate || ''} onChange={(e) => setEndDate(e.target.value || null)} className="w-full border rounded px-2 py-1" />
              </div>
            </div>
          )}

          <Button onClick={handleDelegate} disabled={!selectedUserId || isSubmitting} className="w-full">
            <Send className="w-4 h-4 mr-2" />{isSubmitting ? 'Atribuindo...' : (addCoResponsible ? 'Adicionar Co-responsável' : 'Atribuir Tarefa')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskDelegation;