import { Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { TimeGranularity } from '@/contexts/MaintenanceFiltersContext';

interface TimeGranularityToggleProps {
  value: TimeGranularity;
  onChange: (value: TimeGranularity) => void;
  size?: 'sm' | 'md';
}

export function TimeGranularityToggle({ value, onChange, size = 'md' }: TimeGranularityToggleProps) {
  const buttonClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const iconClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className="flex gap-1 bg-slate-100 p-1 rounded">
      <button
        onClick={() => onChange('year')}
        className={`${buttonClass} rounded transition-all flex items-center gap-1.5 ${
          value === 'year' ? 'bg-white shadow text-amber-600 font-medium' : 'text-slate-600 hover:text-slate-900'
        }`}
        title="Agrupar por Ano"
      >
        <CalendarRange className={iconClass} />
        <span>Ano</span>
      </button>
      <button
        onClick={() => onChange('month')}
        className={`${buttonClass} rounded transition-all flex items-center gap-1.5 ${
          value === 'month' ? 'bg-white shadow text-amber-600 font-medium' : 'text-slate-600 hover:text-slate-900'
        }`}
        title="Agrupar por Mês"
      >
        <CalendarDays className={iconClass} />
        <span>Mês</span>
      </button>
      <button
        onClick={() => onChange('day')}
        className={`${buttonClass} rounded transition-all flex items-center gap-1.5 ${
          value === 'day' ? 'bg-white shadow text-amber-600 font-medium' : 'text-slate-600 hover:text-slate-900'
        }`}
        title="Agrupar por Dia"
      >
        <Calendar className={iconClass} />
        <span>Dia</span>
      </button>
    </div>
  );
}
