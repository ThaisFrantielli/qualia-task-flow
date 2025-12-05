import { Portfolio } from '@/types';
import { ChevronRight, MoreVertical, Plus } from 'lucide-react';
import { TableRow, TableCell } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PortfolioSectionProps {
  portfolio: Portfolio;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddProject: () => void;
  projectCount: number;
}

export function PortfolioSection({
  portfolio,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddProject,
  projectCount,
}: PortfolioSectionProps) {
  return (
    <TableRow className="bg-muted/20 group hover:bg-muted/30 transition-colors">
      <TableCell colSpan={7} className="align-middle">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle();
            }}
            aria-label={isExpanded ? 'Recolher portfólio' : 'Expandir portfólio'}
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: portfolio.color || '#6366f1' }}
          />
          <span className="font-semibold text-base text-foreground truncate group-hover:text-primary transition-colors">
            {portfolio.name}
          </span>
          {portfolio.description && (
            <span className="text-xs text-muted-foreground ml-2 truncate italic">
              {portfolio.description}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-2 bg-muted px-2 py-0.5 rounded-full">
            {projectCount} {projectCount === 1 ? 'projeto' : 'projetos'}
          </span>
          
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="text-xs text-primary hover:underline px-2 py-1"
              onClick={(e) => {
                e.stopPropagation();
                onAddProject();
              }}
            >
              <Plus className="h-3 w-3 inline mr-1" />
              Projeto
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
