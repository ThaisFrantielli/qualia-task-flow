import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Search, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TicketsFiltersAdvancedProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  priorityFilter: string;
  onPriorityChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentChange: (value: string) => void;
  dateRange: { from?: Date; to?: Date };
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void;
  onClear: () => void;
  selectedCount?: number;
  onBatchStatusChange?: (status: string) => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os Status" },
  { value: "novo", label: "Solicitação" },
  { value: "em_analise", label: "Em Análise" },
  { value: "aguardando_departamento", label: "Aguard. Depto." },
  { value: "em_tratativa", label: "Em Tratativa" },
  { value: "aguardando_cliente", label: "Aguard. Cliente" },
  { value: "resolvido", label: "Resolvido" },
  { value: "fechado", label: "Fechado" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "Todas Prioridades" },
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

const DEPARTMENT_OPTIONS = [
  { value: "all", label: "Todos Departamentos" },
  { value: "Técnico", label: "Técnico" },
  { value: "Financeiro", label: "Financeiro" },
  { value: "Comercial", label: "Comercial" },
  { value: "Operacional", label: "Operacional" },
  { value: "Qualidade", label: "Qualidade" },
];

export function TicketsFiltersAdvanced({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  departmentFilter,
  onDepartmentChange,
  dateRange,
  onDateRangeChange,
  onClear,
  selectedCount = 0,
  onBatchStatusChange,
}: TicketsFiltersAdvancedProps) {
  const hasFilters =
    search ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    departmentFilter !== "all" ||
    dateRange.from ||
    dateRange.to;

  return (
    <div className="space-y-3 py-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, número ou cliente..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select value={priorityFilter} onValueChange={onPriorityChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Department */}
        <Select value={departmentFilter} onValueChange={onDepartmentChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[180px] justify-start text-left font-normal",
                !dateRange.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd/MM", { locale: ptBR })} -{" "}
                    {format(dateRange.to, "dd/MM", { locale: ptBR })}
                  </>
                ) : (
                  format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                )
              ) : (
                "Período"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range: any) => {
                onDateRangeChange({ from: range?.from, to: range?.to });
              }}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        {/* Clear filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Batch actions */}
      {selectedCount > 0 && onBatchStatusChange && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <Badge variant="secondary">{selectedCount} selecionados</Badge>
          <span className="text-sm text-muted-foreground">Alterar status para:</span>
          <Select onValueChange={onBatchStatusChange}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder="Selecionar..." />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.filter((s) => s.value !== "all").map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
