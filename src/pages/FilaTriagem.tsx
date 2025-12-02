import { useLeadsTriagem, useEncaminharParaComercial, useCriarTicketAtendimento, useDescartarLead, LeadTriagem } from "@/hooks/useLeadsTriagem";
import { useFunis } from "@/hooks/useFunis";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Ticket, RefreshCw } from "lucide-react";
import { useState } from "react";
import { TriagemLeadCard } from "@/components/triagem/TriagemLeadCard";

export default function FilaTriagem() {
    const { data: leads, isLoading, refetch } = useLeadsTriagem();
    const { data: funis } = useFunis();
    const encaminharComercial = useEncaminharParaComercial();
    const criarTicket = useCriarTicketAtendimento();
    const descartarLead = useDescartarLead();

    const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<LeadTriagem | null>(null);
    const [ticketForm, setTicketForm] = useState({
        titulo: "",
        descricao: "",
        prioridade: "media"
    });

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

    const handleOpenTicketDialog = (lead: LeadTriagem) => {
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

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="animate-spin w-8 h-8" />
            </div>
        );
    }

    // Ordenar leads - WhatsApp primeiro, depois por data
    const sortedLeads = [...(leads || [])].sort((a, b) => {
        const aIsWhatsApp = a.origem === 'whatsapp_inbound' || !!a.whatsapp_number;
        const bIsWhatsApp = b.origem === 'whatsapp_inbound' || !!b.whatsapp_number;
        
        if (aIsWhatsApp && !bIsWhatsApp) return -1;
        if (!aIsWhatsApp && bIsWhatsApp) return 1;
        
        const aDate = a.created_at || a.cadastro_cliente || '';
        const bDate = b.created_at || b.cadastro_cliente || '';
        return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    const whatsappLeads = sortedLeads.filter(l => l.origem === 'whatsapp_inbound' || !!l.whatsapp_number);
    const otherLeads = sortedLeads.filter(l => l.origem !== 'whatsapp_inbound' && !l.whatsapp_number);

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Fila de Triagem</h1>
                    <p className="text-muted-foreground mt-1">
                        {leads?.length || 0} lead(s) aguardando classificação e direcionamento
                        {whatsappLeads.length > 0 && (
                            <span className="ml-2 text-green-600">
                                ({whatsappLeads.length} via WhatsApp)
                            </span>
                        )}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                </Button>
            </div>

            {/* WhatsApp Leads Section */}
            {whatsappLeads.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-green-600 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Mensagens WhatsApp ({whatsappLeads.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {whatsappLeads.map((lead) => (
                            <TriagemLeadCard
                                key={lead.id}
                                lead={lead}
                                onEncaminharComercial={handleEncaminharComercial}
                                onCriarTicket={handleOpenTicketDialog}
                                onDescartar={handleDescartar}
                                isEncaminhando={encaminharComercial.isPending}
                                isDescartando={descartarLead.isPending}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Other Leads Section */}
            {otherLeads.length > 0 && (
                <div className="space-y-4">
                    {whatsappLeads.length > 0 && (
                        <h2 className="text-lg font-semibold text-muted-foreground">
                            Outros Leads ({otherLeads.length})
                        </h2>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {otherLeads.map((lead) => (
                            <TriagemLeadCard
                                key={lead.id}
                                lead={lead}
                                onEncaminharComercial={handleEncaminharComercial}
                                onCriarTicket={handleOpenTicketDialog}
                                onDescartar={handleDescartar}
                                isEncaminhando={encaminharComercial.isPending}
                                isDescartando={descartarLead.isPending}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {leads?.length === 0 && (
                <div className="text-center py-16">
                    <div className="text-muted-foreground space-y-2">
                        <Ticket className="w-16 h-16 mx-auto opacity-20" />
                        <p className="text-lg font-semibold">Nenhum lead na fila</p>
                        <p className="text-sm">Todos os leads foram processados!</p>
                    </div>
                </div>
            )}

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
