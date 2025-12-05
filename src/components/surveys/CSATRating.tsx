import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { csatLabels, csatDescriptions } from '@/types/surveys';

interface CSATRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CSATRating = ({ value, onChange, showLabels = true, size = 'lg' }: CSATRatingProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const containerClasses = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-3',
  };

  return (
    <div className="space-y-4">
      <div className={cn("flex justify-center", containerClasses[size])}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={cn(
              "transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded-full p-1",
              value && star <= value ? "text-yellow-400" : "text-gray-300 hover:text-yellow-200"
            )}
          >
            <Star
              className={cn(sizeClasses[size], "transition-all")}
              fill={value && star <= value ? "currentColor" : "none"}
            />
          </button>
        ))}
      </div>
      
      {showLabels && value && (
        <div className="text-center animate-fade-in">
          <p className={cn(
            "font-semibold",
            value <= 2 ? "text-red-600" : 
            value === 3 ? "text-yellow-600" : 
            "text-green-600"
          )}>
            {csatLabels[value]}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {csatDescriptions[value]}
          </p>
        </div>
      )}
    </div>
  );
};
