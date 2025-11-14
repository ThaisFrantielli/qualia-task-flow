// src/components/tasks/TaskTableRow.tsx

import React, { useEffect, useState } from 'react';
import type { TaskWithDetails } from '@/types';
import { TableRow, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { canEditProject } from '@/lib/hierarchyUtils';
import { useNavigate } from 'react-router-dom';
import { 
  MoreHorizontal, Eye, Edit, Archive, Trash2, 
  Circle, CircleCheck, CircleDashed, AlertOctagon,
  ArrowDown, ArrowRight, ArrowUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- A CORREÇÃO OBRIGATÓRIA ESTÁ AQUI ---
// A interface de props PRECISA incluir a linha 'onDeleteRequest'.
interface TaskTableRowProps {
  task: TaskWithDetails;
  onViewDetails: (task: TaskWithDetails) => void;
  onDeleteRequest: (task: TaskWithDetails) => void; // <--- ESTA LINHA CORRIGE O ERRO
}

// Mapeamentos de status e prioridade (sem alterações)
const statusConfig = {
  todo: { label: 'A Fazer', icon: CircleDashed, color: 'text-gray-500' },
  progress: { label: 'Em Progresso', icon: Circle, color: 'text-blue-500' },
  done: { label: 'Concluído', icon: CircleCheck, color: 'text-green-500' },
  late: { label: 'Atrasado', icon: AlertOctagon, color: 'text-red-500' },
};
const priorityConfig = {
  low: { label: 'Baixa', icon: ArrowDown, color: 'text-gray-500' },
  medium: { label: 'Média', icon: ArrowRight, color: 'text-yellow-500' },
  high: { label: 'Alta', icon: ArrowUp, color: 'text-red-500' },
};
const getInitials = (name: string | null) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

// O componente agora recebe 'onDeleteRequest' como uma prop
const TaskTableRow: React.FC<TaskTableRowProps> = ({ task, onViewDetails, onDeleteRequest }) => {
  const currentStatus = statusConfig[task.status as keyof typeof statusConfig || 'todo'];
  const currentPriority = priorityConfig[task.priority as keyof typeof priorityConfig || 'low'];
  const handleActionClick = (e: React.MouseEvent) => e.stopPropagation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [hierarchyData, setHierarchyData] = useState<{ user_id: string; supervisor_id: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.from('user_hierarchy').select('user_id, supervisor_id');
        if (!mounted) return;
        setHierarchyData((data as any) || []);
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const projectObj = (task as any).project || (task as any).project_id ? { id: (task as any).project?.id || (task as any).project_id, user_id: (task as any).project?.user_id } : null;
  const canEditProj = projectObj && user ? canEditProject(projectObj as any, user as any, hierarchyData) : false;

  return (
    <TableRow 
      className="hover:bg-muted/50 cursor-pointer"
      onClick={() => onViewDetails(task)}
    >
      <TableCell className="font-medium">{task.title}</TableCell>
      <TableCell>
        <div className={cn("flex items-center gap-2 text-sm", currentStatus.color)}>
          <currentStatus.icon className="h-4 w-4" />
          <span>{currentStatus.label}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className={cn("flex items-center gap-2 text-sm", currentPriority.color)}>
          <currentPriority.icon className="h-4 w-4" />
          <span>{currentPriority.label}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={task.assignee_avatar || undefined} />
            <AvatarFallback className="text-xs">{getInitials(task.assignee_name)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-700">{task.assignee_name || 'N/A'}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" onClick={handleActionClick}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={handleActionClick}>
            <DropdownMenuItem onClick={() => onViewDetails(task)}>
              <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" /> Editar Tarefa
            </DropdownMenuItem>
            {projectObj && canEditProj && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/projects/${projectObj.id}`); }}>
                <Edit className="mr-2 h-4 w-4" /> Editar Projeto
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Archive className="mr-2 h-4 w-4" /> Arquivar
            </DropdownMenuItem>
            {/* O onClick agora chama a prop 'onDeleteRequest' que foi adicionada */}
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDeleteRequest(task)}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default TaskTableRow;