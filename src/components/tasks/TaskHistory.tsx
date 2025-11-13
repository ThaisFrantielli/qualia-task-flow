// src/components/tasks/TaskHistory.tsx (VERSÃO FINAL E COMPLETA)

import React from 'react';
import { useTaskHistory } from '@/hooks/useTaskHistory';
import type { TaskHistoryWithProfile } from '@/hooks/useTaskHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, List, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatDateSafe, parseISODateSafe } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import { getInitials, getStatusLabel, getPriorityLabel } from '@/lib/utils';

interface TaskHistoryProps {
  taskId: string;
}

// --- FUNÇÃO DE TRADUÇÃO CORRIGIDA PARA ACEITAR O MAPA DE PERFIS ---
const formatHistoryEntry = (entry: TaskHistoryWithProfile, profileMap: { [id: string]: any }): React.ReactNode => {
  const userName = <strong>{entry.profiles?.full_name || 'Sistema'}</strong>;
  const { action, field_changed, old_value, new_value } = entry;
  const normalizedAction = action.toLowerCase();

  const renderChange = (oldVal: React.ReactNode, newVal: React.ReactNode) => (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted-foreground line-through">{oldVal}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      <strong>{newVal}</strong>
    </span>
  );

  if (normalizedAction === 'create') {
    return <>{userName} criou esta tarefa.</>;
  }
  
  if (normalizedAction === 'update' && field_changed) {
    switch (field_changed) {
      case 'status':
        return <>{userName} alterou o status de {renderChange(getStatusLabel(old_value), getStatusLabel(new_value))}.</>;
      case 'priority':
        return <>{userName} alterou a prioridade de {renderChange(getPriorityLabel(old_value), getPriorityLabel(new_value))}.</>;
      case 'title':
        return <>{userName} renomeou a tarefa de {renderChange(`"${old_value}"`, `"${new_value}"`)}.</>;
      case 'description':
        return <>{userName} atualizou a descrição.</>;
      case 'assignee_id':
        const oldAssigneeName = profileMap[old_value || '']?.full_name || 'Não Atribuído';
        const newAssigneeName = profileMap[new_value || '']?.full_name || 'Não Atribuído';
        return <>{userName} alterou o responsável de {renderChange(oldAssigneeName, newAssigneeName)}.</>;
      case 'due_date':
        const oldDate = old_value ? formatDateSafe(old_value, 'dd/MM/yyyy') : 'Sem Prazo';
        const newDate = new_value ? formatDateSafe(new_value, 'dd/MM/yyyy') : 'Sem Prazo';
        return <>{userName} alterou o prazo de {renderChange(oldDate, newDate)}.</>;
      default:
        return <>{userName} atualizou o campo '{field_changed}'.</>;
    }
  }

  return <>Uma ação de '{action}' foi registrada por {userName}.</>;
};

const TaskHistory: React.FC<TaskHistoryProps> = ({ taskId }) => {
  // --- CORREÇÃO NA CHAMADA DO HOOK ---
  const { history, loading, error, profileMap } = useTaskHistory(taskId);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" /> <Skeleton className="h-12 w-full" /> <Skeleton className="h-12 w-full" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="text-center text-destructive py-8">
          <AlertTriangle className="mx-auto h-8 w-8 mb-2" /> <p>{error}</p>
        </div>
      );
    }
    if (history.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          <List className="mx-auto h-8 w-8 mb-2" /> <p>Nenhuma atividade registrada ainda.</p>
        </div>
      );
    }
    return (
      <ul className="space-y-6">
        {history.map(entry => (
          <li key={entry.id} className="flex items-start gap-4">
            <Avatar className="h-8 w-8 border">
              <AvatarImage src={entry.profiles?.avatar_url || undefined} />
              <AvatarFallback>{getInitials(entry.profiles?.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <p className="text-sm text-foreground">
                {/* --- CORREÇÃO NA CHAMADA DA FUNÇÃO DE FORMATAÇÃO --- */}
                {formatHistoryEntry(entry, profileMap)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(parseISODateSafe(entry.created_at) || new Date(), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Histórico de Atividades
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 mt-4">
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default TaskHistory;