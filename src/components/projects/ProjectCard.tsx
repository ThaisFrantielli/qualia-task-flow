// src/components/projects/ProjectCard.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '@/types';
import type { TaskWithAssigneeProfile } from '@/hooks/useTasks';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProjectCardProps {
  project: Project;
  tasks: TaskWithAssigneeProfile[];
}

const getInitials = (name: string | null): string => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, tasks }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const members = [...new Map(tasks.filter(t => t.assignee_name).map(t => [t.assignee_id, { name: t.assignee_name }])).values()]
    .slice(0, 4); 

  return (
    <Card className="flex flex-col hover:border-primary transition-all duration-300">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#6b7280' }} />
            <CardTitle className="text-lg leading-tight">{project.name}</CardTitle>
          </div>
        </div>
        <CardDescription className="line-clamp-2 h-[40px] pt-1">{project.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2 text-sm text-muted-foreground">
            <span>Progresso</span>
            <span className="font-semibold text-foreground">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{completedTasks}</span> de {totalTasks} tarefas concluídas
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between items-center border-t pt-4">
        <TooltipProvider>
            <div className="flex -space-x-2">
            {members.map((member, index) => (
                <Tooltip key={index}>
                    <TooltipTrigger asChild>
                        <Avatar className="h-8 w-8 border-2 border-background">
                            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{member.name}</p>
                    </TooltipContent>
                </Tooltip>
            ))}
            </div>
        </TooltipProvider>
        
        <Link to={`/projects/${project.id}`} className="text-sm font-semibold text-primary hover:underline">
          Ver detalhes
        </Link>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;