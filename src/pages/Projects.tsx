// src/pages/Projects.tsx

import { useState } from 'react'; // 'React' agora é importado apenas como useState, removendo o aviso
import { FolderOpen, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { CreateProjectForm } from '@/components/CreateProjectForm';
import ProjectListItem from '@/components/projects/ProjectListItem';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import { useProjects } from '@/hooks/useProjects';
import { useTasks, TaskWithAssigneeProfile } from '@/hooks/useTasks'; // Importa o tipo específico do hook
import type { Project } from '@/types'; // Mantém a importação de Project, pois é usada no ProjectListItem

const ProjectsPage = () => {
  const { projects, loading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { tasks, loading: tasksLoading } = useTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<TaskWithAssigneeProfile | null>(null);

  const handleProjectCreated = () => {
    if (refetchProjects) {
      refetchProjects();
    } else {
      window.location.reload();
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tasksWithoutProject = tasks.filter(task => !task.project_id);

  if (projectsLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando seus projetos...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projetos</h1>
            <p className="text-muted-foreground">Gerencie seus projetos e o progresso das tarefas.</p>
          </div>
          <CreateProjectForm onProjectCreated={handleProjectCreated} />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Buscar projetos..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10 bg-background" 
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtros
          </Button>
        </div>

        <div className="space-y-3">
          {tasksWithoutProject.length > 0 && (
            <ProjectListItem
              project={{ id: 'sem-projeto', name: 'Sem Projeto', description: null, color: '#808080', created_at: '', updated_at: '', user_id: null }}
              tasks={tasksWithoutProject}
              onTaskClick={(task) => setSelectedTask(task)}
            />
          )}

          {filteredProjects.map((project) => (
            <ProjectListItem
              key={project.id}
              project={project}
              tasks={tasks.filter(task => task.project_id === project.id)}
              onTaskClick={(task) => setSelectedTask(task)}
            />
          ))}
          
          {filteredProjects.length === 0 && tasksWithoutProject.length === 0 && (
            <div className="text-center py-16">
              <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Nenhum projeto encontrado</h3>
              <p className="text-muted-foreground mt-2">
                Que tal criar seu primeiro projeto?
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(isOpen) => !isOpen && setSelectedTask(null)}
        />
      )}
    </>
  );
};

export default ProjectsPage;

