
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PresenceStatus } from '@/contexts/PresenceContext';

interface PresenceIndicatorProps {
  status: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const statusConfig: Record<PresenceStatus, { color: string; label: string }> = {
  online: { color: 'bg-green-500', label: 'Online' },
  busy: { color: 'bg-yellow-500', label: 'Ocupado' },
  away: { color: 'bg-orange-500', label: 'Ausente' },
  offline: { color: 'bg-muted-foreground/50', label: 'Offline' }
};

const sizeConfig = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3'
};

export function PresenceIndicator({ 
  status, 
  size = 'md', 
  showTooltip = true,
  className 
}: PresenceIndicatorProps) {
  const config = statusConfig[status];
  
  const indicator = (
    <span 
      className={cn(
        'rounded-full border-2 border-background',
        config.color,
        sizeConfig[size],
        status === 'online' && 'animate-pulse',
        className
      )} 
    />
  );

  if (!showTooltip) return indicator;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default PresenceIndicator;
