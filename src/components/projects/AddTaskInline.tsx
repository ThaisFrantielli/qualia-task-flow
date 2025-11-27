// src/components/projects/AddTaskInline.tsx

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TaskWithDetails } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AddTaskInlineProps {
  projectId: string;
  sectionName: string;
  onTaskAdded: (newTask: TaskWithDetails) => void;
}

const AddTaskInline: React.FC<AddTaskInlineProps> = ({ projectId, sectionName, onTaskAdded }) => {
  const { user } = useAuth();
  const [taskTitle, setTaskTitle] = useState('');

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !user) return;

    const newTaskData = { 
      title: taskTitle, 
      project_id: projectId, 
      section: sectionName, 
      status: 'todo', 
      user_id: user.id 
    };
    
    const { data, error } = await supabase.from('tasks').insert(newTaskData).select('*, assignee:profiles(*), project:projects(*), category:task_categories(*)').single();
    
    if (error) {
      toast.error('Erro ao adicionar tarefa', { description: error.message });
    } else if (data) {
      toast.success('Tarefa adicionada!');
      onTaskAdded(data as TaskWithDetails);
      setTaskTitle('');
    }
  };

  return (
    <tr className="bg-muted/10">
      <td colSpan={4} className="px-4 py-1">
        <form onSubmit={handleAddTask} className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-muted-foreground" />
          <Input 
            value={taskTitle} 
            onChange={(e) => setTaskTitle(e.target.value)} 
            placeholder="Adicionar uma nova tarefa..." 
            className="h-8 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1" 
          />
        </form>
      </td>
    </tr>
  );
};

export default AddTaskInline;