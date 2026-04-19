import { useState, useMemo, useEffect } from "react";
import {
  useTriagemLeads,
  useEncaminharParaComercial,
  useCriarTicket,
  useDescartarLead,
  useAtribuirLead,
  type TriagemLead
} from "@/hooks/useTriagemRealtime";
import { useFunis } from "@/hooks/useFunis";
import { useAuth } from "@/contexts/AuthContext";
import { usePresenceOptional } from "@/contexts/PresenceContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Ticket, Inbox, MessageSquare, Users, Eye, LayoutGrid, LayoutList } from "lucide-react";
import { TriagemLeadCardV2 } from "@/components/triagem/TriagemLeadCardV2";
import { TriagemFilters } from "@/components/triagem/TriagemFilters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  TICKET_ORIGEM_OPTIONS,
  TICKET_MOTIVO_OPTIONS,
  TICKET_DEPARTAMENTO_OPTIONS
} from "@/constants/ticketOptions";
import { useTicketMotivos, useTicketDepartamentos, useTicketCustomFields } from "@/hooks/useTicketOptions";
import {
  DEFAULT_TRIAGEM_THRESHOLDS,
  getQueueAlertLevel,
} from "@/lib/triagemOperationalAlerts";

interface WhatsAppInstance {
  id: string;
  name: string;
  status: string;
  phone_number: string | null;
}

