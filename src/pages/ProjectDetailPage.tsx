// src/pages/ProjectDetailPage.tsx (VERSÃO FINAL COM CAMINHOS CORRIGIDOS)

import { Fragment, useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { TaskWithDetails } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProjectDetails } from '@/hooks/useProjectDetails';
import AddTaskInline from '@/components/projects/AddTaskInline';
import SubtasksCascade from '@/components/projects/SubtasksCascade';
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet';
import SubtaskDetailSheet from '@/components/tasks/SubtaskDetailSheet';
import { Button } from '@/components/ui/button';
import { formatDateSafe } from '@/lib/dateUtils';
import { EditProjectForm } from '@/components/EditProjectForm';
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
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { Trash2, Edit, Check } from 'lucide-react';


const ProjectDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useProjectDetails(projectId);
  const project = data?.project;

  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  // expandedRows removido pois não é utilizado
  const [viewingSubtaskId, setViewingSubtaskId] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<string>>(new Set());

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

  // Estado para expandir/recolher seções
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const handleTaskAdded = (newTask: TaskWithDetails) => {
    setTasks((currentTasks) => [...currentTasks, newTask]);
  };

  const handleToggleComplete = async (task: TaskWithDetails) => {
    const taskId = task.id;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    // optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    setUpdatingTaskIds(prev => new Set(prev).add(taskId));
    try {
      const { data, error } = await supabase.from('tasks').update({ status: newStatus, end_date: newStatus === 'done' ? new Date().toISOString() : null }).eq('id', taskId).select('*, assignee:profiles(*), project:projects(*), category:task_categories(*)').single();
      if (error) throw error;
      const updated = data as TaskWithDetails;
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      toast.success(newStatus === 'done' ? 'Tarefa marcada como concluída' : 'Tarefa marcada como pendente');
    } catch (err: any) {
      console.error('Erro ao atualizar status da tarefa:', err);
      // revert optimistic
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: task.status } : t));
      toast.error('Não foi possível atualizar a tarefa', { description: err?.message });
    } finally {
      setUpdatingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Tarefa excluída');
    } catch (err: any) {
      console.error('Erro ao excluir tarefa:', err);
      toast.error('Não foi possível excluir a tarefa', { description: err?.message });
    }
  };

  // handleToggleRow removido pois não é utilizado

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
    <div className="p-6 space-y-6">
      {/* Cabeçalho modernizado */}
      <div className="flex justify-between items-center">
        <div>
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
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.description && <p className="text-gray-600 text-sm mt-1">{project.description}</p>}
        </div>
        <EditProjectForm project={project} onProjectUpdated={refetch} />
      </div>

      {/* Botão de adicionar seção */}
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

      {/* Tabela de tarefas com visual moderno */}
      <div className="border rounded-lg bg-white shadow-sm overflow-hidden mt-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left font-semibold text-gray-600 w-1/3">Tarefa</th>
              <th className="p-3 text-left font-semibold text-gray-600">Status / Progresso</th>
              <th className="p-3 text-left font-semibold text-gray-600">Prioridade</th>
              <th className="p-3 text-left font-semibold text-gray-600">Responsável</th>
              <th className="p-3 text-left font-semibold text-gray-600">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan={5} className="text-center p-8 text-gray-400">Este projeto ainda não tem tarefas.</td></tr>
            ) : (
              sectionOrder.map(sectionName => (
                <Fragment key={sectionName}>
                  <tr className="bg-gray-100/60">
                    <td colSpan={5} className="py-2 px-3">
                      <div className="flex items-center gap-2 group">
                        <button
                          type="button"
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition cursor-pointer"
                          onClick={() => toggleSection(sectionName)}
                          aria-label={expandedSections[sectionName] ? 'Recolher seção' : 'Expandir seção'}
                          tabIndex={0}
                        >
                          <span className={`transition-transform text-lg font-bold ${expandedSections[sectionName] ? 'rotate-90' : ''}`}>{'>'}</span>
                        </button>
                        <h4 className="font-semibold text-gray-700">{sectionName}</h4>
                      </div>
                    </td>
                  </tr>
                  {expandedSections[sectionName] && sections[sectionName]?.map((task: TaskWithDetails) => (
                    <Fragment key={task.id}>
                      <tr className="hover:bg-muted/50 group">
                        <td className="align-middle w-0" style={{ width: 48, paddingLeft: 32 }}>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={task.status === 'done'}
                              onChange={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                              disabled={updatingTaskIds.has(task.id)}
                              className="w-4 h-4 cursor-pointer"
                              aria-label={task.status === 'done' ? 'Marcar como não concluída' : 'Marcar como concluída'}
                            />
                            <button
                              type="button"
                              className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition cursor-pointer"
                              onClick={() => setViewingTaskId(task.id)}
                              aria-label="Abrir detalhes da tarefa"
                              tabIndex={0}
                            >
                              <span className="transition-transform text-lg font-bold">{'>'}</span>
                            </button>
                          </div>
                          <span className="truncate font-medium text-base ml-2">{task.title}</span>
                          {typeof task.subtasks_count === 'number' && task.subtasks_count > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                              {(task.completed_subtasks_count || 0)}/{task.subtasks_count}
                            </span>
                          )}
                            <div className="ml-4 inline-flex items-center gap-2">
                              <button
                                className="text-xs text-blue-600 hover:underline"
                                onClick={(e) => { e.stopPropagation(); setViewingTaskId(task.id); }}
                              >
                                Editar
                              </button>
                              <button
                                className="text-xs text-red-600 hover:underline"
                                onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                              >
                                Excluir
                              </button>
                            </div>
                        </td>
                        <td className="align-middle">
                          <span className={task.status === 'done' ? 'text-green-600' : task.status === 'progress' ? 'text-blue-500' : 'text-gray-500'}>
                            {task.status === 'done' ? 'Concluída' : task.status === 'progress' ? 'Em Progresso' : 'A Fazer'}
                          </span>
                        </td>
                        <td className="align-middle">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${task.priority === 'high' ? 'text-red-600' : task.priority === 'medium' ? 'text-yellow-600' : 'text-gray-500'}`}>{task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}</span>
                        </td>
                        <td className="align-middle">
                          <span className="text-xs text-muted-foreground">{task.assignee?.full_name || 'N/A'}</span>
                        </td>
                        <td className="align-middle">
                          <span className="text-xs text-muted-foreground">{task.due_date ? formatDateSafe(task.due_date, 'dd/MM/yyyy') : '-'}</span>
                        </td>
                      </tr>
                      {/* Subtarefas */}
                      {<SubtasksCascade taskId={task.id} />}
                    </Fragment>
                  ))}
                  {/* actions: edit / delete buttons are shown inline next to task info */}
                  {expandedSections[sectionName] && (
                    <Fragment>
                      <tr>
                        <td colSpan={5}>
                          <AddTaskInline projectId={projectId!} sectionName={sectionName} onTaskAdded={handleTaskAdded} />
                        </td>
                      </tr>
                    </Fragment>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detalhes da tarefa e subtarefa */}
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