// src/components/projects/ProjectListItem.tsx
    
import React, { useState, useEffect } from 'react'; // <-- CORREÇÃO AQUI
import { supabase } from '@/integrations/supabase/client';
import type { Project, Task } from '@/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronRight, MoreHorizontal, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface ProjectListItemProps {
  project: Project;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({ project }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    const fetchTaskCount = async () => {
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id);
      
      if (error) console.error("Erro ao buscar contagem de tarefas:", error);
      else if (count !== null) setTaskCount(count);
    };
    fetchTaskCount();
  }, [project.id]);

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && tasks.length === 0 && !isLoadingTasks) {
      setIsLoadingTasks(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        toast.error("Erro ao buscar tarefas", { description: error.message });
      } else if (data) {
        setTasks(data);
      }
      setIsLoadingTasks(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange} className="border rounded-lg bg-white shadow-sm transition-all hover:shadow-md">
      <CollapsibleTrigger asChild>
        <div className="flex items-center p-4 cursor-pointer">
          <ChevronRight className={`h-5 w-5 mr-3 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          <div className="w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: project.color || '#A1A1AA' }} />
          <span className="font-semibold text-gray-800 flex-1 truncate">{project.name}</span>
          <Badge variant="secondary" className="mr-4">{taskCount} tarefas</Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); toast.info("Menu de ações em breve!"); }}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t bg-gray-50/50 p-4">
          {isLoadingTasks ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : tasks.length > 0 ? (
            <ul className="space-y-2">
              {tasks.map(task => (
                <li key={task.id} className="text-sm text-gray-700 p-2 rounded hover:bg-gray-100">{task.title}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Nenhuma tarefa neste projeto ainda.</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ProjectListItem;