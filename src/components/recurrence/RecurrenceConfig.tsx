import React from 'react';

interface RecurrenceConfigProps {
  value: {
    pattern?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'yearly' | null;
    interval?: number;
    days?: number[];
    endDate?: string | null;
  };
  onChange: (v: any) => void;
}

export default function RecurrenceConfig({ value, onChange }: RecurrenceConfigProps) {
  const handlePattern = (e: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...value, pattern: e.target.value || null });

  return (
    <div className="space-y-2">
      <label className="block text-sm">Padrão</label>
      <select value={value.pattern || ''} onChange={handlePattern} className="border rounded px-2 py-1">
        <option value="">Selecione</option>
        <option value="daily">Diária</option>
        <option value="weekly">Semanal</option>
        <option value="monthly">Mensal</option>
        <option value="quarterly">Trimestral</option>
        <option value="semiannual">Semestral</option>
        <option value="yearly">Anual</option>
      </select>

      <label className="block text-sm">Intervalo (a cada X)</label>
      <input
        type="number"
        min={1}
        value={value.interval ?? 1}
        onChange={e => onChange({ ...value, interval: Math.max(1, parseInt(e.target.value || '1', 10)) })}
        className="border rounded px-2 py-1 w-24"
      />

      {/* Fornece um lugar simples para selecionar dias semanais — o componente pode ser melhorado depois */}
      {value.pattern === 'weekly' && (
        <div>
          <label className="block text-sm">Dias da semana (ex: 1,3,5)</label>
          <input
            type="text"
            value={Array.isArray(value.days) ? value.days.join(',') : ''}
            onChange={e => onChange({ ...value, days: e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n)) })}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
      )}

      <label className="block text-sm">Termina em (opcional)</label>
      <input
        type="date"
        value={value.endDate ?? ''}
        onChange={e => onChange({ ...value, endDate: e.target.value || null })}
        className="border rounded px-2 py-1"
      />
    </div>
  );
}
