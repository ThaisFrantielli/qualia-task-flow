import * as React from 'react';
import { LayoutList, LayoutGrid } from 'lucide-react';

interface ViewModeIconToggleProps {
  modoLista: boolean;
  onChange: (isList: boolean) => void;
}

export const ViewModeIconToggle: React.FC<ViewModeIconToggleProps> = ({ modoLista, onChange }) => {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={`p-2 rounded-full transition focus:outline-none ${!modoLista ? 'bg-primary text-white' : 'bg-gray-100 text-primary'}`}
        onClick={() => onChange(false)}
        aria-label="Ver em cards"
      >
        <LayoutGrid size={18} />
      </button>
      <button
        type="button"
        className={`p-2 rounded-full transition focus:outline-none ${modoLista ? 'bg-primary text-white' : 'bg-gray-100 text-primary'}`}
        onClick={() => onChange(true)}
        aria-label="Ver em lista"
      >
        <LayoutList size={18} />
      </button>
    </div>
  );
};
