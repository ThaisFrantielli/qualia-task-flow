import { cn } from '@/lib/utils';

interface NPSScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  showLabels?: boolean;
}

export const NPSScale = ({ value, onChange, showLabels = true }: NPSScaleProps) => {
  const getScoreColor = (score: number) => {
    if (score <= 6) return 'bg-red-500 hover:bg-red-600';
    if (score <= 8) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-green-500 hover:bg-green-600';
  };

  const getSelectedColor = (score: number) => {
    if (score <= 6) return 'ring-red-500 bg-red-500';
    if (score <= 8) return 'ring-yellow-500 bg-yellow-500';
    return 'ring-green-500 bg-green-500';
  };

  const getScoreLabel = (score: number | null) => {
    if (score === null) return '';
    if (score <= 6) return 'Detrator';
    if (score <= 8) return 'Neutro';
    return 'Promotor';
  };

  const getScoreDescription = (score: number | null) => {
    if (score === null) return '';
    if (score <= 6) return 'Pouco provável de recomendar';
    if (score <= 8) return 'Neutro em relação à recomendação';
    return 'Muito provável de recomendar';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={cn(
              "w-9 h-9 rounded-full text-white font-semibold text-sm transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              value === score 
                ? cn("ring-2 ring-offset-2 scale-110", getSelectedColor(score))
                : cn(getScoreColor(score), "opacity-70 hover:opacity-100 hover:scale-105")
            )}
          >
            {score}
          </button>
        ))}
      </div>
      
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Nada provável</span>
          <span>Extremamente provável</span>
        </div>
      )}

      {value !== null && (
        <div className="text-center animate-fade-in">
          <p className={cn(
            "font-semibold",
            value <= 6 ? "text-red-600" : 
            value <= 8 ? "text-yellow-600" : 
            "text-green-600"
          )}>
            {getScoreLabel(value)}
          </p>
          <p className="text-sm text-muted-foreground">
            {getScoreDescription(value)}
          </p>
        </div>
      )}
    </div>
  );
};
