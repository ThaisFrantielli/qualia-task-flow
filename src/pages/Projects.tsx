// src/pages/Projects.tsx

import React from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import ProjectListItem from '@/components/projects/ProjectListItem'; // Usando o novo componente
import { Button } from '@/components/ui/button';
import { CreateProjectForm } from '@/components/CreateProjectForm'; // Usando seu formulário de criação
import { Skeleton } from '@/components/ui/skeleton'; // Para o estado de carregamento

const ProjectsPage = () => {
  const { projects, loading: projectsLoading, refetch: refetchProjects } = useProjects();
  
  // Filtra a opção "Todos os Projetos" que pode vir do hook
  const projectList = projects.filter(p => p.id !== 'all');

  const handleProjectCreated = () => {
    if (refetchProjects) refetchProjects();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="text-gray-600">Organize e acompanhe o andamento das suas iniciativas.</p>
        </div>
        {/* O botão "Novo Projeto" agora está dentro do componente de formulário */}
        <CreateProjectForm onProjectCreated={handleProjectCreated} />
      </div>
      
      {/* TODO: Adicionar filtros e busca aqui no futuro */}

      <div className="space-y-3">
        {projectsLoading ? (
          // Skeletons para o estado de carregamento
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : projectList.length > 0 ? (
          projectList.map((project) => (
            <ProjectListItem key={project.id} project={project} />
          ))
        ) : (
          // Estado Vazio Caprichado
          <div className="text-center py-16 border-2 border-dashed rounded-lg mt-8">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Você ainda não tem projetos</h3>
            <p className="text-gray-500 mt-2 mb-4">Clique no botão abaixo para criar seu primeiro projeto e organizar suas tarefas.</p>
            <CreateProjectForm onProjectCreated={handleProjectCreated} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;