import React from 'react';
import { Project } from '@/types';
import { ChevronRight, MoreVertical, Settings } from 'lucide-react';
import { TableRow, TableCell } from '@/components/ui/table';
import { TaskProgressBar } from '@/components/tasks/TaskProgressBar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

interface ProjectRowProps {
  project: Project;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onManageSections?: () => void;
  taskCount: number;
  completedCount: number;
  indentLevel?: number;
  highlighted?: boolean;
  innerRef?: React.Ref<HTMLTableRowElement>;
}

export function ProjectRow({
  project,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onManageSections,
  taskCount,
  completedCount,
  indentLevel = 0,
  highlighted = false,
  innerRef,
}: ProjectRowProps) {
  const navigate = useNavigate();
  const paddingLeft = 8 + indentLevel * 24;

  return (
    <TableRow
      ref={innerRef}
      className={`bg-muted/30 group hover:bg-muted/50 transition-colors cursor-pointer ${
        highlighted ? 'ring-2 ring-primary/40 animate-pulse' : ''
      }`}
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <TableCell className="align-middle w-0" style={{ width: 48, paddingLeft }}>
        <button
          type="button"
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
          aria-label={isExpanded ? 'Recolher projeto' : 'Expandir projeto'}
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </button>
      </TableCell>
      <TableCell colSpan={5} className="py-2 align-middle">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: project.color || '#A1A1AA' }}
          />
          <span className="font-semibold text-base text-foreground truncate group-hover:text-primary transition-colors">
            {project.name}
          </span>
          {project.description && (
            <span className="text-xs text-muted-foreground ml-2 truncate italic max-w-[200px]">
              {project.description}
            </span>
          )}
          <TaskProgressBar
            total={taskCount}
            completed={completedCount}
            className="ml-4"
            size="sm"
          />
        </div>
      </TableCell>
      <TableCell className="align-middle">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 rounded-full hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>
              Abrir Projeto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>Editar Projeto</DropdownMenuItem>
            {onManageSections && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onManageSections}>
                  <Settings className="h-4 w-4 mr-2" />
                  Gerenciar Seções
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
