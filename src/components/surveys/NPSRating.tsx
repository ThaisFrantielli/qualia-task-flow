import { cn } from "@/lib/utils";

interface NPSRatingProps {
  value: number;
  onChange: (value: number) => void;
}

export const NPSRating = ({ value, onChange }: NPSRatingProps) => {
  const getButtonColor = (score: number) => {
    if (score <= 6) return "bg-red-100 hover:bg-red-200 text-red-700 border-red-300";
    if (score <= 8) return "bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-yellow-300";
    return "bg-green-100 hover:bg-green-200 text-green-700 border-green-300";
  };

  const getSelectedColor = (score: number) => {
    if (score <= 6) return "bg-red-500 text-white border-red-500";
    if (score <= 8) return "bg-yellow-500 text-white border-yellow-500";
    return "bg-green-500 text-white border-green-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span>Nada provável</span>
        <span>Extremamente provável</span>
      </div>
      
      <div className="grid grid-cols-11 gap-2">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={cn(
              "w-10 h-10 rounded-lg border-2 font-semibold transition-all duration-200 hover:scale-105",
              value === score 
                ? getSelectedColor(score)
                : getButtonColor(score)
            )}
          >
            {score}
          </button>
        ))}
      </div>

      {value !== -1 && (
        <div className="text-center text-sm">
          {value <= 6 && (
            <p className="text-red-600 font-medium">Detrator - Cliente insatisfeito</p>
          )}
          {value >= 7 && value <= 8 && (
            <p className="text-yellow-600 font-medium">Passivo - Cliente neutro</p>
          )}
          {value >= 9 && (
            <p className="text-green-600 font-medium">Promotor - Cliente leal</p>
          )}
        </div>
      )}
    </div>
  );
};