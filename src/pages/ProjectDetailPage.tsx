// src/pages/ProjectDetailPage.tsx (VERSÃO FINAL COM CAMINHOS CORRIGIDOS)

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { TaskWithDetails } from '@/types';

// HOOKS E COMPONENTES
import { useProjectDetails } from '@/hooks/useProjectDetails';
import AddTaskInline from '@/components/projects/AddTaskInline'; 
import TaskRow from '@/components/projects/TaskRow';
// --- CORREÇÃO FINAL APLICADA AQUI ---
// O caminho para este componente é o único que estava causando problemas.
// Garantindo que ele esteja correto.
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet'; 
// --- FIM DA CORREÇÃO ---
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';

const ProjectDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useProjectDetails(projectId);
  const project = data?.project;

  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (data?.tasks) {
      setTasks(data.tasks);
    }
  }, [data?.tasks]);
  
  const sections = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const sectionName = task.section || 'Tarefas Gerais';
      if (!acc[sectionName]) acc[sectionName] = [];
      acc[sectionName].push(task);
      return acc;
    }, {} as Record<string, TaskWithDetails[]>);
  }, [tasks]);

  const sectionOrder = useMemo(() => ['Tarefas Gerais', ...Object.keys(sections).filter(s => s !== 'Tarefas Gerais').sort()], [sections]);

  const handleTaskAdded = (newTask: TaskWithDetails) => {
    setTasks(currentTasks => [...currentTasks, newTask]);
  };

  const handleAddSection = async () => {
    if (!user) { toast.error("Você precisa estar logado para criar uma seção."); return; }
    if (!newSectionName.trim()) { toast.error("O nome da seção não pode estar vazio."); return; }
    
    const { data, error } = await supabase.from('tasks').insert({ title: `Nova tarefa em ${newSectionName.trim()}`, project_id: projectId, section: newSectionName.trim(), status: 'todo', user_id: user.id }).select('*, assignee:profiles(*), project:projects(*), category:task_categories(*)').single();
    
    if (error) { toast.error("Erro ao criar seção", { description: error.message }); }
    else if (data) { 
      toast.success(`Seção "${newSectionName.trim()}" criada!`); 
      handleTaskAdded(data as TaskWithDetails);
      setNewSectionName(''); 
      setIsSectionModalOpen(false); 
    }
  };

  if (isLoading) {
    return <div className="p-6 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }
  if (isError || !project) {
    return <div className="p-6 text-center"><h2 className="text-xl font-semibold">Projeto não encontrado</h2><Link to="/projects" className="text-primary hover:underline mt-4 inline-block">Voltar para a lista de projetos</Link></div>;
  }

  return (
    <>
      <div className="p-6 space-y-4">
        <Link to="/projects" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para Projetos
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: project.color || '#6b7280' }} />
          <h1 className="text-3xl font-bold">{project.name}</h1>
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
                      <TaskRow key={task.id} task={task} onTaskClick={(clickedTask) => setViewingTaskId(clickedTask.id)} />
                    ))}
                    <AddTaskInline projectId={projectId!} sectionName={sectionName} onTaskAdded={handleTaskAdded} />
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <TaskDetailSheet
        taskId={viewingTaskId}
        open={!!viewingTaskId}
        onOpenChange={(isOpen: boolean) => !isOpen && setViewingTaskId(null)}
        onTaskUpdate={refetch}
      />
    </>
  );
};

export default ProjectDetailPage;