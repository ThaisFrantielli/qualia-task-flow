
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, ChevronRight } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import SubtasksCascade from './SubtasksCascade';


interface ProjectsListCascadeProps {
  projetos: any[];
}

const ProjectsListCascade: React.FC<ProjectsListCascadeProps> = ({ projetos }) => {
  const navigate = useNavigate();
  const { tasks } = useTasks({});

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
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border rounded-lg shadow-sm">
        <thead>
          <tr className="bg-muted/40 text-xs text-gray-600">
            <th className="px-4 py-2 text-left font-semibold">Projeto</th>
            <th className="px-4 py-2 text-left font-semibold">Tarefa</th>
            <th className="px-4 py-2 text-left font-semibold">Responsável</th>
            <th className="px-4 py-2 text-left font-semibold">Prazo</th>
            <th className="px-4 py-2 text-left font-semibold">Prioridade</th>
          </tr>
        </thead>
        <tbody>
          {projetos.map((project) => {
            const projectTasks = tasks.filter((t) => t.project_id === project.id);
            if (projectTasks.length === 0) {
              return (
                <tr key={project.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                  <td className="px-4 py-2 font-semibold text-primary" colSpan={5}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#A1A1AA' }} />
                      <span>{project.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">(sem tarefas)</span>
                    </div>
                  </td>
                </tr>
              );
            }
            return projectTasks.map((task, idx) => (
              <React.Fragment key={task.id}>
                <tr className="border-b group hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/tasks/${task.id}`)}>
                  <td className="px-4 py-2 w-1/4 font-semibold text-primary">
                    {idx === 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#A1A1AA' }} />
                        <span>{project.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 w-2/5">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{task.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      {task.assignee?.avatar_url && (
                        <img src={task.assignee.avatar_url} alt="avatar" className="h-6 w-6 rounded-full" />
                      )}
                      <span className="text-muted-foreground">{task.assignee?.full_name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold">
                      {task.priority || 'Normal'}
                    </span>
                  </td>
                </tr>
                <SubtasksCascade taskId={task.id} />
              </React.Fragment>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectsListCascade;