export default function FilaTriagem() {
  const { user } = useAuth();
  const presence = usePresenceOptional();
  const triagemQuery = useTriagemLeads({ limit: 500 });
  const leads: TriagemLead[] = (triagemQuery.data as TriagemLead[] | undefined) || [];
  const isLoading = triagemQuery.isLoading;
  const refetch = triagemQuery.refetch;
  const isFetching = triagemQuery.isFetching;
  const totalLeadsServidor = (triagemQuery as unknown as { total?: number }).total ?? 0;
  const { data: funis } = useFunis();
  const encaminharComercial = useEncaminharParaComercial();
  const criarTicket = useCriarTicket();
  const descartarLead = useDescartarLead();
  const atribuirLead = useAtribuirLead();

  // WhatsApp instances state
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([]);
  // Local cache of removed leads to remove them from the list immediately
  const [removedLeadIds, setRemovedLeadIds] = useState<string[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [pendingEncaminhandoIds, setPendingEncaminhandoIds] = useState<string[]>([]);
  const [pendingAtribuindoIds, setPendingAtribuindoIds] = useState<string[]>([]);
  const [pendingDescartandoIds, setPendingDescartandoIds] = useState<string[]>([]);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [origemFilter, setOrigemFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch WhatsApp instances
  useEffect(() => {
    const fetchInstances = async () => {
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('id, name, status, phone_number')
        .order('name');

      if (data) {
        setInstances(data);
      }
    };
    fetchInstances();
  }, []);

  // Dialog state
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<TriagemLead | null>(null);
  const [ticketForm, setTicketForm] = useState({
    titulo: "",
    sintese: "",
    prioridade: "media",
    origem: "",
    motivo: "",
    departamento: "",
    placa: ""
  });
  const { data: ticketMotivos } = useTicketMotivos();
  const { data: ticketDepartamentos } = useTicketDepartamentos();
  const { data: ticketCustomFields } = useTicketCustomFields();
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const activeMotivos = ticketMotivos?.filter((m) => m.is_active) || [];
  const motivoOptions = activeMotivos.length > 0
    ? activeMotivos.map((m) => ({ value: m.id, label: m.label }))
    : TICKET_MOTIVO_OPTIONS.map((m) => ({ value: m.label, label: m.label }));

  const activeDepartamentos = ticketDepartamentos?.filter((d) => d.is_active) || [];
  const departamentoOptions = activeDepartamentos.length > 0
    ? activeDepartamentos.map((d) => ({ value: d.label, label: d.label }))
    : TICKET_DEPARTAMENTO_OPTIONS;

  const activeCustomFields = (ticketCustomFields || []).filter((field) => field.is_active);

  const normalizeOptions = (options: any): Array<{ value: string; label: string }> => {
    if (!Array.isArray(options)) return [];
    return options
      .map((option) => {
        if (typeof option === "string") return { value: option, label: option };
        if (option && typeof option === "object") {
          return {
            value: String(option.value ?? option.label ?? ""),
            label: String(option.label ?? option.value ?? ""),
          };
        }
        return null;
      })
      .filter((option): option is { value: string; label: string } => !!option && !!option.value);
  };

  const isUuid = (value: string | null | undefined) =>
    Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value));

  // Filter and sort leads
  const visibleLeads = useMemo(() => {
    return (leads || []).filter((lead) => !removedLeadIds.includes(lead.id));
  }, [leads, removedLeadIds]);

  const filteredLeads = useMemo(() => {
    return visibleLeads.filter(lead => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchName = (lead.nome_fantasia || '').toLowerCase().includes(search);
        const matchRazao = (lead.razao_social || '').toLowerCase().includes(search);
        const matchPhone = (lead.whatsapp_number || lead.telefone || '').includes(search);
        const matchEmail = (lead.email || '').toLowerCase().includes(search);
        if (!matchName && !matchRazao && !matchPhone && !matchEmail) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && lead.status_triagem !== statusFilter) return false;

      // Origem filter
      if (origemFilter !== 'all') {
        if (origemFilter === 'whatsapp' && lead.origem !== 'whatsapp_inbound' && !lead.whatsapp_number) return false;
        if (origemFilter === 'manual' && lead.origem !== 'manual') return false;
        if (origemFilter === 'import' && lead.origem !== 'import') return false;
      }

      // Instance filter - if specific instances are selected, filter by them
      if (selectedInstanceIds.length > 0 && selectedInstanceIds.length < instances.length) {
        // Only filter if user selected specific instances (not all)
        const leadInstanceId = lead.conversation?.instance_id;
        if (leadInstanceId && !selectedInstanceIds.includes(leadInstanceId)) {
          return false;
        }
        // If lead has no conversation/instance, show it only if "all" is selected
        if (!leadInstanceId && lead.origem === 'whatsapp_inbound') {
          return false;
        }
      }

      // Tab filter
      if (activeTab === 'whatsapp' && lead.origem !== 'whatsapp_inbound' && !lead.whatsapp_number) return false;
      if (activeTab === 'unread' && (!lead.conversation || lead.conversation.unread_count === 0)) return false;
      if (activeTab === 'mine' && lead.ultimo_atendente_id !== user?.id) return false;

      return true;
    }).sort((a, b) => {
      // Prioritize by unread messages
      const aUnread = a.conversation?.unread_count || 0;
      const bUnread = b.conversation?.unread_count || 0;
      if (bUnread !== aUnread) return bUnread - aUnread;

      // Then by date (newest first)
      const aDate = a.created_at || a.cadastro_cliente || '';
      const bDate = b.created_at || b.cadastro_cliente || '';
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [visibleLeads, searchTerm, statusFilter, origemFilter, activeTab, user?.id, selectedInstanceIds, instances.length]);

  // Stats — total reflete a contagem real do servidor (descontando leads removidos localmente)
  const stats = useMemo(() => {
    if (!visibleLeads) return { total: 0, whatsapp: 0, urgent: 0 };
    const serverTotal = typeof totalLeadsServidor === 'number' ? totalLeadsServidor : visibleLeads.length;
    const adjustedTotal = Math.max(0, serverTotal - removedLeadIds.length);
    return {
      total: adjustedTotal,
      whatsapp: visibleLeads.filter(l => l.origem === 'whatsapp_inbound' || l.whatsapp_number).length,
      urgent: visibleLeads.filter(l => (l.conversation?.unread_count || 0) > 0).length
    };
  }, [visibleLeads, totalLeadsServidor, removedLeadIds.length]);

  useEffect(() => {
    if (!leads || leads.length === 0) return;
    const currentIds = new Set(leads.map((lead) => lead.id));
    setRemovedLeadIds((prev) => {
      const next = prev.filter((id) => currentIds.has(id));
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [leads]);

  useEffect(() => {
    const visibleIds = new Set(filteredLeads.map((lead) => lead.id));
    setSelectedLeadIds((prev) => {
      const next = prev.filter((id) => visibleIds.has(id));
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [filteredLeads]);

  useEffect(() => {
    if (viewMode !== 'list' && selectedLeadIds.length > 0) {
      setSelectedLeadIds([]);
    }
  }, [viewMode, selectedLeadIds.length]);

  const queueAlertLevel = useMemo(
    () => getQueueAlertLevel(stats.total, stats.urgent),
    [stats.total, stats.urgent],
  );

  // Count users viewing triagem page
  const viewersInTriagem = presence?.getUsersInPage('/triagem').length || 0;

  // Handlers
  const handleEncaminharComercial = async (clienteId: string) => {
    const funilVendas = funis?.find(f => f.tipo === 'vendas');
    setPendingEncaminhandoIds((prev) => Array.from(new Set([...prev, clienteId])));
    try {
      await encaminharComercial.mutateAsync({
        clienteId,
        funilId: funilVendas?.id
      });
      setRemovedLeadIds((s) => Array.from(new Set([...s, clienteId])));
    } finally {
      setPendingEncaminhandoIds((prev) => prev.filter((id) => id !== clienteId));
    }
  };

  const handleToggleLeadSelection = (leadId: string, checked: boolean) => {
    setSelectedLeadIds((prev) => {
      if (checked) return Array.from(new Set([...prev, leadId]));
      return prev.filter((id) => id !== leadId);
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedLeadIds([]);
      return;
    }
    setSelectedLeadIds(filteredLeads.map((lead) => lead.id));
  };

  const allFilteredSelected = filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length;

  const handleBulkEncaminhar = async () => {
    if (selectedLeadIds.length === 0) return;
    const funilVendas = funis?.find((f) => f.tipo === 'vendas');
    const successIds: string[] = [];
    setPendingEncaminhandoIds((prev) => Array.from(new Set([...prev, ...selectedLeadIds])));

    for (const leadId of selectedLeadIds) {
      try {
        await encaminharComercial.mutateAsync({ clienteId: leadId, funilId: funilVendas?.id });
        successIds.push(leadId);
      } catch (error) {
        console.error('Falha ao encaminhar lead em lote:', leadId, error);
      }
    }

    if (successIds.length > 0) {
      setRemovedLeadIds((prev) => Array.from(new Set([...prev, ...successIds])));
      setSelectedLeadIds((prev) => prev.filter((id) => !successIds.includes(id)));
      toast.success(`${successIds.length} lead(s) encaminhado(s) para Comercial.`);
    }

    setPendingEncaminhandoIds((prev) => prev.filter((id) => !selectedLeadIds.includes(id)));
  };

  const handleBulkAtribuir = async () => {
    if (selectedLeadIds.length === 0) return;
    const successIds: string[] = [];
    setPendingAtribuindoIds((prev) => Array.from(new Set([...prev, ...selectedLeadIds])));

    for (const leadId of selectedLeadIds) {
      try {
        await atribuirLead.mutateAsync({ clienteId: leadId });
        successIds.push(leadId);
      } catch (error) {
        console.error('Falha ao assumir lead em lote:', leadId, error);
      }
    }

    if (successIds.length > 0) {
      setSelectedLeadIds((prev) => prev.filter((id) => !successIds.includes(id)));
      toast.success(`${successIds.length} lead(s) assumido(s).`);
    }

    setPendingAtribuindoIds((prev) => prev.filter((id) => !selectedLeadIds.includes(id)));
  };

  const handleCriarTicket = async () => {
    if (!selectedLead) return;

    const missingCustomRequired = activeCustomFields
      .filter((field) => field.is_required)
      .some((field) => {
        const value = customFieldValues[field.field_key];
        if (Array.isArray(value)) return value.length === 0;
        return value === undefined || value === null || value === "";
      });

    if (missingCustomRequired) {
      toast.error("Preencha os campos customizados obrigatórios antes de criar o ticket.");
      return;
    }

    const selectedMotivo = motivoOptions.find((option) => option.value === ticketForm.motivo);
    const motivoId = isUuid(ticketForm.motivo) ? ticketForm.motivo : undefined;
    const motivoEnum = !motivoId ? (selectedMotivo?.label || ticketForm.motivo || undefined) : undefined;

    await criarTicket.mutateAsync({
      clienteId: selectedLead.id,
      titulo: ticketForm.titulo,
      sintese: ticketForm.sintese,
      prioridade: ticketForm.prioridade,
      origem: ticketForm.origem,
      motivo: motivoEnum,
      motivoId,
      departamento: ticketForm.departamento,
      placa: ticketForm.placa,
      customFields: customFieldValues,
      fase: "Solicitação",
      status: "aguardando_departamento"
    } as any);

    setRemovedLeadIds((s) => Array.from(new Set([...s, selectedLead.id])));

    setTicketDialogOpen(false);
    setSelectedLead(null);
    setTicketForm({
      titulo: "",
      sintese: "",
      prioridade: "media",
      origem: "",
      motivo: "",
      departamento: "",
      placa: ""
    });
    setCustomFieldValues({});
  };

  const handleOpenTicketDialog = (lead: TriagemLead) => {
    setSelectedLead(lead);
    setTicketForm({
      titulo: `Atendimento - ${lead.nome_fantasia || lead.razao_social || lead.whatsapp_number || 'Cliente'}`,
      sintese: "",
      prioridade: "media",
      origem: lead.origem === 'whatsapp_inbound' ? 'Whatsapp' : 'Site', // Tenta inferir origem
      motivo: "",
      departamento: "",
      placa: ""
    });
    setCustomFieldValues({});
    setTicketDialogOpen(true);
  };

  const handleDescartar = async (clienteId: string) => {
    // Open discard reason dialog
    setDiscardingLeadIds([clienteId]);
    setDiscardDialogOpen(true);
  };

  const handleDescartarSelecionados = () => {
    if (selectedLeadIds.length === 0) return;
    setDiscardingLeadIds(selectedLeadIds);
    setDiscardDialogOpen(true);
  };

  // Discard modal state
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState("");
  const [discardingLeadIds, setDiscardingLeadIds] = useState<string[]>([]);


  const submitDiscard = async () => {
    if (discardingLeadIds.length === 0) return;
    try {
      const successIds: string[] = [];
      setPendingDescartandoIds(discardingLeadIds);
      for (const leadId of discardingLeadIds) {
        try {
          await descartarLead.mutateAsync({ clienteId: leadId, motivo: discardReason });
          successIds.push(leadId);
        } catch (error) {
          console.error('Erro ao descartar lead em lote:', leadId, error);
        }
      }

      // Remove immediately from UI before refetch completes
      setRemovedLeadIds((s) => Array.from(new Set([...s, ...successIds])));
      setSelectedLeadIds((prev) => prev.filter((id) => !successIds.includes(id)));
      // Refresh leads immediately so the discarded lead is removed from the source of truth
      try { await refetch(); } catch (e) { console.warn('Refetch after discard failed', e); }
      setDiscardDialogOpen(false);
      setDiscardReason("");
      setDiscardingLeadIds([]);

      if (successIds.length > 1) {
        toast.success(`${successIds.length} lead(s) descartado(s).`);
      }
    } catch (err) {
      console.error('Erro ao descartar com motivo:', err);
    } finally {
      setPendingDescartandoIds([]);
    }
  };

  const handleAtribuir = async (clienteId: string) => {
    setPendingAtribuindoIds((prev) => Array.from(new Set([...prev, clienteId])));
    try {
      await atribuirLead.mutateAsync({ clienteId });
    } finally {
      setPendingAtribuindoIds((prev) => prev.filter((id) => id !== clienteId));
    }
  };

  const handleFalarWhatsapp = (lead: TriagemLead) => {
    const phone = lead.whatsapp_number || lead.telefone;

    if (!phone && !lead.conversation?.id) {
      toast.error("Este lead nao possui numero ou conversa WhatsApp vinculada.");
      return;
    }

    const params = new URLSearchParams();
    params.set("folder", "whatsapp");
    params.set("cliente_id", lead.id);
    if (phone) params.set("telefone", phone);
    if (lead.conversation?.id) params.set("conversation_id", lead.conversation.id);

    window.location.assign(`/atendimento?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Fila de Triagem</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Classifique e direcione leads para os fluxos corretos
          </p>
        </div>
        {viewersInTriagem > 0 && (
          <Badge variant="outline" className="flex items-center gap-1.5 w-fit">
            <Eye className="h-3 w-3" />
            {viewersInTriagem} atendente{viewersInTriagem > 1 ? 's' : ''} na triagem
          </Badge>
        )}
      </div>

      {/* Filters */}
      <TriagemFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        origemFilter={origemFilter}
        onOrigemChange={setOrigemFilter}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        totalLeads={stats.total}
        whatsappCount={stats.whatsapp}
        urgentCount={stats.urgent}
        instances={instances}
        selectedInstanceIds={selectedInstanceIds}
        onInstancesChange={setSelectedInstanceIds}
      />

      {queueAlertLevel !== 'ok' && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${queueAlertLevel === 'critical'
            ? 'border-rose-300 bg-rose-50 text-rose-800'
            : 'border-amber-300 bg-amber-50 text-amber-800'
            }`}
        >
          <p className="font-medium">
            {queueAlertLevel === 'critical'
              ? 'Alerta crítico de fila operacional'
              : 'Alerta de atenção na fila operacional'}
          </p>
          <p className="mt-1 text-xs opacity-90">
            Pendentes: {stats.total} (atenção a partir de {DEFAULT_TRIAGEM_THRESHOLDS.pendingWarning}, crítico em {DEFAULT_TRIAGEM_THRESHOLDS.pendingCritical}) ·
            Não lidas: {stats.urgent} (atenção a partir de {DEFAULT_TRIAGEM_THRESHOLDS.unreadWarning}, crítico em {DEFAULT_TRIAGEM_THRESHOLDS.unreadCritical})
          </p>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              <span className="hidden sm:inline">Todos</span>
              <span className="text-xs opacity-70">({stats.total})</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
              <span className="text-xs opacity-70">({stats.whatsapp})</span>
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex items-center gap-2 relative">
              <span className="hidden sm:inline">Não lidas</span>
              <span className="sm:hidden">Novas</span>
              {stats.urgent > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 rounded-full">
                  {stats.urgent}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="mine" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Meus</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/20 self-end sm:self-auto">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn("h-8 px-3 text-xs", viewMode === 'list' && "bg-background shadow-sm")}
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="w-4 h-4 mr-2" />
              Lista
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn("h-8 px-3 text-xs", viewMode === 'grid' && "bg-background shadow-sm")}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Grade
            </Button>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          {(viewMode === 'list' || activeTab === 'mine') && filteredLeads.length > 0 && (
            <div className="mb-3 rounded-lg border bg-muted/20 p-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={(checked) => handleToggleSelectAll(checked === true)}
                  aria-label="Selecionar todos os leads visíveis"
                />
                <span className="text-sm font-medium">Selecionar todos</span>
                <Badge variant="outline">{selectedLeadIds.length} selecionado(s)</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleBulkEncaminhar}
                  disabled={selectedLeadIds.length === 0 || pendingEncaminhandoIds.length > 0}
                >
                  {pendingEncaminhandoIds.length > 0 && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Comercial (lote)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkAtribuir}
                  disabled={selectedLeadIds.length === 0 || pendingAtribuindoIds.length > 0}
                >
                  {pendingAtribuindoIds.length > 0 && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Assumir (lote)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDescartarSelecionados}
                  disabled={selectedLeadIds.length === 0 || pendingDescartandoIds.length > 0}
                >
                  {pendingDescartandoIds.length > 0 && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Descartar (lote)
                </Button>
              </div>
            </div>
          )}

          {filteredLeads.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-muted-foreground space-y-2">
                <Ticket className="w-16 h-16 mx-auto opacity-20" />
                <p className="text-lg font-semibold">
                  {activeTab === 'all' ? 'Nenhum lead na fila' : 'Nenhum lead encontrado'}
                </p>
                <p className="text-sm">
                  {activeTab === 'all'
                    ? 'Todos os leads foram processados!'
                    : 'Tente ajustar os filtros'}
                </p>
              </div>
            </div>
          ) : (
            <div className={cn("gap-4", viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "flex flex-col space-y-3")}>
              {filteredLeads.map((lead) => (
                <TriagemLeadCardV2
                  key={lead.id}
                  lead={lead}
                  onFalarWhatsapp={handleFalarWhatsapp}
                  onEncaminharComercial={handleEncaminharComercial}
                  onCriarTicket={handleOpenTicketDialog}
                  onDescartar={handleDescartar}
                  onAtribuir={handleAtribuir}
                  isEncaminhando={pendingEncaminhandoIds.includes(lead.id)}
                  isDescartando={pendingDescartandoIds.includes(lead.id)}
                  isAtribuindo={pendingAtribuindoIds.includes(lead.id)}
                  currentUserId={user?.id}
                  viewMode={viewMode}
                  showSelectionControl={viewMode === 'list' || activeTab === 'mine'}
                  isSelected={selectedLeadIds.includes(lead.id)}
                  onToggleSelection={handleToggleLeadSelection}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para Criar Ticket */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="w-[90vw] md:w-[50vw] max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Ticket de Atendimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={ticketForm.titulo}
                onChange={(e) => setTicketForm({ ...ticketForm, titulo: e.target.value })}
                placeholder="Assunto do ticket"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Origem *</Label>
                <Select
                  value={ticketForm.origem}
                  onValueChange={(value) => setTicketForm({ ...ticketForm, origem: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    {TICKET_ORIGEM_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departamento *</Label>
                <Select
                  value={ticketForm.departamento}
                  onValueChange={(value) => setTicketForm({ ...ticketForm, departamento: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    {departamentoOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Motivo *</Label>
                <Select
                  value={ticketForm.motivo}
                  onValueChange={(value) => setTicketForm({ ...ticketForm, motivo: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    {motivoOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={ticketForm.prioridade}
                  onValueChange={(value) => setTicketForm({ ...ticketForm, prioridade: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="placa">Placa do Veículo</Label>
              <Input
                id="placa"
                value={ticketForm.placa}
                onChange={(e) => setTicketForm({ ...ticketForm, placa: e.target.value })}
                placeholder="ABC-1234"
              />
            </div>

            <div>
              <Label htmlFor="sintese">Síntese (Detalhes) *</Label>
              <Textarea
                id="sintese"
                value={ticketForm.sintese}
                onChange={(e) => setTicketForm({ ...ticketForm, sintese: e.target.value })}
                placeholder="Descreva o problema ou solicitação..."
                rows={4}
                className="resize-none"
              />
            </div>

            {activeCustomFields.length > 0 && (
              <div className="space-y-3 rounded-md border border-dashed p-3">
                <div>
                  <p className="text-sm font-medium">Campos Customizados</p>
                  <p className="text-xs text-muted-foreground">Preencha os campos configurados para tickets.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeCustomFields.map((field) => {
                    const value = customFieldValues[field.field_key];
                    const fieldOptions = normalizeOptions(field.options as any);

                    if (field.field_type === "textarea") {
                      return (
                        <div key={field.id} className="space-y-2 md:col-span-2">
                          <Label>{field.label}{field.is_required ? " *" : ""}</Label>
                          <Textarea
                            value={value || ""}
                            onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: e.target.value }))}
                            placeholder={field.placeholder || ""}
                            className="resize-none"
                          />
                        </div>
                      );
                    }

                    if (field.field_type === "select") {
                      return (
                        <div key={field.id} className="space-y-2">
                          <Label>{field.label}{field.is_required ? " *" : ""}</Label>
                          <Select
                            value={value || ""}
                            onValueChange={(selected) => setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: selected }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={field.placeholder || "Selecione..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldOptions.map((option) => (
                                <SelectItem key={`${field.field_key}-${option.value}`} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    }

                    if (field.field_type === "multiselect") {
                      const selectedValues = Array.isArray(value)
                        ? value
                        : (typeof value === "string" && value ? value.split(",").map((item) => item.trim()).filter(Boolean) : []);

                      return (
                        <div key={field.id} className="space-y-2">
                          <Label>{field.label}{field.is_required ? " *" : ""}</Label>
                          {fieldOptions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {fieldOptions.map((option) => {
                                const isSelected = selectedValues.includes(option.value);
                                return (
                                  <button
                                    key={`${field.field_key}-${option.value}`}
                                    type="button"
                                    className={`px-2 py-1 text-xs rounded border transition-colors ${isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                                    onClick={() => {
                                      const nextValues = isSelected
                                        ? selectedValues.filter((item) => item !== option.value)
                                        : [...selectedValues, option.value];
                                      setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: nextValues }));
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <Input
                              value={selectedValues.join(", ")}
                              onChange={(e) => {
                                const list = e.target.value
                                  .split(",")
                                  .map((item) => item.trim())
                                  .filter(Boolean);
                                setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: list }));
                              }}
                              placeholder={field.placeholder || "Informe valores separados por vírgula"}
                            />
                          )}
                        </div>
                      );
                    }

                    if (field.field_type === "checkbox") {
                      return (
                        <div key={field.id} className="space-y-2">
                          <Label>{field.label}{field.is_required ? " *" : ""}</Label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(value)}
                              onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: e.target.checked }))}
                            />
                            Ativar
                          </label>
                        </div>
                      );
                    }

                    const inputType = field.field_type === "number"
                      ? "number"
                      : field.field_type === "date"
                        ? "date"
                        : field.field_type === "datetime"
                          ? "datetime-local"
                          : "text";

                    return (
                      <div key={field.id} className="space-y-2">
                        <Label>{field.label}{field.is_required ? " *" : ""}</Label>
                        <Input
                          type={inputType}
                          value={value || ""}
                          onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: e.target.value }))}
                          placeholder={field.placeholder || ""}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setTicketDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCriarTicket}
                disabled={!ticketForm.titulo || !ticketForm.sintese || !ticketForm.origem || !ticketForm.motivo || !ticketForm.departamento || criarTicket.isPending}
              >
                {criarTicket.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Dialog para Descartar Lead (motivo) */}
      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent className="w-[90vw] md:w-[50vw] max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Descartar Lead</DialogTitle>
            <DialogDescription id="desc-discard">
              Informe o motivo do descarte para registro no histórico.
              {discardingLeadIds.length > 1 ? ` ${discardingLeadIds.length} leads serão descartados.` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="discardReason">Motivo do Descarte *</Label>
              <Textarea
                id="discardReason"
                value={discardReason}
                onChange={(e) => setDiscardReason(e.target.value)}
                placeholder="Informe o motivo pelo qual este lead está sendo descartado"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setDiscardDialogOpen(false); setDiscardReason(''); setDiscardingLeadIds([]); }}>
                Cancelar
              </Button>
              <Button onClick={submitDiscard} disabled={!discardReason || descartarLead.isPending}>
                {descartarLead.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Descartar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
