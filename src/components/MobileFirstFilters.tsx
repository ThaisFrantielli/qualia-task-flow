import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface MobileFirstFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  motivo: string;
  onMotivoChange: (value: string) => void;
  period: string;
  onPeriodChange: (value: string) => void;
  onClear: () => void;
  statusOptions: string[];
  motivoOptions: string[];
  periodOptions: string[];
}

// Hook personalizado para debounce
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export function MobileFirstFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  motivo,
  onMotivoChange,
  period,
  onPeriodChange,
  onClear,
  statusOptions,
  motivoOptions,
  periodOptions
}: MobileFirstFiltersProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Debounce para a busca
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  // Contador de filtros ativos
  const activeFiltersCount = [status, motivo, period].filter(Boolean).length;

  // Chips de filtros ativos
  const getActiveFilterChips = () => {
    const chips = [];
    
    if (status) {
      chips.push({
        label: `Status: ${status}`,
        onRemove: () => onStatusChange('')
      });
    }
    
    if (motivo) {
      chips.push({
        label: `Motivo: ${motivo}`,
        onRemove: () => onMotivoChange('')
      });
    }
    
    if (period) {
      chips.push({
        label: `Período: ${period}`,
        onRemove: () => onPeriodChange('')
      });
    }
    
    return chips;
  };

  const activeChips = getActiveFilterChips();

  return (
    <div className="space-y-4">
      {/* Barra de busca principal - sempre visível */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, motivo ou ID..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-10 pr-4 h-12 text-base rounded-xl border-2 border-border/50 focus:border-primary/50 transition-all"
        />
        {localSearch && (
          <button
            onClick={() => {
              setLocalSearch('');
              onSearchChange('');
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Container responsivo para filtros e chips */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Filtros - Desktop inline, Mobile em sheet */}
        <div className="flex items-center gap-2">
          {/* Desktop: Filtros inline */}
          <div className="hidden lg:flex gap-2">
            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger className="w-[150px] h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {statusOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={motivo} onValueChange={onMotivoChange}>
              <SelectTrigger className="w-[150px] h-10">
                <SelectValue placeholder="Motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {motivoOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger className="w-[150px] h-10">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {periodOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFiltersCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClear}
                className="h-10 px-3"
              >
                <XMarkIcon className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Mobile: Botão para abrir filtros */}
          <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="lg:hidden relative h-10 px-3"
              >
                <FunnelIcon className="w-4 h-4 mr-2" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 w-5 h-5 text-xs flex items-center justify-center p-0 bg-primary">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-4 mt-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={status} onValueChange={onStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {statusOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Motivo</label>
                  <Select value={motivo} onValueChange={onMotivoChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {motivoOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Período</label>
                  <Select value={period} onValueChange={onPeriodChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {periodOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activeFiltersCount > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      onClear();
                      setIsFiltersOpen(false);
                    }}
                    className="w-full"
                  >
                    <XMarkIcon className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Chips de filtros ativos */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          <span className="text-sm text-muted-foreground self-center">Filtros ativos:</span>
          {activeChips.map((chip, index) => (
            <Badge 
              key={index}
              variant="secondary"
              className="px-3 py-1 cursor-pointer hover:bg-secondary/80 transition-colors group"
              onClick={chip.onRemove}
            >
              {chip.label}
              <XMarkIcon className="w-3 h-3 ml-2 opacity-60 group-hover:opacity-100 transition-opacity" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}