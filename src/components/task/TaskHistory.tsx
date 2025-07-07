
import React from 'react';
import { History, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTaskHistory } from '@/hooks/useTaskHistory';

interface TaskHistoryProps {
  taskId: string;
}

const TaskHistory: React.FC<TaskHistoryProps> = ({ taskId }) => {
  const { history, loading } = useTaskHistory(taskId);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return 'bg-green-100 text-green-800';
      case 'updated':
        return 'bg-blue-100 text-blue-800';
      case 'status_changed':
        return 'bg-yellow-100 text-yellow-800';
      case 'assigned':
        return 'bg-purple-100 text-purple-800';
      case 'commented':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: { [key: string]: string } = {
      'created': 'Criado',
      'updated': 'Atualizado',
      'status_changed': 'Status alterado',
      'assigned': 'Atribuído',
      'commented': 'Comentado',
      'archived': 'Arquivado',
      'deleted': 'Excluído'
    };
    return labels[action] || action;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="w-5 h-5" />
          Histórico
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-gray-500">
            Carregando histórico...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Nenhuma alteração registrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 pb-4 border-b last:border-b-0">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{entry.user_name}</span>
                    <Badge className={`text-xs ${getActionColor(entry.action)}`}>
                      {getActionLabel(entry.action)}
                    </Badge>
                  </div>
                  
                  {entry.field_changed && (
                    <div className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">{entry.field_changed}:</span>
                      {entry.old_value && (
                        <span className="text-red-600 line-through ml-1">
                          {entry.old_value}
                        </span>
                      )}
                      {entry.new_value && (
                        <span className="text-green-600 ml-1">
                          {entry.new_value}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {formatDate(entry.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskHistory;
