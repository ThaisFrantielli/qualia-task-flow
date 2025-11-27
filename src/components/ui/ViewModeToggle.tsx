import * as React from 'react';

interface ViewModeToggleProps {
  modoLista: boolean;
  onChange: (isList: boolean) => void;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ modoLista, onChange }) => {
  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-full px-1 py-1">
      <button
        type="button"
        className={`px-3 py-1 rounded-full text-sm font-medium transition focus:outline-none ${!modoLista ? 'bg-primary text-white' : 'bg-transparent text-primary'}`}
        onClick={() => onChange(false)}
        aria-pressed={!modoLista}
      >
        Cards
      </button>
      <button
        type="button"
        className={`px-3 py-1 rounded-full text-sm font-medium transition focus:outline-none ${modoLista ? 'bg-primary text-white' : 'bg-transparent text-primary'}`}
        onClick={() => onChange(true)}
        aria-pressed={modoLista}
      >
        Lista
      </button>
    </div>
  );
};
