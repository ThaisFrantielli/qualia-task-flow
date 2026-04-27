import React, { useMemo, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

export type OptionItem = string | { value: string; label: string };

function getOptionValue(opt: OptionItem): string {
  return typeof opt === 'string' ? opt : opt.value;
}

function getOptionLabel(opt: OptionItem): string {
  return typeof opt === 'string' ? opt : opt.label;
}

interface CompactMultiSelectProps {
  options: OptionItem[];
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export const CompactMultiSelect: React.FC<CompactMultiSelectProps> = ({
  options,
  selected,
  onSelectedChange,
  label,
  placeholder = 'Selecione...',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(100);
  const listRef = useRef<HTMLDivElement | null>(null);

  const optionValues = useMemo(() => options.map(getOptionValue), [options]);
  const optionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of options) {
      map.set(getOptionValue(opt), getOptionLabel(opt));
    }
    return map;
  }, [options]);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(o => getOptionLabel(o).toLowerCase().includes(q));
  }, [options, query]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const displayText = useMemo(() => {
    if (selected.length === 0) return placeholder;
    const labels = selected.map(v => optionMap.get(v) || v);
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  }, [selected, placeholder, optionMap]);

  const toggle = useCallback((optValue: string) => {
    if (selected.includes(optValue)) onSelectedChange(selected.filter(s => s !== optValue));
    else onSelectedChange([...selected, optValue]);
  }, [selected, onSelectedChange]);

  const selectAll = useCallback(() => {
    if (selected.length === optionValues.length) onSelectedChange([]);
    else onSelectedChange([...optionValues]);
  }, [selected, optionValues, onSelectedChange]);

  return (
    <div className={cn('w-full relative', className)}>
      {label && <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>}
      <Button variant="outline" className={`w-full justify-between ${open ? 'border-blue-500 ring-1 ring-blue-200' : ''}`} onClick={() => setOpen(o => !o)}>
        <span className="truncate text-left flex-1">{displayText}</span>
        <div className="ml-2 text-sm text-slate-500">{selected.length > 0 ? selected.length : ''}</div>
      </Button>

      {open && (
        <div className="absolute left-0 mt-1 w-[280px] z-50 bg-white border rounded shadow p-2">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setVisibleCount(100); }} placeholder="Buscar..." className="flex-1 bg-transparent outline-none text-sm" />
            <button onClick={() => { setQuery(''); setVisibleCount(100); }} className="text-sm text-slate-400">Limpar</button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <button onClick={selectAll} className="text-sm text-slate-700">{selected.length === optionValues.length ? 'Desmarcar todos' : 'Selecionar todos'}</button>
            <div className="text-xs text-slate-500">{filtered.length} itens</div>
          </div>
          <div ref={listRef} style={{ maxHeight: 300, overflowY: 'auto' }}>
            {filtered.slice(0, visibleCount).map(opt => {
              const value = getOptionValue(opt);
              const lbl = getOptionLabel(opt);
              return (
                <div key={value} className={`flex items-center gap-2 py-1 px-2 rounded ${selectedSet.has(value) ? 'bg-blue-600 text-white' : ''} hover:bg-blue-600 hover:text-white`}>
                  <Checkbox checked={selectedSet.has(value)} onCheckedChange={() => toggle(value)} />
                  <div className="truncate text-sm">{lbl}</div>
                </div>
              );
            })}
            {visibleCount < filtered.length && (
              <div className="text-center py-2">
                <button onClick={() => setVisibleCount(vc => vc + 200)} className="text-sm text-blue-600">Mostrar mais</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactMultiSelect;

