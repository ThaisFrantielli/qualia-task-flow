import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { TaskWithDetails } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProjectDetails } from '@/hooks/useProjectDetails';
import AddTaskInline from '@/components/projects/AddTaskInline'; 
import TaskRow from '@/components/projects/TaskRow';
import SubtasksCascade from '@/components/projects/SubtasksCascade';
// --- CORREÇÃO FINAL APLICADA AQUI ---
// O caminho para este componente é o único que estava causando problemas.
// Garantindo que ele esteja correto.
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet'; 
// --- FIM DA CORREÇÃO ---
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ProjectDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useProjectDetails(projectId);
  const project = data?.project;

  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewingSubtaskId, setViewingSubtaskId] = useState<string | null>(null);

  useEffect(() => {
    if (data?.tasks) setTasks(data.tasks);
  }, [data?.tasks]);

  const sections = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const sectionName = task.section || 'Tarefas Gerais';
      if (!acc[sectionName]) acc[sectionName] = [];
      acc[sectionName].push(task);
      return acc;
    }, {} as Record<string, TaskWithDetails[]>);
  }, [tasks]);

  const sectionOrder = useMemo(() => {
    return ['Tarefas Gerais', ...Object.keys(sections).filter((s) => s !== 'Tarefas Gerais').sort()];
  }, [sections]);

  const handleTaskAdded = (newTask: TaskWithDetails) => {
    setTasks((currentTasks) => [...currentTasks, newTask]);
  };

  const handleToggleRow = (taskId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) newSet.delete(taskId);
      else newSet.add(taskId);
      return newSet;
    });
  };

  const handleAddSection = () => {
    if (!user || !newSectionName.trim()) return;

    const createSectionPromise = async (): Promise<TaskWithDetails> => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: `Nova tarefa em ${newSectionName.trim()}`,
          project_id: projectId,
          section: newSectionName.trim(),
          status: 'todo',
          user_id: user.id,
        })
        .select('*, assignee:profiles(*), project:projects(*), category:task_categories(*)')
        .single();

      if (error) {
        throw error;
      }

      return data as TaskWithDetails;
    };

    toast.promise(createSectionPromise(), {
      loading: 'Criando seção...',
      success: (newTask) => {
        handleTaskAdded(newTask);
        setNewSectionName('');
        setIsSectionModalOpen(false);
        return `Seção "${newSectionName.trim()}" criada!`;
      },
      error: (err: any) => `Erro ao criar seção: ${err.message}`,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold">Projeto não encontrado</h2>
        <Link to="/projects" className="text-primary hover:underline mt-4 inline-block">
          Voltar para a lista de projetos
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm text-muted-foreground mb-2" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1">
            <li>
              <Link to="/projects" className="hover:underline flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Projetos
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
              <span className="font-semibold text-foreground">{project.name}</span>
            </li>
          </ol>
        </nav>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: project.color || '#6b7280' }} />
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog open={isSectionModalOpen} onOpenChange={setIsSectionModalOpen}>
            <AlertDialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Adicionar Seção</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Criar Nova Seção</AlertDialogTitle><AlertDialogDescription>Digite o nome da nova seção para organizar suas tarefas.</AlertDialogDescription></AlertDialogHeader>
              <div className="py-2">
                <Label htmlFor="section-name" className="sr-only">Nome da Seção</Label>
                <Input id="section-name" placeholder="Ex: Planejamento" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSection(); } }} />
              </div>
              <AlertDialogFooter><AlertDialogCancel onClick={() => setNewSectionName('')}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleAddSection}>Criar Seção</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr><th className="p-2 text-left font-semibold text-muted-foreground w-3/5">Nome da Tarefa</th><th className="p-2 text-left font-semibold text-muted-foreground">Responsável</th><th className="p-2 text-left font-semibold text-muted-foreground">Prazo</th><th className="p-2 text-left font-semibold text-muted-foreground">Prioridade</th></tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan={4} className="text-center p-8 text-muted-foreground">Este projeto ainda não tem tarefas.</td></tr>
              ) : (
                sectionOrder.map(sectionName => (
                  <React.Fragment key={sectionName}>
                    <tr className="bg-muted/30"><td colSpan={4} className="py-1"><div className="flex items-center gap-2 p-2 group"><h4 className="font-semibold">{sectionName}</h4></div></td></tr>
                    {sections[sectionName]?.map(task => (
                      <React.Fragment key={task.id}>
                        <TaskRow task={task} onTaskClick={(clickedTask) => setViewingTaskId(clickedTask.id)} />
                        <SubtasksCascade taskId={task.id} />
                      </React.Fragment>
                    ))}
                    <AddTaskInline projectId={projectId!} sectionName={sectionName} onTaskAdded={handleTaskAdded} />
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalhes da Tarefa e Subtarefa */}
      <TaskDetailSheet
        taskId={viewingTaskId}
        open={!!viewingTaskId}
        onOpenChange={(isOpen) => !isOpen && setViewingTaskId(null)}
        onTaskUpdate={refetch}
      />
      <SubtaskDetailSheet
        subtaskId={viewingSubtaskId}
        open={!!viewingSubtaskId}
        onOpenChange={(isOpen) => !isOpen && setViewingSubtaskId(null)}
      />
    </div>
  );
};

export default ProjectDetailPage;