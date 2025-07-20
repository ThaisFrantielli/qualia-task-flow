// src/components/task/TaskDelegation.tsx

import React, { useState } from 'react';
import { Users, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProfiles } from '@/hooks/useProfiles';

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

  const handleDelegate = async () => {
    if (!selectedUserId) {
        toast({ title: "Erro", description: "Selecione um usuário.", variant: "destructive" });
        return;
    }
    if (selectedUserId === currentAssigneeId) {
        toast({ title: "Aviso", description: "A tarefa já está atribuída a este usuário." });
        return;
    }

    setIsSubmitting(true);
    try {
      // Esta linha agora é válida porque o tipo da tabela 'tasks' conhece 'assignee_id'
      const { error } = await supabase
        .from('tasks')
        .update({ assignee_id: selectedUserId })
        .eq('id', taskId);

      if (error) throw error;
      
      toast({ title: "Sucesso!", description: "Tarefa atribuída com sucesso." });
      onDelegationSuccess();

    } catch (error) {
      console.error('Erro ao atribuir tarefa:', error);
      toast({ title: "Erro", description: "Não foi possível atribuir a tarefa.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" />Atribuir Responsável</CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Atribuir para:</label>
            <Select onValueChange={setSelectedUserId} disabled={profilesLoading}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={profilesLoading ? "Carregando..." : "Selecione um usuário"} /></SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>{profile.full_name || profile.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleDelegate} disabled={!selectedUserId || isSubmitting} className="w-full">
            <Send className="w-4 h-4 mr-2" />{isSubmitting ? 'Atribuindo...' : 'Atribuir Tarefa'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskDelegation;