
import React, { useState } from 'react';
import { Users, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useTaskDelegations } from '@/hooks/useTaskDelegations';
import { supabase } from '@/integrations/supabase/client';

interface TaskDelegationProps {
  taskId: string;
}

const TaskDelegation: React.FC<TaskDelegationProps> = ({ taskId }) => {
  const { delegations, createDelegation, updateDelegationStatus } = useTaskDelegations();
  const [selectedUser, setSelectedUser] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock users - in real app, get from API
  const availableUsers = [
    { id: 'user1', name: 'João Silva' },
    { id: 'user2', name: 'Maria Santos' },
    { id: 'user3', name: 'Pedro Costa' },
    { id: 'user4', name: 'Ana Oliveira' }
  ];

  const handleDelegate = async () => {
    if (!selectedUser || !notes.trim()) return;

    setIsSubmitting(true);
    try {
      await createDelegation({
        task_id: taskId,
        delegated_by: 'Usuário Atual', // Get from auth context
        delegated_to: selectedUser,
        notes: notes.trim()
      });
      
      // Criar notificação para o destinatário
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedUser, // Em produção, usar ID real
          title: 'Nova tarefa delegada',
          message: `Uma tarefa foi delegada para você: ${notes.trim()}`,
          type: 'delegation',
          task_id: taskId,
          data: { delegated_by: 'Usuário Atual' }
        });

      if (notificationError) {
        console.error('Erro ao criar notificação:', notificationError);
      }
      
      setSelectedUser('');
      setNotes('');
    } catch (error) {
      console.error('Erro ao delegar tarefa:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const taskDelegations = delegations.filter(d => d.task_id === taskId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'pending': 'Pendente',
      'accepted': 'Aceito',
      'rejected': 'Rejeitado'
    };
    return labels[status] || status;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5" />
          Delegação de Tarefa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário de delegação */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Delegar para:</label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.name}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Observações:</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione instruções ou observações sobre a delegação..."
              rows={3}
            />
          </div>

          <Button 
            onClick={handleDelegate}
            disabled={!selectedUser || !notes.trim() || isSubmitting}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Delegando...' : 'Delegar Tarefa'}
          </Button>
        </div>

        {/* Histórico de delegações */}
        {taskDelegations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Histórico de Delegações</h4>
            {taskDelegations.map((delegation) => (
              <div key={delegation.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{delegation.delegated_to}</span>
                    <Badge className={`text-xs ${getStatusColor(delegation.status)}`}>
                      {getStatusLabel(delegation.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(delegation.delegated_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <p className="text-sm text-gray-600">{delegation.notes}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Por: {delegation.delegated_by}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskDelegation;
