// src/components/crm/DelegationForm.tsx

import React, { useState } from 'react';
import type { UserProfile } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface DelegationFormProps {
  atendimentoId: number;
  atendimentoTitle: string;
  onTaskCreated: () => void;
}

const DelegationForm: React.FC<DelegationFormProps> = ({ atendimentoId, atendimentoTitle, onTaskCreated }) => {
  // Agora temos o estado de 'loading' do hook
  const { users: gestores, loading: loadingGestores } = useUsers();
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleDelegate = async () => {
    if (!assigneeId) { toast.error('Por favor, selecione um responsável.'); return; }
    setIsSaving(true);
    const taskTitle = `Análise do Atendimento #${atendimentoId}: ${atendimentoTitle}`;
    const taskDescription = `**Dúvida/Observação para análise:**\n${notes}`;
    const { error } = await supabase.from('tasks').insert({ title: taskTitle, description: taskDescription, assignee_id: assigneeId, status: 'todo', priority: 'high', atendimento_id: atendimentoId });
    if (error) { toast.error('Falha ao delegar tarefa', { description: error.message }); } 
    else {
      toast.success('Tarefa delegada com sucesso!');
      await supabase.from('atendimentos').update({ status: 'Em Análise' }).eq('id', atendimentoId).eq('status', 'Solicitação');
      onTaskCreated();
      setAssigneeId('');
      setNotes('');
    }
    setIsSaving(false);
  };

  return (
    <div className="p-3 bg-background border rounded-md mt-2 space-y-3">
      <h4 className="text-sm font-semibold">Nova Delegação</h4>
      {/* Adiciona uma verificação de carregamento */}
      {loadingGestores ? (
        <p className="text-sm text-muted-foreground">Carregando responsáveis...</p>
      ) : (
        <Select onValueChange={setAssigneeId}>
          <SelectTrigger><SelectValue placeholder="Selecione o responsável..." /></SelectTrigger>
          <SelectContent>
            {gestores.map((gestor: UserProfile) => (
              <SelectItem key={gestor.id} value={gestor.id}>{gestor.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Textarea
        placeholder="Escreva a dúvida ou o que precisa ser analisado..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
      />
      <Button onClick={handleDelegate} disabled={isSaving || loadingGestores} size="sm" className="w-full">
        {isSaving ? 'Delegando...' : 'Delegar Tarefa'}
      </Button>
    </div>
  );
};

export default DelegationForm;