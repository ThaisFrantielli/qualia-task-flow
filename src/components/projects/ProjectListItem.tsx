// src/components/projects/ProjectListItem.tsx (COLE ESTE CÓDIGO)

import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, ListTodo } from 'lucide-react';
import { type ProjectWithStats } from '@/hooks/useProjects'; // Importa o tipo do hook

interface ProjectListItemProps {
  project: ProjectWithStats;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({ project }) => {
  const progress = project.task_count > 0 ? (project.completed_count / project.task_count) * 100 : 0;

  return (
    <Link to={`/projects/${project.id}`}>
      <Card className="hover:border-primary transition-colors h-full flex flex-col">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: project.color || '#9ca3af' }} />
            <CardTitle className="truncate">{project.name}</CardTitle>
          </div>
          <CardDescription className="line-clamp-2 h-[40px]">{project.description || 'Sem descrição.'}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground flex justify-between">
            <div className="flex items-center gap-1.5" title="Total de Tarefas">
                <ListTodo className="h-3.5 w-3.5" />
                <span>{project.task_count}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Tarefas Concluídas">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                <span>{project.completed_count}</span>
            </div>
            {project.late_count > 0 && (
                <div className="flex items-center gap-1.5 text-red-500" title="Tarefas Atrasadas">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{project.late_count}</span>
                </div>
            )}
        </CardFooter>
      </Card>
    </Link>
  );
};

export default ProjectListItem;