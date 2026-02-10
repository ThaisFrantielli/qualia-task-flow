import React, { useMemo, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

interface CompactMultiSelectProps {
  options: string[];
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

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(q));
  }, [options, query]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const displayText = useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (selected.length <= 2) return selected.join(', ');
    return `${selected.slice(0, 2).join(', ')} +${selected.length - 2}`;
  }, [selected, placeholder]);

  const toggle = useCallback((opt: string) => {
    if (selected.includes(opt)) onSelectedChange(selected.filter(s => s !== opt));
    else onSelectedChange([...selected, opt]);
  }, [selected, onSelectedChange]);

  const selectAll = useCallback(() => {
    if (selected.length === options.length) onSelectedChange([]);
    else onSelectedChange(options);
  }, [selected, options, onSelectedChange]);

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
            <button onClick={selectAll} className="text-sm text-slate-700">{selected.length === options.length ? 'Desmarcar todos' : 'Selecionar todos'}</button>
            <div className="text-xs text-slate-500">{filtered.length} itens</div>
          </div>
          <div ref={listRef} style={{ maxHeight: 300, overflowY: 'auto' }}>
            {filtered.slice(0, visibleCount).map(opt => (
              <div key={opt} className={`flex items-center gap-2 py-1 px-2 rounded ${selectedSet.has(opt) ? 'bg-blue-600 text-white' : ''} hover:bg-blue-600 hover:text-white`}>
                <Checkbox checked={selectedSet.has(opt)} onCheckedChange={() => toggle(opt)} />
                <div className="truncate text-sm">{opt}</div>
              </div>
            ))}
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
