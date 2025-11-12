import React from 'react';
import { useState, useRef } from 'react';
import { usePortfolios } from '@/hooks/usePortfolios';
import { Portfolio, Project } from '@/types';
import { CreateProjectForm } from '@/components/CreateProjectForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { EditPortfolioForm } from './EditPortfolioForm';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"


// Configuração de prioridade para exibição na tabela
const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'text-gray-500' },
  medium: { label: 'Média', color: 'text-yellow-600' },
  high: { label: 'Alta', color: 'text-red-600' },
};

import { FolderOpen, ChevronRight } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';




interface ProjectsListCascadeProps {
  projetos: Project[];
  modoFoco?: boolean;
  onProjectDeleted?: () => void;
  onOpenSubtask?: (subtaskId: string) => void;
}


const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: 'A Fazer', color: 'text-gray-500' },
  progress: { label: 'Em Progresso', color: 'text-blue-500' },
  done: { label: 'Concluída', color: 'text-green-600' },
  late: { label: 'Atrasada', color: 'text-red-500' },
};

import ExpandedSubtasks from '@/components/tasks/ExpandedSubtasks';


const ProjectsListCascade: React.FC<ProjectsListCascadeProps> = ({ projetos, modoFoco, onProjectDeleted, onOpenSubtask }) => {
  // const navigate = useNavigate();
  const { tasks, deleteTask } = useTasks({});
  const navigate = useNavigate();
  const { portfolios, loading: loadingPortfolios, error: errorPortfolios } = usePortfolios();
  const [expandedPortfolios, setExpandedPortfolios] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [showCreateProjectForPortfolio, setShowCreateProjectForPortfolio] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [highlightedProjectId, setHighlightedProjectId] = useState<string | null>(null);
  const projectRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const togglePortfolio = (portfolioId: string) => {
    setExpandedPortfolios(prev => {
      const newSet = new Set(prev);
      if (newSet.has(portfolioId)) newSet.delete(portfolioId);
      else newSet.add(portfolioId);
      return newSet;
    });
  };
  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) newSet.delete(projectId);
      else newSet.add(projectId);
      return newSet;
    });
  };
  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) newSet.delete(taskId);
      else newSet.add(taskId);
      return newSet;
    });
  };

  const handleDeletePortfolio = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este portfólio?')) return;
    await supabase.from('portfolios').delete().eq('id', id);
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este projeto?')) return;
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) {
        console.error('Erro ao deletar projeto:', error);
        toast.error('Não foi possível deletar o projeto', { description: error.message });
      } else {
        toast.success('Projeto deletado com sucesso');
        // Trigger refetch no componente pai
        if (onProjectDeleted) {
          onProjectDeleted();
        }
      }
    } catch (err: any) {
      console.error('Erro ao deletar projeto:', err);
      toast.error('Erro ao deletar projeto', { description: err?.message });
    }
  };


  if (loadingPortfolios) {
    return <div className="p-4">Carregando portfólios...</div>;
  }
  if (errorPortfolios) {
    return <div className="p-4 text-red-500">Erro: {errorPortfolios}</div>;
  }
  // Fallback defensivo para garantir arrays
  const safePortfolios = Array.isArray(portfolios) ? portfolios : [];
  const safeProjetos = Array.isArray(projetos) ? projetos : [];
  if (safePortfolios.length === 0 && safeProjetos.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg mt-8">
        <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold">Nenhum portfólio ou projeto encontrado</h3>
        <p className="text-gray-500 mt-2 mb-4">Crie um portfólio ou projeto para começar a organizar.</p>
      </div>
    );
  }


  return (
    <div className="border rounded-lg bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[320px] whitespace-nowrap">Portfólio / Projeto</TableHead>
            <TableHead>Tarefa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Portfólios e seus projetos */}
          {(safePortfolios || []).map((portfolio) => {
            const projectsInPortfolio = safeProjetos.filter(p => p.portfolio_id === portfolio.id);
            return (
              <React.Fragment key={portfolio.id}>
                <TableRow className="bg-muted/20 group hover:bg-muted/30 transition-colors">
                  <TableCell colSpan={7} className="align-middle">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition cursor-pointer"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); togglePortfolio(portfolio.id); }}
                        aria-label={expandedPortfolios.has(portfolio.id) ? 'Recolher portfólio' : 'Expandir portfólio'}
                        tabIndex={0}
                      >
                        <ChevronRight className={`transition-transform ${expandedPortfolios.has(portfolio.id) ? 'rotate-90' : ''}`} />
                      </button>
                      <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: portfolio.color || '#6366f1' }} />
                      <span className="font-semibold text-base text-gray-900 truncate group-hover:text-primary transition-colors" title={portfolio.name}>{portfolio.name}</span>
                      {portfolio.description && (
                        <span className="text-xs text-gray-500 ml-2 truncate italic group-hover:text-primary/70 transition-colors" title={portfolio.description}>{portfolio.description}</span>
                      )}
                      <button
                        className="ml-2 text-xs text-blue-600 hover:underline"
                        onClick={() => setShowCreateProjectForPortfolio(portfolio.id)}
                      >
                        + Projeto
                      </button>
                      <button
                        className="ml-2 text-xs text-gray-500 hover:text-blue-600"
                        onClick={() => setEditingPortfolio(portfolio)}
                      >
                        Editar
                      </button>
                      <button
                        className="ml-2 text-xs text-red-600 hover:underline"
                        onClick={() => handleDeletePortfolio(portfolio.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
                {showCreateProjectForPortfolio === portfolio.id && (
                  <Dialog open onOpenChange={() => { setShowCreateProjectForPortfolio(null); setShowCreateForm(false); setSearchTerm(''); }}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Projeto ao Portfólio</DialogTitle>
                      </DialogHeader>
                      {!showCreateForm && (
                        <>
                          <Input
                            placeholder="Buscar projeto existente..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="mb-2"
                          />
                          {/* Lista projetos existentes que não pertencem a esse portfólio */}
                          <div className="max-h-40 overflow-y-auto mb-1">
                            {projetos.filter(p => (!p.portfolio_id || p.portfolio_id !== portfolio.id) && p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                              <div className="text-gray-500 text-xs p-2">Nenhum projeto encontrado.</div>
                            ) : (
                              projetos.filter(p => (!p.portfolio_id || p.portfolio_id !== portfolio.id) && p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                                <div key={p.id} className="flex items-center justify-between px-2 py-1 hover:bg-muted/60 rounded cursor-pointer transition">
                                  <span className="text-sm text-gray-800 truncate">{p.name}</span>
                                  <button
                                    className="text-xs text-primary hover:underline disabled:opacity-60 px-2 py-1"
                                    disabled={addingProject}
                                    onClick={async () => {
                                      setAddingProject(true);
                                      const { error } = await supabase.from('projects').update({ portfolio_id: portfolio.id }).eq('id', p.id);
                                      setAddingProject(false);
                                      setShowCreateProjectForPortfolio(null);
                                      setSearchTerm('');
                                      // Expande portfólio e projeto, destaca e faz scroll
                                      setTimeout(() => {
                                        setExpandedPortfolios(prev => new Set(prev).add(portfolio.id));
                                        setExpandedProjects(prev => new Set(prev).add(p.id));
                                        setHighlightedProjectId(p.id);
                                        setTimeout(() => setHighlightedProjectId(null), 2000);
                                        setTimeout(() => {
                                          if (projectRefs.current[p.id]) {
                                            projectRefs.current[p.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          }
                                        }, 300);
                                      }, 300);
                                      if (error) setActionError(error.message);
                                    }}
                                  >Adicionar</button>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="text-center mt-2">
                            <button
                              className="text-xs text-blue-600 hover:underline bg-transparent border-0 p-0 m-0"
                              style={{ outline: 'none' }}
                              onClick={() => setShowCreateForm(true)}
                            >
                              + Criar novo projeto
                            </button>
                          </div>
                        </>
                      )}
                      {showCreateForm && (
                        <CreateProjectForm
                          defaultPortfolioId={portfolio.id}
                          onProjectCreated={() => { setShowCreateProjectForPortfolio(null); setShowCreateForm(false); setSearchTerm(''); }}
                        />
                      )}
                      <DialogFooter className="justify-end">
                        <button
                          className="text-xs text-gray-500 hover:text-gray-700 bg-transparent border-0 p-0 m-0"
                          style={{ outline: 'none' }}
                          onClick={() => { setShowCreateProjectForPortfolio(null); setShowCreateForm(false); setSearchTerm(''); }}
                        >Fechar</button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                {editingPortfolio && editingPortfolio.id === portfolio.id && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EditPortfolioForm
                        portfolio={editingPortfolio}
                        onSaved={() => setEditingPortfolio(null)}
                        onCancel={() => setEditingPortfolio(null)}
                      />
                    </TableCell>
                  </TableRow>
                )}
                {expandedPortfolios.has(portfolio.id) && projectsInPortfolio.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-gray-400 italic pl-12">Nenhum projeto neste portfólio.</TableCell>
                  </TableRow>
                )}
                {expandedPortfolios.has(portfolio.id) && projectsInPortfolio.map((project) => {
                  let projectTasks = tasks.filter((t) => t.project_id === project.id);
                  if (modoFoco) {
                    projectTasks = projectTasks.filter(t => t.priority === 'high' || t.priority === 'alta');
                  }
                  // Agrupar tarefas por seção
                  const sections = projectTasks.reduce((acc, task) => {
                    const section = task.section || 'Tarefas Gerais';
                    if (!acc[section]) acc[section] = [];
                    acc[section].push(task);
                    return acc;
                  }, {} as Record<string, any[]>);
                  const sectionOrder = ['Tarefas Gerais', ...Object.keys(sections).filter(s => s !== 'Tarefas Gerais').sort()];
                  return (
                    <React.Fragment key={project.id}>
                      <TableRow
                        ref={el => { if (el) projectRefs.current[project.id] = el; }}
                        className={`bg-muted/30 group hover:bg-muted/50 transition-colors ${highlightedProjectId === project.id ? 'ring-2 ring-primary/40 animate-pulse' : ''}`}
                      >
                        <TableCell className="align-middle w-0" style={{ width: 48, paddingLeft: 32 }}>
                          <button
                            type="button"
                            className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition cursor-pointer"
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Impede qualquer navegação acidental
                              if (e.nativeEvent && typeof (e.nativeEvent as any).stopImmediatePropagation === 'function') {
                                (e.nativeEvent as any).stopImmediatePropagation();
                              }
                              toggleProject(project.id);
                            }}
                            aria-label={expandedProjects.has(project.id) ? 'Recolher projeto' : 'Expandir projeto'}
                            tabIndex={0}
                          >
                            <ChevronRight className={`transition-transform ${expandedProjects.has(project.id) ? 'rotate-90' : ''}`} />
                          </button>
                        </TableCell>
                        <TableCell colSpan={5} className="py-2 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: project.color || '#A1A1AA' }} />
                            <span className="font-semibold text-base text-gray-900 truncate group-hover:text-primary transition-colors" title={project.name}>{project.name}</span>
                            {project.description && (
                              <span className="text-xs text-gray-500 ml-2 truncate italic group-hover:text-primary/70 transition-colors" title={project.description}>{project.description}</span>
                            )}
                            {/* Barra de progresso do projeto */}
                            {(() => {
                              const total = projectTasks.length;
                              const done = projectTasks.filter(t => t.status === 'done').length;
                              const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                              return (
                                <div className="flex items-center gap-1 ml-4 min-w-[80px]">
                                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
                                  </div>
                                  <span className="text-xs text-muted-foreground font-mono">{percent}%</span>
                                </div>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded-full hover:bg-gray-200" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-5 w-5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem
                                className="text-red-500"
                                onClick={() => handleDeleteProject(project.id)}
                              >
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {expandedProjects.has(project.id) && sectionOrder.map(sectionName => (
                        <React.Fragment key={sectionName}>
                          <TableRow className="bg-muted/10">
                            <TableCell className="py-1 pl-16" colSpan={6} style={{ paddingLeft: 64 }}>
                              <span className="font-semibold text-sm text-muted-foreground">{sectionName}</span>
                            </TableCell>
                          </TableRow>
                          {Array.isArray(sections[sectionName]) && sections[sectionName].length > 0
                            ? sections[sectionName].map((task: any) => (
                                <React.Fragment key={task.id}>
                                  <TableRow className="hover:bg-muted/50 group">
                                    <TableCell className="align-middle w-0" style={{ width: 48, paddingLeft: 48 }}>
                                      <button
                                        type="button"
                                        className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition cursor-pointer"
                                        onClick={e => { e.preventDefault(); e.stopPropagation(); toggleTask(task.id); }}
                                        aria-label={expandedTasks.has(task.id) ? 'Recolher tarefa' : 'Expandir tarefa'}
                                        tabIndex={0}
                                      >
                                        <ChevronRight className={`transition-transform ${expandedTasks.has(task.id) ? 'rotate-90' : ''}`} />
                                      </button>
                                    </TableCell>
                                    <TableCell className="align-middle font-normal text-sm">
                                      <div className="flex items-center gap-2">
                                        {/* Checkbox removido */}
                                        <span className="truncate font-medium text-base">{task.title}</span>
                                        {/* Contador de subtarefas */}
                                        {typeof task.subtasks_count === 'number' && task.subtasks_count > 0 && (
                                          <span className="ml-2 text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                                            {(task.completed_subtasks_count || 0)}/{task.subtasks_count}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="align-middle">
                                      <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span className={statusConfig[task.status]?.color || ''}>{statusConfig[task.status]?.label || task.status}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="align-middle">
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${priorityConfig[task.priority]?.color || ''}`}>{priorityConfig[task.priority]?.label || task.priority}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="align-middle">
                                      <span className="text-xs text-muted-foreground">{task.assignee?.full_name || 'N/A'}</span>
                                    </TableCell>
                                    <TableCell className="align-middle">
                                      <span className="text-xs text-muted-foreground">{task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</span>
                                    </TableCell>
                                    <TableCell className="align-middle text-right">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button className="p-1 rounded-full hover:bg-gray-200" onClick={(e) => e.stopPropagation()}>
                                            <MoreVertical className="h-5 w-5" />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                          <DropdownMenuItem onClick={() => navigate(`/tasks/${task.id}`)}>
                                            Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={async () => {
                                            if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
                                            try {
                                              await deleteTask(task.id);
                                              toast.success('Tarefa excluída com sucesso!');
                                            } catch (err: any) {
                                              toast.error('Erro ao excluir tarefa', { description: err?.message });
                                            }
                                          }} className="text-red-600">Excluir</DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  </TableRow>
                                  {expandedTasks.has(task.id) && (
                                    <React.Fragment>
                                      {/* Renderiza as subtarefas alinhadas às colunas principais */}
                                      <TableRow className="bg-muted/20">
                                        {/* Espaço para alinhar com o ícone de expandir da tarefa */}
                                        <TableCell style={{ width: 48, paddingLeft: 48 }} />
                                        {/* Subtarefas ocupam as mesmas colunas que as tarefas */}
                                        <TableCell colSpan={5} className="p-0">
                                          <Table>
                                            <TableBody>
                                              <ExpandedSubtasks taskId={task.id} onSubtaskClick={(id) => onOpenSubtask?.(id)} />
                                            </TableBody>
                                          </Table>
                                        </TableCell>
                                      </TableRow>
                                    </React.Fragment>
                                  )}
                                </React.Fragment>
                              ))
                            : null}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
          {/* Projetos sem portfólio */}
          {(safeProjetos || []).filter(p => !p.portfolio_id).map((project) => {
            let projectTasks = tasks.filter((t) => t.project_id === project.id);
            if (modoFoco) {
              projectTasks = projectTasks.filter(t => t.priority === 'high' || t.priority === 'alta');
            }
            // Agrupar tarefas por seção
            const sections = projectTasks.reduce((acc, task) => {
              const section = task.section || 'Tarefas Gerais';
              if (!acc[section]) acc[section] = [];
              acc[section].push(task);
              return acc;
            }, {} as Record<string, any[]>);
            const sectionOrder = ['Tarefas Gerais', ...Object.keys(sections).filter(s => s !== 'Tarefas Gerais').sort()];
            return (
              <React.Fragment key={project.id}>
                <TableRow
                  ref={el => { if (el) projectRefs.current[project.id] = el; }}
                  className={`bg-muted/30 group hover:bg-muted/50 transition-colors ${highlightedProjectId === project.id ? 'ring-2 ring-primary/40 animate-pulse' : ''}`}
                >
                  <TableCell className="align-middle w-0" style={{ width: 48, paddingLeft: 8 }}>
                    <button
                      type="button"
                      className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition cursor-pointer"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); toggleProject(project.id); }}
                      aria-label={expandedProjects.has(project.id) ? 'Recolher projeto' : 'Expandir projeto'}
                      tabIndex={0}
                    >
                      <ChevronRight className={`transition-transform ${expandedProjects.has(project.id) ? 'rotate-90' : ''}`} />
                    </button>
                  </TableCell>
                  <TableCell colSpan={5} className="py-2 align-middle">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: project.color || '#A1A1AA' }} />
                      <span className="font-semibold text-base text-gray-900 truncate group-hover:text-primary transition-colors" title={project.name}>{project.name}</span>
                      {project.description && (
                        <span className="text-xs text-gray-500 ml-2 truncate italic group-hover:text-primary/70 transition-colors" title={project.description}>{project.description}</span>
                      )}
                      {/* Barra de progresso do projeto */}
                      {(() => {
                        const total = projectTasks.length;
                        const done = projectTasks.filter(t => t.status === 'done').length;
                        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                        return (
                          <div className="flex items-center gap-1 ml-4 min-w-[80px]">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">{percent}%</span>
                          </div>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded-full hover:bg-gray-200" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          className="text-red-500"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                {expandedProjects.has(project.id) && Array.isArray(sectionOrder) && sectionOrder.length > 0 && sectionOrder.map(sectionName => (
                  <React.Fragment key={sectionName}>
                    <TableRow className="bg-muted/10">
                      <TableCell className="py-1 pl-16" colSpan={6} style={{ paddingLeft: 64 }}>
                        <span className="font-semibold text-sm text-muted-foreground">{sectionName}</span>
                      </TableCell>
                    </TableRow>
                    {Array.isArray(sections[sectionName]) && sections[sectionName].length > 0
                      ? sections[sectionName].map((task: any) => (
                        <React.Fragment key={task.id}>
                          <TableRow className="hover:bg-muted/50 group">
                            <TableCell className="align-middle w-0" style={{ width: 48, paddingLeft: 48 }}>
                              <button
                                type="button"
                                className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition cursor-pointer"
                                onClick={e => { e.preventDefault(); e.stopPropagation(); toggleTask(task.id); }}
                                aria-label={expandedTasks.has(task.id) ? 'Recolher tarefa' : 'Expandir tarefa'}
                                tabIndex={0}
                              >
                                <ChevronRight className={`transition-transform ${expandedTasks.has(task.id) ? 'rotate-90' : ''}`} />
                              </button>
                            </TableCell>
                            <TableCell className="align-middle font-normal text-sm">
                              <div className="flex items-center gap-2">
                                {/* Checkbox removido */}
                                <span className="truncate font-medium text-base">{task.title}</span>
                                {/* Contador de subtarefas */}
                                {typeof task.subtasks_count === 'number' && task.subtasks_count > 0 && (
                                  <span className="ml-2 text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                                    {(task.completed_subtasks_count || 0)}/{task.subtasks_count}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-middle">
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span className={statusConfig[task.status]?.color || ''}>{statusConfig[task.status]?.label || task.status}</span>
                              </div>
                            </TableCell>
                            <TableCell className="align-middle">
                              <div className="flex items-center gap-2 text-sm">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${priorityConfig[task.priority]?.color || ''}`}>{priorityConfig[task.priority]?.label || task.priority}</span>
                              </div>
                            </TableCell>
                            <TableCell className="align-middle">
                              <span className="text-xs text-muted-foreground">{task.assignee?.full_name || 'N/A'}</span>
                            </TableCell>
                            <TableCell className="align-middle">
                              <span className="text-xs text-muted-foreground">{task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</span>
                            </TableCell>
                          </TableRow>
                          {expandedTasks.has(task.id) && (
                            <React.Fragment>
                              {/* Renderiza as subtarefas alinhadas às colunas principais */}
                              <TableRow className="bg-muted/20">
                                {/* Espaço para alinhar com o ícone de expandir da tarefa */}
                                <TableCell style={{ width: 48, paddingLeft: 48 }} />
                                {/* Subtarefas ocupam as mesmas colunas que as tarefas */}
                                <TableCell colSpan={5} className="p-0">
                                  <Table>
                                    <TableBody>
                                      <ExpandedSubtasks taskId={task.id} onSubtaskClick={(id) => onOpenSubtask?.(id)} />
                                    </TableBody>
                                  </Table>
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          )}
                        </React.Fragment>
                      ))
                      : null}
                  </React.Fragment>
                ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
      {actionError && <div className="p-4 text-red-500">Erro: {actionError}</div>}
    </div>
  );
};

export default ProjectsListCascade;
