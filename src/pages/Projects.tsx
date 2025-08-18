// src/pages/Projects.tsx (VERSÃO FINAL CORRIGIDA E COMPLETA)

import React from 'react';
import { FolderOpen } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import ProjectListItem from '@/components/projects/ProjectListItem';
import { CreateProjectForm } from '@/components/CreateProjectForm';
import { Skeleton } from '@/components/ui/skeleton';

const ProjectsPage = () => {
  const { projects, loading: projectsLoading, refetch: refetchProjects } = useProjects();

  const handleProjectCreated = () => {
    if (refetchProjects) {
      refetchProjects();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="text-gray-600">Organize e acompanhe o andamento das suas iniciativas.</p>
        </div>
        <CreateProjectForm onProjectCreated={handleProjectCreated} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectsLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)
        ) : projects.length > 0 ? (
          projects.map((project) => (
            <ProjectListItem key={project.id} project={project} />
          ))
        ) : (
          <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg mt-8">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Você ainda não tem projetos</h3>
            <p className="text-gray-500 mt-2 mb-4">Crie seu primeiro projeto para começar a organizar suas tarefas.</p>
            <CreateProjectForm onProjectCreated={handleProjectCreated} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;