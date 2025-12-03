import { useState, useMemo } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Ticket, Inbox, MessageSquare, Users } from "lucide-react";
import { TriagemLeadCardV2 } from "@/components/triagem/TriagemLeadCardV2";
import { TriagemFilters } from "@/components/triagem/TriagemFilters";

export default function FilaTriagem() {
  const { user } = useAuth();
  const { data: leads, isLoading, refetch, isFetching } = useTriagemLeads();
  const { data: funis } = useFunis();
  const encaminharComercial = useEncaminharParaComercial();
  const criarTicket = useCriarTicket();
  const descartarLead = useDescartarLead();
  const atribuirLead = useAtribuirLead();

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [origemFilter, setOrigemFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  // Dialog state
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<TriagemLead | null>(null);
  const [ticketForm, setTicketForm] = useState({
    titulo: "",
    descricao: "",
    prioridade: "media"
  });

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    if (!leads) return [];

    return leads.filter(lead => {
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
  }, [leads, searchTerm, statusFilter, origemFilter, activeTab, user?.id]);

  // Stats
  const stats = useMemo(() => {
    if (!leads) return { total: 0, whatsapp: 0, urgent: 0 };
    return {
      total: leads.length,
      whatsapp: leads.filter(l => l.origem === 'whatsapp_inbound' || l.whatsapp_number).length,
      urgent: leads.filter(l => (l.conversation?.unread_count || 0) > 0).length
    };
  }, [leads]);

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
      descricao: ticketForm.descricao,
      prioridade: ticketForm.prioridade
    });

    setTicketDialogOpen(false);
    setSelectedLead(null);
    setTicketForm({ titulo: "", descricao: "", prioridade: "media" });
  };

  const handleOpenTicketDialog = (lead: TriagemLead) => {
    setSelectedLead(lead);
    setTicketForm({
      ...ticketForm,
      titulo: `Atendimento - ${lead.nome_fantasia || lead.razao_social || lead.whatsapp_number || 'Cliente'}`
    });
    setTicketDialogOpen(true);
  };

  const handleDescartar = async (clienteId: string) => {
    if (confirm("Tem certeza que deseja descartar este lead?")) {
      await descartarLead.mutateAsync({ clienteId });
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
        <DialogContent>
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
            <div>
              <Label htmlFor="descricao">Descrição *</Label>
              <Textarea
                id="descricao"
                value={ticketForm.descricao}
                onChange={(e) => setTicketForm({ ...ticketForm, descricao: e.target.value })}
                placeholder="Descreva o problema ou solicitação..."
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select
                value={ticketForm.prioridade}
                onValueChange={(value) => setTicketForm({ ...ticketForm, prioridade: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setTicketDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCriarTicket}
                disabled={!ticketForm.titulo || !ticketForm.descricao || criarTicket.isPending}
              >
                {criarTicket.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
