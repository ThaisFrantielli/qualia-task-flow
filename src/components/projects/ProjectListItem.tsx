// src/components/projects/ProjectListItem.tsx

import React, { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
// --- IMPORTAÇÃO CORRIGIDA E COMPLETA ---
import { cn, formatDate, getPriorityLabel, getPriorityColor, isOverdue } from '@/lib/utils';
import type { Task, Project } from '@/types';

interface ProjectListItemProps {
  project: Project;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({ project, tasks, onTaskClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const completed = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="border rounded-lg bg-card">
      <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 transition-colors text-left">
        <div className="flex items-center gap-4">
          {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#6b7280' }} />
          <div className="flex-grow"><h3 className="font-semibold">{project.name}</h3></div>
          
          <div className="w-40 hidden lg:block">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-muted-foreground">Progresso</span>
              <span className="text-sm font-medium">{progressPercent}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="border-t">
          <table className="w-full text-sm">
            {tasks.length > 0 && (
              <thead className="bg-muted/50">
                  <tr>
                      <th className="p-2 font-medium text-left text-muted-foreground">Tarefa</th>
                      <th className="p-2 font-medium text-left text-muted-foreground">Responsável</th>
                      <th className="p-2 font-medium text-left text-muted-foreground">Prazo</th>
                      <th className="p-2 font-medium text-left text-muted-foreground">Prioridade</th>
                  </tr>
              </thead>
            )}
            <tbody>
              {tasks.length > 0 ? tasks.map((task) => (
                <tr key={task.id} className="border-b last:border-b-0 hover:bg-muted/50 cursor-pointer" onClick={() => onTaskClick(task)}>
                  <td className="p-2 font-medium">{task.title}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6"><AvatarImage src={task.assignee_avatar || undefined} /><AvatarFallback className="text-xs">{task.assignee_name ? task.assignee_name.charAt(0) : '?'}</AvatarFallback></Avatar>
                      <span>{task.assignee_name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className={cn("p-2", isOverdue(task) ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                    {formatDate(task.due_date)}
                  </td>
                  <td className="p-2"><Badge variant="outline" className={getPriorityColor(task.priority)}>{getPriorityLabel(task.priority)}</Badge></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="text-center p-4 text-muted-foreground">
                    Nenhuma tarefa neste projeto.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ProjectListItem;