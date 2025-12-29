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
import { Loader2, Ticket, Inbox, MessageSquare, Users, Eye } from "lucide-react";
import { TriagemLeadCardV2 } from "@/components/triagem/TriagemLeadCardV2";
import { TriagemFilters } from "@/components/triagem/TriagemFilters";
import { supabase } from "@/integrations/supabase/client";
import {
  TICKET_ORIGEM_OPTIONS,
  TICKET_MOTIVO_OPTIONS,
  TICKET_DEPARTAMENTO_OPTIONS
} from "@/constants/ticketOptions";

interface WhatsAppInstance {
  id: string;
  name: string;
  status: string;
  phone_number: string | null;
}

export default function FilaTriagem() {
  const { user } = useAuth();
  const presence = usePresenceOptional();
  const { data: leads, isLoading, refetch, isFetching } = useTriagemLeads();
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

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [origemFilter, setOrigemFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

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

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(lead => {
      // Exclude leads that were removed locally after discard
      if (removedLeadIds.includes(lead.id)) return false;
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
  }, [leads, searchTerm, statusFilter, origemFilter, activeTab, user?.id, selectedInstanceIds, instances.length, removedLeadIds]);

  // Stats
  const stats = useMemo(() => {
    if (!leads) return { total: 0, whatsapp: 0, urgent: 0 };
    return {
      total: leads.length,
      whatsapp: leads.filter(l => l.origem === 'whatsapp_inbound' || l.whatsapp_number).length,
      urgent: leads.filter(l => (l.conversation?.unread_count || 0) > 0).length
    };
  }, [leads]);

  // Count users viewing triagem page
  const viewersInTriagem = presence?.getUsersInPage('/triagem').length || 0;

  // Handlers
  const handleEncaminharComercial = async (clienteId: string) => {
    const funilVendas = funis?.find(f => f.tipo === 'vendas');
    await encaminharComercial.mutateAsync({
      clienteId,
      funilId: funilVendas?.id
    });
  };

  const handleCriarTicket = async () => {
    if (!selectedLead) return;

    await criarTicket.mutateAsync({
      clienteId: selectedLead.id,
      titulo: ticketForm.titulo,
      sintese: ticketForm.sintese,
      prioridade: ticketForm.prioridade,
      origem: ticketForm.origem,
      motivo: ticketForm.motivo,
      departamento: ticketForm.departamento,
      placa: ticketForm.placa,
      fase: "Análise do caso",
      status: "aguardando_triagem"
    } as any);

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
    setTicketDialogOpen(true);
  };

  const handleDescartar = async (clienteId: string) => {
    // Open discard reason dialog
    setDiscardingLeadId(clienteId);
    setDiscardDialogOpen(true);
  };

  // Discard modal state
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState("");
  const [discardingLeadId, setDiscardingLeadId] = useState<string | null>(null);
  

  const submitDiscard = async () => {
    if (!discardingLeadId) return;
    try {
      await descartarLead.mutateAsync({ clienteId: discardingLeadId, motivo: discardReason });
      // Remove immediately from UI before refetch completes
      setRemovedLeadIds((s) => Array.from(new Set([...s, discardingLeadId])));
      // Refresh leads immediately so the discarded lead is removed from the source of truth
      try { await refetch(); } catch (e) { console.warn('Refetch after discard failed', e); }
      setDiscardDialogOpen(false);
      setDiscardReason("");
      setDiscardingLeadId(null);
    } catch (err) {
      console.error('Erro ao descartar com motivo:', err);
    }
  };

  const handleAtribuir = async (clienteId: string) => {
    await atribuirLead.mutateAsync({ clienteId });
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            <span className="hidden sm:inline">Todos</span>
            <span className="text-xs opacity-70">({leads?.length || 0})</span>
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

        <TabsContent value={activeTab} className="mt-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredLeads.map((lead) => (
                <TriagemLeadCardV2
                  key={lead.id}
                  lead={lead}
                  onEncaminharComercial={handleEncaminharComercial}
                  onCriarTicket={handleOpenTicketDialog}
                  onDescartar={handleDescartar}
                  onAtribuir={handleAtribuir}
                  isEncaminhando={encaminharComercial.isPending}
                  isDescartando={descartarLead.isPending}
                  isAtribuindo={atribuirLead.isPending}
                  currentUserId={user?.id}
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
                  <SelectContent>
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
                  <SelectContent>
                    {TICKET_DEPARTAMENTO_OPTIONS.map(opt => (
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
                  <SelectContent>
                    {TICKET_MOTIVO_OPTIONS.map(opt => (
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
                  <SelectContent>
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
                <DialogDescription id="desc-discard">Informe o motivo do descarte para registro no histórico.</DialogDescription>
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
                <Button variant="outline" onClick={() => { setDiscardDialogOpen(false); setDiscardReason(''); setDiscardingLeadId(null); }}>
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
