// src/pages/ProjectDetailPage.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Project, Task } from '@/types';
import { ArrowLeft, Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input'; // Importar Input para adicionar tarefas
import { toast } from 'sonner';

// --- MELHORIA: Componente TaskRow mais completo ---
const TaskRow: React.FC<{ task: Task }> = ({ task }) => {
  const getInitials = (name: string | null) => name?.charAt(0).toUpperCase() || '?';
  
  return (
    <tr className="border-b group hover:bg-muted/50 transition-colors">
      <td className="px-4 py-2 w-3/5">
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={task.status === 'done'} readOnly className="form-checkbox h-4 w-4 rounded text-primary border-gray-300 focus:ring-primary cursor-pointer" />
          <span className="font-medium">{task.title}</span>
        </div>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Avatar className="h-6 w-6">
            <AvatarImage src={task.assignee_avatar ?? undefined} />
            <AvatarFallback className="text-xs">{getInitials(task.assignee_name)}</AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground">{task.assignee_name || 'N/A'}</span>
        </div>
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground">{task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : '-'}</td>
      <td className="px-4 py-2">
        <Badge variant="outline">{task.priority || 'Normal'}</Badge>
      </td>
    </tr>
  );
};

// --- NOVO: Componente para adicionar tarefas inline ---
const AddTaskInline: React.FC<{ projectId: string; sectionName: string; onTaskAdded: (newTask: Task) => void }> = 
({ projectId, sectionName, onTaskAdded }) => {
  const [taskTitle, setTaskTitle] = useState('');

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTaskData = {
      title: taskTitle,
      project_id: projectId,
      section: sectionName,
      status: 'todo', // Status inicial
    };

    const { data, error } = await supabase.from('tasks').insert(newTaskData).select().single();

    if (error) {
      toast.error('Erro ao adicionar tarefa', { description: error.message });
    } else if (data) {
      toast.success('Tarefa adicionada!');
      onTaskAdded(data as Task);
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

const ProjectDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Agrupa tarefas por seção, garantindo uma ordem consistente
  const sections = tasks.reduce((acc, task) => {
    const sectionName = task.section || 'Tarefas Gerais';
    if (!acc[sectionName]) acc[sectionName] = [];
    acc[sectionName].push(task);
    return acc;
  }, {} as Record<string, Task[]>);
  const sectionOrder = ['Tarefas Gerais', ...Object.keys(sections).filter(s => s !== 'Tarefas Gerais').sort()];

  // --- MELHORIA: Busca dados de forma eficiente ---
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);

    // Busca os detalhes do projeto e as tarefas dele em paralelo
    const projectPromise = supabase.from('projects').select('*').eq('id', projectId).single();
    const tasksPromise = supabase.from('tasks').select('*, assignee:profiles(full_name, avatar_url)').eq('project_id', projectId);
    
    const [{ data: projectData, error: projectError }, { data: tasksData, error: tasksError }] = await Promise.all([projectPromise, tasksPromise]);

    if (projectError || tasksError) {
      toast.error("Erro ao carregar dados do projeto", { description: projectError?.message || tasksError?.message });
    } else {
      setProject(projectData);
      // Mapeia os dados do assignee para o formato plano da task
      const formattedTasks = tasksData.map(t => ({ ...t, assignee_name: t.assignee?.full_name, assignee_avatar: t.assignee?.avatar_url }))
      setTasks(formattedTasks);
    }
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Adiciona uma nova tarefa ao estado local para atualização instantânea da UI
  const handleTaskAdded = (newTask: Task) => {
    setTasks(currentTasks => [...currentTasks, newTask]);
  };
  
  // Adiciona uma nova seção
  const handleAddSection = async () => {
    const sectionName = prompt("Digite o nome da nova seção:");
    if (sectionName && sectionName.trim()) {
      // "Criar" uma seção é simplesmente adicionar a primeira tarefa a ela.
      const { data, error } = await supabase.from('tasks').insert({
        title: `Nova tarefa em ${sectionName}`,
        project_id: projectId,
        section: sectionName.trim(),
        status: 'todo',
      }).select().single();
      
      if (error) toast.error("Erro ao criar seção", { description: error.message });
      else if (data) {
        toast.success(`Seção "${sectionName}" criada!`);
        handleTaskAdded(data as Task);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold">Projeto não encontrado</h2>
        <Link to="/projects" className="text-primary hover:underline mt-4 inline-block">Voltar para a lista de projetos</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <Link to="/projects" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para Projetos
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: project.color || '#6b7280' }} />
        <h1 className="text-3xl font-bold">{project.name}</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <Button onClick={handleAddSection}><Plus className="mr-2 h-4 w-4" /> Adicionar Seção</Button>
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-2 text-left font-semibold text-muted-foreground w-3/5">Nome da Tarefa</th>
              <th className="p-2 text-left font-semibold text-muted-foreground">Responsável</th>
              <th className="p-2 text-left font-semibold text-muted-foreground">Prazo</th>
              <th className="p-2 text-left font-semibold text-muted-foreground">Prioridade</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center p-8 text-muted-foreground">
                  Este projeto ainda não tem tarefas. Que tal adicionar a primeira?
                </td>
              </tr>
            ) : (
              sectionOrder.map(sectionName => (
                <React.Fragment key={sectionName}>
                  <tr className="bg-muted/30">
                    <td colSpan={4} className="py-1">
                      <div className="flex items-center gap-2 p-2 group">
                        <h4 className="font-semibold">{sectionName}</h4>
                        {/* Menu de ações da seção (funcionalidade futura) */}
                      </div>
                    </td>
                  </tr>
                  {sections[sectionName]?.map(task => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                  {/* Formulário para adicionar tarefa no final de cada seção */}
                  <AddTaskInline projectId={projectId!} sectionName={sectionName} onTaskAdded={handleTaskAdded} />
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectDetailPage;