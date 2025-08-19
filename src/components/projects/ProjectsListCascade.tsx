import React, { useState } from 'react';

// Configuração de prioridade para exibição na tabela
const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'text-gray-500' },
  medium: { label: 'Média', color: 'text-yellow-600' },
  high: { label: 'Alta', color: 'text-red-600' },
};
import { useNavigate } from 'react-router-dom';
import { FolderOpen, ChevronRight } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';



interface ProjectsListCascadeProps {
  projetos: any[];
  modoFoco?: boolean;
}


const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: 'A Fazer', color: 'text-gray-500' },
  progress: { label: 'Em Progresso', color: 'text-blue-500' },
  done: { label: 'Concluída', color: 'text-green-600' },
  late: { label: 'Atrasada', color: 'text-red-500' },
};

import ExpandedSubtasks from '@/components/tasks/ExpandedSubtasks';

const ProjectsListCascade: React.FC<ProjectsListCascadeProps> = ({ projetos, modoFoco }) => {
  const navigate = useNavigate();
  const { tasks } = useTasks({});
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

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

  if (!projetos || projetos.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg mt-8">
        <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold">Nenhum projeto encontrado</h3>
        <p className="text-gray-500 mt-2 mb-4">Ajuste sua busca ou filtros para ver resultados.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Projeto</TableHead>
            <TableHead>Tarefa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Prazo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projetos.map((project) => {
            let projectTasks = tasks.filter((t) => t.project_id === project.id);
            if (modoFoco) {
              projectTasks = projectTasks.filter(t => t.priority === 'high' || t.priority === 'alta');
            }
            if (projectTasks.length === 0) {
              return (
                <TableRow key={project.id}>
                  <TableCell colSpan={6} className="text-gray-400 italic">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#A1A1AA' }} />
                      <span className="font-semibold text-base text-gray-900 truncate" title={project.name}>{project.name}</span>
                      {project.description && (
                        <span className="text-xs text-gray-500 ml-2 truncate" title={project.description}>{project.description}</span>
                      )}
                      <span className="ml-2 text-xs">(sem tarefas)</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
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
                <TableRow className="bg-muted/30 group hover:bg-muted/50 transition-colors">
                  <TableCell className="align-middle w-0" style={{ width: 48 }}>
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
                        const projectTasks = tasks.filter((t) => t.project_id === project.id);
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
                </TableRow>
                {expandedProjects.has(project.id) && sectionOrder.map(sectionName => (
                  <React.Fragment key={sectionName}>
                    <TableRow className="bg-muted/10">
                      <TableCell className="py-1 pl-12" colSpan={6} style={{ paddingLeft: 64 }}>
                        <span className="font-semibold text-sm text-muted-foreground">{sectionName}</span>
                      </TableCell>
                    </TableRow>
                    {sections[sectionName].map((task: any) => (
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
                              {/* Checkbox igual subtarefa */}
                              <input
                                type="checkbox"
                                checked={task.status === 'done'}
                                readOnly
                                className="form-checkbox h-4 w-4 rounded text-primary border-gray-300 focus:ring-primary cursor-pointer"
                              />
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
                                    <ExpandedSubtasks taskId={task.id} onSubtaskClick={() => {}} />
                                  </TableBody>
                                </Table>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        )}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProjectsListCascade;
