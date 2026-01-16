import * as React from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  maxDisplay?: number;
  label?: string;
}

export const MultiSelect = React.memo(function MultiSelect({
  options,
  selected,
  onSelectedChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum item encontrado',
  className,
  maxDisplay = 2,
  label,
}: MultiSelectProps) {

  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [scrollTop, setScrollTop] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((option) =>
      option.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  const handleToggle = React.useCallback((value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onSelectedChange(newSelected);
  }, [selected, onSelectedChange]);

  const handleSelectAll = React.useCallback((_val?: any) => {
    if (selected.length === options.length) {
      onSelectedChange([]);
    } else {
      onSelectedChange(options);
    }
  }, [selected.length, options, onSelectedChange]);

  const handleClear = React.useCallback(() => {
    onSelectedChange([]);
  }, [onSelectedChange]);

  const displayText = React.useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (selected.length <= maxDisplay) {
      return selected.join(', ');
    }
    return `${selected.slice(0, maxDisplay).join(', ')} +${selected.length - maxDisplay}`;
  }, [selected, maxDisplay, placeholder]);

  // Virtualization params
  const ITEM_HEIGHT = 36; // px
  const MAX_HEIGHT = 300; // px
  const total = filteredOptions.length;
  const containerHeight = Math.min(MAX_HEIGHT, total * ITEM_HEIGHT);
  const visibleCount = Math.min(total, Math.ceil(containerHeight / ITEM_HEIGHT) + 4);
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 1);
  const endIndex = Math.min(total, startIndex + visibleCount);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const OptionRow = React.useCallback(({ option, isSelected }: { option: string; isSelected: boolean }) => {
    return (
      <CommandItem
        key={option}
        value={option}
        onSelect={() => handleToggle(option)}
        className="cursor-pointer"
      >
        <div className="flex items-center space-x-2 flex-1" style={{ height: ITEM_HEIGHT }}>
          <Checkbox checked={isSelected} />
          <span className="flex-1 truncate">{option}</span>
          {isSelected && (
            <Check className="h-4 w-4 text-emerald-600" />
          )}
        </div>
      </CommandItem>
    );
  }, [handleToggle]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div>
        {label && <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>}
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('w-full justify-between', className)}
          >
            <span className="truncate text-left flex-1">{displayText}</span>
            <div className="flex items-center gap-1 ml-2">
              {selected.length > 0 && (
                <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                  {selected.length}
                </Badge>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="p-2 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selected.length === options.length && options.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <button onClick={handleSelectAll} className="text-sm text-slate-700">{selected.length === options.length ? 'Limpar Todos' : 'Selecionar Todos'}</button>
            </div>
            {selected.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-xs h-7 text-red-600 hover:text-red-700"
              >
                Limpar ({selected.length})
              </Button>
            )}
          </div>
          <CommandEmpty className="py-6 text-center text-sm">
            {emptyMessage}
          </CommandEmpty>
          <CommandGroup>
            <div
              ref={listRef}
              onScroll={onScroll}
              style={{ maxHeight: `${containerHeight}px`, overflowY: 'auto', position: 'relative' }}
            >
              <div style={{ height: total * ITEM_HEIGHT, position: 'relative' }}>
                <div style={{ height: startIndex * ITEM_HEIGHT }} />
                {filteredOptions.slice(startIndex, endIndex).map((option) => {
                  const isSelected = selected.includes(option);
                  return (
                    <div key={option} style={{ position: 'relative' }}>
                      <OptionRow option={option} isSelected={isSelected} />
                    </div>
                  );
                })}
                <div style={{ height: (total - endIndex) * ITEM_HEIGHT }} />
              </div>
            </div>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
