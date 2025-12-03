import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Filter } from "lucide-react";

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
  urgentCount
}: TriagemFiltersProps) {
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
