import { useLeadsTriagem, useEncaminharParaComercial, useCriarTicketAtendimento, useDescartarLead } from "@/hooks/useLeadsTriagem";
import { useFunis } from "@/hooks/useFunis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, Ticket, X, Clock, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FilaTriagem() {
    const { data: leads, isLoading } = useLeadsTriagem();
    const { data: funis } = useFunis();
    const encaminharComercial = useEncaminharParaComercial();
    const criarTicket = useCriarTicketAtendimento();
    const descartarLead = useDescartarLead();

    const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<any>(null);
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

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Fila de Triagem</h1>
                <p className="text-muted-foreground mt-1">
                    {leads?.length || 0} lead(s) aguardando classificação e direcionamento
                </p>
            </div>

            {/* Leads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leads?.map((lead) => (
                    <Card key={lead.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start gap-2">
                                <CardTitle className="text-lg">
                                    {lead.nome_fantasia || lead.razao_social || "Lead sem nome"}
                                </CardTitle>
                                <Badge variant="secondary" className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(lead.created_at), {
                                        addSuffix: true,
                                        locale: ptBR
                                    })}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Informações do Lead */}
                            <div className="text-sm space-y-2">
                                {lead.email && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="w-4 h-4" />
                                        <span className="truncate">{lead.email}</span>
                                    </div>
                                )}
                                {(lead.whatsapp_number || lead.telefone) && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="w-4 h-4" />
                                        <span>{lead.whatsapp_number || lead.telefone}</span>
                                    </div>
                                )}
                                {lead.origem && (
                                    <div className="text-xs">
                                        <span className="font-semibold">Origem:</span> {lead.origem}
                                    </div>
                                )}
                            </div>

                            {/* Ações */}
                            <div className="flex flex-col gap-2 pt-2 border-t">
                                <Button
                                    className="w-full justify-start"
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleEncaminharComercial(lead.id)}
                                    disabled={encaminharComercial.isPending}
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Enviar para Comercial
                                </Button>
                                <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedLead(lead);
                                        setTicketForm({
                                            ...ticketForm,
                                            titulo: `Atendimento - ${lead.nome_fantasia || lead.razao_social}`
                                        });
                                        setTicketDialogOpen(true);
                                    }}
                                >
                                    <Ticket className="w-4 h-4 mr-2" />
                                    Criar Ticket (Suporte)
                                </Button>
                                <Button
                                    className="w-full justify-start"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDescartar(lead.id)}
                                    disabled={descartarLead.isPending}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Descartar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {/* Empty State */}
                {leads?.length === 0 && (
                    <div className="col-span-full text-center py-16">
                        <div className="text-muted-foreground space-y-2">
                            <Ticket className="w-16 h-16 mx-auto opacity-20" />
                            <p className="text-lg font-semibold">Nenhum lead na fila</p>
                            <p className="text-sm">Todos os leads foram processados!</p>
                        </div>
                    </div>
                )}
            </div>

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
