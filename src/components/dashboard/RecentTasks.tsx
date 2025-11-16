import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface RecentTasksProps {
  tasks: any[];
  users: any[];
}

const getInitials = (name?: string) => {
  if (!name) return '??';
  return name.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();
};

const RecentTasks: React.FC<RecentTasksProps> = ({ tasks, users }) => {
  const recent = (tasks || []).slice().sort((a,b) => (new Date(b.updated_at || b.created_at || 0).getTime()) - (new Date(a.updated_at || a.created_at || 0).getTime())).slice(0,8);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">Tarefas Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {recent.map(t => {
            const user = users.find((u:any) => u.id === t.assignee_id);
            return (
              <li key={t.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{getInitials(user?.full_name || t.assignee?.full_name || t.owner?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium truncate max-w-xs">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{user?.full_name || 'Não atribuído'} • {t.due_date ? format(new Date(t.due_date), 'dd/MM/yyyy') : '—'}</div>
                  </div>
                </div>
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded ${t.status === 'done' ? 'bg-green-100 text-green-800' : t.status === 'progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>{t.status === 'todo' ? 'A Fazer' : t.status === 'progress' ? 'Em andamento' : 'Concluído'}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};

export default RecentTasks;
