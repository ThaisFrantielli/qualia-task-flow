import { ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type GranularityLevel = 'year' | 'month' | 'day';

interface ChartDrillDownHeaderProps {
  title: string;
  description?: string;
  currentLevel: GranularityLevel;
  onLevelChange: (level: GranularityLevel) => void;
  className?: string;
}

const levelHierarchy: GranularityLevel[] = ['year', 'month', 'day'];

const levelLabels: Record<GranularityLevel, string> = {
  year: 'Ano',
  month: 'Mês',
  day: 'Dia',
};

export function ChartDrillDownHeader({
  title,
  description,
  currentLevel,
  onLevelChange,
  className,
}: ChartDrillDownHeaderProps) {
  const currentIndex = levelHierarchy.indexOf(currentLevel);
  const canDrillUp = currentIndex > 0;
  const canDrillDown = currentIndex < levelHierarchy.length - 1;

  const handleDrillUp = () => {
    if (canDrillUp) {
      onLevelChange(levelHierarchy[currentIndex - 1]);
    }
  };

  const handleDrillDown = () => {
    if (canDrillDown) {
      onLevelChange(levelHierarchy[currentIndex + 1]);
    }
  };

  return (
    <div className={cn('flex items-start justify-between mb-4', className)}>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
      </div>
      
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDrillUp}
          disabled={!canDrillUp}
          className="h-6 w-6 p-0 hover:bg-slate-200"
          title="Expandir (nível acima)"
        >
          <ZoomOut className={cn('h-3.5 w-3.5', !canDrillUp && 'opacity-30')} />
        </Button>
        
        <div className="flex items-center gap-0.5 px-1">
          {levelHierarchy.map((level) => (
            <button
              key={level}
              onClick={() => onLevelChange(level)}
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded transition-colors font-medium',
                level === currentLevel
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-500 hover:bg-slate-200'
              )}
            >
              {levelLabels[level]}
            </button>
          ))}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDrillDown}
          disabled={!canDrillDown}
          className="h-6 w-6 p-0 hover:bg-slate-200"
          title="Detalhar (nível abaixo)"
        >
          <ZoomIn className={cn('h-3.5 w-3.5', !canDrillDown && 'opacity-30')} />
        </Button>
      </div>
    </div>
  );
}
