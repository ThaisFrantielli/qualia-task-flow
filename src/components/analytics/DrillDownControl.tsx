import { ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type GranularityLevel = 'year' | 'month' | 'day';

interface DrillDownControlProps {
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

const levelIcons: Record<GranularityLevel, string> = {
  year: '📅',
  month: '📆',
  day: '📋',
};

export function DrillDownControl({
  currentLevel,
  onLevelChange,
  className,
}: DrillDownControlProps) {
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

  const getBreadcrumb = () => {
    return levelHierarchy.slice(0, currentIndex + 1).map((level, idx) => (
      <span key={level} className="flex items-center">
        {idx > 0 && <span className="mx-1 text-slate-400">→</span>}
        <button
          onClick={() => onLevelChange(level)}
          className={cn(
            'text-xs px-2 py-1 rounded transition-colors',
            level === currentLevel
              ? 'bg-amber-100 text-amber-700 font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          {levelIcons[level]} {levelLabels[level]}
        </button>
      </span>
    ));
  };

  return (
    <div className={cn('flex items-center gap-2 bg-slate-50 rounded-lg p-2 border', className)}>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDrillUp}
          disabled={!canDrillUp}
          className="h-7 w-7 p-0"
          title="Expandir (nível acima)"
        >
          <ChevronUp className={cn('h-4 w-4', !canDrillUp && 'opacity-30')} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDrillDown}
          disabled={!canDrillDown}
          className="h-7 w-7 p-0"
          title="Detalhar (nível abaixo)"
        >
          <ChevronDown className={cn('h-4 w-4', !canDrillDown && 'opacity-30')} />
        </Button>
      </div>
      
      <div className="h-5 w-px bg-slate-300" />
      
      <div className="flex items-center gap-1">
        {getBreadcrumb()}
      </div>

      <div className="ml-auto flex items-center gap-1 text-xs text-slate-500">
        <Calendar className="h-3 w-3" />
        <span>Drill-down</span>
      </div>
    </div>
  );
}
