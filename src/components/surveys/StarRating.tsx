import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
}

const labels = {
  1: "Muito Insatisfeito",
  2: "Insatisfeito", 
  3: "Neutro",
  4: "Satisfeito",
  5: "Muito Satisfeito"
};

export const StarRating = ({ value, onChange, size = "md", showLabels = true }: StarRatingProps) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10"
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={cn(
              "transition-all duration-200 hover:scale-110",
              sizeClasses[size]
            )}
          >
            <Star
              className={cn(
                "w-full h-full transition-colors",
                star <= value
                  ? "fill-quality-orange text-quality-orange"
                  : "text-gray-300 hover:text-quality-orange"
              )}
            />
          </button>
        ))}
      </div>
      
      {showLabels && value > 0 && (
        <div className="text-center">
          <p className="text-sm font-medium text-quality-text">
            {labels[value as keyof typeof labels]}
          </p>
        </div>
      )}
    </div>
  );
};