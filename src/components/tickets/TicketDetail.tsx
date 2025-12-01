import { useTicketDetail, useUpdateTicket, useAddTicketInteracao, useAddTicketDepartamento } from "@/hooks/useTickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send, User, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { TicketSLAIndicator } from "./TicketSLAIndicator";
import { TicketDepartamentoCard } from "./TicketDepartamentoCard";
import { TicketAnexos } from "./TicketAnexos";
import { TicketClassificacao, ClassificacaoData } from "./TicketClassificacao";

interface TicketDetailProps {
    ticketId: string;
}

const DEPARTAMENTOS = [
    { value: 'comercial', label: 'Comercial' },
    { value: 'tecnico', label: 'Técnico' },
    { value: 'logistica', label: 'Logística' },
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'qualidade', label: 'Qualidade' }
];

export function TicketDetail({ ticketId }: TicketDetailProps) {
    const { user } = useAuth();
    const { data: ticket, isLoading, refetch } = useTicketDetail(ticketId);
    const updateTicket = useUpdateTicket();
    const addInteracao = useAddTicketInteracao();
    const addDepartamento = useAddTicketDepartamento();

    const [comment, setComment] = useState("");
    const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
    const [selectedDept, setSelectedDept] = useState("");

    const handleStatusChange = async (newStatus: string) => {
        if (!user?.id) return;
        try {
            await updateTicket.mutateAsync({
                ticketId,
                updates: { status: newStatus },
                userId: user.id
            });
            toast.success("Status atualizado com sucesso!");
        } catch (error) {
            toast.error("Erro ao atualizar status");
        }
    };

    const handleAddComment = async () => {
        if (!comment.trim() || !user?.id) return;
        try {
            await addInteracao.mutateAsync({
                ticket_id: ticketId,
                tipo: "comentario",
                mensagem: comment,
                user_id: user.id
            });
            setComment("");
            toast.success("Comentário adicionado!");
        } catch (error) {
            toast.error("Erro ao adicionar comentário");
        }
    };

    const handleAddDepartamento = async () => {
        if (!selectedDept || !user?.id) return;
        try {
            await addDepartamento.mutateAsync({
                ticket_id: ticketId,
                departamento: selectedDept,
                solicitado_por: user.id,
                status: 'pendente'
            });
            setIsAddDeptOpen(false);
            setSelectedDept("");
            toast.success("Departamento solicitado!");
        } catch (error) {
            toast.error("Erro ao solicitar departamento");
        }
    };

    const handleSaveClassificacao = async (data: ClassificacaoData) => {
        if (!user?.id) return;
        try {
            await updateTicket.mutateAsync({
                ticketId,
                updates: {
                    ...data,
                    status: 'resolvido', // Auto resolve ao classificar
                    tempo_total_resolucao: new Date().toISOString() // Simplificado, ideal calcular diff
                },
                userId: user.id
            });
            toast.success("Classificação salva e ticket resolvido!");
        } catch (error) {
            toast.error("Erro ao salvar classificação");
        }
    };

    if (isLoading) return <div className="flex justify-center h-full items-center"><Loader2 className="animate-spin" /></div>;
    if (!ticket) return <div className="flex justify-center h-full items-center">Ticket não encontrado</div>;

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold">{ticket.titulo}</h2>
                    <p className="text-sm text-muted-foreground">
                        #{ticket.numero_ticket} • {ticket.clientes?.nome_fantasia}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                        <Badge>{ticket.status}</Badge>
                        <Badge variant="outline">{ticket.prioridade}</Badge>
                    </div>
                    <div className="flex gap-2">
                        <TicketSLAIndicator
                            label="1ª Resposta"
                            slaTimestamp={ticket.sla_primeira_resposta}
                            isCumprido={!!ticket.tempo_primeira_resposta}
                            compact
                        />
                        <TicketSLAIndicator
                            label="Resolução"
                            slaTimestamp={ticket.sla_resolucao}
                            isCumprido={ticket.status === 'resolvido' || ticket.status === 'fechado'}
                            compact
                        />
                    </div>
                </div>
            </div>

            <Tabs defaultValue="geral" className="flex-1 flex flex-col">
                <TabsList>
                    <TabsTrigger value="geral">Visão Geral</TabsTrigger>
                    <TabsTrigger value="departamentos">Departamentos ({ticket.ticket_departamentos?.length || 0})</TabsTrigger>
                    <TabsTrigger value="anexos">Anexos ({ticket.ticket_anexos?.length || 0})</TabsTrigger>
                    <TabsTrigger value="classificacao">Classificação</TabsTrigger>
                </TabsList>

                <div className="flex-1 mt-4 grid grid-cols-3 gap-4">
                    <div className="col-span-2 flex flex-col h-full">
                        <TabsContent value="geral" className="flex-1 flex flex-col gap-4 mt-0">
                            <Card>
                                <CardHeader><CardTitle>Descrição</CardTitle></CardHeader>
                                <CardContent><p className="whitespace-pre-wrap">{ticket.descricao}</p></CardContent>
                            </Card>

                            <Card className="flex-1 flex flex-col">
                                <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
                                <CardContent className="flex-1 flex flex-col">
                                    <ScrollArea className="flex-1 h-[300px] pr-4">
                                        <div className="space-y-4">
                                            {ticket.ticket_interacoes?.map((interacao: any) => (
                                                <div key={interacao.id} className="flex gap-3">
                                                    <div className="mt-1">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-sm">{interacao.profiles?.full_name || "Sistema"}</span>
                                                            <span className="text-xs text-muted-foreground">{format(new Date(interacao.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                                                        </div>
                                                        <div className="text-sm mt-1">
                                                            {interacao.tipo === "comentario" && <p>{interacao.mensagem}</p>}
                                                            {interacao.tipo === "mudanca_status" && <p className="italic text-muted-foreground">Alterou status de {interacao.status_anterior} para {interacao.status_novo}</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                    <div className="mt-4 flex gap-2">
                                        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Adicionar comentário..." className="min-h-[80px]" />
                                        <Button className="self-end" onClick={handleAddComment}><Send className="w-4 h-4" /></Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="departamentos" className="mt-0 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Departamentos Envolvidos</h3>
                                <Dialog open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm"><Plus className="w-4 h-4 mr-2" />Solicitar Apoio</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>Solicitar Apoio de Departamento</DialogTitle></DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Departamento</Label>
                                                <Select value={selectedDept} onValueChange={setSelectedDept}>
                                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {DEPARTAMENTOS.map(dept => (
                                                            <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Button onClick={handleAddDepartamento} disabled={!selectedDept} className="w-full">Solicitar</Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <div className="grid gap-4">
                                {ticket.ticket_departamentos?.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum departamento envolvido.</p>}
                                {ticket.ticket_departamentos?.map((dept: any) => (
                                    <TicketDepartamentoCard key={dept.id} departamento={dept} />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="anexos" className="mt-0">
                            <TicketAnexos
                                ticketId={ticketId}
                                anexos={ticket.ticket_anexos || []}
                                onUploadComplete={refetch}
                                onDeleteComplete={refetch}
                            />
                        </TabsContent>

                        <TabsContent value="classificacao" className="mt-0">
                            <TicketClassificacao
                                ticketId={ticketId}
                                onSave={handleSaveClassificacao}
                                initialData={{
                                    procedencia: ticket.procedencia,
                                    solucao_aplicada: ticket.solucao_aplicada,
                                    acoes_corretivas: ticket.acoes_corretivas,
                                    feedback_cliente: ticket.feedback_cliente,
                                    nota_cliente: ticket.nota_cliente
                                }}
                            />
                        </TabsContent>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader><CardTitle>Ações</CardTitle></CardHeader>
                            <CardContent className="flex flex-col gap-2">
                                <Button variant="outline" onClick={() => handleStatusChange("em_atendimento")}>Iniciar Atendimento</Button>
                                <Button variant="outline" onClick={() => handleStatusChange("aguardando_cliente")}>Aguardando Cliente</Button>
                                <Button variant="destructive" onClick={() => handleStatusChange("fechado")}>Fechar Ticket</Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Detalhes</CardTitle></CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div><span className="font-semibold">Criado em:</span><p>{format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm")}</p></div>
                                <div><span className="font-semibold">Atendente:</span><p>{ticket.profiles?.full_name || "Não atribuído"}</p></div>
                                <div><span className="font-semibold">Setor:</span><p>{ticket.setor_responsavel || "Não definido"}</p></div>
                                <div><span className="font-semibold">Tipo:</span><p>{ticket.tipo_reclamacao || "Não classificado"}</p></div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </Tabs>
        </div>
    );
}
