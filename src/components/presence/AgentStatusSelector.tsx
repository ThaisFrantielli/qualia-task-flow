
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePresenceOptional, type PresenceStatus } from '@/contexts/PresenceContext';
import { cn } from '@/lib/utils';
import { ChevronDown, Circle } from 'lucide-react';

const statusOptions: { value: PresenceStatus; label: string; color: string }[] = [
  { value: 'online', label: 'Online', color: 'bg-green-500' },
  { value: 'busy', label: 'Ocupado', color: 'bg-yellow-500' },
  { value: 'away', label: 'Ausente', color: 'bg-orange-500' },
];

interface AgentStatusSelectorProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function AgentStatusSelector({ className, variant = 'default' }: AgentStatusSelectorProps) {
  const presence = usePresenceOptional();

  if (!presence) return null;

  const { myStatus, setMyStatus } = presence;
  const currentOption = statusOptions.find(s => s.value === myStatus) || statusOptions[0];

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={cn('gap-2 h-8', className)}>
            <span className={cn('w-2 h-2 rounded-full', currentOption.color)} />
            <span className="text-xs">{currentOption.label}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {statusOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setMyStatus(option.value)}
              className="gap-2"
            >
              <span className={cn('w-2 h-2 rounded-full', option.color)} />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn('gap-2', className)}>
          <span className={cn('w-2.5 h-2.5 rounded-full', currentOption.color)} />
          <span>{currentOption.label}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setMyStatus(option.value)}
            className="gap-2"
          >
            <span className={cn('w-2.5 h-2.5 rounded-full', option.color)} />
            {option.label}
            {myStatus === option.value && (
              <Circle className="h-2 w-2 fill-current ml-auto" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AgentStatusSelector;
