import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets, useUpdateTicket } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { toast } from "sonner";
import { 
  Grid3X3, Table2, LayoutGrid, Download, 
  Clock, CheckCircle, AlertTriangle, ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedKPICard } from "@/components/AnimatedKPICard";
import { TicketsTableView } from "@/components/tickets/TicketsTableView";
import { TicketsKanbanView } from "@/components/tickets/TicketsKanbanView";
import { TicketsGridView } from "@/components/tickets/TicketsGridView";
import { TicketsFiltersAdvanced } from "@/components/tickets/TicketsFiltersAdvanced";
import { CreateTicketDialog } from "@/components/tickets/CreateTicketDialog";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx";

export type TicketViewMode = "kanban" | "table" | "grid";

export default function TicketsUnifiedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tickets, isLoading } = useTickets();
  const updateTicket = useUpdateTicket();

  const [viewMode, setViewMode] = useState<TicketViewMode>("kanban");
  const [activeTab, setActiveTab] = useState("all");
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    
    return tickets.filter((ticket: any) => {
      // Search filter
      if (search) {
        const s = search.toLowerCase();
        const matchTitle = ticket.titulo?.toLowerCase().includes(s);
        const matchNumber = ticket.numero_ticket?.toLowerCase().includes(s);
        const matchClient = ticket.clientes?.nome_fantasia?.toLowerCase().includes(s);
        if (!matchTitle && !matchNumber && !matchClient) return false;
      }

      // Status filter
      if (statusFilter !== "all" && ticket.status !== statusFilter) return false;

      // Priority filter
      if (priorityFilter !== "all" && ticket.prioridade !== priorityFilter) return false;

      // Department filter
      if (departmentFilter !== "all" && ticket.departamento !== departmentFilter) return false;

      // Tab filter
      if (activeTab === "mine" && ticket.atendente_id !== user?.id) return false;
      if (activeTab === "sla_critical") {
        const now = Date.now();
        const sla = ticket.sla_resolucao ? new Date(ticket.sla_resolucao).getTime() : 0;
        if (sla === 0 || sla > now || ticket.status === "resolvido" || ticket.status === "fechado") return false;
      }
      if (activeTab === "open" && (ticket.status === "resolvido" || ticket.status === "fechado")) return false;

      // Date range filter
      if (dateRange.from) {
        const ticketDate = new Date(ticket.created_at);
        if (ticketDate < dateRange.from) return false;
      }
      if (dateRange.to) {
        const ticketDate = new Date(ticket.created_at);
        if (ticketDate > dateRange.to) return false;
      }

      return true;
    });
  }, [tickets, search, statusFilter, priorityFilter, departmentFilter, activeTab, user?.id, dateRange]);

  // KPIs
  const stats = useMemo(() => {
    if (!tickets) return { total: 0, open: 0, resolved: 0, overdue: 0 };
    const now = Date.now();
    return {
      total: tickets.length,
      open: tickets.filter((t: any) => t.status !== "resolvido" && t.status !== "fechado").length,
      resolved: tickets.filter((t: any) => t.status === "resolvido" || t.status === "fechado").length,
      overdue: tickets.filter((t: any) => {
        if (t.status === "resolvido" || t.status === "fechado") return false;
        const sla = t.sla_resolucao ? new Date(t.sla_resolucao).getTime() : 0;
        return sla > 0 && sla < now;
      }).length,
    };
  }, [tickets]);

  // Handle drag-drop status change
  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    if (!user?.id) return;
    try {
      await updateTicket.mutateAsync({
        ticketId,
        updates: { status: newStatus },
        userId: user.id,
      });
      toast.success("Status atualizado com sucesso!");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  // Export to Excel
  const handleExport = () => {
    const exportData = filteredTickets.map((t: any) => ({
      "Número": t.numero_ticket,
      "Título": t.titulo,
      "Cliente": t.clientes?.nome_fantasia || "-",
      "Status": t.status,
      "Prioridade": t.prioridade,
      "Departamento": t.departamento || "-",
      "Atendente": t.profiles?.full_name || "-",
      "Criado em": new Date(t.created_at).toLocaleDateString("pt-BR"),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tickets");
    XLSX.writeFile(wb, `tickets_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Batch actions
  const handleBatchStatusChange = async (newStatus: string) => {
    if (!user?.id || selectedTickets.length === 0) return;
    try {
      await Promise.all(
        selectedTickets.map((id) =>
          updateTicket.mutateAsync({ ticketId: id, updates: { status: newStatus }, userId: user.id })
        )
      );
      toast.success(`${selectedTickets.length} tickets atualizados!`);
      setSelectedTickets([]);
    } catch {
      toast.error("Erro ao atualizar tickets");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setDepartmentFilter("all");
    setDateRange({});
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Central de Tickets</h1>
              <p className="text-muted-foreground text-sm">
                Gerencie todos os tickets de atendimento em um só lugar
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* View selector */}
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === "kanban" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("kanban")}
                >
                  <Grid3X3 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Kanban</span>
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <Table2 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Lista</span>
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Cards</span>
                </Button>
              </div>

              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>

              <CreateTicketDialog />
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AnimatedKPICard
              value={stats.open}
              label="Em Aberto"
              color="warning"
              icon={<Clock className="w-5 h-5" />}
              trend="stable"
            />
            <AnimatedKPICard
              value={stats.resolved}
              label="Resolvidos"
              color="success"
              icon={<CheckCircle className="w-5 h-5" />}
              trend="up"
            />
            <AnimatedKPICard
              value={stats.overdue}
              label="SLA Vencido"
              color="danger"
              icon={<AlertTriangle className="w-5 h-5" />}
              trend={stats.overdue > 0 ? "down" : "stable"}
            />
            <AnimatedKPICard
              value={stats.total}
              label="Total"
              color="primary"
              icon={<ClipboardList className="w-5 h-5" />}
              trend="stable"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="all">Todos ({tickets?.length || 0})</TabsTrigger>
                <TabsTrigger value="open">Em Aberto ({stats.open})</TabsTrigger>
                <TabsTrigger value="mine">Meus Tickets</TabsTrigger>
                <TabsTrigger value="sla_critical" className="text-destructive">
                  SLA Crítico ({stats.overdue})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Filters */}
            <TicketsFiltersAdvanced
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              priorityFilter={priorityFilter}
              onPriorityChange={setPriorityFilter}
              departmentFilter={departmentFilter}
              onDepartmentChange={setDepartmentFilter}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onClear={clearFilters}
              selectedCount={selectedTickets.length}
              onBatchStatusChange={handleBatchStatusChange}
            />

            <TabsContent value={activeTab} className="mt-4">
              {viewMode === "kanban" && (
                <TicketsKanbanView
                  tickets={filteredTickets}
                  onStatusChange={handleStatusChange}
                  onTicketClick={(id) => navigate(`/tickets/${id}`)}
                />
              )}
              {viewMode === "table" && (
                <TicketsTableView
                  tickets={filteredTickets}
                  onTicketClick={(id) => navigate(`/tickets/${id}`)}
                  selectedTickets={selectedTickets}
                  onSelectionChange={setSelectedTickets}
                />
              )}
              {viewMode === "grid" && (
                <TicketsGridView
                  tickets={filteredTickets}
                  onTicketClick={(id) => navigate(`/tickets/${id}`)}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DndProvider>
  );
}
