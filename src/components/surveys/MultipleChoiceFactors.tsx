import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface MultipleChoiceFactorsProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  otherText: string;
  onOtherTextChange: (text: string) => void;
  label?: string;
}

export const MultipleChoiceFactors = ({
  options,
  selected,
  onChange,
  otherText,
  onOtherTextChange,
  label = 'O que mais influenciou sua nota?',
}: MultipleChoiceFactorsProps) => {
  const [showOther, setShowOther] = useState(selected.includes('Outro') || otherText.length > 0);

  const handleToggle = (option: string) => {
    if (option === 'Outro') {
      setShowOther(!showOther);
      if (showOther) {
        onChange(selected.filter(s => s !== 'Outro'));
        onOtherTextChange('');
      } else {
        onChange([...selected, 'Outro']);
      }
      return;
    }

    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">{label}</Label>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map((option) => (
          <div
            key={option}
            onClick={() => handleToggle(option)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
              selected.includes(option)
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <Checkbox
              checked={selected.includes(option)}
              onCheckedChange={() => handleToggle(option)}
            />
            <span className="text-sm">{option}</span>
          </div>
        ))}
        
        {/* Other option */}
        <div
          onClick={() => handleToggle('Outro')}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
            showOther
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <Checkbox
            checked={showOther}
            onCheckedChange={() => handleToggle('Outro')}
          />
          <span className="text-sm">Outro</span>
        </div>
      </div>

      {showOther && (
        <Input
          placeholder="Especifique..."
          value={otherText}
          onChange={(e) => onOtherTextChange(e.target.value)}
          className="animate-fade-in"
        />
      )}
    </div>
  );
};
