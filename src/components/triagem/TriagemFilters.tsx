import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, RefreshCw, Filter, Smartphone } from "lucide-react";

interface WhatsAppInstance {
  id: string;
  name: string;
  status: string;
  phone_number?: string | null;
}

interface TriagemFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  origemFilter: string;
  onOrigemChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  totalLeads: number;
  whatsappCount: number;
  urgentCount: number;
  // Novos props para filtro de instâncias
  instances?: WhatsAppInstance[];
  selectedInstanceIds?: string[];
  onInstancesChange?: (ids: string[]) => void;
}

export function TriagemFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  origemFilter,
  onOrigemChange,
  onRefresh,
  isRefreshing,
  totalLeads,
  whatsappCount,
  urgentCount,
  instances = [],
  selectedInstanceIds = [],
  onInstancesChange
}: TriagemFiltersProps) {
  const handleInstanceToggle = (instanceId: string) => {
    if (!onInstancesChange) return;
    
    if (selectedInstanceIds.includes(instanceId)) {
      onInstancesChange(selectedInstanceIds.filter(id => id !== instanceId));
    } else {
      onInstancesChange([...selectedInstanceIds, instanceId]);
    }
  };

  const handleSelectAll = () => {
    if (!onInstancesChange) return;
    if (selectedInstanceIds.length === instances.length) {
      onInstancesChange([]);
    } else {
      onInstancesChange(instances.map(i => i.id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          Total: {totalLeads}
        </Badge>
        {whatsappCount > 0 && (
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 text-sm px-3 py-1">
            WhatsApp: {whatsappCount}
          </Badge>
        )}
        {urgentCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1 animate-pulse">
            Urgentes: {urgentCount}
          </Badge>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, email..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="aguardando">Aguardando</SelectItem>
            <SelectItem value="em_atendimento">Em atendimento</SelectItem>
          </SelectContent>
        </Select>

        {/* Origem Filter */}
        <Select value={origemFilter} onValueChange={onOrigemChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="import">Importação</SelectItem>
          </SelectContent>
        </Select>

        {/* Instance Filter - Multi-select */}
        {instances.length > 0 && onInstancesChange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[200px] justify-start">
                <Smartphone className="w-4 h-4 mr-2" />
                <span className="truncate">
                  {selectedInstanceIds.length === 0 
                    ? 'Todas instâncias' 
                    : selectedInstanceIds.length === instances.length
                    ? 'Todas instâncias'
                    : `${selectedInstanceIds.length} instância(s)`}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Filtrar por instância</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs h-7"
                  >
                    {selectedInstanceIds.length === instances.length ? 'Limpar' : 'Todas'}
                  </Button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {instances.map(instance => (
                    <label
                      key={instance.id}
                      className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-muted"
                    >
                      <Checkbox
                        checked={selectedInstanceIds.length === 0 || selectedInstanceIds.includes(instance.id)}
                        onCheckedChange={() => handleInstanceToggle(instance.id)}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm">{instance.name}</span>
                        {instance.phone_number && (
                          <span className="text-xs text-muted-foreground">
                            {instance.phone_number}
                          </span>
                        )}
                      </div>
                      <span 
                        className={`ml-auto w-2 h-2 rounded-full ${
                          instance.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'
                        }`} 
                      />
                    </label>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Refresh Button */}
        <Button 
          variant="outline" 
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
