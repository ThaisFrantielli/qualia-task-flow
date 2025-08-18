// src/components/projects/ProjectListItem.tsx (VERSÃO DASHBOARD)

import React from 'react';
import { Link } from 'react-router-dom';
import type { ProjectWithStats } from '@/hooks/useProjects'; // Importa o novo tipo
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MoreHorizontal, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProjectListItemProps {
  project: ProjectWithStats;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({ project }) => {
  const progress = project.task_count > 0 ? (project.completed_count / project.task_count) * 100 : 0;

  return (
    // O item da lista agora é um link para a página de detalhes do projeto
    <Link to={`/projects/${project.id}`} className="block">
      <div className="border rounded-lg bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 p-4 flex flex-col gap-4">
        {/* Cabeçalho com Nome, Cor e Ações */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#A1A1AA' }} />
            <h3 className="font-semibold text-lg text-gray-800">{project.name}</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-1" onClick={(e) => e.preventDefault()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Descrição do Projeto */}
        {project.description && (
          <p className="text-sm text-muted-foreground -mt-2">{project.description}</p>
        )}

        {/* Barra de Progresso */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-primary">Progresso</span>
            <span className="text-xs font-semibold">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Rodapé com Estatísticas */}
        <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-4">
            <span>Total: <strong>{project.task_count}</strong></span>
            <span>Concluídas: <strong className="text-green-600">{project.completed_count}</strong></span>
          </div>
          {project.late_count > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              {project.late_count} Atrasada(s)
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProjectListItem;