import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { RenewalStrategy, RenewalStrategyLabel } from '@/types/contracts';

const STRATEGY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  NO_RENEW: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  NO_RENEW_RETURN: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  RENEW_SAME: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  RENEW_SWAP_SEMINOVO: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  RENEW_SWAP_ZERO: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  SUBLEASE: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  WAIT_PERIOD: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  UNDEFINED: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },
};

// Short labels for compact display
const SHORT_LABELS: Record<string, string> = {
  NO_RENEW: 'Não Renova',
  NO_RENEW_RETURN: 'Retorna Frota',
  RENEW_SAME: 'Renova Mesmo',
  RENEW_SWAP_SEMINOVO: 'Troca Seminovo',
  RENEW_SWAP_ZERO: 'Troca Zero',
  SUBLEASE: 'Sublocado',
  WAIT_PERIOD: 'Aguardando',
  UNDEFINED: 'Indefinido',
};

interface ActionPickerProps {
  value: RenewalStrategy | string | null | undefined;
  onChange: (value: RenewalStrategy) => void;
  disabled?: boolean;
}

export default function ActionPicker({ value, onChange, disabled }: ActionPickerProps) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const colors = value && STRATEGY_COLORS[value] ? STRATEGY_COLORS[value] : { bg: 'bg-slate-100', text: 'text-slate-400', border: 'border-slate-200' };
  const label = value ? (SHORT_LABELS[value] || RenewalStrategyLabel[value as RenewalStrategy] || value) : 'Definir';

  const handleSelect = (key: string) => {
    onChange(key as RenewalStrategy);
    setOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div ref={ref} className="relative inline-block" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-all duration-150 cursor-pointer hover:shadow-sm ${colors.bg} ${colors.text} ${colors.border} ${!value ? 'border-dashed' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {saved ? <Check size={12} className="text-green-600 shrink-0" /> : null}
        <span className="truncate max-w-[100px]">{label}</span>
        <ChevronDown size={12} className="shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[100] animate-in fade-in zoom-in-95 duration-100">
          {Object.entries(RenewalStrategyLabel).map(([key, lbl]) => {
            const c = STRATEGY_COLORS[key] || { bg: '', text: 'text-slate-700', border: '' };
            const isActive = value === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key)}
                className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 transition-colors hover:bg-slate-50 ${isActive ? 'font-semibold' : ''} ${c.text}`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.bg} border ${c.border}`} />
                <span className="truncate">{lbl}</span>
                {isActive && <Check size={12} className="ml-auto text-green-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
