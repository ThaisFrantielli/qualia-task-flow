import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppInstance {
  id: string;
  name: string;
  status: string;
  phone_number: string | null;
}

interface AtendimentoFiltersProps {
  instances: WhatsAppInstance[];
  selectedInstances: string[];
  onInstancesChange: (instances: string[]) => void;
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
}

export const AtendimentoFilters: React.FC<AtendimentoFiltersProps> = ({
  instances,
  selectedInstances,
  onInstancesChange,
  statusFilter,
  onStatusFilterChange
}) => {
  const handleInstanceToggle = (instanceId: string) => {
    if (selectedInstances.includes(instanceId)) {
      onInstancesChange(selectedInstances.filter(id => id !== instanceId));
    } else {
      onInstancesChange([...selectedInstances, instanceId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedInstances.length === instances.length) {
      onInstancesChange([]);
    } else {
      onInstancesChange(instances.map(i => i.id));
    }
  };

  const activeFiltersCount = 
    (selectedInstances.length > 0 && selectedInstances.length < instances.length ? 1 : 0) +
    (statusFilter ? 1 : 0);

  const clearFilters = () => {
    onInstancesChange([]);
    onStatusFilterChange(null);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 relative">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 text-[10px] flex items-center justify-center"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Filtros Avançados</h4>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={clearFilters}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Instances Filter */}
          {instances.length > 1 && (
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Instâncias</span>
              </div>
              
              <div className="space-y-1.5">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1.5"
                  onClick={handleSelectAll}
                >
                  <Checkbox 
                    checked={selectedInstances.length === instances.length || selectedInstances.length === 0}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs">Todas as instâncias</span>
                </div>
                
                {instances.map(instance => (
                  <div 
                    key={instance.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1.5"
                    onClick={() => handleInstanceToggle(instance.id)}
                  >
                    <Checkbox 
                      checked={selectedInstances.includes(instance.id) || selectedInstances.length === 0}
                      className="h-3.5 w-3.5"
                    />
                    <span className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      instance.status === 'connected' ? 'bg-green-500' : 'bg-muted'
                    )} />
                    <span className="text-xs truncate">{instance.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div className="p-3">
            <span className="text-xs font-medium">Status do Lead</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { value: null, label: 'Todos' },
                { value: 'aguardando', label: 'Aguardando' },
                { value: 'em_atendimento', label: 'Em Atendimento' },
                { value: 'atendido', label: 'Atendido' },
              ].map(option => (
                <Badge
                  key={option.value || 'all'}
                  variant={statusFilter === option.value ? 'default' : 'outline'}
                  className="cursor-pointer text-[10px] h-5"
                  onClick={() => onStatusFilterChange(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filters badges */}
      {selectedInstances.length > 0 && selectedInstances.length < instances.length && (
        <Badge variant="secondary" className="h-6 text-xs gap-1">
          {selectedInstances.length} instância(s)
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => onInstancesChange([])}
          />
        </Badge>
      )}
      
      {statusFilter && (
        <Badge variant="secondary" className="h-6 text-xs gap-1">
          {statusFilter}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => onStatusFilterChange(null)}
          />
        </Badge>
      )}
    </div>
  );
};