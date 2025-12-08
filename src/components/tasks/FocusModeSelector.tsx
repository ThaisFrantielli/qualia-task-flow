// src/components/tasks/FocusModeSelector.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Target, ChevronDown, AlertTriangle, Clock, CalendarCheck, Flame, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FocusModeType = 
  | 'none'
  | 'high_priority' 
  | 'due_today' 
  | 'due_week' 
  | 'overdue' 
  | 'my_in_progress';

interface FocusModeSelectorProps {
  value: FocusModeType;
  onChange: (value: FocusModeType) => void;
  className?: string;
}

const focusModes: { key: FocusModeType; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'high_priority', label: 'Prioridade Alta', icon: <Flame className="h-4 w-4 text-destructive" />, description: 'Tarefas com prioridade alta' },
  { key: 'due_today', label: 'Vence Hoje', icon: <CalendarCheck className="h-4 w-4 text-warning" />, description: 'Tarefas com vencimento hoje' },
  { key: 'due_week', label: 'Esta Semana', icon: <Clock className="h-4 w-4 text-primary" />, description: 'Tarefas com vencimento nesta semana' },
  { key: 'overdue', label: 'Atrasadas', icon: <AlertTriangle className="h-4 w-4 text-destructive" />, description: 'Tarefas com prazo vencido' },
  { key: 'my_in_progress', label: 'Minhas em Andamento', icon: <Target className="h-4 w-4 text-success" />, description: 'Minhas tarefas em progresso' },
];

export function FocusModeSelector({ value, onChange, className }: FocusModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const activeMode = focusModes.find(m => m.key === value);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={value !== 'none' ? 'default' : 'outline'}
          className={cn(
            "flex items-center gap-2 transition-colors",
            value !== 'none' && "bg-primary text-primary-foreground hover:bg-primary/90",
            className
          )}
        >
          {activeMode?.icon || <Target className="h-4 w-4" />}
          <span className="hidden sm:inline">{activeMode?.label || 'Modo Foco'}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Selecione o Modo Foco</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {focusModes.map(mode => (
          <DropdownMenuItem
            key={mode.key}
            onClick={() => {
              onChange(mode.key);
              setOpen(false);
            }}
            className={cn(
              "flex items-start gap-3 p-3 cursor-pointer",
              value === mode.key && "bg-primary/10"
            )}
          >
            <div className="mt-0.5">{mode.icon}</div>
            <div className="flex-1">
              <div className="font-medium">{mode.label}</div>
              <div className="text-xs text-muted-foreground">{mode.description}</div>
            </div>
          </DropdownMenuItem>
        ))}
        
        {value !== 'none' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                onChange('none');
                setOpen(false);
              }}
              className="flex items-center gap-2 p-3 cursor-pointer text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span>Desativar Modo Foco</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
