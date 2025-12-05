import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskProgressBarProps {
  total: number;
  completed: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TaskProgressBar({
  total,
  completed,
  className,
  showLabel = true,
  size = 'md',
}: TaskProgressBarProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const widthClasses = {
    sm: 'w-16',
    md: 'w-24',
    lg: 'w-32',
  };

  const getProgressColor = () => {
    if (percent === 100) return 'bg-green-500';
    if (percent >= 75) return 'bg-emerald-500';
    if (percent >= 50) return 'bg-blue-500';
    if (percent >= 25) return 'bg-amber-500';
    return 'bg-primary';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)}>
            <div className={cn('bg-muted rounded-full overflow-hidden', sizeClasses[size], widthClasses[size])}>
              <div
                className={cn('h-full rounded-full transition-all duration-300', getProgressColor())}
                style={{ width: `${percent}%` }}
              />
            </div>
            {showLabel && (
              <span className={cn('text-muted-foreground font-mono', size === 'sm' ? 'text-[10px]' : 'text-xs')}>
                {percent}%
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {completed} de {total} concluídas ({percent}%)
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
