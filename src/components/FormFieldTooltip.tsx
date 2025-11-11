// src/components/FormFieldTooltip.tsx
import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface FormFieldTooltipProps {
  title: string;
  description: string;
  examples?: string[];
}

export function FormFieldTooltip({ title, description, examples }: FormFieldTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className="ml-1.5 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
        aria-label="Mais informações"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isOpen && (
        <div 
          className="absolute z-50 w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-xl left-6 top-0"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-900">{title}</h4>
            <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
            
            {examples && examples.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-700 mb-2">Exemplos:</p>
                <ul className="text-xs text-gray-600 space-y-1.5">
                  {examples.map((example, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2 flex-shrink-0">•</span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
